import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "./useAuth";

export const useSupplierInvoices = (supplierId?: string) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: invoices, isLoading } = useQuery({
    queryKey: ["supplier-invoices", supplierId],
    queryFn: async () => {
      if (!supplierId) return [];
      
      // Buscamos as notas e fazemos um join com accounts_payable para pegar os dados de parcelas
      const { data, error } = await supabase
        .from("supplier_invoices")
        .select(`
          *,
          accounts_payable (
            installment_number,
            total_installments
          )
        `)
        .eq("supplier_id", supplierId)
        .order("due_date", { ascending: false });
        
      if (error) throw error;

      // Mapeamos para achatar a estrutura e facilitar o uso no componente
      return data.map((invoice: any) => ({
        ...invoice,
        installment_number: invoice.accounts_payable?.installment_number,
        total_installments: invoice.accounts_payable?.total_installments
      }));
    },
    enabled: !!supplierId,
  });

  const createInvoice = useMutation({
    mutationFn: async (newInvoice: any) => {
      const totalInstallments = newInvoice.total_installments || 1;
      const amountPerInstallment = newInvoice.amount / totalInstallments;
      const baseDate = new Date(newInvoice.due_date + 'T12:00:00');
      
      const { data: supplier } = await supabase
        .from("suppliers")
        .select("name")
        .eq("id", newInvoice.supplier_id)
        .single();

      const createdInvoices = [];

      for (let i = 1; i <= totalInstallments; i++) {
        const dueDate = new Date(baseDate);
        dueDate.setMonth(baseDate.getMonth() + (i - 1));
        const dueDateStr = dueDate.toISOString().split('T')[0];

        const { data: payableData, error: payableError } = await supabase
          .from("accounts_payable")
          .insert([{
            supplier_id: newInvoice.supplier_id,
            description: `NF ${newInvoice.invoice_number} (${i}/${totalInstallments}) - ${supplier?.name || 'Fornecedor'}`,
            amount: amountPerInstallment,
            due_date: dueDateStr,
            status: 'a_vencer',
            category: 'Produtos/Mercadorias',
            installment_number: i,
            total_installments: totalInstallments,
            created_by: user?.id
          }])
          .select()
          .single();

        if (payableError) throw new Error(`Erro ao gerar financeiro (parc ${i}): ${payableError.message}`);

        const { total_installments, ...invoiceToInsert } = newInvoice;
        
        const { data: invoiceData, error: invoiceError } = await supabase
          .from("supplier_invoices")
          .insert([{
            ...invoiceToInsert,
            amount: amountPerInstallment,
            due_date: dueDateStr,
            account_payable_id: payableData.id,
            issue_date: newInvoice.issue_date || new Date().toISOString().split('T')[0] 
          }])
          .select()
          .single();

        if (invoiceError) {
          await supabase.from("accounts_payable").delete().eq("id", payableData.id);
          throw invoiceError;
        }
        
        createdInvoices.push(invoiceData);
      }

      return createdInvoices;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["accounts_payable"] });
      toast.success("Nota(s) e Conta(s) a Pagar lançadas!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao processar nota fiscal");
    }
  });

  const updateInvoice = useMutation({
    mutationFn: async ({ id, ...changes }: any) => {
      // Removemos campos que não pertencem à tabela supplier_invoices antes do update
      const { installment_number, total_installments, accounts_payable, ...cleanChanges } = changes;

      const { data: invoiceData, error: invoiceError } = await supabase
        .from("supplier_invoices")
        .update(cleanChanges)
        .eq("id", id)
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      if (invoiceData.account_payable_id) {
        const { data: supplier } = await supabase
          .from("suppliers")
          .select("name")
          .eq("id", invoiceData.supplier_id)
          .single();

        const { data: payableInfo } = await supabase
          .from("accounts_payable")
          .select("installment_number, total_installments")
          .eq("id", invoiceData.account_payable_id)
          .single();

        const installmentSuffix = payableInfo?.installment_number 
          ? ` (${payableInfo.installment_number}/${payableInfo.total_installments})` 
          : "";

        const { error: payableError } = await supabase
          .from("accounts_payable")
          .update({
            amount: invoiceData.amount,
            due_date: invoiceData.due_date,
            description: `NF ${invoiceData.invoice_number}${installmentSuffix} - ${supplier?.name || 'Fornecedor'}`,
            supplier_id: invoiceData.supplier_id
          })
          .eq("id", invoiceData.account_payable_id);

        if (payableError) console.error("Erro na sincronização financeira:", payableError);
      }

      return invoiceData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["accounts_payable"] });
      toast.success("Nota e financeiro atualizados!");
    },
  });

  const deleteInvoice = useMutation({
    mutationFn: async (id: string) => {
      const { data: invoice } = await supabase
        .from("supplier_invoices")
        .select("account_payable_id")
        .eq("id", id)
        .single();

      const { error: invoiceError } = await supabase
        .from("supplier_invoices")
        .delete()
        .eq("id", id);
      
      if (invoiceError) throw invoiceError;

      if (invoice?.account_payable_id) {
        const { error: payableError } = await supabase
          .from("accounts_payable")
          .delete()
          .eq("id", invoice.account_payable_id);
        
        if (payableError) console.error("Erro ao excluir financeiro vinculado:", payableError);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["accounts_payable"] });
      toast.success("Nota e financeiro excluídos!");
    },
    onError: (error: any) => {
      toast.error("Erro ao excluir: " + error.message);
    }
  });

  return { 
    invoices, 
    isLoading, 
    createInvoice, 
    deleteInvoice,
    updateInvoice 
  };
};
