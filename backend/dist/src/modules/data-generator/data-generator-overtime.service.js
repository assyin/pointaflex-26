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
var DataGeneratorOvertimeService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataGeneratorOvertimeService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
const data_generator_orchestrator_service_1 = require("./data-generator-orchestrator.service");
const client_1 = require("@prisma/client");
let DataGeneratorOvertimeService = DataGeneratorOvertimeService_1 = class DataGeneratorOvertimeService {
    constructor(prisma, orchestrator) {
        this.prisma = prisma;
        this.orchestrator = orchestrator;
        this.logger = new common_1.Logger(DataGeneratorOvertimeService_1.name);
    }
    async generateOvertime(tenantId, config) {
        this.logger.log(`⏰ Génération de ${config.count || 0} heures supplémentaires pour tenant ${tenantId}`);
        const count = config.count || 10;
        const averageHours = config.averageHours || 2;
        const statusDistribution = config.statusDistribution || {
            PENDING: 30,
            APPROVED: 60,
            REJECTED: 10,
        };
        const employees = await this.prisma.employee.findMany({
            where: { tenantId, isActive: true },
        });
        if (employees.length === 0) {
            this.logger.warn('⚠️ Aucun employé actif trouvé');
            return 0;
        }
        let created = 0;
        const total = Object.values(statusDistribution).reduce((sum, val) => sum + val, 0);
        for (let i = 0; i < count; i++) {
            const employee = employees[Math.floor(Math.random() * employees.length)];
            const random = Math.random() * total;
            let status = client_1.OvertimeStatus.PENDING;
            let cumulative = 0;
            if (random < (cumulative += statusDistribution.PENDING)) {
                status = client_1.OvertimeStatus.PENDING;
            }
            else if (random < (cumulative += statusDistribution.APPROVED)) {
                status = client_1.OvertimeStatus.APPROVED;
            }
            else {
                status = client_1.OvertimeStatus.REJECTED;
            }
            const date = this.generateRandomDate(-90, 0);
            const hours = averageHours + (Math.random() * 4 - 2);
            const hoursValue = Number(Math.max(0.5, Math.min(8, hours)).toFixed(2));
            await this.prisma.overtime.create({
                data: {
                    tenantId,
                    employeeId: employee.id,
                    date,
                    hours: hoursValue,
                    status,
                    approvedAt: status === client_1.OvertimeStatus.APPROVED ? new Date() : undefined,
                    approvedBy: status === client_1.OvertimeStatus.APPROVED ? undefined : undefined,
                },
            });
            created++;
            this.orchestrator.incrementEntityCount('Overtime');
        }
        this.logger.log(`✅ ${created} heures supplémentaires créées`);
        return created;
    }
    generateRandomDate(daysAgo, daysAhead) {
        const now = new Date();
        const start = new Date(now);
        start.setDate(start.getDate() + daysAgo);
        const end = new Date(now);
        end.setDate(end.getDate() + daysAhead);
        const randomTime = start.getTime() + Math.random() * (end.getTime() - start.getTime());
        return new Date(randomTime);
    }
};
exports.DataGeneratorOvertimeService = DataGeneratorOvertimeService;
exports.DataGeneratorOvertimeService = DataGeneratorOvertimeService = DataGeneratorOvertimeService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)((0, common_1.forwardRef)(() => data_generator_orchestrator_service_1.DataGeneratorOrchestratorService))),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        data_generator_orchestrator_service_1.DataGeneratorOrchestratorService])
], DataGeneratorOvertimeService);
//# sourceMappingURL=data-generator-overtime.service.js.map