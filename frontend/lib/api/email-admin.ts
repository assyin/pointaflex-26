import apiClient from './client';
import {
  EmailConfig,
  EmailConfigInput,
  TestSmtpInput,
  SendTestEmailInput,
  EmailTemplate,
  EmailTemplateInput,
  PreviewTemplateInput,
  EmailLog,
  EmailLogsQuery,
  EmailStats,
} from '@/types/email-admin';

// ==================== EMAIL CONFIG ====================

export async function getEmailConfig() {
  const { data } = await apiClient.get<EmailConfig>('/email-admin/config');
  return data;
}

export async function createEmailConfig(input: EmailConfigInput) {
  const { data } = await apiClient.post<EmailConfig>('/email-admin/config', input);
  return data;
}

export async function updateEmailConfig(input: Partial<EmailConfigInput>) {
  const { data } = await apiClient.put<EmailConfig>('/email-admin/config', input);
  return data;
}

export async function testSmtpConnection(input: TestSmtpInput) {
  const { data } = await apiClient.post<{ success: boolean; message: string; error?: string }>(
    '/email-admin/config/test-connection',
    input
  );
  return data;
}

export async function sendTestEmail(input: SendTestEmailInput) {
  const { data } = await apiClient.post<{ success: boolean; message: string }>(
    '/email-admin/config/send-test',
    input
  );
  return data;
}

// ==================== EMAIL TEMPLATES ====================

export async function getEmailTemplates() {
  const { data } = await apiClient.get<EmailTemplate[]>('/email-admin/templates');
  return data;
}

export async function getEmailTemplate(id: string) {
  const { data } = await apiClient.get<EmailTemplate>(`/email-admin/templates/${id}`);
  return data;
}

export async function createEmailTemplate(input: EmailTemplateInput) {
  const { data } = await apiClient.post<EmailTemplate>('/email-admin/templates', input);
  return data;
}

export async function updateEmailTemplate(id: string, input: Partial<EmailTemplateInput>) {
  const { data } = await apiClient.put<EmailTemplate>(`/email-admin/templates/${id}`, input);
  return data;
}

export async function deleteEmailTemplate(id: string) {
  const { data } = await apiClient.delete<{ message: string }>(`/email-admin/templates/${id}`);
  return data;
}

export async function previewEmailTemplate(input: PreviewTemplateInput) {
  const { data } = await apiClient.post<{ html: string }>('/email-admin/templates/preview', input);
  return data;
}

export async function sendTemplateTest(input: { templateId: string; to: string }) {
  const { data } = await apiClient.post<{ success: boolean; message: string }>(
    '/email-admin/templates/send-test',
    input
  );
  return data;
}

export async function initializeDefaultTemplates() {
  const { data } = await apiClient.post<{ message: string }>('/email-admin/templates/initialize-defaults');
  return data;
}

// ==================== EMAIL LOGS ====================

export async function getEmailLogs(query?: EmailLogsQuery) {
  const { data } = await apiClient.get<{
    data: EmailLog[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>('/email-admin/logs', { params: query });
  return data;
}

export async function getEmailStats() {
  const { data } = await apiClient.get<EmailStats>('/email-admin/stats');
  return data;
}

