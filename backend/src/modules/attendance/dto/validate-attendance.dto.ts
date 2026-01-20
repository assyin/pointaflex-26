import { IsString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ValidationAction {
  VALIDATE = 'VALIDATE',
  REJECT = 'REJECT',
  CORRECT = 'CORRECT',
}

export class ValidateAttendanceDto {
  @ApiProperty({ description: 'ID du pointage à valider' })
  @IsUUID()
  attendanceId: string;

  @ApiProperty({ description: 'Action de validation', enum: ValidationAction })
  @IsEnum(ValidationAction)
  action: ValidationAction;

  @ApiPropertyOptional({ description: 'Type corrigé (IN/OUT) si action=CORRECT' })
  @IsString()
  @IsOptional()
  correctedType?: 'IN' | 'OUT';

  @ApiPropertyOptional({ description: 'Note de validation' })
  @IsString()
  @IsOptional()
  validationNote?: string;
}

export class BulkValidateAttendanceDto {
  @ApiProperty({ description: 'Liste des validations', type: [ValidateAttendanceDto] })
  validations: ValidateAttendanceDto[];
}
