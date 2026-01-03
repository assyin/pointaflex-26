import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as emailAdminApi from '../api/email-admin';
import { toast } from 'sonner';
import type {
  EmailConfigInput,
  TestSmtpInput,
  SendTestEmailInput,
  EmailTemplateInput,
  PreviewTemplateInput,
  EmailLogsQuery,
} from '@/types/email-admin';

// ==================== EMAIL CONFIG ====================

export function useEmailConfig() {
  return useQuery({
    queryKey: ['email-config'],
    queryFn: async () => {
      try {
        return await emailAdminApi.getEmailConfig();
      } catch (error: any) {
        // Si 404, retourner une config par défaut au lieu de throw
        if (error?.response?.status === 404) {
          return {
            id: '',
            tenantId: '',
            enabled: false,
            provider: 'gmail',
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            username: null,
            password: null,
            fromName: 'PointaFlex',
            fromEmail: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        }
        throw error;
      }
    },
    retry: false,
  });
}

export function useUpsertEmailConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: EmailConfigInput) => {
      // Essayer d'abord update, si 404 alors create
      try {
        return await emailAdminApi.updateEmailConfig(input);
      } catch (error: any) {
        if (error.response?.status === 404) {
          return await emailAdminApi.createEmailConfig(input);
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-config'] });
      toast.success('Configuration email enregistrée');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de l\'enregistrement');
    },
  });
}

export function useTestSmtpConnection() {
  return useMutation({
    mutationFn: (input: TestSmtpInput) => emailAdminApi.testSmtpConnection(input),
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors du test');
    },
  });
}

export function useSendTestEmail() {
  return useMutation({
    mutationFn: (input: SendTestEmailInput) => emailAdminApi.sendTestEmail(input),
    onSuccess: (data) => {
      toast.success(data.message);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de l\'envoi');
    },
  });
}

// ==================== EMAIL TEMPLATES ====================

export function useEmailTemplates() {
  return useQuery({
    queryKey: ['email-templates'],
    queryFn: emailAdminApi.getEmailTemplates,
  });
}

export function useEmailTemplate(id: string) {
  return useQuery({
    queryKey: ['email-template', id],
    queryFn: () => emailAdminApi.getEmailTemplate(id),
    enabled: !!id,
  });
}

export function useCreateEmailTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: EmailTemplateInput) => emailAdminApi.createEmailTemplate(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      toast.success('Template créé avec succès');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la création');
    },
  });
}

export function useUpdateEmailTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<EmailTemplateInput> }) =>
      emailAdminApi.updateEmailTemplate(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      toast.success('Template mis à jour');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la mise à jour');
    },
  });
}

export function useDeleteEmailTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => emailAdminApi.deleteEmailTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      toast.success('Template supprimé');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la suppression');
    },
  });
}

export function usePreviewEmailTemplate() {
  return useMutation({
    mutationFn: (input: PreviewTemplateInput) => emailAdminApi.previewEmailTemplate(input),
  });
}

export function useSendTemplateTest() {
  return useMutation({
    mutationFn: (input: { templateId: string; to: string }) => emailAdminApi.sendTemplateTest(input),
    onSuccess: (data) => {
      toast.success(data.message);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de l\'envoi du test');
    },
  });
}

export function useInitializeDefaultTemplates() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: emailAdminApi.initializeDefaultTemplates,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      toast.success('Templates par défaut initialisés');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de l\'initialisation');
    },
  });
}

// ==================== EMAIL LOGS ====================

export function useEmailLogs(query?: EmailLogsQuery) {
  return useQuery({
    queryKey: ['email-logs', query],
    queryFn: () => emailAdminApi.getEmailLogs(query),
  });
}

export function useEmailStats() {
  return useQuery({
    queryKey: ['email-stats'],
    queryFn: emailAdminApi.getEmailStats,
    refetchInterval: 60000, // Refresh toutes les minutes
  });
}

