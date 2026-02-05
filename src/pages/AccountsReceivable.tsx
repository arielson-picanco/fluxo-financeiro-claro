import { useState, useEffect, useMemo } from "react";
import { Plus, Filter, Download, Eye, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/StatCard";
import { formatCurrency, formatDate, calculateEffectiveStatus, AccountStatus } from "@/lib/supabase";
import { ArrowUpCircle, AlertTriangle, Clock, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { AccountReceivableModal } from "@/components/modals/AccountReceivableModal";
import { AccountDetailModal } from "@/components/modals/AccountDetailModal";
import { DeleteConfirmModal } from "@/components/modals/DeleteConfirmModal";
import { useAccountsReceivable, AccountReceivable, AccountReceivableInsert } from "@/hooks/useAccountsReceivable";
import { useAuth } from "@/hooks/useAuth";

const statusConfig = {
  a_vencer: { label: "A Receber", variant: "outline" as const, className: "border-primary text-primary" },
  vencida: { label: "Em Atraso", variant: "destructive" as const, className: "" },
  paga: { label: "Recebida", variant: "outline" as const, className: "border-success text-success" },
  renegociada: { label: "Renegociada", variant: "secondary" as const, className: "" },
};

// Extend AccountReceivable with calculated effective status
type AccountReceivableWithEffectiveStatus = AccountReceivable & { effectiveStatus: AccountStatus };

export default function AccountsReceivablePage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<AccountReceivable | null>(null);
  const [accountToView, setAccountToView] = useState<AccountReceivable | null>(null);
  const [accountToDelete, setAccountToDelete] = useState<AccountReceivable | null>(null);

  const { canWrite, isAdmin } = useAuth();
  const { 
    accounts: rawAccounts, 
    isLoading, 
    createAccount, 
    updateAccount, 
    deleteAccount,
    isCreating,
    isUpdating,
    isDeleting,
  } = useAccountsReceivable();

  // Calculate effective status for all accounts
  const accounts: AccountReceivableWithEffectiveStatus[] = useMemo(() => {
    return rawAccounts.map(account => ({
      ...account,
      effectiveStatus: calculateEffectiveStatus(account.status, account.due_date),
    }));
  }, [rawAccounts]);

  const filteredAccounts = statusFilter === "all" 
    ? accounts 
    : accounts.filter(a => a.effectiveStatus === statusFilter);

  const totalAmount = accounts.reduce((sum, a) => sum + a.amount, 0);
  const overdueAmount = accounts.filter(a => a.effectiveStatus === 'vencida').reduce((sum, a) => sum + a.amount, 0);
  const pendingAmount = accounts.filter(a => a.effectiveStatus === 'a_vencer').reduce((sum, a) => sum + a.amount, 0);
  const receivedAmount = accounts.filter(a => a.effectiveStatus === 'paga').reduce((sum, a) => sum + a.amount, 0);

  const handleOpenCreate = () => {
    setSelectedAccount(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (account: AccountReceivable) => {
    setSelectedAccount(account);
    setIsModalOpen(true);
  };

  const handleOpenView = (account: AccountReceivable) => {
    setAccountToView(account);
    setIsDetailModalOpen(true);
  };

  const handleOpenDelete = (account: AccountReceivable) => {
    setAccountToDelete(account);
    setIsDeleteModalOpen(true);
  };

  const handleSubmit = (data: AccountReceivableInsert | (AccountReceivableInsert & { id: string })) => {
    if ('id' in data) {
      const { id, ...updates } = data;
      updateAccount({ id, ...updates }, {
        onSuccess: () => setIsModalOpen(false),
      });
    } else {
      createAccount(data, {
        onSuccess: () => setIsModalOpen(false),
      });
    }
  };

  const handleConfirmDelete = () => {
    if (accountToDelete) {
      deleteAccount(accountToDelete.id, {
        onSuccess: () => {
          setIsDeleteModalOpen(false);
          setAccountToDelete(null);
        },
      });
    }
  };

  useEffect(() => {
    if (!isModalOpen) {
      setSelectedAccount(null);
    }
  }, [isModalOpen]);

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
          {canWrite && (
            <Button size="sm" onClick={handleOpenCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Conta
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total a Receber"
          value={formatCurrency(totalAmount)}
          subtitle={`${accounts.length} contas`}
          icon={ArrowUpCircle}
          variant="default"
        />
        <StatCard
          title="Em Atraso"
          value={formatCurrency(overdueAmount)}
          subtitle={`${accounts.filter(a => a.effectiveStatus === 'vencida').length} contas`}
          icon={AlertTriangle}
          variant="destructive"
        />
        <StatCard
          title="A Receber"
          value={formatCurrency(pendingAmount)}
          subtitle={`${accounts.filter(a => a.effectiveStatus === 'a_vencer').length} contas`}
          icon={Clock}
          variant="info"
        />
        <StatCard
          title="Recebidas"
          value={formatCurrency(receivedAmount)}
          subtitle={`${accounts.filter(a => a.effectiveStatus === 'paga').length} contas`}
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
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredAccounts.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[120px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAccounts.map((account) => (
                    <TableRow 
                      key={account.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleOpenView(account)}
                    >
                      <TableCell className="font-medium">{account.description}</TableCell>
                      <TableCell>{account.customer_name}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(account.amount)}
                      </TableCell>
                      <TableCell>{formatDate(account.due_date)}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={statusConfig[account.effectiveStatus].variant}
                          className={statusConfig[account.effectiveStatus].className}
                        >
                          {statusConfig[account.effectiveStatus].label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleOpenView(account)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {canWrite && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleOpenEdit(account)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => handleOpenDelete(account)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <ArrowUpCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">Nenhuma conta encontrada</h3>
              <p className="text-muted-foreground">
                {accounts.length === 0 
                  ? "Comece cadastrando sua primeira conta a receber"
                  : "Tente ajustar os filtros"
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <AccountReceivableModal
        key={selectedAccount?.id || 'new'}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        account={selectedAccount}
        onSubmit={handleSubmit}
        isLoading={isCreating || isUpdating}
      />

      <AccountDetailModal
        open={isDetailModalOpen}
        onOpenChange={setIsDetailModalOpen}
        account={accountToView}
        type="receivable"
      />

      <DeleteConfirmModal
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        title="Excluir conta a receber"
        description={`Tem certeza que deseja excluir "${accountToDelete?.description}"? Esta ação não pode ser desfeita.`}
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
      />
    </div>
  );
}
