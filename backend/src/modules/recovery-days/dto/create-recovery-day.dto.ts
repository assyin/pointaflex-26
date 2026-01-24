import { IsString, IsDateString, IsNumber, IsOptional, IsEnum, Min, Max, IsArray, IsBoolean, ArrayMinSize } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RecoveryDayStatus } from '@prisma/client';

export class CreateRecoveryDayDto {
  @ApiProperty({ description: 'ID de l\'employé' })
  @IsString()
  employeeId: string;

  @ApiProperty({ description: 'Date de début de la récupération (YYYY-MM-DD)' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'Date de fin de la récupération (YYYY-MM-DD)' })
  @IsDateString()
  endDate: string;

  @ApiProperty({ description: 'Nombre de jours de récupération' })
  @IsNumber()
  @Min(0.5)
  days: number;

  @ApiPropertyOptional({ description: 'Heures supplémentaires utilisées pour cette récupération' })
  @IsOptional()
  @IsNumber()
  sourceHours?: number;

  @ApiPropertyOptional({ description: 'Taux de conversion utilisé (si différent du défaut)' })
  @IsOptional()
  @IsNumber()
  conversionRate?: number;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ConvertOvertimeToRecoveryDayDto {
  @ApiProperty({ description: 'ID de l\'employé' })
  @IsString()
  employeeId: string;

  @ApiProperty({ description: 'Nombre de jours de récupération à créer' })
  @IsNumber()
  @Min(0.5)
  days: number;

  @ApiProperty({ description: 'Date de début de la récupération (YYYY-MM-DD)' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'Date de fin de la récupération (YYYY-MM-DD)' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ApproveRecoveryDayDto {
  @ApiPropertyOptional({ description: 'Commentaire d\'approbation' })
  @IsOptional()
  @IsString()
  comment?: string;
}

export class UpdateRecoveryDayDto {
  @ApiPropertyOptional({ description: 'Date de début' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Date de fin' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Nombre de jours' })
  @IsOptional()
  @IsNumber()
  @Min(0.5)
  days?: number;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * DTO pour la conversion flexible des heures supplémentaires en jours de récupération
 * Permet au manager de sélectionner ligne par ligne quelles heures convertir
 */
export class ConvertFlexibleDto {
  @ApiProperty({ description: 'ID de l\'employé' })
  @IsString()
  employeeId: string;

  @ApiProperty({
    description: 'Liste des IDs des heures supplémentaires à convertir',
    type: [String],
    example: ['overtime-id-1', 'overtime-id-2']
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Au moins une heure supplémentaire doit être sélectionnée' })
  @IsString({ each: true })
  overtimeIds: string[];

  @ApiProperty({ description: 'Date de début de la récupération (YYYY-MM-DD)' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'Date de fin de la récupération (YYYY-MM-DD)' })
  @IsDateString()
  endDate: string;

  @ApiProperty({
    description: 'Nombre de jours de récupération à créer',
    minimum: 0.5
  })
  @IsNumber()
  @Min(0.5)
  days: number;

  @ApiPropertyOptional({
    description: 'Approuver automatiquement si le manager a l\'autorité directe',
    default: false
  })
  @IsOptional()
  @IsBoolean()
  autoApprove?: boolean;

  @ApiPropertyOptional({
    description: 'Permettre les dates passées pour régularisation',
    default: false
  })
  @IsOptional()
  @IsBoolean()
  allowPastDate?: boolean;

  @ApiPropertyOptional({ description: 'Notes ou commentaires' })
  @IsOptional()
  @IsString()
  notes?: string;
}
