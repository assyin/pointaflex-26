import { IsString, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSiteDto {
  @ApiProperty({ description: 'Nom du site' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Code unique du site (ex: CAS, RBT)' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ description: 'Adresse du site' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'Ville' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'Téléphone' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Jours travaillés (override du tenant)', type: [String] })
  @IsOptional()
  @IsArray()
  workingDays?: string[];

  @ApiPropertyOptional({ description: 'Fuseau horaire (override du tenant)' })
  @IsOptional()
  @IsString()
  timezone?: string;
}
