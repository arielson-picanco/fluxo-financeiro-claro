import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'success' | 'warning' | 'destructive' | 'info';
  className?: string;
}

const variantStyles = {
  default: {
    bg: 'bg-primary/10',
    icon: 'text-primary',
    value: 'text-foreground',
  },
  success: {
    bg: 'bg-success-muted',
    icon: 'text-success',
    value: 'text-success',
  },
  warning: {
    bg: 'bg-warning-muted',
    icon: 'text-warning',
    value: 'text-warning',
  },
  destructive: {
    bg: 'bg-destructive/10',
    icon: 'text-destructive',
    value: 'text-destructive',
  },
  info: {
    bg: 'bg-info-muted',
    icon: 'text-info',
    value: 'text-info',
  },
};

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = 'default',
  className,
}: StatCardProps) {
  const styles = variantStyles[variant];

  return (
    <Card className={cn("card-hover", className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className={cn("text-2xl font-bold font-mono", styles.value)}>
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
            {trend && (
              <p className={cn(
                "text-xs font-medium",
                trend.isPositive ? "text-success" : "text-destructive"
              )}>
                {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}% vs mês anterior
              </p>
            )}
          </div>
          <div className={cn("p-3 rounded-xl", styles.bg)}>
            <Icon className={cn("h-6 w-6", styles.icon)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
