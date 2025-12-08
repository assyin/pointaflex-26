import { IsBoolean, IsOptional, IsNumber, Min, Max, IsArray, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GenerateHolidaysDto {
  @ApiPropertyOptional({ 
    description: 'Générer les jours fériés du Maroc',
    default: true 
  })
  @IsBoolean()
  @IsOptional()
  generateMoroccoHolidays?: boolean;

  @ApiPropertyOptional({ 
    description: 'Année de début pour la génération',
    example: 2025,
    default: new Date().getFullYear()
  })
  @IsNumber()
  @Min(2020)
  @Max(2100)
  @IsOptional()
  startYear?: number;

  @ApiPropertyOptional({ 
    description: 'Année de fin pour la génération',
    example: 2027,
    default: new Date().getFullYear() + 2
  })
  @IsNumber()
  @Min(2020)
  @Max(2100)
  @IsOptional()
  endYear?: number;

  @ApiPropertyOptional({ 
    description: 'Jours fériés personnalisés à ajouter',
    type: [Object]
  })
  @IsArray()
  @IsOptional()
  customHolidays?: Array<{
    name: string;
    date: string; // Format: YYYY-MM-DD
    isRecurring?: boolean;
  }>;
}

