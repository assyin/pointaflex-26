import { IsArray, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class BulkCorrectionItemDto {
  @ApiProperty({ description: 'ID du pointage à corriger' })
  @IsString()
  attendanceId: string;

  @ApiProperty({ description: 'Nouveau timestamp corrigé (optionnel)' })
  @IsString()
  correctedTimestamp?: string;

  @ApiProperty({ description: 'Note de correction spécifique pour ce pointage' })
  @IsString()
  correctionNote?: string;
}

export class BulkCorrectAttendanceDto {
  @ApiProperty({ description: 'Liste des pointages à corriger', type: [BulkCorrectionItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkCorrectionItemDto)
  attendances: BulkCorrectionItemDto[];

  @ApiProperty({ description: 'Note de correction générale' })
  @IsString()
  generalNote: string;

  @ApiProperty({ description: 'ID de l\'utilisateur qui corrige' })
  @IsString()
  correctedBy: string;

  @ApiProperty({ description: 'Forcer la correction sans approbation (admin seulement)', required: false })
  forceApproval?: boolean;
}

