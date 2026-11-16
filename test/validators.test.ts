import { describe, expect, it } from 'vitest';
import { validateStatement } from '@/pipeline/validate/validators';
import type { IsoDate, Paise } from '@/types/brands';
import type { Txn } from '@/types/models';

describe('Statement Validators', () => {
  it('verifies a statement when opening + amounts = closing and running balance is consistent', () => {
    const txns: Txn[] = [
      {
        id: 'txn-1',
        statementId: 's-1',
        accountId: 'acc-1',
        date: '2024-01-10' as IsoDate,
        amount: 100000 as Paise, // +1,000.00
        balanceAfter: 1100000 as Paise,
        narration: 'SALARY',
        category: 'income:salary' as any,
        categorySource: 'bundled',
        flags: [],
        source: { page: 1, line: 1 },
      },
      {
        id: 'txn-2',
        statementId: 's-1',
        accountId: 'acc-1',
        date: '2024-01-12' as IsoDate,
        amount: -20000 as Paise, // -200.00
        balanceAfter: 1080000 as Paise,
        narration: 'SWIGGY',
        category: 'food:delivery' as any,
        categorySource: 'bundled',
        flags: [],
        source: { page: 1, line: 2 },
      },
    ];

    const result = validateStatement({
      statement: {
        accountId: 'acc-1',
        periodStart: '2024-01-01' as IsoDate,
        periodEnd: '2024-01-31' as IsoDate,
        opening: 1000000 as Paise, // 10,000.00
        closing: 1080000 as Paise, // 10,800.00 (10,000 + 1,000 - 200 = 10,800)
        parser: { id: 'test', version: '1', layoutFingerprint: 'f' },
      },
      txns,
    });

    expect(result.verification).toBe('verified');
    expect(result.issues.length).toBe(0);
  });

  it('marks needs-review and calculates discrepancy when tie-out fails', () => {
    const txns: Txn[] = [
      {
        id: 'txn-1',
        statementId: 's-1',
        accountId: 'acc-1',
        date: '2024-01-10' as IsoDate,
        amount: 50000 as Paise, // +500
        narration: 'CREDIT',
        category: 'uncategorised' as any,
        categorySource: 'none',
        flags: [],
        source: { page: 1, line: 1 },
      },
    ];

    const result = validateStatement({
      statement: {
        accountId: 'acc-1',
        periodStart: '2024-01-01' as IsoDate,
        periodEnd: '2024-01-31' as IsoDate,
        opening: 100000 as Paise, // 1,000
        closing: 200000 as Paise, // 2,000 (mismatch! 1000 + 500 = 1500 != 2000)
        parser: { id: 'test', version: '1', layoutFingerprint: 'f' },
      },
      txns,
    });

    expect(result.verification).toBe('needs-review');
    const openCloseIssue = result.issues.find((i) => i.code === 'OPEN_CLOSE');
    expect(openCloseIssue).toBeDefined();
    expect(openCloseIssue?.diffPaise).toBe(50000); // ₹500 diff
  });
});
