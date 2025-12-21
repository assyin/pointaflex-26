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

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  workingDays?: string[];

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
}
