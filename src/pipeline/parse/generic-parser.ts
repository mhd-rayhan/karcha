import { parseDate, toIsoDate } from '@/lib/dates';
import { toPaise } from '@/lib/money';
import type { BankId, IsoDate, Paise } from '@/types/brands';
import type { ExtractedDoc } from '../extract/types';
import type { ParseResult, RawParsedTxn } from './types';

export function parseGenericStatement(doc: ExtractedDoc): ParseResult {
  // Sort items top-to-bottom, left-to-right
  const items = [...doc.items].sort((a, b) => b.y - a.y || a.x0 - b.x0);

  // Group into lines by Y
  const lines: Array<{ text: string; page: number; y: number }> = [];
  for (const it of items) {
    const last = lines[lines.length - 1];
    if (last && Math.abs(last.y - it.y) <= 4 && last.page === it.page) {
      last.text += ` ${it.text}`;
    } else {
      lines.push({ text: it.text, page: it.page, y: it.y });
    }
  }

  const txns: RawParsedTxn[] = [];
  let minDate: IsoDate = toIsoDate('2099-12-31')!;
  let maxDate: IsoDate = toIsoDate('1970-01-01')!;

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const tokens = l.text.trim().split(/\s{2,}|\t/); // split by multiple spaces or tabs
    if (tokens.length < 2) continue;

    // Look for date at the start or first token
    const firstToken = tokens[0].trim();
    const date = parseDate(firstToken);
    if (!date) continue;

    // Look for monetary numbers in tokens
    const amountsFound: Paise[] = [];
    const narrationParts: string[] = [];

    for (let tIdx = 1; tIdx < tokens.length; tIdx++) {
      const tok = tokens[tIdx].trim();
      const numMatch = tok.match(
        /^[₹]?\s*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{2})?)\s*(Cr|Dr)?$/i,
      );
      if (numMatch) {
        let p = toPaise(numMatch[1]);
        if (/Dr/i.test(numMatch[2] || '')) p = -Math.abs(p) as Paise;
        amountsFound.push(p);
      } else {
        narrationParts.push(tok);
      }
    }

    if (amountsFound.length > 0) {
      const amount = amountsFound[0];
      const balance = amountsFound.length > 1 ? amountsFound[amountsFound.length - 1] : undefined;
      const narration = narrationParts.join(' ').trim() || 'Bank Entry';

      if (date < minDate) minDate = date;
      if (date > maxDate) maxDate = date;

      txns.push({
        date,
        narration,
        amount,
        balanceAfter: balance,
        source: { page: l.page, line: i },
      });
    }
  }

  if (minDate > maxDate) {
    minDate = toIsoDate('2024-01-01')!;
    maxDate = toIsoDate('2024-12-31')!;
  }

  return {
    statement: {
      accountId: 'generic-account-XXXX',
      periodStart: minDate,
      periodEnd: maxDate,
      parser: {
        id: 'generic-fallback',
        version: '1.0',
        layoutFingerprint: 'generic-heuristic',
      },
    },
    account: {
      bank: 'Generic' as BankId,
      product: 'savings',
      last4: 'XXXX',
    },
    txns,
    issues: [
      {
        code: 'LAYOUT_UNKNOWN',
        severity: 'warn',
        message:
          'No bank template matched with high confidence. Parsed with Best-effort generic table heuristics.',
      },
    ],
  };
}
