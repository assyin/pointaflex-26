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
exports.OvertimeService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
const client_1 = require("@prisma/client");
const manager_level_util_1 = require("../../common/utils/manager-level.util");
let OvertimeService = class OvertimeService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    roundOvertimeHours(hours, roundingMinutes) {
        if (roundingMinutes <= 0)
            return hours;
        const totalMinutes = hours * 60;
        const roundedMinutes = Math.round(totalMinutes / roundingMinutes) * roundingMinutes;
        return roundedMinutes / 60;
    }
    getOvertimeRate(settings, overtimeType) {
        const majorationEnabled = settings?.overtimeMajorationEnabled !== false;
        if (!majorationEnabled) {
            return 1.0;
        }
        switch (overtimeType) {
            case 'NIGHT':
                return Number(settings?.overtimeRateNight ??
                    settings?.nightShiftRate ??
                    1.50);
            case 'HOLIDAY':
                return Number(settings?.overtimeRateHoliday ??
                    settings?.holidayOvertimeRate ??
                    2.00);
            case 'EMERGENCY':
                return Number(settings?.overtimeRateEmergency ?? 1.30);
            case 'STANDARD':
            default:
                return Number(settings?.overtimeRateStandard ??
                    settings?.overtimeRate ??
                    1.25);
        }
    }
    async checkOvertimeLimits(tenantId, employeeId, newHours, date) {
        const employee = await this.prisma.employee.findUnique({
            where: { id: employeeId },
            select: {
                maxOvertimeHoursPerMonth: true,
                maxOvertimeHoursPerWeek: true,
            },
        });
        if (!employee) {
            throw new common_1.NotFoundException('Employee not found');
        }
        const result = {
            exceedsLimit: false,
        };
        if (employee.maxOvertimeHoursPerMonth) {
            const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
            const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
            const monthlyOvertime = await this.prisma.overtime.aggregate({
                where: {
                    tenantId,
                    employeeId,
                    date: {
                        gte: monthStart,
                        lte: monthEnd,
                    },
                    status: {
                        in: ['APPROVED', 'PAID', 'RECOVERED'],
                    },
                },
                _sum: {
                    approvedHours: true,
                    hours: true,
                },
            });
            const monthlyUsed = monthlyOvertime._sum.approvedHours?.toNumber() ||
                monthlyOvertime._sum.hours?.toNumber() ||
                0;
            const monthlyLimit = employee.maxOvertimeHoursPerMonth.toNumber();
            result.monthlyUsed = monthlyUsed;
            result.monthlyLimit = monthlyLimit;
            if (monthlyUsed + newHours > monthlyLimit) {
                const remaining = monthlyLimit - monthlyUsed;
                if (remaining <= 0) {
                    result.exceedsLimit = true;
                    result.message = `Plafond mensuel atteint (${monthlyUsed.toFixed(2)}h / ${monthlyLimit.toFixed(2)}h)`;
                }
                else {
                    result.adjustedHours = remaining;
                    result.message = `Plafond mensuel partiellement atteint. ${remaining.toFixed(2)}h acceptées, ${(newHours - remaining).toFixed(2)}h rejetées`;
                }
            }
        }
        if (employee.maxOvertimeHoursPerWeek) {
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay());
            weekStart.setHours(0, 0, 0, 0);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            weekEnd.setHours(23, 59, 59, 999);
            const weeklyOvertime = await this.prisma.overtime.aggregate({
                where: {
                    tenantId,
                    employeeId,
                    date: {
                        gte: weekStart,
                        lte: weekEnd,
                    },
                    status: {
                        in: ['APPROVED', 'PAID', 'RECOVERED'],
                    },
                },
                _sum: {
                    approvedHours: true,
                    hours: true,
                },
            });
            const weeklyUsed = weeklyOvertime._sum.approvedHours?.toNumber() ||
                weeklyOvertime._sum.hours?.toNumber() ||
                0;
            const weeklyLimit = employee.maxOvertimeHoursPerWeek.toNumber();
            result.weeklyUsed = weeklyUsed;
            result.weeklyLimit = weeklyLimit;
            const adjustedHours = result.adjustedHours ?? newHours;
            if (weeklyUsed + adjustedHours > weeklyLimit) {
                const remaining = weeklyLimit - weeklyUsed;
                if (remaining <= 0) {
                    result.exceedsLimit = true;
                    result.message = `Plafond hebdomadaire atteint (${weeklyUsed.toFixed(2)}h / ${weeklyLimit.toFixed(2)}h)`;
                }
                else {
                    result.adjustedHours = Math.min(remaining, result.adjustedHours ?? newHours);
                    result.message = `Plafond hebdomadaire partiellement atteint. ${result.adjustedHours.toFixed(2)}h acceptées, ${(adjustedHours - result.adjustedHours).toFixed(2)}h rejetées`;
                }
            }
        }
        return result;
    }
    async create(tenantId, dto) {
        const employee = await this.prisma.employee.findFirst({
            where: {
                id: dto.employeeId,
                tenantId,
            },
            select: {
                id: true,
                isEligibleForOvertime: true,
                maxOvertimeHoursPerMonth: true,
                maxOvertimeHoursPerWeek: true,
            },
        });
        if (!employee) {
            throw new common_1.NotFoundException('Employee not found');
        }
        if (employee.isEligibleForOvertime === false) {
            throw new common_1.BadRequestException('Cet employé n\'est pas éligible aux heures supplémentaires');
        }
        const overtimeDate = new Date(dto.date);
        const leaveCheck = await this.isEmployeeOnLeaveOrRecovery(tenantId, dto.employeeId, overtimeDate);
        if (leaveCheck.isOnLeave) {
            throw new common_1.BadRequestException(`Impossible de créer des heures supplémentaires : l'employé est ${leaveCheck.reason} pour cette date`);
        }
        const settings = await this.prisma.tenantSettings.findUnique({
            where: { tenantId },
        });
        const overtimeType = dto.type || (dto.isNightShift ? 'NIGHT' : 'STANDARD');
        let rate = dto.rate;
        if (!rate) {
            rate = this.getOvertimeRate(settings, overtimeType);
        }
        let hoursToCreate = dto.hours;
        if (employee.maxOvertimeHoursPerMonth || employee.maxOvertimeHoursPerWeek) {
            const limitsCheck = await this.checkOvertimeLimits(tenantId, dto.employeeId, dto.hours, new Date(dto.date));
            if (limitsCheck.exceedsLimit) {
                throw new common_1.BadRequestException(limitsCheck.message || 'Plafond d\'heures supplémentaires atteint');
            }
            if (limitsCheck.adjustedHours !== undefined && limitsCheck.adjustedHours < dto.hours) {
                hoursToCreate = limitsCheck.adjustedHours;
            }
        }
        const roundingMinutes = settings?.overtimeRounding || 15;
        const roundedHours = this.roundOvertimeHours(hoursToCreate, roundingMinutes);
        return this.prisma.overtime.create({
            data: {
                tenantId,
                employeeId: dto.employeeId,
                date: new Date(dto.date),
                hours: roundedHours,
                type: overtimeType,
                isNightShift: overtimeType === 'NIGHT',
                rate,
                notes: dto.notes,
                status: client_1.OvertimeStatus.PENDING,
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
        const hasViewDepartment = userPermissions?.includes('overtime.view_department');
        const hasViewSite = userPermissions?.includes('overtime.view_site');
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
                if (process.env.NODE_ENV === 'development') {
                    console.log('[OvertimeService] Manager SITE - Managed Employee IDs:', managedEmployeeIds);
                    console.log('[OvertimeService] Manager SITE - Site IDs:', managerLevel.siteIds);
                    console.log('[OvertimeService] Manager SITE - Department ID:', managerLevel.departmentId);
                }
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
        if (filters?.status) {
            where.status = filters.status;
        }
        if (filters?.isNightShift !== undefined) {
            where.isNightShift = filters.isNightShift;
        }
        if (filters?.type) {
            where.type = filters.type;
        }
        if (filters?.startDate || filters?.endDate) {
            where.date = {};
            if (filters.startDate) {
                where.date.gte = new Date(filters.startDate);
            }
            if (filters.endDate) {
                where.date.lte = new Date(filters.endDate);
            }
        }
        if (!filters?.employeeId) {
            const employeeFilters = {};
            if (filters?.siteId) {
                employeeFilters.siteId = filters.siteId;
            }
            if (filters?.departmentId) {
                employeeFilters.departmentId = filters.departmentId;
            }
            if (Object.keys(employeeFilters).length > 0) {
                where.employee = employeeFilters;
            }
        }
        if (process.env.NODE_ENV === 'development') {
            console.log('[OvertimeService] Final where clause:', JSON.stringify(where, null, 2));
            console.log('[OvertimeService] Filters:', filters);
            console.log('[OvertimeService] Pagination:', { page, limit, skip });
        }
        const [data, total, totalHoursAggregate] = await Promise.all([
            this.prisma.overtime.findMany({
                where,
                skip,
                take: limit,
                select: {
                    id: true,
                    date: true,
                    hours: true,
                    approvedHours: true,
                    type: true,
                    isNightShift: true,
                    rate: true,
                    convertedToRecovery: true,
                    recoveryId: true,
                    status: true,
                    rejectionReason: true,
                    notes: true,
                    approvedBy: true,
                    approvedAt: true,
                    createdAt: true,
                    updatedAt: true,
                    employee: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            matricule: true,
                            site: {
                                select: {
                                    id: true,
                                    name: true,
                                    code: true,
                                },
                            },
                        },
                    },
                },
                orderBy: { date: 'desc' },
            }),
            this.prisma.overtime.count({ where }),
            this.prisma.overtime.aggregate({
                where,
                _sum: {
                    hours: true,
                    approvedHours: true,
                },
            }),
        ]);
        if (process.env.NODE_ENV === 'development') {
            console.log('[OvertimeService] Found records:', data.length, 'Total:', total);
            console.log('[OvertimeService] Total hours aggregate:', totalHoursAggregate);
        }
        const totalHours = totalHoursAggregate._sum.approvedHours
            ? (typeof totalHoursAggregate._sum.approvedHours === 'object' && 'toNumber' in totalHoursAggregate._sum.approvedHours
                ? totalHoursAggregate._sum.approvedHours.toNumber()
                : typeof totalHoursAggregate._sum.approvedHours === 'string'
                    ? parseFloat(totalHoursAggregate._sum.approvedHours)
                    : totalHoursAggregate._sum.approvedHours)
            : (totalHoursAggregate._sum.hours
                ? (typeof totalHoursAggregate._sum.hours === 'object' && 'toNumber' in totalHoursAggregate._sum.hours
                    ? totalHoursAggregate._sum.hours.toNumber()
                    : typeof totalHoursAggregate._sum.hours === 'string'
                        ? parseFloat(totalHoursAggregate._sum.hours)
                        : totalHoursAggregate._sum.hours)
                : 0);
        const transformedData = data.map((record) => ({
            ...record,
            hours: typeof record.hours === 'object' && 'toNumber' in record.hours
                ? record.hours.toNumber()
                : typeof record.hours === 'string'
                    ? parseFloat(record.hours)
                    : record.hours,
            approvedHours: record.approvedHours
                ? (typeof record.approvedHours === 'object' && 'toNumber' in record.approvedHours
                    ? record.approvedHours.toNumber()
                    : typeof record.approvedHours === 'string'
                        ? parseFloat(record.approvedHours)
                        : record.approvedHours)
                : null,
            rate: typeof record.rate === 'object' && 'toNumber' in record.rate
                ? record.rate.toNumber()
                : typeof record.rate === 'string'
                    ? parseFloat(record.rate)
                    : record.rate,
        }));
        return {
            data: transformedData,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
                totalHours,
            },
        };
    }
    async findOne(tenantId, id) {
        const overtime = await this.prisma.overtime.findFirst({
            where: {
                id,
                tenantId,
            },
            select: {
                id: true,
                date: true,
                hours: true,
                approvedHours: true,
                type: true,
                isNightShift: true,
                rate: true,
                convertedToRecovery: true,
                recoveryId: true,
                status: true,
                rejectionReason: true,
                notes: true,
                approvedBy: true,
                approvedAt: true,
                createdAt: true,
                updatedAt: true,
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
            },
        });
        if (!overtime) {
            throw new common_1.NotFoundException('Overtime record not found');
        }
        return overtime;
    }
    async update(tenantId, id, dto) {
        const overtime = await this.findOne(tenantId, id);
        if (overtime.status !== client_1.OvertimeStatus.PENDING) {
            throw new common_1.BadRequestException('Cannot update overtime that is not pending');
        }
        const settings = await this.prisma.tenantSettings.findUnique({
            where: { tenantId },
        });
        const updateData = {};
        if (dto.date)
            updateData.date = new Date(dto.date);
        if (dto.hours !== undefined) {
            const roundingMinutes = settings?.overtimeRounding || 15;
            updateData.hours = this.roundOvertimeHours(dto.hours, roundingMinutes);
        }
        if (dto.type) {
            updateData.type = dto.type;
            updateData.isNightShift = dto.type === 'NIGHT';
        }
        else if (dto.isNightShift !== undefined) {
            updateData.isNightShift = dto.isNightShift;
            updateData.type = dto.isNightShift ? 'NIGHT' : 'STANDARD';
        }
        if (dto.rate !== undefined)
            updateData.rate = dto.rate;
        if (dto.notes !== undefined)
            updateData.notes = dto.notes;
        return this.prisma.overtime.update({
            where: { id },
            data: updateData,
            select: {
                id: true,
                date: true,
                hours: true,
                approvedHours: true,
                type: true,
                isNightShift: true,
                rate: true,
                convertedToRecovery: true,
                recoveryId: true,
                status: true,
                rejectionReason: true,
                notes: true,
                approvedBy: true,
                approvedAt: true,
                createdAt: true,
                updatedAt: true,
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
    async approve(tenantId, id, userId, dto) {
        const overtime = await this.findOne(tenantId, id);
        if (overtime.status !== client_1.OvertimeStatus.PENDING) {
            throw new common_1.BadRequestException('Overtime can only be approved or rejected when pending');
        }
        if (dto.status === client_1.OvertimeStatus.REJECTED && !dto.rejectionReason?.trim()) {
            throw new common_1.BadRequestException('Rejection reason is required when rejecting overtime');
        }
        const updateData = {
            status: dto.status,
            approvedBy: dto.status === client_1.OvertimeStatus.APPROVED ? userId : undefined,
            approvedAt: dto.status === client_1.OvertimeStatus.APPROVED ? new Date() : undefined,
            rejectionReason: dto.status === client_1.OvertimeStatus.REJECTED ? dto.rejectionReason : null,
        };
        if (dto.status === client_1.OvertimeStatus.APPROVED && dto.approvedHours !== undefined) {
            updateData.approvedHours = dto.approvedHours;
        }
        return this.prisma.overtime.update({
            where: { id },
            data: updateData,
            select: {
                id: true,
                date: true,
                hours: true,
                approvedHours: true,
                type: true,
                isNightShift: true,
                rate: true,
                convertedToRecovery: true,
                recoveryId: true,
                status: true,
                rejectionReason: true,
                notes: true,
                approvedBy: true,
                approvedAt: true,
                createdAt: true,
                updatedAt: true,
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
    async convertToRecovery(tenantId, id, conversionRate, expiryDays) {
        const overtime = await this.findOne(tenantId, id);
        if (overtime.status !== client_1.OvertimeStatus.APPROVED) {
            throw new common_1.BadRequestException('Only approved overtime can be converted to recovery');
        }
        if (overtime.convertedToRecovery) {
            throw new common_1.BadRequestException('Overtime already converted to recovery');
        }
        const settings = await this.prisma.tenantSettings.findUnique({
            where: { tenantId },
        });
        const hoursDecimal = overtime.approvedHours || overtime.hours;
        let hoursToConvert;
        if (typeof hoursDecimal === 'object' && hoursDecimal !== null && 'toNumber' in hoursDecimal) {
            hoursToConvert = hoursDecimal.toNumber();
        }
        else if (typeof hoursDecimal === 'string') {
            hoursToConvert = parseFloat(hoursDecimal);
        }
        else {
            hoursToConvert = Number(hoursDecimal);
        }
        const rate = conversionRate || Number(settings?.recoveryConversionRate || 1.0);
        const recoveryHours = hoursToConvert * rate;
        const expiryDaysValue = expiryDays || Number(settings?.recoveryExpiryDays || 365);
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + expiryDaysValue);
        const recovery = await this.prisma.recovery.create({
            data: {
                tenantId,
                employeeId: overtime.employee.id,
                hours: recoveryHours,
                source: 'OVERTIME',
                usedHours: 0,
                remainingHours: recoveryHours,
                expiryDate,
            },
        });
        await this.prisma.overtime.update({
            where: { id },
            data: {
                convertedToRecovery: true,
                recoveryId: recovery.id,
                status: client_1.OvertimeStatus.RECOVERED,
            },
        });
        return recovery;
    }
    async getBalance(tenantId, employeeId) {
        const employee = await this.prisma.employee.findFirst({
            where: {
                id: employeeId,
                tenantId,
            },
        });
        if (!employee) {
            throw new common_1.NotFoundException('Employee not found');
        }
        const overtimeRecords = await this.prisma.overtime.findMany({
            where: {
                tenantId,
                employeeId,
            },
            select: {
                hours: true,
                approvedHours: true,
                status: true,
                convertedToRecovery: true,
                date: true,
            },
        });
        let totalRequested = 0;
        let totalApproved = 0;
        let totalPending = 0;
        let totalRejected = 0;
        let totalPaid = 0;
        let totalRecovered = 0;
        overtimeRecords.forEach((record) => {
            const hours = typeof record.hours === 'object' && 'toNumber' in record.hours
                ? record.hours.toNumber()
                : typeof record.hours === 'string'
                    ? parseFloat(record.hours)
                    : record.hours;
            const approvedHours = record.approvedHours
                ? (typeof record.approvedHours === 'object' && 'toNumber' in record.approvedHours
                    ? record.approvedHours.toNumber()
                    : typeof record.approvedHours === 'string'
                        ? parseFloat(record.approvedHours)
                        : record.approvedHours)
                : hours;
            totalRequested += hours;
            switch (record.status) {
                case client_1.OvertimeStatus.PENDING:
                    totalPending += hours;
                    break;
                case client_1.OvertimeStatus.APPROVED:
                    totalApproved += approvedHours;
                    break;
                case client_1.OvertimeStatus.REJECTED:
                    totalRejected += hours;
                    break;
                case client_1.OvertimeStatus.PAID:
                    totalPaid += approvedHours;
                    break;
                case client_1.OvertimeStatus.RECOVERED:
                    totalRecovered += approvedHours;
                    break;
            }
        });
        return {
            employeeId,
            totalRequested,
            totalApproved,
            totalPending,
            totalRejected,
            totalPaid,
            totalRecovered,
            availableForConversion: totalApproved - totalRecovered - totalPaid,
        };
    }
    async remove(tenantId, id) {
        await this.findOne(tenantId, id);
        return this.prisma.overtime.delete({
            where: { id },
        });
    }
    async getDashboardStats(tenantId, filters, userId, userPermissions) {
        const where = { tenantId };
        if (filters.startDate) {
            where.date = { ...where.date, gte: new Date(filters.startDate) };
        }
        if (filters.endDate) {
            where.date = { ...where.date, lte: new Date(filters.endDate) };
        }
        if (filters.siteId || filters.departmentId) {
            where.employee = {};
            if (filters.siteId) {
                where.employee.siteId = filters.siteId;
            }
            if (filters.departmentId) {
                where.employee.departmentId = filters.departmentId;
            }
        }
        const hasViewAll = userPermissions.includes('overtime.view_all');
        const hasViewDepartment = userPermissions.includes('overtime.view_department');
        if (!hasViewAll) {
            const managerLevel = await (0, manager_level_util_1.getManagerLevel)(this.prisma, userId, tenantId);
            const managedEmployeeIds = await (0, manager_level_util_1.getManagedEmployeeIds)(this.prisma, managerLevel, tenantId);
            if (hasViewDepartment && managedEmployeeIds.length > 0) {
                where.employeeId = { in: managedEmployeeIds };
            }
            else {
                const employee = await this.prisma.employee.findFirst({
                    where: { userId, tenantId },
                    select: { id: true },
                });
                where.employeeId = employee?.id || 'none';
            }
        }
        const overtimes = await this.prisma.overtime.findMany({
            where,
            include: {
                employee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        matricule: true,
                        department: { select: { id: true, name: true } },
                    },
                },
            },
            orderBy: { date: 'asc' },
        });
        const summary = {
            totalRecords: overtimes.length,
            totalHours: 0,
            totalApprovedHours: 0,
            pendingCount: 0,
            approvedCount: 0,
            rejectedCount: 0,
            paidCount: 0,
            recoveredCount: 0,
        };
        const byType = {
            STANDARD: { count: 0, hours: 0 },
            NIGHT: { count: 0, hours: 0 },
            HOLIDAY: { count: 0, hours: 0 },
            EMERGENCY: { count: 0, hours: 0 },
        };
        const byStatus = {
            PENDING: { count: 0, hours: 0 },
            APPROVED: { count: 0, hours: 0 },
            REJECTED: { count: 0, hours: 0 },
            PAID: { count: 0, hours: 0 },
            RECOVERED: { count: 0, hours: 0 },
        };
        const byEmployee = {};
        const byDepartment = {};
        const byDay = {};
        for (const ot of overtimes) {
            const hours = Number(ot.hours) || 0;
            const approvedHours = Number(ot.approvedHours || ot.hours) || 0;
            summary.totalHours += hours;
            if (ot.status === 'APPROVED' || ot.status === 'PAID' || ot.status === 'RECOVERED') {
                summary.totalApprovedHours += approvedHours;
            }
            switch (ot.status) {
                case 'PENDING':
                    summary.pendingCount++;
                    break;
                case 'APPROVED':
                    summary.approvedCount++;
                    break;
                case 'REJECTED':
                    summary.rejectedCount++;
                    break;
                case 'PAID':
                    summary.paidCount++;
                    break;
                case 'RECOVERED':
                    summary.recoveredCount++;
                    break;
            }
            if (byType[ot.type]) {
                byType[ot.type].count++;
                byType[ot.type].hours += hours;
            }
            if (byStatus[ot.status]) {
                byStatus[ot.status].count++;
                byStatus[ot.status].hours += hours;
            }
            const empKey = ot.employeeId;
            if (!byEmployee[empKey]) {
                byEmployee[empKey] = {
                    name: `${ot.employee.firstName} ${ot.employee.lastName}`,
                    hours: 0,
                    count: 0,
                };
            }
            byEmployee[empKey].hours += hours;
            byEmployee[empKey].count++;
            const deptKey = ot.employee.department?.id || 'unknown';
            const deptName = ot.employee.department?.name || 'Sans département';
            if (!byDepartment[deptKey]) {
                byDepartment[deptKey] = { name: deptName, hours: 0, count: 0 };
            }
            byDepartment[deptKey].hours += hours;
            byDepartment[deptKey].count++;
            const dateKey = ot.date.toISOString().split('T')[0];
            if (!byDay[dateKey]) {
                byDay[dateKey] = { date: dateKey, hours: 0, count: 0 };
            }
            byDay[dateKey].hours += hours;
            byDay[dateKey].count++;
        }
        const typeData = Object.entries(byType)
            .map(([type, data]) => ({ type, ...data }))
            .filter(d => d.count > 0);
        const statusData = Object.entries(byStatus)
            .map(([status, data]) => ({ status, ...data }))
            .filter(d => d.count > 0);
        const employeeData = Object.entries(byEmployee)
            .map(([id, data]) => ({ id, ...data }))
            .sort((a, b) => b.hours - a.hours)
            .slice(0, 10);
        const departmentData = Object.entries(byDepartment)
            .map(([id, data]) => ({ id, ...data }))
            .sort((a, b) => b.hours - a.hours);
        const trendData = Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date));
        return {
            summary: {
                ...summary,
                totalHours: Math.round(summary.totalHours * 100) / 100,
                totalApprovedHours: Math.round(summary.totalApprovedHours * 100) / 100,
            },
            byType: typeData,
            byStatus: statusData,
            topEmployees: employeeData.map(e => ({
                ...e,
                hours: Math.round(e.hours * 100) / 100,
            })),
            byDepartment: departmentData.map(d => ({
                ...d,
                hours: Math.round(d.hours * 100) / 100,
            })),
            trend: trendData.map(t => ({
                ...t,
                hours: Math.round(t.hours * 100) / 100,
            })),
        };
    }
    async isEmployeeOnLeaveOrRecovery(tenantId, employeeId, date) {
        const approvedLeaveStatuses = [
            client_1.LeaveStatus.APPROVED,
            client_1.LeaveStatus.MANAGER_APPROVED,
            client_1.LeaveStatus.HR_APPROVED,
        ];
        const leave = await this.prisma.leave.findFirst({
            where: {
                tenantId,
                employeeId,
                status: { in: approvedLeaveStatuses },
                startDate: { lte: date },
                endDate: { gte: date },
            },
            include: {
                leaveType: { select: { name: true } },
            },
        });
        if (leave) {
            return {
                isOnLeave: true,
                reason: `en congé (${leave.leaveType.name})`,
            };
        }
        const recoveryDay = await this.prisma.recoveryDay.findFirst({
            where: {
                tenantId,
                employeeId,
                status: { in: [client_1.RecoveryDayStatus.APPROVED, client_1.RecoveryDayStatus.USED] },
                startDate: { lte: date },
                endDate: { gte: date },
            },
        });
        if (recoveryDay) {
            return {
                isOnLeave: true,
                reason: 'en jour de récupération',
            };
        }
        return { isOnLeave: false };
    }
};
exports.OvertimeService = OvertimeService;
exports.OvertimeService = OvertimeService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], OvertimeService);
//# sourceMappingURL=overtime.service.js.map