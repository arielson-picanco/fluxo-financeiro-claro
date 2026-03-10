import React from "react";
import { Employee } from "@/hooks/useEmployees";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  User, FileText, Calendar, Wallet, 
  Landmark, Paperclip, Plus, Trash2, Download,
  AlertCircle, CheckCircle2, Loader2, XCircle
} from "lucide-react";
import { useFileUpload, Attachment } from "@/hooks/useFileUpload";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface DetailsProps {
  employee: Employee;
}

export function EmployeeDetails({ employee }: DetailsProps) {
  const queryClient = useQueryClient();
  const { attachments, uploadFile, downloadFile, deleteAttachment, isUploading } = useFileUpload('employee_documents', employee.id);
  
  // Busca de faltas
  const { data: absences = [], isLoading: isLoadingAbsences } = useQuery({
    queryKey: ["employee-absences", employee.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_absences")
        .select("*")
        .eq("employee_id", employee.id)
        .order("date", { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Mutação para registrar falta
  const createAbsence = useMutation({
    mutationFn: async (newAbsence: any) => {
      const { data, error } = await supabase
        .from("employee_absences")
        .insert([{ ...newAbsence, employee_id: employee.id }])
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-absences", employee.id] });
      toast.success("Falta registrada com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao registrar falta: " + error.message);
    }
  });

  // Mutação para excluir falta
  const deleteAbsence = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("employee_absences")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-absences", employee.id] });
      toast.success("Registro de falta excluído.");
    }
  });

  // Cálculo de dias trabalhados (considerando início imediato)
  const daysWorked = differenceInDays(
    employee.resignation_date ? new Date(employee.resignation_date) : new Date(),
    new Date(employee.admission_date)
  ) + 1;

  const handleAddAbsence = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const date = formData.get("date") as string;
    const reason = formData.get("reason") as string;
    const justified = formData.get("justified") === "on";

    if (!date) return toast.error("Selecione a data da falta.");

    createAbsence.mutate({ date, reason, justified });
    (e.target as HTMLFormElement).reset();
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho do Perfil */}
      <div className="flex flex-col md:flex-row gap-6 items-start md:items-center p-6 bg-card rounded-xl border shadow-sm">
        <div className="w-24 h-24 rounded-full bg-muted overflow-hidden border-4 border-background shadow-md">
          {employee.photo_url ? (
            <img src={employee.photo_url} alt={employee.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary">
              <User className="h-10 w-10" />
            </div>
          )}
        </div>
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold">{employee.name}</h2>
            <span className={cn(
              "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
              employee.status === 'active' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
            )}>
              {employee.status === 'active' ? 'Ativo' : 'Inativo'}
            </span>
          </div>
          <p className="text-muted-foreground font-medium">{employee.role} • {employee.sector || 'Geral'}</p>
          <div className="flex flex-wrap gap-4 pt-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Admissão: {format(new Date(employee.admission_date), 'dd/MM/yyyy')}</span>
            <span className="flex items-center gap-1 font-semibold text-primary"><CheckCircle2 className="h-3.5 w-3.5" /> {daysWorked} dias trabalhados</span>
          </div>
        </div>
      </div>

      <Tabs defaultValue="info" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="info">Informações</TabsTrigger>
          <TabsTrigger value="documents">Documentos</TabsTrigger>
          <TabsTrigger value="absences">Faltas / Ocorrências</TabsTrigger>
        </TabsList>

        {/* Aba Informações */}
        <TabsContent value="info" className="space-y-4 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Wallet className="h-4 w-4" /> Financeiro</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between border-b pb-2">
                  <span className="text-sm text-muted-foreground">Salário Base</span>
                  <span className="font-bold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(employee.salary)}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-sm text-muted-foreground">VT (Diário)</span>
                  <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(employee.vt_value || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">VR (Diário)</span>
                  <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(employee.vr_value || 0)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Landmark className="h-4 w-4" /> Dados Bancários</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between border-b pb-2">
                  <span className="text-sm text-muted-foreground">Banco</span>
                  <span className="font-medium">{employee.bank_name || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Chave PIX</span>
                  <span className="font-mono text-xs">{employee.pix_key || '-'}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-sm">Observações Gerais</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {employee.notes || "Nenhuma observação registrada para este funcionário."}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Documentos */}
        <TabsContent value="documents" className="pt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Arquivos e Documentação</CardTitle>
              <div className="relative">
                <input 
                  type="file" 
                  id="doc-upload" 
                  className="hidden" 
                  onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0], employee.id)}
                  disabled={isUploading}
                />
                <Button asChild size="sm" variant="outline" className="cursor-pointer">
                  <label htmlFor="doc-upload">
                    {isUploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                    {isUploading ? "Subindo..." : "Adicionar Arquivo"}
                  </label>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {attachments.map((file: Attachment) => (
                  <div key={file.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/20 group">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="p-2 bg-background rounded border">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex flex-col overflow-hidden">
                        <span className="text-xs font-medium truncate max-w-[150px]">{file.file_name}</span>
                        <span className="text-[10px] text-muted-foreground">{format(new Date(file.created_at), 'dd/MM/yy HH:mm')}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => downloadFile(file)}>
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteAttachment(file)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
                {attachments.length === 0 && (
                  <div className="col-span-full py-8 text-center text-muted-foreground italic text-sm">
                    Nenhum documento anexado.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Faltas */}
        <TabsContent value="absences" className="pt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Histórico de Faltas e Justificativas</CardTitle>
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" variant="destructive" className="h-8">
                    <AlertCircle className="h-4 w-4 mr-2" /> Registrar Falta
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Registrar Falta - {employee.name}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleAddAbsence} className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Data da Falta</Label>
                      <Input type="date" name="date" required />
                    </div>
                    <div className="space-y-2">
                      <Label>Motivo / Justificativa</Label>
                      <Input name="reason" placeholder="Ex: Problemas de saúde, atraso..." />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="justified" name="justified" />
                      <Label htmlFor="justified" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Falta Justificada?
                      </Label>
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                      <Button type="submit" disabled={createAbsence.isPending}>
                        {createAbsence.isPending ? "Salvando..." : "Salvar Registro"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {absences.map((absence: any) => (
                  <div key={absence.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/10">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "p-2 rounded-full",
                        absence.justified ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                      )}>
                        {absence.justified ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                      </div>
                      <div>
                        <p className="text-sm font-bold">{format(new Date(absence.date), "dd 'de' MMMM", { locale: ptBR })}</p>
                        <p className="text-xs text-muted-foreground">{absence.reason || "Sem motivo especificado"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase",
                        absence.justified ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                      )}>
                        {absence.justified ? "Justificada" : "Não Justificada"}
                      </span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-destructive"
                        onClick={() => deleteAbsence.mutate(absence.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {absences.length === 0 && !isLoadingAbsences && (
                  <div className="text-center py-10 text-muted-foreground italic text-sm">
                    Nenhuma falta registrada para este funcionário.
                  </div>
                )}
                {isLoadingAbsences && (
                  <div className="flex justify-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
