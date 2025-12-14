import { IsString, IsUUID, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSiteManagerDto {
  @ApiPropertyOptional({ description: 'ID du manager régional (employé)' })
  @IsString()
  @IsUUID()
  @IsOptional()
  managerId?: string;
}
