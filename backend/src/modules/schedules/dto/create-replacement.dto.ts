import { IsString, IsUUID, IsOptional, IsDateString, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReplacementStatus } from '@prisma/client';

export class CreateReplacementDto {
  @ApiProperty({ description: 'Date of replacement (YYYY-MM-DD)' })
  @IsDateString()
  date: string;

  @ApiProperty({ description: 'Original employee ID' })
  @IsUUID()
  originalEmployeeId: string;

  @ApiProperty({ description: 'Replacement employee ID' })
  @IsUUID()
  replacementEmployeeId: string;

  @ApiProperty({ description: 'Shift ID' })
  @IsUUID()
  shiftId: string;

  @ApiPropertyOptional({ description: 'Reason for replacement' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ description: 'Optional link to a leave/absence' })
  @IsOptional()
  @IsUUID()
  leaveId?: string;
}

export class UpdateReplacementDto {
  @ApiPropertyOptional({ enum: ReplacementStatus })
  @IsOptional()
  @IsEnum(ReplacementStatus)
  status?: ReplacementStatus;

  @ApiPropertyOptional({ description: 'Approver user ID' })
  @IsOptional()
  @IsUUID()
  approvedBy?: string;
}

