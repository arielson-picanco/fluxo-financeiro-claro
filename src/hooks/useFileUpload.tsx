import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSystemLog } from './useSystemLog';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

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

  const attachmentsQuery = useQuery({
    queryKey: ['attachments', recordType, recordId],
    queryFn: async () => {
      if (!recordId) return [];
      const { data, error } = await supabase
        .from('attachments')
        .select('*')
        .eq('record_type', recordType)
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
          record_type: recordType,
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

      queryClient.invalidateQueries({ queryKey: ['attachments', recordType, targetRecordId] });
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
      // Use the signed URL directly
      window.open(attachment.file_url, '_blank');
      logSuccess('download', 'attachment', attachment.id, { file_name: attachment.file_name });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logError('download', 'attachment', attachment.id, { error: errorMessage });
      toast.error('Erro ao baixar arquivo');
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
