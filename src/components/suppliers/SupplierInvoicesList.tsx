import React from "react";
import { useSupplierInvoices } from "@/hooks/useSupplierInvoices";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Paperclip, Trash2, Loader2 } from "lucide-react";
import { useFileUpload } from "@/hooks/useFileUpload";
import { SupplierInvoiceForm } from "./SupplierInvoiceForm";

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

  return (
    <div className="rounded-md border bg-card shadow-sm overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead className="w-[140px]">Nº da Nota</TableHead>
            <TableHead>Produto/Descrição</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            <TableHead>Emissão</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices && invoices.length > 0 ? (
            invoices.map((invoice) => (
              <InvoiceRowItem 
                key={invoice.id} 
                invoice={invoice} 
                onDelete={() => {
                  if (window.confirm(`Deseja realmente excluir a nota nº ${invoice.invoice_number}?`)) {
                    deleteInvoice.mutate(invoice.id);
                  }
                }}
              />
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                Nenhuma nota fiscal encontrada para este fornecedor.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function InvoiceRowItem({ invoice, onDelete }: { invoice: any, onDelete: () => void }) {
  // Hook para gerenciar os anexos vinculados a esta NF específica
  const { attachments, downloadFile } = useFileUpload('supplier_invoice', invoice.id);

  return (
    <TableRow className="hover:bg-muted/30 transition-colors">
      <TableCell className="font-mono text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold">{invoice.invoice_number}</span>
          {attachments.length > 0 && (
            <button
              onClick={() => downloadFile(attachments[0])}
              className="p-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 transition-all"
              title="Baixar Boleto PDF"
            >
              <Paperclip className="h-3 w-3" />
            </button>
          )}
        </div>
      </TableCell>
      <TableCell className="max-w-[180px] truncate text-sm" title={invoice.product_description}>
        {invoice.product_description || <span className="text-muted-foreground italic">Sem descrição</span>}
      </TableCell>
      <TableCell className="text-right font-medium">
        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(invoice.amount))}
      </TableCell>
      <TableCell className="text-sm">
        {format(new Date(invoice.issue_date), "dd/MM/yyyy", { locale: ptBR })}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end items-center gap-1">
          {/* Componente de Edição que abre o mesmo formulário de cadastro */}
          <SupplierInvoiceForm supplierId={invoice.supplier_id} invoice={invoice} />
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={onDelete}
            title="Excluir Nota"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}