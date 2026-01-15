import { IsOptional, IsString, IsEmail, IsDateString } from 'class-validator';

export class ImportEmployeeDto {
  @IsString()
  matricule: string;

  @IsString()
  @IsOptional()
  civilite?: string; // M, MME, MLLE

  @IsString()
  lastName: string;

  @IsString()
  firstName: string;

  @IsString()
  @IsOptional()
  situationFamiliale?: string;

  @IsOptional()
  nbEnfants?: number;

  @IsOptional()
  @IsDateString()
  dateNaissance?: string;

  @IsString()
  @IsOptional()
  cnss?: string;

  @IsString()
  @IsOptional()
  cin?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  agence?: string;

  @IsString()
  @IsOptional()
  rib?: string;

  @IsString()
  @IsOptional()
  contrat?: string; // CDI, CDD

  @IsOptional()
  @IsDateString()
  hireDate?: string;

  @IsString()
  @IsOptional()
  department?: string;

  @IsString()
  @IsOptional()
  region?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  position?: string;

  @IsString()
  @IsOptional()
  phone?: string;
}

export interface ImportLogEntry {
  type: 'info' | 'success' | 'warning' | 'error' | 'site' | 'department' | 'position' | 'team' | 'shift';
  message: string;
  timestamp: string;
}

export class ImportResultDto {
  success: number;
  failed: number;
  totalToProcess: number;
  errors: Array<{
    row: number;
    matricule?: string;
    error: string;
  }>;
  imported: Array<{
    matricule: string;
    firstName: string;
    lastName: string;
  }>;
  logs: ImportLogEntry[];
}
