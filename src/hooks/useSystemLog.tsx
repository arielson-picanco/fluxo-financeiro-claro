import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type LogAction = 
  | 'create' 
  | 'update' 
  | 'delete' 
  | 'view' 
  | 'login' 
  | 'logout' 
  | 'upload' 
  | 'download'
  | 'renegotiate'
  | 'pay';

export type EntityType = 
  | 'supplier' 
  | 'account_payable' 
  | 'account_receivable' 
  | 'attachment' 
  | 'user' 
  | 'user_role'
  | 'system';

interface LogParams {
  action: LogAction;
  entityType: EntityType;
  entityId?: string;
  details?: Record<string, unknown>;
  status?: 'success' | 'error';
}

export function useSystemLog() {
  const { user, profile } = useAuth();

  const log = useCallback(async ({
    action,
    entityType,
    entityId,
    details,
    status = 'success',
  }: LogParams) => {
    if (!user) return;

    try {
      await supabase.rpc('insert_system_log', {
        p_user_id: user.id,
        p_user_name: profile?.name || user.email || 'Unknown',
        p_action: action,
        p_entity_type: entityType,
        p_entity_id: entityId || null,
        p_details: details ? JSON.stringify(details) : null,
        p_status: status,
      });
    } catch (error) {
      console.error('Failed to log action:', error);
    }
  }, [user, profile]);

  const logSuccess = useCallback((
    action: LogAction,
    entityType: EntityType,
    entityId?: string,
    details?: Record<string, unknown>
  ) => log({ action, entityType, entityId, details, status: 'success' }), [log]);

  const logError = useCallback((
    action: LogAction,
    entityType: EntityType,
    entityId?: string,
    details?: Record<string, unknown>
  ) => log({ action, entityType, entityId, details, status: 'error' }), [log]);

  return { log, logSuccess, logError };
}
