import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { formatPaise } from '@/lib/money';
import { topMerchantsData } from '@/store/selectors';

export function TopMerchants() {
  const merchants = topMerchantsData.value;

  if (merchants.length === 0) {
    return (
      <Card className="p-6 text-xs text-muted-foreground text-center">
        No merchant spending data available.
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-foreground">
          Top Payees & Merchants
        </CardTitle>
      </CardHeader>
      <CardContent className="divide-y divide-border/60 p-0">
        {merchants.map((m, idx) => (
          <div key={m.merchant} className="flex items-center justify-between px-5 py-2.5 text-xs">
            <div className="flex items-center space-x-3 truncate">
              <span className="font-mono text-[10px] text-muted-foreground w-4 text-right">
                {idx + 1}.
              </span>
              <div className="truncate">
                <div className="font-medium text-foreground truncate">{m.merchant}</div>
                <div className="text-[10px] text-muted-foreground">{m.count} transactions</div>
              </div>
            </div>
            <span className="font-mono font-semibold text-foreground whitespace-nowrap num">
              {formatPaise(m.amountPaise)}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
