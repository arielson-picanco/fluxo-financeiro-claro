import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle, XCircle, User, Calendar, Tag, FileText, Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SystemLog {
  id: string;
  user_id: string | null;
  user_name: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  status: string;
  created_at: string;
}

interface LogDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  log: SystemLog | null;
}

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
  user_role: "Permissão de Usuário",
  system: "Sistema",
};

export function LogDetailModal({ open, onOpenChange, log }: LogDetailModalProps) {
  if (!log) return null;

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR });
  };

  const renderDetails = (details: Record<string, unknown>) => {
    return Object.entries(details).map(([key, value]) => {
      const displayValue = typeof value === 'object' 
        ? JSON.stringify(value, null, 2) 
        : String(value);
      
      return (
        <div key={key} className="py-2 border-b last:border-b-0">
          <span className="text-sm font-medium text-muted-foreground capitalize">
            {key.replace(/_/g, ' ')}:
          </span>
          <pre className="text-sm mt-1 whitespace-pre-wrap break-words bg-muted/50 p-2 rounded">
            {displayValue}
          </pre>
        </div>
      );
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <span className="block">Detalhes do Log</span>
              <span className="text-sm font-normal text-muted-foreground">
                Auditoria do sistema
              </span>
            </div>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh]">
          <div className="space-y-6 pr-4">
            {/* Status e Ação */}
            <div className="flex flex-wrap items-center gap-2">
              {log.status === "success" ? (
                <Badge variant="outline" className="border-success text-success gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Sucesso
                </Badge>
              ) : (
                <Badge variant="destructive" className="gap-1">
                  <XCircle className="h-3 w-3" />
                  Erro
                </Badge>
              )}
              <Badge variant="secondary">
                {actionLabels[log.action] || log.action}
              </Badge>
              <Badge variant="outline">
                {entityLabels[log.entity_type] || log.entity_type}
              </Badge>
            </div>

            <Separator />

            {/* Informações Principais */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded bg-muted">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Usuário</p>
                  <p className="text-sm font-medium">{log.user_name || "Sistema"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 rounded bg-muted">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Data/Hora</p>
                  <p className="text-sm font-medium">{formatDate(log.created_at)}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 rounded bg-muted">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">ID da Entidade</p>
                  <p className="text-sm font-medium font-mono">
                    {log.entity_id || "N/A"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 rounded bg-muted">
                  <Info className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">ID do Log</p>
                  <p className="text-sm font-medium font-mono text-xs">
                    {log.id}
                  </p>
                </div>
              </div>
            </div>

            {/* Detalhes Adicionais */}
            {log.details && Object.keys(log.details).length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Detalhes da Ação
                  </h4>
                  <div className="bg-muted/30 rounded-lg p-4">
                    {renderDetails(log.details)}
                  </div>
                </div>
              </>
            )}

            {/* ID do Usuário para auditoria */}
            {log.user_id && (
              <>
                <Separator />
                <div>
                  <p className="text-xs text-muted-foreground mb-1">ID do Usuário (auditoria)</p>
                  <code className="text-xs bg-muted px-2 py-1 rounded">
                    {log.user_id}
                  </code>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
