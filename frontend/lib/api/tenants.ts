import apiClient from './client';

export interface TenantSettings {
  id: string;
  tenantId: string;

  // Company Info (from Tenant)
  legalName?: string;
  displayName?: string;
  country?: string;
  city?: string;
  hrEmail?: string;
  phone?: string;
  language?: string;

  // Regional Settings
  timezone?: string;
  firstDayOfWeek?: string;
  workingDays?: string[];

  // Time Policy
  workDaysPerWeek?: number;
  maxWeeklyHours?: number;
  lateToleranceEntry?: number;
  earlyToleranceExit?: number;
  breakDuration?: number;
  overtimeRounding?: number;
  overtimeRate?: number;
  nightShiftStart?: string;
  nightShiftEnd?: string;
  nightShiftRate?: number;

  // Alerts
  alertWeeklyHoursExceeded?: boolean;
  alertInsufficientRest?: boolean;
  alertNightWorkRepetitive?: boolean;
  alertMinimumStaffing?: boolean;

  // Leave Rules
  annualLeaveDays?: number;
  leaveApprovalLevels?: number;
  twoLevelWorkflow?: boolean;
  anticipatedLeave?: boolean;

  // Export Settings
  monthlyPayrollEmail?: boolean;
  sfptExport?: boolean;

  createdAt: string;
  updatedAt: string;
}

export interface UpdateTenantSettingsDto {
  // Company Info
  legalName?: string;
  displayName?: string;
  country?: string;
  city?: string;
  hrEmail?: string;
  phone?: string;
  language?: string;

  // Regional Settings
  timezone?: string;
  firstDayOfWeek?: string;
  workingDays?: string[];

  // Time Policy
  lateToleranceEntry?: number;
  earlyToleranceExit?: number;
  overtimeRounding?: number;
  nightShiftStart?: string;
  nightShiftEnd?: string;

  // Leave Rules
  twoLevelWorkflow?: boolean;
  anticipatedLeave?: boolean;

  // Export Settings
  monthlyPayrollEmail?: boolean;
  sfptExport?: boolean;
}

export const TenantsAPI = {
  /**
   * Récupérer les paramètres du tenant
   */
  getSettings: async (tenantId: string): Promise<TenantSettings> => {
    const response = await apiClient.get(`/tenants/${tenantId}/settings`);
    return response.data;
  },

  /**
   * Mettre à jour les paramètres du tenant
   */
  updateSettings: async (
    tenantId: string,
    data: UpdateTenantSettingsDto
  ): Promise<TenantSettings> => {
    const response = await apiClient.patch(`/tenants/${tenantId}/settings`, data);
    return response.data;
  },
};
