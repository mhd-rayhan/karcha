import * as XLSX from 'xlsx';
import type { ExtractedDoc, TextItem } from './types';

export function parseExcelWorkbook(data: ArrayBuffer | Uint8Array, filename: string): ExtractedDoc {
  const wb = XLSX.read(data, { type: 'array', cellDates: false });
  const items: TextItem[] = [];

  let pageNum = 1;

  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    if (!sheet) continue;

    // Add sheet name as a text item at top to assist bank detection
    items.push({
      text: sheetName,
      x0: 50,
      x1: 250,
      y: 99999,
      page: pageNum,
    });

    const rows = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      raw: false,
      defval: '',
    }) as (string | number)[][];

    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      // Synthetic Y coordinate decreasing monotonically from top to bottom
      const y = 90000 - r * 20;

      for (let c = 0; c < row.length; c++) {
        const val = String(row[c] ?? '').trim();
        if (val) {
          // Columns spaced by 200 units with 150 unit width
          items.push({
            text: val,
            x0: c * 200,
            x1: c * 200 + 150,
            y,
            page: pageNum,
          });
        }
      }
    }

    pageNum++;
    // Primary statement sheet is sheet 0
    break;
  }

  return {
    pages: 1,
    items,
    meta: {
      source: 'excel',
      filenameHint: filename,
    },
  };
}
