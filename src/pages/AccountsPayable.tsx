import { useState } from "react";
import { Plus, Filter, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AccountsTable } from "@/components/dashboard/AccountsTable";
import { StatCard } from "@/components/dashboard/StatCard";
import { formatCurrency, type AccountStatus } from "@/lib/supabase";
import { ArrowDownCircle, AlertTriangle, Clock, CheckCircle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Mock data
const mockPayables = [
  { id: '1', description: 'Fornecedor ABC Móveis - Lote 15', supplier_name: 'ABC Móveis', amount: 8500, due_date: '2024-02-05', status: 'a_vencer' as AccountStatus },
  { id: '2', description: 'Conta de Energia - Janeiro', supplier_name: 'CPFL Energia', amount: 1850, due_date: '2024-01-28', status: 'vencida' as AccountStatus },
  { id: '3', description: 'Aluguel Loja Centro', supplier_name: 'Imobiliária XYZ', amount: 4200, due_date: '2024-02-01', status: 'paga' as AccountStatus },
  { id: '4', description: 'Fornecedor Eletros Plus', supplier_name: 'Eletros Plus', amount: 15600, due_date: '2024-02-10', status: 'a_vencer' as AccountStatus },
  { id: '5', description: 'IPTU 2024 - Parcela 1', supplier_name: 'Prefeitura', amount: 2100, due_date: '2024-01-30', status: 'renegociada' as AccountStatus },
  { id: '6', description: 'Internet Empresarial', supplier_name: 'Vivo', amount: 450, due_date: '2024-02-05', status: 'a_vencer' as AccountStatus },
];

export default function AccountsPayable() {
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredAccounts = statusFilter === "all" 
    ? mockPayables 
    : mockPayables.filter(a => a.status === statusFilter);

  const totalAmount = mockPayables.reduce((sum, a) => sum + a.amount, 0);
  const overdueAmount = mockPayables.filter(a => a.status === 'vencida').reduce((sum, a) => sum + a.amount, 0);
  const pendingAmount = mockPayables.filter(a => a.status === 'a_vencer').reduce((sum, a) => sum + a.amount, 0);
  const paidAmount = mockPayables.filter(a => a.status === 'paga').reduce((sum, a) => sum + a.amount, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contas a Pagar</h1>
          <p className="text-muted-foreground">
            Gerencie todas as suas despesas e pagamentos
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
          title="Total a Pagar"
          value={formatCurrency(totalAmount)}
          subtitle={`${mockPayables.length} contas`}
          icon={ArrowDownCircle}
          variant="default"
        />
        <StatCard
          title="Vencidas"
          value={formatCurrency(overdueAmount)}
          subtitle={`${mockPayables.filter(a => a.status === 'vencida').length} contas`}
          icon={AlertTriangle}
          variant="destructive"
        />
        <StatCard
          title="A Vencer"
          value={formatCurrency(pendingAmount)}
          subtitle={`${mockPayables.filter(a => a.status === 'a_vencer').length} contas`}
          icon={Clock}
          variant="warning"
        />
        <StatCard
          title="Pagas"
          value={formatCurrency(paidAmount)}
          subtitle={`${mockPayables.filter(a => a.status === 'paga').length} contas`}
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
                  <SelectItem value="a_vencer">A Vencer</SelectItem>
                  <SelectItem value="vencida">Vencidas</SelectItem>
                  <SelectItem value="paga">Pagas</SelectItem>
                  <SelectItem value="renegociada">Renegociadas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <AccountsTable 
            accounts={filteredAccounts} 
            type="payable"
            onView={(id) => console.log('View', id)}
            onEdit={(id) => console.log('Edit', id)}
            onDelete={(id) => console.log('Delete', id)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
