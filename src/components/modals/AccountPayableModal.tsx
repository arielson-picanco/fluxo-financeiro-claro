import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Upload, X, AlertCircle, UserPlus, Calendar, Layers } from "lucide-react";
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
  FormDescription,
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
import { Switch } from "@/components/ui/switch";
import { AccountPayable, AccountPayableInsert } from "@/hooks/useAccountsPayable";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useTags } from "@/hooks/useTags";
import { useFileUpload } from "@/hooks/useFileUpload";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { QuickContactModal } from "@/components/modals/QuickContactModal";

const accountSchema = z.object({
  description: z.string().min(2, "Descrição é obrigatória"),
  supplier_id: z.string().min(1, "Fornecedor é obrigatório"),
  amount: z.coerce.number().positive("Valor deve ser maior que zero"),
  due_date: z.string().min(1, "Data de vencimento é obrigatória"),
  category: z.string().optional(),
  notes: z.string().optional(),
  total_installments: z.coerce.number().min(1, "Mínimo 1 parcela").default(1),
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
  const isFromInvoice = account?.is_from_invoice;
  const { suppliers } = useSuppliers();
  const { tags } = useTags('payable');
  const { uploadFile, isUploading } = useFileUpload('payable', account?.id);
  const [boletoFile, setBoletoFile] = useState<File | null>(null);
  const [isQuickContactOpen, setIsQuickContactOpen] = useState(false);

  const form = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      description: "",
      supplier_id: "",
      amount: 0,
      due_date: "",
      category: "",
      notes: "",
      total_installments: 1,
      is_recurring: false,
      recurrence_type: "mensal",
      tags: [],
    },
  });

  useEffect(() => {
    if (account) {
      form.reset({
        description: account.description || "",
        supplier_id: account.supplier_id || "",
        amount: account.amount || 0,
        due_date: account.due_date || "",
        category: account.category || "",
        notes: account.notes || "",
        total_installments: account.total_installments || 1,
        is_recurring: account.is_recurring || false,
        recurrence_type: account.recurrence_type || "mensal",
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
        total_installments: 1,
        is_recurring: false,
        recurrence_type: "mensal",
        tags: [],
      });
    }
    setBoletoFile(null);
  }, [account, form]);

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

  const handleSubmit = async (data: AccountFormData) => {
    if (isFromInvoice) {
      toast.error("Esta conta deve ser editada na aba de Fornecedores.");
      return;
    }

    if (boletoFile && isEditing && account) {
      await uploadFile(boletoFile, account.id);
    }

    const submitData: any = {
      description: data.description,
      supplier_id: data.supplier_id,
      amount: data.amount,
      due_date: data.due_date,
      category: data.category || null,
      notes: data.notes || null,
      total_installments: data.total_installments,
      is_recurring: data.is_recurring,
      recurrence_type: data.is_recurring ? data.recurrence_type : null,
      tags: data.tags,
    };

    if (isEditing && account) {
      onSubmit({ ...submitData, id: account.id });
    } else {
      onSubmit(submitData);
    }
  };

  const isRecurring = form.watch("is_recurring");
  const totalInstallments = form.watch("total_installments");

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Editar Conta a Pagar" : "Nova Conta a Pagar"}
            </DialogTitle>
          </DialogHeader>

          {isFromInvoice && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Atenção</AlertTitle>
              <AlertDescription>
                Esta conta está vinculada a uma Nota Fiscal. Para manter a sincronização, as edições e exclusões devem ser feitas na aba de <strong>Contatos</strong>.
              </AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <fieldset disabled={isFromInvoice} className="space-y-4">
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
                      <FormItem className="md:col-span-2">
                        <div className="flex items-center justify-between">
                          <FormLabel>Fornecedor / Contato *</FormLabel>
                          {!isEditing && (
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 text-xs text-primary"
                              onClick={() => setIsQuickContactOpen(true)}
                            >
                              <UserPlus className="h-3 w-3 mr-1" />
                              Novo Contato
                            </Button>
                          )}
                        </div>
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
                        <FormLabel>Valor {totalInstallments > 1 ? "(Total)" : ""} *</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="0,00" {...field} />
                        </FormControl>
                        {totalInstallments > 1 && (
                          <FormDescription>
                            Será dividido em {totalInstallments}x de R$ {(field.value / totalInstallments).toFixed(2)}
                          </FormDescription>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="due_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de Vencimento {totalInstallments > 1 ? "(1ª Parcela)" : ""} *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {!isEditing && (
                    <FormField
                      control={form.control}
                      name="total_installments"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Layers className="h-4 w-4" />
                            Número de Parcelas
                          </FormLabel>
                          <FormControl>
                            <Input type="number" min="1" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <div className="flex flex-col gap-4 p-4 border rounded-lg bg-muted/30 md:col-span-2">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <FormLabel className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Conta Recorrente / Fixa
                        </FormLabel>
                        <FormDescription>
                          Marque se esta conta se repete mensalmente
                        </FormDescription>
                      </div>
                      <FormField
                        control={form.control}
                        name="is_recurring"
                        render={({ field }) => (
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        )}
                      />
                    </div>

                    {isRecurring && (
                      <FormField
                        control={form.control}
                        name="recurrence_type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Frequência</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione a frequência" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="diario">Diário</SelectItem>
                                <SelectItem value="semanal">Semanal</SelectItem>
                                <SelectItem value="mensal">Mensal</SelectItem>
                                <SelectItem value="anual">Anual</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Observações</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Adicione detalhes importantes sobre esta conta..." 
                            className="resize-none min-h-[80px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {!isEditing && (
                    <div className="md:col-span-2">
                      <FormLabel>Anexar Boleto (PDF)</FormLabel>
                      <div className="mt-2 border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors">
                        <input 
                          type="file" 
                          id="boleto-up" 
                          className="hidden" 
                          accept=".pdf"
                          onChange={handleBoletoUpload} 
                        />
                        <label htmlFor="boleto-up" className="cursor-pointer flex flex-col items-center gap-2">
                          <Upload className="h-8 w-8 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {boletoFile ? boletoFile.name : "Clique para selecionar ou arraste o arquivo"}
                          </span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isLoading || isUploading}>
                    {isLoading || isUploading ? "Salvando..." : isEditing ? "Salvar Alterações" : "Cadastrar Conta"}
                  </Button>
                </div>
              </fieldset>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <QuickContactModal 
        open={isQuickContactOpen} 
        onOpenChange={setIsQuickContactOpen} 
      />
    </>
  );
}
