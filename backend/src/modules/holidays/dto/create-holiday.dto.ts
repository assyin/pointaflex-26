import { IsString, IsDateString, IsEnum, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { HolidayType } from '@prisma/client';

export class CreateHolidayDto {
  @ApiProperty({ description: 'Nom du jour férié' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Date du jour férié (YYYY-MM-DD)' })
  @IsDateString()
  date: string;

  @ApiProperty({ enum: HolidayType, description: 'Type de jour férié' })
  @IsEnum(HolidayType)
  type: HolidayType;

  @ApiPropertyOptional({ description: 'Est-ce un jour récurrent (anniversaire annuel)' })
  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;
}
