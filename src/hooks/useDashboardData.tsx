import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, subMonths, format, parseISO, isAfter, isBefore, addDays } from 'date-fns';

interface DashboardSummary {
  totalPayable: number;
  totalReceivable: number;
  totalOverdue: number;
  overdueCount: number;
  pendingPayableCount: number;
  pendingReceivableCount: number;
  monthlyRevenue: number;
  monthlyExpenses: number;
  revenueChange: number;
  expenseChange: number;
}

interface ChartData {
  month: string;
  receitas: number;
  despesas: number;
}

interface Alert {
  id: string;
  type: 'warning' | 'danger' | 'info';
  title: string;
  description: string;
  amount?: number;
  dueDate?: string;
}

export function useDashboardData() {
  const today = new Date();
  const currentMonthStart = startOfMonth(today);
  const currentMonthEnd = endOfMonth(today);
  const lastMonthStart = startOfMonth(subMonths(today, 1));
  const lastMonthEnd = endOfMonth(subMonths(today, 1));

  // Summary Query
  const summaryQuery = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: async (): Promise<DashboardSummary> => {
      // Fetch all payables
      const { data: payables, error: payablesError } = await supabase
        .from('accounts_payable')
        .select('amount, paid_amount, due_date, status, payment_date');
      
      if (payablesError) throw payablesError;

      // Fetch all receivables
      const { data: receivables, error: receivablesError } = await supabase
        .from('accounts_receivable')
        .select('amount, received_amount, due_date, status, payment_date');
      
      if (receivablesError) throw receivablesError;

      // Calculate totals
      const pendingPayables = payables?.filter(p => p.status !== 'paga') || [];
      const pendingReceivables = receivables?.filter(r => r.status !== 'paga') || [];
      const overduePayables = payables?.filter(p => p.status === 'vencida') || [];
      const overdueReceivables = receivables?.filter(r => r.status === 'vencida') || [];

      const totalPayable = pendingPayables.reduce((sum, p) => sum + Number(p.amount), 0);
      const totalReceivable = pendingReceivables.reduce((sum, r) => sum + Number(r.amount), 0);
      const totalOverdue = 
        overduePayables.reduce((sum, p) => sum + Number(p.amount), 0) +
        overdueReceivables.reduce((sum, r) => sum + Number(r.amount), 0);

      // Current month paid/received
      const currentMonthPaid = payables?.filter(p => {
        if (!p.payment_date) return false;
        const paymentDate = parseISO(p.payment_date);
        return !isBefore(paymentDate, currentMonthStart) && !isAfter(paymentDate, currentMonthEnd);
      }) || [];

      const currentMonthReceived = receivables?.filter(r => {
        if (!r.payment_date) return false;
        const paymentDate = parseISO(r.payment_date);
        return !isBefore(paymentDate, currentMonthStart) && !isAfter(paymentDate, currentMonthEnd);
      }) || [];

      // Last month paid/received
      const lastMonthPaid = payables?.filter(p => {
        if (!p.payment_date) return false;
        const paymentDate = parseISO(p.payment_date);
        return !isBefore(paymentDate, lastMonthStart) && !isAfter(paymentDate, lastMonthEnd);
      }) || [];

      const lastMonthReceived = receivables?.filter(r => {
        if (!r.payment_date) return false;
        const paymentDate = parseISO(r.payment_date);
        return !isBefore(paymentDate, lastMonthStart) && !isAfter(paymentDate, lastMonthEnd);
      }) || [];

      const monthlyRevenue = currentMonthReceived.reduce((sum, r) => sum + Number(r.received_amount || r.amount), 0);
      const monthlyExpenses = currentMonthPaid.reduce((sum, p) => sum + Number(p.paid_amount || p.amount), 0);
      const lastMonthRevenue = lastMonthReceived.reduce((sum, r) => sum + Number(r.received_amount || r.amount), 0);
      const lastMonthExpenses = lastMonthPaid.reduce((sum, p) => sum + Number(p.paid_amount || p.amount), 0);

      const revenueChange = lastMonthRevenue > 0 
        ? ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
        : 0;
      const expenseChange = lastMonthExpenses > 0 
        ? ((monthlyExpenses - lastMonthExpenses) / lastMonthExpenses) * 100 
        : 0;

      return {
        totalPayable,
        totalReceivable,
        totalOverdue,
        overdueCount: overduePayables.length + overdueReceivables.length,
        pendingPayableCount: pendingPayables.length,
        pendingReceivableCount: pendingReceivables.length,
        monthlyRevenue,
        monthlyExpenses,
        revenueChange,
        expenseChange,
      };
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Chart Data Query (last 6 months)
  const chartQuery = useQuery({
    queryKey: ['dashboard-chart'],
    queryFn: async (): Promise<ChartData[]> => {
      const months: ChartData[] = [];
      
      for (let i = 5; i >= 0; i--) {
        const monthDate = subMonths(today, i);
        const monthStart = startOfMonth(monthDate);
        const monthEnd = endOfMonth(monthDate);
        const monthLabel = format(monthDate, 'MMM');

        // Get paid payables for this month
        const { data: paidPayables } = await supabase
          .from('accounts_payable')
          .select('amount, paid_amount')
          .gte('payment_date', format(monthStart, 'yyyy-MM-dd'))
          .lte('payment_date', format(monthEnd, 'yyyy-MM-dd'))
          .eq('status', 'paga');

        // Get received receivables for this month
        const { data: receivedReceivables } = await supabase
          .from('accounts_receivable')
          .select('amount, received_amount')
          .gte('payment_date', format(monthStart, 'yyyy-MM-dd'))
          .lte('payment_date', format(monthEnd, 'yyyy-MM-dd'))
          .eq('status', 'paga');

        const despesas = paidPayables?.reduce((sum, p) => sum + Number(p.paid_amount || p.amount), 0) || 0;
        const receitas = receivedReceivables?.reduce((sum, r) => sum + Number(r.received_amount || r.amount), 0) || 0;

        months.push({ month: monthLabel, receitas, despesas });
      }

      return months;
    },
    refetchInterval: 60000, // Refresh every minute
  });

  // Alerts Query
  const alertsQuery = useQuery({
    queryKey: ['dashboard-alerts'],
    queryFn: async (): Promise<Alert[]> => {
      const alerts: Alert[] = [];
      const next7Days = addDays(today, 7);

      // Get overdue payables
      const { data: overduePayables } = await supabase
        .from('accounts_payable')
        .select('id, description, amount, due_date')
        .eq('status', 'vencida')
        .order('due_date')
        .limit(5);

      overduePayables?.forEach(p => {
        alerts.push({
          id: `payable-overdue-${p.id}`,
          type: 'danger',
          title: 'Conta Vencida',
          description: p.description,
          amount: Number(p.amount),
          dueDate: p.due_date,
        });
      });

      // Get upcoming payables (next 7 days)
      const { data: upcomingPayables } = await supabase
        .from('accounts_payable')
        .select('id, description, amount, due_date')
        .eq('status', 'a_vencer')
        .gte('due_date', format(today, 'yyyy-MM-dd'))
        .lte('due_date', format(next7Days, 'yyyy-MM-dd'))
        .order('due_date')
        .limit(5);

      upcomingPayables?.forEach(p => {
        alerts.push({
          id: `payable-upcoming-${p.id}`,
          type: 'warning',
          title: 'Vencimento Próximo',
          description: p.description,
          amount: Number(p.amount),
          dueDate: p.due_date,
        });
      });

      // Get overdue receivables
      const { data: overdueReceivables } = await supabase
        .from('accounts_receivable')
        .select('id, description, customer_name, amount, due_date')
        .eq('status', 'vencida')
        .order('due_date')
        .limit(3);

      overdueReceivables?.forEach(r => {
        alerts.push({
          id: `receivable-overdue-${r.id}`,
          type: 'warning',
          title: 'Recebimento Atrasado',
          description: `${r.description} - ${r.customer_name}`,
          amount: Number(r.amount),
          dueDate: r.due_date,
        });
      });

      return alerts.slice(0, 8); // Limit total alerts
    },
    refetchInterval: 30000,
  });

  // Recent Transactions Query
  const recentPayablesQuery = useQuery({
    queryKey: ['dashboard-recent-payables'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounts_payable')
        .select(`
          id,
          description,
          amount,
          due_date,
          status,
          supplier_id,
          suppliers!inner(name)
        `)
        .order('due_date', { ascending: true })
        .limit(5);

      if (error) throw error;
      
      return data?.map(item => ({
        id: item.id,
        description: item.description,
        supplier_name: (item.suppliers as { name: string })?.name || 'N/A',
        amount: Number(item.amount),
        due_date: item.due_date,
        status: item.status,
      })) || [];
    },
  });

  const recentReceivablesQuery = useQuery({
    queryKey: ['dashboard-recent-receivables'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounts_receivable')
        .select('id, description, customer_name, amount, due_date, status')
        .order('due_date', { ascending: true })
        .limit(5);

      if (error) throw error;
      
      return data?.map(item => ({
        id: item.id,
        description: item.description,
        customer_name: item.customer_name,
        amount: Number(item.amount),
        due_date: item.due_date,
        status: item.status,
      })) || [];
    },
  });

  return {
    summary: summaryQuery.data,
    chartData: chartQuery.data ?? [],
    alerts: alertsQuery.data ?? [],
    recentPayables: recentPayablesQuery.data ?? [],
    recentReceivables: recentReceivablesQuery.data ?? [],
    isLoading: summaryQuery.isLoading || chartQuery.isLoading,
    error: summaryQuery.error || chartQuery.error,
  };
}
