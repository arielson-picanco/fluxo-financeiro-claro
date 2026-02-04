import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Search, Upload, FileText, X, Loader2 } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { MaskedInput } from "@/components/ui/masked-input";
import { TagInput } from "@/components/ui/tag-input";
import { Supplier, SupplierInsert } from "@/hooks/useSuppliers";
import { useBrasilAPI } from "@/hooks/useBrasilAPI";
import { useTags } from "@/hooks/useTags";
import { useFileUpload } from "@/hooks/useFileUpload";
import { validateCPF, validateCNPJ, validateEmail } from "@/lib/masks";
import { toast } from "sonner";

const supplierSchema = z.object({
  name: z.string().min(2, "Nome é obrigatório"),
  document: z.string().optional(),
  document_type: z.enum(["cpf", "cnpj"]).optional(),
  category: z.string().optional(),
  email: z.string().optional().refine(
    (val) => !val || val === '' || validateEmail(val),
    { message: "Email inválido" }
  ),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  notes: z.string().optional(),
  is_active: z.boolean().default(true),
  tags: z.array(z.string()).default([]),
});

type SupplierFormData = z.infer<typeof supplierSchema>;

interface SupplierModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier?: Supplier | null;
  onSubmit: (data: SupplierInsert | (SupplierInsert & { id: string })) => void;
  isLoading?: boolean;
}

export function SupplierModal({
  open,
  onOpenChange,
  supplier,
  onSubmit,
  isLoading,
}: SupplierModalProps) {
  const isEditing = !!supplier;
  const { fetchCNPJ, isLoading: isFetchingCNPJ } = useBrasilAPI();
  const { tags } = useTags('supplier');
  const { uploadFile, isUploading } = useFileUpload('supplier', supplier?.id);
  const [boletoFile, setBoletoFile] = useState<File | null>(null);
  const [existingBoletoUrl, setExistingBoletoUrl] = useState<string | null>(null);

  const form = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: "",
      document: "",
      document_type: undefined,
      category: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      state: "",
      notes: "",
      is_active: true,
      tags: [],
    },
  });

  // Reset form when supplier changes
  useEffect(() => {
    if (supplier) {
      form.reset({
        name: supplier.name || "",
        document: supplier.document || "",
        document_type: (supplier.document_type as "cpf" | "cnpj") || undefined,
        category: supplier.category || "",
        email: supplier.email || "",
        phone: supplier.phone || "",
        address: supplier.address || "",
        city: supplier.city || "",
        state: supplier.state || "",
        notes: supplier.notes || "",
        is_active: supplier.is_active ?? true,
        tags: (supplier as any).tags || [],
      });
      setExistingBoletoUrl((supplier as any).default_boleto_url || null);
    } else {
      form.reset({
        name: "",
        document: "",
        document_type: undefined,
        category: "",
        email: "",
        phone: "",
        address: "",
        city: "",
        state: "",
        notes: "",
        is_active: true,
        tags: [],
      });
      setExistingBoletoUrl(null);
    }
    setBoletoFile(null);
  }, [supplier, form]);

  const documentType = form.watch("document_type");
  const documentValue = form.watch("document");

  const handleCNPJLookup = async () => {
    if (documentType !== "cnpj" || !documentValue) {
      toast.error("Selecione CNPJ e digite um número válido");
      return;
    }

    const data = await fetchCNPJ(documentValue);
    if (data) {
      form.setValue("name", data.razao_social || data.nome_fantasia);
      form.setValue("email", data.email || "");
      form.setValue("phone", data.telefone || "");
      const fullAddress = [data.logradouro, data.numero, data.complemento, data.bairro]
        .filter(Boolean)
        .join(", ");
      form.setValue("address", fullAddress);
      form.setValue("city", data.municipio);
      form.setValue("state", data.uf);
    }
  };

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
    setExistingBoletoUrl(null);
  };

  const handleSubmit = async (data: SupplierFormData) => {
    // Validate document if provided
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

    let boletoUrl = existingBoletoUrl;

    // Upload boleto if new file selected
    if (boletoFile && isEditing && supplier) {
      const result = await uploadFile(boletoFile, supplier.id);
      if (result) {
        boletoUrl = result;
      }
    }

    const submitData: SupplierInsert & { default_boleto_url?: string | null; tags?: string[] } = {
      name: data.name,
      document: data.document?.replace(/\D/g, '') || null,
      document_type: data.document_type || null,
      category: data.category || null,
      email: data.email || null,
      phone: data.phone?.replace(/\D/g, '') || null,
      address: data.address || null,
      city: data.city || null,
      state: data.state || null,
      notes: data.notes || null,
      is_active: data.is_active,
      tags: data.tags,
    };

    // Only include boleto URL if we're editing
    if (isEditing) {
      (submitData as any).default_boleto_url = boletoUrl;
    }

    if (isEditing && supplier) {
      onSubmit({ ...submitData, id: supplier.id } as any);
    } else {
      onSubmit(submitData as any);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Fornecedor" : "Novo Fornecedor"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Document Type */}
              <FormField
                control={form.control}
                name="document_type"
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

              {/* Document with CNPJ lookup */}
              <FormField
                control={form.control}
                name="document"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CPF/CNPJ</FormLabel>
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
                          {isFetchingCNPJ ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Search className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Nome / Razão Social *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome do fornecedor" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Category */}
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Móveis, Transporte..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Email */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="email@exemplo.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Phone */}
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <MaskedInput
                        mask="phone"
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Address */}
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Endereço</FormLabel>
                    <FormControl>
                      <Input placeholder="Rua, número, bairro" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* City */}
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cidade</FormLabel>
                    <FormControl>
                      <Input placeholder="Cidade" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* State */}
              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <FormControl>
                      <Input placeholder="UF" maxLength={2} {...field} />
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

              {/* Default Boleto */}
              <div className="md:col-span-2">
                <FormLabel>Boleto Padrão (PDF)</FormLabel>
                <div className="mt-2">
                  {(boletoFile || existingBoletoUrl) ? (
                    <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/50">
                      <FileText className="h-5 w-5 text-primary" />
                      <span className="flex-1 text-sm truncate">
                        {boletoFile?.name || "Boleto anexado"}
                      </span>
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

              {/* Notes */}
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

              {/* Active Switch */}
              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                    <FormControl>
                      <Switch 
                        checked={field.value} 
                        onCheckedChange={field.onChange} 
                      />
                    </FormControl>
                    <FormLabel className="font-normal">Fornecedor ativo</FormLabel>
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
