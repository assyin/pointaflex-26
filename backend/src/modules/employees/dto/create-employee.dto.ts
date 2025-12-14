import { IsString, IsEmail, IsOptional, IsDateString, IsBoolean, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEmployeeDto {
  @ApiProperty({ description: 'Matricule unique de l\'employé' })
  @IsString()
  matricule: string;

  @ApiProperty({ description: 'Prénom' })
  @IsString()
  firstName: string;

  @ApiProperty({ description: 'Nom' })
  @IsString()
  lastName: string;

  @ApiPropertyOptional({ description: 'Email' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: 'Téléphone' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ description: 'Date de naissance' })
  @IsDateString()
  @IsOptional()
  dateOfBirth?: string;

  @ApiPropertyOptional({ description: 'Adresse' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ description: 'URL de la photo' })
  @IsString()
  @IsOptional()
  photo?: string;

  @ApiProperty({ description: 'Poste' })
  @IsString()
  position: string;

  @ApiPropertyOptional({ description: 'ID de la fonction/position (relation vers Position)' })
  @IsUUID()
  @IsOptional()
  positionId?: string;

  @ApiProperty({ description: 'Date d\'embauche' })
  @IsDateString()
  hireDate: string;

  @ApiPropertyOptional({ description: 'Type de contrat (CDI, CDD, Stage, etc.)' })
  @IsString()
  @IsOptional()
  contractType?: string;

  @ApiPropertyOptional({ description: 'ID du site' })
  @IsUUID()
  @IsOptional()
  siteId?: string;

  @ApiPropertyOptional({ description: 'ID du département' })
  @IsUUID()
  @IsOptional()
  departmentId?: string;

  @ApiPropertyOptional({ description: 'ID de l\'équipe' })
  @IsUUID()
  @IsOptional()
  teamId?: string;

  @ApiPropertyOptional({ description: 'ID du shift actuel' })
  @IsUUID()
  @IsOptional()
  currentShiftId?: string;

  @ApiPropertyOptional({ description: 'Badge RFID' })
  @IsString()
  @IsOptional()
  rfidBadge?: string;

  @ApiPropertyOptional({ description: 'QR Code' })
  @IsString()
  @IsOptional()
  qrCode?: string;

  @ApiPropertyOptional({ description: 'Code PIN' })
  @IsString()
  @IsOptional()
  pinCode?: string;

  @ApiPropertyOptional({ description: 'Actif/Inactif', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'ID de l\'utilisateur associé' })
  @IsUUID()
  @IsOptional()
  userId?: string;
}
