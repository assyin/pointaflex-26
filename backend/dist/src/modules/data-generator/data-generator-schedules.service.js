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
var DataGeneratorSchedulesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataGeneratorSchedulesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
let DataGeneratorSchedulesService = DataGeneratorSchedulesService_1 = class DataGeneratorSchedulesService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(DataGeneratorSchedulesService_1.name);
    }
    async generateSchedules(tenantId, dto) {
        this.logger.log(`Génération de plannings pour le tenant ${tenantId} du ${dto.startDate} au ${dto.endDate}`);
        const stats = {
            schedulesCreated: 0,
            schedulesSkipped: 0,
            employeesProcessed: 0,
            weekendsExcluded: 0,
            holidaysExcluded: 0,
        };
        const startDate = new Date(dto.startDate);
        const endDate = new Date(dto.endDate);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        if (startDate > endDate) {
            throw new common_1.BadRequestException('La date de début doit être antérieure à la date de fin');
        }
        let employees = await this.prisma.employee.findMany({
            where: {
                tenantId,
                isActive: true,
                ...(dto.employeeIds && dto.employeeIds.length > 0
                    ? { id: { in: dto.employeeIds } }
                    : {}),
            },
            include: {
                currentShift: true,
            },
        });
        if (employees.length === 0) {
            throw new common_1.BadRequestException('Aucun employé actif trouvé');
        }
        let shifts = await this.prisma.shift.findMany({
            where: {
                tenantId,
                ...(dto.shiftIds && dto.shiftIds.length > 0
                    ? { id: { in: dto.shiftIds } }
                    : {}),
            },
        });
        if (shifts.length === 0) {
            throw new common_1.BadRequestException('Aucun shift trouvé. Veuillez d\'abord créer des shifts.');
        }
        const excludeHolidays = dto.excludeHolidays !== false;
        let holidays = [];
        if (excludeHolidays) {
            holidays = await this.prisma.holiday.findMany({
                where: {
                    tenantId,
                    date: {
                        gte: startDate,
                        lte: endDate,
                    },
                },
            });
            this.logger.log(`${holidays.length} jours fériés trouvés pour exclusion`);
        }
        const existingSchedules = await this.prisma.schedule.findMany({
            where: {
                tenantId,
                date: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            select: {
                employeeId: true,
                date: true,
                shiftId: true,
            },
        });
        const existingMap = new Map();
        existingSchedules.forEach(s => {
            const key = `${s.employeeId}-${s.date.toISOString().split('T')[0]}-${s.shiftId}`;
            existingMap.set(key, true);
        });
        const shiftDistribution = dto.shiftDistribution || {};
        const workDaysPercentage = dto.workDaysPercentage || 80;
        const excludeWeekends = dto.excludeWeekends !== false;
        const dates = [];
        const currentDate = new Date(startDate);
        while (currentDate <= endDate) {
            const dayOfWeek = currentDate.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            if (excludeWeekends && isWeekend) {
                stats.weekendsExcluded++;
                currentDate.setDate(currentDate.getDate() + 1);
                continue;
            }
            const isHoliday = holidays.some(h => {
                const holidayDate = new Date(h.date);
                return holidayDate.toDateString() === currentDate.toDateString();
            });
            if (excludeHolidays && isHoliday) {
                stats.holidaysExcluded++;
                currentDate.setDate(currentDate.getDate() + 1);
                continue;
            }
            dates.push(new Date(currentDate));
            currentDate.setDate(currentDate.getDate() + 1);
        }
        this.logger.log(`${dates.length} jours à traiter (après exclusions)`);
        for (const employee of employees) {
            stats.employeesProcessed++;
            let assignedShift = employee.currentShift;
            if (assignedShift) {
                this.logger.debug(`Utilisation du shift assigné (${assignedShift.name}) pour l'employé ${employee.id}`);
            }
            else {
                if (Object.keys(shiftDistribution).length > 0) {
                    const random = Math.random() * 100;
                    let cumulative = 0;
                    for (const [shiftId, percentage] of Object.entries(shiftDistribution)) {
                        cumulative += Number(percentage);
                        if (random <= cumulative) {
                            assignedShift = shifts.find(s => s.id === shiftId);
                            this.logger.debug(`Assignation via distribution: ${assignedShift?.name} pour l'employé ${employee.id}`);
                            break;
                        }
                    }
                }
                if (!assignedShift && dto.shiftIds && dto.shiftIds.length > 0) {
                    const availableShifts = shifts.filter(s => dto.shiftIds.includes(s.id));
                    if (availableShifts.length > 0) {
                        assignedShift = availableShifts[Math.floor(Math.random() * availableShifts.length)];
                        this.logger.debug(`Assignation aléatoire parmi shifts sélectionnés: ${assignedShift.name} pour l'employé ${employee.id}`);
                    }
                }
                if (!assignedShift) {
                    if (shifts.length === 0) {
                        this.logger.warn(`Aucun shift disponible pour l'employé ${employee.id} - employé ignoré`);
                        continue;
                    }
                    assignedShift = shifts[Math.floor(Math.random() * shifts.length)];
                    this.logger.debug(`Assignation aléatoire: ${assignedShift.name} pour l'employé ${employee.id}`);
                }
            }
            if (!assignedShift) {
                this.logger.warn(`Impossible d'assigner un shift à l'employé ${employee.id} - employé ignoré`);
                continue;
            }
            for (const date of dates) {
                if (Math.random() * 100 > workDaysPercentage) {
                    continue;
                }
                const dateKey = date.toISOString().split('T')[0];
                const existingKey = `${employee.id}-${dateKey}-${assignedShift.id}`;
                if (existingMap.has(existingKey)) {
                    stats.schedulesSkipped++;
                    continue;
                }
                try {
                    await this.prisma.schedule.create({
                        data: {
                            tenantId,
                            employeeId: employee.id,
                            shiftId: assignedShift.id,
                            date: new Date(date),
                        },
                    });
                    stats.schedulesCreated++;
                    existingMap.set(existingKey, true);
                }
                catch (error) {
                    this.logger.warn(`Erreur lors de la création du planning pour ${employee.id} le ${dateKey}: ${error.message}`);
                    stats.schedulesSkipped++;
                }
            }
        }
        this.logger.log(`Génération terminée: ${stats.schedulesCreated} créés, ${stats.schedulesSkipped} ignorés, ` +
            `${stats.weekendsExcluded} weekends exclus, ${stats.holidaysExcluded} jours fériés exclus`);
        return {
            success: true,
            ...stats,
        };
    }
    async getSchedulesStats(tenantId) {
        const totalSchedules = await this.prisma.schedule.count({
            where: { tenantId },
        });
        const schedulesByShift = await this.prisma.schedule.groupBy({
            by: ['shiftId'],
            where: { tenantId },
            _count: true,
        });
        const schedulesByEmployee = await this.prisma.schedule.groupBy({
            by: ['employeeId'],
            where: { tenantId },
            _count: true,
        });
        const shiftIds = schedulesByShift.map(s => s.shiftId);
        const shifts = await this.prisma.shift.findMany({
            where: {
                id: { in: shiftIds },
                tenantId,
            },
            select: {
                id: true,
                name: true,
                code: true,
            },
        });
        const shiftMap = new Map(shifts.map(s => [s.id, s]));
        return {
            totalSchedules,
            byShift: schedulesByShift.map(s => ({
                shiftId: s.shiftId,
                shiftName: shiftMap.get(s.shiftId)?.name || 'Inconnu',
                shiftCode: shiftMap.get(s.shiftId)?.code || '',
                count: s._count,
            })),
            employeesWithSchedules: schedulesByEmployee.length,
            averageSchedulesPerEmployee: schedulesByEmployee.length > 0
                ? Math.round(totalSchedules / schedulesByEmployee.length)
                : 0,
        };
    }
    async cleanSchedules(tenantId, startDate, endDate) {
        const where = { tenantId };
        if (startDate || endDate) {
            where.date = {};
            if (startDate) {
                where.date.gte = new Date(startDate);
            }
            if (endDate) {
                where.date.lte = new Date(endDate);
            }
        }
        const result = await this.prisma.schedule.deleteMany({ where });
        return {
            success: true,
            deletedCount: result.count,
        };
    }
};
exports.DataGeneratorSchedulesService = DataGeneratorSchedulesService;
exports.DataGeneratorSchedulesService = DataGeneratorSchedulesService = DataGeneratorSchedulesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DataGeneratorSchedulesService);
//# sourceMappingURL=data-generator-schedules.service.js.map