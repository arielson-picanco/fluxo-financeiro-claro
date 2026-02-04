import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSystemLog } from './useSystemLog';
import { toast } from 'sonner';

export interface Supplier {
  id: string;
  name: string;
  document: string | null;
  document_type: string | null;
  category: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  notes: string | null;
  is_active: boolean | null;
  created_at: string;
  updated_at: string;
}

export type SupplierInsert = Omit<Supplier, 'id' | 'created_at' | 'updated_at'>;
export type SupplierUpdate = Partial<SupplierInsert>;

export function useSuppliers() {
  const queryClient = useQueryClient();
  const { logSuccess, logError } = useSystemLog();

  const query = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Supplier[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (supplier: SupplierInsert) => {
      const { data, error } = await supabase
        .from('suppliers')
        .insert(supplier)
        .select()
        .single();
      
      if (error) throw error;
      return data as Supplier;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      logSuccess('create', 'supplier', data.id, { name: data.name });
      toast.success('Fornecedor cadastrado com sucesso!');
    },
    onError: (error: Error) => {
      logError('create', 'supplier', undefined, { error: error.message });
      toast.error('Erro ao cadastrar fornecedor: ' + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & SupplierUpdate) => {
      const { data, error } = await supabase
        .from('suppliers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as Supplier;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      logSuccess('update', 'supplier', data.id, { name: data.name });
      toast.success('Fornecedor atualizado com sucesso!');
    },
    onError: (error: Error) => {
      logError('update', 'supplier', undefined, { error: error.message });
      toast.error('Erro ao atualizar fornecedor: ' + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      logSuccess('delete', 'supplier', id);
      toast.success('Fornecedor removido com sucesso!');
    },
    onError: (error: Error) => {
      logError('delete', 'supplier', undefined, { error: error.message });
      toast.error('Erro ao remover fornecedor: ' + error.message);
    },
  });

  return {
    suppliers: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    createSupplier: createMutation.mutate,
    updateSupplier: updateMutation.mutate,
    deleteSupplier: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
