import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/lib/supabase";

interface ChartData {
  month: string;
  receitas: number;
  despesas: number;
}

interface OverviewChartProps {
  data?: ChartData[];
}

const defaultData: ChartData[] = [
  { month: "Jan", receitas: 0, despesas: 0 },
  { month: "Fev", receitas: 0, despesas: 0 },
  { month: "Mar", receitas: 0, despesas: 0 },
  { month: "Abr", receitas: 0, despesas: 0 },
  { month: "Mai", receitas: 0, despesas: 0 },
  { month: "Jun", receitas: 0, despesas: 0 },
];

export function OverviewChart({ data = defaultData }: OverviewChartProps) {
  const chartData = data.length > 0 ? data : defaultData;
  
  return (
    <Card className="col-span-full lg:col-span-2">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Visão Geral Financeira</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="receitas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(142 71% 45%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(142 71% 45%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="despesas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(0 84% 60%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(0 84% 60%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="month" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-lg bg-card p-3 shadow-lg border">
                        <p className="text-sm font-medium mb-2">{payload[0]?.payload.month}</p>
                        <div className="space-y-1">
                          <p className="text-sm">
                            <span className="inline-block w-3 h-3 rounded-full bg-success mr-2" />
                            Receitas: {formatCurrency(payload[0]?.value as number)}
                          </p>
                          <p className="text-sm">
                            <span className="inline-block w-3 h-3 rounded-full bg-destructive mr-2" />
                            Despesas: {formatCurrency(payload[1]?.value as number)}
                          </p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="receitas"
                stroke="hsl(142 71% 45%)"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#receitas)"
              />
              <Area
                type="monotone"
                dataKey="despesas"
                stroke="hsl(0 84% 60%)"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#despesas)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-success" />
            <span className="text-sm text-muted-foreground">Receitas</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-destructive" />
            <span className="text-sm text-muted-foreground">Despesas</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
