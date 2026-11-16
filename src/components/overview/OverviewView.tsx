import { Select } from '@/components/ui/Select';
import { accounts, filterAccountId, txns } from '@/store';
import { CategoryBreakdown } from './CategoryBreakdown';
import { MonthlyBarChart } from './MonthlyBarChart';
import { SummaryCards } from './SummaryCards';
import { TopMerchants } from './TopMerchants';

export function OverviewView() {
  if (txns.value.length === 0) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 text-center space-y-4">
        <h3 className="text-base font-semibold text-foreground">No Statement Data Available</h3>
        <p className="text-xs text-muted-foreground">
          Upload your bank statements in the Import tab to see insights.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 space-y-6 animate-fade-in">
      {/* Title & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Financial Overview</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Aggregated metrics across your analyzed statements
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <label
            htmlFor="account-filter"
            className="text-xs text-muted-foreground whitespace-nowrap"
          >
            Account:
          </label>
          <Select
            id="account-filter"
            value={filterAccountId.value}
            onChange={(e: any) => (filterAccountId.value = e.target.value)}
            className="w-48 text-xs"
          >
            <option value="all">All Accounts ({accounts.value.length})</option>
            {accounts.value.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.bank} •••• {acc.last4} ({acc.product})
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <SummaryCards />

      {/* Monthly Chart */}
      <MonthlyBarChart />

      {/* Categories & Top Merchants Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <CategoryBreakdown />
        <TopMerchants />
      </div>
    </div>
  );
}
