import { IsBoolean, IsOptional, IsString, IsDateString, IsNumber, Min, Max, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GenerateSchedulesDto {
  @ApiProperty({ 
    example: '2025-01-01',
    description: 'Date de début pour la génération de plannings (YYYY-MM-DD)'
  })
  @IsDateString()
  startDate: string;

  @ApiProperty({ 
    example: '2025-01-31',
    description: 'Date de fin pour la génération de plannings (YYYY-MM-DD)'
  })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ 
    description: 'IDs des employés à inclure (optionnel, tous si vide)',
    type: [String]
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  employeeIds?: string[];

  @ApiPropertyOptional({ 
    description: 'IDs des shifts à utiliser (optionnel, tous si vide)',
    type: [String]
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  shiftIds?: string[];

  @ApiPropertyOptional({ 
    description: 'Exclure les weekends',
    default: true
  })
  @IsBoolean()
  @IsOptional()
  excludeWeekends?: boolean;

  @ApiPropertyOptional({ 
    description: 'Exclure les jours fériés',
    default: true
  })
  @IsBoolean()
  @IsOptional()
  excludeHolidays?: boolean;

  @ApiPropertyOptional({ 
    description: 'Pourcentage de jours travaillés par employé (0-100)',
    example: 80,
    default: 80
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  workDaysPercentage?: number;

  @ApiPropertyOptional({ 
    description: 'Distribution des shifts (en pourcentage, doit totaliser 100)',
    example: { 'shift-id-1': 40, 'shift-id-2': 40, 'shift-id-3': 20 }
  })
  @IsOptional()
  shiftDistribution?: Record<string, number>;

  @ApiPropertyOptional({ 
    description: 'Créer des plannings pour tous les jours ou seulement les jours ouvrables',
    default: true
  })
  @IsBoolean()
  @IsOptional()
  onlyWorkdays?: boolean;
}

