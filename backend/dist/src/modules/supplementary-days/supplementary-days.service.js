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
var SupplementaryDaysService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupplementaryDaysService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
const approve_supplementary_day_dto_1 = require("./dto/approve-supplementary-day.dto");
const client_1 = require("@prisma/client");
let SupplementaryDaysService = SupplementaryDaysService_1 = class SupplementaryDaysService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(SupplementaryDaysService_1.name);
    }
    async create(tenantId, dto) {
        const employee = await this.prisma.employee.findFirst({
            where: { id: dto.employeeId, tenantId },
        });
        if (!employee) {
            throw new common_1.NotFoundException('Employé non trouvé');
        }
        const existing = await this.prisma.supplementaryDay.findFirst({
            where: {
                tenantId,
                employeeId: dto.employeeId,
                date: new Date(dto.date),
            },
        });
        if (existing) {
            throw new common_1.BadRequestException('Un jour supplémentaire existe déjà pour cette date');
        }
        return this.prisma.supplementaryDay.create({
            data: {
                tenantId,
                employeeId: dto.employeeId,
                date: new Date(dto.date),
                hours: dto.hours,
                type: dto.type,
                checkIn: dto.checkIn ? new Date(dto.checkIn) : null,
                checkOut: dto.checkOut ? new Date(dto.checkOut) : null,
                source: dto.source || 'MANUAL',
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
    async findAll(tenantId, page = 1, limit = 20, filters = {}) {
        const skip = (page - 1) * limit;
        const where = { tenantId };
        if (filters.employeeId) {
            where.employeeId = filters.employeeId;
        }
        if (filters.status) {
            where.status = filters.status;
        }
        if (filters.type) {
            where.type = filters.type;
        }
        if (filters.startDate || filters.endDate) {
            where.date = {};
            if (filters.startDate) {
                where.date.gte = new Date(filters.startDate);
            }
            if (filters.endDate) {
                where.date.lte = new Date(filters.endDate);
            }
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
        const [data, total] = await Promise.all([
            this.prisma.supplementaryDay.findMany({
                where,
                skip,
                take: limit,
                orderBy: { date: 'desc' },
                include: {
                    employee: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            matricule: true,
                            site: { select: { id: true, name: true } },
                            department: { select: { id: true, name: true } },
                        },
                    },
                },
            }),
            this.prisma.supplementaryDay.count({ where }),
        ]);
        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    async findOne(tenantId, id) {
        const supplementaryDay = await this.prisma.supplementaryDay.findFirst({
            where: { id, tenantId },
            include: {
                employee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        matricule: true,
                        email: true,
                        site: { select: { id: true, name: true } },
                        department: { select: { id: true, name: true } },
                    },
                },
            },
        });
        if (!supplementaryDay) {
            throw new common_1.NotFoundException('Jour supplémentaire non trouvé');
        }
        return supplementaryDay;
    }
    async approve(tenantId, id, userId, dto) {
        const supplementaryDay = await this.findOne(tenantId, id);
        if (supplementaryDay.status !== client_1.OvertimeStatus.PENDING) {
            throw new common_1.BadRequestException('Seuls les jours en attente peuvent être traités');
        }
        const updateData = {
            status: dto.status === approve_supplementary_day_dto_1.ApprovalStatus.APPROVED ? client_1.OvertimeStatus.APPROVED : client_1.OvertimeStatus.REJECTED,
            approvedBy: userId,
            approvedAt: new Date(),
        };
        if (dto.status === approve_supplementary_day_dto_1.ApprovalStatus.APPROVED) {
            updateData.approvedHours = dto.approvedHours ?? supplementaryDay.hours;
        }
        else {
            updateData.rejectionReason = dto.rejectionReason;
        }
        return this.prisma.supplementaryDay.update({
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
    async convertToRecovery(tenantId, id) {
        const supplementaryDay = await this.findOne(tenantId, id);
        if (supplementaryDay.status !== client_1.OvertimeStatus.APPROVED) {
            throw new common_1.BadRequestException('Seuls les jours approuvés peuvent être convertis');
        }
        if (supplementaryDay.convertedToRecovery || supplementaryDay.convertedToRecoveryDays) {
            throw new common_1.BadRequestException('Ce jour a déjà été converti en récupération');
        }
        return this.prisma.supplementaryDay.update({
            where: { id },
            data: {
                status: client_1.OvertimeStatus.RECOVERED,
                convertedToRecovery: true,
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
    async remove(tenantId, id) {
        const supplementaryDay = await this.findOne(tenantId, id);
        if (supplementaryDay.status !== client_1.OvertimeStatus.PENDING) {
            throw new common_1.BadRequestException('Seuls les jours en attente peuvent être supprimés');
        }
        await this.prisma.supplementaryDay.delete({ where: { id } });
        return { message: 'Jour supplémentaire supprimé avec succès' };
    }
    async getDashboardStats(tenantId, filters = {}) {
        const where = { tenantId };
        if (filters.startDate || filters.endDate) {
            where.date = {};
            if (filters.startDate) {
                where.date.gte = new Date(filters.startDate);
            }
            if (filters.endDate) {
                where.date.lte = new Date(filters.endDate);
            }
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
        const [pending, approved, rejected, recovered] = await Promise.all([
            this.prisma.supplementaryDay.count({ where: { ...where, status: client_1.OvertimeStatus.PENDING } }),
            this.prisma.supplementaryDay.count({ where: { ...where, status: client_1.OvertimeStatus.APPROVED } }),
            this.prisma.supplementaryDay.count({ where: { ...where, status: client_1.OvertimeStatus.REJECTED } }),
            this.prisma.supplementaryDay.count({ where: { ...where, status: client_1.OvertimeStatus.RECOVERED } }),
        ]);
        const totalHours = await this.prisma.supplementaryDay.aggregate({
            where: { ...where, status: { in: [client_1.OvertimeStatus.APPROVED, client_1.OvertimeStatus.RECOVERED] } },
            _sum: { approvedHours: true },
        });
        const byType = await this.prisma.supplementaryDay.groupBy({
            by: ['type'],
            where,
            _count: true,
            _sum: { hours: true },
        });
        return {
            counts: {
                pending,
                approved,
                rejected,
                recovered,
                total: pending + approved + rejected + recovered,
            },
            totalApprovedHours: Number(totalHours._sum.approvedHours || 0),
            byType: byType.map(item => ({
                type: item.type,
                count: item._count,
                hours: Number(item._sum.hours || 0),
            })),
        };
    }
    async revokeApproval(tenantId, id, userId, reason) {
        const supplementaryDay = await this.findOne(tenantId, id);
        if (supplementaryDay.status !== client_1.OvertimeStatus.APPROVED) {
            throw new common_1.BadRequestException('Seuls les jours approuvés peuvent être annulés');
        }
        if (supplementaryDay.convertedToRecovery || supplementaryDay.convertedToRecoveryDays) {
            throw new common_1.BadRequestException('Impossible d\'annuler: le jour a déjà été converti en récupération');
        }
        const note = reason
            ? `[Approbation annulée le ${new Date().toISOString().split('T')[0]}] Motif: ${reason}`
            : `[Approbation annulée le ${new Date().toISOString().split('T')[0]}]`;
        return this.prisma.supplementaryDay.update({
            where: { id },
            data: {
                status: client_1.OvertimeStatus.PENDING,
                approvedBy: null,
                approvedAt: null,
                approvedHours: null,
                notes: supplementaryDay.notes ? `${supplementaryDay.notes}\n${note}` : note,
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
    async revokeRejection(tenantId, id, userId, reason) {
        const supplementaryDay = await this.findOne(tenantId, id);
        if (supplementaryDay.status !== client_1.OvertimeStatus.REJECTED) {
            throw new common_1.BadRequestException('Seuls les jours rejetés peuvent être reconsidérés');
        }
        const note = reason
            ? `[Rejet annulé le ${new Date().toISOString().split('T')[0]}] Motif: ${reason}`
            : `[Rejet annulé le ${new Date().toISOString().split('T')[0]}]`;
        return this.prisma.supplementaryDay.update({
            where: { id },
            data: {
                status: client_1.OvertimeStatus.PENDING,
                approvedBy: null,
                approvedAt: null,
                rejectionReason: null,
                notes: supplementaryDay.notes ? `${supplementaryDay.notes}\n${note}` : note,
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
    async isSupplementaryDay(tenantId, date) {
        const dayOfWeek = date.getDay();
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        const holiday = await this.prisma.holiday.findFirst({
            where: {
                tenantId,
                date: {
                    gte: startOfDay,
                    lte: endOfDay,
                },
            },
        });
        if (holiday) {
            return { isSupplementary: true, type: client_1.SupplementaryDayType.HOLIDAY };
        }
        if (dayOfWeek === 0) {
            return { isSupplementary: true, type: client_1.SupplementaryDayType.WEEKEND_SUNDAY };
        }
        if (dayOfWeek === 6) {
            return { isSupplementary: true, type: client_1.SupplementaryDayType.WEEKEND_SATURDAY };
        }
        return { isSupplementary: false, type: null };
    }
    async createAutoSupplementaryDay(params) {
        const { tenantId, employeeId, attendanceId, date, checkIn, checkOut, hoursWorked } = params;
        try {
            let finalType = null;
            let referenceDate = checkIn || date;
            const checkInResult = await this.isSupplementaryDay(tenantId, checkIn || date);
            if (checkInResult.isSupplementary && checkInResult.type) {
                finalType = checkInResult.type;
                referenceDate = checkIn || date;
                this.logger.debug(`[SupplementaryDay] Type basé sur IN: ${finalType}`);
            }
            else {
                const checkOutResult = await this.isSupplementaryDay(tenantId, checkOut || date);
                if (checkOutResult.isSupplementary && checkOutResult.type) {
                    finalType = checkOutResult.type;
                    referenceDate = checkOut || date;
                    this.logger.debug(`[SupplementaryDay] Type basé sur OUT: ${finalType}`);
                }
            }
            if (!finalType) {
                return { created: false, reason: 'Ce n\'est pas un weekend ni un jour férié' };
            }
            const employee = await this.prisma.employee.findFirst({
                where: { id: employeeId, tenantId },
                select: {
                    id: true,
                    isEligibleForOvertime: true,
                    firstName: true,
                    lastName: true,
                },
            });
            if (!employee) {
                return { created: false, reason: 'Employé non trouvé' };
            }
            if (!employee.isEligibleForOvertime) {
                this.logger.debug(`[SupplementaryDay] ${employee.firstName} ${employee.lastName} n'est pas éligible aux jours supplémentaires`);
                return { created: false, reason: 'Employé non éligible' };
            }
            const startOfDay = new Date(referenceDate);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(referenceDate);
            endOfDay.setHours(23, 59, 59, 999);
            const existing = await this.prisma.supplementaryDay.findFirst({
                where: {
                    tenantId,
                    employeeId,
                    date: {
                        gte: startOfDay,
                        lte: endOfDay,
                    },
                },
            });
            if (existing) {
                this.logger.debug(`[SupplementaryDay] Jour supplémentaire déjà existant pour ${employee.firstName} ${employee.lastName} le ${referenceDate.toISOString().split('T')[0]}`);
                return { created: false, reason: 'Jour supplémentaire déjà existant', supplementaryDay: existing };
            }
            const leave = await this.prisma.leave.findFirst({
                where: {
                    tenantId,
                    employeeId,
                    startDate: { lte: referenceDate },
                    endDate: { gte: referenceDate },
                    status: { in: ['APPROVED', 'MANAGER_APPROVED', 'HR_APPROVED'] },
                },
            });
            if (leave) {
                this.logger.debug(`[SupplementaryDay] ${employee.firstName} ${employee.lastName} est en congé le ${referenceDate.toISOString().split('T')[0]}`);
                return { created: false, reason: 'Employé en congé' };
            }
            const settings = await this.prisma.tenantSettings.findUnique({
                where: { tenantId },
            });
            const minimumThreshold = Number(settings?.overtimeMinimumThreshold || 30) / 60;
            if (hoursWorked < minimumThreshold) {
                this.logger.debug(`[SupplementaryDay] Heures insuffisantes (${hoursWorked}h < ${minimumThreshold}h) pour ${employee.firstName} ${employee.lastName}`);
                return { created: false, reason: `Heures insuffisantes (< ${minimumThreshold}h)` };
            }
            const supplementaryDay = await this.prisma.supplementaryDay.create({
                data: {
                    tenantId,
                    employeeId,
                    date: startOfDay,
                    hours: hoursWorked,
                    type: finalType,
                    source: 'AUTO_DETECTED',
                    checkIn,
                    checkOut,
                    attendanceId,
                    status: client_1.OvertimeStatus.PENDING,
                    notes: `Détecté automatiquement depuis pointage`,
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
            this.logger.log(`✅ [SupplementaryDay] Créé automatiquement: ${employee.firstName} ${employee.lastName}, ` +
                `${referenceDate.toISOString().split('T')[0]}, ${hoursWorked.toFixed(2)}h, type=${finalType}`);
            return { created: true, supplementaryDay };
        }
        catch (error) {
            this.logger.error(`[SupplementaryDay] Erreur création auto: ${error.message}`, error.stack);
            return { created: false, reason: `Erreur: ${error.message}` };
        }
    }
    async detectMissingSupplementaryDays(tenantId, startDate, endDate) {
        const stats = { created: 0, existing: 0, skipped: 0, errors: 0 };
        const attendances = await this.prisma.attendance.findMany({
            where: {
                tenantId,
                type: 'OUT',
                timestamp: {
                    gte: startDate,
                    lte: endDate,
                },
                hoursWorked: { gt: 0 },
            },
            include: {
                employee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        isEligibleForOvertime: true,
                    },
                },
            },
            orderBy: { timestamp: 'asc' },
        });
        this.logger.log(`[DetectSupplementaryDays] Analyse de ${attendances.length} pointages OUT du ${startDate.toISOString().split('T')[0]} au ${endDate.toISOString().split('T')[0]}`);
        for (const attendance of attendances) {
            const attendanceDate = new Date(attendance.timestamp);
            const { isSupplementary, type } = await this.isSupplementaryDay(tenantId, attendanceDate);
            if (!isSupplementary) {
                continue;
            }
            const checkInAttendance = await this.prisma.attendance.findFirst({
                where: {
                    tenantId,
                    employeeId: attendance.employeeId,
                    type: 'IN',
                    timestamp: {
                        gte: new Date(attendanceDate.setHours(0, 0, 0, 0)),
                        lt: attendance.timestamp,
                    },
                },
                orderBy: { timestamp: 'desc' },
            });
            const checkIn = checkInAttendance?.timestamp || attendance.timestamp;
            const hoursWorked = Number(attendance.hoursWorked || 0);
            const result = await this.createAutoSupplementaryDay({
                tenantId,
                employeeId: attendance.employeeId,
                attendanceId: attendance.id,
                date: attendanceDate,
                checkIn,
                checkOut: attendance.timestamp,
                hoursWorked,
            });
            if (result.created) {
                stats.created++;
            }
            else if (result.reason === 'Jour supplémentaire déjà existant') {
                stats.existing++;
            }
            else if (result.reason?.startsWith('Erreur')) {
                stats.errors++;
            }
            else {
                stats.skipped++;
            }
        }
        this.logger.log(`[DetectSupplementaryDays] Résultat: ${stats.created} créés, ${stats.existing} existants, ${stats.skipped} ignorés, ${stats.errors} erreurs`);
        return stats;
    }
};
exports.SupplementaryDaysService = SupplementaryDaysService;
exports.SupplementaryDaysService = SupplementaryDaysService = SupplementaryDaysService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SupplementaryDaysService);
//# sourceMappingURL=supplementary-days.service.js.map