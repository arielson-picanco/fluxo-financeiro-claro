import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SystemLog {
  id: string;
  user_id: string | null;
  user_name: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  status: string;
  created_at: string;
}

interface UseSystemLogsParams {
  entityType?: string;
  status?: string;
  limit?: number;
}

export function useSystemLogs(params: UseSystemLogsParams = {}) {
  const { entityType, status, limit = 100 } = params;

  return useQuery({
    queryKey: ['system_logs', entityType, status, limit],
    queryFn: async () => {
      let query = supabase
        .from('system_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (entityType) {
        query = query.eq('entity_type', entityType);
      }

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data as SystemLog[];
    },
  });
}
