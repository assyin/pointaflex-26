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
var DataGeneratorLeavesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataGeneratorLeavesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
const client_1 = require("@prisma/client");
let DataGeneratorLeavesService = DataGeneratorLeavesService_1 = class DataGeneratorLeavesService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(DataGeneratorLeavesService_1.name);
    }
    async generateLeaves(tenantId, dto) {
        this.logger.log(`Génération de congés pour le tenant ${tenantId}`);
        const stats = {
            leaveTypesCreated: 0,
            leavesCreated: 0,
            leavesSkipped: 0,
            employeesProcessed: 0,
        };
        const defaultLeaveTypes = [
            { name: 'Congé Annuel', code: 'CA', isPaid: true, requiresDocument: false },
            { name: 'Maladie', code: 'MAL', isPaid: true, requiresDocument: true },
            { name: 'Maternité', code: 'MAT', isPaid: true, requiresDocument: true },
            { name: 'Congé Sans Solde', code: 'CSS', isPaid: false, requiresDocument: false },
        ];
        const existingLeaveTypes = await this.prisma.leaveType.findMany({
            where: { tenantId },
        });
        const leaveTypesMap = new Map(existingLeaveTypes.map(lt => [lt.code, lt]));
        for (const defaultType of defaultLeaveTypes) {
            if (!leaveTypesMap.has(defaultType.code)) {
                const leaveType = await this.prisma.leaveType.create({
                    data: {
                        ...defaultType,
                        tenantId,
                    },
                });
                leaveTypesMap.set(defaultType.code, leaveType);
                stats.leaveTypesCreated++;
            }
        }
        const availableLeaveTypes = Array.from(leaveTypesMap.values());
        if (availableLeaveTypes.length === 0) {
            throw new common_1.BadRequestException('Aucun type de congé disponible');
        }
        let leaveTypesToUse = availableLeaveTypes;
        if (dto.leaveTypeIds && dto.leaveTypeIds.length > 0) {
            leaveTypesToUse = availableLeaveTypes.filter(lt => dto.leaveTypeIds.includes(lt.id));
            if (leaveTypesToUse.length === 0) {
                throw new common_1.BadRequestException('Aucun type de congé valide trouvé parmi les IDs spécifiés');
            }
        }
        this.logger.log(`${leaveTypesToUse.length} type(s) de congé disponible(s)`);
        const employees = await this.prisma.employee.findMany({
            where: {
                tenantId,
                isActive: true,
            },
        });
        if (employees.length === 0) {
            throw new common_1.BadRequestException('Aucun employé actif trouvé');
        }
        this.logger.log(`${employees.length} employé(s) trouvé(s)`);
        const percentage = dto.percentage || 30;
        const numberOfEmployees = Math.ceil((employees.length * percentage) / 100);
        const selectedEmployees = this.shuffleArray([...employees]).slice(0, numberOfEmployees);
        this.logger.log(`${selectedEmployees.length} employé(s) sélectionné(s) pour générer des congés`);
        const startDate = new Date(dto.startDate);
        const endDate = new Date(dto.endDate);
        if (startDate > endDate) {
            throw new common_1.BadRequestException('La date de début doit être avant la date de fin');
        }
        const periodDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const averageDays = dto.averageDaysPerEmployee || 5;
        const status = dto.autoApprove !== false ? client_1.LeaveStatus.APPROVED : client_1.LeaveStatus.PENDING;
        for (const employee of selectedEmployees) {
            const numberOfLeaves = Math.floor(Math.random() * 3) + 1;
            for (let i = 0; i < numberOfLeaves; i++) {
                const leaveType = leaveTypesToUse[Math.floor(Math.random() * leaveTypesToUse.length)];
                const randomDay = Math.floor(Math.random() * periodDays);
                const leaveStartDate = new Date(startDate);
                leaveStartDate.setDate(leaveStartDate.getDate() + randomDay);
                const duration = Math.floor(Math.random() * averageDays) + 1;
                const leaveEndDate = new Date(leaveStartDate);
                leaveEndDate.setDate(leaveEndDate.getDate() + duration - 1);
                if (leaveEndDate > endDate) {
                    leaveEndDate.setTime(endDate.getTime());
                    leaveStartDate.setTime(leaveEndDate.getTime() - (duration - 1) * 24 * 60 * 60 * 1000);
                    if (leaveStartDate < startDate) {
                        leaveStartDate.setTime(startDate.getTime());
                    }
                }
                const overlapping = await this.prisma.leave.findFirst({
                    where: {
                        employeeId: employee.id,
                        status: {
                            notIn: [client_1.LeaveStatus.REJECTED, client_1.LeaveStatus.CANCELLED],
                        },
                        OR: [
                            {
                                startDate: { lte: leaveEndDate },
                                endDate: { gte: leaveStartDate },
                            },
                        ],
                    },
                });
                if (overlapping) {
                    stats.leavesSkipped++;
                    continue;
                }
                await this.prisma.leave.create({
                    data: {
                        tenantId,
                        employeeId: employee.id,
                        leaveTypeId: leaveType.id,
                        startDate: leaveStartDate,
                        endDate: leaveEndDate,
                        days: duration,
                        status,
                        reason: `Congé généré automatiquement - ${leaveType.name}`,
                    },
                });
                stats.leavesCreated++;
            }
        }
        stats.employeesProcessed = selectedEmployees.length;
        this.logger.log(`${stats.leavesCreated} congé(s) créé(s), ${stats.leavesSkipped} ignoré(s) (chevauchement)`);
        return {
            success: true,
            ...stats,
        };
    }
    async getLeavesStats(tenantId) {
        const leaveTypes = await this.prisma.leaveType.findMany({
            where: { tenantId },
            include: {
                _count: {
                    select: {
                        leaves: true,
                    },
                },
            },
        });
        const leaves = await this.prisma.leave.findMany({
            where: { tenantId },
            select: {
                status: true,
                days: true,
            },
        });
        const byStatus = {};
        let totalDays = 0;
        leaves.forEach(leave => {
            byStatus[leave.status] = (byStatus[leave.status] || 0) + 1;
            totalDays += Number(leave.days);
        });
        return {
            totalLeaveTypes: leaveTypes.length,
            totalLeaves: leaves.length,
            totalDays,
            byStatus,
            leaveTypes: leaveTypes.map(lt => ({
                id: lt.id,
                name: lt.name,
                code: lt.code,
                isPaid: lt.isPaid,
                leavesCount: lt._count.leaves,
            })),
        };
    }
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
};
exports.DataGeneratorLeavesService = DataGeneratorLeavesService;
exports.DataGeneratorLeavesService = DataGeneratorLeavesService = DataGeneratorLeavesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DataGeneratorLeavesService);
//# sourceMappingURL=data-generator-leaves.service.js.map