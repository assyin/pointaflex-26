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
exports.LeavesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
const client_1 = require("@prisma/client");
const manager_level_util_1 = require("../../common/utils/manager-level.util");
const file_storage_service_1 = require("./services/file-storage.service");
let LeavesService = class LeavesService {
    constructor(prisma, fileStorageService) {
        this.prisma = prisma;
        this.fileStorageService = fileStorageService;
    }
    async calculateWorkingDays(tenantId, startDate, endDate) {
        const tenantSettings = await this.prisma.tenantSettings.findUnique({
            where: { tenantId },
            select: { workingDays: true, leaveIncludeSaturday: true },
        });
        let workingDaysConfig = tenantSettings?.workingDays || [1, 2, 3, 4, 5];
        const leaveIncludeSaturday = tenantSettings?.leaveIncludeSaturday ?? false;
        if (leaveIncludeSaturday && !workingDaysConfig.includes(6)) {
            workingDaysConfig = [...workingDaysConfig, 6];
        }
        const holidays = await this.prisma.holiday.findMany({
            where: {
                tenantId,
                date: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            select: { date: true, name: true },
        });
        const holidayDates = new Map(holidays.map((h) => [h.date.toISOString().split('T')[0], h.name]));
        let workingDays = 0;
        let excludedWeekends = 0;
        let excludedHolidays = 0;
        const details = [];
        const currentDate = new Date(startDate);
        currentDate.setUTCHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setUTCHours(23, 59, 59, 999);
        while (currentDate <= end) {
            const dateStr = currentDate.toISOString().split('T')[0];
            const dayOfWeek = currentDate.getUTCDay() === 0 ? 7 : currentDate.getUTCDay();
            const isWorkingDay = workingDaysConfig.includes(dayOfWeek);
            const holidayName = holidayDates.get(dateStr);
            if (!isWorkingDay) {
                excludedWeekends++;
                details.push({
                    date: dateStr,
                    isWorking: false,
                    reason: dayOfWeek === 7 ? 'Dimanche' : 'Samedi'
                });
            }
            else if (holidayName) {
                excludedHolidays++;
                details.push({
                    date: dateStr,
                    isWorking: false,
                    reason: `Jour férié: ${holidayName}`
                });
            }
            else {
                workingDays++;
                details.push({ date: dateStr, isWorking: true });
            }
            currentDate.setUTCDate(currentDate.getUTCDate() + 1);
        }
        const totalCalendarDays = details.length;
        return {
            workingDays,
            excludedWeekends,
            excludedHolidays,
            totalCalendarDays,
            includeSaturday: leaveIncludeSaturday,
            details,
        };
    }
    async suspendSchedulesForLeave(tenantId, employeeId, leaveId, startDate, endDate) {
        console.log(`[suspendSchedulesForLeave] Suspension des plannings pour le congé ${leaveId}`);
        console.log(`[suspendSchedulesForLeave] Période: ${startDate.toISOString()} - ${endDate.toISOString()}`);
        const affectedSchedules = await this.prisma.schedule.findMany({
            where: {
                tenantId,
                employeeId,
                date: {
                    gte: startDate,
                    lte: endDate,
                },
                status: 'PUBLISHED',
            },
            select: {
                id: true,
                date: true,
            },
        });
        if (affectedSchedules.length === 0) {
            console.log(`[suspendSchedulesForLeave] Aucun planning à suspendre`);
            return 0;
        }
        console.log(`[suspendSchedulesForLeave] ${affectedSchedules.length} planning(s) trouvé(s) à suspendre`);
        const result = await this.prisma.schedule.updateMany({
            where: {
                id: {
                    in: affectedSchedules.map((s) => s.id),
                },
            },
            data: {
                status: 'SUSPENDED_BY_LEAVE',
                suspendedByLeaveId: leaveId,
                suspendedAt: new Date(),
            },
        });
        console.log(`[suspendSchedulesForLeave] ${result.count} planning(s) suspendu(s)`);
        return result.count;
    }
    async reactivateSchedulesForLeave(tenantId, leaveId) {
        console.log(`[reactivateSchedulesForLeave] Réactivation des plannings pour le congé ${leaveId}`);
        const suspendedSchedules = await this.prisma.schedule.findMany({
            where: {
                tenantId,
                suspendedByLeaveId: leaveId,
                status: 'SUSPENDED_BY_LEAVE',
            },
            select: {
                id: true,
                date: true,
            },
        });
        if (suspendedSchedules.length === 0) {
            console.log(`[reactivateSchedulesForLeave] Aucun planning à réactiver`);
            return 0;
        }
        console.log(`[reactivateSchedulesForLeave] ${suspendedSchedules.length} planning(s) à réactiver`);
        const result = await this.prisma.schedule.updateMany({
            where: {
                id: {
                    in: suspendedSchedules.map((s) => s.id),
                },
            },
            data: {
                status: 'PUBLISHED',
                suspendedByLeaveId: null,
                suspendedAt: null,
            },
        });
        console.log(`[reactivateSchedulesForLeave] ${result.count} planning(s) réactivé(s)`);
        return result.count;
    }
    async adjustScheduleSuspensionsForLeaveUpdate(tenantId, employeeId, leaveId, oldStartDate, oldEndDate, newStartDate, newEndDate) {
        console.log(`[adjustScheduleSuspensionsForLeaveUpdate] Ajustement pour le congé ${leaveId}`);
        console.log(`[adjustScheduleSuspensionsForLeaveUpdate] Anciennes dates: ${oldStartDate.toISOString()} - ${oldEndDate.toISOString()}`);
        console.log(`[adjustScheduleSuspensionsForLeaveUpdate] Nouvelles dates: ${newStartDate.toISOString()} - ${newEndDate.toISOString()}`);
        await this.reactivateSchedulesForLeave(tenantId, leaveId);
        await this.suspendSchedulesForLeave(tenantId, employeeId, leaveId, newStartDate, newEndDate);
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
        const leaveType = await this.prisma.leaveType.findFirst({
            where: {
                id: dto.leaveTypeId,
                tenantId,
            },
        });
        if (!leaveType) {
            throw new common_1.NotFoundException('Leave type not found');
        }
        const startDate = new Date(dto.startDate);
        const endDate = new Date(dto.endDate);
        if (endDate < startDate) {
            throw new common_1.BadRequestException('End date must be after start date');
        }
        const daysCalculation = await this.calculateWorkingDays(tenantId, startDate, endDate);
        let days = dto.days;
        if (!days) {
            days = daysCalculation.workingDays;
        }
        console.log(`[Leave] Calcul des jours pour ${dto.employeeId}:`, {
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
            totalCalendarDays: daysCalculation.totalCalendarDays,
            workingDays: daysCalculation.workingDays,
            excludedWeekends: daysCalculation.excludedWeekends,
            excludedHolidays: daysCalculation.excludedHolidays,
            includeSaturday: daysCalculation.includeSaturday,
        });
        const overlapping = await this.prisma.leave.findFirst({
            where: {
                employeeId: dto.employeeId,
                status: {
                    notIn: [client_1.LeaveStatus.REJECTED, client_1.LeaveStatus.CANCELLED],
                },
                OR: [
                    {
                        startDate: { lte: endDate },
                        endDate: { gte: startDate },
                    },
                ],
            },
        });
        if (overlapping) {
            throw new common_1.BadRequestException(`Une demande de congé existe déjà pour cette période (${overlapping.startDate.toISOString().split('T')[0]} - ${overlapping.endDate.toISOString().split('T')[0]})`);
        }
        const conflictingRecoveryDays = await this.prisma.recoveryDay.findMany({
            where: {
                tenantId,
                employeeId: dto.employeeId,
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
            throw new common_1.BadRequestException(`Conflit avec des journées de récupération existantes : ${dates}. Veuillez choisir d'autres dates ou annuler les récupérations concernées.`);
        }
        return this.prisma.leave.create({
            data: {
                tenantId,
                employeeId: dto.employeeId,
                leaveTypeId: dto.leaveTypeId,
                startDate,
                endDate,
                days,
                reason: dto.reason,
                document: dto.document,
                status: client_1.LeaveStatus.PENDING,
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
                leaveType: true,
            },
        });
    }
    async findAll(tenantId, page = 1, limit = 20, filters, userId, userPermissions) {
        const skip = (page - 1) * limit;
        const where = { tenantId };
        const hasViewAll = userPermissions?.includes('leave.view_all');
        const hasViewOwn = userPermissions?.includes('leave.view_own');
        const hasViewTeam = userPermissions?.includes('leave.view_team');
        const hasViewDepartment = userPermissions?.includes('leave.view_department');
        const hasViewSite = userPermissions?.includes('leave.view_site');
        if (userId && !hasViewAll) {
            const managerLevel = await (0, manager_level_util_1.getManagerLevel)(this.prisma, userId, tenantId);
            if (managerLevel.type === 'DEPARTMENT') {
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
            else if (managerLevel.type === 'SITE') {
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
            else if (managerLevel.type === 'TEAM') {
                const employee = await this.prisma.employee.findFirst({
                    where: { userId, tenantId },
                    select: { teamId: true },
                });
                if (employee?.teamId) {
                    const teamMembers = await this.prisma.employee.findMany({
                        where: { teamId: employee.teamId, tenantId },
                        select: { id: true },
                    });
                    where.employeeId = {
                        in: teamMembers.map(m => m.id),
                    };
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
            else if (!hasViewAll && hasViewOwn) {
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
        if (filters?.leaveTypeId) {
            where.leaveTypeId = filters.leaveTypeId;
        }
        if (filters?.status) {
            where.status = filters.status;
        }
        if (filters?.startDate || filters?.endDate) {
            where.startDate = {};
            if (filters.startDate) {
                where.startDate.gte = new Date(filters.startDate);
            }
            if (filters.endDate) {
                where.startDate.lte = new Date(filters.endDate);
            }
        }
        const [data, total] = await Promise.all([
            this.prisma.leave.findMany({
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
                            siteId: true,
                            departmentId: true,
                            site: {
                                select: {
                                    id: true,
                                    name: true,
                                    code: true,
                                },
                            },
                            department: {
                                select: {
                                    id: true,
                                    name: true,
                                    code: true,
                                },
                            },
                        },
                    },
                    leaveType: true,
                },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.leave.count({ where }),
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
        const leave = await this.prisma.leave.findFirst({
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
                        position: true,
                        email: true,
                    },
                },
                leaveType: true,
            },
        });
        if (!leave) {
            throw new common_1.NotFoundException('Leave not found');
        }
        return leave;
    }
    async update(tenantId, id, dto) {
        const leave = await this.findOne(tenantId, id);
        const allowedStatuses = [client_1.LeaveStatus.PENDING, client_1.LeaveStatus.APPROVED, client_1.LeaveStatus.MANAGER_APPROVED];
        if (!allowedStatuses.includes(leave.status)) {
            throw new common_1.BadRequestException('Cannot update leave that is rejected or cancelled');
        }
        if (dto.leaveTypeId) {
            const leaveType = await this.prisma.leaveType.findFirst({
                where: {
                    id: dto.leaveTypeId,
                    tenantId,
                },
            });
            if (!leaveType) {
                throw new common_1.NotFoundException('Leave type not found');
            }
        }
        const oldStartDate = leave.startDate;
        const oldEndDate = leave.endDate;
        let datesChanged = false;
        if (dto.startDate || dto.endDate) {
            const startDate = dto.startDate ? new Date(dto.startDate) : leave.startDate;
            const endDate = dto.endDate ? new Date(dto.endDate) : leave.endDate;
            if (endDate < startDate) {
                throw new common_1.BadRequestException('End date must be after start date');
            }
            datesChanged =
                (dto.startDate && new Date(dto.startDate).getTime() !== oldStartDate.getTime()) ||
                    (dto.endDate && new Date(dto.endDate).getTime() !== oldEndDate.getTime());
            if (datesChanged) {
                const overlapping = await this.prisma.leave.findFirst({
                    where: {
                        employeeId: leave.employeeId,
                        id: { not: id },
                        status: {
                            notIn: [client_1.LeaveStatus.REJECTED, client_1.LeaveStatus.CANCELLED],
                        },
                        OR: [
                            {
                                startDate: { lte: endDate },
                                endDate: { gte: startDate },
                            },
                        ],
                    },
                });
                if (overlapping) {
                    throw new common_1.BadRequestException(`Les nouvelles dates chevauchent un congé existant (${overlapping.startDate.toISOString().split('T')[0]} - ${overlapping.endDate.toISOString().split('T')[0]})`);
                }
                const conflictingRecoveryDays = await this.prisma.recoveryDay.findMany({
                    where: {
                        tenantId,
                        employeeId: leave.employeeId,
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
                    throw new common_1.BadRequestException(`Conflit avec des journées de récupération existantes : ${dates}`);
                }
            }
        }
        const updatedLeave = await this.prisma.leave.update({
            where: { id },
            data: {
                ...(dto.leaveTypeId && { leaveTypeId: dto.leaveTypeId }),
                ...(dto.startDate && { startDate: new Date(dto.startDate) }),
                ...(dto.endDate && { endDate: new Date(dto.endDate) }),
                ...(dto.days !== undefined && { days: dto.days }),
                ...(dto.reason !== undefined && { reason: dto.reason }),
                ...(dto.document !== undefined && { document: dto.document }),
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
                leaveType: true,
            },
        });
        if (leave.status === client_1.LeaveStatus.APPROVED && datesChanged) {
            console.log(`[update] Dates modifiées pour un congé approuvé → Ajustement des suspensions`);
            await this.adjustScheduleSuspensionsForLeaveUpdate(tenantId, updatedLeave.employeeId, updatedLeave.id, oldStartDate, oldEndDate, updatedLeave.startDate, updatedLeave.endDate);
        }
        return updatedLeave;
    }
    async approve(tenantId, id, userId, userRole, dto) {
        const leave = await this.findOne(tenantId, id);
        const tenantSettings = await this.prisma.tenantSettings.findUnique({
            where: { tenantId },
            select: { twoLevelWorkflow: true, leaveApprovalLevels: true },
        });
        const twoLevelWorkflow = tenantSettings?.twoLevelWorkflow ?? true;
        const leaveApprovalLevels = tenantSettings?.leaveApprovalLevels ?? 2;
        console.log(`[approve] Workflow config: twoLevelWorkflow=${twoLevelWorkflow}, leaveApprovalLevels=${leaveApprovalLevels}`);
        const allowedStatuses = [client_1.LeaveStatus.PENDING, client_1.LeaveStatus.MANAGER_APPROVED];
        if (!allowedStatuses.includes(leave.status)) {
            throw new common_1.BadRequestException('Le congé ne peut pas être approuvé à ce stade');
        }
        const updateData = {};
        if (userRole === client_1.LegacyRole.SUPER_ADMIN) {
            if (dto.status === client_1.LeaveStatus.MANAGER_APPROVED) {
                if (!twoLevelWorkflow || leaveApprovalLevels === 1) {
                    updateData.status = client_1.LeaveStatus.APPROVED;
                    updateData.managerApprovedBy = userId;
                    updateData.managerApprovedAt = new Date();
                    updateData.managerComment = dto.comment;
                }
                else {
                    updateData.status = client_1.LeaveStatus.MANAGER_APPROVED;
                    updateData.managerApprovedBy = userId;
                    updateData.managerApprovedAt = new Date();
                    updateData.managerComment = dto.comment;
                }
            }
            else if (dto.status === client_1.LeaveStatus.APPROVED || dto.status === client_1.LeaveStatus.HR_APPROVED) {
                updateData.status = client_1.LeaveStatus.APPROVED;
                updateData.hrApprovedBy = userId;
                updateData.hrApprovedAt = new Date();
                updateData.hrComment = dto.comment;
            }
            else if (dto.status === client_1.LeaveStatus.REJECTED) {
                updateData.status = client_1.LeaveStatus.REJECTED;
                updateData.hrComment = dto.comment;
            }
        }
        else if (userRole === client_1.LegacyRole.MANAGER) {
            if (dto.status === client_1.LeaveStatus.MANAGER_APPROVED || dto.status === client_1.LeaveStatus.APPROVED) {
                if (!twoLevelWorkflow || leaveApprovalLevels === 1) {
                    updateData.status = client_1.LeaveStatus.APPROVED;
                    updateData.managerApprovedBy = userId;
                    updateData.managerApprovedAt = new Date();
                    updateData.managerComment = dto.comment;
                    console.log(`[approve] Workflow 1 niveau: Manager finalise l'approbation`);
                }
                else {
                    updateData.status = client_1.LeaveStatus.MANAGER_APPROVED;
                    updateData.managerApprovedBy = userId;
                    updateData.managerApprovedAt = new Date();
                    updateData.managerComment = dto.comment;
                    console.log(`[approve] Workflow ${leaveApprovalLevels} niveaux: En attente validation RH`);
                }
            }
            else if (dto.status === client_1.LeaveStatus.REJECTED) {
                updateData.status = client_1.LeaveStatus.REJECTED;
                updateData.managerComment = dto.comment;
            }
        }
        else if (userRole === client_1.LegacyRole.ADMIN_RH) {
            if (!twoLevelWorkflow || leaveApprovalLevels === 1) {
                if (dto.status === client_1.LeaveStatus.APPROVED || dto.status === client_1.LeaveStatus.HR_APPROVED) {
                    updateData.status = client_1.LeaveStatus.APPROVED;
                    updateData.hrApprovedBy = userId;
                    updateData.hrApprovedAt = new Date();
                    updateData.hrComment = dto.comment;
                }
                else if (dto.status === client_1.LeaveStatus.REJECTED) {
                    updateData.status = client_1.LeaveStatus.REJECTED;
                    updateData.hrComment = dto.comment;
                }
            }
            else {
                if (leave.status !== client_1.LeaveStatus.MANAGER_APPROVED) {
                    throw new common_1.ForbiddenException('Vous ne pouvez pas approuver ou rejeter ce congé. Le manager doit d\'abord approuver la demande.');
                }
                if (dto.status === client_1.LeaveStatus.APPROVED || dto.status === client_1.LeaveStatus.HR_APPROVED) {
                    updateData.status = client_1.LeaveStatus.APPROVED;
                    updateData.hrApprovedBy = userId;
                    updateData.hrApprovedAt = new Date();
                    updateData.hrComment = dto.comment;
                }
                else if (dto.status === client_1.LeaveStatus.REJECTED) {
                    updateData.status = client_1.LeaveStatus.REJECTED;
                    updateData.hrComment = dto.comment;
                }
            }
        }
        if (Object.keys(updateData).length === 0) {
            throw new common_1.BadRequestException('Invalid status transition');
        }
        const updatedLeave = await this.prisma.leave.update({
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
                leaveType: true,
            },
        });
        if (updateData.status === client_1.LeaveStatus.APPROVED) {
            console.log(`[approve] Congé approuvé → Suspension des plannings`);
            await this.suspendSchedulesForLeave(tenantId, updatedLeave.employeeId, updatedLeave.id, updatedLeave.startDate, updatedLeave.endDate);
        }
        return updatedLeave;
    }
    async cancel(tenantId, id, userId) {
        const leave = await this.findOne(tenantId, id);
        const rejectedStatuses = [client_1.LeaveStatus.REJECTED, client_1.LeaveStatus.CANCELLED];
        if (rejectedStatuses.includes(leave.status)) {
            throw new common_1.BadRequestException('Leave is already rejected or cancelled');
        }
        const cancelledLeave = await this.prisma.leave.update({
            where: { id },
            data: {
                status: client_1.LeaveStatus.CANCELLED,
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
                leaveType: true,
            },
        });
        if (leave.status === client_1.LeaveStatus.APPROVED) {
            console.log(`[cancel] Congé annulé → Réactivation des plannings`);
            await this.reactivateSchedulesForLeave(tenantId, id);
        }
        return cancelledLeave;
    }
    async remove(tenantId, id) {
        const leave = await this.findOne(tenantId, id);
        if (leave.status === client_1.LeaveStatus.APPROVED) {
            console.log(`[remove] Congé supprimé → Réactivation des plannings`);
            await this.reactivateSchedulesForLeave(tenantId, id);
        }
        return this.prisma.leave.delete({
            where: { id },
        });
    }
    async getWorkflowConfig(tenantId) {
        const tenantSettings = await this.prisma.tenantSettings.findUnique({
            where: { tenantId },
            select: {
                twoLevelWorkflow: true,
                leaveApprovalLevels: true,
                annualLeaveDays: true,
                anticipatedLeave: true,
                leaveIncludeSaturday: true,
            },
        });
        return {
            twoLevelWorkflow: tenantSettings?.twoLevelWorkflow ?? true,
            leaveApprovalLevels: tenantSettings?.leaveApprovalLevels ?? 2,
            annualLeaveDays: tenantSettings?.annualLeaveDays ?? 18,
            anticipatedLeave: tenantSettings?.anticipatedLeave ?? false,
            leaveIncludeSaturday: tenantSettings?.leaveIncludeSaturday ?? false,
        };
    }
    async getLeaveTypes(tenantId) {
        return this.prisma.leaveType.findMany({
            where: { tenantId },
            orderBy: { name: 'asc' },
        });
    }
    async createLeaveType(tenantId, data) {
        return this.prisma.leaveType.create({
            data: {
                ...data,
                tenantId,
            },
        });
    }
    async updateLeaveType(tenantId, id, data) {
        const leaveType = await this.prisma.leaveType.findFirst({
            where: { id, tenantId },
        });
        if (!leaveType) {
            throw new common_1.NotFoundException('Leave type not found');
        }
        return this.prisma.leaveType.update({
            where: { id },
            data,
        });
    }
    async deleteLeaveType(tenantId, id) {
        const leaveType = await this.prisma.leaveType.findFirst({
            where: { id, tenantId },
        });
        if (!leaveType) {
            throw new common_1.NotFoundException('Leave type not found');
        }
        const leavesCount = await this.prisma.leave.count({
            where: { leaveTypeId: id },
        });
        if (leavesCount > 0) {
            throw new common_1.BadRequestException(`Cannot delete leave type. ${leavesCount} leave request(s) are using this type.`);
        }
        return this.prisma.leaveType.delete({
            where: { id },
        });
    }
    async uploadDocument(tenantId, leaveId, file, userId) {
        const leave = await this.prisma.leave.findFirst({
            where: {
                id: leaveId,
                tenantId,
            },
            include: {
                employee: true,
            },
        });
        if (!leave) {
            throw new common_1.NotFoundException('Leave not found');
        }
        const employee = await this.prisma.employee.findFirst({
            where: {
                userId,
                tenantId,
            },
        });
        if (employee && employee.id === leave.employeeId) {
            if (leave.status !== client_1.LeaveStatus.PENDING) {
                throw new common_1.ForbiddenException('You can only upload documents for pending leave requests');
            }
        }
        if (leave.document) {
            await this.fileStorageService.deleteFile(leave.document);
        }
        const { filePath, fileName } = await this.fileStorageService.saveFile(tenantId, leaveId, file);
        const now = new Date();
        const isUpdate = !!leave.document;
        return this.prisma.leave.update({
            where: { id: leaveId },
            data: {
                document: filePath,
                documentName: fileName,
                documentSize: file.size,
                documentMimeType: file.mimetype,
                documentUploadedBy: isUpdate ? leave.documentUploadedBy : userId,
                documentUploadedAt: isUpdate ? leave.documentUploadedAt : now,
                documentUpdatedBy: userId,
                documentUpdatedAt: now,
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
                leaveType: true,
            },
        });
    }
    async downloadDocument(tenantId, leaveId, userId, userPermissions) {
        const leave = await this.prisma.leave.findFirst({
            where: {
                id: leaveId,
                tenantId,
            },
            include: {
                employee: true,
            },
        });
        if (!leave) {
            throw new common_1.NotFoundException('Leave not found');
        }
        if (!leave.document) {
            throw new common_1.NotFoundException('No document attached to this leave request');
        }
        const hasViewAll = userPermissions.includes('leave.view_all');
        const hasViewOwn = userPermissions.includes('leave.view_own');
        const hasViewTeam = userPermissions.includes('leave.view_team');
        if (!hasViewAll) {
            const employee = await this.prisma.employee.findFirst({
                where: {
                    userId,
                    tenantId,
                },
            });
            if (employee) {
                if (employee.id === leave.employeeId && !hasViewOwn) {
                    throw new common_1.ForbiddenException('You do not have permission to view this document');
                }
                if (hasViewTeam) {
                    const managerLevel = await (0, manager_level_util_1.getManagerLevel)(this.prisma, userId, tenantId);
                    if (managerLevel.type !== null) {
                        const managedEmployeeIds = await (0, manager_level_util_1.getManagedEmployeeIds)(this.prisma, managerLevel, tenantId);
                        if (!managedEmployeeIds.includes(leave.employeeId)) {
                            throw new common_1.ForbiddenException('You do not have permission to view this document');
                        }
                    }
                    else {
                        throw new common_1.ForbiddenException('You do not have permission to view this document');
                    }
                }
                else if (employee.id !== leave.employeeId) {
                    throw new common_1.ForbiddenException('You do not have permission to view this document');
                }
            }
            else {
                throw new common_1.ForbiddenException('You do not have permission to view this document');
            }
        }
        const fileData = await this.fileStorageService.getFile(leave.document);
        return {
            buffer: fileData.buffer,
            fileName: leave.documentName || fileData.fileName,
            mimeType: leave.documentMimeType || fileData.mimeType,
        };
    }
    async deleteDocument(tenantId, leaveId, userId) {
        const leave = await this.prisma.leave.findFirst({
            where: {
                id: leaveId,
                tenantId,
            },
            include: {
                employee: true,
            },
        });
        if (!leave) {
            throw new common_1.NotFoundException('Leave not found');
        }
        if (!leave.document) {
            throw new common_1.NotFoundException('No document attached to this leave request');
        }
        const employee = await this.prisma.employee.findFirst({
            where: {
                userId,
                tenantId,
            },
        });
        if (employee && employee.id === leave.employeeId) {
            if (leave.status !== client_1.LeaveStatus.PENDING) {
                throw new common_1.ForbiddenException('You can only delete documents for pending leave requests');
            }
        }
        await this.fileStorageService.deleteFile(leave.document);
        return this.prisma.leave.update({
            where: { id: leaveId },
            data: {
                document: null,
                documentName: null,
                documentSize: null,
                documentMimeType: null,
                documentUpdatedBy: userId,
                documentUpdatedAt: new Date(),
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
                leaveType: true,
            },
        });
    }
};
exports.LeavesService = LeavesService;
exports.LeavesService = LeavesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        file_storage_service_1.FileStorageService])
], LeavesService);
//# sourceMappingURL=leaves.service.js.map