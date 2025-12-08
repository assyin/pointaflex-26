import { IsString, IsArray, IsOptional, IsDateString, IsUUID, IsNumber, Min, Max, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class DistributionDto {
  @ApiProperty({ description: 'Pourcentage de journées normales', example: 70, minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  normal: number;

  @ApiProperty({ description: 'Pourcentage de retards', example: 15, minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  late: number;

  @ApiProperty({ description: 'Pourcentage de départs anticipés', example: 5, minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  earlyLeave: number;

  @ApiProperty({ description: 'Pourcentage d\'anomalies', example: 5, minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  anomaly: number;

  @ApiProperty({ description: 'Pourcentage de missions', example: 3, minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  mission: number;

  @ApiProperty({ description: 'Pourcentage d\'absences', example: 2, minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  absence: number;
}

export class GenerateBulkAttendanceDto {
  @ApiProperty({ description: 'Date de début', example: '2025-01-01' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'Date de fin', example: '2025-01-31' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ description: 'Liste des IDs d\'employés (si vide, tous les employés actifs)' })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  employeeIds?: string[];

  @ApiProperty({ description: 'Distribution des scénarios' })
  @ValidateNested()
  @Type(() => DistributionDto)
  distribution: DistributionDto;

  @ApiPropertyOptional({ description: 'Site ID (optionnel)' })
  @IsUUID()
  @IsOptional()
  siteId?: string;

  @ApiPropertyOptional({ 
    description: 'Exclure les jours fériés de la génération',
    default: true 
  })
  @IsOptional()
  excludeHolidays?: boolean;

  @ApiPropertyOptional({ 
    description: 'Exclure les weekends (samedi et dimanche) de la génération',
    default: true 
  })
  @IsOptional()
  excludeWeekends?: boolean;

  @ApiPropertyOptional({ 
    description: 'Générer automatiquement les heures supplémentaires',
    default: false 
  })
  @IsOptional()
  generateOvertime?: boolean;

  @ApiPropertyOptional({ 
    description: 'Seuil minimum en minutes pour créer une heure supplémentaire',
    default: 30,
    minimum: 0 
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  overtimeThreshold?: number;
}
