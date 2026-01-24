import { IsString, IsNumber, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ApprovalStatus {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export class ApproveSupplementaryDayDto {
  @ApiProperty({ enum: ApprovalStatus, description: 'Statut d\'approbation' })
  @IsEnum(ApprovalStatus)
  status: ApprovalStatus;

  @ApiPropertyOptional({ description: 'Heures approuvées (peut différer des heures déclarées)' })
  @IsOptional()
  @IsNumber()
  approvedHours?: number;

  @ApiPropertyOptional({ description: 'Raison du rejet' })
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
