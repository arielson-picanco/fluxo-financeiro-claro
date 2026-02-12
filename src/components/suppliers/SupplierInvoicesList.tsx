import React from "react";
import { useSupplierInvoices } from "@/hooks/useSupplierInvoices";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Paperclip, Trash2, Loader2, ChevronDown, ChevronRight, FileText, Upload } from "lucide-react";
import { useFileUpload } from "@/hooks/useFileUpload";
import { SupplierInvoiceForm } from "./SupplierInvoiceForm";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

interface ListProps {
  supplierId: string;
}

export function SupplierInvoicesList({ supplierId }: ListProps) {
  const { invoices, isLoading, deleteInvoice } = useSupplierInvoices(supplierId);

  if (isLoading) return (
    <div className="flex items-center justify-center p-8 text-muted-foreground italic">
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Carregando histórico de faturas...
    </div>
  );

  // Agrupar faturas por número da nota
  const groupedInvoices = invoices?.reduce((acc: any, invoice: any) => {
    const key = invoice.invoice_number;
    if (!acc[key]) {
      acc[key] = {
        invoice_number: key,
        product_description: invoice.product_description,
        issue_date: invoice.issue_date,
        total_amount: 0,
        installments: []
      };
    }
    acc[key].installments.push(invoice);
    acc[key].total_amount += Number(invoice.amount);
    return acc;
  }, {});

  const groups = Object.values(groupedInvoices || {}).sort((a: any, b: any) => 
    new Date(b.issue_date).getTime() - new Date(a.issue_date).getTime()
  );

  return (
    <div className="rounded-md border bg-card shadow-sm overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead className="w-[40px]"></TableHead>
            <TableHead className="w-[140px]">Nº da Nota</TableHead>
            <TableHead>Produto/Descrição</TableHead>
            <TableHead className="text-right">Valor Total</TableHead>
            <TableHead>Emissão</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.length > 0 ? (
            groups.map((group: any) => (
              <InvoiceGroupRow 
                key={group.invoice_number} 
                group={group} 
                onDeleteInvoice={(id) => deleteInvoice.mutate(id)}
              />
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                Nenhuma nota fiscal encontrada para este fornecedor.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function InvoiceGroupRow({ group, onDeleteInvoice }: { group: any, onDeleteInvoice: (id: string) => void }) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const hasMultipleInstallments = group.installments.length > 1;

  return (
    <>
      <TableRow 
        className={cn(
          "hover:bg-muted/30 transition-colors cursor-pointer",
          isExpanded && "bg-muted/20"
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <TableCell>
          {hasMultipleInstallments ? (
            isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />
          ) : (
            <FileText className="h-4 w-4 text-muted-foreground/50" />
          )}
        </TableCell>
        <TableCell className="font-mono text-xs font-semibold">
          {group.invoice_number}
        </TableCell>
        <TableCell className="max-w-[180px] truncate text-sm" title={group.product_description}>
          {group.product_description || <span className="text-muted-foreground italic">Sem descrição</span>}
        </TableCell>
        <TableCell className="text-right font-bold text-primary">
          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(group.total_amount)}
        </TableCell>
        <TableCell className="text-sm">
          {format(new Date(group.issue_date), "dd/MM/yyyy", { locale: ptBR })}
        </TableCell>
        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-end items-center gap-2">
            {hasMultipleInstallments ? (
              <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                {group.installments.length} parcelas
              </span>
            ) : (
              <div className="flex items-center gap-1">
                <SupplierInvoiceForm supplierId={group.installments[0].supplier_id} invoice={group.installments[0]} />
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => {
                    if (window.confirm(`Deseja realmente excluir a nota nº ${group.invoice_number}?`)) {
                      onDeleteInvoice(group.installments[0].id);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </TableCell>
      </TableRow>
      
      {isExpanded && group.installments
        .sort((a: any, b: any) => (a.installment_number || 0) - (b.installment_number || 0))
        .map((invoice: any) => (
          <InvoiceInstallmentRow 
            key={invoice.id} 
            invoice={invoice} 
            onDelete={() => {
              const instNum = invoice.installment_number || "?";
              const totalInst = invoice.total_installments || "?";
              if (window.confirm(`Deseja excluir esta parcela (${instNum}/${totalInst}) da nota ${invoice.invoice_number}?`)) {
                onDeleteInvoice(invoice.id);
              }
            }}
          />
        ))
      }
    </>
  );
}

function InvoiceInstallmentRow({ invoice, onDelete }: { invoice: any, onDelete: () => void }) {
  const { attachments, uploadFile, downloadFile, isUploading } = useFileUpload('supplier_invoice', invoice.id);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadFile(file, invoice.id);
    }
  };

  return (
    <TableRow className="bg-muted/5 hover:bg-muted/10 border-l-4 border-l-primary/30">
      <TableCell></TableCell>
      <TableCell className="text-[11px] text-muted-foreground font-bold pl-6">
        Parcela {invoice.installment_number || "?"} de {invoice.total_installments || "?"}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground italic">
        Vencimento: {format(new Date(invoice.due_date), "dd/MM/yyyy", { locale: ptBR })}
      </TableCell>
      <TableCell className="text-right text-sm font-medium">
        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(invoice.amount))}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          {attachments.length > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => downloadFile(attachments[0])}
              className="h-7 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 gap-1 text-[10px]"
            >
              <Paperclip className="h-3 w-3" />
              Boleto
            </Button>
          ) : (
            <div className="relative">
              <input
                type="file"
                id={`file-upload-${invoice.id}`}
                className="hidden"
                onChange={handleFileChange}
                disabled={isUploading}
              />
              <Label
                htmlFor={`file-upload-${invoice.id}`}
                className={cn(
                  "flex items-center gap-1 h-7 px-2 text-[10px] rounded-md cursor-pointer transition-colors",
                  isUploading 
                    ? "bg-muted text-muted-foreground cursor-not-allowed" 
                    : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {isUploading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Upload className="h-3 w-3" />
                )}
                {isUploading ? "Subindo..." : "Anexar"}
              </Label>
            </div>
          )}
        </div>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end items-center gap-1">
          <SupplierInvoiceForm supplierId={invoice.supplier_id} invoice={invoice} />
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 text-destructive/70 hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
