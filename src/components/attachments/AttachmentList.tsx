import { useState } from 'react';
import { FileText, Download, Trash2, Upload, Loader2, ExternalLink, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Attachment, useFileUpload } from '@/hooks/useFileUpload';
import { DeleteConfirmModal } from '@/components/modals/DeleteConfirmModal';
import { useAuth } from '@/hooks/useAuth';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface AttachmentListProps {
  recordType: string;
  recordId: string;
  defaultBoletoUrl?: string | null;
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentList({ 
  recordType, 
  recordId, 
  defaultBoletoUrl,
}: AttachmentListProps) {
  const [deleteAttachment, setDeleteAttachment] = useState<Attachment | null>(null);
  const { canWrite } = useAuth();
  const {
    attachments,
    isLoading,
    isUploading,
    uploadFile,
    deleteAttachment: deleteAttachmentFn,
    downloadFile,
    isDeleting,
  } = useFileUpload(recordType, recordId);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const allowedTypes = [
      'application/pdf',
      'application/x-pdf',
      'application/acrobat',
      'application/octet-stream',
      'image/jpeg',
      'image/png',
      'image/gif',
    ];
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    let successCount = 0;
    let errorCount = 0;

    for (const file of Array.from(files)) {
      // Validate file type
      if (!allowedTypes.includes(file.type)) {
        toast.error(`Tipo não permitido: ${file.name}`, {
          description: 'Apenas PDF, JPG, PNG e GIF são aceitos.',
        });
        errorCount++;
        continue;
      }

      // Validate file size (max 10MB)
      if (file.size > maxSize) {
        toast.error(`Arquivo muito grande: ${file.name}`, {
          description: `Máximo permitido: 10MB. Tamanho: ${formatFileSize(file.size)}`,
        });
        errorCount++;
        continue;
      }


      const result = await uploadFile(file, recordId);
      if (result) {
        successCount++;
      } else {
        errorCount++;
      }
    }

    // Summary toast if multiple files
    if (files.length > 1) {
      if (errorCount === 0) {
        toast.success(`${successCount} arquivo(s) enviado(s) com sucesso!`);
      } else {
        toast.warning(`Upload parcial: ${successCount} sucesso, ${errorCount} falha(s)`);
      }
    }

    // Reset input
    e.target.value = '';
  };

  const handleConfirmDelete = () => {
    if (deleteAttachment) {
      deleteAttachmentFn(deleteAttachment);
      setDeleteAttachment(null);
    }
  };

  const showDefaultBoleto = defaultBoletoUrl && attachments.length === 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Anexos
            {attachments.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {attachments.length}
              </Badge>
            )}
          </CardTitle>
          {canWrite && (
            <label className="cursor-pointer">
              <Button variant="outline" size="sm" asChild disabled={isUploading}>
                <span>
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  Anexar
                </span>
              </Button>
              <input
                type="file"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.gif"
                multiple
                onChange={handleFileUpload}
                disabled={isUploading}
              />
            </label>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Default Boleto from Supplier */}
            {showDefaultBoleto && (
              <div className="flex items-center gap-3 p-3 rounded-lg border bg-primary/5 border-primary/20">
                <div className="p-2 rounded bg-primary/10">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    Boleto padrão do fornecedor
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Herdado automaticamente
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => window.open(defaultBoletoUrl, '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Attachments List */}
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="p-2 rounded bg-muted">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {attachment.file_name}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatFileSize(attachment.file_size)}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(parseISO(attachment.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => downloadFile(attachment)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  {canWrite && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => setDeleteAttachment(attachment)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}

            {attachments.length === 0 && !showDefaultBoleto && (
              <div className="text-center py-6 text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhum anexo</p>
              </div>
            )}
          </>
        )}
      </CardContent>

      <DeleteConfirmModal
        open={!!deleteAttachment}
        onOpenChange={(open) => !open && setDeleteAttachment(null)}
        title="Excluir anexo"
        description={`Tem certeza que deseja excluir "${deleteAttachment?.file_name}"?`}
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
      />
    </Card>
  );
}
