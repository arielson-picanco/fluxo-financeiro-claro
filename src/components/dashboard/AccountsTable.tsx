import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MoreHorizontal, Eye, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, statusLabels, type AccountStatus } from "@/lib/supabase";
import { cn } from "@/lib/utils";

interface Account {
  id: string;
  description: string;
  amount: number;
  due_date: string;
  status: AccountStatus;
  supplier_name?: string;
  customer_name?: string;
}

interface AccountsTableProps {
  accounts: Account[];
  type: 'payable' | 'receivable';
  onView?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  isLoading?: boolean;
}

const statusVariants: Record<AccountStatus, string> = {
  a_vencer: 'bg-info-muted text-info border-info/30',
  vencida: 'bg-destructive/10 text-destructive border-destructive/30 animate-pulse-soft',
  paga: 'bg-success-muted text-success border-success/30',
  renegociada: 'bg-pending-muted text-pending border-pending/30',
};

export function AccountsTable({
  accounts,
  type,
  onView,
  onEdit,
  onDelete,
  isLoading,
}: AccountsTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Nenhuma conta encontrada</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="font-semibold">Descrição</TableHead>
            <TableHead className="font-semibold">
              {type === 'payable' ? 'Fornecedor' : 'Cliente'}
            </TableHead>
            <TableHead className="font-semibold">Vencimento</TableHead>
            <TableHead className="font-semibold text-right">Valor</TableHead>
            <TableHead className="font-semibold text-center">Status</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {accounts.map((account) => {
            const isOverdue = account.status === 'vencida';
            const dueDate = new Date(account.due_date);
            
            return (
              <TableRow 
                key={account.id}
                className={cn(
                  "group transition-colors",
                  isOverdue && "bg-destructive/5"
                )}
              >
                <TableCell className="font-medium">
                  {account.description}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {type === 'payable' ? account.supplier_name : account.customer_name}
                </TableCell>
                <TableCell>
                  <span className={cn(isOverdue && "text-destructive font-medium")}>
                    {format(dueDate, "dd 'de' MMM, yyyy", { locale: ptBR })}
                  </span>
                </TableCell>
                <TableCell className="text-right font-mono font-medium">
                  {formatCurrency(account.amount)}
                </TableCell>
                <TableCell className="text-center">
                  <Badge 
                    variant="outline" 
                    className={cn("text-xs", statusVariants[account.status])}
                  >
                    {statusLabels[account.status]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onView?.(account.id)}>
                        <Eye className="h-4 w-4 mr-2" />
                        Visualizar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit?.(account.id)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => onDelete?.(account.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
