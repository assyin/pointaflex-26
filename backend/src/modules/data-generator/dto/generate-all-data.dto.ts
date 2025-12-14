import { IsOptional, IsString, IsNumber, IsBoolean, IsArray, IsObject, ValidateNested, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType } from '@prisma/client';

class TenantConfigDto {
  @ApiProperty({ description: 'Nom de l\'entreprise' })
  @IsString()
  companyName: string;

  @ApiPropertyOptional({ description: 'Slug unique' })
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiPropertyOptional({ description: 'Email de contact' })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: 'Téléphone' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ description: 'Adresse' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ description: 'Ville' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ description: 'Pays' })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiPropertyOptional({ description: 'Timezone' })
  @IsString()
  @IsOptional()
  timezone?: string;
}

export class RBACConfigDto {
  @ApiPropertyOptional({ description: 'Générer les rôles système (vérifier init-rbac.ts)' })
  @IsBoolean()
  @IsOptional()
  generateSystemRoles?: boolean;

  @ApiPropertyOptional({ description: 'Générer des rôles personnalisés' })
  @IsBoolean()
  @IsOptional()
  generateCustomRoles?: boolean;

  @ApiPropertyOptional({ description: 'Rôles personnalisés' })
  @IsArray()
  @IsOptional()
  customRoles?: Array<{
    name: string;
    description?: string;
    permissions: string[];
  }>;

  @ApiPropertyOptional({ description: 'Nombre d\'utilisateurs par rôle' })
  @IsObject()
  @IsOptional()
  usersPerRole?: {
    SUPER_ADMIN: number;
    ADMIN_RH: number;
    MANAGER: number;
    EMPLOYEE: number;
  };
}

export class StructureConfigDto {
  @ApiPropertyOptional({ description: 'Nombre de sites à générer' })
  @IsNumber()
  @Min(1)
  @IsOptional()
  sitesCount?: number;

  @ApiPropertyOptional({ description: 'Sites personnalisés' })
  @IsArray()
  @IsOptional()
  sites?: Array<{
    name: string;
    code?: string;
    address?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
  }>;

  @ApiPropertyOptional({ description: 'Nombre de départements à générer' })
  @IsNumber()
  @Min(1)
  @IsOptional()
  departmentsCount?: number;

  @ApiPropertyOptional({ description: 'Départements personnalisés' })
  @IsArray()
  @IsOptional()
  departments?: Array<{
    name: string;
    code?: string;
    description?: string;
  }>;

  @ApiPropertyOptional({ description: 'Nombre de positions à générer' })
  @IsNumber()
  @Min(1)
  @IsOptional()
  positionsCount?: number;

  @ApiPropertyOptional({ description: 'Positions personnalisées' })
  @IsArray()
  @IsOptional()
  positions?: Array<{
    name: string;
    code?: string;
    category?: string;
    description?: string;
  }>;

  @ApiPropertyOptional({ description: 'Nombre d\'équipes à générer' })
  @IsNumber()
  @Min(1)
  @IsOptional()
  teamsCount?: number;

  @ApiPropertyOptional({ description: 'Équipes personnalisées' })
  @IsArray()
  @IsOptional()
  teams?: Array<{
    name: string;
    code?: string;
    description?: string;
  }>;

  @ApiPropertyOptional({ description: 'Assigner des managers (hiérarchie)' })
  @IsBoolean()
  @IsOptional()
  assignManagers?: boolean;

  @ApiPropertyOptional({ description: 'Distribution des managers' })
  @IsObject()
  @IsOptional()
  managerDistribution?: {
    departmentManagers: number;
    siteManagers: number;
    teamManagers: number;
  };
}

export class EmployeesConfigDto {
  @ApiPropertyOptional({ description: 'Nombre d\'employés à générer' })
  @IsNumber()
  @Min(1)
  @IsOptional()
  count?: number;

  @ApiPropertyOptional({ description: 'Lier aux utilisateurs RBAC' })
  @IsBoolean()
  @IsOptional()
  linkToUsers?: boolean;

  @ApiPropertyOptional({ description: 'Assigner aux structures (sites/départements/positions/équipes)' })
  @IsBoolean()
  @IsOptional()
  assignToStructures?: boolean;

  @ApiPropertyOptional({ description: 'Distribution des employés' })
  @IsObject()
  @IsOptional()
  distribution?: {
    bySite?: Record<string, number>;
    byDepartment?: Record<string, number>;
    byPosition?: Record<string, number>;
    byTeam?: Record<string, number>;
  };

  @ApiPropertyOptional({ description: 'Options de génération de données' })
  @IsObject()
  @IsOptional()
  dataOptions?: {
    generateRealisticNames?: boolean;
    generateEmails?: boolean;
    generatePhones?: boolean;
    generateAddresses?: boolean;
  };
}

class ShiftsConfigDto {
  @ApiPropertyOptional({ description: 'Créer les shifts par défaut (Matin, Soir, Nuit)' })
  @IsBoolean()
  @IsOptional()
  createDefault?: boolean;

  @ApiPropertyOptional({ description: 'Shifts personnalisés' })
  @IsArray()
  @IsOptional()
  custom?: Array<{
    name: string;
    code: string;
    startTime: string;
    endTime: string;
    breakDuration?: number;
  }>;

  @ApiPropertyOptional({ description: 'Assigner aux employés' })
  @IsBoolean()
  @IsOptional()
  assignToEmployees?: boolean;

  @ApiPropertyOptional({ description: 'Distribution par shift' })
  @IsObject()
  @IsOptional()
  distribution?: {
    byShift?: Record<string, number>;
  };
}

class HolidaysConfigDto {
  @ApiPropertyOptional({ description: 'Générer les jours fériés marocains' })
  @IsBoolean()
  @IsOptional()
  generateMoroccoHolidays?: boolean;

  @ApiPropertyOptional({ description: 'Année de début' })
  @IsNumber()
  @IsOptional()
  startYear?: number;

  @ApiPropertyOptional({ description: 'Année de fin' })
  @IsNumber()
  @IsOptional()
  endYear?: number;

  @ApiPropertyOptional({ description: 'Jours fériés personnalisés' })
  @IsArray()
  @IsOptional()
  customHolidays?: Array<{
    name: string;
    date: string;
    isRecurring: boolean;
  }>;
}

class SchedulesConfigDto {
  @ApiPropertyOptional({ description: 'Date de début (YYYY-MM-DD)' })
  @IsString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Date de fin (YYYY-MM-DD)' })
  @IsString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Pourcentage d\'employés avec planning' })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  coverage?: number;

  @ApiPropertyOptional({ description: 'Exclure les jours fériés' })
  @IsBoolean()
  @IsOptional()
  excludeHolidays?: boolean;

  @ApiPropertyOptional({ description: 'Exclure les weekends' })
  @IsBoolean()
  @IsOptional()
  excludeWeekends?: boolean;

  @ApiPropertyOptional({ description: 'Distribution par shift' })
  @IsObject()
  @IsOptional()
  distribution?: {
    byShift?: Record<string, number>;
  };
}

class LeavesConfigDto {
  @ApiPropertyOptional({ description: 'Date de début (YYYY-MM-DD)' })
  @IsString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Date de fin (YYYY-MM-DD)' })
  @IsString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Pourcentage d\'employés avec congés' })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  percentage?: number;

  @ApiPropertyOptional({ description: 'Nombre moyen de jours par employé' })
  @IsNumber()
  @Min(1)
  @IsOptional()
  averageDaysPerEmployee?: number;

  @ApiPropertyOptional({ description: 'Distribution par type de congé' })
  @IsObject()
  @IsOptional()
  distribution?: {
    byLeaveType?: Record<string, number>;
  };

  @ApiPropertyOptional({ description: 'Configuration du workflow d\'approbation' })
  @IsObject()
  @IsOptional()
  workflow?: {
    autoApprove?: boolean;
    approvalDistribution?: {
      PENDING: number;
      MANAGER_APPROVED: number;
      APPROVED: number;
      REJECTED: number;
    };
  };
}

class AttendanceConfigDto {
  @ApiPropertyOptional({ description: 'Date de début (YYYY-MM-DD)' })
  @IsString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Date de fin (YYYY-MM-DD)' })
  @IsString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Distribution des scénarios' })
  @IsObject()
  @IsOptional()
  distribution?: {
    normal?: number;
    late?: number;
    earlyLeave?: number;
    mission?: number;
    anomalies?: number;
    absence?: number;
  };

  @ApiPropertyOptional({ description: 'Exclure les jours fériés' })
  @IsBoolean()
  @IsOptional()
  excludeHolidays?: boolean;

  @ApiPropertyOptional({ description: 'Exclure les weekends' })
  @IsBoolean()
  @IsOptional()
  excludeWeekends?: boolean;

  @ApiPropertyOptional({ description: 'Exclure les congés approuvés' })
  @IsBoolean()
  @IsOptional()
  excludeLeaves?: boolean;

  @ApiPropertyOptional({ description: 'Générer des heures supplémentaires' })
  @IsBoolean()
  @IsOptional()
  generateOvertime?: boolean;

  @ApiPropertyOptional({ description: 'Seuil d\'heures par jour pour générer overtime' })
  @IsNumber()
  @IsOptional()
  overtimeThreshold?: number;
}

export class OvertimeConfigDto {
  @ApiPropertyOptional({ description: 'Nombre d\'overtime à générer' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  count?: number;

  @ApiPropertyOptional({ description: 'Distribution des statuts' })
  @IsObject()
  @IsOptional()
  statusDistribution?: {
    PENDING: number;
    APPROVED: number;
    REJECTED: number;
  };

  @ApiPropertyOptional({ description: 'Nombre moyen d\'heures' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  averageHours?: number;
}

export class RecoveryConfigDto {
  @ApiPropertyOptional({ description: 'Nombre de recovery à générer' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  count?: number;

  @ApiPropertyOptional({ description: 'Convertir depuis overtime' })
  @IsBoolean()
  @IsOptional()
  convertFromOvertime?: boolean;

  @ApiPropertyOptional({ description: 'Taux de conversion (% d\'overtime à convertir)' })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  conversionRate?: number;
}

export class DevicesConfigDto {
  @ApiPropertyOptional({ description: 'Nombre de devices par site' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  perSite?: number;

  @ApiPropertyOptional({ description: 'Types de devices' })
  @IsArray()
  @IsOptional()
  deviceTypes?: Array<{
    name: string;
    model?: string;
    location?: string;
  }>;
}

export class ReplacementsConfigDto {
  @ApiPropertyOptional({ description: 'Nombre de remplacements à générer' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  count?: number;

  @ApiPropertyOptional({ description: 'Distribution des statuts' })
  @IsObject()
  @IsOptional()
  statusDistribution?: {
    PENDING: number;
    APPROVED: number;
    REJECTED: number;
  };
}

export class NotificationsConfigDto {
  @ApiPropertyOptional({ description: 'Nombre de notifications à générer' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  count?: number;

  @ApiPropertyOptional({ description: 'Types de notifications' })
  @IsArray()
  @IsOptional()
  types?: Array<{
    type: NotificationType;
    count: number;
  }>;
}

class GlobalOptionsDto {
  @ApiPropertyOptional({ description: 'Marquer toutes les données générées' })
  @IsBoolean()
  @IsOptional()
  markAsGenerated?: boolean;

  @ApiPropertyOptional({ description: 'Utiliser des transactions pour cohérence' })
  @IsBoolean()
  @IsOptional()
  useTransactions?: boolean;

  @ApiPropertyOptional({ description: 'Arrêter en cas d\'erreur ou continuer' })
  @IsBoolean()
  @IsOptional()
  stopOnError?: boolean;

  @ApiPropertyOptional({ description: 'Générer certaines entités en parallèle' })
  @IsBoolean()
  @IsOptional()
  generateInParallel?: boolean;
}

export class GenerateAllDataDto {
  @ApiPropertyOptional({ description: 'Configuration du tenant' })
  @ValidateNested()
  @Type(() => TenantConfigDto)
  @IsOptional()
  tenant?: TenantConfigDto;

  @ApiPropertyOptional({ description: 'Configuration RBAC' })
  @ValidateNested()
  @Type(() => RBACConfigDto)
  @IsOptional()
  rbac?: RBACConfigDto;

  @ApiPropertyOptional({ description: 'Configuration de la structure organisationnelle' })
  @ValidateNested()
  @Type(() => StructureConfigDto)
  @IsOptional()
  structure?: StructureConfigDto;

  @ApiPropertyOptional({ description: 'Configuration des employés' })
  @ValidateNested()
  @Type(() => EmployeesConfigDto)
  @IsOptional()
  employees?: EmployeesConfigDto;

  @ApiPropertyOptional({ description: 'Configuration des shifts' })
  @ValidateNested()
  @Type(() => ShiftsConfigDto)
  @IsOptional()
  shifts?: ShiftsConfigDto;

  @ApiPropertyOptional({ description: 'Configuration des jours fériés' })
  @ValidateNested()
  @Type(() => HolidaysConfigDto)
  @IsOptional()
  holidays?: HolidaysConfigDto;

  @ApiPropertyOptional({ description: 'Configuration des plannings' })
  @ValidateNested()
  @Type(() => SchedulesConfigDto)
  @IsOptional()
  schedules?: SchedulesConfigDto;

  @ApiPropertyOptional({ description: 'Configuration des congés' })
  @ValidateNested()
  @Type(() => LeavesConfigDto)
  @IsOptional()
  leaves?: LeavesConfigDto;

  @ApiPropertyOptional({ description: 'Configuration des pointages' })
  @ValidateNested()
  @Type(() => AttendanceConfigDto)
  @IsOptional()
  attendance?: AttendanceConfigDto;

  @ApiPropertyOptional({ description: 'Configuration des heures supplémentaires (direct)' })
  @ValidateNested()
  @Type(() => OvertimeConfigDto)
  @IsOptional()
  overtime?: OvertimeConfigDto;

  @ApiPropertyOptional({ description: 'Configuration de la récupération' })
  @ValidateNested()
  @Type(() => RecoveryConfigDto)
  @IsOptional()
  recovery?: RecoveryConfigDto;

  @ApiPropertyOptional({ description: 'Configuration des devices' })
  @ValidateNested()
  @Type(() => DevicesConfigDto)
  @IsOptional()
  devices?: DevicesConfigDto;

  @ApiPropertyOptional({ description: 'Configuration des remplacements' })
  @ValidateNested()
  @Type(() => ReplacementsConfigDto)
  @IsOptional()
  replacements?: ReplacementsConfigDto;

  @ApiPropertyOptional({ description: 'Configuration des notifications' })
  @ValidateNested()
  @Type(() => NotificationsConfigDto)
  @IsOptional()
  notifications?: NotificationsConfigDto;

  @ApiPropertyOptional({ description: 'Options globales' })
  @ValidateNested()
  @Type(() => GlobalOptionsDto)
  @IsOptional()
  options?: GlobalOptionsDto;
}

