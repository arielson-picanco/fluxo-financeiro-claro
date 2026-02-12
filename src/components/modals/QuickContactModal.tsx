import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Search, Loader2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MaskedInput } from "@/components/ui/masked-input";
import { useSuppliers, SupplierInsert } from "@/hooks/useSuppliers";
import { useBrasilAPI } from "@/hooks/useBrasilAPI";
import { validateCPF, validateCNPJ } from "@/lib/masks";
import { toast } from "sonner";

const contactSchema = z.object({
  name: z.string().min(2, "Nome é obrigatório"),
  document: z.string().optional(),
  document_type: z.enum(["cpf", "cnpj"]).optional(),
  phone: z.string().optional(),
});

type ContactFormData = z.infer<typeof contactSchema>;

interface QuickContactModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (contactId: string) => void;
}

export function QuickContactModal({
  open,
  onOpenChange,
  onSuccess,
}: QuickContactModalProps) {
  const { createSupplier } = useSuppliers();
  const { fetchCNPJ, isLoading: isFetchingCNPJ } = useBrasilAPI();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: "",
      document: "",
      document_type: undefined,
      phone: "",
    },
  });

  const documentType = form.watch("document_type");
  const documentValue = form.watch("document");

  const handleCNPJLookup = async () => {
    if (documentType !== "cnpj" || !documentValue) return;
    const data = await fetchCNPJ(documentValue);
    if (data) {
      form.setValue("name", data.razao_social || data.nome_fantasia);
      form.setValue("phone", data.telefone || "");
    }
  };

  const handleSubmit = async (data: ContactFormData) => {
    if (data.document && data.document_type) {
      const cleanDoc = data.document.replace(/\D/g, '');
      if (data.document_type === 'cpf' && !validateCPF(cleanDoc)) {
        toast.error('CPF inválido');
        return;
      }
      if (data.document_type === 'cnpj' && !validateCNPJ(cleanDoc)) {
        toast.error('CNPJ inválido');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const submitData: SupplierInsert = {
        name: data.name,
        document: data.document?.replace(/\D/g, '') || null,
        document_type: data.document_type || null,
        phone: data.phone?.replace(/\D/g, '') || null,
        is_active: true,
      };

      createSupplier(submitData, {
        onSuccess: (newContact: any) => {
          toast.success("Contato cadastrado com sucesso!");
          onOpenChange(false);
          form.reset();
          if (onSuccess && newContact?.[0]?.id) {
            onSuccess(newContact[0].id);
          }
        },
        onError: (error: any) => {
          toast.error("Erro ao cadastrar contato: " + error.message);
        }
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Cadastro Rápido de Contato</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="document_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
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
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="document"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Documento</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <MaskedInput
                          mask="document"
                          documentType={documentType}
                          value={field.value}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      {documentType === "cnpj" && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={handleCNPJLookup}
                          disabled={isFetchingCNPJ}
                        >
                          {isFetchingCNPJ ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                        </Button>
                      )}
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome / Razão Social *</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome completo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone</FormLabel>
                  <FormControl>
                    <MaskedInput mask="phone" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Salvando..." : "Cadastrar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
