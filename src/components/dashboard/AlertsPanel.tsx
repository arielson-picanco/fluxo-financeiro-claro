import { AlertCircle, Clock, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate } from "@/lib/supabase";

interface Alert {
  id: string;
  type: 'warning' | 'danger' | 'info';
  title: string;
  description: string;
  amount?: number;
  dueDate?: string;
}

interface AlertsPanelProps {
  alerts?: Alert[];
}

const alertConfig = {
  danger: {
    icon: AlertCircle,
    label: 'Vencida',
    className: 'bg-destructive/10 border-destructive/30 text-destructive',
    iconClassName: 'text-destructive',
  },
  warning: {
    icon: AlertTriangle,
    label: 'Atenção',
    className: 'bg-warning-muted border-warning/30 text-warning-foreground',
    iconClassName: 'text-warning',
  },
  info: {
    icon: Clock,
    label: 'Info',
    className: 'bg-info-muted border-info/30 text-info',
    iconClassName: 'text-info',
  },
};

export function AlertsPanel({ alerts = [] }: AlertsPanelProps) {
  const dangerCount = alerts.filter(a => a.type === 'danger').length;
  const warningCount = alerts.filter(a => a.type === 'warning').length;

  return (
    <Card className="col-span-full lg:col-span-1">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Alertas</CardTitle>
          {dangerCount > 0 && (
            <span className="px-2 py-1 text-xs font-medium bg-destructive text-destructive-foreground rounded-full animate-pulse-soft">
              {dangerCount} vencida{dangerCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
        {warningCount > 0 && (
          <p className="text-sm text-muted-foreground">
            {warningCount} alerta{warningCount > 1 ? 's' : ''} de atenção
          </p>
        )}
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[280px] pr-4">
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Clock className="h-8 w-8 mb-2" />
              <p className="text-sm">Nenhum alerta no momento</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => {
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
                        <p className="text-xs opacity-80 truncate">{alert.description}</p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs opacity-80">
                            {alert.dueDate ? formatDate(alert.dueDate) : config.label}
                          </span>
                          {alert.amount && (
                            <span className="text-sm font-mono font-semibold">
                              {formatCurrency(alert.amount)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
