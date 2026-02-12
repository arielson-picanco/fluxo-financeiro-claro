import React from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSupplierInvoices } from "@/hooks/useSupplierInvoices";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit2 } from "lucide-react";

interface FormProps {
  supplierId: string;
  invoice?: any; // Se vier uma nota, entramos no modo Edição
}

export function SupplierInvoiceForm({ supplierId, invoice }: FormProps) {
  const isEditing = !!invoice;
  const { createInvoice, updateInvoice } = useSupplierInvoices(supplierId);
  const { register, handleSubmit, reset, watch } = useForm({
    defaultValues: invoice || {
      total_installments: 1,
      product_description: "",
      installment_amount: 0,
      amount: 0
    }
  });
  const [open, setOpen] = React.useState(false);

  const totalInstallments = watch("total_installments");
  const installmentAmount = watch("installment_amount");

  // Cálculo automático do valor total baseado no valor da parcela
  const calculatedTotal = (parseFloat(installmentAmount) || 0) * (parseInt(totalInstallments) || 1);

  const onSubmit = async (data: any) => {
    const payload = {
      supplier_id: supplierId,
      invoice_number: data.invoice_number,
      product_description: data.product_description,
      amount: isEditing ? parseFloat(data.amount) : calculatedTotal,
      due_date: data.due_date,
      issue_date: data.issue_date || new Date().toISOString().split('T')[0],
      total_installments: parseInt(data.total_installments) || 1,
      notes: data.notes || null,
    };

    if (isEditing) {
      updateInvoice.mutate({ id: invoice.id, ...payload }, {
        onSuccess: () => setOpen(false)
      });
    } else {
      createInvoice.mutate(payload, {
        onSuccess: () => {
          reset();
          setOpen(false);
        }
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEditing ? (
          <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500"><Edit2 className="h-4 w-4" /></Button>
        ) : (
          <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Nova Nota</Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{isEditing ? "Editar Nota" : "Nova Nota"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nº da Nota</Label>
              <Input {...register("invoice_number", { required: true })} />
            </div>
            <div className="space-y-2">
              <Label >Data de Vencimento {totalInstallments > 1 ? "(1ª Parc)" : ""}</Label>
              <Input type="date" {...register("due_date", { required: true })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Descrição do Produto/Serviço</Label>
            <Input {...register("product_description")} />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{isEditing ? "Valor da Nota" : "Valor da Parcela"}</Label>
              <Input 
                type="number" 
                step="0.01" 
                placeholder="0,00" 
                {...register(isEditing ? "amount" : "installment_amount", { required: true })} 
              />
            </div>
            
            {!isEditing && (
              <div className="space-y-2">
                <Label>Qtd. Parcelas</Label>
                <Input type="number" min="1" {...register("total_installments")} />
              </div>
            )}
          </div>

          {!isEditing && totalInstallments > 1 && (
            <div className="p-3 bg-muted/50 rounded-md border border-dashed text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Valor Total da Nota</p>
              <p className="text-lg font-bold text-primary">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(calculatedTotal)}
              </p>
              <p className="text-[10px] text-muted-foreground italic">
                {totalInstallments} parcelas de {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(installmentAmount || 0)}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea 
              placeholder="Adicione detalhes importantes sobre esta nota fiscal..." 
              className="resize-none min-h-[80px]"
              {...register("notes")} 
            />
          </div>
          
          <Button type="submit" className="w-full">
            {isEditing ? "Salvar Alterações" : "Cadastrar"}
          </Button>
        </form>
      </DialogContent>  
    </Dialog>
  );
}
