import { IsString, IsBoolean, IsOptional, IsArray } from 'class-validator';

export class CreateEmailTemplateDto {
  @IsString()
  code: string;

  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  subject: string;

  @IsString()
  htmlContent: string;

  @IsArray()
  variables: string[];

  @IsString()
  @IsOptional()
  category?: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}

