import { IsNumber, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpdateTenantSettingsDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  workDaysPerWeek?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  maxWeeklyHours?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  lateToleranceMinutes?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  breakDuration?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  alertWeeklyHoursExceeded?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  alertInsufficientRest?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  alertNightWorkRepetitive?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  alertMinimumStaffing?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  annualLeaveDays?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  leaveApprovalLevels?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  overtimeRate?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  nightShiftRate?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  requireBreakPunch?: boolean;
}
