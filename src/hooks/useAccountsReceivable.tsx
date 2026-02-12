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
  recurrence_type: 'daily' | 'weekly' | 'monthly' | 'yearly' | null;
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
  recurrence_type?: 'daily' | 'weekly' | 'monthly' | 'yearly' | null;
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

  const createAccount = useMutation({
    mutationFn: async (account: AccountReceivableInsert) => {
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
        .from('accounts_receivable')
        .insert(installments)
        .select();
      
      if (error) throw error;
      return data[0] as AccountReceivable;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['accounts_receivable'] });
      logSuccess('create', 'account_receivable', data.id, { description: data.description, amount: data.amount });
      toast.success('Recebimento(s) cadastrado(s) com sucesso!');
    },
    onError: (error: Error) => {
      logError('create', 'account_receivable', undefined, { error: error.message });
      toast.error('Erro ao cadastrar: ' + error.message);
    },
  });

  const updateAccount = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & AccountReceivableUpdate) => {
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

  const deleteAccount = useMutation({
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

  const toggleReceivedStatus = useMutation({
    mutationFn: async ({ id, currentStatus, amount }: { id: string; currentStatus: string; amount: number }) => {
      const isReceived = currentStatus === 'paga';
      const now = new Date();
      const paymentDate = isReceived ? null : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      
      const { data, error } = await supabase
        .from('accounts_receivable')
        .update({
          status: isReceived ? 'a_vencer' : 'paga',
          payment_date: paymentDate,
          received_amount: isReceived ? null : amount,
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as AccountReceivable;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['accounts_receivable'] });
      const action = data.status === 'paga' ? 'recebida' : 'pendente';
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
    toggleReceivedStatus: toggleReceivedStatus.mutate,
    isCreating: createAccount.isPending,
    isUpdating: updateAccount.isPending,
    isDeleting: deleteAccount.isPending,
    isToggling: toggleReceivedStatus.isPending,
  };
}
