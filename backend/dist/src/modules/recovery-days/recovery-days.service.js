"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecoveryDaysService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
const client_1 = require("@prisma/client");
const manager_level_util_1 = require("../../common/utils/manager-level.util");
let RecoveryDaysService = class RecoveryDaysService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getCumulativeBalance(tenantId, employeeId) {
        const employee = await this.prisma.employee.findFirst({
            where: {
                id: employeeId,
                tenantId,
            },
        });
        if (!employee) {
            throw new common_1.NotFoundException('Employee not found');
        }
        const settings = await this.prisma.tenantSettings.findUnique({
            where: { tenantId },
        });
        const dailyWorkingHours = Number(settings?.dailyWorkingHours || 7.33);
        const conversionRate = Number(settings?.recoveryConversionRate || 1.0);
        const allOvertimeRecords = await this.prisma.overtime.findMany({
            where: {
                tenantId,
                employeeId,
                status: client_1.OvertimeStatus.APPROVED,
            },
            select: {
                id: true,
                hours: true,
                approvedHours: true,
                convertedHoursToRecovery: true,
                convertedHoursToRecoveryDays: true,
                date: true,
            },
            orderBy: { date: 'asc' },
        });
        let cumulativeHours = 0;
        const overtimeDetails = [];
        allOvertimeRecords.forEach((record) => {
            const approvedHours = Number(record.approvedHours || record.hours || 0);
            const convertedToRecovery = Number(record.convertedHoursToRecovery || 0);
            const convertedToRecoveryDays = Number(record.convertedHoursToRecoveryDays || 0);
            const availableHours = approvedHours - convertedToRecovery - convertedToRecoveryDays;
            if (availableHours > 0) {
                cumulativeHours += availableHours;
                overtimeDetails.push({
                    id: record.id,
                    date: record.date,
                    approvedHours,
                    convertedToRecovery,
                    convertedToRecoveryDays,
                    availableHours,
                });
            }
        });
        const possibleDays = (cumulativeHours * conversionRate) / dailyWorkingHours;
        return {
            employeeId,
            cumulativeHours: Math.round(cumulativeHours * 100) / 100,
            dailyWorkingHours,
            conversionRate,
            possibleDays: Math.round(possibleDays * 100) / 100,
            overtimeDetails,
        };
    }
    async convertFromOvertime(tenantId, userId, dto) {
        const employee = await this.prisma.employee.findFirst({
            where: {
                id: dto.employeeId,
                tenantId,
            },
        });
        if (!employee) {
            throw new common_1.NotFoundException('Employee not found');
        }
        const balance = await this.getCumulativeBalance(tenantId, dto.employeeId);
        const settings = await this.prisma.tenantSettings.findUnique({
            where: { tenantId },
        });
        const dailyWorkingHours = Number(settings?.dailyWorkingHours || 7.33);
        const conversionRate = Number(settings?.recoveryConversionRate || 1.0);
        const requiredHours = (dto.days * dailyWorkingHours) / conversionRate;
        if (requiredHours > balance.cumulativeHours) {
            throw new common_1.BadRequestException(`Solde insuffisant. Disponible: ${balance.cumulativeHours}h, Requis: ${requiredHours.toFixed(2)}h pour ${dto.days} jours`);
        }
        const startDate = new Date(dto.startDate);
        const endDate = new Date(dto.endDate);
        if (startDate > endDate) {
            throw new common_1.BadRequestException('La date de début doit être antérieure à la date de fin');
        }
        await this.validateNoConflicts(tenantId, dto.employeeId, startDate, endDate);
        const allOvertimeRecords = await this.prisma.overtime.findMany({
            where: {
                tenantId,
                employeeId: dto.employeeId,
                status: client_1.OvertimeStatus.APPROVED,
            },
            orderBy: { date: 'asc' },
        });
        const overtimeRecords = allOvertimeRecords.filter((record) => {
            const approvedHours = Number(record.approvedHours || record.hours || 0);
            const convertedToRecovery = record.convertedToRecovery ? Number(record.convertedHoursToRecovery || 0) : 0;
            const convertedToRecoveryDays = record.convertedToRecoveryDays ? Number(record.convertedHoursToRecoveryDays || 0) : 0;
            const availableHours = approvedHours - convertedToRecovery - convertedToRecoveryDays;
            return availableHours > 0;
        });
        const recoveryDay = await this.prisma.recoveryDay.create({
            data: {
                tenantId,
                employeeId: dto.employeeId,
                startDate,
                endDate,
                days: dto.days,
                sourceHours: requiredHours,
                conversionRate,
                status: client_1.RecoveryDayStatus.PENDING,
                notes: dto.notes,
            },
        });
        let remainingHours = requiredHours;
        const overtimeRecoveryDayLinks = [];
        for (const overtime of overtimeRecords) {
            if (remainingHours <= 0)
                break;
            const approvedHours = Number(overtime.approvedHours || overtime.hours || 0);
            const convertedToRecovery = Number(overtime.convertedHoursToRecovery || 0);
            const convertedToRecoveryDays = Number(overtime.convertedHoursToRecoveryDays || 0);
            const availableHours = approvedHours - convertedToRecovery - convertedToRecoveryDays;
            if (availableHours > 0) {
                const hoursToUse = Math.min(remainingHours, availableHours);
                const link = await this.prisma.overtimeRecoveryDay.create({
                    data: {
                        overtimeId: overtime.id,
                        recoveryDayId: recoveryDay.id,
                        hoursUsed: hoursToUse,
                    },
                });
                overtimeRecoveryDayLinks.push(link);
                const newConvertedHours = convertedToRecoveryDays + hoursToUse;
                const isFullyConverted = newConvertedHours >= approvedHours;
                await this.prisma.overtime.update({
                    where: { id: overtime.id },
                    data: {
                        convertedToRecoveryDays: isFullyConverted,
                        convertedHoursToRecoveryDays: newConvertedHours,
                        status: isFullyConverted ? client_1.OvertimeStatus.RECOVERED : overtime.status,
                    },
                });
                remainingHours -= hoursToUse;
            }
        }
        return {
            ...recoveryDay,
            overtimeSources: overtimeRecoveryDayLinks,
        };
    }
    async validateNoConflicts(tenantId, employeeId, startDate, endDate) {
        const conflictingLeaves = await this.prisma.leave.findMany({
            where: {
                tenantId,
                employeeId,
                status: {
                    in: ['APPROVED', 'HR_APPROVED', 'MANAGER_APPROVED'],
                },
                OR: [
                    {
                        startDate: { lte: endDate },
                        endDate: { gte: startDate },
                    },
                ],
            },
        });
        if (conflictingLeaves.length > 0) {
            const dates = conflictingLeaves
                .map((l) => `${l.startDate.toISOString().split('T')[0]} - ${l.endDate.toISOString().split('T')[0]}`)
                .join(', ');
            throw new common_1.ConflictException(`Conflit avec des congés existants : ${dates}. Veuillez choisir d'autres dates.`);
        }
        const conflictingRecoveryDays = await this.prisma.recoveryDay.findMany({
            where: {
                tenantId,
                employeeId,
                status: {
                    in: [client_1.RecoveryDayStatus.APPROVED, client_1.RecoveryDayStatus.PENDING],
                },
                OR: [
                    {
                        startDate: { lte: endDate },
                        endDate: { gte: startDate },
                    },
                ],
            },
        });
        if (conflictingRecoveryDays.length > 0) {
            const dates = conflictingRecoveryDays
                .map((rd) => `${rd.startDate.toISOString().split('T')[0]} - ${rd.endDate.toISOString().split('T')[0]}`)
                .join(', ');
            throw new common_1.ConflictException(`Conflit avec des récupérations existantes : ${dates}. Veuillez choisir d'autres dates.`);
        }
    }
    async create(tenantId, dto) {
        const employee = await this.prisma.employee.findFirst({
            where: {
                id: dto.employeeId,
                tenantId,
            },
        });
        if (!employee) {
            throw new common_1.NotFoundException('Employee not found');
        }
        const startDate = new Date(dto.startDate);
        const endDate = new Date(dto.endDate);
        if (startDate > endDate) {
            throw new common_1.BadRequestException('La date de début doit être antérieure à la date de fin');
        }
        await this.validateNoConflicts(tenantId, dto.employeeId, startDate, endDate);
        return this.prisma.recoveryDay.create({
            data: {
                tenantId,
                employeeId: dto.employeeId,
                startDate,
                endDate,
                days: dto.days,
                sourceHours: dto.sourceHours || 0,
                conversionRate: dto.conversionRate,
                status: client_1.RecoveryDayStatus.PENDING,
                notes: dto.notes,
            },
            include: {
                employee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        matricule: true,
                    },
                },
            },
        });
    }
    async findAll(tenantId, page = 1, limit = 20, filters, userId, userPermissions) {
        const skip = (page - 1) * limit;
        const where = { tenantId };
        const hasViewAll = userPermissions?.includes('overtime.view_all');
        const hasViewOwn = userPermissions?.includes('overtime.view_own');
        if (userId && !hasViewAll) {
            const managerLevel = await (0, manager_level_util_1.getManagerLevel)(this.prisma, userId, tenantId);
            if (managerLevel.type === 'DEPARTMENT' || managerLevel.type === 'SITE') {
                const managedEmployeeIds = await (0, manager_level_util_1.getManagedEmployeeIds)(this.prisma, managerLevel, tenantId);
                if (managedEmployeeIds.length === 0) {
                    return {
                        data: [],
                        meta: {
                            total: 0,
                            page,
                            limit,
                            totalPages: 0,
                        },
                    };
                }
                where.employeeId = { in: managedEmployeeIds };
            }
            else if (hasViewOwn) {
                const employee = await this.prisma.employee.findFirst({
                    where: { userId, tenantId },
                    select: { id: true },
                });
                if (employee) {
                    where.employeeId = employee.id;
                }
                else {
                    return {
                        data: [],
                        meta: {
                            total: 0,
                            page,
                            limit,
                            totalPages: 0,
                        },
                    };
                }
            }
        }
        if (filters?.employeeId) {
            where.employeeId = filters.employeeId;
        }
        if (filters?.status) {
            where.status = filters.status;
        }
        if (filters?.startDate || filters?.endDate) {
            where.OR = [];
            if (filters.startDate) {
                where.OR.push({
                    endDate: { gte: new Date(filters.startDate) },
                });
            }
            if (filters.endDate) {
                where.OR.push({
                    startDate: { lte: new Date(filters.endDate) },
                });
            }
        }
        const [data, total] = await Promise.all([
            this.prisma.recoveryDay.findMany({
                where,
                skip,
                take: limit,
                include: {
                    employee: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            matricule: true,
                        },
                    },
                    overtimeSources: {
                        include: {
                            overtime: {
                                select: {
                                    id: true,
                                    date: true,
                                    hours: true,
                                    approvedHours: true,
                                },
                            },
                        },
                    },
                },
                orderBy: { startDate: 'desc' },
            }),
            this.prisma.recoveryDay.count({ where }),
        ]);
        return {
            data,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async findOne(tenantId, id) {
        const recoveryDay = await this.prisma.recoveryDay.findFirst({
            where: {
                id,
                tenantId,
            },
            include: {
                employee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        matricule: true,
                        email: true,
                    },
                },
                overtimeSources: {
                    include: {
                        overtime: {
                            select: {
                                id: true,
                                date: true,
                                hours: true,
                                approvedHours: true,
                                type: true,
                            },
                        },
                    },
                },
            },
        });
        if (!recoveryDay) {
            throw new common_1.NotFoundException('Recovery day not found');
        }
        return recoveryDay;
    }
    async update(tenantId, id, dto) {
        const recoveryDay = await this.findOne(tenantId, id);
        if (recoveryDay.status !== client_1.RecoveryDayStatus.PENDING) {
            throw new common_1.BadRequestException('Can only update pending recovery days');
        }
        const updateData = {};
        if (dto.startDate) {
            updateData.startDate = new Date(dto.startDate);
        }
        if (dto.endDate) {
            updateData.endDate = new Date(dto.endDate);
        }
        if (dto.days !== undefined) {
            updateData.days = dto.days;
        }
        if (dto.notes !== undefined) {
            updateData.notes = dto.notes;
        }
        if (updateData.startDate || updateData.endDate) {
            const startDate = updateData.startDate || recoveryDay.startDate;
            const endDate = updateData.endDate || recoveryDay.endDate;
            if (startDate > endDate) {
                throw new common_1.BadRequestException('La date de début doit être antérieure à la date de fin');
            }
            await this.validateNoConflicts(tenantId, recoveryDay.employeeId, startDate, endDate);
        }
        return this.prisma.recoveryDay.update({
            where: { id },
            data: updateData,
            include: {
                employee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        matricule: true,
                    },
                },
            },
        });
    }
    async approve(tenantId, id, userId) {
        const recoveryDay = await this.findOne(tenantId, id);
        if (recoveryDay.status !== client_1.RecoveryDayStatus.PENDING) {
            throw new common_1.BadRequestException('Can only approve pending recovery days');
        }
        return this.prisma.recoveryDay.update({
            where: { id },
            data: {
                status: client_1.RecoveryDayStatus.APPROVED,
                approvedBy: userId,
                approvedAt: new Date(),
            },
            include: {
                employee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        matricule: true,
                    },
                },
            },
        });
    }
    async cancel(tenantId, id) {
        const recoveryDay = await this.findOne(tenantId, id);
        if (recoveryDay.status === client_1.RecoveryDayStatus.USED) {
            throw new common_1.BadRequestException('Cannot cancel used recovery days');
        }
        const overtimeLinks = await this.prisma.overtimeRecoveryDay.findMany({
            where: { recoveryDayId: id },
            include: { overtime: true },
        });
        for (const link of overtimeLinks) {
            const overtime = link.overtime;
            const currentConverted = Number(overtime.convertedHoursToRecoveryDays || 0);
            const hoursToReturn = Number(link.hoursUsed);
            const newConverted = Math.max(0, currentConverted - hoursToReturn);
            const isFullyConverted = newConverted <= 0;
            await this.prisma.overtime.update({
                where: { id: overtime.id },
                data: {
                    convertedToRecoveryDays: !isFullyConverted,
                    convertedHoursToRecoveryDays: newConverted,
                    status: isFullyConverted && overtime.status === client_1.OvertimeStatus.RECOVERED
                        ? client_1.OvertimeStatus.APPROVED
                        : overtime.status,
                },
            });
        }
        await this.prisma.overtimeRecoveryDay.deleteMany({
            where: { recoveryDayId: id },
        });
        return this.prisma.recoveryDay.update({
            where: { id },
            data: {
                status: client_1.RecoveryDayStatus.CANCELLED,
            },
        });
    }
    async getEmployeeRecoveryDays(tenantId, employeeId, startDate, endDate) {
        const where = {
            tenantId,
            employeeId,
        };
        if (startDate || endDate) {
            where.OR = [];
            if (startDate) {
                where.OR.push({
                    endDate: { gte: new Date(startDate) },
                });
            }
            if (endDate) {
                where.OR.push({
                    startDate: { lte: new Date(endDate) },
                });
            }
        }
        return this.prisma.recoveryDay.findMany({
            where,
            include: {
                overtimeSources: {
                    include: {
                        overtime: {
                            select: {
                                id: true,
                                date: true,
                                hours: true,
                                approvedHours: true,
                            },
                        },
                    },
                },
            },
            orderBy: { startDate: 'desc' },
        });
    }
    async getEmployeeBalance(tenantId, employeeId) {
        const recoveryDays = await this.getEmployeeRecoveryDays(tenantId, employeeId);
        const totalDays = recoveryDays.reduce((sum, rd) => sum + Number(rd.days), 0);
        const approvedDays = recoveryDays
            .filter((rd) => rd.status === client_1.RecoveryDayStatus.APPROVED)
            .reduce((sum, rd) => sum + Number(rd.days), 0);
        const usedDays = recoveryDays
            .filter((rd) => rd.status === client_1.RecoveryDayStatus.USED)
            .reduce((sum, rd) => sum + Number(rd.days), 0);
        const pendingDays = recoveryDays
            .filter((rd) => rd.status === client_1.RecoveryDayStatus.PENDING)
            .reduce((sum, rd) => sum + Number(rd.days), 0);
        return {
            employeeId,
            totalDays,
            approvedDays,
            usedDays,
            pendingDays,
            availableDays: approvedDays - usedDays,
            recoveryDays,
        };
    }
};
exports.RecoveryDaysService = RecoveryDaysService;
exports.RecoveryDaysService = RecoveryDaysService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], RecoveryDaysService);
//# sourceMappingURL=recovery-days.service.js.map