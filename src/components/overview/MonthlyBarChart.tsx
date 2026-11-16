import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { monthlyChartData } from '@/store/selectors';

// Preact compatibility wrappers for Recharts components
const ResponsiveContainerComp = ResponsiveContainer as any;
const BarChartComp = BarChart as any;
const CartesianGridComp = CartesianGrid as any;
const XAxisComp = XAxis as any;
const YAxisComp = YAxis as any;
const TooltipComp = Tooltip as any;
const LegendComp = Legend as any;
const BarComp = Bar as any;

export function MonthlyBarChart() {
  const data = monthlyChartData.value;

  if (data.length === 0) {
    return (
      <Card className="h-72 flex items-center justify-center p-6 text-xs text-muted-foreground">
        No monthly transaction data available.
      </Card>
    );
  }

  const formatRupeesK = (val: number) => {
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
    if (val >= 1000) return `₹${(val / 1000).toFixed(0)}k`;
    return `₹${val}`;
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-foreground">
          Monthly Inflow vs Outflow
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          <ResponsiveContainerComp width="100%" height="100%">
            <BarChartComp data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGridComp
                strokeDasharray="3 3"
                vertical={false}
                stroke="hsl(var(--border))"
              />
              <XAxisComp
                dataKey="name"
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxisComp
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={formatRupeesK}
              />
              <TooltipComp
                content={({ active, payload, label }: any) => {
                  if (active && payload?.length) {
                    return (
                      <div className="rounded-lg border border-border bg-card p-2.5 shadow-md text-xs space-y-1">
                        <div className="font-semibold text-foreground">{label}</div>
                        <div className="text-emerald-600 dark:text-emerald-400 font-mono">
                          Income: ₹
                          {Number(payload[0]?.value).toLocaleString('en-IN', {
                            minimumFractionDigits: 2,
                          })}
                        </div>
                        <div className="text-rose-600 dark:text-rose-400 font-mono">
                          Expense: ₹
                          {Number(payload[1]?.value).toLocaleString('en-IN', {
                            minimumFractionDigits: 2,
                          })}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <LegendComp
                verticalAlign="top"
                align="right"
                iconType="circle"
                wrapperStyle={{ paddingBottom: '10px', fontSize: '11px' }}
              />
              <BarComp
                dataKey="income"
                name="Inflow"
                fill="#10b981"
                radius={[4, 4, 0, 0]}
                maxBarSize={32}
              />
              <BarComp
                dataKey="expense"
                name="Outflow"
                fill="#f43f5e"
                radius={[4, 4, 0, 0]}
                maxBarSize={32}
              />
            </BarChartComp>
          </ResponsiveContainerComp>
        </div>
      </CardContent>
    </Card>
  );
}
