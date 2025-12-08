import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

export class CreatePositionDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  code?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  category?: string; // IT, RH, FINANCE, PRODUCTION, COMMERCIAL, etc.

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;
}
