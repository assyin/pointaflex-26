import { IsString, IsInt, IsBoolean, IsOptional } from 'class-validator';

export class TestSmtpConnectionDto {
  @IsString()
  host: string;

  @IsInt()
  port: number;

  @IsBoolean()
  secure: boolean;

  @IsString()
  @IsOptional()
  username?: string;

  @IsString()
  @IsOptional()
  password?: string;
}

