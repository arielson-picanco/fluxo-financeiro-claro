import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client"; // Ajuste o import conforme seu projeto
import { toast } from "sonner";

export const useSupplierInvoices = (supplierId?: string) => {
  const queryClient = useQueryClient();

const { data: invoices, isLoading } = useQuery({
    queryKey: ["supplier-invoices", supplierId],
    queryFn: async () => {
      if (!supplierId) return [];
      const { data, error } = await supabase
        .from("supplier_invoices")
        .select("*")
        .eq("supplier_id", supplierId)
        .order("due_date", { ascending: false }); // Ordenando pelo vencimento agora
      if (error) throw error;
      return data;
    },
    enabled: !!supplierId,
  });

  const createInvoice = useMutation({
    mutationFn: async (newInvoice: any) => {
      // 1. Salva a Nota Fiscal (agora com due_date)
      const { data: invoiceData, error: invoiceError } = await supabase
        .from("supplier_invoices")
        .insert([{
          ...newInvoice,
          // Se não vier issue_date, usamos a due_date ou hoje para não dar erro no banco
          issue_date: newInvoice.issue_date || new Date().toISOString().split('T')[0] 
        }])
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // 2. Busca nome do fornecedor
      const { data: supplier } = await supabase
        .from("suppliers")
        .select("name")
        .eq("id", newInvoice.supplier_id)
        .single();

      // 3. Insere no CONTAS A PAGAR
      const { error: payableError } = await supabase
        .from("accounts_payable")
        .insert([{
          supplier_id: newInvoice.supplier_id,
          description: `NF ${newInvoice.invoice_number} - ${supplier?.name || 'Fornecedor'}`,
          amount: newInvoice.amount,
          due_date: newInvoice.due_date, // <--- O PULO DO GATO: Usando a data certa
          status: 'pending',
          category: 'Produtos/Mercadorias' // Verifique se sua tabela exige esse campo, senão remova
        } as any]);

      if (payableError) {
        console.error("Erro Financeiro:", payableError);
        toast.error("Nota salva, mas o financeiro falhou. Verifique o console.");
      }

      return invoiceData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["accounts_payable"] }); // Atualiza a lista certa
      queryClient.invalidateQueries({ queryKey: ["financial-records"] }); // Por garantia
      toast.success("Nota e Conta a Pagar lançadas!");
    },
  });

  const updateInvoice = useMutation({
    mutationFn: async ({ id, ...changes }: any) => {
      const { data, error } = await supabase
        .from("supplier_invoices")
        .update(changes)
        .eq("id", id)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier-invoices"] });
      toast.success("Nota fiscal atualizada!");
    },
  });

  // EXCLUSÃO: Esta é a parte que estava faltando para sumir o erro vermelho
  const deleteInvoice = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("supplier_invoices")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier-invoices"] });
      toast.success("Nota fiscal excluída com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao excluir nota: " + error.message);
    }
  });

  // Retornamos tudo para a interface usar
  return { 
    invoices, 
    isLoading, 
    createInvoice, 
    deleteInvoice,
    updateInvoice // Agora a lista vai reconhecer essa função!
  };
};