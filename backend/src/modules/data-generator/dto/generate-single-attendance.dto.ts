import { IsString, IsEnum, IsOptional, IsDateString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ScenarioType {
  NORMAL = 'normal',
  LATE = 'late',
  EARLY_LEAVE = 'earlyLeave',
  ANOMALY = 'anomaly',
  MISSION = 'mission',
  ABSENCE = 'absence',
  DOUBLE_IN = 'doubleIn',
  MISSING_OUT = 'missingOut',
  LONG_BREAK = 'longBreak',
}

export class GenerateSingleAttendanceDto {
  @ApiProperty({ description: 'ID de l\'employé' })
  @IsUUID()
  employeeId: string;

  @ApiProperty({ description: 'Date pour générer le pointage', example: '2025-01-15' })
  @IsDateString()
  date: string;

  @ApiProperty({
    description: 'Type de scénario à générer',
    enum: ScenarioType,
    example: ScenarioType.NORMAL
  })
  @IsEnum(ScenarioType)
  scenario: ScenarioType;

  @ApiPropertyOptional({ description: 'Site ID (optionnel)' })
  @IsUUID()
  @IsOptional()
  siteId?: string;
}
