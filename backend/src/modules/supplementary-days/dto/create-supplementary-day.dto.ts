import { IsString, IsNumber, IsOptional, IsDateString, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum SupplementaryDayType {
  WEEKEND_SATURDAY = 'WEEKEND_SATURDAY',
  WEEKEND_SUNDAY = 'WEEKEND_SUNDAY',
  HOLIDAY = 'HOLIDAY',
}

export class CreateSupplementaryDayDto {
  @ApiProperty({ description: 'ID de l\'employé' })
  @IsString()
  employeeId: string;

  @ApiProperty({ description: 'Date du jour supplémentaire' })
  @IsDateString()
  date: string;

  @ApiProperty({ description: 'Nombre d\'heures travaillées' })
  @IsNumber()
  hours: number;

  @ApiProperty({ enum: SupplementaryDayType, description: 'Type de jour supplémentaire' })
  @IsEnum(SupplementaryDayType)
  type: SupplementaryDayType;

  @ApiPropertyOptional({ description: 'Heure d\'entrée' })
  @IsOptional()
  @IsDateString()
  checkIn?: string;

  @ApiPropertyOptional({ description: 'Heure de sortie' })
  @IsOptional()
  @IsDateString()
  checkOut?: string;

  @ApiPropertyOptional({ description: 'Source de détection' })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
