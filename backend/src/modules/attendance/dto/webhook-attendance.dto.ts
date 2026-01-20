import { IsString, IsEnum, IsOptional, IsDateString, IsObject, IsUUID, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AttendanceType, DeviceType, ValidationStatus } from '@prisma/client';

export class WebhookAttendanceDto {
  @ApiProperty({ description: 'Matricule ou ID de l\'employé' })
  @IsString()
  employeeId: string;

  @ApiProperty({ description: 'Type de pointage', enum: AttendanceType })
  @IsEnum(AttendanceType)
  type: AttendanceType;

  @ApiProperty({ description: 'Méthode utilisée', enum: DeviceType })
  @IsEnum(DeviceType)
  method: DeviceType;

  @ApiProperty({ description: 'Timestamp du pointage', example: '2025-01-15T08:00:00Z' })
  @IsDateString()
  timestamp: string;

  @ApiPropertyOptional({ description: 'Données brutes du terminal' })
  @IsObject()
  @IsOptional()
  rawData?: any;

  // Champs pour gestion des pointages ambigus (shifts de nuit)
  @ApiPropertyOptional({ description: 'Indique si le pointage est ambigu et nécessite validation' })
  @IsBoolean()
  @IsOptional()
  isAmbiguous?: boolean;

  @ApiPropertyOptional({ description: 'Statut de validation', enum: ['NONE', 'PENDING_VALIDATION'] })
  @IsString()
  @IsOptional()
  validationStatus?: 'NONE' | 'PENDING_VALIDATION';

  @ApiPropertyOptional({ description: 'Raison de l\'ambiguïté' })
  @IsString()
  @IsOptional()
  ambiguityReason?: string;
}
