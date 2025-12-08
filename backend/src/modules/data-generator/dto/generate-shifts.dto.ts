import { IsBoolean, IsOptional, IsObject, IsDateString, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ShiftDistributionDto {
  [shiftId: string]: number; // Pourcentage d'assignation pour chaque shift
}

export class GenerateShiftsDto {
  @ApiPropertyOptional({ 
    description: 'Créer des shifts par défaut (Matin, Soir, Nuit) s\'ils n\'existent pas',
    default: true 
  })
  @IsBoolean()
  @IsOptional()
  createDefaultShifts?: boolean;

  @ApiPropertyOptional({ 
    description: 'Distribution d\'assignation des shifts aux employés (ex: { "shiftId1": 50, "shiftId2": 30, "shiftId3": 20 })',
    example: { "shift-id-1": 50, "shift-id-2": 30, "shift-id-3": 20 }
  })
  @IsObject()
  @IsOptional()
  distribution?: ShiftDistributionDto;

  @ApiPropertyOptional({ 
    description: 'Créer des plannings (Schedule) pour une période donnée',
    default: false 
  })
  @IsBoolean()
  @IsOptional()
  createSchedules?: boolean;

  @ApiPropertyOptional({ 
    description: 'Date de début pour la génération de plannings',
    example: '2025-01-01' 
  })
  @IsDateString()
  @IsOptional()
  scheduleStartDate?: string;

  @ApiPropertyOptional({ 
    description: 'Date de fin pour la génération de plannings',
    example: '2025-01-31' 
  })
  @IsDateString()
  @IsOptional()
  scheduleEndDate?: string;
}

