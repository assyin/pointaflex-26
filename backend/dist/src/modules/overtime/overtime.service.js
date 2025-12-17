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
        const settings = await this.prisma.tenantSettings.findUnique({
            where: { tenantId },
        });
        const overtimeType = dto.type || (dto.isNightShift ? 'NIGHT' : 'STANDARD');
        let rate = dto.rate;
        if (!rate) {
            if (overtimeType === 'NIGHT') {
                rate = Number(settings?.nightShiftRate || 1.5);
            }
            else if (overtimeType === 'HOLIDAY') {
                rate = Number(settings?.overtimeRate || 1.25) * 1.5;
            }
            else if (overtimeType === 'EMERGENCY') {
                rate = Number(settings?.overtimeRate || 1.25) * 1.3;
            }
            else {
                rate = Number(settings?.overtimeRate || 1.25);
            }
        }
        return this.prisma.overtime.create({
            data: {
                tenantId,
                employeeId: dto.employeeId,
                date: new Date(dto.date),
                hours: dto.hours,
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
        const [data, total, allRecordsForTotal] = await Promise.all([
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
            this.prisma.overtime.findMany({
                where,
                select: {
                    hours: true,
                    approvedHours: true,
                },
            }),
        ]);
        if (process.env.NODE_ENV === 'development') {
            console.log('[OvertimeService] Found records:', data.length, 'Total:', total);
            console.log('[OvertimeService] All records for total calculation:', allRecordsForTotal.length);
            console.log('[OvertimeService] Record dates:', data.map((r) => ({
                date: r.date,
                employee: r.employee?.firstName + ' ' + r.employee?.lastName,
                hours: r.hours
            })));
        }
        const totalHours = allRecordsForTotal.reduce((sum, record) => {
            const hoursToUse = (record.approvedHours != null && record.approvedHours !== undefined)
                ? record.approvedHours
                : record.hours;
            let numHours;
            if (typeof hoursToUse === 'object' && 'toNumber' in hoursToUse) {
                numHours = hoursToUse.toNumber();
            }
            else if (typeof hoursToUse === 'string') {
                numHours = parseFloat(hoursToUse) || 0;
            }
            else {
                numHours = typeof hoursToUse === 'number' ? hoursToUse : parseFloat(String(hoursToUse)) || 0;
            }
            return sum + numHours;
        }, 0);
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
        const updateData = {};
        if (dto.date)
            updateData.date = new Date(dto.date);
        if (dto.hours !== undefined)
            updateData.hours = dto.hours;
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
};
exports.OvertimeService = OvertimeService;
exports.OvertimeService = OvertimeService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], OvertimeService);
//# sourceMappingURL=overtime.service.js.map