import { supabase } from "@/integrations/supabase/client";

export { supabase };

// Tipos de status de conta
export type AccountStatus = 'a_vencer' | 'vencida' | 'paga' | 'renegociada';

// Tipos de roles
export type AppRole = 'admin' | 'financeiro' | 'visualizacao';

// Format date to YYYY-MM-DD without timezone conversion
// This prevents the date from shifting when saved to database
export function formatDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Parse date string YYYY-MM-DD to local Date object
// This prevents timezone shifting when reading from database
export function parseDateString(dateStr: string): Date {
  if (!dateStr) return new Date();
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

// Formatar moeda brasileira
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

// Formatar data - using parseDateString to avoid timezone issues
export function formatDate(date: string | Date): string {
  if (typeof date === 'string') {
    // Parse as local date to avoid timezone shift
    const localDate = parseDateString(date.split('T')[0]);
    return new Intl.DateTimeFormat('pt-BR').format(localDate);
  }
  return new Intl.DateTimeFormat('pt-BR').format(date);
}

/**
 * Calculate the effective status of an account based on due date and current status
 * This ensures that accounts past their due date show as "vencida" if not already paid/renegotiated
 */
export function calculateEffectiveStatus(
  dbStatus: AccountStatus,
  dueDate: string
): AccountStatus {
  // If already paid or renegotiated, keep that status
  if (dbStatus === 'paga' || dbStatus === 'renegociada') {
    return dbStatus;
  }
  
  // Parse the due date correctly to avoid timezone issues
  const dueDateParsed = parseDateString(dueDate.split('T')[0]);
  
  // Get today's date at start of day
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  
  // Set due date to start of day for comparison
  const dueDateStart = new Date(dueDateParsed.getFullYear(), dueDateParsed.getMonth(), dueDateParsed.getDate());
  
  // If due date is in the past, it's overdue
  if (dueDateStart < todayStart) {
    return 'vencida';
  }
  
  return 'a_vencer';
}

// Labels dos status
export const statusLabels: Record<AccountStatus, string> = {
  a_vencer: 'A Vencer',
  vencida: 'Vencida',
  paga: 'Paga',
  renegociada: 'Renegociada',
};

// Labels das roles
export const roleLabels: Record<AppRole, string> = {
  admin: 'Administrador',
  financeiro: 'Financeiro',
  visualizacao: 'Visualização',
};
