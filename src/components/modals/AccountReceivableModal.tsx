import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Upload, FileText, X } from "lucide-react";
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
import { MaskedInput } from "@/components/ui/masked-input";
import { TagInput } from "@/components/ui/tag-input";
import { AccountReceivable, AccountReceivableInsert } from "@/hooks/useAccountsReceivable";
import { useTags } from "@/hooks/useTags";
import { useFileUpload } from "@/hooks/useFileUpload";
import { validateCPF, validateCNPJ } from "@/lib/masks";
import { toast } from "sonner";

const accountSchema = z.object({
  description: z.string().min(2, "Descrição é obrigatória"),
  customer_name: z.string().min(2, "Nome do cliente é obrigatório"),
  customer_document: z.string().optional(),
  customer_document_type: z.enum(["cpf", "cnpj"]).optional(),
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

interface AccountReceivableModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: AccountReceivable | null;
  onSubmit: (data: AccountReceivableInsert | (AccountReceivableInsert & { id: string })) => void;
  isLoading?: boolean;
}

export function AccountReceivableModal({
  open,
  onOpenChange,
  account,
  onSubmit,
  isLoading,
}: AccountReceivableModalProps) {
  const isEditing = !!account;
  const { tags } = useTags('receivable');
  const { uploadFile, isUploading } = useFileUpload('receivable', account?.id);
  const [boletoFile, setBoletoFile] = useState<File | null>(null);

  const form = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      description: "",
      customer_name: "",
      customer_document: "",
      customer_document_type: undefined,
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
      // Detect document type from length
      const doc = account.customer_document?.replace(/\D/g, '') || '';
      const docType = doc.length === 11 ? 'cpf' : doc.length === 14 ? 'cnpj' : undefined;
      
      form.reset({
        description: account.description || "",
        customer_name: account.customer_name || "",
        customer_document: account.customer_document || "",
        customer_document_type: docType,
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
        customer_name: "",
        customer_document: "",
        customer_document_type: undefined,
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
  }, [account, form]);

  const documentType = form.watch("customer_document_type");

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
    }
  };

  const handleRemoveBoleto = () => {
    setBoletoFile(null);
  };

  const handleSubmit = async (data: AccountFormData) => {
    // Validate document if provided
    if (data.customer_document && data.customer_document_type) {
      const cleanDoc = data.customer_document.replace(/\D/g, '');
      if (data.customer_document_type === 'cpf' && !validateCPF(cleanDoc)) {
        toast.error('CPF inválido');
        return;
      }
      if (data.customer_document_type === 'cnpj' && !validateCNPJ(cleanDoc)) {
        toast.error('CNPJ inválido');
        return;
      }
    }

    // If editing and has new boleto, upload it
    if (boletoFile && isEditing && account) {
      await uploadFile(boletoFile, account.id);
    }

    const submitData: AccountReceivableInsert & { tags?: string[] } = {
      description: data.description,
      customer_name: data.customer_name,
      customer_document: data.customer_document?.replace(/\D/g, '') || null,
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
            {isEditing ? "Editar Conta a Receber" : "Nova Conta a Receber"}
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
                name="customer_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Cliente *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome completo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="customer_document_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Documento</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="cpf">CPF</SelectItem>
                        <SelectItem value="cnpj">CNPJ</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="customer_document"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CPF/CNPJ do Cliente</FormLabel>
                    <FormControl>
                      <MaskedInput
                        mask="document"
                        documentType={documentType}
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
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
                      <Input placeholder="Ex: Venda, Serviço..." {...field} />
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
                <FormLabel>Comprovante (PDF)</FormLabel>
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
