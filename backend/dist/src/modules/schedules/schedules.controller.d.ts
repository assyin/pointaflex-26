import { HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { SchedulesService } from './schedules.service';
import { AlertsService } from './alerts.service';
import { CreateScheduleDto, BulkScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { CreateReplacementDto } from './dto/create-replacement.dto';
import { GenerateRotationPlanningDto, PreviewRotationPlanningDto } from './dto/rotation-planning.dto';
export declare class SchedulesController {
    private schedulesService;
    private alertsService;
    constructor(schedulesService: SchedulesService, alertsService: AlertsService);
    create(user: any, dto: CreateScheduleDto): Promise<{
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
    createBulk(user: any, dto: BulkScheduleDto): Promise<{
        count: number;
        total: number;
        skipped: number;
        message: string;
    }>;
    findAll(user: any, page?: string, limit?: string, employeeId?: string, teamId?: string, shiftId?: string, siteId?: string, startDate?: string, endDate?: string): Promise<{
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
    getWeek(user: any, date: string, teamId?: string, siteId?: string): Promise<{
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
    getMonth(user: any, date: string, teamId?: string, siteId?: string): Promise<{
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
    getAlerts(user: any, startDate: string, endDate: string): Promise<import("./alerts.service").LegalAlert[]>;
    createReplacement(user: any, dto: CreateReplacementDto): Promise<{
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
    findAllReplacements(user: any, status?: string, startDate?: string, endDate?: string): Promise<({
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
    approveReplacement(user: any, id: string): Promise<{
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
    rejectReplacement(user: any, id: string): Promise<{
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
    findOne(user: any, id: string): Promise<{
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
    update(user: any, id: string, dto: UpdateScheduleDto): Promise<{
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
    removeBulk(user: any, body: {
        ids: string[];
    }): Promise<{
        count: number;
        deleted: number;
    }>;
    remove(user: any, id: string): Promise<{
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
    importExcel(user: any, file: Express.Multer.File): Promise<{
        statusCode: HttpStatus;
        message: string;
        data?: undefined;
    } | {
        statusCode: HttpStatus;
        message: string;
        data: import("./dto/import-schedule.dto").ImportScheduleResultDto;
    }>;
    downloadTemplate(res: Response): Promise<void>;
    importWeeklyCalendar(user: any, file: Express.Multer.File): Promise<{
        statusCode: HttpStatus;
        message: string;
        data?: undefined;
    } | {
        statusCode: HttpStatus;
        message: string;
        data: import("./dto/import-schedule.dto").ImportScheduleResultDto;
    }>;
    downloadWeeklyCalendarTemplate(user: any, res: Response): Promise<void>;
    previewRotationPlanning(user: any, dto: PreviewRotationPlanningDto): Promise<{
        preview: {
            employeeId: string;
            matricule: string;
            employeeName: string;
            startDate: string;
            schedule: {
                date: string;
                dayOfWeek: string;
                isWorkDay: boolean;
            }[];
            totalWorkDays: number;
            totalRestDays: number;
        }[];
        totalSchedulesToCreate: number;
    }>;
    generateRotationPlanning(user: any, dto: GenerateRotationPlanningDto): Promise<{
        statusCode: HttpStatus;
        message: string;
        data: {
            success: number;
            skipped: number;
            failed: number;
            details: {
                employeeId: string;
                matricule: string;
                employeeName: string;
                created: number;
                skipped: number;
                errors: string[];
            }[];
        };
    }>;
}
