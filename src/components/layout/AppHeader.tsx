import { Bell, Moon, Sun, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { roleLabels, type AppRole } from "@/lib/supabase";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEffect, useState } from "react";

export function AppHeader() {
  const { roles, updateProfile, profile } = useAuth();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    // Initialize theme from profile or system preference
    const savedTheme = profile?.theme || 
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    setTheme(savedTheme);
    document.documentElement.classList.toggle('dark', savedTheme === 'dark');
  }, [profile?.theme]);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
    updateProfile({ theme: newTheme });
  };

  const getRoleBadgeVariant = (role: AppRole) => {
    switch (role) {
      case 'admin':
        return 'default';
      case 'financeiro':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-card px-6 shadow-sm">
      <div className="flex items-center gap-4 flex-1">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar contas, fornecedores..."
            className="pl-10 bg-secondary/50 border-0 focus-visible:ring-1"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* User Roles */}
        <div className="hidden md:flex items-center gap-2">
          {roles.map((role) => (
            <Badge 
              key={role} 
              variant={getRoleBadgeVariant(role)}
              className="text-xs"
            >
              {roleLabels[role]}
            </Badge>
          ))}
        </div>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground flex items-center justify-center">
                3
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <div className="p-2">
              <h4 className="font-semibold text-sm mb-2">Notificações</h4>
              <div className="space-y-2">
                <DropdownMenuItem className="flex flex-col items-start gap-1 cursor-pointer">
                  <span className="text-sm font-medium text-destructive">3 contas vencidas</span>
                  <span className="text-xs text-muted-foreground">Necessitam atenção imediata</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex flex-col items-start gap-1 cursor-pointer">
                  <span className="text-sm font-medium text-warning">5 contas vencem hoje</span>
                  <span className="text-xs text-muted-foreground">R$ 12.500,00 a pagar</span>
                </DropdownMenuItem>
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Theme Toggle */}
        <Button variant="ghost" size="icon" onClick={toggleTheme}>
          {theme === 'light' ? (
            <Moon className="h-5 w-5" />
          ) : (
            <Sun className="h-5 w-5" />
          )}
        </Button>
      </div>
    </header>
  );
}
