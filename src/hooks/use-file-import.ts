import { processExtractedDoc } from '@/pipeline';
import { parseDelimitedText } from '@/pipeline/extract/csv-sniffer';
import { parseExcelWorkbook } from '@/pipeline/extract/excel-parser';
import type { ExtractedDoc, WorkerMessage } from '@/pipeline/extract/types';
import { addStatementData, rules, txns } from '@/store';
import { signal } from '@preact/signals';

export interface FileImportItem {
  id: string;
  file: File;
  status: 'pending' | 'extracting' | 'parsing' | 'done' | 'error';
  error?: string;
  progress?: number;
}

export const importQueue = signal<FileImportItem[]>([]);
export const isProcessing = signal<boolean>(false);
export const passwordPrompt = signal<{
  fileId: string;
  filename: string;
  isRetry: boolean;
  resolve: (password: string) => void;
} | null>(null);

// In-memory password cache for batch (never persisted)
let batchPasswordCache: string | null = null;

export function useFileImport() {
  const queueFiles = (files: File[]) => {
    const valid = files.slice(0, 20).map((file) => ({
      id: `${file.name}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      file,
      status: 'pending' as const,
    }));
    importQueue.value = [...importQueue.value, ...valid];
    if (!isProcessing.value) {
      processQueue();
    }
  };

  const processQueue = async () => {
    if (isProcessing.value) return;
    isProcessing.value = true;

    try {
      while (true) {
        const item = importQueue.value.find((i) => i.status === 'pending');
        if (!item) break;

        updateItemStatus(item.id, 'extracting');

        try {
          let doc: ExtractedDoc;
          const fileName = item.file.name.toLowerCase();
          const isPdf = item.file.type === 'application/pdf' || fileName.endsWith('.pdf');
          const isExcel =
            item.file.type === 'application/vnd.ms-excel' ||
            item.file.type ===
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
            fileName.endsWith('.xls') ||
            fileName.endsWith('.xlsx');

          if (isPdf) {
            doc = await extractPdfInWorker(item);
          } else if (isExcel) {
            const buffer = await item.file.arrayBuffer();
            try {
              doc = parseExcelWorkbook(buffer, item.file.name);
            } catch {
              const text = await item.file.text();
              doc = parseDelimitedText(text, item.file.name);
            }
          } else {
            const buffer = await item.file.arrayBuffer();
            const header = new Uint8Array(buffer.slice(0, 4));
            const isOle2 =
              header[0] === 0xd0 && header[1] === 0xcf && header[2] === 0x11 && header[3] === 0xe0;
            const isZip =
              header[0] === 0x50 && header[1] === 0x4b && header[2] === 0x03 && header[3] === 0x04;

            if (isOle2 || isZip) {
              doc = parseExcelWorkbook(buffer, item.file.name);
            } else {
              const text = new TextDecoder('utf-8').decode(buffer);
              doc = parseDelimitedText(text, item.file.name);
            }
          }

          updateItemStatus(item.id, 'parsing');

          // Run processing pipeline
          const result = await processExtractedDoc(doc, rules.value, txns.value);
          addStatementData(result.account, result.statement, result.txns);

          updateItemStatus(item.id, 'done');
        } catch (err: any) {
          console.error('File import error:', err);
          updateItemStatus(item.id, 'error', err?.message || 'Processing failed');
        }
      }
    } finally {
      isProcessing.value = false;
    }
  };

  const updateItemStatus = (id: string, status: FileImportItem['status'], error?: string) => {
    importQueue.value = importQueue.value.map((item) =>
      item.id === id ? { ...item, status, error } : item,
    );
  };

  const submitPassword = (password: string, rememberForBatch: boolean) => {
    if (rememberForBatch) {
      batchPasswordCache = password;
    }
    if (passwordPrompt.value) {
      passwordPrompt.value.resolve(password);
      passwordPrompt.value = null;
    }
  };

  const cancelPassword = () => {
    if (passwordPrompt.value) {
      updateItemStatus(passwordPrompt.value.fileId, 'error', 'Password prompt cancelled');
      passwordPrompt.value = null;
    }
  };

  const clearQueue = () => {
    importQueue.value = [];
    batchPasswordCache = null;
  };

  return {
    queue: importQueue.value,
    isProcessing: isProcessing.value,
    passwordPrompt: passwordPrompt.value,
    queueFiles,
    submitPassword,
    cancelPassword,
    clearQueue,
  };
}

function extractPdfInWorker(item: FileImportItem): Promise<ExtractedDoc> {
  return new Promise(async (resolve, reject) => {
    const worker = new Worker(new URL('../pipeline/extract/pdf-worker.ts', import.meta.url), {
      type: 'module',
    });

    const fileBuffer = await item.file.arrayBuffer();

    worker.onmessage = (e: MessageEvent<WorkerMessage>) => {
      const msg = e.data;

      if (msg.type === 'need_password') {
        // If we have cached batch password and this is not a retry, use it directly
        if (batchPasswordCache && !msg.isRetry) {
          worker.postMessage({ type: 'submit_password', password: batchPasswordCache });
          return;
        }

        // Otherwise prompt user
        passwordPrompt.value = {
          fileId: item.id,
          filename: item.file.name,
          isRetry: msg.isRetry,
          resolve: (pwd: string) => {
            worker.postMessage({ type: 'submit_password', password: pwd });
          },
        };
      } else if (msg.type === 'success') {
        worker.terminate();
        resolve(msg.doc);
      } else if (msg.type === 'error') {
        worker.terminate();
        reject(new Error(msg.error));
      }
    };

    worker.onerror = (err) => {
      worker.terminate();
      reject(new Error(err.message || 'Worker extraction failed'));
    };

    // Kick off extraction
    worker.postMessage({
      type: 'extract',
      fileData: fileBuffer,
      filename: item.file.name,
      password: batchPasswordCache || undefined,
    });
  });
}
