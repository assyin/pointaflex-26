import { Cache } from 'cache-manager';
import { PrismaService } from '../../database/prisma.service';
import { DashboardStatsQueryDto } from './dto/dashboard-stats.dto';
import { AttendanceReportDto } from './dto/attendance-report.dto';
import { OvertimeReportDto } from './dto/overtime-report.dto';
import { AbsencesReportDto } from './dto/absences-report.dto';
import { PayrollReportDto } from './dto/payroll-report.dto';
export declare class ReportsService {
    private prisma;
    private cacheManager;
    constructor(prisma: PrismaService, cacheManager: Cache);
    getDashboardStats(tenantId: string | null, query: DashboardStatsQueryDto, userId?: string, userRole?: string): Promise<any>;
    private validateScopeAccess;
    getPersonalDashboardStats(userId: string, tenantId: string | null, query: DashboardStatsQueryDto): Promise<{
        scope: string;
        employees: {
            total: number;
            activeToday: number;
            onLeave: number;
        };
        pendingApprovals: {
            leaves: number;
            overtime: number;
        };
        attendance: {
            total: number;
            anomalies: number;
            anomalyRate: string | number;
        };
        overtime: {
            totalRecords: number;
            totalHours: number | import("@prisma/client/runtime/library").Decimal;
        };
        leaves: {
            totalRequests: number;
            totalDays: number | import("@prisma/client/runtime/library").Decimal;
            current: number;
        };
        period: {
            startDate: string;
            endDate: string;
        };
        personal: {
            workedDays: number;
            totalHours: number;
            lateCount: number;
            overtimeHours: number | import("@prisma/client/runtime/library").Decimal;
            leaveDays: number | import("@prisma/client/runtime/library").Decimal;
        };
        weeklyAttendance: any[];
    }>;
    getTeamDashboardStats(userId: string, tenantId: string | null, query: DashboardStatsQueryDto): Promise<{
        scope: string;
        team: {
            id: string;
            name: string;
        };
        employees: {
            total: number;
            activeToday: number;
            onLeave: number;
        };
        pendingApprovals: {
            leaves: number;
            overtime: number;
        };
        attendance: {
            total: number;
            anomalies: number;
            anomalyRate: string | number;
        };
        overtime: {
            totalRecords: number;
            totalHours: number | import("@prisma/client/runtime/library").Decimal;
        };
        leaves: {
            totalRequests: number;
            totalDays: number;
            current: number;
        };
        period: {
            startDate: string;
            endDate: string;
        };
        attendanceRate: number;
        weeklyAttendance: any[];
    }>;
    getDepartmentDashboardStats(userId: string, tenantId: string, query: DashboardStatsQueryDto): Promise<{
        scope: string;
        department: {
            id: string;
            name: string;
            code: string;
        };
        sites: {
            id: string;
            name: string;
            code: string;
            employeeCount: number;
        }[];
        employees: {
            total: number;
            activeToday: number;
            onLeave: number;
        };
        pendingApprovals: {
            leaves: number;
            overtime: number;
        };
        attendance: {
            total: number;
            anomalies: number;
            anomalyRate: string | number;
        };
        overtime: {
            totalRecords: number;
            totalHours: number | import("@prisma/client/runtime/library").Decimal;
        };
        leaves: {
            totalRequests: number;
            totalDays: number | import("@prisma/client/runtime/library").Decimal;
            current: number;
        };
        period: {
            startDate: string;
            endDate: string;
        };
        attendanceRate: number;
        weeklyAttendance: any[];
    }>;
    getSiteDashboardStats(userId: string, tenantId: string, query: DashboardStatsQueryDto): Promise<{
        scope: string;
        site: {
            id: string;
            name: string;
            code: string;
            city: string;
        };
        departments: {
            id: string;
            name: string;
            code: string;
            employeeCount: number;
        }[];
        employees: {
            total: number;
            activeToday: number;
            onLeave: number;
        };
        pendingApprovals: {
            leaves: number;
            overtime: number;
        };
        attendance: {
            total: number;
            anomalies: number;
            anomalyRate: string | number;
        };
        overtime: {
            totalRecords: number;
            totalHours: number | import("@prisma/client/runtime/library").Decimal;
        };
        leaves: {
            totalRequests: number;
            totalDays: number | import("@prisma/client/runtime/library").Decimal;
            current: number;
        };
        period: {
            startDate: string;
            endDate: string;
        };
        attendanceRate: number;
        weeklyAttendance: any[];
    }>;
    getPlatformDashboardStats(query: DashboardStatsQueryDto): Promise<{
        scope: string;
        tenants: {
            total: number;
            active: number;
        };
        employees: {
            total: number;
            activeToday: number;
            onLeave: number;
        };
        pendingApprovals: {
            leaves: number;
            overtime: number;
        };
        attendance: {
            total: number;
            anomalies: number;
            anomalyRate: string | number;
        };
        overtime: {
            totalRecords: number;
            totalHours: number | import("@prisma/client/runtime/library").Decimal;
        };
        leaves: {
            totalRequests: number;
            totalDays: number | import("@prisma/client/runtime/library").Decimal;
            current: number;
        };
        period: {
            startDate: string;
            endDate: string;
        };
        attendanceRate: number;
    }>;
    getTenantDashboardStats(tenantId: string, query: DashboardStatsQueryDto): Promise<{
        scope: string;
        attendanceRate: number;
        lates: number;
        totalPointages: number;
        overtimeHours: number | import("@prisma/client/runtime/library").Decimal;
        employees: {
            total: number;
            activeToday: number;
            onLeave: number;
        };
        pendingApprovals: {
            leaves: number;
            overtime: number;
        };
        attendance: {
            total: number;
            anomalies: number;
            anomalyRate: string | number;
        };
        overtime: {
            totalRecords: number;
            totalHours: number | import("@prisma/client/runtime/library").Decimal;
        };
        leaves: {
            totalRequests: number;
            totalDays: number | import("@prisma/client/runtime/library").Decimal;
            current: number;
        };
        period: {
            startDate: string;
            endDate: string;
        };
        weeklyAttendance: any[];
        shiftDistribution: {
            name: string;
            value: number;
        }[];
        overtimeTrend: any[];
        anomalies: number;
    }>;
    private getTenantDashboardStatsInternal;
    getAttendanceReport(tenantId: string, dto: AttendanceReportDto): Promise<{
        data: ({
            employee: {
                id: string;
                firstName: string;
                lastName: string;
                matricule: string;
                department: {
                    name: string;
                };
                team: {
                    name: string;
                };
            };
            site: {
                name: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            siteId: string | null;
            latitude: import("@prisma/client/runtime/library").Decimal | null;
            longitude: import("@prisma/client/runtime/library").Decimal | null;
            employeeId: string;
            deviceId: string | null;
            timestamp: Date;
            type: import(".prisma/client").$Enums.AttendanceType;
            method: import(".prisma/client").$Enums.DeviceType;
            hasAnomaly: boolean;
            anomalyType: string | null;
            anomalyNote: string | null;
            isCorrected: boolean;
            correctedBy: string | null;
            correctedAt: Date | null;
            correctionNote: string | null;
            hoursWorked: import("@prisma/client/runtime/library").Decimal | null;
            lateMinutes: number | null;
            earlyLeaveMinutes: number | null;
            overtimeMinutes: number | null;
            needsApproval: boolean;
            approvalStatus: string | null;
            approvedBy: string | null;
            approvedAt: Date | null;
            rawData: import("@prisma/client/runtime/library").JsonValue | null;
            generatedBy: string | null;
            isGenerated: boolean;
            isAmbiguous: boolean;
            ambiguityReason: string | null;
            validationStatus: import(".prisma/client").$Enums.ValidationStatus;
            validatedBy: string | null;
            validatedAt: Date | null;
            escalationLevel: number;
            terminalState: number | null;
            source: string;
            detectionMethod: string | null;
        })[];
        recoveryDays: ({
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
        })[];
        summary: {
            total: number;
            anomalies: number;
            totalWorkedHours: number;
            totalRecoveryHours: number;
            uniqueEmployees: number;
            totalDays: number;
            byDay: {
                date: string;
                total: number;
                anomalies: number;
                employees: number;
            }[];
            period: {
                startDate: string;
                endDate: string;
            };
        };
    }>;
    getEmployeeReport(tenantId: string, employeeId: string, startDate: string, endDate: string): Promise<{
        employee: {
            id: string;
            firstName: string;
            lastName: string;
            matricule: string;
            position: string;
            department: string;
            team: string;
            site: string;
            currentShift: string;
        };
        period: {
            startDate: string;
            endDate: string;
        };
        attendance: {
            total: number;
            byType: {
                type: import(".prisma/client").$Enums.AttendanceType;
                count: number;
            }[];
        };
        overtime: {
            totalRecords: number;
            totalHours: number | import("@prisma/client/runtime/library").Decimal;
        };
        leaves: {
            totalRequests: number;
            totalDays: number | import("@prisma/client/runtime/library").Decimal;
        };
        schedules: {
            total: number;
        };
    }>;
    getTeamReport(tenantId: string, teamId: string, startDate: string, endDate: string): Promise<{
        team: {
            id: string;
            name: string;
            code: string;
            totalEmployees: number;
        };
        period: {
            startDate: string;
            endDate: string;
        };
        attendance: {
            total: number;
        };
        overtime: {
            totalHours: number | import("@prisma/client/runtime/library").Decimal;
        };
        leaves: {
            totalDays: number | import("@prisma/client/runtime/library").Decimal;
        };
        employees: {
            id: string;
            firstName: string;
            lastName: string;
            matricule: string;
            position: string;
        }[];
    }>;
    getOvertimeReport(tenantId: string, dto: OvertimeReportDto): Promise<{
        data: ({
            employee: {
                id: string;
                firstName: string;
                lastName: string;
                matricule: string;
                department: {
                    name: string;
                };
                site: {
                    name: string;
                };
                team: {
                    name: string;
                };
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            isNightShift: boolean;
            employeeId: string;
            date: Date;
            notes: string | null;
            status: import(".prisma/client").$Enums.OvertimeStatus;
            type: import(".prisma/client").$Enums.OvertimeType;
            approvedBy: string | null;
            approvedAt: Date | null;
            hours: import("@prisma/client/runtime/library").Decimal;
            approvedHours: import("@prisma/client/runtime/library").Decimal | null;
            rate: import("@prisma/client/runtime/library").Decimal;
            convertedToRecovery: boolean;
            recoveryId: string | null;
            convertedHoursToRecovery: import("@prisma/client/runtime/library").Decimal;
            convertedToRecoveryDays: boolean;
            convertedHoursToRecoveryDays: import("@prisma/client/runtime/library").Decimal;
            rejectionReason: string | null;
        })[];
        recoveryDays: ({
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
        summary: {
            total: number;
            totalHours: number;
            totalApprovedHours: number;
            totalHoursConvertedToRecovery: number;
            totalHoursPaid: number;
            byStatus: Record<string, number>;
            byType: Record<string, number>;
            period: {
                startDate: string;
                endDate: string;
            };
        };
    }>;
    getAbsencesReport(tenantId: string, dto: AbsencesReportDto): Promise<{
        data: {
            anomalies: {
                type: string;
                employee: {
                    id: string;
                    firstName: string;
                    lastName: string;
                    matricule: string;
                    department: {
                        name: string;
                    };
                    site: {
                        name: string;
                    };
                };
                id: string;
                createdAt: Date;
                updatedAt: Date;
                tenantId: string;
                siteId: string | null;
                latitude: import("@prisma/client/runtime/library").Decimal | null;
                longitude: import("@prisma/client/runtime/library").Decimal | null;
                employeeId: string;
                deviceId: string | null;
                timestamp: Date;
                method: import(".prisma/client").$Enums.DeviceType;
                hasAnomaly: boolean;
                anomalyType: string | null;
                anomalyNote: string | null;
                isCorrected: boolean;
                correctedBy: string | null;
                correctedAt: Date | null;
                correctionNote: string | null;
                hoursWorked: import("@prisma/client/runtime/library").Decimal | null;
                lateMinutes: number | null;
                earlyLeaveMinutes: number | null;
                overtimeMinutes: number | null;
                needsApproval: boolean;
                approvalStatus: string | null;
                approvedBy: string | null;
                approvedAt: Date | null;
                rawData: import("@prisma/client/runtime/library").JsonValue | null;
                generatedBy: string | null;
                isGenerated: boolean;
                isAmbiguous: boolean;
                ambiguityReason: string | null;
                validationStatus: import(".prisma/client").$Enums.ValidationStatus;
                validatedBy: string | null;
                validatedAt: Date | null;
                escalationLevel: number;
                terminalState: number | null;
                source: string;
                detectionMethod: string | null;
            }[];
            absences: any[];
            recoveryDays: {
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
            }[];
        };
        summary: {
            totalAnomalies: number;
            totalAbsences: number;
            totalRecoveryDays: number;
            lateCount: number;
            earlyLeaveCount: number;
            period: {
                startDate: string;
                endDate: string;
            };
        };
    }>;
    getPayrollReport(tenantId: string, dto: PayrollReportDto): Promise<{
        data: {
            employee: {
                id: string;
                matricule: string;
                firstName: string;
                lastName: string;
                fullName: string;
                department: string;
                site: string;
                position: string;
            };
            period: {
                startDate: string;
                endDate: string;
            };
            workedDays: number;
            normalHours: number;
            overtimeHours: number;
            leaveDays: number;
            lateHours: number;
            absenceDays: number;
            recoveryDays: number;
            recoveryHours: number;
            totalHours: number;
        }[];
        summary: {
            totalEmployees: number;
            totalWorkedDays: number;
            totalNormalHours: number;
            totalOvertimeHours: number;
            totalLeaveDays: number;
            totalRecoveryDays: number;
            totalRecoveryHours: number;
            totalHours: number;
            period: {
                startDate: string;
                endDate: string;
            };
        };
    }>;
    getPlanningReport(tenantId: string, dto: any): Promise<{
        data: ({
            id: any;
            date: any;
            employee: {
                id: any;
                name: string;
                employeeNumber: any;
                department: any;
                position: any;
                site: any;
                team: any;
            };
            shift: {
                id: any;
                name: any;
                startTime: any;
                endTime: any;
                color: any;
            };
            customStartTime: any;
            customEndTime: any;
            notes: any;
        } | {
            id: string;
            date: Date;
            employee: {
                id: string;
                name: string;
                employeeNumber: string;
                department: string;
                position: string;
                site: string;
                team: string;
            };
            shift: any;
            isRecoveryDay: boolean;
            recoveryDay: {
                employee: {
                    department: {
                        id: string;
                        createdAt: Date;
                        updatedAt: Date;
                        tenantId: string;
                        code: string | null;
                        name: string;
                        description: string | null;
                        managerId: string | null;
                    };
                    positionRef: {
                        id: string;
                        createdAt: Date;
                        updatedAt: Date;
                        tenantId: string;
                        code: string | null;
                        name: string;
                        description: string | null;
                        category: string | null;
                    };
                    site: {
                        id: string;
                        createdAt: Date;
                        updatedAt: Date;
                        phone: string | null;
                        address: string | null;
                        timezone: string | null;
                        city: string | null;
                        tenantId: string;
                        code: string | null;
                        name: string;
                        departmentId: string | null;
                        managerId: string | null;
                        latitude: import("@prisma/client/runtime/library").Decimal | null;
                        longitude: import("@prisma/client/runtime/library").Decimal | null;
                        workingDays: import("@prisma/client/runtime/library").JsonValue | null;
                    };
                    team: {
                        id: string;
                        createdAt: Date;
                        updatedAt: Date;
                        tenantId: string;
                        code: string;
                        name: string;
                        description: string | null;
                        managerId: string | null;
                        rotationEnabled: boolean;
                        rotationCycleDays: number | null;
                    };
                } & {
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    email: string | null;
                    phone: string | null;
                    address: string | null;
                    tenantId: string;
                    firstName: string;
                    lastName: string;
                    isActive: boolean;
                    userId: string | null;
                    matricule: string;
                    dateOfBirth: Date | null;
                    photo: string | null;
                    civilite: string | null;
                    situationFamiliale: string | null;
                    nombreEnfants: number | null;
                    cnss: string | null;
                    cin: string | null;
                    ville: string | null;
                    rib: string | null;
                    region: string | null;
                    categorie: string | null;
                    position: string;
                    positionId: string | null;
                    hireDate: Date;
                    contractType: string | null;
                    siteId: string | null;
                    departmentId: string | null;
                    teamId: string | null;
                    currentShiftId: string | null;
                    fingerprintData: string | null;
                    faceData: string | null;
                    rfidBadge: string | null;
                    qrCode: string | null;
                    pinCode: string | null;
                    isEligibleForOvertime: boolean;
                    maxOvertimeHoursPerMonth: import("@prisma/client/runtime/library").Decimal | null;
                    maxOvertimeHoursPerWeek: import("@prisma/client/runtime/library").Decimal | null;
                    overtimeEligibilityNotes: string | null;
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
            };
        })[];
        summary: {
            totalSchedules: number;
            uniqueEmployees: number;
            uniqueShifts: number;
            totalRecoveryDays: number;
            period: {
                startDate: any;
                endDate: any;
            };
        };
    }>;
    getReportHistory(tenantId: string, userId?: string): Promise<{
        id: string;
        name: string;
        reportType: string;
        format: string;
        createdAt: Date;
        fileSize: number;
        filters: import("@prisma/client/runtime/library").JsonValue;
        user: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
        };
    }[]>;
    private calculateAbsencesForDay;
}
