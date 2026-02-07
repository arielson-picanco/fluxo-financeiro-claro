import React from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSupplierInvoices } from "@/hooks/useSupplierInvoices";
import { useFileUpload } from "@/hooks/useFileUpload";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Paperclip, Loader2, Edit2 } from "lucide-react";

interface FormProps {
  supplierId: string;
  invoice?: any; // Se vier uma nota, entramos no modo Edição
}

export function SupplierInvoiceForm({ supplierId, invoice }: FormProps) {
  const isEditing = !!invoice;
  const { createInvoice, updateInvoice } = useSupplierInvoices(supplierId);
  const { uploadFile, isUploading } = useFileUpload('supplier_invoice'); 
  const { register, handleSubmit, reset } = useForm({
    defaultValues: invoice || {}
  });
  const [open, setOpen] = React.useState(false);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);

  const onSubmit = async (data: any) => {
    const payload = {
      supplier_id: supplierId,
      invoice_number: data.invoice_number,
      product_description: data.product_description,
      amount: parseFloat(data.amount),
      due_date: data.due_date,
      issue_date: data.issue_date,
    };

    if (isEditing) {
      updateInvoice.mutate({ id: invoice.id, ...payload }, {
        onSuccess: () => setOpen(false)
      });
    } else {
      createInvoice.mutate(payload, {
        onSuccess: async (newInvoices: any) => {
          const newId = Array.isArray(newInvoices) ? newInvoices[0]?.id : newInvoices?.id;
          if (selectedFile && newId) await uploadFile(selectedFile, newId);
          reset();
          setSelectedFile(null);
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
              <Label >Data de Vencimento</Label>
              <Input type="date" {...register("due_date", { required: true })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Input {...register("product_description")} />
          </div>
          <div className="space-y-2">
            <Label>Valor Total</Label>
            <Input type="number" step="0.01" {...register("amount", { required: true })} />
          </div>
          
          {!isEditing && (
            <div className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer">
              <input type="file" id="file-up" className="hidden" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
              <Label htmlFor="file-up" className="cursor-pointer flex flex-col items-center gap-1">
                <Paperclip className="h-6 w-6 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{selectedFile ? selectedFile.name : "Anexar Boleto"}</span>
              </Label>
            </div>
          )}
          
          <Button type="submit" className="w-full" disabled={isUploading}>
            {isUploading ? "Subindo..." : isEditing ? "Salvar Alterações" : "Cadastrar"}
          </Button>
        </form>
      </DialogContent>  
    </Dialog>
  );
}