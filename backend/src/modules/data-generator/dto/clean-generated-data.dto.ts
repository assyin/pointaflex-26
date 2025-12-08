import { IsBoolean, IsOptional, IsDateString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CleanGeneratedDataDto {
  @ApiProperty({ description: 'Supprimer toutes les données générées', default: true })
  @IsBoolean()
  deleteAll: boolean;

  @ApiPropertyOptional({ description: 'Supprimer uniquement les données après cette date' })
  @IsDateString()
  @IsOptional()
  afterDate?: string;

  @ApiPropertyOptional({ description: 'Supprimer uniquement pour cet employé' })
  @IsUUID()
  @IsOptional()
  employeeId?: string;

  @ApiPropertyOptional({ description: 'Supprimer uniquement pour ce site' })
  @IsUUID()
  @IsOptional()
  siteId?: string;
}
