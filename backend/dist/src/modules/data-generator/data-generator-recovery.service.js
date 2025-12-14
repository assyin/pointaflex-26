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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var DataGeneratorRecoveryService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataGeneratorRecoveryService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
const data_generator_orchestrator_service_1 = require("./data-generator-orchestrator.service");
const client_1 = require("@prisma/client");
let DataGeneratorRecoveryService = DataGeneratorRecoveryService_1 = class DataGeneratorRecoveryService {
    constructor(prisma, orchestrator) {
        this.prisma = prisma;
        this.orchestrator = orchestrator;
        this.logger = new common_1.Logger(DataGeneratorRecoveryService_1.name);
    }
    async generateRecovery(tenantId, config) {
        this.logger.log(`🔄 Génération de récupération pour tenant ${tenantId}`);
        const count = config.count || 5;
        const convertFromOvertime = config.convertFromOvertime !== false;
        const conversionRate = config.conversionRate || 20;
        let created = 0;
        if (convertFromOvertime) {
            const overtimeToConvert = await this.prisma.overtime.findMany({
                where: {
                    tenantId,
                    status: client_1.OvertimeStatus.APPROVED,
                },
                take: Math.ceil((count * 100) / conversionRate),
            });
            for (const overtime of overtimeToConvert.slice(0, count)) {
                let hours;
                if (typeof overtime.hours === 'number') {
                    hours = overtime.hours;
                }
                else if (typeof overtime.hours === 'string') {
                    hours = parseFloat(overtime.hours);
                }
                else if (overtime.hours && typeof overtime.hours === 'object' && 'toNumber' in overtime.hours) {
                    hours = overtime.hours.toNumber();
                }
                else {
                    hours = Number(overtime.hours);
                }
                const hoursValue = Number(hours.toFixed(2));
                await this.prisma.recovery.create({
                    data: {
                        tenantId,
                        employeeId: overtime.employeeId,
                        hours: hoursValue,
                        source: 'OVERTIME',
                        usedHours: 0,
                        remainingHours: hoursValue,
                        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
                    },
                });
                created++;
                this.orchestrator.incrementEntityCount('Recovery');
            }
            this.logger.log(`✅ ${created} récupérations créées depuis overtime`);
        }
        else {
            const employees = await this.prisma.employee.findMany({
                where: { tenantId, isActive: true },
            });
            if (employees.length === 0) {
                this.logger.warn('⚠️ Aucun employé actif trouvé');
                return 0;
            }
            for (let i = 0; i < count; i++) {
                const employee = employees[Math.floor(Math.random() * employees.length)];
                const hours = 1 + Math.random() * 4;
                const hoursValue = Number(Math.max(0.5, Math.min(8, hours)).toFixed(2));
                await this.prisma.recovery.create({
                    data: {
                        tenantId,
                        employeeId: employee.id,
                        hours: hoursValue,
                        source: 'MANUAL',
                        usedHours: 0,
                        remainingHours: hoursValue,
                        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
                    },
                });
                created++;
                this.orchestrator.incrementEntityCount('Recovery');
            }
            this.logger.log(`✅ ${created} récupérations créées directement`);
        }
        return created;
    }
};
exports.DataGeneratorRecoveryService = DataGeneratorRecoveryService;
exports.DataGeneratorRecoveryService = DataGeneratorRecoveryService = DataGeneratorRecoveryService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)((0, common_1.forwardRef)(() => data_generator_orchestrator_service_1.DataGeneratorOrchestratorService))),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        data_generator_orchestrator_service_1.DataGeneratorOrchestratorService])
], DataGeneratorRecoveryService);
//# sourceMappingURL=data-generator-recovery.service.js.map