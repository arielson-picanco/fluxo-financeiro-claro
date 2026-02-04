import { useState } from "react";
import { Download, Calendar, Filter, FileSpreadsheet, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/supabase";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const monthlyData = [
  { month: "Jan", receitas: 45000, despesas: 32000 },
  { month: "Fev", receitas: 52000, despesas: 38000 },
  { month: "Mar", receitas: 48000, despesas: 35000 },
  { month: "Abr", receitas: 61000, despesas: 42000 },
  { month: "Mai", receitas: 55000, despesas: 39000 },
  { month: "Jun", receitas: 67000, despesas: 45000 },
];

const categoryData = [
  { name: "Fornecedores", value: 45000, color: "hsl(221 83% 53%)" },
  { name: "Aluguel", value: 12000, color: "hsl(142 71% 45%)" },
  { name: "Energia", value: 8500, color: "hsl(38 92% 50%)" },
  { name: "Transporte", value: 6200, color: "hsl(262 83% 58%)" },
  { name: "Outros", value: 4800, color: "hsl(199 89% 48%)" },
];

const reportTypes = [
  {
    id: 'monthly',
    title: 'Relatório Mensal',
    description: 'Resumo consolidado do mês',
    icon: Calendar,
  },
  {
    id: 'payables',
    title: 'Contas a Pagar',
    description: 'Todas as despesas do período',
    icon: TrendingDown,
  },
  {
    id: 'receivables',
    title: 'Contas a Receber',
    description: 'Todas as receitas do período',
    icon: TrendingUp,
  },
  {
    id: 'cashflow',
    title: 'Fluxo de Caixa',
    description: 'Movimentações detalhadas',
    icon: DollarSign,
  },
];

export default function Reports() {
  const [period, setPeriod] = useState("current_month");

  const totalReceitas = monthlyData.reduce((sum, d) => sum + d.receitas, 0);
  const totalDespesas = monthlyData.reduce((sum, d) => sum + d.despesas, 0);
  const saldo = totalReceitas - totalDespesas;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Relatórios</h1>
          <p className="text-muted-foreground">
            Análises e exportações financeiras
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current_month">Mês Atual</SelectItem>
              <SelectItem value="last_month">Mês Anterior</SelectItem>
              <SelectItem value="last_quarter">Último Trimestre</SelectItem>
              <SelectItem value="last_year">Último Ano</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Receitas</p>
                <p className="text-2xl font-bold font-mono text-success">
                  {formatCurrency(totalReceitas)}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-success-muted">
                <TrendingUp className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Despesas</p>
                <p className="text-2xl font-bold font-mono text-destructive">
                  {formatCurrency(totalDespesas)}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-destructive/10">
                <TrendingDown className="h-6 w-6 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Saldo</p>
                <p className={`text-2xl font-bold font-mono ${saldo >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {formatCurrency(saldo)}
                </p>
              </div>
              <div className={`p-3 rounded-xl ${saldo >= 0 ? 'bg-success-muted' : 'bg-destructive/10'}`}>
                <DollarSign className={`h-6 w-6 ${saldo >= 0 ? 'text-success' : 'text-destructive'}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Receitas vs Despesas</CardTitle>
            <CardDescription>Comparativo mensal</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
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
                            <p className="text-sm text-success">
                              Receitas: {formatCurrency(payload[0]?.value as number)}
                            </p>
                            <p className="text-sm text-destructive">
                              Despesas: {formatCurrency(payload[1]?.value as number)}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="receitas" fill="hsl(142 71% 45%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="despesas" fill="hsl(0 84% 60%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Despesas por Categoria</CardTitle>
            <CardDescription>Distribuição percentual</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend 
                    verticalAlign="bottom"
                    formatter={(value) => <span className="text-sm text-muted-foreground">{value}</span>}
                  />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="rounded-lg bg-card p-3 shadow-lg border">
                            <p className="text-sm font-medium">{payload[0]?.name}</p>
                            <p className="text-sm">{formatCurrency(payload[0]?.value as number)}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Export Options */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Exportar Relatórios</CardTitle>
          <CardDescription>Gere relatórios em Excel para análise detalhada</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {reportTypes.map((report) => (
              <Card key={report.id} className="card-hover cursor-pointer border-dashed">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <report.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{report.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {report.description}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon">
                    <Download className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
