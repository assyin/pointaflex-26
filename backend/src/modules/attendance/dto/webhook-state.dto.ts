import { IsString, IsEnum, IsOptional, IsDateString, IsInt, IsObject, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AttendanceType, DeviceType } from '@prisma/client';

/**
 * DTO pour recevoir les pointages avec STATE du terminal ZKTeco
 *
 * IMPORTANT: Le type IN/OUT vient DIRECTEMENT du terminal via le champ state
 * Le backend NE DOIT PAS déduire ou modifier ce type
 *
 * Mapping STATE → TYPE:
 * - state 0 = IN  (Check-In)
 * - state 1 = OUT (Check-Out)
 * - state 2 = OUT (Break-Out)
 * - state 3 = IN  (Break-In)
 * - state 4 = IN  (OT-In)
 * - state 5 = OUT (OT-Out)
 */
export class WebhookStateDto {
  @ApiProperty({ description: 'Matricule de l\'employé (depuis le terminal)' })
  @IsString()
  employeeId: string;

  @ApiProperty({ description: 'Timestamp du pointage ISO8601' })
  @IsDateString()
  timestamp: string;

  @ApiProperty({
    description: 'Type de pointage - FOURNI PAR LE TERMINAL, NE PAS MODIFIER',
    enum: ['IN', 'OUT']
  })
  @IsEnum(AttendanceType)
  type: AttendanceType;

  @ApiProperty({
    description: 'State brut du terminal ZKTeco (0-5)',
    minimum: 0,
    maximum: 255
  })
  @IsInt()
  @Min(0)
  @Max(255)
  terminalState: number;

  @ApiPropertyOptional({
    description: 'Méthode d\'authentification',
    enum: DeviceType,
    default: 'FINGERPRINT'
  })
  @IsEnum(DeviceType)
  @IsOptional()
  method?: DeviceType;

  @ApiPropertyOptional({
    description: 'Source du pointage',
    default: 'TERMINAL'
  })
  @IsString()
  @IsOptional()
  source?: string;

  @ApiPropertyOptional({ description: 'Données brutes du terminal pour audit' })
  @IsObject()
  @IsOptional()
  rawData?: Record<string, any>;
}

/**
 * Réponse du webhook state
 */
export class WebhookStateResponseDto {
  @ApiProperty({ description: 'Statut de traitement' })
  status: 'CREATED' | 'DUPLICATE' | 'DEBOUNCE_BLOCKED' | 'ERROR';

  @ApiPropertyOptional({ description: 'ID du pointage créé' })
  id?: string;

  @ApiPropertyOptional({ description: 'Type enregistré (IN/OUT)' })
  type?: string;

  @ApiPropertyOptional({ description: 'Anomalie détectée' })
  anomaly?: string;

  @ApiPropertyOptional({ description: 'ID existant si doublon' })
  existingId?: string;

  @ApiPropertyOptional({ description: 'Message d\'erreur' })
  error?: string;

  @ApiPropertyOptional({ description: 'Durée de traitement en ms' })
  duration?: number;
}
