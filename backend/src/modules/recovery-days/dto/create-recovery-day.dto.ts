import { IsString, IsDateString, IsNumber, IsOptional, IsEnum, Min, Max } from 'class-validator';
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
