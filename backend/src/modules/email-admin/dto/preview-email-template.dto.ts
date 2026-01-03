import { IsString, IsObject } from 'class-validator';

export class PreviewEmailTemplateDto {
  @IsString()
  htmlContent: string;

  @IsObject()
  variables: Record<string, string>;
}

