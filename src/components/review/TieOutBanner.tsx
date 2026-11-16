import { formatPaise } from '@/lib/money';
import type { Statement, Txn } from '@/types/models';

export function TieOutBanner({ statement, txns }: { statement: Statement; txns: Txn[] }) {
  const statementTxns = txns.filter((t) => t.statementId === statement.id);

  const moneyIn = statementTxns
    .filter((t) => t.amount > 0 && !t.flags.includes('ignored'))
    .reduce((acc, t) => acc + t.amount, 0);

  const moneyOut = statementTxns
    .filter((t) => t.amount < 0 && !t.flags.includes('ignored'))
    .reduce((acc, t) => acc + Math.abs(t.amount), 0);

  const hasOpeningClosing = statement.opening !== undefined && statement.closing !== undefined;
  const computedClosing = hasOpeningClosing ? statement.opening! + moneyIn - moneyOut : null;
  const diff = hasOpeningClosing ? Math.abs(computedClosing! - statement.closing!) : null;

  const isVerified = statement.verification === 'verified';
  const needsReview = statement.verification === 'needs-review';

  return (
    <div
      className={`rounded-xl border p-5 transition-all ${
        isVerified
          ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-900 dark:text-emerald-100'
          : needsReview
            ? 'border-amber-500/20 bg-amber-500/5 text-amber-900 dark:text-amber-100'
            : 'border-border bg-card text-foreground'
      }`}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span
              className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold uppercase tracking-wider ${
                isVerified
                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                  : needsReview
                    ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                    : 'bg-muted text-muted-foreground'
              }`}
            >
              {isVerified
                ? '✓ Mathematically Verified'
                : needsReview
                  ? '⚠ Needs Review'
                  : 'ℹ Cannot Verify'}
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              Parser: {statement.parser.id} (v{statement.parser.version})
            </span>
          </div>

          <p className="text-sm font-medium">
            {isVerified
              ? 'All transactions tie out perfectly with opening and closing balances.'
              : needsReview
                ? `Reconciliation discrepancy of ${diff ? formatPaise(diff as any) : 'unspecified amount'}. Review rows below.`
                : 'Opening or closing balance was not printed on this document.'}
          </p>
        </div>

        {/* Tie-Out Equation details */}
        {hasOpeningClosing && (
          <div className="flex flex-wrap items-center gap-3 text-xs font-mono bg-background/50 backdrop-blur-xs px-4 py-2.5 rounded-lg border border-border/50">
            <div>
              <span className="text-muted-foreground block text-[10px]">OPENING</span>
              <span className="font-semibold">{formatPaise(statement.opening!)}</span>
            </div>
            <span className="text-muted-foreground">+</span>
            <div>
              <span className="text-muted-foreground block text-[10px]">DEPOSITS</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {formatPaise(moneyIn as any)}
              </span>
            </div>
            <span className="text-muted-foreground">-</span>
            <div>
              <span className="text-muted-foreground block text-[10px]">WITHDRAWALS</span>
              <span className="font-semibold text-rose-600 dark:text-rose-400">
                {formatPaise(moneyOut as any)}
              </span>
            </div>
            <span className="text-muted-foreground">=</span>
            <div>
              <span className="text-muted-foreground block text-[10px]">CLOSING</span>
              <span className="font-semibold">{formatPaise(statement.closing!)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
