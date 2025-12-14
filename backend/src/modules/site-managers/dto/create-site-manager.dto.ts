import { IsString, IsUUID, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSiteManagerDto {
  @ApiProperty({ description: 'ID du site' })
  @IsString()
  @IsUUID()
  @IsNotEmpty()
  siteId: string;

  @ApiProperty({ description: 'ID du manager régional (employé)' })
  @IsString()
  @IsUUID()
  @IsNotEmpty()
  managerId: string;

  @ApiProperty({ description: 'ID du département géré par ce manager dans ce site' })
  @IsString()
  @IsUUID()
  @IsNotEmpty()
  departmentId: string;
}
