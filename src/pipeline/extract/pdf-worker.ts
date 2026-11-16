import * as pdfjsLib from 'pdfjs-dist';
import type { ExtractedDoc, TextItem, WorkerExtractRequest } from './types';

// Enforce limits from spec §5.9
const MAX_PAGES = 500;
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

self.onmessage = async (
  e: MessageEvent<WorkerExtractRequest | { type: 'submit_password'; password: string }>,
) => {
  const data = e.data;

  if (data.type === 'extract') {
    const { fileData, filename, password } = data;

    if (fileData.byteLength > MAX_FILE_SIZE) {
      self.postMessage({
        type: 'error',
        error: `File size exceeds 50 MB safety limit (${(fileData.byteLength / (1024 * 1024)).toFixed(1)} MB).`,
      });
      return;
    }

    try {
      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(fileData),
        password: password || undefined,
        isEvalSupported: false,
        useSystemFonts: true,
      });

      // Hook password requirement
      loadingTask.onPassword = (callback: (pwd: string) => void, reason: number) => {
        // reason: 1 = NEED_PASSWORD, 2 = INCORRECT_PASSWORD
        self.postMessage({
          type: 'need_password',
          filename,
          isRetry: reason === 2,
        });

        // Wait for password response from main thread
        const passwordHandler = (event: MessageEvent) => {
          if (event.data?.type === 'submit_password') {
            self.removeEventListener('message', passwordHandler);
            callback(event.data.password);
          }
        };
        self.addEventListener('message', passwordHandler);
      };

      const pdfDoc = await loadingTask.promise;
      const numPages = Math.min(pdfDoc.numPages, MAX_PAGES);
      const items: TextItem[] = [];

      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdfDoc.getPage(pageNum);
        const textContent = await page.getTextContent();

        for (const item of textContent.items) {
          if ('str' in item && item.str.trim()) {
            const tx = item.transform; // [scaleX, skewY, skewX, scaleY, transX, transY]
            const x0 = tx[4];
            const y = tx[5];
            const x1 = x0 + (item.width || 0);

            items.push({
              text: item.str,
              x0: Math.round(x0 * 10) / 10,
              x1: Math.round(x1 * 10) / 10,
              y: Math.round(y * 10) / 10,
              page: pageNum,
            });
          }
        }

        page.cleanup();
      }

      await pdfDoc.destroy();

      const doc: ExtractedDoc = {
        pages: numPages,
        items,
        meta: {
          source: 'pdf',
          filenameHint: filename,
        },
      };

      self.postMessage({ type: 'success', doc });
    } catch (err: any) {
      self.postMessage({
        type: 'error',
        error: err?.message || 'Failed to parse PDF document.',
      });
    }
  }
};
