import { 
  ArrowDownCircle, 
  ArrowUpCircle, 
  DollarSign, 
  AlertTriangle,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { OverviewChart } from "@/components/dashboard/OverviewChart";
import { AlertsPanel } from "@/components/dashboard/AlertsPanel";
import { AccountsTable } from "@/components/dashboard/AccountsTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, type AccountStatus } from "@/lib/supabase";

// Mock data for demonstration
const mockPayables = [
  { id: '1', description: 'Fornecedor ABC Móveis', supplier_name: 'ABC Móveis', amount: 8500, due_date: '2024-02-05', status: 'a_vencer' as AccountStatus },
  { id: '2', description: 'Conta de Energia', supplier_name: 'CPFL', amount: 1850, due_date: '2024-01-28', status: 'vencida' as AccountStatus },
  { id: '3', description: 'Aluguel Loja', supplier_name: 'Imobiliária XYZ', amount: 4200, due_date: '2024-02-01', status: 'paga' as AccountStatus },
];

const mockReceivables = [
  { id: '1', description: 'Venda Móveis - Cliente A', customer_name: 'João Silva', amount: 12500, due_date: '2024-02-10', status: 'a_vencer' as AccountStatus },
  { id: '2', description: 'Serviço de Entrega', customer_name: 'Maria Santos', amount: 350, due_date: '2024-02-01', status: 'paga' as AccountStatus },
  { id: '3', description: 'Financiamento 3/12', customer_name: 'Pedro Oliveira', amount: 2200, due_date: '2024-01-25', status: 'vencida' as AccountStatus },
];

export default function Dashboard() {
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
          value={formatCurrency(45230)}
          subtitle="15 contas pendentes"
          icon={ArrowDownCircle}
          variant="destructive"
          trend={{ value: 12, isPositive: false }}
        />
        <StatCard
          title="Total a Receber"
          value={formatCurrency(78650)}
          subtitle="23 contas a receber"
          icon={ArrowUpCircle}
          variant="success"
          trend={{ value: 8, isPositive: true }}
        />
        <StatCard
          title="Saldo Previsto"
          value={formatCurrency(33420)}
          subtitle="Próximos 30 dias"
          icon={DollarSign}
          variant="info"
        />
        <StatCard
          title="Contas Vencidas"
          value="5"
          subtitle={formatCurrency(12350) + " em atraso"}
          icon={AlertTriangle}
          variant="warning"
        />
      </div>

      {/* Charts and Alerts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <OverviewChart />
        <AlertsPanel />
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Receita Mensal</p>
                <p className="text-3xl font-bold font-mono text-success">
                  {formatCurrency(67000)}
                </p>
              </div>
              <div className="flex items-center gap-2 text-success">
                <TrendingUp className="h-5 w-5" />
                <span className="text-sm font-medium">+12.5%</span>
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
                  {formatCurrency(45000)}
                </p>
              </div>
              <div className="flex items-center gap-2 text-destructive">
                <TrendingDown className="h-5 w-5" />
                <span className="text-sm font-medium">+5.2%</span>
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
              <AccountsTable accounts={mockPayables} type="payable" />
            </TabsContent>
            <TabsContent value="receivables" className="mt-4">
              <AccountsTable accounts={mockReceivables} type="receivable" />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
