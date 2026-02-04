import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, format, subMonths, parseISO, isWithinInterval } from 'date-fns';

export interface ReportFilters {
  startDate: Date;
  endDate: Date;
  category: string;
  type: 'all' | 'payable' | 'receivable';
}

interface PayableRecord {
  id: string;
  description: string;
  amount: number;
  due_date: string;
  payment_date: string | null;
  status: string;
  category: string | null;
  paid_amount: number | null;
  supplier: { name: string } | null;
}

interface ReceivableRecord {
  id: string;
  description: string;
  amount: number;
  due_date: string;
  payment_date: string | null;
  status: string;
  category: string | null;
  received_amount: number | null;
  customer_name: string;
}

export function useReports() {
  const [filters, setFilters] = useState<ReportFilters>({
    startDate: startOfMonth(new Date()),
    endDate: endOfMonth(new Date()),
    category: 'all',
    type: 'all',
  });

  const payablesQuery = useQuery({
    queryKey: ['report_payables'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounts_payable')
        .select(`
          id,
          description,
          amount,
          due_date,
          payment_date,
          status,
          category,
          paid_amount,
          supplier:suppliers(name)
        `)
        .order('due_date', { ascending: false });
      
      if (error) throw error;
      return data as PayableRecord[];
    },
  });

  const receivablesQuery = useQuery({
    queryKey: ['report_receivables'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounts_receivable')
        .select(`
          id,
          description,
          amount,
          due_date,
          payment_date,
          status,
          category,
          received_amount,
          customer_name
        `)
        .order('due_date', { ascending: false });
      
      if (error) throw error;
      return data as ReceivableRecord[];
    },
  });

  const filteredData = useMemo(() => {
    const payables = payablesQuery.data || [];
    const receivables = receivablesQuery.data || [];

    const filterByDate = <T extends { due_date: string; category: string | null }>(items: T[]): T[] => {
      return items.filter(item => {
        const itemDate = parseISO(item.due_date);
        const inDateRange = isWithinInterval(itemDate, {
          start: filters.startDate,
          end: filters.endDate,
        });
        const matchesCategory = filters.category === 'all' || item.category === filters.category;
        return inDateRange && matchesCategory;
      });
    };

    const filteredPayables = filters.type !== 'receivable' ? filterByDate(payables) : [];
    const filteredReceivables = filters.type !== 'payable' ? filterByDate(receivables) : [];

    // Calculate summary
    const totalPayable = filteredPayables.reduce((sum, p) => sum + p.amount, 0);
    const totalReceivable = filteredReceivables.reduce((sum, r) => sum + r.amount, 0);
    const paidPayables = filteredPayables.filter(p => p.status === 'paga');
    const paidReceivables = filteredReceivables.filter(r => r.status === 'paga');
    const totalPaid = paidPayables.reduce((sum, p) => sum + (p.paid_amount || p.amount), 0);
    const totalReceived = paidReceivables.reduce((sum, r) => sum + (r.received_amount || r.amount), 0);

    // Group by category
    const categoryMap = new Map<string, { payable: number; receivable: number }>();
    filteredPayables.forEach(p => {
      const cat = p.category || 'Sem categoria';
      const current = categoryMap.get(cat) || { payable: 0, receivable: 0 };
      current.payable += p.amount;
      categoryMap.set(cat, current);
    });
    filteredReceivables.forEach(r => {
      const cat = r.category || 'Sem categoria';
      const current = categoryMap.get(cat) || { payable: 0, receivable: 0 };
      current.receivable += r.amount;
      categoryMap.set(cat, current);
    });

    const categoryData = Array.from(categoryMap.entries()).map(([name, values]) => ({
      name,
      despesas: values.payable,
      receitas: values.receivable,
    }));

    // Monthly trend (last 6 months)
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(new Date(), i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      
      const monthPayables = payables.filter(p => {
        const date = parseISO(p.due_date);
        return isWithinInterval(date, { start: monthStart, end: monthEnd });
      });
      
      const monthReceivables = receivables.filter(r => {
        const date = parseISO(r.due_date);
        return isWithinInterval(date, { start: monthStart, end: monthEnd });
      });

      monthlyData.push({
        month: format(monthDate, 'MMM'),
        despesas: monthPayables.reduce((sum, p) => sum + p.amount, 0),
        receitas: monthReceivables.reduce((sum, r) => sum + r.amount, 0),
      });
    }

    return {
      payables: filteredPayables,
      receivables: filteredReceivables,
      summary: {
        totalPayable,
        totalReceivable,
        totalPaid,
        totalReceived,
        balance: totalReceivable - totalPayable,
        paidBalance: totalReceived - totalPaid,
      },
      categoryData,
      monthlyData,
    };
  }, [payablesQuery.data, receivablesQuery.data, filters]);

  // Get unique categories for filter dropdown
  const categories = useMemo(() => {
    const payables = payablesQuery.data || [];
    const receivables = receivablesQuery.data || [];
    const cats = new Set<string>();
    payables.forEach(p => p.category && cats.add(p.category));
    receivables.forEach(r => r.category && cats.add(r.category));
    return Array.from(cats).sort();
  }, [payablesQuery.data, receivablesQuery.data]);

  const exportToCSV = () => {
    const { payables, receivables } = filteredData;
    
    const rows: string[][] = [
      ['Tipo', 'Descrição', 'Valor', 'Vencimento', 'Pagamento', 'Status', 'Categoria', 'Entidade'],
    ];

    payables.forEach(p => {
      rows.push([
        'Despesa',
        p.description,
        p.amount.toFixed(2),
        p.due_date,
        p.payment_date || '-',
        p.status,
        p.category || '-',
        p.supplier?.name || '-',
      ]);
    });

    receivables.forEach(r => {
      rows.push([
        'Receita',
        r.description,
        r.amount.toFixed(2),
        r.due_date,
        r.payment_date || '-',
        r.status,
        r.category || '-',
        r.customer_name,
      ]);
    });

    const csvContent = rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio_${format(filters.startDate, 'yyyy-MM-dd')}_${format(filters.endDate, 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return {
    filters,
    setFilters,
    data: filteredData,
    categories,
    isLoading: payablesQuery.isLoading || receivablesQuery.isLoading,
    exportToCSV,
  };
}
