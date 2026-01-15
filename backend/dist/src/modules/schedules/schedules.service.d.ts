import { PrismaService } from '../../database/prisma.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { ImportScheduleResultDto } from './dto/import-schedule.dto';
export declare class SchedulesService {
    private prisma;
    constructor(prisma: PrismaService);
    private parseDateString;
    private formatDateToISO;
    private generateDateRange;
    create(tenantId: string, dto: CreateScheduleDto): Promise<{
        count: number;
        created: number;
        skipped: number;
        excluded: number;
        conflictingDates: {
            date: string;
            shift: string;
            reason: string;
            details: string;
        }[];
        excludedDates: {
            date: string;
            reason: string;
            details: string;
        }[];
        dateRange: {
            start: string;
            end: string;
        };
        message: string;
        summary: {
            totalDatesInRange: number;
            validDates: number;
            created: number;
            excludedByReason: {
                nonOuvrable: number;
                jourFerie: number;
                conge: number;
                recuperation: number;
                dejaExistant: number;
            };
        };
    }>;
    private formatDate;
    findAll(tenantId: string, page?: number, limit?: number, filters?: {
        employeeId?: string;
        teamId?: string;
        shiftId?: string;
        siteId?: string;
        startDate?: string;
        endDate?: string;
    }, userId?: string, userPermissions?: string[]): Promise<{
        data: ({
            employee: {
                id: string;
                firstName: string;
                lastName: string;
                matricule: string;
                position: string;
                department: {
                    id: string;
                    name: string;
                };
                site: {
                    id: string;
                    name: string;
                };
            };
            team: {
                id: string;
                code: string;
                name: string;
            };
            shift: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                tenantId: string;
                code: string;
                name: string;
                startTime: string;
                endTime: string;
                breakStartTime: string | null;
                breakDuration: number;
                isNightShift: boolean;
                color: string | null;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            teamId: string | null;
            employeeId: string;
            shiftId: string;
            date: Date;
            customStartTime: string | null;
            customEndTime: string | null;
            notes: string | null;
            status: import(".prisma/client").$Enums.ScheduleStatus;
            publishedAt: Date | null;
            cancelledAt: Date | null;
            suspendedByLeaveId: string | null;
            suspendedAt: Date | null;
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
            firstName: string;
            lastName: string;
            matricule: string;
            position: string;
        };
        team: {
            id: string;
            code: string;
            name: string;
        };
        shift: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            code: string;
            name: string;
            startTime: string;
            endTime: string;
            breakStartTime: string | null;
            breakDuration: number;
            isNightShift: boolean;
            color: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        teamId: string | null;
        employeeId: string;
        shiftId: string;
        date: Date;
        customStartTime: string | null;
        customEndTime: string | null;
        notes: string | null;
        status: import(".prisma/client").$Enums.ScheduleStatus;
        publishedAt: Date | null;
        cancelledAt: Date | null;
        suspendedByLeaveId: string | null;
        suspendedAt: Date | null;
    }>;
    update(tenantId: string, id: string, dto: UpdateScheduleDto): Promise<{
        employee: {
            id: string;
            firstName: string;
            lastName: string;
            matricule: string;
        };
        team: {
            id: string;
            code: string;
            name: string;
        };
        shift: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            code: string;
            name: string;
            startTime: string;
            endTime: string;
            breakStartTime: string | null;
            breakDuration: number;
            isNightShift: boolean;
            color: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        teamId: string | null;
        employeeId: string;
        shiftId: string;
        date: Date;
        customStartTime: string | null;
        customEndTime: string | null;
        notes: string | null;
        status: import(".prisma/client").$Enums.ScheduleStatus;
        publishedAt: Date | null;
        cancelledAt: Date | null;
        suspendedByLeaveId: string | null;
        suspendedAt: Date | null;
    }>;
    remove(tenantId: string, id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        teamId: string | null;
        employeeId: string;
        shiftId: string;
        date: Date;
        customStartTime: string | null;
        customEndTime: string | null;
        notes: string | null;
        status: import(".prisma/client").$Enums.ScheduleStatus;
        publishedAt: Date | null;
        cancelledAt: Date | null;
        suspendedByLeaveId: string | null;
        suspendedAt: Date | null;
    }>;
    removeBulk(tenantId: string, ids: string[]): Promise<{
        count: number;
        deleted: number;
    }>;
    getWeekSchedule(tenantId: string, date: string, filters?: {
        teamId?: string;
        siteId?: string;
    }): Promise<{
        weekStart: string;
        weekEnd: string;
        schedules: ({
            employee: {
                id: string;
                firstName: string;
                lastName: string;
                matricule: string;
                position: string;
                department: {
                    id: string;
                    name: string;
                };
                site: {
                    id: string;
                    name: string;
                };
                team: {
                    id: string;
                    code: string;
                    name: string;
                };
            };
            team: {
                id: string;
                code: string;
                name: string;
            };
            shift: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                tenantId: string;
                code: string;
                name: string;
                startTime: string;
                endTime: string;
                breakStartTime: string | null;
                breakDuration: number;
                isNightShift: boolean;
                color: string | null;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            teamId: string | null;
            employeeId: string;
            shiftId: string;
            date: Date;
            customStartTime: string | null;
            customEndTime: string | null;
            notes: string | null;
            status: import(".prisma/client").$Enums.ScheduleStatus;
            publishedAt: Date | null;
            cancelledAt: Date | null;
            suspendedByLeaveId: string | null;
            suspendedAt: Date | null;
        })[];
        leaves: ({
            employee: {
                id: string;
                firstName: string;
                lastName: string;
            };
            leaveType: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                tenantId: string;
                code: string;
                name: string;
                isPaid: boolean;
                requiresDocument: boolean;
                maxDaysPerYear: number | null;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            employeeId: string;
            status: import(".prisma/client").$Enums.LeaveStatus;
            leaveTypeId: string;
            startDate: Date;
            endDate: Date;
            days: import("@prisma/client/runtime/library").Decimal;
            reason: string | null;
            document: string | null;
            documentName: string | null;
            documentSize: number | null;
            documentMimeType: string | null;
            documentUploadedBy: string | null;
            documentUploadedAt: Date | null;
            documentUpdatedBy: string | null;
            documentUpdatedAt: Date | null;
            managerApprovedBy: string | null;
            managerApprovedAt: Date | null;
            managerComment: string | null;
            hrApprovedBy: string | null;
            hrApprovedAt: Date | null;
            hrComment: string | null;
        })[];
        replacements: ({
            shift: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                tenantId: string;
                code: string;
                name: string;
                startTime: string;
                endTime: string;
                breakStartTime: string | null;
                breakDuration: number;
                isNightShift: boolean;
                color: string | null;
            };
            originalEmployee: {
                id: string;
                firstName: string;
                lastName: string;
            };
            replacementEmployee: {
                id: string;
                firstName: string;
                lastName: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            shiftId: string;
            date: Date;
            status: import(".prisma/client").$Enums.ReplacementStatus;
            approvedBy: string | null;
            approvedAt: Date | null;
            reason: string | null;
            originalEmployeeId: string;
            replacementEmployeeId: string;
        })[];
    }>;
    getMonthSchedule(tenantId: string, date: string, filters?: {
        teamId?: string;
        siteId?: string;
    }): Promise<{
        monthStart: string;
        monthEnd: string;
        schedules: ({
            employee: {
                id: string;
                firstName: string;
                lastName: string;
                matricule: string;
                position: string;
                department: {
                    id: string;
                    name: string;
                };
                site: {
                    id: string;
                    name: string;
                };
                team: {
                    id: string;
                    code: string;
                    name: string;
                };
            };
            team: {
                id: string;
                code: string;
                name: string;
            };
            shift: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                tenantId: string;
                code: string;
                name: string;
                startTime: string;
                endTime: string;
                breakStartTime: string | null;
                breakDuration: number;
                isNightShift: boolean;
                color: string | null;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            teamId: string | null;
            employeeId: string;
            shiftId: string;
            date: Date;
            customStartTime: string | null;
            customEndTime: string | null;
            notes: string | null;
            status: import(".prisma/client").$Enums.ScheduleStatus;
            publishedAt: Date | null;
            cancelledAt: Date | null;
            suspendedByLeaveId: string | null;
            suspendedAt: Date | null;
        })[];
        leaves: ({
            employee: {
                id: string;
                firstName: string;
                lastName: string;
            };
            leaveType: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                tenantId: string;
                code: string;
                name: string;
                isPaid: boolean;
                requiresDocument: boolean;
                maxDaysPerYear: number | null;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            employeeId: string;
            status: import(".prisma/client").$Enums.LeaveStatus;
            leaveTypeId: string;
            startDate: Date;
            endDate: Date;
            days: import("@prisma/client/runtime/library").Decimal;
            reason: string | null;
            document: string | null;
            documentName: string | null;
            documentSize: number | null;
            documentMimeType: string | null;
            documentUploadedBy: string | null;
            documentUploadedAt: Date | null;
            documentUpdatedBy: string | null;
            documentUpdatedAt: Date | null;
            managerApprovedBy: string | null;
            managerApprovedAt: Date | null;
            managerComment: string | null;
            hrApprovedBy: string | null;
            hrApprovedAt: Date | null;
            hrComment: string | null;
        })[];
        replacements: ({
            shift: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                tenantId: string;
                code: string;
                name: string;
                startTime: string;
                endTime: string;
                breakStartTime: string | null;
                breakDuration: number;
                isNightShift: boolean;
                color: string | null;
            };
            originalEmployee: {
                id: string;
                firstName: string;
                lastName: string;
            };
            replacementEmployee: {
                id: string;
                firstName: string;
                lastName: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            shiftId: string;
            date: Date;
            status: import(".prisma/client").$Enums.ReplacementStatus;
            approvedBy: string | null;
            approvedAt: Date | null;
            reason: string | null;
            originalEmployeeId: string;
            replacementEmployeeId: string;
        })[];
    }>;
    createBulk(tenantId: string, schedules: CreateScheduleDto[]): Promise<{
        count: number;
        total: number;
        skipped: number;
        message: string;
    }>;
    createReplacement(tenantId: string, dto: any): Promise<{
        shift: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            code: string;
            name: string;
            startTime: string;
            endTime: string;
            breakStartTime: string | null;
            breakDuration: number;
            isNightShift: boolean;
            color: string | null;
        };
        originalEmployee: {
            id: string;
            firstName: string;
            lastName: string;
            matricule: string;
        };
        replacementEmployee: {
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
        shiftId: string;
        date: Date;
        status: import(".prisma/client").$Enums.ReplacementStatus;
        approvedBy: string | null;
        approvedAt: Date | null;
        reason: string | null;
        originalEmployeeId: string;
        replacementEmployeeId: string;
    }>;
    findAllReplacements(tenantId: string, filters?: {
        status?: string;
        startDate?: string;
        endDate?: string;
    }): Promise<({
        shift: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            code: string;
            name: string;
            startTime: string;
            endTime: string;
            breakStartTime: string | null;
            breakDuration: number;
            isNightShift: boolean;
            color: string | null;
        };
        originalEmployee: {
            id: string;
            firstName: string;
            lastName: string;
            matricule: string;
        };
        replacementEmployee: {
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
        shiftId: string;
        date: Date;
        status: import(".prisma/client").$Enums.ReplacementStatus;
        approvedBy: string | null;
        approvedAt: Date | null;
        reason: string | null;
        originalEmployeeId: string;
        replacementEmployeeId: string;
    })[]>;
    approveReplacement(tenantId: string, id: string, approvedBy: string): Promise<{
        shift: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            code: string;
            name: string;
            startTime: string;
            endTime: string;
            breakStartTime: string | null;
            breakDuration: number;
            isNightShift: boolean;
            color: string | null;
        };
        originalEmployee: {
            id: string;
            firstName: string;
            lastName: string;
        };
        replacementEmployee: {
            id: string;
            firstName: string;
            lastName: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        shiftId: string;
        date: Date;
        status: import(".prisma/client").$Enums.ReplacementStatus;
        approvedBy: string | null;
        approvedAt: Date | null;
        reason: string | null;
        originalEmployeeId: string;
        replacementEmployeeId: string;
    }>;
    rejectReplacement(tenantId: string, id: string, approvedBy: string): Promise<{
        shift: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            code: string;
            name: string;
            startTime: string;
            endTime: string;
            breakStartTime: string | null;
            breakDuration: number;
            isNightShift: boolean;
            color: string | null;
        };
        originalEmployee: {
            id: string;
            firstName: string;
            lastName: string;
        };
        replacementEmployee: {
            id: string;
            firstName: string;
            lastName: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        shiftId: string;
        date: Date;
        status: import(".prisma/client").$Enums.ReplacementStatus;
        approvedBy: string | null;
        approvedAt: Date | null;
        reason: string | null;
        originalEmployeeId: string;
        replacementEmployeeId: string;
    }>;
    private parseDate;
    importFromExcel(tenantId: string, fileBuffer: Buffer): Promise<ImportScheduleResultDto>;
}
