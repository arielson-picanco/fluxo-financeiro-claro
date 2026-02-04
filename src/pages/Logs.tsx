import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ScrollText, Filter, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSystemLogs } from "@/hooks/useSystemLogs";
import { Skeleton } from "@/components/ui/skeleton";

const actionLabels: Record<string, string> = {
  create: "Criação",
  update: "Atualização",
  delete: "Exclusão",
  view: "Visualização",
  login: "Login",
  logout: "Logout",
  upload: "Upload",
  download: "Download",
  renegotiate: "Renegociação",
  pay: "Pagamento",
};

const entityLabels: Record<string, string> = {
  supplier: "Fornecedor",
  account_payable: "Conta a Pagar",
  account_receivable: "Conta a Receber",
  attachment: "Anexo",
  user: "Usuário",
  system: "Sistema",
};

export default function Logs() {
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  const { data: logs, isLoading, refetch, isRefetching } = useSystemLogs({
    entityType: entityFilter !== "all" ? entityFilter : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    limit: 200,
  });

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd/MM/yyyy HH:mm:ss", { locale: ptBR });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Logs do Sistema</h1>
          <p className="text-muted-foreground">
            Acompanhe todas as ações realizadas no sistema
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => refetch()}
          disabled={isRefetching}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <ScrollText className="h-5 w-5" />
              Histórico de Ações
            </CardTitle>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Tipo de entidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as entidades</SelectItem>
                  <SelectItem value="supplier">Fornecedores</SelectItem>
                  <SelectItem value="account_payable">Contas a Pagar</SelectItem>
                  <SelectItem value="account_receivable">Contas a Receber</SelectItem>
                  <SelectItem value="attachment">Anexos</SelectItem>
                  <SelectItem value="user">Usuários</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="success">Sucesso</SelectItem>
                  <SelectItem value="error">Erro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : logs && logs.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">Data/Hora</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Entidade</TableHead>
                    <TableHead>Detalhes</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-xs">
                        {formatDate(log.created_at)}
                      </TableCell>
                      <TableCell>{log.user_name || "Sistema"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {actionLabels[log.action] || log.action}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {entityLabels[log.entity_type] || log.entity_type}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                        {log.details ? (
                          typeof log.details === 'object' 
                            ? JSON.stringify(log.details).slice(0, 50) + '...'
                            : String(log.details)
                        ) : "-"}
                      </TableCell>
                      <TableCell>
                        {log.status === "success" ? (
                          <div className="flex items-center gap-1 text-success">
                            <CheckCircle className="h-4 w-4" />
                            <span className="text-xs">Sucesso</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-destructive">
                            <XCircle className="h-4 w-4" />
                            <span className="text-xs">Erro</span>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <ScrollText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">Nenhum log encontrado</h3>
              <p className="text-muted-foreground">
                Os logs aparecerão aqui conforme as ações forem realizadas
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
