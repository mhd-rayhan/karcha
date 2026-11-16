import { formatPaise } from '@/lib/money';
import type { Paise } from '@/types/brands';
import type { Issue, Statement, Txn, VerificationState } from '@/types/models';

const TEN_CRORES_PAISE = (10_00_00_000 * 100) as Paise;

export interface ValidationContext {
  statement: Omit<Statement, 'id' | 'importedAt' | 'verification' | 'issues'>;
  txns: Txn[];
}

export function validateStatement(context: ValidationContext): {
  verification: VerificationState;
  issues: Issue[];
} {
  const issues: Issue[] = [];
  const { statement, txns } = context;

  // 1. AMOUNT_SANITY
  for (const t of txns) {
    if (t.amount === 0) {
      issues.push({
        code: 'AMOUNT_SANITY',
        severity: 'warn',
        message: 'Transaction amount is zero',
        txnId: t.id,
        page: t.source.page,
      });
    }
    if (Math.abs(t.amount) > TEN_CRORES_PAISE) {
      issues.push({
        code: 'AMOUNT_SANITY',
        severity: 'warn',
        message: `Transaction amount exceeds ₹10 Crores sanity threshold: ${formatPaise(t.amount)}`,
        txnId: t.id,
        page: t.source.page,
      });
    }
  }

  // 2. DATE_RANGE
  for (const t of txns) {
    if (t.date < statement.periodStart || t.date > statement.periodEnd) {
      issues.push({
        code: 'DATE_RANGE',
        severity: 'warn',
        message: `Transaction date ${t.date} is outside statement period (${statement.periodStart} to ${statement.periodEnd})`,
        txnId: t.id,
        page: t.source.page,
      });
    }
  }

  // 3. BAL_CHAIN (for accounts with running balance)
  let balChainBroken = false;
  let totalBreakPaise = 0 as Paise;

  // Sort chronologically for balance chain verification
  const sortedTxns = [...txns].sort((a, b) => a.date.localeCompare(b.date));
  for (let i = 1; i < sortedTxns.length; i++) {
    const prev = sortedTxns[i - 1];
    const curr = sortedTxns[i];
    if (prev.balanceAfter !== undefined && curr.balanceAfter !== undefined) {
      const expectedBalance = (prev.balanceAfter + curr.amount) as Paise;
      const diff = Math.abs(expectedBalance - curr.balanceAfter) as Paise;
      if (diff > 0) {
        balChainBroken = true;
        totalBreakPaise = (totalBreakPaise + diff) as Paise;
        issues.push({
          code: 'BAL_CHAIN',
          severity: 'error',
          message: `Running balance mismatch on page ${curr.source.page}: expected ${formatPaise(expectedBalance)}, found ${formatPaise(curr.balanceAfter)} (diff: ${formatPaise(diff)})`,
          txnId: curr.id,
          page: curr.source.page,
          diffPaise: diff,
        });
        break; // Report first break point prominently
      }
    }
  }

  // 4. OPEN_CLOSE (opening + sum of amounts = closing)
  let openClosePassed = true;
  if (statement.opening !== undefined && statement.closing !== undefined) {
    const sumAmounts = txns.reduce((acc, t) => acc + t.amount, 0) as Paise;
    const computedClosing = (statement.opening + sumAmounts) as Paise;
    const diff = Math.abs(computedClosing - statement.closing) as Paise;

    if (diff > 0) {
      openClosePassed = false;
      issues.push({
        code: 'OPEN_CLOSE',
        severity: 'error',
        message: `Statement tie-out failed: Opening (${formatPaise(statement.opening)}) + Net (${formatPaise(sumAmounts)}) ≠ Closing (${formatPaise(statement.closing)}). Difference: ${formatPaise(diff)}`,
        diffPaise: diff,
      });
    }
  }

  // 5. TOTALS (printed totals comparison)
  if (statement.printedTotals) {
    const { moneyIn, moneyOut } = statement.printedTotals;
    if (moneyIn !== undefined) {
      const sumCredit = txns
        .filter((t) => t.amount > 0)
        .reduce((acc, t) => acc + t.amount, 0) as Paise;
      if (sumCredit !== moneyIn) {
        const diff = Math.abs(sumCredit - moneyIn) as Paise;
        issues.push({
          code: 'TOTALS',
          severity: 'warn',
          message: `Total deposits mismatch: printed ${formatPaise(moneyIn)}, calculated ${formatPaise(sumCredit)} (diff: ${formatPaise(diff)})`,
          diffPaise: diff,
        });
      }
    }
    if (moneyOut !== undefined) {
      const sumDebit = txns
        .filter((t) => t.amount < 0)
        .reduce((acc, t) => acc + Math.abs(t.amount), 0) as Paise;
      if (sumDebit !== Math.abs(moneyOut)) {
        const diff = Math.abs(sumDebit - Math.abs(moneyOut)) as Paise;
        issues.push({
          code: 'TOTALS',
          severity: 'warn',
          message: `Total withdrawals mismatch: printed ${formatPaise(Math.abs(moneyOut) as Paise)}, calculated ${formatPaise(sumDebit)} (diff: ${formatPaise(diff)})`,
          diffPaise: diff,
        });
      }
    }
  }

  // Determine verification state
  let verification: VerificationState = 'cannot-verify';
  if (statement.opening !== undefined && statement.closing !== undefined) {
    if (openClosePassed && !balChainBroken) {
      verification = 'verified';
    } else {
      verification = 'needs-review';
    }
  } else if (balChainBroken) {
    verification = 'needs-review';
  } else if (txns.length > 0) {
    // Has transactions but no opening/closing printed (e.g. some card statements or interim mini statements)
    verification = 'cannot-verify';
  }

  return { verification, issues };
}
