import { IsBoolean, IsString, IsInt, IsOptional, IsEmail, Min, Max } from 'class-validator';

export class CreateEmailConfigDto {
  @IsBoolean()
  enabled: boolean;

  @IsBoolean()
  @IsOptional()
  notifyMissingIn?: boolean;

  @IsBoolean()
  @IsOptional()
  notifyMissingOut?: boolean;

  @IsBoolean()
  @IsOptional()
  notifyLate?: boolean;

  @IsBoolean()
  @IsOptional()
  notifyAbsencePartial?: boolean;

  @IsBoolean()
  @IsOptional()
  notifyAbsenceTechnical?: boolean;

  @IsBoolean()
  @IsOptional()
  notifyAbsence?: boolean;

  @IsString()
  @IsOptional()
  provider?: string;

  @IsString()
  host: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  port: number;

  @IsBoolean()
  secure: boolean;

  @IsString()
  @IsOptional()
  username?: string;

  @IsString()
  @IsOptional()
  password?: string;

  @IsString()
  fromName: string;

  @IsEmail()
  @IsOptional()
  fromEmail?: string;
}

