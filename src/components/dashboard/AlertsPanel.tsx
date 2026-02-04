import { AlertCircle, Clock, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/supabase";

interface Alert {
  id: string;
  type: 'overdue' | 'due_today' | 'due_soon';
  title: string;
  amount: number;
  dueDate: string;
}

const mockAlerts: Alert[] = [
  { id: '1', type: 'overdue', title: 'Conta de Luz - Loja Centro', amount: 1500, dueDate: '2024-01-28' },
  { id: '2', type: 'overdue', title: 'Fornecedor ABC Móveis', amount: 8500, dueDate: '2024-01-29' },
  { id: '3', type: 'due_today', title: 'Aluguel Galpão', amount: 4200, dueDate: '2024-02-01' },
  { id: '4', type: 'due_today', title: 'IPTU 2024', amount: 2100, dueDate: '2024-02-01' },
  { id: '5', type: 'due_soon', title: 'Fornecedor XYZ Eletros', amount: 12000, dueDate: '2024-02-05' },
];

const alertConfig = {
  overdue: {
    icon: AlertCircle,
    label: 'Vencida',
    className: 'bg-destructive/10 border-destructive/30 text-destructive',
    iconClassName: 'text-destructive',
  },
  due_today: {
    icon: AlertTriangle,
    label: 'Vence hoje',
    className: 'bg-warning-muted border-warning/30 text-warning-foreground',
    iconClassName: 'text-warning',
  },
  due_soon: {
    icon: Clock,
    label: 'Próxima',
    className: 'bg-info-muted border-info/30 text-info',
    iconClassName: 'text-info',
  },
};

export function AlertsPanel() {
  const overdueCount = mockAlerts.filter(a => a.type === 'overdue').length;
  const dueTodayCount = mockAlerts.filter(a => a.type === 'due_today').length;

  return (
    <Card className="col-span-full lg:col-span-1">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Alertas</CardTitle>
          {overdueCount > 0 && (
            <span className="px-2 py-1 text-xs font-medium bg-destructive text-destructive-foreground rounded-full animate-pulse-soft">
              {overdueCount} vencida{overdueCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
        {dueTodayCount > 0 && (
          <p className="text-sm text-muted-foreground">
            {dueTodayCount} conta{dueTodayCount > 1 ? 's' : ''} vence{dueTodayCount === 1 ? '' : 'm'} hoje
          </p>
        )}
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[280px] pr-4">
          <div className="space-y-3">
            {mockAlerts.map((alert) => {
              const config = alertConfig[alert.type];
              const Icon = config.icon;
              
              return (
                <div
                  key={alert.id}
                  className={cn(
                    "p-3 rounded-lg border transition-all hover:scale-[1.02] cursor-pointer",
                    config.className
                  )}
                >
                  <div className="flex items-start gap-3">
                    <Icon className={cn("h-5 w-5 mt-0.5 flex-shrink-0", config.iconClassName)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{alert.title}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs opacity-80">{config.label}</span>
                        <span className="text-sm font-mono font-semibold">
                          {formatCurrency(alert.amount)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
