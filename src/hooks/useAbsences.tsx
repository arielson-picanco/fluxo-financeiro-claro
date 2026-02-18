import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface EmployeeAbsence {
  id: string;
  employee_id: string;
  date: string;
  reason: string;
  justified: boolean;
  justification_document_url?: string;
  created_at?: string;
}

export const useAbsences = (employeeId?: string) => {
  const queryClient = useQueryClient();

  const { data: absences = [], isLoading } = useQuery({
    queryKey: ["absences", employeeId],
    queryFn: async () => {
      let query = supabase.from("employee_absences").select("*");
      if (employeeId) {
        query = query.eq("employee_id", employeeId);
      }
      const { data, error } = await query.order("date", { ascending: false });
      if (error) throw error;
      return data as EmployeeAbsence[];
    },
    enabled: true,
  });

  const createAbsence = useMutation({
    mutationFn: async (newAbsence: Omit<EmployeeAbsence, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from("employee_absences")
        .insert([newAbsence])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["absences"] });
      toast.success("Falta registrada com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao registrar falta: " + error.message);
    }
  });

  const deleteAbsence = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("employee_absences")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["absences"] });
      toast.success("Registro de falta removido!");
    },
    onError: (error: any) => {
      toast.error("Erro ao remover registro: " + error.message);
    }
  });

  return { absences, isLoading, createAbsence, deleteAbsence };
};
