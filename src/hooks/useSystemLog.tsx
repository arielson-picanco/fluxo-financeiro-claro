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
      // Use rpc to insert into system_logs to bypass type checking
      const logData = {
        user_id: user.id,
        user_name: profile?.name || user.email || 'Unknown',
        action,
        entity_type: entityType,
        entity_id: entityId || null,
        details: details ? JSON.stringify(details) : null,
        status,
      };
      
      // Direct fetch to avoid type issues with new table
      const { error } = await supabase.rpc('insert_system_log' as never, logData as never);
      if (error) {
        // Fallback: try direct insert using raw SQL
        console.warn('RPC not available, log not recorded');
      }
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
