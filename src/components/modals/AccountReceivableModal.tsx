import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { UserPlus, Calendar, Layers } from "lucide-react";
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
import { AccountReceivable, AccountReceivableInsert } from "@/hooks/useAccountsReceivable";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useTags } from "@/hooks/useTags";
import { useFileUpload } from "@/hooks/useFileUpload";
import { QuickContactModal } from "@/components/modals/QuickContactModal";

const accountSchema = z.object({
  description: z.string().min(2, "Descrição é obrigatória"),
  customer_id: z.string().min(1, "Cliente é obrigatório"),
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
  const { suppliers: contacts } = useSuppliers();
  const { tags } = useTags('receivable');
  const { uploadFile, isUploading } = useFileUpload('receivable', account?.id);
  const [isQuickContactOpen, setIsQuickContactOpen] = useState(false);

  const form = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      description: "",
      customer_id: "",
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
      const contact = contacts.find(c => c.name === account.customer_name);
      
      form.reset({
        description: account.description || "",
        customer_id: contact?.id || "",
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
        customer_id: "",
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
  }, [account, form, contacts]);

  const handleSubmit = async (data: AccountFormData) => {
    const selectedContact = contacts.find(c => c.id === data.customer_id);
    
    const submitData: any = {
      description: data.description,
      customer_name: selectedContact?.name || "Cliente não identificado",
      customer_document: selectedContact?.document || null,
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
                  name="customer_id"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <div className="flex items-center justify-between">
                        <FormLabel>Cliente / Contato *</FormLabel>
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
                            <SelectValue placeholder="Selecione o cliente" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {contacts.map((contact) => (
                            <SelectItem key={contact.id} value={contact.id}>
                              {contact.name}
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
                      <FormLabel>Valor {totalInstallments > 1 ? "(Total)" : ""} *</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0,00" {...field} />
                      </FormControl>
                      {totalInstallments > 1 && (
                        <FormDescription>
                          Será recebido em {totalInstallments}x de R$ {(field.value / totalInstallments).toFixed(2)}
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
                        Recebimento Recorrente / Fixo
                      </FormLabel>
                      <FormDescription>
                        Marque se este recebimento se repete mensalmente
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
                          placeholder="Adicione detalhes importantes sobre este recebimento..." 
                          className="resize-none min-h-[80px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                  {isLoading || isUploading ? "Salvando..." : isEditing ? "Salvar Alterações" : "Cadastrar Recebimento"}
                </Button>
              </div>
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
