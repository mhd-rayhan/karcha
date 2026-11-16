import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { formatDisplayDate } from '@/lib/dates';
import { formatPaise } from '@/lib/money';
import { feeTxnsData, recurringTxnsData, unusualTxnsData } from '@/store/selectors';

export function RecurringView() {
  const recurring = recurringTxnsData.value;
  const fees = feeTxnsData.value;
  const unusual = unusualTxnsData.value;

  const totalFeesPaise = fees.reduce((acc, t) => acc + Math.abs(t.amount), 0);

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">Expense Intelligence</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Automated pattern detection: recurring subscriptions, hidden bank charges, and unusual
          spikes
        </p>
      </div>

      {/* Grid of 3 key sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1. Recurring Subscriptions */}
        <Card className="border-border">
          <CardHeader className="pb-3 border-b border-border/40">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-foreground">
                Recurring Subscriptions
              </CardTitle>
              <Badge variant="secondary" className="text-[10px]">
                {recurring.length} active
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Detected monthly cadence with consistent amounts
            </p>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-border/60">
            {recurring.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                No recurring subscriptions detected yet.
              </div>
            ) : (
              recurring.map((r) => (
                <div key={r.merchant} className="p-4 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground text-xs">{r.merchant}</span>
                    <span className="font-mono font-medium text-foreground text-xs num">
                      {formatPaise(r.avgAmountPaise)} / mo
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>{r.count} consecutive charges</span>
                    <span>Last: {formatDisplayDate(r.txns[r.txns.length - 1].date)}</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* 2. Fees & Bank Charges */}
        <Card className="border-border">
          <CardHeader className="pb-3 border-b border-border/40">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-foreground">
                Bank Fees & Charges
              </CardTitle>
              <span className="font-mono text-xs font-semibold text-rose-600 dark:text-rose-400 num">
                {formatPaise(totalFeesPaise as any)}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Annual card fees, GST, interest, and forex markups
            </p>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-border/60">
            {fees.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                No bank fees or charges detected.
              </div>
            ) : (
              fees.map((f) => (
                <div key={f.id} className="p-3.5 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground truncate max-w-[180px]">
                      {f.narration}
                    </span>
                    <span className="font-mono font-medium text-rose-600 dark:text-rose-400 whitespace-nowrap num">
                      {formatPaise(f.amount)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="font-mono">{f.date}</span>
                    <Badge variant="destructive" className="text-[10px]">
                      Fee
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* 3. Unusual Transactions */}
        <Card className="border-border">
          <CardHeader className="pb-3 border-b border-border/40">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-foreground">
                Unusual Transactions
              </CardTitle>
              <Badge variant="warning" className="text-[10px]">
                {unusual.length} flagged
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Spends &gt; 3× median value and above ₹1,000 threshold
            </p>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-border/60">
            {unusual.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                No unusual spending spikes detected.
              </div>
            ) : (
              unusual.map((u) => (
                <div key={u.id} className="p-3.5 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground truncate max-w-[180px]">
                      {u.merchant || u.narration}
                    </span>
                    <span className="font-mono font-semibold text-foreground whitespace-nowrap num">
                      {formatPaise(u.amount)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="font-mono">{u.date}</span>
                    <Badge variant="secondary" className="text-[10px]">
                      {u.category.split(':').pop()}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
