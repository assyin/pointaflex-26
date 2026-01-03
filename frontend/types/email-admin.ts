export interface EmailConfig {
  id: string;
  tenantId: string;
  enabled: boolean;
  provider: string;
  host: string;
  port: number;
  secure: boolean;
  username: string | null;
  password: string | null;
  fromName: string;
  fromEmail: string | null;
  // Activation par type de notification
  notifyMissingIn: boolean;
  notifyMissingOut: boolean;
  notifyLate: boolean;
  notifyAbsence: boolean;
  notifyAbsencePartial: boolean;
  notifyAbsenceTechnical: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EmailConfigInput {
  enabled: boolean;
  provider?: string;
  host: string;
  port: number;
  secure: boolean;
  username?: string;
  password?: string;
  fromName: string;
  fromEmail?: string;
  // Activation par type de notification
  notifyMissingIn?: boolean;
  notifyMissingOut?: boolean;
  notifyLate?: boolean;
  notifyAbsence?: boolean;
  notifyAbsencePartial?: boolean;
  notifyAbsenceTechnical?: boolean;
}

export interface TestSmtpInput {
  host: string;
  port: number;
  secure: boolean;
  username?: string;
  password?: string;
}

export interface SendTestEmailInput {
  to: string;
  subject: string;
}

export interface EmailTemplate {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  description: string | null;
  subject: string;
  htmlContent: string;
  variables: string[];
  category: string;
  active: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EmailTemplateInput {
  code: string;
  name: string;
  description?: string;
  subject: string;
  htmlContent: string;
  variables: string[];
  category?: string;
  active?: boolean;
}

export interface PreviewTemplateInput {
  htmlContent: string;
  variables: Record<string, string>;
}

export interface EmailLog {
  id: string;
  tenantId: string;
  to: string;
  cc: string | null;
  bcc: string | null;
  subject: string;
  type: string;
  templateId: string | null;
  sentAt: string;
  status: 'sent' | 'failed' | 'queued';
  error: string | null;
  employeeId: string | null;
  managerId: string | null;
  employee?: {
    firstName: string;
    lastName: string;
  };
  manager?: {
    firstName: string;
    lastName: string;
  };
  template?: {
    name: string;
  };
}

export interface EmailLogsQuery {
  type?: string;
  status?: string;
  employeeId?: string;
  managerId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface EmailStats {
  today: number;
  week: number;
  month: number;
  total: number;
  failed: number;
  successRate: string;
  byType: Array<{
    type: string;
    count: number;
  }>;
}

