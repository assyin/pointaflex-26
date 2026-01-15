import { IsOptional, IsUUID, IsEnum, IsDateString, IsInt, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { DeviceAction } from '@prisma/client';

export class AuditLogFiltersDto {
  @ApiPropertyOptional({ description: 'ID du terminal' })
  @IsOptional()
  @IsUUID()
  deviceId?: string;

  @ApiPropertyOptional({ description: 'Type d\'action', enum: DeviceAction })
  @IsOptional()
  @IsEnum(DeviceAction)
  action?: DeviceAction;

  @ApiPropertyOptional({ description: 'ID de l\'utilisateur ayant effectué l\'action' })
  @IsOptional()
  @IsUUID()
  performedBy?: string;

  @ApiPropertyOptional({ description: 'Date de début (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Date de fin (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Numéro de page', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Nombre d\'éléments par page', default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
