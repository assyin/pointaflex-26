import { IsString, IsOptional, IsInt, IsBoolean, IsArray, IsNumber } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTenantSettingsDto {
  // Company Info
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  legalName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  hrEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  // Regional Settings
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  firstDayOfWeek?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  workingDays?: string[];

  // Time Policy
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  lateToleranceEntry?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  earlyToleranceExit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  overtimeRounding?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nightShiftStart?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nightShiftEnd?: string;

  // Leave Rules
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  twoLevelWorkflow?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  anticipatedLeave?: boolean;

  // Export Settings
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  monthlyPayrollEmail?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  sfptExport?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requireBreakPunch?: boolean;
}
