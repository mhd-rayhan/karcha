import type { Txn } from '@/types/models';

export interface TransferMatch {
  debitTxnId: string;
  creditTxnId: string;
  score: number;
}

export function detectTransfers(txns: Txn[]): TransferMatch[] {
  const debits = txns.filter((t) => t.amount < 0 && !t.flags.includes('ignored'));
  const credits = txns.filter((t) => t.amount > 0 && !t.flags.includes('ignored'));

  const candidates: TransferMatch[] = [];

  for (const d of debits) {
    for (const c of credits) {
      // Must be across different accounts
      if (d.accountId === c.accountId) continue;

      // Equal absolute amount (in integer paise)
      if (Math.abs(d.amount) !== c.amount) continue;

      // Dates within 3 days
      const daysApart = getDaysDifference(d.date, c.date);
      if (daysApart > 3) continue;

      let score = 0.5;

      // Check bundled transfer hints
      const dUpper = d.narration.toUpperCase();
      const cUpper = c.narration.toUpperCase();
      const hasHint =
        dUpper.includes('TRANSFER') ||
        dUpper.includes('CRED') ||
        dUpper.includes('CARD PAYMENT') ||
        dUpper.includes('SELF') ||
        cUpper.includes('TRANSFER') ||
        cUpper.includes('CRED') ||
        cUpper.includes('AUTOPAY') ||
        cUpper.includes('SELF');

      if (hasHint) {
        score += 0.3;
      }

      // Proximity bonus
      score += 0.2 * (1 - daysApart / 3);

      candidates.push({
        debitTxnId: d.id,
        creditTxnId: c.id,
        score,
      });
    }
  }

  // Sort candidate pairs greedy descending by score
  candidates.sort((a, b) => b.score - a.score);

  const matchedDebitIds = new Set<string>();
  const matchedCreditIds = new Set<string>();
  const finalizedMatches: TransferMatch[] = [];

  for (const match of candidates) {
    if (match.score < 0.5) continue;
    if (matchedDebitIds.has(match.debitTxnId) || matchedCreditIds.has(match.creditTxnId)) {
      continue;
    }
    matchedDebitIds.add(match.debitTxnId);
    matchedCreditIds.add(match.creditTxnId);
    finalizedMatches.push(match);
  }

  return finalizedMatches;
}

function getDaysDifference(d1: string, d2: string): number {
  const t1 = new Date(d1).getTime();
  const t2 = new Date(d2).getTime();
  const diffMs = Math.abs(t1 - t2);
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}
