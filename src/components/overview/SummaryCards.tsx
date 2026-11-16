import { Card } from '@/components/ui/Card';
import { formatPaise } from '@/lib/money';
import { accounts, statements, txns } from '@/store';
import { financialSummary } from '@/store/selectors';

export function SummaryCards() {
  const summary = financialSummary.value;
  const isNetPositive = summary.netSavingsPaise >= 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Money In */}
      <Card className="p-4 space-y-2 border-border bg-card hover:border-emerald-500/30 hover:shadow-xs transition-all duration-200">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Money In (Inflow)
          </span>
          <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            </svg>
          </div>
        </div>
        <div className="text-2xl font-bold font-mono tracking-tight text-emerald-600 dark:text-emerald-400 num">
          {formatPaise(summary.moneyInPaise)}
        </div>
        <p className="text-[11px] text-muted-foreground">
          Excludes internal transfers & ignored rows
        </p>
      </Card>

      {/* 2. Money Out */}
      <Card className="p-4 space-y-2 border-border bg-card hover:border-rose-500/30 hover:shadow-xs transition-all duration-200">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Money Out (Spend)
          </span>
          <div className="h-7 w-7 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 10l7-7m0 0l7 7m-7-7v18"
              />
            </svg>
          </div>
        </div>
        <div className="text-2xl font-bold font-mono tracking-tight text-rose-600 dark:text-rose-400 num">
          {formatPaise(summary.moneyOutPaise)}
        </div>
        <p className="text-[11px] text-muted-foreground">Total outflow across selected accounts</p>
      </Card>

      {/* 3. Net Savings */}
      <Card className="p-4 space-y-2 border-border bg-card hover:border-primary/30 hover:shadow-xs transition-all duration-200">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Net Savings / Surplus
          </span>
          <div
            className={`h-7 w-7 rounded-lg flex items-center justify-center ${
              isNetPositive
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
            }`}
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>
        <div
          className={`text-2xl font-bold font-mono tracking-tight num ${
            isNetPositive ? 'text-foreground' : 'text-destructive'
          }`}
        >
          {formatPaise(summary.netSavingsPaise, { showSign: true })}
        </div>
        <p className="text-[11px] text-muted-foreground">
          {isNetPositive ? 'Positive surplus retained' : 'Deficit / higher spend this period'}
        </p>
      </Card>

      {/* 4. Accounts & Statements Overview */}
      <Card className="p-4 space-y-2 border-border bg-card hover:border-primary/30 hover:shadow-xs transition-all duration-200">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Data Coverage
          </span>
          <div className="h-7 w-7 rounded-lg bg-secondary text-foreground flex items-center justify-center">
            <svg
              className="h-4 w-4 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
        </div>
        <div className="text-2xl font-bold font-mono tracking-tight text-foreground num">
          {txns.value.length}{' '}
          <span className="text-xs font-normal text-muted-foreground">txns</span>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Across {accounts.value.length} accounts & {statements.value.length} statements
        </p>
      </Card>
    </div>
  );
}
