import type { Txn } from '@/types/models';
import { paiseToRupees } from './money';

/**
 * Escapes CSV values and neutralises CSV formula injection.
 * Prepends a single quote if string begins with '=', '+', '-', '@', '\t', or '\r'.
 */
export function sanitizeCsvCell(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return '';
  const str = String(value);

  // Formula injection prevention (spec §5.9)
  let safeStr = str;
  if (/^[=+\-@\t\r]/.test(str)) {
    safeStr = `'${str}`;
  }

  // Escape quotes
  if (safeStr.includes('"') || safeStr.includes(',') || safeStr.includes('\n')) {
    return `"${safeStr.replace(/"/g, '""')}"`;
  }
  return safeStr;
}

export function exportTransactionsToCsv(txns: Txn[]): string {
  const headers = [
    'Date',
    'Narration',
    'Merchant',
    'Category',
    'Amount (INR)',
    'Type',
    'Balance After (INR)',
    'Reference',
    'Channel',
    'Flags',
  ];

  const rows = txns.map((t) => [
    sanitizeCsvCell(t.date),
    sanitizeCsvCell(t.narration),
    sanitizeCsvCell(t.merchant || ''),
    sanitizeCsvCell(t.category),
    sanitizeCsvCell(Math.abs(paiseToRupees(t.amount)).toFixed(2)),
    sanitizeCsvCell(t.amount >= 0 ? 'Credit' : 'Debit'),
    sanitizeCsvCell(t.balanceAfter !== undefined ? paiseToRupees(t.balanceAfter).toFixed(2) : ''),
    sanitizeCsvCell(t.ref || ''),
    sanitizeCsvCell(t.channel || ''),
    sanitizeCsvCell(t.flags.join(', ')),
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
}

export function exportTransactionsToJson(txns: Txn[]): string {
  return JSON.stringify(txns, null, 2);
}

export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
