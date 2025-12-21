import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MigrateMatriculeDto {
  @ApiProperty({
    description: 'Nouveau matricule officiel',
    example: '01001',
  })
  @IsString()
  @IsNotEmpty()
  officialMatricule: string;
}

