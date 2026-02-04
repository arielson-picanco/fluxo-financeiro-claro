import { 
  ArrowDownCircle, 
  ArrowUpCircle, 
  DollarSign, 
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Loader2,
} from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { OverviewChart } from "@/components/dashboard/OverviewChart";
import { AlertsPanel } from "@/components/dashboard/AlertsPanel";
import { AccountsTable } from "@/components/dashboard/AccountsTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, type AccountStatus } from "@/lib/supabase";
import { useDashboardData } from "@/hooks/useDashboardData";

export default function Dashboard() {
  const { 
    summary, 
    chartData, 
    alerts, 
    recentPayables, 
    recentReceivables, 
    isLoading 
  } = useDashboardData();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const projectedBalance = (summary?.totalReceivable || 0) - (summary?.totalPayable || 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Visão geral do seu controle financeiro
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total a Pagar"
          value={formatCurrency(summary?.totalPayable || 0)}
          subtitle={`${summary?.pendingPayableCount || 0} contas pendentes`}
          icon={ArrowDownCircle}
          variant="destructive"
        />
        <StatCard
          title="Total a Receber"
          value={formatCurrency(summary?.totalReceivable || 0)}
          subtitle={`${summary?.pendingReceivableCount || 0} contas a receber`}
          icon={ArrowUpCircle}
          variant="success"
        />
        <StatCard
          title="Saldo Previsto"
          value={formatCurrency(projectedBalance)}
          subtitle="Próximos 30 dias"
          icon={DollarSign}
          variant={projectedBalance >= 0 ? "info" : "warning"}
        />
        <StatCard
          title="Contas Vencidas"
          value={String(summary?.overdueCount || 0)}
          subtitle={formatCurrency(summary?.totalOverdue || 0) + " em atraso"}
          icon={AlertTriangle}
          variant="warning"
        />
      </div>

      {/* Charts and Alerts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <OverviewChart data={chartData} />
        <AlertsPanel alerts={alerts} />
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Receita Mensal</p>
                <p className="text-3xl font-bold font-mono text-success">
                  {formatCurrency(summary?.monthlyRevenue || 0)}
                </p>
              </div>
              <div className="flex items-center gap-2 text-success">
                {(summary?.revenueChange || 0) >= 0 ? (
                  <TrendingUp className="h-5 w-5" />
                ) : (
                  <TrendingDown className="h-5 w-5" />
                )}
                <span className="text-sm font-medium">
                  {(summary?.revenueChange || 0) >= 0 ? '+' : ''}
                  {(summary?.revenueChange || 0).toFixed(1)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Despesa Mensal</p>
                <p className="text-3xl font-bold font-mono text-destructive">
                  {formatCurrency(summary?.monthlyExpenses || 0)}
                </p>
              </div>
              <div className="flex items-center gap-2 text-destructive">
                {(summary?.expenseChange || 0) >= 0 ? (
                  <TrendingUp className="h-5 w-5" />
                ) : (
                  <TrendingDown className="h-5 w-5" />
                )}
                <span className="text-sm font-medium">
                  {(summary?.expenseChange || 0) >= 0 ? '+' : ''}
                  {(summary?.expenseChange || 0).toFixed(1)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Movimentações Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="payables" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="payables">Contas a Pagar</TabsTrigger>
              <TabsTrigger value="receivables">Contas a Receber</TabsTrigger>
            </TabsList>
            <TabsContent value="payables" className="mt-4">
              <AccountsTable 
                accounts={recentPayables.map(p => ({
                  ...p,
                  status: p.status as AccountStatus
                }))} 
                type="payable" 
              />
            </TabsContent>
            <TabsContent value="receivables" className="mt-4">
              <AccountsTable 
                accounts={recentReceivables.map(r => ({
                  ...r,
                  status: r.status as AccountStatus
                }))} 
                type="receivable" 
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
