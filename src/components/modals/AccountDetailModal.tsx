import { 
  DollarSign, 
  Calendar, 
  Building2, 
  User, 
  Tag, 
  FileText,
  Clock,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AttachmentList } from '@/components/attachments/AttachmentList';
import { formatCurrency, formatDate } from '@/lib/supabase';
import { AccountPayable } from '@/hooks/useAccountsPayable';
import { AccountReceivable } from '@/hooks/useAccountsReceivable';

interface AccountDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: (AccountPayable | AccountReceivable) | null;
  type: 'payable' | 'receivable';
  defaultBoletoUrl?: string | null;
  onDateDetected?: (date: Date) => void;
}

const statusConfig = {
  a_vencer: { label: 'A Vencer', icon: Clock, variant: 'outline' as const, className: 'border-warning text-warning' },
  vencida: { label: 'Vencida', icon: AlertTriangle, variant: 'destructive' as const, className: '' },
  paga: { label: 'Paga', icon: CheckCircle, variant: 'outline' as const, className: 'border-success text-success' },
  renegociada: { label: 'Renegociada', icon: RefreshCw, variant: 'secondary' as const, className: '' },
};

export function AccountDetailModal({ 
  open, 
  onOpenChange, 
  account,
  type,
  defaultBoletoUrl,
  onDateDetected,
}: AccountDetailModalProps) {
  if (!account) return null;

  const statusInfo = statusConfig[account.status];
  const StatusIcon = statusInfo.icon;
  const isPayable = type === 'payable';
  const supplier = isPayable ? (account as AccountPayable).supplier : null;
  const customerName = !isPayable ? (account as AccountReceivable).customer_name : null;
  const paidAmount = isPayable 
    ? (account as AccountPayable).paid_amount 
    : (account as AccountReceivable).received_amount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isPayable ? 'bg-destructive/10' : 'bg-success/10'}`}>
              <DollarSign className={`h-5 w-5 ${isPayable ? 'text-destructive' : 'text-success'}`} />
            </div>
            <div>
              <span className="block">{account.description}</span>
              <span className={`text-lg font-mono ${isPayable ? 'text-destructive' : 'text-success'}`}>
                {formatCurrency(account.amount)}
              </span>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status and Tags */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusInfo.variant} className={statusInfo.className}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {statusInfo.label}
            </Badge>
            {account.category && (
              <Badge variant="outline">{account.category}</Badge>
            )}
            {account.tags?.map((tag) => (
              <Badge key={tag} variant="secondary" className="gap-1">
                <Tag className="h-3 w-3" />
                {tag}
              </Badge>
            ))}
          </div>

          <Separator />

          {/* Main Info */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded bg-muted">
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Vencimento</p>
                <p className="text-sm font-medium">{formatDate(account.due_date)}</p>
              </div>
            </div>

            {account.payment_date && (
              <div className="flex items-center gap-3">
                <div className="p-2 rounded bg-success/10">
                  <CheckCircle className="h-4 w-4 text-success" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {isPayable ? 'Data do Pagamento' : 'Data do Recebimento'}
                  </p>
                  <p className="text-sm font-medium">{formatDate(account.payment_date)}</p>
                </div>
              </div>
            )}

            {supplier && (
              <div className="flex items-center gap-3">
                <div className="p-2 rounded bg-muted">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Fornecedor</p>
                  <p className="text-sm font-medium">{supplier.name}</p>
                </div>
              </div>
            )}

            {customerName && (
              <div className="flex items-center gap-3">
                <div className="p-2 rounded bg-muted">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Cliente</p>
                  <p className="text-sm font-medium">{customerName}</p>
                </div>
              </div>
            )}
          </div>

          {/* Financial Details */}
          {(paidAmount || account.interest_amount || account.fine_amount) && (
            <>
              <Separator />
              <div className="grid gap-4 sm:grid-cols-3">
                {paidAmount && (
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">
                      {isPayable ? 'Valor Pago' : 'Valor Recebido'}
                    </p>
                    <p className="text-lg font-mono font-medium text-success">
                      {formatCurrency(paidAmount)}
                    </p>
                  </div>
                )}
                {account.interest_amount && account.interest_amount > 0 && (
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Juros</p>
                    <p className="text-lg font-mono font-medium text-warning">
                      {formatCurrency(account.interest_amount)}
                    </p>
                  </div>
                )}
                {account.fine_amount && account.fine_amount > 0 && (
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Multa</p>
                    <p className="text-lg font-mono font-medium text-destructive">
                      {formatCurrency(account.fine_amount)}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Installments */}
          {account.total_installments && account.total_installments > 1 && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5">
              <FileText className="h-4 w-4 text-primary" />
              <span className="text-sm">
                Parcela {account.installment_number} de {account.total_installments}
              </span>
            </div>
          )}

          {/* Notes */}
          {account.notes && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Observações</p>
              <p className="text-sm bg-muted/50 p-3 rounded-lg">{account.notes}</p>
            </div>
          )}

          <Separator />

          {/* Attachments */}
          <AttachmentList
            recordType={isPayable ? 'account_payable' : 'account_receivable'}
            recordId={account.id}
            defaultBoletoUrl={defaultBoletoUrl}
            onDateDetected={onDateDetected}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
