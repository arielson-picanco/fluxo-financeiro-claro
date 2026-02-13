import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Employee {
  id: string;
  name: string;
  document: string;
  role: string;
  sector: string;
  salary: number;
  admission_date: string;
  resignation_date?: string;
  status: 'active' | 'inactive' | 'vacation';
  vt_value: number;
  vr_value: number;
  pix_key?: string;
  bank_name?: string;
  notes?: string;
  photo_url?: string;
  created_at?: string;
}

export const useEmployees = () => {
  const queryClient = useQueryClient();

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("employees")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as Employee[];
    },
  });

  const createEmployee = useMutation({
    mutationFn: async (newEmployee: Omit<Employee, 'id' | 'created_at'>) => {
      const { data, error } = await (supabase as any)
        .from("employees")
        .insert([newEmployee])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Funcionário cadastrado com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao cadastrar: " + error.message);
    }
  });

  const updateEmployee = useMutation({
    mutationFn: async ({ id, ...changes }: Partial<Employee> & { id: string }) => {
      const { data, error } = await (supabase as any)
        .from("employees")
        .update(changes)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Dados do funcionário atualizados!");
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar: " + error.message);
    }
  });

  const deleteEmployee = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("employees")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Funcionário removido com sucesso!");
    },
  });

  return { employees, isLoading, createEmployee, updateEmployee, deleteEmployee };
};
