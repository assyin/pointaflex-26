import { IsString, IsUUID, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateExchangeDto {
  @ApiProperty({ description: 'Date of exchange (YYYY-MM-DD)' })
  @IsDateString()
  date: string;

  @ApiProperty({ description: 'Employee A ID (first employee)' })
  @IsUUID()
  employeeAId: string;

  @ApiProperty({ description: 'Employee B ID (second employee)' })
  @IsUUID()
  employeeBId: string;

  @ApiPropertyOptional({ description: 'Reason for exchange' })
  @IsOptional()
  @IsString()
  reason?: string;
}
