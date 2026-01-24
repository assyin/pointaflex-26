import { PrismaService } from '../../database/prisma.service';
import { CreateRecoveryDayDto, ConvertOvertimeToRecoveryDayDto, UpdateRecoveryDayDto, ConvertFlexibleDto } from './dto/create-recovery-day.dto';
import { RecoveryDayStatus } from '@prisma/client';
export declare class RecoveryDaysService {
    private prisma;
    constructor(prisma: PrismaService);
    getCumulativeBalance(tenantId: string, employeeId: string): Promise<{
        employeeId: string;
        cumulativeHours: number;
        dailyWorkingHours: number;
        conversionRate: number;
        possibleDays: number;
        overtimeDetails: any[];
    }>;
    convertFromOvertime(tenantId: string, userId: string, dto: ConvertOvertimeToRecoveryDayDto): Promise<{
        overtimeSources: any[];
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        employeeId: string;
        notes: string | null;
        status: import(".prisma/client").$Enums.RecoveryDayStatus;
        approvedBy: string | null;
        approvedAt: Date | null;
        startDate: Date;
        endDate: Date;
        days: import("@prisma/client/runtime/library").Decimal;
        sourceHours: import("@prisma/client/runtime/library").Decimal;
        conversionRate: import("@prisma/client/runtime/library").Decimal | null;
    }>;
    convertFlexible(tenantId: string, userId: string, dto: ConvertFlexibleDto, userPermissions?: string[]): Promise<{
        conversionSummary: {
            selectedOvertimeCount: number;
            totalHoursConverted: number;
            daysGranted: number;
            autoApproved: boolean;
            isRegularization: boolean;
        };
        employee: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            matricule: string;
        };
        overtimeSources: ({
            overtime: {
                id: string;
                date: Date;
                type: import(".prisma/client").$Enums.OvertimeType;
                hours: import("@prisma/client/runtime/library").Decimal;
                approvedHours: import("@prisma/client/runtime/library").Decimal;
            };
        } & {
            id: string;
            overtimeId: string;
            recoveryDayId: string;
            hoursUsed: import("@prisma/client/runtime/library").Decimal;
        })[];
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        employeeId: string;
        notes: string | null;
        status: import(".prisma/client").$Enums.RecoveryDayStatus;
        approvedBy: string | null;
        approvedAt: Date | null;
        startDate: Date;
        endDate: Date;
        days: import("@prisma/client/runtime/library").Decimal;
        sourceHours: import("@prisma/client/runtime/library").Decimal;
        conversionRate: import("@prisma/client/runtime/library").Decimal | null;
    }>;
    private validateNoConflicts;
    create(tenantId: string, dto: CreateRecoveryDayDto): Promise<{
        employee: {
            id: string;
            firstName: string;
            lastName: string;
            matricule: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        employeeId: string;
        notes: string | null;
        status: import(".prisma/client").$Enums.RecoveryDayStatus;
        approvedBy: string | null;
        approvedAt: Date | null;
        startDate: Date;
        endDate: Date;
        days: import("@prisma/client/runtime/library").Decimal;
        sourceHours: import("@prisma/client/runtime/library").Decimal;
        conversionRate: import("@prisma/client/runtime/library").Decimal | null;
    }>;
    findAll(tenantId: string, page?: number, limit?: number, filters?: {
        employeeId?: string;
        status?: RecoveryDayStatus;
        startDate?: string;
        endDate?: string;
    }, userId?: string, userPermissions?: string[]): Promise<{
        data: ({
            employee: {
                id: string;
                firstName: string;
                lastName: string;
                matricule: string;
            };
            overtimeSources: ({
                overtime: {
                    id: string;
                    date: Date;
                    hours: import("@prisma/client/runtime/library").Decimal;
                    approvedHours: import("@prisma/client/runtime/library").Decimal;
                };
            } & {
                id: string;
                overtimeId: string;
                recoveryDayId: string;
                hoursUsed: import("@prisma/client/runtime/library").Decimal;
            })[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            employeeId: string;
            notes: string | null;
            status: import(".prisma/client").$Enums.RecoveryDayStatus;
            approvedBy: string | null;
            approvedAt: Date | null;
            startDate: Date;
            endDate: Date;
            days: import("@prisma/client/runtime/library").Decimal;
            sourceHours: import("@prisma/client/runtime/library").Decimal;
            conversionRate: import("@prisma/client/runtime/library").Decimal | null;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    findOne(tenantId: string, id: string): Promise<{
        employee: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            matricule: string;
        };
        overtimeSources: ({
            overtime: {
                id: string;
                date: Date;
                type: import(".prisma/client").$Enums.OvertimeType;
                hours: import("@prisma/client/runtime/library").Decimal;
                approvedHours: import("@prisma/client/runtime/library").Decimal;
            };
        } & {
            id: string;
            overtimeId: string;
            recoveryDayId: string;
            hoursUsed: import("@prisma/client/runtime/library").Decimal;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        employeeId: string;
        notes: string | null;
        status: import(".prisma/client").$Enums.RecoveryDayStatus;
        approvedBy: string | null;
        approvedAt: Date | null;
        startDate: Date;
        endDate: Date;
        days: import("@prisma/client/runtime/library").Decimal;
        sourceHours: import("@prisma/client/runtime/library").Decimal;
        conversionRate: import("@prisma/client/runtime/library").Decimal | null;
    }>;
    update(tenantId: string, id: string, dto: UpdateRecoveryDayDto): Promise<{
        employee: {
            id: string;
            firstName: string;
            lastName: string;
            matricule: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        employeeId: string;
        notes: string | null;
        status: import(".prisma/client").$Enums.RecoveryDayStatus;
        approvedBy: string | null;
        approvedAt: Date | null;
        startDate: Date;
        endDate: Date;
        days: import("@prisma/client/runtime/library").Decimal;
        sourceHours: import("@prisma/client/runtime/library").Decimal;
        conversionRate: import("@prisma/client/runtime/library").Decimal | null;
    }>;
    approve(tenantId: string, id: string, userId: string): Promise<{
        employee: {
            id: string;
            firstName: string;
            lastName: string;
            matricule: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        employeeId: string;
        notes: string | null;
        status: import(".prisma/client").$Enums.RecoveryDayStatus;
        approvedBy: string | null;
        approvedAt: Date | null;
        startDate: Date;
        endDate: Date;
        days: import("@prisma/client/runtime/library").Decimal;
        sourceHours: import("@prisma/client/runtime/library").Decimal;
        conversionRate: import("@prisma/client/runtime/library").Decimal | null;
    }>;
    cancel(tenantId: string, id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        employeeId: string;
        notes: string | null;
        status: import(".prisma/client").$Enums.RecoveryDayStatus;
        approvedBy: string | null;
        approvedAt: Date | null;
        startDate: Date;
        endDate: Date;
        days: import("@prisma/client/runtime/library").Decimal;
        sourceHours: import("@prisma/client/runtime/library").Decimal;
        conversionRate: import("@prisma/client/runtime/library").Decimal | null;
    }>;
    getEmployeeRecoveryDays(tenantId: string, employeeId: string, startDate?: string, endDate?: string): Promise<({
        overtimeSources: ({
            overtime: {
                id: string;
                date: Date;
                hours: import("@prisma/client/runtime/library").Decimal;
                approvedHours: import("@prisma/client/runtime/library").Decimal;
            };
        } & {
            id: string;
            overtimeId: string;
            recoveryDayId: string;
            hoursUsed: import("@prisma/client/runtime/library").Decimal;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        employeeId: string;
        notes: string | null;
        status: import(".prisma/client").$Enums.RecoveryDayStatus;
        approvedBy: string | null;
        approvedAt: Date | null;
        startDate: Date;
        endDate: Date;
        days: import("@prisma/client/runtime/library").Decimal;
        sourceHours: import("@prisma/client/runtime/library").Decimal;
        conversionRate: import("@prisma/client/runtime/library").Decimal | null;
    })[]>;
    getEmployeeBalance(tenantId: string, employeeId: string): Promise<{
        employeeId: string;
        totalDays: number;
        approvedDays: number;
        usedDays: number;
        pendingDays: number;
        availableDays: number;
        recoveryDays: ({
            overtimeSources: ({
                overtime: {
                    id: string;
                    date: Date;
                    hours: import("@prisma/client/runtime/library").Decimal;
                    approvedHours: import("@prisma/client/runtime/library").Decimal;
                };
            } & {
                id: string;
                overtimeId: string;
                recoveryDayId: string;
                hoursUsed: import("@prisma/client/runtime/library").Decimal;
            })[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            employeeId: string;
            notes: string | null;
            status: import(".prisma/client").$Enums.RecoveryDayStatus;
            approvedBy: string | null;
            approvedAt: Date | null;
            startDate: Date;
            endDate: Date;
            days: import("@prisma/client/runtime/library").Decimal;
            sourceHours: import("@prisma/client/runtime/library").Decimal;
            conversionRate: import("@prisma/client/runtime/library").Decimal | null;
        })[];
    }>;
    getCumulativeSupplementaryDaysBalance(tenantId: string, employeeId: string): Promise<{
        employeeId: string;
        cumulativeHours: number;
        possibleRecoveryDays: number;
        dailyWorkingHours: number;
        conversionRate: number;
        supplementaryDayDetails: any[];
    }>;
    convertSupplementaryDaysFlexible(tenantId: string, userId: string, dto: {
        employeeId: string;
        supplementaryDayIds: string[];
        startDate: string;
        endDate: string;
        days: number;
        autoApprove?: boolean;
        allowPastDate?: boolean;
        notes?: string;
    }, userPermissions?: string[]): Promise<{
        conversionSummary: {
            selectedSupplementaryDaysCount: number;
            totalHoursConverted: number;
            daysGranted: number;
            autoApproved: boolean;
            isRegularization: boolean;
        };
        employee: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            matricule: string;
        };
        overtimeSources: ({
            overtime: {
                id: string;
                date: Date;
                type: import(".prisma/client").$Enums.OvertimeType;
                hours: import("@prisma/client/runtime/library").Decimal;
                approvedHours: import("@prisma/client/runtime/library").Decimal;
            };
        } & {
            id: string;
            overtimeId: string;
            recoveryDayId: string;
            hoursUsed: import("@prisma/client/runtime/library").Decimal;
        })[];
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        employeeId: string;
        notes: string | null;
        status: import(".prisma/client").$Enums.RecoveryDayStatus;
        approvedBy: string | null;
        approvedAt: Date | null;
        startDate: Date;
        endDate: Date;
        days: import("@prisma/client/runtime/library").Decimal;
        sourceHours: import("@prisma/client/runtime/library").Decimal;
        conversionRate: import("@prisma/client/runtime/library").Decimal | null;
    }>;
}
