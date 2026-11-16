import { sha256Hex } from '@/lib/hash';
import type { Txn } from '@/types/models';

export interface RawTxnInput {
  accountId: string;
  statementId: string;
  date: string;
  valueDate?: string;
  amount: number; // Paise
  balanceAfter?: number; // Paise
  narration: string;
  ref?: string;
  source: {
    page: number;
    line: number;
  };
}

/**
 * Computes deterministic 16-hex dedup key for a transaction tuple with occurrence count k.
 */
export async function computeTxnId(input: RawTxnInput, occurrenceIndex: number): Promise<string> {
  const normNarration = input.narration.replace(/\s+/g, ' ').trim().toUpperCase();
  const tuple = `${input.accountId}|${input.date}|${input.amount}|${normNarration}|${input.ref || ''}|${occurrenceIndex}`;
  const fullHash = await sha256Hex(tuple);
  return fullHash.substring(0, 16);
}

/**
 * Assigns unique deterministic IDs with occurrence index k across a batch of parsed transactions.
 */
export async function assignDeterministicTxnIds<T extends RawTxnInput>(
  txns: T[],
): Promise<Array<T & { id: string }>> {
  const tupleCounts = new Map<string, number>();
  const result: Array<T & { id: string }> = [];

  for (const txn of txns) {
    const normNarration = txn.narration.replace(/\s+/g, ' ').trim().toUpperCase();
    const tupleKey = `${txn.accountId}|${txn.date}|${txn.amount}|${normNarration}|${txn.ref || ''}`;
    const k = tupleCounts.get(tupleKey) || 0;
    tupleCounts.set(tupleKey, k + 1);

    const id = await computeTxnId(txn, k);
    result.push({ ...txn, id });
  }

  return result;
}

/**
 * Deduplicates new transactions against existing store transactions.
 * Preserves existing user edits/categorisations when matching an existing ID.
 */
export function mergeTransactions(existingTxns: Txn[], newTxns: Txn[]): Txn[] {
  const map = new Map<string, Txn>();
  for (const txn of existingTxns) {
    map.set(txn.id, txn);
  }
  for (const txn of newTxns) {
    if (!map.has(txn.id)) {
      map.set(txn.id, txn);
    }
  }
  return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
}
