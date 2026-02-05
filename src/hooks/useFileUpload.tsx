import { useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSystemLog } from './useSystemLog';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

function normalizeRecordType(recordType: string): string {
  switch (recordType) {
    // Legacy/variant names used in different parts of the app
    case 'account_receivable':
    case 'accounts_receivable':
      return 'receivable';
    case 'account_payable':
    case 'accounts_payable':
      return 'payable';
    default:
      return recordType;
  }
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

export interface Attachment {
  id: string;
  record_id: string;
  record_type: string;
  file_name: string;
  file_type: string;
  file_url: string;
  file_size: number | null;
  uploaded_by: string | null;
  created_at: string;
}

export function useFileUpload(recordType: string, recordId?: string) {
  const [isUploading, setIsUploading] = useState(false);
  const { logSuccess, logError } = useSystemLog();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const normalizedRecordType = useMemo(() => normalizeRecordType(recordType), [recordType]);
  const recordTypeAliases = useMemo(() => {
    if (normalizedRecordType === 'receivable') {
      return uniqueStrings(['receivable', 'account_receivable', 'accounts_receivable', recordType]);
    }
    if (normalizedRecordType === 'payable') {
      return uniqueStrings(['payable', 'account_payable', 'accounts_payable', recordType]);
    }
    return uniqueStrings([normalizedRecordType, recordType]);
  }, [normalizedRecordType, recordType]);

  const attachmentsQuery = useQuery({
    queryKey: ['attachments', normalizedRecordType, recordId],
    queryFn: async () => {
      if (!recordId) return [];
      const { data, error } = await supabase
        .from('attachments')
        .select('*')
        .in('record_type', recordTypeAliases)
        .eq('record_id', recordId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Attachment[];
    },
    enabled: !!recordId,
  });

  const uploadFile = async (file: File, targetRecordId: string): Promise<string | null> => {
    if (!user) {
      toast.error('Você precisa estar logado para fazer upload');
      return null;
    }

    setIsUploading(true);
    try {
      // Sanitize filename - remove special characters and spaces
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileExt = sanitizedName.split('.').pop()?.toLowerCase() || 'pdf';
      const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const fileName = `${targetRecordId}/${uniqueId}.${fileExt}`;
      
      // Convert file to ArrayBuffer for more reliable upload
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Upload to Supabase Storage with explicit content type
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(fileName, uint8Array, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type || 'application/octet-stream',
        });

      if (uploadError) {
        console.error('Upload error details:', uploadError);
        throw new Error(`Falha no upload: ${uploadError.message}`);
      }

      // Get signed URL (bucket is private)
      const { data: urlData, error: urlError } = await supabase.storage
        .from('attachments')
        .createSignedUrl(fileName, 60 * 60 * 24 * 365); // 1 year

      if (urlError) {
        console.error('URL generation error:', urlError);
        throw new Error(`Erro ao gerar URL: ${urlError.message}`);
      }

      const fileUrl = urlData?.signedUrl;
      if (!fileUrl) {
        throw new Error('Não foi possível gerar URL do arquivo');
      }

      // Save attachment record
      const { data: attachment, error: dbError } = await supabase
        .from('attachments')
        .insert({
          record_id: targetRecordId,
          // Always persist in the normalized record_type so lists stay consistent
          record_type: normalizedRecordType,
          file_name: file.name, // Keep original name for display
          file_type: file.type || 'application/pdf',
          file_url: fileUrl,
          file_size: file.size,
          uploaded_by: user.id,
        })
        .select()
        .single();

      if (dbError) {
        console.error('Database insert error:', dbError);
        throw new Error(`Erro ao salvar registro: ${dbError.message}`);
      }

      queryClient.invalidateQueries({ queryKey: ['attachments', normalizedRecordType, targetRecordId] });
      logSuccess('upload', 'attachment', attachment.id, { file_name: file.name });
      toast.success(`Arquivo "${file.name}" enviado com sucesso!`, {
        description: 'O anexo foi salvo e está disponível para download.',
      });
      
      return fileUrl;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido no upload';
      console.error('Full upload error:', error);
      logError('upload', 'attachment', undefined, { error: errorMessage, file_name: file.name });
      toast.error('Erro ao enviar arquivo', {
        description: errorMessage,
      });
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const deleteAttachmentMutation = useMutation({
    mutationFn: async (attachment: Attachment) => {
      // Extract file path from URL
      const url = new URL(attachment.file_url);
      const pathParts = url.pathname.split('/storage/v1/object/sign/attachments/');
      if (pathParts.length > 1) {
        const filePath = decodeURIComponent(pathParts[1].split('?')[0]);
        await supabase.storage.from('attachments').remove([filePath]);
      }

      const { error } = await supabase
        .from('attachments')
        .delete()
        .eq('id', attachment.id);

      if (error) throw error;
      return attachment.id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ['attachments'] });
      logSuccess('delete', 'attachment', id);
      toast.success('Arquivo removido com sucesso!');
    },
    onError: (error: Error) => {
      logError('delete', 'attachment', undefined, { error: error.message });
      toast.error('Erro ao remover arquivo: ' + error.message);
    },
  });

  const downloadFile = async (attachment: Attachment) => {
    try {
      // Extract the file path from the stored URL to generate a fresh signed URL
      // This avoids ERR_BLOCKED_BY_CLIENT issues with old/cached signed URLs
      const url = new URL(attachment.file_url);
      const pathParts = url.pathname.split('/storage/v1/object/sign/attachments/');
      
      if (pathParts.length > 1) {
        const filePath = decodeURIComponent(pathParts[1].split('?')[0]);
        
        // Generate a fresh signed URL
        const { data, error } = await supabase.storage
          .from('attachments')
          .createSignedUrl(filePath, 60 * 60); // 1 hour expiry
        
        if (error) throw error;
        
        if (data?.signedUrl) {
          // Create a temporary link to trigger download
          const link = document.createElement('a');
          link.href = data.signedUrl;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          logSuccess('download', 'attachment', attachment.id, { file_name: attachment.file_name });
          return;
        }
      }
      
      // Fallback: try the stored URL
      window.open(attachment.file_url, '_blank');
      logSuccess('download', 'attachment', attachment.id, { file_name: attachment.file_name });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Download error:', error);
      logError('download', 'attachment', attachment.id, { error: errorMessage });
      toast.error('Erro ao baixar arquivo', {
        description: 'Tente novamente ou verifique se o arquivo ainda existe.',
      });
    }
  };

  return {
    attachments: attachmentsQuery.data ?? [],
    isLoading: attachmentsQuery.isLoading,
    isUploading,
    uploadFile,
    deleteAttachment: deleteAttachmentMutation.mutate,
    downloadFile,
    isDeleting: deleteAttachmentMutation.isPending,
  };
}
