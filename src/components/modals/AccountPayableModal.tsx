import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Upload, FileText, X, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TagInput } from "@/components/ui/tag-input";
import { AccountPayable, AccountPayableInsert } from "@/hooks/useAccountsPayable";
import { useSuppliers, Supplier } from "@/hooks/useSuppliers";
import { useTags } from "@/hooks/useTags";
import { useFileUpload } from "@/hooks/useFileUpload";
import { toast } from "sonner";

const accountSchema = z.object({
  description: z.string().min(2, "Descrição é obrigatória"),
  supplier_id: z.string().min(1, "Fornecedor é obrigatório"),
  amount: z.coerce.number().positive("Valor deve ser maior que zero"),
  due_date: z.string().min(1, "Data de vencimento é obrigatória"),
  category: z.string().optional(),
  notes: z.string().optional(),
  installment_number: z.coerce.number().optional(),
  total_installments: z.coerce.number().optional(),
  interest_rate: z.coerce.number().optional(),
  fine_rate: z.coerce.number().optional(),
  is_recurring: z.boolean().default(false),
  recurrence_type: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

type AccountFormData = z.infer<typeof accountSchema>;

interface AccountPayableModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: AccountPayable | null;
  onSubmit: (data: AccountPayableInsert | (AccountPayableInsert & { id: string })) => void;
  isLoading?: boolean;
}

export function AccountPayableModal({
  open,
  onOpenChange,
  account,
  onSubmit,
  isLoading,
}: AccountPayableModalProps) {
  const isEditing = !!account;
  const { suppliers } = useSuppliers();
  const { tags } = useTags('payable');
  const { uploadFile, isUploading } = useFileUpload('payable', account?.id);
  const [boletoFile, setBoletoFile] = useState<File | null>(null);
  const [supplierBoletoUrl, setSupplierBoletoUrl] = useState<string | null>(null);

  const form = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      description: "",
      supplier_id: "",
      amount: 0,
      due_date: "",
      category: "",
      notes: "",
      installment_number: 1,
      total_installments: 1,
      interest_rate: 0,
      fine_rate: 0,
      is_recurring: false,
      recurrence_type: "",
      tags: [],
    },
  });

  // Reset form when account changes
  useEffect(() => {
    if (account) {
      form.reset({
        description: account.description || "",
        supplier_id: account.supplier_id || "",
        amount: account.amount || 0,
        due_date: account.due_date || "",
        category: account.category || "",
        notes: account.notes || "",
        installment_number: account.installment_number || 1,
        total_installments: account.total_installments || 1,
        interest_rate: account.interest_rate || 0,
        fine_rate: account.fine_rate || 0,
        is_recurring: account.is_recurring || false,
        recurrence_type: account.recurrence_type || "",
        tags: (account as any).tags || [],
      });
    } else {
      form.reset({
        description: "",
        supplier_id: "",
        amount: 0,
        due_date: "",
        category: "",
        notes: "",
        installment_number: 1,
        total_installments: 1,
        interest_rate: 0,
        fine_rate: 0,
        is_recurring: false,
        recurrence_type: "",
        tags: [],
      });
    }
    setBoletoFile(null);
    setSupplierBoletoUrl(null);
  }, [account, form]);

  // Watch supplier changes to get default boleto
  const selectedSupplierId = form.watch("supplier_id");

  useEffect(() => {
    if (selectedSupplierId) {
      const selectedSupplier = suppliers.find(s => s.id === selectedSupplierId) as Supplier & { default_boleto_url?: string };
      if (selectedSupplier?.default_boleto_url && !boletoFile) {
        setSupplierBoletoUrl(selectedSupplier.default_boleto_url);
      }
    } else {
      setSupplierBoletoUrl(null);
    }
  }, [selectedSupplierId, suppliers, boletoFile]);

  const handleBoletoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast.error('Apenas arquivos PDF são permitidos');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Arquivo muito grande (máximo 10MB)');
        return;
      }
      setBoletoFile(file);
      setSupplierBoletoUrl(null); // Override supplier boleto
    }
  };

  const handleRemoveBoleto = () => {
    setBoletoFile(null);
    // Re-check if supplier has default boleto
    const selectedSupplier = suppliers.find(s => s.id === selectedSupplierId) as Supplier & { default_boleto_url?: string };
    if (selectedSupplier?.default_boleto_url) {
      setSupplierBoletoUrl(selectedSupplier.default_boleto_url);
    }
  };

  const handleSubmit = async (data: AccountFormData) => {
    // If editing and has new boleto, upload it
    if (boletoFile && isEditing && account) {
      await uploadFile(boletoFile, account.id);
    }

    const submitData: AccountPayableInsert & { tags?: string[] } = {
      description: data.description,
      supplier_id: data.supplier_id,
      amount: data.amount,
      due_date: data.due_date,
      category: data.category || null,
      notes: data.notes || null,
      installment_number: data.installment_number || null,
      total_installments: data.total_installments || null,
      interest_rate: data.interest_rate || null,
      fine_rate: data.fine_rate || null,
      is_recurring: data.is_recurring || null,
      recurrence_type: data.recurrence_type || null,
      tags: data.tags,
    };

    if (isEditing && account) {
      onSubmit({ ...submitData, id: account.id } as any);
    } else {
      onSubmit(submitData as any);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Conta a Pagar" : "Nova Conta a Pagar"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Descrição *</FormLabel>
                    <FormControl>
                      <Input placeholder="Descrição da conta" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="supplier_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fornecedor *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o fornecedor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {suppliers.map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Aluguel, Energia..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        placeholder="0,00" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Vencimento *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="installment_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parcela Atual</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="total_installments"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total de Parcelas</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="interest_rate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Taxa de Juros (%)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        placeholder="0,00" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fine_rate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Taxa de Multa (%)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        placeholder="0,00" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Tags */}
              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Etiquetas</FormLabel>
                    <FormControl>
                      <TagInput
                        availableTags={tags}
                        selectedTags={field.value}
                        onTagsChange={field.onChange}
                        placeholder="Adicionar etiqueta..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Boleto Upload */}
              <div className="md:col-span-2">
                <FormLabel>Boleto (PDF)</FormLabel>
                <div className="mt-2">
                  {boletoFile ? (
                    <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/50">
                      <FileText className="h-5 w-5 text-primary" />
                      <span className="flex-1 text-sm truncate">{boletoFile.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={handleRemoveBoleto}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : supplierBoletoUrl ? (
                    <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/50">
                      <FileText className="h-5 w-5 text-primary" />
                      <span className="flex-1 text-sm">Boleto do fornecedor (padrão)</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => window.open(supplierBoletoUrl, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <label className="cursor-pointer">
                        <Button type="button" variant="outline" size="sm" asChild>
                          <span>Substituir</span>
                        </Button>
                        <input
                          type="file"
                          accept=".pdf"
                          className="hidden"
                          onChange={handleBoletoUpload}
                        />
                      </label>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-md cursor-pointer hover:bg-muted/50 transition-colors">
                      <Upload className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Clique para anexar PDF
                      </span>
                      <input
                        type="file"
                        accept=".pdf"
                        className="hidden"
                        onChange={handleBoletoUpload}
                      />
                    </label>
                  )}
                </div>
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Observações adicionais..." 
                        className="min-h-[80px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading || isUploading}>
                {isLoading || isUploading ? "Salvando..." : isEditing ? "Salvar" : "Cadastrar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
