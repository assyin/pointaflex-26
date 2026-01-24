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
var DetectSupplementaryDaysJob_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DetectSupplementaryDaysJob = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../../../database/prisma.service");
const supplementary_days_service_1 = require("../supplementary-days.service");
let DetectSupplementaryDaysJob = DetectSupplementaryDaysJob_1 = class DetectSupplementaryDaysJob {
    constructor(prisma, supplementaryDaysService) {
        this.prisma = prisma;
        this.supplementaryDaysService = supplementaryDaysService;
        this.logger = new common_1.Logger(DetectSupplementaryDaysJob_1.name);
    }
    async detectSupplementaryDays() {
        this.logger.log('🔄 Démarrage du job de CONSOLIDATION des jours supplémentaires...');
        try {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            yesterday.setHours(0, 0, 0, 0);
            const yesterdayEnd = new Date(yesterday);
            yesterdayEnd.setHours(23, 59, 59, 999);
            const tenants = await this.prisma.tenant.findMany({
                select: { id: true, companyName: true },
            });
            this.logger.log(`Traitement de ${tenants.length} tenant(s)...`);
            let totalCreated = 0;
            let totalExisting = 0;
            let totalSkipped = 0;
            let totalErrors = 0;
            for (const tenant of tenants) {
                try {
                    const stats = await this.supplementaryDaysService.detectMissingSupplementaryDays(tenant.id, yesterday, yesterdayEnd);
                    totalCreated += stats.created;
                    totalExisting += stats.existing;
                    totalSkipped += stats.skipped;
                    totalErrors += stats.errors;
                    if (stats.created > 0) {
                        this.logger.warn(`⚠️ [CONSOLIDATION] ${stats.created} jour(s) supplémentaire(s) manquant(s) créé(s) pour ${tenant.companyName}`);
                    }
                }
                catch (error) {
                    this.logger.error(`Erreur lors de la consolidation des jours supp. pour le tenant ${tenant.id}:`, error);
                    totalErrors++;
                }
            }
            this.logger.log(`📊 Consolidation terminée: ${totalCreated} créés, ${totalExisting} existants, ${totalSkipped} ignorés, ${totalErrors} erreurs`);
            if (totalCreated > 0) {
                this.logger.warn(`⚠️ [FILET DE SÉCURITÉ] ${totalCreated} jour(s) supplémentaire(s) n'avaient pas été créé(s) en temps réel`);
            }
            this.logger.log('✅ Consolidation des jours supplémentaires terminée avec succès');
        }
        catch (error) {
            this.logger.error('Erreur lors de la consolidation globale des jours supp.:', error);
        }
    }
    async processDateRange(tenantId, startDate, endDate) {
        this.logger.log(`🔄 Traitement manuel pour tenant ${tenantId}: ${startDate.toISOString().split('T')[0]} → ${endDate.toISOString().split('T')[0]}`);
        return this.supplementaryDaysService.detectMissingSupplementaryDays(tenantId, startDate, endDate);
    }
};
exports.DetectSupplementaryDaysJob = DetectSupplementaryDaysJob;
__decorate([
    (0, schedule_1.Cron)('30 0 * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DetectSupplementaryDaysJob.prototype, "detectSupplementaryDays", null);
exports.DetectSupplementaryDaysJob = DetectSupplementaryDaysJob = DetectSupplementaryDaysJob_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        supplementary_days_service_1.SupplementaryDaysService])
], DetectSupplementaryDaysJob);
//# sourceMappingURL=detect-supplementary-days.job.js.map