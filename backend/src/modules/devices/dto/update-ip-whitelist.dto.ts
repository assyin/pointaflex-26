import { IsArray, IsBoolean, IsIP, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateIPWhitelistDto {
  @ApiProperty({
    description: 'Liste des adresses IP autorisées',
    example: ['192.168.1.100', '10.0.0.50'],
    type: [String]
  })
  @IsArray()
  @IsIP('4', { each: true })
  allowedIPs: string[];

  @ApiPropertyOptional({
    description: 'Activer la vérification de la liste blanche IP',
    default: false
  })
  @IsOptional()
  @IsBoolean()
  enforceIPWhitelist?: boolean;
}
