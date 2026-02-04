import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSystemLog } from './useSystemLog';
import { toast } from 'sonner';
import { useAuth } from './useAuth';

export interface AccountReceivable {
  id: string;
  description: string;
  customer_name: string;
  customer_document: string | null;
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
  received_amount: number | null;
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
}

export type AccountReceivableInsert = {
  description: string;
  customer_name: string;
  customer_document?: string | null;
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

export type AccountReceivableUpdate = Partial<AccountReceivableInsert> & {
  status?: AccountReceivable['status'];
  payment_date?: string | null;
  received_amount?: number | null;
  interest_amount?: number | null;
  fine_amount?: number | null;
};

export function useAccountsReceivable() {
  const queryClient = useQueryClient();
  const { logSuccess, logError } = useSystemLog();
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['accounts_receivable'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounts_receivable')
        .select('*')
        .order('due_date', { ascending: true });
      
      if (error) throw error;
      return data as AccountReceivable[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (account: AccountReceivableInsert) => {
      const { data, error } = await supabase
        .from('accounts_receivable')
        .insert({
          ...account,
          created_by: user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as AccountReceivable;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['accounts_receivable'] });
      logSuccess('create', 'account_receivable', data.id, { description: data.description, amount: data.amount });
      toast.success('Conta a receber cadastrada com sucesso!');
    },
    onError: (error: Error) => {
      logError('create', 'account_receivable', undefined, { error: error.message });
      toast.error('Erro ao cadastrar conta: ' + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & AccountReceivableUpdate) => {
      const { data, error } = await supabase
        .from('accounts_receivable')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as AccountReceivable;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['accounts_receivable'] });
      logSuccess('update', 'account_receivable', data.id, { description: data.description });
      toast.success('Conta atualizada com sucesso!');
    },
    onError: (error: Error) => {
      logError('update', 'account_receivable', undefined, { error: error.message });
      toast.error('Erro ao atualizar conta: ' + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('accounts_receivable')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ['accounts_receivable'] });
      logSuccess('delete', 'account_receivable', id);
      toast.success('Conta removida com sucesso!');
    },
    onError: (error: Error) => {
      logError('delete', 'account_receivable', undefined, { error: error.message });
      toast.error('Erro ao remover conta: ' + error.message);
    },
  });

  const markAsReceivedMutation = useMutation({
    mutationFn: async ({ id, received_amount }: { id: string; received_amount: number }) => {
      const { data, error } = await supabase
        .from('accounts_receivable')
        .update({
          status: 'paga',
          payment_date: new Date().toISOString().split('T')[0],
          received_amount,
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as AccountReceivable;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['accounts_receivable'] });
      logSuccess('pay', 'account_receivable', data.id, { received_amount: data.received_amount });
      toast.success('Recebimento registrado com sucesso!');
    },
    onError: (error: Error) => {
      logError('pay', 'account_receivable', undefined, { error: error.message });
      toast.error('Erro ao registrar recebimento: ' + error.message);
    },
  });

  return {
    accounts: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    createAccount: createMutation.mutate,
    updateAccount: updateMutation.mutate,
    deleteAccount: deleteMutation.mutate,
    markAsReceived: markAsReceivedMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isReceiving: markAsReceivedMutation.isPending,
  };
}
