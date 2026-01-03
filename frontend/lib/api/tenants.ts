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
  overtimeMinimumThreshold?: number; // Seuil minimum en minutes pour créer automatiquement un Overtime
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
  requireScheduleForAttendance?: boolean; // Exiger un planning ou shift par défaut pour créer un pointage
  recoveryExpiryDays?: number; // Nombre de jours avant expiration de la récupération
  recoveryConversionRate?: number; // Taux de conversion heures supplémentaires -> récupération
  dailyWorkingHours?: number; // Nombre d'heures équivalent à une journée normale
  temporaryMatriculeExpiryDays?: number; // Nombre de jours avant expiration du matricule temporaire
  
  // Absence Detection Settings
  absencePartialThreshold?: number; // Heures de retard pour considérer absence partielle
  absenceDetectionTime?: string; // Heure d'exécution du job de détection d'absences (format HH:mm)
  
  // Insufficient Rest Detection Settings
  enableInsufficientRestDetection?: boolean; // Activer/désactiver la détection de repos insuffisant
  minimumRestHours?: number; // Nombre d'heures légales de repos minimum requis entre deux shifts
  minimumRestHoursNightShift?: number; // Nombre d'heures légales de repos minimum pour shift de nuit

  // Holiday Overtime Settings
  holidayOvertimeEnabled?: boolean; // Activer la majoration des heures travaillées les jours fériés
  holidayOvertimeRate?: number; // Taux de majoration pour les heures travaillées les jours fériés (défaut: 2.0 = double)
  holidayOvertimeAsNormalHours?: boolean; // Calculer les heures travaillées les jours fériés comme heures normales sans majoration

  // MISSING_IN/OUT Notification Settings
  missingInDetectionWindowMinutes?: number; // Fenêtre de détection MISSING_IN en minutes après début du shift (défaut: 30 min)
  missingInNotificationFrequencyMinutes?: number; // Fréquence du job de notification MISSING_IN en minutes (défaut: 15 min)
  missingOutDetectionWindowMinutes?: number; // Fenêtre de détection MISSING_OUT en minutes après fin du shift (défaut: 120 min)
  missingOutNotificationFrequencyMinutes?: number; // Fréquence du job de notification MISSING_OUT en minutes (défaut: 15 min)

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
  workingDays?: number[];

  // Time Policy
  lateToleranceEntry?: number;
  earlyToleranceExit?: number;
  overtimeRounding?: number;
  overtimeMinimumThreshold?: number; // Seuil minimum en minutes pour créer automatiquement un Overtime

  // Leave Rules
  twoLevelWorkflow?: boolean;
  anticipatedLeave?: boolean;

  // Export Settings
  monthlyPayrollEmail?: boolean;
  sfptExport?: boolean;

  // Attendance Settings
  requireBreakPunch?: boolean; // Activer/désactiver le pointage des repos (pauses)
  requireScheduleForAttendance?: boolean; // Exiger un planning ou shift par défaut pour créer un pointage
  recoveryExpiryDays?: number; // Nombre de jours avant expiration de la récupération
  recoveryConversionRate?: number; // Taux de conversion heures supplémentaires -> récupération
  dailyWorkingHours?: number; // Nombre d'heures équivalent à une journée normale
  temporaryMatriculeExpiryDays?: number; // Nombre de jours avant expiration du matricule temporaire
  
  // Absence Detection Settings
  absencePartialThreshold?: number; // Heures de retard pour considérer absence partielle
  absenceDetectionTime?: string; // Heure d'exécution du job de détection d'absences (format HH:mm)
  
  // Insufficient Rest Detection Settings
  enableInsufficientRestDetection?: boolean; // Activer/désactiver la détection de repos insuffisant
  minimumRestHours?: number; // Nombre d'heures légales de repos minimum requis entre deux shifts
  minimumRestHoursNightShift?: number; // Nombre d'heures légales de repos minimum pour shift de nuit

  // Holiday Overtime Settings
  holidayOvertimeEnabled?: boolean; // Activer la majoration des heures travaillées les jours fériés
  holidayOvertimeRate?: number; // Taux de majoration pour les heures travaillées les jours fériés (défaut: 2.0 = double)
  holidayOvertimeAsNormalHours?: boolean; // Calculer les heures travaillées les jours fériés comme heures normales sans majoration

  // MISSING_IN/OUT Notification Settings
  missingInDetectionWindowMinutes?: number; // Fenêtre de détection MISSING_IN en minutes après début du shift (défaut: 30 min)
  missingInNotificationFrequencyMinutes?: number; // Fréquence du job de notification MISSING_IN en minutes (défaut: 15 min)
  missingOutDetectionWindowMinutes?: number; // Fenêtre de détection MISSING_OUT en minutes après fin du shift (défaut: 120 min)
  missingOutNotificationFrequencyMinutes?: number; // Fréquence du job de notification MISSING_OUT en minutes (défaut: 15 min)
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
