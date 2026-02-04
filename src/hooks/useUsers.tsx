import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSystemLog } from './useSystemLog';
import { toast } from 'sonner';
import type { AppRole } from '@/lib/supabase';

export interface UserWithRole {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  avatar_url: string | null;
  role: AppRole;
  created_at: string;
}

export function useUsers() {
  const queryClient = useQueryClient();
  const { logSuccess, logError } = useSystemLog();

  const query = useQuery({
    queryKey: ['users_with_roles'],
    queryFn: async () => {
      // Fetch profiles
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .order('name');
      
      if (profileError) throw profileError;

      // Fetch roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');
      
      if (rolesError) throw rolesError;

      // Combine profiles with roles
      const usersWithRoles: UserWithRole[] = profiles.map((profile) => {
        const userRole = roles.find(r => r.user_id === profile.id);
        return {
          id: profile.id,
          email: profile.email,
          name: profile.name,
          phone: profile.phone,
          avatar_url: profile.avatar_url,
          role: (userRole?.role as AppRole) || 'visualizacao',
          created_at: profile.created_at,
        };
      });

      return usersWithRoles;
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      // First, delete existing role
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      // Then insert new role
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role });
      
      if (error) throw error;
      return { userId, role };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users_with_roles'] });
      logSuccess('update', 'user_role', data.userId, { role: data.role });
      toast.success('Permissão atualizada com sucesso!');
    },
    onError: (error: Error) => {
      logError('update', 'user_role', undefined, { error: error.message });
      toast.error('Erro ao atualizar permissão: ' + error.message);
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      // Note: We can't delete from auth.users directly
      // So we just delete the profile and role, which will cascade
      const { error: roleError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);
      
      if (roleError) throw roleError;

      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);
      
      if (profileError) throw profileError;
      
      return userId;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ['users_with_roles'] });
      logSuccess('delete', 'user', id);
      toast.success('Usuário removido com sucesso!');
    },
    onError: (error: Error) => {
      logError('delete', 'user', undefined, { error: error.message });
      toast.error('Erro ao remover usuário: ' + error.message);
    },
  });

  return {
    users: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    updateRole: updateRoleMutation.mutate,
    deleteUser: deleteUserMutation.mutate,
    isUpdatingRole: updateRoleMutation.isPending,
    isDeleting: deleteUserMutation.isPending,
  };
}
