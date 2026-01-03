import { IsEmail, IsString } from 'class-validator';

export class SendTemplateTestDto {
  @IsString()
  templateId: string;

  @IsEmail()
  to: string;
}
