import { IsNumber, IsOptional, IsArray, IsUUID, IsBoolean, IsDateString, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GenerateLeavesDto {
  @ApiPropertyOptional({ 
    description: 'Pourcentage d\'employés ayant des congés (0-100)',
    example: 30,
    default: 30,
    minimum: 0,
    maximum: 100
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  percentage?: number;

  @ApiPropertyOptional({ 
    description: 'Nombre moyen de jours de congé par employé',
    example: 5,
    default: 5,
    minimum: 1,
    maximum: 30
  })
  @IsNumber()
  @Min(1)
  @Max(30)
  @IsOptional()
  averageDaysPerEmployee?: number;

  @ApiPropertyOptional({ 
    description: 'IDs des types de congés à utiliser (si vide, tous les types)',
    type: [String]
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  leaveTypeIds?: string[];

  @ApiProperty({ 
    description: 'Date de début de la période de génération',
    example: '2025-01-01' 
  })
  @IsDateString()
  startDate: string;

  @ApiProperty({ 
    description: 'Date de fin de la période de génération',
    example: '2025-12-31' 
  })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ 
    description: 'Approuver automatiquement les congés générés (status APPROVED)',
    default: true 
  })
  @IsBoolean()
  @IsOptional()
  autoApprove?: boolean;
}

