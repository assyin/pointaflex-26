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
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  lateToleranceEntry?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  earlyToleranceExit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  overtimeRounding?: number;

  @ApiPropertyOptional({
    description: 'Seuil minimum en minutes pour créer automatiquement un Overtime',
    example: 30,
  })
  @IsOptional()
  @IsInt()
  overtimeMinimumThreshold?: number;

  // Leave Rules
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  twoLevelWorkflow?: boolean;

  @ApiPropertyOptional()
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
}
