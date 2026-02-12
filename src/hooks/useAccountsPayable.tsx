import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSystemLog } from './useSystemLog';
import { toast } from 'sonner';
import { useAuth } from './useAuth';

export interface AccountPayable {
  id: string;
  description: string;
  supplier_id: string;
  amount: number;
  due_date: string;
  payment_date: string | null;
  status: 'a_vencer' | 'vencida' | 'paga' | 'renegociada';
  category: string | null;
  notes: string | null;
  installment_number: number | null;
  total_installments: number | null;
  interest_rate: number | null;
  fine_rate: number | null;
  interest_amount: number | null;
  fine_amount: number | null;
  paid_amount: number | null;
  is_recurring: boolean | null;
  recurrence_type: 'daily' | 'weekly' | 'monthly' | 'yearly' | null;
  parent_id: string | null;
  original_due_date: string | null;
  renegotiated_at: string | null;
  renegotiated_by: string | null;
  created_by: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
  supplier?: {
    id: string;
    name: string;
  };
  is_from_invoice?: boolean;
}

export type AccountPayableInsert = {
  description: string;
  supplier_id: string;
  amount: number;
  due_date: string;
  category?: string | null;
  notes?: string | null;
  installment_number?: number | null;
  total_installments?: number | null;
  interest_rate?: number | null;
  fine_rate?: number | null;
  is_recurring?: boolean | null;
  recurrence_type?: 'daily' | 'weekly' | 'monthly' | 'yearly' | null;
  tags?: string[] | null;
};

export type AccountPayableUpdate = Partial<AccountPayableInsert> & {
  status?: AccountPayable['status'];
  payment_date?: string | null;
  paid_amount?: number | null;
  interest_amount?: number | null;
  fine_amount?: number | null;
};

export function useAccountsPayable() {
  const queryClient = useQueryClient();
  const { logSuccess, logError } = useSystemLog();
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['accounts_payable'],
    queryFn: async () => {
      const { data: accounts, error } = await supabase
        .from('accounts_payable')
        .select(`
          *,
          supplier:suppliers(id, name)
        `)
        .order('due_date', { ascending: true });
      
      if (error) throw error;

      const { data: invoices } = await supabase
        .from('supplier_invoices')
        .select('account_payable_id')
        .not('account_payable_id', 'is', null);

      const invoicePayableIds = new Set(invoices?.map(i => i.account_payable_id));

      return (accounts as AccountPayable[]).map(account => ({
        ...account,
        is_from_invoice: invoicePayableIds.has(account.id)
      }));
    },
  });

  const createAccount = useMutation({
    mutationFn: async (account: AccountPayableInsert) => {
      const totalInstallments = account.total_installments || 1;
      const amountPerInstallment = account.amount / totalInstallments;
      const installments = [];
      const baseDate = new Date(account.due_date + 'T12:00:00');

      // Mapeamento de frequências para o banco de dados
      const recurrenceMap: Record<string, 'daily' | 'weekly' | 'monthly' | 'yearly'> = {
        'diario': 'daily',
        'semanal': 'weekly',
        'mensal': 'monthly',
        'anual': 'yearly',
        'daily': 'daily',
        'weekly': 'weekly',
        'monthly': 'monthly',
        'yearly': 'yearly'
      };

      const dbRecurrenceType = account.recurrence_type ? recurrenceMap[account.recurrence_type] : null;

      for (let i = 1; i <= totalInstallments; i++) {
        const dueDate = new Date(baseDate);
        dueDate.setMonth(baseDate.getMonth() + (i - 1));
        
        installments.push({
          ...account,
          amount: amountPerInstallment,
          due_date: dueDate.toISOString().split('T')[0],
          installment_number: i,
          total_installments: totalInstallments,
          created_by: user?.id,
          status: 'a_vencer',
          recurrence_type: dbRecurrenceType
        });
      }

      const { data, error } = await supabase
        .from('accounts_payable')
        .insert(installments)
        .select(`
          *,
          supplier:suppliers(id, name)
        `);
      
      if (error) throw error;
      return data[0] as AccountPayable;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['accounts_payable'] });
      logSuccess('create', 'account_payable', data.id, { description: data.description, amount: data.amount });
      toast.success('Conta(s) cadastrada(s) com sucesso!');
    },
    onError: (error: Error) => {
      logError('create', 'account_payable', undefined, { error: error.message });
      toast.error('Erro ao cadastrar: ' + error.message);
    },
  });

  const updateAccount = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & AccountPayableUpdate) => {
      const { data: invoice } = await supabase
        .from('supplier_invoices')
        .select('id')
        .eq('account_payable_id', id)
        .maybeSingle();

      if (invoice) {
        throw new Error("Esta conta é vinculada a uma Nota Fiscal e só pode ser editada na aba de Fornecedores.");
      }

      // Mapeamento de frequências para o banco de dados
      const recurrenceMap: Record<string, 'daily' | 'weekly' | 'monthly' | 'yearly'> = {
        'diario': 'daily',
        'semanal': 'weekly',
        'mensal': 'monthly',
        'anual': 'yearly',
        'daily': 'daily',
        'weekly': 'weekly',
        'monthly': 'monthly',
        'yearly': 'yearly'
      };

      if (updates.recurrence_type) {
        updates.recurrence_type = recurrenceMap[updates.recurrence_type] || updates.recurrence_type;
      }

      const { data, error } = await supabase
        .from('accounts_payable')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          supplier:suppliers(id, name)
        `)
        .single();
      
      if (error) throw error;
      return data as AccountPayable;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['accounts_payable'] });
      logSuccess('update', 'account_payable', data.id, { description: data.description });
      toast.success('Conta atualizada!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteAccount = useMutation({
    mutationFn: async (id: string) => {
      const { data: invoice } = await supabase
        .from('supplier_invoices')
        .select('id')
        .eq('account_payable_id', id)
        .maybeSingle();

      if (invoice) {
        throw new Error("Esta conta é vinculada a uma Nota Fiscal e só pode ser excluída na aba de Fornecedores.");
      }

      const { error } = await supabase
        .from('accounts_payable')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts_payable'] });
      toast.success('Conta removida!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const togglePaymentStatus = useMutation({
    mutationFn: async ({ id, currentStatus, amount }: { id: string; currentStatus: string; amount: number }) => {
      const isPaid = currentStatus === 'paga';
      const now = new Date();
      const paymentDate = isPaid ? null : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      
      const { data, error } = await supabase
        .from('accounts_payable')
        .update({
          status: isPaid ? 'a_vencer' : 'paga',
          payment_date: paymentDate,
          paid_amount: isPaid ? null : amount,
        })
        .eq('id', id)
        .select(`
          *,
          supplier:suppliers(id, name)
        `)
        .single();
      
      if (error) throw error;
      return data as AccountPayable;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['accounts_payable'] });
      const action = data.status === 'paga' ? 'paga' : 'pendente';
      toast.success(`Conta marcada como ${action}!`);
    },
    onError: (error: Error) => {
      toast.error('Erro ao alterar status: ' + error.message);
    },
  });

  return {
    accounts: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    createAccount: createAccount.mutate,
    updateAccount: updateAccount.mutate,
    deleteAccount: deleteAccount.mutate,
    togglePaymentStatus: togglePaymentStatus.mutate,
    isCreating: createAccount.isPending,
    isUpdating: updateAccount.isPending,
    isDeleting: deleteAccount.isPending,
    isToggling: togglePaymentStatus.isPending,
  };
}
