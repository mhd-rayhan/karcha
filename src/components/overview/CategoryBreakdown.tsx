import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { formatPaise } from '@/lib/money';
import { categorySpendData } from '@/store/selectors';

export function CategoryBreakdown() {
  const categories = categorySpendData.value;

  if (categories.length === 0) {
    return (
      <Card className="p-6 text-xs text-muted-foreground text-center">
        No expense category data available.
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-foreground">Expense Categories</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3.5">
        {categories.slice(0, 7).map((cat) => (
          <div key={cat.id} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-foreground truncate max-w-[180px]">{cat.name}</span>
              <div className="flex items-center space-x-2 font-mono">
                <span className="text-muted-foreground text-[11px]">
                  {cat.percentage.toFixed(1)}%
                </span>
                <span className="font-semibold text-foreground num">
                  {formatPaise(cat.amountPaise)}
                </span>
              </div>
            </div>
            {/* Visual progress bar */}
            <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, Math.max(2, cat.percentage))}%`,
                  backgroundColor: cat.color,
                }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
