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
var DataGeneratorReplacementService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataGeneratorReplacementService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
const data_generator_orchestrator_service_1 = require("./data-generator-orchestrator.service");
const client_1 = require("@prisma/client");
let DataGeneratorReplacementService = DataGeneratorReplacementService_1 = class DataGeneratorReplacementService {
    constructor(prisma, orchestrator) {
        this.prisma = prisma;
        this.orchestrator = orchestrator;
        this.logger = new common_1.Logger(DataGeneratorReplacementService_1.name);
    }
    async generateReplacements(tenantId, config) {
        this.logger.log(`🔄 Génération de ${config.count || 0} remplacements pour tenant ${tenantId}`);
        const count = config.count || 10;
        const statusDistribution = config.statusDistribution || {
            PENDING: 20,
            APPROVED: 70,
            REJECTED: 10,
        };
        const schedules = await this.prisma.schedule.findMany({
            where: { tenantId },
            include: {
                employee: true,
                shift: true,
            },
            take: count * 2,
        });
        if (schedules.length === 0) {
            this.logger.warn('⚠️ Aucun planning trouvé, impossible de créer des remplacements');
            return 0;
        }
        const employees = await this.prisma.employee.findMany({
            where: { tenantId, isActive: true },
        });
        if (employees.length < 2) {
            this.logger.warn('⚠️ Pas assez d\'employés pour créer des remplacements');
            return 0;
        }
        let created = 0;
        const total = Object.values(statusDistribution).reduce((sum, val) => sum + val, 0);
        for (let i = 0; i < Math.min(count, schedules.length); i++) {
            const schedule = schedules[i];
            const originalEmployee = schedule.employee;
            const replacementEmployees = employees.filter((e) => e.id !== originalEmployee.id);
            if (replacementEmployees.length === 0)
                continue;
            const replacementEmployee = replacementEmployees[Math.floor(Math.random() * replacementEmployees.length)];
            const random = Math.random() * total;
            let status = client_1.ReplacementStatus.PENDING;
            let cumulative = 0;
            if (random < (cumulative += statusDistribution.PENDING)) {
                status = client_1.ReplacementStatus.PENDING;
            }
            else if (random < (cumulative += statusDistribution.APPROVED)) {
                status = client_1.ReplacementStatus.APPROVED;
            }
            else {
                status = client_1.ReplacementStatus.REJECTED;
            }
            await this.prisma.shiftReplacement.create({
                data: {
                    tenantId,
                    date: schedule.date,
                    shiftId: schedule.shiftId,
                    originalEmployeeId: originalEmployee.id,
                    replacementEmployeeId: replacementEmployee.id,
                    reason: this.generateReason(),
                    status: status,
                    approvedAt: status === client_1.ReplacementStatus.APPROVED ? new Date() : undefined,
                },
            });
            created++;
            this.orchestrator.incrementEntityCount('ShiftReplacement');
        }
        this.logger.log(`✅ ${created} remplacements créés`);
        return created;
    }
    generateReason() {
        const reasons = [
            'Congé maladie',
            'Congé personnel',
            'Formation',
            'Mission',
            'Rendez-vous médical',
            'Urgence familiale',
            'Remplacement demandé',
        ];
        return reasons[Math.floor(Math.random() * reasons.length)];
    }
};
exports.DataGeneratorReplacementService = DataGeneratorReplacementService;
exports.DataGeneratorReplacementService = DataGeneratorReplacementService = DataGeneratorReplacementService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)((0, common_1.forwardRef)(() => data_generator_orchestrator_service_1.DataGeneratorOrchestratorService))),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        data_generator_orchestrator_service_1.DataGeneratorOrchestratorService])
], DataGeneratorReplacementService);
//# sourceMappingURL=data-generator-replacement.service.js.map