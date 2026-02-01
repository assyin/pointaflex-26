import { IsString, IsUUID, IsDateString, IsInt, Min, Max, IsArray, ValidateNested, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class EmployeeRotationDto {
  @ApiProperty({ description: 'Employee ID' })
  @IsUUID()
  employeeId: string;

  @ApiProperty({ example: '2026-01-01', description: 'Date de début de travail pour cet employé (premier jour de travail du cycle)' })
  @IsDateString()
  startDate: string;
}

export class GenerateRotationPlanningDto {
  @ApiProperty({ example: 4, description: 'Nombre de jours de travail consécutifs' })
  @IsInt()
  @Min(1)
  @Max(7)
  workDays: number;

  @ApiProperty({ example: 2, description: 'Nombre de jours de repos consécutifs' })
  @IsInt()
  @Min(1)
  @Max(7)
  restDays: number;

  @ApiProperty({ description: 'Shift ID à utiliser pour les jours de travail' })
  @IsUUID()
  shiftId: string;

  @ApiProperty({ example: '2026-01-31', description: 'Date de fin de génération' })
  @IsDateString()
  endDate: string;

  @ApiProperty({ type: [EmployeeRotationDto], description: 'Liste des employés avec leur date de début' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmployeeRotationDto)
  employees: EmployeeRotationDto[];

  @ApiPropertyOptional({ default: false, description: 'Écraser les plannings existants' })
  @IsOptional()
  @IsBoolean()
  overwriteExisting?: boolean;

  @ApiPropertyOptional({ default: true, description: 'Respecter les congés approuvés (ne pas créer de planning sur les jours de congé)' })
  @IsOptional()
  @IsBoolean()
  respectLeaves?: boolean;

  @ApiPropertyOptional({ default: true, description: 'Respecter les jours de récupération approuvés' })
  @IsOptional()
  @IsBoolean()
  respectRecoveryDays?: boolean;
}

export class RotationPlanningResultDto {
  @ApiProperty({ description: 'Nombre de plannings créés avec succès' })
  success: number;

  @ApiProperty({ description: 'Nombre de plannings ignorés (déjà existants)' })
  skipped: number;

  @ApiProperty({ description: 'Nombre d\'erreurs' })
  failed: number;

  @ApiProperty({ description: 'Détails des plannings créés par employé' })
  details: Array<{
    employeeId: string;
    matricule: string;
    employeeName: string;
    created: number;
    skipped: number;
    errors: string[];
  }>;
}

export class PreviewRotationPlanningDto {
  @ApiProperty({ example: 4, description: 'Nombre de jours de travail consécutifs' })
  @IsInt()
  @Min(1)
  @Max(7)
  workDays: number;

  @ApiProperty({ example: 2, description: 'Nombre de jours de repos consécutifs' })
  @IsInt()
  @Min(1)
  @Max(7)
  restDays: number;

  @ApiProperty({ example: '2026-01-31', description: 'Date de fin de génération' })
  @IsDateString()
  endDate: string;

  @ApiProperty({ type: [EmployeeRotationDto], description: 'Liste des employés avec leur date de début' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmployeeRotationDto)
  employees: EmployeeRotationDto[];
}

export class PreviewRotationResultDto {
  @ApiProperty({ description: 'Aperçu du planning par employé' })
  preview: Array<{
    employeeId: string;
    matricule: string;
    employeeName: string;
    startDate: string;
    schedule: Array<{
      date: string;
      dayOfWeek: string;
      isWorkDay: boolean;
    }>;
    totalWorkDays: number;
    totalRestDays: number;
  }>;

  @ApiProperty({ description: 'Nombre total de plannings qui seront créés' })
  totalSchedulesToCreate: number;
}
