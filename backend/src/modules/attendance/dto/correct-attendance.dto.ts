import { IsString, IsOptional, IsDateString, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CorrectAttendanceDto {
  @ApiPropertyOptional({ description: 'Nouveau timestamp corrigé' })
  @IsDateString()
  @IsOptional()
  correctedTimestamp?: string;

  @ApiProperty({ description: 'Note de correction' })
  @IsString()
  correctionNote: string;

  @ApiProperty({ description: 'ID de l\'utilisateur qui corrige' })
  @IsString()
  correctedBy: string;

  @ApiPropertyOptional({ description: 'Forcer la correction sans approbation (admin seulement)' })
  @IsBoolean()
  @IsOptional()
  forceApproval?: boolean;
}
