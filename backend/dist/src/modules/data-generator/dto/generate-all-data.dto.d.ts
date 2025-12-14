import { NotificationType } from '@prisma/client';
declare class TenantConfigDto {
    companyName: string;
    slug?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    country?: string;
    timezone?: string;
}
export declare class RBACConfigDto {
    generateSystemRoles?: boolean;
    generateCustomRoles?: boolean;
    customRoles?: Array<{
        name: string;
        description?: string;
        permissions: string[];
    }>;
    usersPerRole?: {
        SUPER_ADMIN: number;
        ADMIN_RH: number;
        MANAGER: number;
        EMPLOYEE: number;
    };
}
export declare class StructureConfigDto {
    sitesCount?: number;
    sites?: Array<{
        name: string;
        code?: string;
        address?: string;
        city?: string;
        latitude?: number;
        longitude?: number;
    }>;
    departmentsCount?: number;
    departments?: Array<{
        name: string;
        code?: string;
        description?: string;
    }>;
    positionsCount?: number;
    positions?: Array<{
        name: string;
        code?: string;
        category?: string;
        description?: string;
    }>;
    teamsCount?: number;
    teams?: Array<{
        name: string;
        code?: string;
        description?: string;
    }>;
    assignManagers?: boolean;
    managerDistribution?: {
        departmentManagers: number;
        siteManagers: number;
        teamManagers: number;
    };
}
export declare class EmployeesConfigDto {
    count?: number;
    linkToUsers?: boolean;
    assignToStructures?: boolean;
    distribution?: {
        bySite?: Record<string, number>;
        byDepartment?: Record<string, number>;
        byPosition?: Record<string, number>;
        byTeam?: Record<string, number>;
    };
    dataOptions?: {
        generateRealisticNames?: boolean;
        generateEmails?: boolean;
        generatePhones?: boolean;
        generateAddresses?: boolean;
    };
}
declare class ShiftsConfigDto {
    createDefault?: boolean;
    custom?: Array<{
        name: string;
        code: string;
        startTime: string;
        endTime: string;
        breakDuration?: number;
    }>;
    assignToEmployees?: boolean;
    distribution?: {
        byShift?: Record<string, number>;
    };
}
declare class HolidaysConfigDto {
    generateMoroccoHolidays?: boolean;
    startYear?: number;
    endYear?: number;
    customHolidays?: Array<{
        name: string;
        date: string;
        isRecurring: boolean;
    }>;
}
declare class SchedulesConfigDto {
    startDate?: string;
    endDate?: string;
    coverage?: number;
    excludeHolidays?: boolean;
    excludeWeekends?: boolean;
    distribution?: {
        byShift?: Record<string, number>;
    };
}
declare class LeavesConfigDto {
    startDate?: string;
    endDate?: string;
    percentage?: number;
    averageDaysPerEmployee?: number;
    distribution?: {
        byLeaveType?: Record<string, number>;
    };
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
declare class AttendanceConfigDto {
    startDate?: string;
    endDate?: string;
    distribution?: {
        normal?: number;
        late?: number;
        earlyLeave?: number;
        mission?: number;
        anomalies?: number;
        absence?: number;
    };
    excludeHolidays?: boolean;
    excludeWeekends?: boolean;
    excludeLeaves?: boolean;
    generateOvertime?: boolean;
    overtimeThreshold?: number;
}
export declare class OvertimeConfigDto {
    count?: number;
    statusDistribution?: {
        PENDING: number;
        APPROVED: number;
        REJECTED: number;
    };
    averageHours?: number;
}
export declare class RecoveryConfigDto {
    count?: number;
    convertFromOvertime?: boolean;
    conversionRate?: number;
}
export declare class DevicesConfigDto {
    perSite?: number;
    deviceTypes?: Array<{
        name: string;
        model?: string;
        location?: string;
    }>;
}
export declare class ReplacementsConfigDto {
    count?: number;
    statusDistribution?: {
        PENDING: number;
        APPROVED: number;
        REJECTED: number;
    };
}
export declare class NotificationsConfigDto {
    count?: number;
    types?: Array<{
        type: NotificationType;
        count: number;
    }>;
}
declare class GlobalOptionsDto {
    markAsGenerated?: boolean;
    useTransactions?: boolean;
    stopOnError?: boolean;
    generateInParallel?: boolean;
}
export declare class GenerateAllDataDto {
    tenant?: TenantConfigDto;
    rbac?: RBACConfigDto;
    structure?: StructureConfigDto;
    employees?: EmployeesConfigDto;
    shifts?: ShiftsConfigDto;
    holidays?: HolidaysConfigDto;
    schedules?: SchedulesConfigDto;
    leaves?: LeavesConfigDto;
    attendance?: AttendanceConfigDto;
    overtime?: OvertimeConfigDto;
    recovery?: RecoveryConfigDto;
    devices?: DevicesConfigDto;
    replacements?: ReplacementsConfigDto;
    notifications?: NotificationsConfigDto;
    options?: GlobalOptionsDto;
}
export {};
