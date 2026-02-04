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
  recurrence_type: string | null;
  parent_id: string | null;
  original_due_date: string | null;
  renegotiated_at: string | null;
  renegotiated_by: string | null;
  created_by: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  supplier?: {
    id: string;
    name: string;
  };
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
  recurrence_type?: string | null;
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
      const { data, error } = await supabase
        .from('accounts_payable')
        .select(`
          *,
          supplier:suppliers(id, name)
        `)
        .order('due_date', { ascending: true });
      
      if (error) throw error;
      return data as AccountPayable[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (account: AccountPayableInsert) => {
      const { data, error } = await supabase
        .from('accounts_payable')
        .insert({
          ...account,
          created_by: user?.id,
        })
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
      logSuccess('create', 'account_payable', data.id, { description: data.description, amount: data.amount });
      toast.success('Conta a pagar cadastrada com sucesso!');
    },
    onError: (error: Error) => {
      logError('create', 'account_payable', undefined, { error: error.message });
      toast.error('Erro ao cadastrar conta: ' + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & AccountPayableUpdate) => {
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
      toast.success('Conta atualizada com sucesso!');
    },
    onError: (error: Error) => {
      logError('update', 'account_payable', undefined, { error: error.message });
      toast.error('Erro ao atualizar conta: ' + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('accounts_payable')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ['accounts_payable'] });
      logSuccess('delete', 'account_payable', id);
      toast.success('Conta removida com sucesso!');
    },
    onError: (error: Error) => {
      logError('delete', 'account_payable', undefined, { error: error.message });
      toast.error('Erro ao remover conta: ' + error.message);
    },
  });

  const markAsPaidMutation = useMutation({
    mutationFn: async ({ id, paid_amount }: { id: string; paid_amount: number }) => {
      const { data, error } = await supabase
        .from('accounts_payable')
        .update({
          status: 'paga',
          payment_date: new Date().toISOString().split('T')[0],
          paid_amount,
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
      logSuccess('pay', 'account_payable', data.id, { paid_amount: data.paid_amount });
      toast.success('Pagamento registrado com sucesso!');
    },
    onError: (error: Error) => {
      logError('pay', 'account_payable', undefined, { error: error.message });
      toast.error('Erro ao registrar pagamento: ' + error.message);
    },
  });

  return {
    accounts: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    createAccount: createMutation.mutate,
    updateAccount: updateMutation.mutate,
    deleteAccount: deleteMutation.mutate,
    markAsPaid: markAsPaidMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isPaying: markAsPaidMutation.isPending,
  };
}
