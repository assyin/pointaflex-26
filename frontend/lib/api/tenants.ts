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
  nightShiftStart?: string; // Heure de début du shift de nuit (format HH:mm)
  nightShiftEnd?: string; // Heure de fin du shift de nuit (format HH:mm)

  // Overtime Majoration Settings
  overtimeMajorationEnabled?: boolean; // Toggle global pour activer/désactiver les majorations
  overtimeRateStandard?: number; // Taux de majoration standard (défaut: 1.25)
  overtimeRateNight?: number; // Taux de majoration nuit (défaut: 1.50)
  overtimeRateHoliday?: number; // Taux de majoration jour férié (défaut: 2.00)
  overtimeRateEmergency?: number; // Taux de majoration urgence (défaut: 1.30)
  overtimeAutoDetectType?: boolean; // Détection automatique du type (NIGHT, HOLIDAY)
  overtimePendingNotificationTime?: string; // Heure d'envoi des notifications (format HH:mm)

  // Overtime Auto-Approval Settings
  overtimeAutoApprove?: boolean; // Activer l'auto-approbation des heures sup
  overtimeAutoApproveMaxHours?: number; // Seuil maximum d'heures pour auto-approbation (défaut: 4)

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

  // Late Notification Settings
  lateNotificationFrequencyMinutes?: number; // Fréquence du job de notification retard en minutes
  lateNotificationThresholdMinutes?: number; // Seuil en minutes pour déclencher notification retard

  // Absence Notification Settings
  absenceNotificationFrequencyMinutes?: number; // Fréquence du job de notification absence en minutes
  absenceDetectionBufferMinutes?: number; // Délai tampon après absenceDetectionTime
  absencePartialNotificationFrequencyMinutes?: number; // Fréquence du job notification absence partielle

  // Détection IN/OUT automatique
  doublePunchToleranceMinutes?: number; // Fenêtre de tolérance en minutes pour erreur de badgeage (défaut: 2 min)
  allowImplicitBreaks?: boolean; // Activer la tolérance des pauses implicites
  minImplicitBreakMinutes?: number; // Durée minimum pause implicite (défaut: 30 min)
  maxImplicitBreakMinutes?: number; // Durée maximum pause implicite (défaut: 120 min)
  autoCloseOrphanSessions?: boolean; // Activer la clôture automatique des sessions orphelines
  autoCloseDefaultTime?: string; // Heure de clôture par défaut (format HH:mm, défaut: 23:59)
  autoCloseOvertimeBuffer?: number; // Buffer en minutes après fin shift pour heures sup (0 = désactivé)
  autoCloseCheckApprovedOvertime?: boolean; // Vérifier si overtime approuvé existe avant clôture

  // DOUBLE_IN Detection Settings
  doubleInDetectionWindow?: number; // Fenêtre de détection DOUBLE_IN en heures (défaut: 24h)
  orphanInThreshold?: number; // Seuil en heures pour considérer un IN comme orphelin (défaut: 12h)
  enableDoubleInPatternDetection?: boolean; // Activer la détection de patterns suspects DOUBLE_IN
  doubleInPatternAlertThreshold?: number; // Seuil d'alerte pour patterns suspects (nombre sur 30 jours)

  // MISSING_IN Advanced Settings
  allowMissingInForRemoteWork?: boolean; // Autoriser MISSING_IN pour télétravail
  allowMissingInForMissions?: boolean; // Autoriser MISSING_IN pour missions
  missingInReminderEnabled?: boolean; // Activer les rappels MISSING_IN
  missingInReminderDelay?: number; // Délai en minutes avant le rappel MISSING_IN
  missingInReminderMaxPerDay?: number; // Nombre maximum de rappels MISSING_IN par jour
  enableMissingInPatternDetection?: boolean; // Activer la détection de patterns d'oubli MISSING_IN
  missingInPatternAlertThreshold?: number; // Seuil d'alerte pour patterns d'oubli MISSING_IN

  // MISSING_OUT Advanced Settings
  missingOutDetectionTime?: string; // Heure d'exécution du job batch MISSING_OUT (format HH:mm)
  missingOutDetectionWindow?: number; // Fenêtre de détection en heures pour shifts de nuit
  allowMissingOutForRemoteWork?: boolean; // Autoriser MISSING_OUT pour télétravail
  allowMissingOutForMissions?: boolean; // Autoriser MISSING_OUT pour missions
  missingOutReminderEnabled?: boolean; // Activer les rappels MISSING_OUT
  missingOutReminderDelay?: number; // Délai en minutes avant le rappel MISSING_OUT
  missingOutReminderBeforeClosing?: number; // Rappel X minutes avant fermeture du shift
  enableMissingOutPatternDetection?: boolean; // Activer la détection de patterns d'oubli MISSING_OUT
  missingOutPatternAlertThreshold?: number; // Seuil d'alerte pour patterns d'oubli MISSING_OUT

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
  workDaysPerWeek?: number;
  maxWeeklyHours?: number;
  lateToleranceEntry?: number;
  earlyToleranceExit?: number;
  breakDuration?: number;
  overtimeRounding?: number;
  overtimeMinimumThreshold?: number;
  overtimeRate?: number;
  nightShiftRate?: number;
  nightShiftStart?: string;
  nightShiftEnd?: string;

  // Overtime Majoration Settings
  overtimeMajorationEnabled?: boolean;
  overtimeRateStandard?: number;
  overtimeRateNight?: number;
  overtimeRateHoliday?: number;
  overtimeRateEmergency?: number;
  overtimeAutoDetectType?: boolean;
  overtimePendingNotificationTime?: string;

  // Overtime Auto-Approval Settings
  overtimeAutoApprove?: boolean;
  overtimeAutoApproveMaxHours?: number;

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
  requireBreakPunch?: boolean;
  requireScheduleForAttendance?: boolean;
  recoveryExpiryDays?: number;
  recoveryConversionRate?: number;
  dailyWorkingHours?: number;
  temporaryMatriculeExpiryDays?: number;

  // Absence Detection Settings
  absencePartialThreshold?: number;
  absenceDetectionTime?: string;

  // Insufficient Rest Detection Settings
  enableInsufficientRestDetection?: boolean;
  minimumRestHours?: number;
  minimumRestHoursNightShift?: number;

  // Holiday Overtime Settings
  holidayOvertimeEnabled?: boolean;
  holidayOvertimeRate?: number;
  holidayOvertimeAsNormalHours?: boolean;

  // MISSING_IN/OUT Notification Settings
  missingInDetectionWindowMinutes?: number;
  missingInNotificationFrequencyMinutes?: number;
  missingOutDetectionWindowMinutes?: number;
  missingOutNotificationFrequencyMinutes?: number;

  // Late Notification Settings
  lateNotificationFrequencyMinutes?: number;
  lateNotificationThresholdMinutes?: number;

  // Absence Notification Settings
  absenceNotificationFrequencyMinutes?: number;
  absenceDetectionBufferMinutes?: number;
  absencePartialNotificationFrequencyMinutes?: number;

  // Détection IN/OUT automatique
  doublePunchToleranceMinutes?: number;
  allowImplicitBreaks?: boolean;
  minImplicitBreakMinutes?: number;
  maxImplicitBreakMinutes?: number;
  autoCloseOrphanSessions?: boolean;
  autoCloseDefaultTime?: string;
  autoCloseOvertimeBuffer?: number;
  autoCloseCheckApprovedOvertime?: boolean;

  // DOUBLE_IN Detection Settings
  doubleInDetectionWindow?: number;
  orphanInThreshold?: number;
  enableDoubleInPatternDetection?: boolean;
  doubleInPatternAlertThreshold?: number;

  // MISSING_IN Advanced Settings
  allowMissingInForRemoteWork?: boolean;
  allowMissingInForMissions?: boolean;
  missingInReminderEnabled?: boolean;
  missingInReminderDelay?: number;
  missingInReminderMaxPerDay?: number;
  enableMissingInPatternDetection?: boolean;
  missingInPatternAlertThreshold?: number;

  // MISSING_OUT Advanced Settings
  missingOutDetectionTime?: string;
  missingOutDetectionWindow?: number;
  allowMissingOutForRemoteWork?: boolean;
  allowMissingOutForMissions?: boolean;
  missingOutReminderEnabled?: boolean;
  missingOutReminderDelay?: number;
  missingOutReminderBeforeClosing?: number;
  enableMissingOutPatternDetection?: boolean;
  missingOutPatternAlertThreshold?: number;
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
