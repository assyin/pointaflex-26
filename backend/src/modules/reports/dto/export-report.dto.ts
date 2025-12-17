import { IsEnum, IsOptional, IsString, IsDateString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ExportFormat {
  PDF = 'PDF',
  EXCEL = 'EXCEL',
  CSV = 'CSV',
}

export class ExportReportDto {
  @ApiProperty({ enum: ExportFormat, example: ExportFormat.PDF })
  @IsEnum(ExportFormat)
  format: ExportFormat;

  @ApiProperty({ example: '2025-01-01', description: 'Start date in YYYY-MM-DD format' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2025-01-31', description: 'End date in YYYY-MM-DD format' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ description: 'Filter by employee ID' })
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @ApiPropertyOptional({ description: 'Filter by department ID' })
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiPropertyOptional({ description: 'Filter by site ID' })
  @IsOptional()
  @IsUUID()
  siteId?: string;

  @ApiPropertyOptional({ description: 'Filter by team ID' })
  @IsOptional()
  @IsUUID()
  teamId?: string;

  @ApiPropertyOptional({ description: 'Columns to include (comma-separated)' })
  @IsOptional()
  @IsString()
  columns?: string;

  @ApiPropertyOptional({ description: 'Template type', enum: ['standard', 'detailed', 'summary'] })
  @IsOptional()
  @IsString()
  template?: string;

  @ApiPropertyOptional({ description: 'Include summary statistics' })
  @IsOptional()
  includeSummary?: boolean;

  @ApiPropertyOptional({ description: 'Include charts (PDF only)' })
  @IsOptional()
  includeCharts?: boolean;
}

