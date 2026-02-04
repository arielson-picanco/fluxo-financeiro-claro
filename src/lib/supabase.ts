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
