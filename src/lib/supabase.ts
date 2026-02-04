import { supabase } from "@/integrations/supabase/client";

export { supabase };

// Tipos de status de conta
export type AccountStatus = 'a_vencer' | 'vencida' | 'paga' | 'renegociada';

// Tipos de roles
export type AppRole = 'admin' | 'financeiro' | 'visualizacao';

// Formatar moeda brasileira
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

// Formatar data
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('pt-BR').format(new Date(date));
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
