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

  // Attendance Settings
  requireBreakPunch?: boolean; // Activer/désactiver le pointage des repos (pauses)
  recoveryExpiryDays?: number; // Nombre de jours avant expiration de la récupération
  recoveryConversionRate?: number; // Taux de conversion heures supplémentaires -> récupération
  dailyWorkingHours?: number; // Nombre d'heures équivalent à une journée normale
  temporaryMatriculeExpiryDays?: number; // Nombre de jours avant expiration du matricule temporaire

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

  // Leave Rules
  twoLevelWorkflow?: boolean;
  anticipatedLeave?: boolean;

  // Export Settings
  monthlyPayrollEmail?: boolean;
  sfptExport?: boolean;

  // Attendance Settings
  requireBreakPunch?: boolean; // Activer/désactiver le pointage des repos (pauses)
  recoveryExpiryDays?: number; // Nombre de jours avant expiration de la récupération
  recoveryConversionRate?: number; // Taux de conversion heures supplémentaires -> récupération
  dailyWorkingHours?: number; // Nombre d'heures équivalent à une journée normale
  temporaryMatriculeExpiryDays?: number; // Nombre de jours avant expiration du matricule temporaire
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
