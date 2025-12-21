import { RecoveryDaysService } from './recovery-days.service';
import { CreateRecoveryDayDto, ConvertOvertimeToRecoveryDayDto, UpdateRecoveryDayDto } from './dto/create-recovery-day.dto';
import { RecoveryDayStatus } from '@prisma/client';
export declare class RecoveryDaysController {
    private recoveryDaysService;
    constructor(recoveryDaysService: RecoveryDaysService);
    getCumulativeBalance(user: any, employeeId: string): Promise<{
        employeeId: string;
        cumulativeHours: number;
        dailyWorkingHours: number;
        conversionRate: number;
        possibleDays: number;
        overtimeDetails: any[];
    }>;
    convertFromOvertime(user: any, dto: ConvertOvertimeToRecoveryDayDto): Promise<{
        overtimeSources: any[];
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        notes: string | null;
        employeeId: string;
        approvedBy: string | null;
        approvedAt: Date | null;
        status: import(".prisma/client").$Enums.RecoveryDayStatus;
        startDate: Date;
        endDate: Date;
        days: import("@prisma/client/runtime/library").Decimal;
        sourceHours: import("@prisma/client/runtime/library").Decimal;
        conversionRate: import("@prisma/client/runtime/library").Decimal | null;
    }>;
    create(user: any, dto: CreateRecoveryDayDto): Promise<{
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
        notes: string | null;
        employeeId: string;
        approvedBy: string | null;
        approvedAt: Date | null;
        status: import(".prisma/client").$Enums.RecoveryDayStatus;
        startDate: Date;
        endDate: Date;
        days: import("@prisma/client/runtime/library").Decimal;
        sourceHours: import("@prisma/client/runtime/library").Decimal;
        conversionRate: import("@prisma/client/runtime/library").Decimal | null;
    }>;
    findAll(user: any, page?: string, limit?: string, employeeId?: string, status?: RecoveryDayStatus, startDate?: string, endDate?: string): Promise<{
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
                hoursUsed: import("@prisma/client/runtime/library").Decimal;
                overtimeId: string;
                recoveryDayId: string;
            })[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            notes: string | null;
            employeeId: string;
            approvedBy: string | null;
            approvedAt: Date | null;
            status: import(".prisma/client").$Enums.RecoveryDayStatus;
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
    findOne(user: any, id: string): Promise<{
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
            hoursUsed: import("@prisma/client/runtime/library").Decimal;
            overtimeId: string;
            recoveryDayId: string;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        notes: string | null;
        employeeId: string;
        approvedBy: string | null;
        approvedAt: Date | null;
        status: import(".prisma/client").$Enums.RecoveryDayStatus;
        startDate: Date;
        endDate: Date;
        days: import("@prisma/client/runtime/library").Decimal;
        sourceHours: import("@prisma/client/runtime/library").Decimal;
        conversionRate: import("@prisma/client/runtime/library").Decimal | null;
    }>;
    update(user: any, id: string, dto: UpdateRecoveryDayDto): Promise<{
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
        notes: string | null;
        employeeId: string;
        approvedBy: string | null;
        approvedAt: Date | null;
        status: import(".prisma/client").$Enums.RecoveryDayStatus;
        startDate: Date;
        endDate: Date;
        days: import("@prisma/client/runtime/library").Decimal;
        sourceHours: import("@prisma/client/runtime/library").Decimal;
        conversionRate: import("@prisma/client/runtime/library").Decimal | null;
    }>;
    approve(user: any, id: string): Promise<{
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
        notes: string | null;
        employeeId: string;
        approvedBy: string | null;
        approvedAt: Date | null;
        status: import(".prisma/client").$Enums.RecoveryDayStatus;
        startDate: Date;
        endDate: Date;
        days: import("@prisma/client/runtime/library").Decimal;
        sourceHours: import("@prisma/client/runtime/library").Decimal;
        conversionRate: import("@prisma/client/runtime/library").Decimal | null;
    }>;
    cancel(user: any, id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        notes: string | null;
        employeeId: string;
        approvedBy: string | null;
        approvedAt: Date | null;
        status: import(".prisma/client").$Enums.RecoveryDayStatus;
        startDate: Date;
        endDate: Date;
        days: import("@prisma/client/runtime/library").Decimal;
        sourceHours: import("@prisma/client/runtime/library").Decimal;
        conversionRate: import("@prisma/client/runtime/library").Decimal | null;
    }>;
    getEmployeeRecoveryDays(user: any, employeeId: string, startDate?: string, endDate?: string): Promise<({
        overtimeSources: ({
            overtime: {
                id: string;
                date: Date;
                hours: import("@prisma/client/runtime/library").Decimal;
                approvedHours: import("@prisma/client/runtime/library").Decimal;
            };
        } & {
            id: string;
            hoursUsed: import("@prisma/client/runtime/library").Decimal;
            overtimeId: string;
            recoveryDayId: string;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        notes: string | null;
        employeeId: string;
        approvedBy: string | null;
        approvedAt: Date | null;
        status: import(".prisma/client").$Enums.RecoveryDayStatus;
        startDate: Date;
        endDate: Date;
        days: import("@prisma/client/runtime/library").Decimal;
        sourceHours: import("@prisma/client/runtime/library").Decimal;
        conversionRate: import("@prisma/client/runtime/library").Decimal | null;
    })[]>;
    getEmployeeBalance(user: any, employeeId: string): Promise<{
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
                hoursUsed: import("@prisma/client/runtime/library").Decimal;
                overtimeId: string;
                recoveryDayId: string;
            })[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            notes: string | null;
            employeeId: string;
            approvedBy: string | null;
            approvedAt: Date | null;
            status: import(".prisma/client").$Enums.RecoveryDayStatus;
            startDate: Date;
            endDate: Date;
            days: import("@prisma/client/runtime/library").Decimal;
            sourceHours: import("@prisma/client/runtime/library").Decimal;
            conversionRate: import("@prisma/client/runtime/library").Decimal | null;
        })[];
    }>;
}
