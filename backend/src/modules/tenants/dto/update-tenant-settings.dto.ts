import { IsString, IsOptional, IsInt, IsBoolean, IsArray, IsNumber } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTenantSettingsDto {
  // Company Info
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  legalName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  hrEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  // Regional Settings
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  firstDayOfWeek?: string;

  @ApiPropertyOptional({ type: [Number], description: 'Array of working days (1=Monday, 2=Tuesday, ..., 7=Sunday)' })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  workingDays?: number[];

  // Time Policy
  @ApiPropertyOptional({
    description: 'Nombre de jours travaillés par semaine',
    example: 6,
    default: 6,
  })
  @IsOptional()
  @IsInt()
  workDaysPerWeek?: number;

  @ApiPropertyOptional({
    description: 'Nombre d\'heures maximales hebdomadaires',
    example: 44,
    default: 44,
  })
  @IsOptional()
  @IsNumber()
  maxWeeklyHours?: number;

  @ApiPropertyOptional({
    description: 'Durée de pause en minutes',
    example: 60,
    default: 60,
  })
  @IsOptional()
  @IsInt()
  breakDuration?: number;

  @ApiPropertyOptional({
    description: 'Tolérance de retard à l\'entrée en minutes',
    example: 10,
    default: 10,
  })
  @IsOptional()
  @IsInt()
  lateToleranceEntry?: number;

  @ApiPropertyOptional({
    description: 'Tolérance de sortie anticipée en minutes',
    example: 5,
    default: 5,
  })
  @IsOptional()
  @IsInt()
  earlyToleranceExit?: number;

  @ApiPropertyOptional({
    description: 'Arrondi des heures supplémentaires en minutes',
    example: 15,
    default: 15,
  })
  @IsOptional()
  @IsInt()
  overtimeRounding?: number;

  @ApiPropertyOptional({
    description: 'Seuil minimum en minutes pour créer automatiquement un Overtime',
    example: 30,
    default: 30,
  })
  @IsOptional()
  @IsInt()
  overtimeMinimumThreshold?: number;

  @ApiPropertyOptional({
    description: 'Taux de majoration pour les heures supplémentaires (DEPRECATED - utiliser overtimeRateStandard)',
    example: 1.25,
    default: 1.25,
    deprecated: true,
  })
  @IsOptional()
  @IsNumber()
  overtimeRate?: number;

  @ApiPropertyOptional({
    description: 'Taux de majoration pour le shift de nuit (DEPRECATED - utiliser overtimeRateNight)',
    example: 1.50,
    default: 1.50,
    deprecated: true,
  })
  @IsOptional()
  @IsNumber()
  nightShiftRate?: number;

  // Configuration des taux de majoration heures supplémentaires
  @ApiPropertyOptional({
    description: 'Activer/désactiver les majorations (si false, tous les taux = 1.0)',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  overtimeMajorationEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Taux heures supp standard (1.0 = pas de majoration, 1.25 = +25%)',
    example: 1.25,
    default: 1.25,
  })
  @IsOptional()
  @IsNumber()
  overtimeRateStandard?: number;

  @ApiPropertyOptional({
    description: 'Taux heures de nuit (1.5 = +50%)',
    example: 1.50,
    default: 1.50,
  })
  @IsOptional()
  @IsNumber()
  overtimeRateNight?: number;

  @ApiPropertyOptional({
    description: 'Taux jours fériés (2.0 = +100%)',
    example: 2.00,
    default: 2.00,
  })
  @IsOptional()
  @IsNumber()
  overtimeRateHoliday?: number;

  @ApiPropertyOptional({
    description: 'Taux urgence/astreinte (1.3 = +30%)',
    example: 1.30,
    default: 1.30,
  })
  @IsOptional()
  @IsNumber()
  overtimeRateEmergency?: number;

  @ApiPropertyOptional({
    description: 'Détecter automatiquement le type (NIGHT si shift nuit, HOLIDAY si férié)',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  overtimeAutoDetectType?: boolean;

  @ApiPropertyOptional({
    description: 'Heure d\'envoi quotidienne des notifications heures sup en attente (format HH:mm)',
    example: '09:00',
    default: '09:00',
  })
  @IsOptional()
  @IsString()
  overtimePendingNotificationTime?: string;

  @ApiPropertyOptional({
    description: 'Activer l\'auto-approbation des heures supplémentaires',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  overtimeAutoApprove?: boolean;

  @ApiPropertyOptional({
    description: 'Seuil maximum d\'heures pour l\'auto-approbation (au-delà, approbation manuelle requise)',
    example: 4.0,
    default: 4.0,
  })
  @IsOptional()
  @IsNumber()
  overtimeAutoApproveMaxHours?: number;

  @ApiPropertyOptional({
    description: 'Heure de début du shift de nuit (format HH:mm)',
    example: '21:00',
    default: '21:00',
  })
  @IsOptional()
  @IsString()
  nightShiftStart?: string;

  @ApiPropertyOptional({
    description: 'Heure de fin du shift de nuit (format HH:mm)',
    example: '06:00',
    default: '06:00',
  })
  @IsOptional()
  @IsString()
  nightShiftEnd?: string;

  // Legal Alerts
  @ApiPropertyOptional({
    description: 'Activer l\'alerte de dépassement des heures hebdomadaires',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  alertWeeklyHoursExceeded?: boolean;

  @ApiPropertyOptional({
    description: 'Activer l\'alerte de repos insuffisant',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  alertInsufficientRest?: boolean;

  @ApiPropertyOptional({
    description: 'Activer l\'alerte de travail de nuit répétitif',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  alertNightWorkRepetitive?: boolean;

  @ApiPropertyOptional({
    description: 'Activer l\'alerte d\'effectif minimum',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  alertMinimumStaffing?: boolean;

  // Leave Rules
  @ApiPropertyOptional({
    description: 'Nombre de jours de congé annuel',
    example: 18,
    default: 18,
  })
  @IsOptional()
  @IsInt()
  annualLeaveDays?: number;

  @ApiPropertyOptional({
    description: 'Nombre de niveaux d\'approbation pour les congés',
    example: 2,
    default: 2,
  })
  @IsOptional()
  @IsInt()
  leaveApprovalLevels?: number;

  @ApiPropertyOptional({
    description: 'Activer le workflow à deux niveaux pour les congés',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  twoLevelWorkflow?: boolean;

  @ApiPropertyOptional({
    description: 'Autoriser les demandes de congé anticipées',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  anticipatedLeave?: boolean;

  // Export Settings
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  monthlyPayrollEmail?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  sfptExport?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requireBreakPunch?: boolean;

  @ApiPropertyOptional({
    description: 'Exiger un planning ou shift par défaut pour créer un pointage. Si false, les pointages sans planning/shift seront autorisés mais marqués comme anomalie.',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  requireScheduleForAttendance?: boolean;

  @ApiPropertyOptional({
    description: 'Heures de retard pour considérer absence partielle',
  })
  @IsOptional()
  @IsNumber()
  absencePartialThreshold?: number;

  @ApiPropertyOptional({
    description: 'Heure d\'exécution du job de détection d\'absences (format HH:mm)',
  })
  @IsOptional()
  @IsString()
  absenceDetectionTime?: string;

  @ApiPropertyOptional({
    description: 'Activer/désactiver la détection de repos insuffisant',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  enableInsufficientRestDetection?: boolean;

  @ApiPropertyOptional({
    description: 'Nombre d\'heures légales de repos minimum requis entre deux shifts (défaut: 11h)',
    default: 11,
  })
  @IsOptional()
  @IsNumber()
  minimumRestHours?: number;

  @ApiPropertyOptional({
    description: 'Nombre d\'heures légales de repos minimum pour shift de nuit (optionnel, défaut: 12h)',
    default: 12,
  })
  @IsOptional()
  @IsNumber()
  minimumRestHoursNightShift?: number;

  @ApiPropertyOptional({
    description: 'Nombre de jours avant expiration du matricule temporaire (délai pour obtenir le matricule officiel)',
    example: 8,
    default: 8,
  })
  @IsOptional()
  @IsInt()
  temporaryMatriculeExpiryDays?: number;

  // Recovery Settings
  @ApiPropertyOptional({
    description: 'Taux de conversion heures supplémentaires -> récupération (1.0 = 1h supp = 1h récup)',
    example: 1.0,
    default: 1.0,
  })
  @IsOptional()
  @IsNumber()
  recoveryConversionRate?: number;

  @ApiPropertyOptional({
    description: 'Nombre de jours avant expiration de la récupération',
    example: 90,
    default: 90,
  })
  @IsOptional()
  @IsInt()
  recoveryExpiryDays?: number;

  @ApiPropertyOptional({
    description: 'Nombre d\'heures équivalent à une journée normale de travail (par défaut: 44h/6j = 7.33h)',
    example: 7.33,
    default: 7.33,
  })
  @IsOptional()
  @IsNumber()
  dailyWorkingHours?: number;

  // Holiday Overtime Settings
  @ApiPropertyOptional({
    description: 'Activer la majoration des heures travaillées les jours fériés',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  holidayOvertimeEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Taux de majoration pour les heures travaillées les jours fériés (défaut: 2.0 = double)',
    example: 2.0,
    default: 2.0,
  })
  @IsOptional()
  @IsNumber()
  holidayOvertimeRate?: number;

  @ApiPropertyOptional({
    description: 'Calculer les heures travaillées les jours fériés comme heures normales sans majoration',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  holidayOvertimeAsNormalHours?: boolean;

  // MISSING_IN/OUT Notification Settings
  @ApiPropertyOptional({
    description: 'Fenêtre de détection MISSING_IN en minutes après début du shift (défaut: 30 min)',
    example: 30,
    default: 30,
  })
  @IsOptional()
  @IsInt()
  missingInDetectionWindowMinutes?: number;

  @ApiPropertyOptional({
    description: 'Fréquence du job de notification MISSING_IN en minutes (défaut: 15 min)',
    example: 15,
    default: 15,
  })
  @IsOptional()
  @IsInt()
  missingInNotificationFrequencyMinutes?: number;

  @ApiPropertyOptional({
    description: 'Fenêtre de détection MISSING_OUT en minutes après fin du shift (défaut: 120 min)',
    example: 120,
    default: 120,
  })
  @IsOptional()
  @IsInt()
  missingOutDetectionWindowMinutes?: number;

  @ApiPropertyOptional({
    description: 'Fréquence du job de notification MISSING_OUT en minutes (défaut: 15 min)',
    example: 15,
    default: 15,
  })
  @IsOptional()
  @IsInt()
  missingOutNotificationFrequencyMinutes?: number;

  // LATE Notification Settings
  @ApiPropertyOptional({
    description: 'Fréquence du job de notification LATE en minutes (défaut: 15 min)',
    example: 15,
    default: 15,
  })
  @IsOptional()
  @IsInt()
  lateNotificationFrequencyMinutes?: number;

  @ApiPropertyOptional({
    description: 'Seuil de retard en minutes pour déclencher une notification (défaut: 15 min)',
    example: 15,
    default: 15,
  })
  @IsOptional()
  @IsInt()
  lateNotificationThresholdMinutes?: number;

  // ABSENCE Notification Settings
  @ApiPropertyOptional({
    description: 'Fréquence du job de notification ABSENCE en minutes (défaut: 60 min)',
    example: 60,
    default: 60,
  })
  @IsOptional()
  @IsInt()
  absenceNotificationFrequencyMinutes?: number;

  @ApiPropertyOptional({
    description: 'Délai tampon avant de considérer une absence en minutes (défaut: 60 min)',
    example: 60,
    default: 60,
  })
  @IsOptional()
  @IsInt()
  absenceDetectionBufferMinutes?: number;

  // ABSENCE_PARTIAL Notification Settings
  @ApiPropertyOptional({
    description: 'Fréquence du job de notification ABSENCE_PARTIAL en minutes (défaut: 30 min)',
    example: 30,
    default: 30,
  })
  @IsOptional()
  @IsInt()
  absencePartialNotificationFrequencyMinutes?: number;

  // DOUBLE_IN Detection Settings
  @ApiPropertyOptional({
    description: 'Fenêtre de détection DOUBLE_IN en heures (défaut: 24h)',
    example: 24,
    default: 24,
  })
  @IsOptional()
  @IsInt()
  doubleInDetectionWindow?: number;

  @ApiPropertyOptional({
    description: 'Seuil en heures pour considérer un IN comme orphelin (défaut: 12h)',
    example: 12,
    default: 12,
  })
  @IsOptional()
  @IsInt()
  orphanInThreshold?: number;

  @ApiPropertyOptional({
    description: 'Fenêtre de tolérance en minutes pour erreur de badgeage (défaut: 2 min)',
    example: 2,
    default: 2,
  })
  @IsOptional()
  @IsInt()
  doublePunchToleranceMinutes?: number;

  // Pauses implicites
  @ApiPropertyOptional({
    description: 'Activer la tolérance des pauses implicites (OUT suivi de IN dans délai raisonnable)',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  allowImplicitBreaks?: boolean;

  @ApiPropertyOptional({
    description: 'Durée minimum en minutes pour considérer une pause implicite (défaut: 30 min)',
    example: 30,
    default: 30,
  })
  @IsOptional()
  @IsInt()
  minImplicitBreakMinutes?: number;

  @ApiPropertyOptional({
    description: 'Durée maximum en minutes pour considérer une pause implicite (défaut: 120 min)',
    example: 120,
    default: 120,
  })
  @IsOptional()
  @IsInt()
  maxImplicitBreakMinutes?: number;

  // Clôture automatique des sessions orphelines
  @ApiPropertyOptional({
    description: 'Activer la clôture automatique des sessions IN sans OUT (badge oublié)',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  autoCloseOrphanSessions?: boolean;

  @ApiPropertyOptional({
    description: 'Heure de clôture par défaut si pas de shift défini (format HH:mm)',
    example: '23:59',
    default: '23:59',
  })
  @IsOptional()
  @IsString()
  autoCloseDefaultTime?: string;

  @ApiPropertyOptional({
    description: 'Buffer en minutes à ajouter après fin de shift pour heures sup (0 = désactivé)',
    example: 120,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  autoCloseOvertimeBuffer?: number;

  @ApiPropertyOptional({
    description: 'Vérifier si overtime approuvé existe avant clôture (ajuste l\'heure de sortie)',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  autoCloseCheckApprovedOvertime?: boolean;

  @ApiPropertyOptional({
    description: 'Activer la détection de patterns suspects DOUBLE_IN',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  enableDoubleInPatternDetection?: boolean;

  @ApiPropertyOptional({
    description: 'Seuil d\'alerte pour patterns suspects (nombre de DOUBLE_IN sur 30 jours, défaut: 3)',
    example: 3,
    default: 3,
  })
  @IsOptional()
  @IsInt()
  doubleInPatternAlertThreshold?: number;

  // MISSING_IN Advanced Settings
  @ApiPropertyOptional({
    description: 'Autoriser MISSING_IN pour télétravail',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  allowMissingInForRemoteWork?: boolean;

  @ApiPropertyOptional({
    description: 'Autoriser MISSING_IN pour missions',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  allowMissingInForMissions?: boolean;

  @ApiPropertyOptional({
    description: 'Activer les rappels MISSING_IN',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  missingInReminderEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Délai en minutes avant le rappel MISSING_IN (défaut: 15 min)',
    example: 15,
    default: 15,
  })
  @IsOptional()
  @IsInt()
  missingInReminderDelay?: number;

  @ApiPropertyOptional({
    description: 'Nombre maximum de rappels MISSING_IN par jour (défaut: 2)',
    example: 2,
    default: 2,
  })
  @IsOptional()
  @IsInt()
  missingInReminderMaxPerDay?: number;

  @ApiPropertyOptional({
    description: 'Activer la détection de patterns d\'oubli MISSING_IN',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  enableMissingInPatternDetection?: boolean;

  @ApiPropertyOptional({
    description: 'Seuil d\'alerte pour patterns d\'oubli MISSING_IN (nombre sur 30 jours, défaut: 3)',
    example: 3,
    default: 3,
  })
  @IsOptional()
  @IsInt()
  missingInPatternAlertThreshold?: number;

  // MISSING_OUT Advanced Settings
  @ApiPropertyOptional({
    description: 'Heure d\'exécution du job batch MISSING_OUT (format HH:mm, défaut: 00:00)',
    example: '00:00',
    default: '00:00',
  })
  @IsOptional()
  @IsString()
  missingOutDetectionTime?: string;

  @ApiPropertyOptional({
    description: 'Fenêtre de détection en heures pour shifts de nuit (défaut: 12h)',
    example: 12,
    default: 12,
  })
  @IsOptional()
  @IsInt()
  missingOutDetectionWindow?: number;

  @ApiPropertyOptional({
    description: 'Autoriser MISSING_OUT pour télétravail',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  allowMissingOutForRemoteWork?: boolean;

  @ApiPropertyOptional({
    description: 'Autoriser MISSING_OUT pour missions',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  allowMissingOutForMissions?: boolean;

  @ApiPropertyOptional({
    description: 'Activer les rappels MISSING_OUT',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  missingOutReminderEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Délai en minutes avant le rappel MISSING_OUT (défaut: 15 min)',
    example: 15,
    default: 15,
  })
  @IsOptional()
  @IsInt()
  missingOutReminderDelay?: number;

  @ApiPropertyOptional({
    description: 'Rappel X minutes avant fermeture du shift (défaut: 30 min)',
    example: 30,
    default: 30,
  })
  @IsOptional()
  @IsInt()
  missingOutReminderBeforeClosing?: number;

  @ApiPropertyOptional({
    description: 'Activer la détection de patterns d\'oubli MISSING_OUT',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  enableMissingOutPatternDetection?: boolean;

  @ApiPropertyOptional({
    description: 'Seuil d\'alerte pour patterns d\'oubli MISSING_OUT (nombre sur 30 jours, défaut: 3)',
    example: 3,
    default: 3,
  })
  @IsOptional()
  @IsInt()
  missingOutPatternAlertThreshold?: number;
}
