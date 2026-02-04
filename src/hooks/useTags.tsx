import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Tag {
  id: string;
  name: string;
  color: string;
  entity_type: string;
  created_at: string;
}

export function useTags(entityType?: 'supplier' | 'payable' | 'receivable' | 'all') {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['tags', entityType],
    queryFn: async () => {
      let queryBuilder = supabase
        .from('tags')
        .select('*')
        .order('name');
      
      if (entityType && entityType !== 'all') {
        queryBuilder = queryBuilder.or(`entity_type.eq.${entityType},entity_type.eq.all`);
      }
      
      const { data, error } = await queryBuilder;
      
      if (error) throw error;
      return data as Tag[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (tag: Omit<Tag, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('tags')
        .insert(tag)
        .select()
        .single();
      
      if (error) throw error;
      return data as Tag;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      toast.success('Tag criada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar tag: ' + error.message);
    },
  });

  return {
    tags: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    createTag: createMutation.mutate,
    isCreating: createMutation.isPending,
  };
}
