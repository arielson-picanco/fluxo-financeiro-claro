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

export interface PayrollRecord {
  id: string;
  employee_id: string;
  period_month: number;
  period_year: number;
  period_type: 'first_half' | 'second_half';
  base_salary: number;
  gross_amount: number;
  net_amount: number;
  vt_amount: number;
  vr_amount: number;
  absences: number;
  status: 'pending' | 'paid';
  payment_date?: string;
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

  // Lógica de Folha de Pagamento
  const generatePayroll = useMutation({
    mutationFn: async ({ month, year, type }: { month: number, year: number, type: 'first_half' | 'second_half' }) => {
      // 1. Buscar funcionários ativos no período
      const { data: activeEmployees, error: empError } = await (supabase as any)
        .from("employees")
        .select("*")
        .eq("status", "active");
      
      if (empError) throw empError;

      if (!activeEmployees || activeEmployees.length === 0) {
        throw new Error("Nenhum funcionário ativo encontrado para gerar a folha.");
      }

      const payrollRecords: any[] = [];
      const financialRecords: any[] = [];

      // 2. Calcular para cada funcionário
      for (const emp of activeEmployees) {
        let amount = 0;
        let vt = 0;
        let vr = 0;
        let description = "";
        let absencesCount = 0;
        let absenceDiscount = 0;

        // Buscar faltas não justificadas no mês/ano
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const endDate = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`;
        
        const { data: absences, error: absError } = await (supabase as any)
          .from("employee_absences")
          .select("*")
          .eq("employee_id", emp.id)
          .eq("justified", false)
          .gte("date", startDate)
          .lte("date", endDate);

        if (!absError && absences) {
          absencesCount = absences.length;
          // Cálculo do desconto: Salário / 30 * número de faltas
          absenceDiscount = (Number(emp.salary) / 30) * absencesCount;
        }

        if (type === 'first_half') {
          // Adiantamento: 40% do salário (sem descontos de faltas no adiantamento)
          amount = Number(emp.salary) * 0.4;
          description = `Adiantamento Salarial (40%) - ${emp.name} - ${month}/${year}`;
        } else {
          // Saldo: 60% do salário + Benefícios (VT/VR) - Desconto de Faltas
          const baseBalance = Number(emp.salary) * 0.6;
          vt = Number(emp.vt_value || 0) * 22;
          vr = Number(emp.vr_value || 0) * 22;
          amount = baseBalance + vt + vr - absenceDiscount;
          description = `Saldo Salarial + Benefícios - ${emp.name} - ${month}/${year}${absencesCount > 0 ? ` (Desc. ${absencesCount} faltas)` : ""}`;
        }

        const dueDate = type === 'first_half' 
          ? `${year}-${String(month).padStart(2, '0')}-15`
          : `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`;

        payrollRecords.push({
          employee_id: emp.id,
          period_month: month,
          period_year: year,
          period_type: type,
          base_salary: Number(emp.salary),
          gross_amount: amount + absenceDiscount, // Valor antes do desconto
          net_amount: amount,
          vt_amount: vt,
          vr_amount: vr,
          absences: absencesCount,
          status: 'pending'
        });

        financialRecords.push({
          description,
          amount,
          due_date: dueDate,
          status: 'a_vencer',
          category: 'Folha de Pagamento',
          notes: `Gerado automaticamente pelo módulo de RH. Funcionário: ${emp.name}. ${absencesCount > 0 ? `Faltas descontadas: ${absencesCount}` : ""}`,
          created_by: (await supabase.auth.getUser()).data.user?.id
        });
      }

      // 3. Salvar registros de folha
      const { error: payrollError } = await (supabase as any)
        .from("payroll")
        .insert(payrollRecords);
      
      if (payrollError) throw payrollError;

      // 4. Salvar no Contas a Pagar
      const { error: financialError } = await supabase
        .from("accounts_payable")
        .insert(financialRecords);
      
      if (financialError) throw financialError;

      return { count: payrollRecords.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["payroll"] });
      queryClient.invalidateQueries({ queryKey: ["accounts_payable"] });
      toast.success(`${data.count} registros de folha gerados e integrados ao financeiro!`);
    },
    onError: (error: any) => {
      toast.error("Erro ao gerar folha: " + error.message);
    }
  });

  return { 
    employees, 
    isLoading, 
    createEmployee, 
    updateEmployee, 
    deleteEmployee,
    generatePayroll
  };
};
