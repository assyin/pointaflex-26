import { IsString, IsEnum, IsOptional, IsBoolean, IsIP, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DeviceType } from '@prisma/client';

export class CreateDeviceDto {
  @ApiProperty({ description: 'Nom du terminal' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'ID unique du terminal' })
  @IsString()
  deviceId: string;

  @ApiProperty({ description: 'Type de terminal', enum: DeviceType })
  @IsEnum(DeviceType)
  deviceType: DeviceType;

  @ApiPropertyOptional({ description: 'Adresse IP du terminal' })
  @IsOptional()
  @IsIP()
  ipAddress?: string;

  @ApiPropertyOptional({ description: 'Clé API pour sécuriser les webhooks' })
  @IsOptional()
  @IsString()
  apiKey?: string;

  @ApiPropertyOptional({ description: 'ID du site' })
  @IsOptional()
  @IsUUID()
  siteId?: string;

  @ApiPropertyOptional({ description: 'Terminal actif', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Générer automatiquement une API Key sécurisée lors de la création',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  generateApiKey?: boolean;
}
