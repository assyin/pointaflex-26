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
var DataGeneratorShiftsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataGeneratorShiftsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
let DataGeneratorShiftsService = DataGeneratorShiftsService_1 = class DataGeneratorShiftsService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(DataGeneratorShiftsService_1.name);
    }
    async generateShifts(tenantId, dto) {
        this.logger.log(`Génération de shifts pour le tenant ${tenantId}`);
        const stats = {
            shiftsCreated: 0,
            shiftsAssigned: 0,
            schedulesCreated: 0,
            employeesProcessed: 0,
        };
        let shifts = await this.prisma.shift.findMany({
            where: { tenantId },
        });
        if (dto.createDefaultShifts !== false && shifts.length === 0) {
            this.logger.log('Création des shifts par défaut...');
            const defaultShifts = [
                {
                    name: 'Équipe du Matin',
                    code: 'MATIN',
                    startTime: '08:00',
                    endTime: '17:00',
                    breakDuration: 60,
                    isNightShift: false,
                    color: '#3b82f6',
                },
                {
                    name: 'Équipe du Soir',
                    code: 'SOIR',
                    startTime: '14:00',
                    endTime: '22:00',
                    breakDuration: 60,
                    isNightShift: false,
                    color: '#f59e0b',
                },
                {
                    name: 'Équipe de Nuit',
                    code: 'NUIT',
                    startTime: '22:00',
                    endTime: '06:00',
                    breakDuration: 60,
                    isNightShift: true,
                    color: '#6366f1',
                },
            ];
            for (const shiftData of defaultShifts) {
                const shift = await this.prisma.shift.create({
                    data: {
                        ...shiftData,
                        tenantId,
                    },
                });
                shifts.push(shift);
                stats.shiftsCreated++;
            }
            this.logger.log(`${stats.shiftsCreated} shifts créés`);
        }
        if (shifts.length === 0) {
            throw new common_1.BadRequestException('Aucun shift disponible. Créez des shifts d\'abord.');
        }
        const employees = await this.prisma.employee.findMany({
            where: {
                tenantId,
                isActive: true,
            },
        });
        if (employees.length === 0) {
            throw new common_1.BadRequestException('Aucun employé actif trouvé');
        }
        this.logger.log(`${employees.length} employés trouvés`);
        if (dto.distribution && Object.keys(dto.distribution).length > 0) {
            const total = Object.values(dto.distribution).reduce((sum, val) => sum + Number(val), 0);
            if (Math.abs(total - 100) > 0.01) {
                throw new common_1.BadRequestException('La somme des pourcentages de distribution doit être égale à 100');
            }
            const shiftWeights = [];
            for (const [shiftId, percentage] of Object.entries(dto.distribution)) {
                const shift = shifts.find(s => s.id === shiftId);
                if (!shift) {
                    throw new common_1.BadRequestException(`Shift avec ID ${shiftId} non trouvé`);
                }
                shiftWeights.push({ shift, weight: Number(percentage) });
            }
            for (const employee of employees) {
                const random = Math.random() * 100;
                let cumulative = 0;
                for (const { shift, weight } of shiftWeights) {
                    cumulative += weight;
                    if (random <= cumulative) {
                        await this.prisma.employee.update({
                            where: { id: employee.id },
                            data: { currentShiftId: shift.id },
                        });
                        stats.shiftsAssigned++;
                        break;
                    }
                }
            }
        }
        else {
            const shiftsPerEmployee = Math.ceil(shifts.length / employees.length);
            let shiftIndex = 0;
            for (const employee of employees) {
                const shift = shifts[shiftIndex % shifts.length];
                await this.prisma.employee.update({
                    where: { id: employee.id },
                    data: { currentShiftId: shift.id },
                });
                stats.shiftsAssigned++;
                shiftIndex++;
            }
        }
        this.logger.log(`${stats.shiftsAssigned} shifts assignés`);
        if (dto.createSchedules && dto.scheduleStartDate && dto.scheduleEndDate) {
            this.logger.warn('⚠️ La création de plannings via le générateur de shifts est dépréciée. ' +
                'Utilisez le générateur de plannings dédié (/data-generator/schedules/generate) pour une meilleure flexibilité.');
            const startDate = new Date(dto.scheduleStartDate);
            const endDate = new Date(dto.scheduleEndDate);
            if (startDate > endDate) {
                throw new common_1.BadRequestException('La date de début doit être avant la date de fin');
            }
            this.logger.log(`Création de plannings du ${dto.scheduleStartDate} au ${dto.scheduleEndDate}`);
            const currentDate = new Date(startDate);
            while (currentDate <= endDate) {
                const dateStr = currentDate.toISOString().split('T')[0];
                for (const employee of employees) {
                    if (!employee.currentShiftId)
                        continue;
                    const existing = await this.prisma.schedule.findFirst({
                        where: {
                            tenantId,
                            employeeId: employee.id,
                            date: new Date(dateStr),
                        },
                    });
                    if (!existing) {
                        await this.prisma.schedule.create({
                            data: {
                                tenantId,
                                employeeId: employee.id,
                                shiftId: employee.currentShiftId,
                                date: new Date(dateStr),
                            },
                        });
                        stats.schedulesCreated++;
                    }
                }
                currentDate.setDate(currentDate.getDate() + 1);
            }
            this.logger.log(`${stats.schedulesCreated} plannings créés`);
        }
        stats.employeesProcessed = employees.length;
        return {
            success: true,
            ...stats,
            shifts: shifts.map(s => ({
                id: s.id,
                name: s.name,
                code: s.code,
                startTime: s.startTime,
                endTime: s.endTime,
            })),
        };
    }
    async getShiftsStats(tenantId) {
        const shifts = await this.prisma.shift.findMany({
            where: { tenantId },
            include: {
                _count: {
                    select: {
                        employees: true,
                        schedules: true,
                    },
                },
            },
        });
        const employees = await this.prisma.employee.findMany({
            where: {
                tenantId,
                isActive: true,
            },
            select: {
                id: true,
                currentShiftId: true,
            },
        });
        const employeesWithShift = employees.filter(e => e.currentShiftId !== null).length;
        const employeesWithoutShift = employees.length - employeesWithShift;
        return {
            totalShifts: shifts.length,
            totalEmployees: employees.length,
            employeesWithShift,
            employeesWithoutShift,
            shifts: shifts.map(shift => ({
                id: shift.id,
                name: shift.name,
                code: shift.code,
                startTime: shift.startTime,
                endTime: shift.endTime,
                employeesCount: shift._count.employees,
                schedulesCount: shift._count.schedules,
            })),
        };
    }
};
exports.DataGeneratorShiftsService = DataGeneratorShiftsService;
exports.DataGeneratorShiftsService = DataGeneratorShiftsService = DataGeneratorShiftsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DataGeneratorShiftsService);
//# sourceMappingURL=data-generator-shifts.service.js.map