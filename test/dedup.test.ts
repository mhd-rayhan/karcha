import { describe, expect, it } from 'vitest';
import { assignDeterministicTxnIds, computeTxnId } from '@/pipeline/dedup/dedup';

describe('Deduplication & Deterministic IDs', () => {
  it('is idempotent: same transaction yields same ID', async () => {
    const txn = {
      accountId: 'hdfc-savings-1234',
      statementId: 'stmt-1',
      date: '2024-01-15',
      amount: -45000,
      narration: 'UPI/401512345678/SWIGGY',
      source: { page: 1, line: 5 },
    };

    const id1 = await computeTxnId(txn, 0);
    const id2 = await computeTxnId(txn, 0);
    expect(id1).toBe(id2);
    expect(id1.length).toBe(16);
  });

  it('handles two identical same-day transactions via occurrence index k', async () => {
    const rawTxns = [
      {
        accountId: 'icici-savings-9999',
        statementId: 'stmt-1',
        date: '2024-02-10',
        amount: -50000,
        narration: 'METRO COMMUTE TICKET',
        source: { page: 1, line: 1 },
      },
      {
        accountId: 'icici-savings-9999',
        statementId: 'stmt-1',
        date: '2024-02-10',
        amount: -50000,
        narration: 'METRO COMMUTE TICKET',
        source: { page: 1, line: 2 },
      },
    ];

    const withIds = await assignDeterministicTxnIds(rawTxns);
    expect(withIds.length).toBe(2);
    // Both survive, but with distinct IDs due to k=0 and k=1
    expect(withIds[0].id).not.toBe(withIds[1].id);
  });
});
