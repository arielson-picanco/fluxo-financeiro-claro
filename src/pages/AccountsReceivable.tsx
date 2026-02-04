import { useState } from "react";
import { Plus, Filter, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AccountsTable } from "@/components/dashboard/AccountsTable";
import { StatCard } from "@/components/dashboard/StatCard";
import { formatCurrency, type AccountStatus } from "@/lib/supabase";
import { ArrowUpCircle, AlertTriangle, Clock, CheckCircle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Mock data
const mockReceivables = [
  { id: '1', description: 'Venda Móveis - Sala Completa', customer_name: 'João Silva', amount: 12500, due_date: '2024-02-10', status: 'a_vencer' as AccountStatus },
  { id: '2', description: 'Serviço de Entrega', customer_name: 'Maria Santos', amount: 350, due_date: '2024-02-01', status: 'paga' as AccountStatus },
  { id: '3', description: 'Financiamento Parcela 3/12', customer_name: 'Pedro Oliveira', amount: 2200, due_date: '2024-01-25', status: 'vencida' as AccountStatus },
  { id: '4', description: 'Venda Eletrodomésticos', customer_name: 'Ana Costa', amount: 8900, due_date: '2024-02-15', status: 'a_vencer' as AccountStatus },
  { id: '5', description: 'Conserto Garantia Estendida', customer_name: 'Carlos Lima', amount: 450, due_date: '2024-01-28', status: 'renegociada' as AccountStatus },
  { id: '6', description: 'Venda Colchão Premium', customer_name: 'Fernanda Reis', amount: 3200, due_date: '2024-02-08', status: 'a_vencer' as AccountStatus },
];

export default function AccountsReceivable() {
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredAccounts = statusFilter === "all" 
    ? mockReceivables 
    : mockReceivables.filter(a => a.status === statusFilter);

  const totalAmount = mockReceivables.reduce((sum, a) => sum + a.amount, 0);
  const overdueAmount = mockReceivables.filter(a => a.status === 'vencida').reduce((sum, a) => sum + a.amount, 0);
  const pendingAmount = mockReceivables.filter(a => a.status === 'a_vencer').reduce((sum, a) => sum + a.amount, 0);
  const receivedAmount = mockReceivables.filter(a => a.status === 'paga').reduce((sum, a) => sum + a.amount, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contas a Receber</h1>
          <p className="text-muted-foreground">
            Acompanhe suas receitas e recebimentos
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Nova Conta
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total a Receber"
          value={formatCurrency(totalAmount)}
          subtitle={`${mockReceivables.length} contas`}
          icon={ArrowUpCircle}
          variant="default"
        />
        <StatCard
          title="Em Atraso"
          value={formatCurrency(overdueAmount)}
          subtitle={`${mockReceivables.filter(a => a.status === 'vencida').length} contas`}
          icon={AlertTriangle}
          variant="destructive"
        />
        <StatCard
          title="A Receber"
          value={formatCurrency(pendingAmount)}
          subtitle={`${mockReceivables.filter(a => a.status === 'a_vencer').length} contas`}
          icon={Clock}
          variant="info"
        />
        <StatCard
          title="Recebidas"
          value={formatCurrency(receivedAmount)}
          subtitle={`${mockReceivables.filter(a => a.status === 'paga').length} contas`}
          icon={CheckCircle}
          variant="success"
        />
      </div>

      {/* Filters and Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-lg font-semibold">Lista de Contas</CardTitle>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="a_vencer">A Receber</SelectItem>
                  <SelectItem value="vencida">Em Atraso</SelectItem>
                  <SelectItem value="paga">Recebidas</SelectItem>
                  <SelectItem value="renegociada">Renegociadas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <AccountsTable 
            accounts={filteredAccounts} 
            type="receivable"
            onView={(id) => console.log('View', id)}
            onEdit={(id) => console.log('Edit', id)}
            onDelete={(id) => console.log('Delete', id)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
