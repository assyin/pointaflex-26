import { IsString, IsUUID, IsDateString, IsArray, IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ExtendMode {
  ALL = 'all',
  DEPARTMENT = 'department',
  EMPLOYEES = 'employees',
  EMPLOYEE = 'employee',
}

export class ExtendScheduleDto {
  @ApiProperty({ enum: ExtendMode, description: 'Mode de prolongation' })
  @IsEnum(ExtendMode)
  mode: ExtendMode;

  @ApiPropertyOptional({ description: 'ID du département (si mode=department)' })
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiPropertyOptional({ description: 'Liste des IDs employés (si mode=employees)', type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  employeeIds?: string[];

  @ApiPropertyOptional({ description: 'ID de l\'employé (si mode=employee)' })
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @ApiProperty({ example: '2026-02-01', description: 'Date de début de la prolongation' })
  @IsDateString()
  fromDate: string;

  @ApiProperty({ example: '2026-02-28', description: 'Date de fin de la prolongation' })
  @IsDateString()
  toDate: string;

  @ApiPropertyOptional({ default: true, description: 'Respecter les congés approuvés' })
  @IsOptional()
  @IsBoolean()
  respectLeaves?: boolean;

  @ApiPropertyOptional({ default: true, description: 'Respecter les jours de récupération' })
  @IsOptional()
  @IsBoolean()
  respectRecoveryDays?: boolean;

  @ApiPropertyOptional({ default: false, description: 'Écraser les plannings existants dans la plage' })
  @IsOptional()
  @IsBoolean()
  overwriteExisting?: boolean;
}
