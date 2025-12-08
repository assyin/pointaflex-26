import { IsString, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BulkAssignSiteDto {
  @ApiProperty({ description: 'ID du site à assigner' })
  @IsString()
  siteId: string;

  @ApiPropertyOptional({ 
    description: 'IDs des employés à assigner (optionnel, si non fourni, tous les employés seront assignés)',
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  employeeIds?: string[];
}

