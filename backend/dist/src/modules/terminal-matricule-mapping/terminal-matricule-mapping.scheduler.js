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
var TerminalMatriculeMappingScheduler_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TerminalMatriculeMappingScheduler = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../../database/prisma.service");
const terminal_matricule_mapping_service_1 = require("./terminal-matricule-mapping.service");
const client_1 = require("@prisma/client");
let TerminalMatriculeMappingScheduler = TerminalMatriculeMappingScheduler_1 = class TerminalMatriculeMappingScheduler {
    constructor(prisma, mappingService) {
        this.prisma = prisma;
        this.mappingService = mappingService;
        this.logger = new common_1.Logger(TerminalMatriculeMappingScheduler_1.name);
    }
    async checkExpiringTemporaryMatricules() {
        this.logger.log('🔍 Vérification des matricules temporaires expirés/expirant...');
        try {
            const tenants = await this.prisma.tenant.findMany({
                select: {
                    id: true,
                    companyName: true,
                },
            });
            for (const tenant of tenants) {
                try {
                    const settings = await this.prisma.tenantSettings.findUnique({
                        where: { tenantId: tenant.id },
                        select: { temporaryMatriculeExpiryDays: true },
                    });
                    const expiryDays = settings?.temporaryMatriculeExpiryDays || 8;
                    const expiringMatricules = await this.mappingService.getExpiringTemporaryMatricules(tenant.id, expiryDays);
                    if (expiringMatricules.length === 0) {
                        this.logger.log(`✅ Aucun matricule temporaire expiré/expirant pour le tenant ${tenant.companyName}`);
                        continue;
                    }
                    this.logger.warn(`⚠️  ${expiringMatricules.length} employé(s) avec matricule temporaire expiré/expirant pour ${tenant.companyName}`);
                    for (const mapping of expiringMatricules) {
                        const daysSince = mapping.daysSinceAssignment;
                        const isExpired = daysSince >= expiryDays;
                        const isExpiring = daysSince >= expiryDays - 1;
                        const hrUsers = await this.prisma.user.findMany({
                            where: {
                                tenantId: tenant.id,
                                userTenantRoles: {
                                    some: {
                                        role: {
                                            code: {
                                                in: ['ADMIN_RH', 'MANAGER'],
                                            },
                                        },
                                    },
                                },
                                isActive: true,
                            },
                            select: {
                                id: true,
                                email: true,
                                employee: {
                                    select: {
                                        id: true,
                                    },
                                },
                            },
                        });
                        for (const hrUser of hrUsers) {
                            if (!hrUser.employee?.id) {
                                this.logger.warn(`⚠️  Utilisateur RH ${hrUser.email} n'a pas d'employé associé, notification non envoyée`);
                                continue;
                            }
                            const notificationType = isExpired
                                ? client_1.NotificationType.TEMPORARY_MATRICULE_EXPIRED
                                : client_1.NotificationType.TEMPORARY_MATRICULE_EXPIRING;
                            const message = isExpired
                                ? `⚠️ Le matricule temporaire de ${mapping.employee.firstName} ${mapping.employee.lastName} (${mapping.terminalMatricule}) a expiré depuis ${daysSince - expiryDays} jour(s). Veuillez assigner un matricule officiel.`
                                : `⏰ Le matricule temporaire de ${mapping.employee.firstName} ${mapping.employee.lastName} (${mapping.terminalMatricule}) expire dans ${expiryDays - daysSince} jour(s). Veuillez assigner un matricule officiel.`;
                            await this.prisma.notification.create({
                                data: {
                                    tenantId: tenant.id,
                                    employeeId: hrUser.employee.id,
                                    type: notificationType,
                                    title: isExpired
                                        ? 'Matricule temporaire expiré'
                                        : 'Matricule temporaire expirant',
                                    message: message,
                                    isRead: false,
                                },
                            });
                        }
                        this.logger.log(`📧 Notifications envoyées pour ${mapping.employee.firstName} ${mapping.employee.lastName} (${mapping.terminalMatricule})`);
                    }
                }
                catch (error) {
                    this.logger.error(`❌ Erreur lors de la vérification pour le tenant ${tenant.companyName}: ${error.message}`);
                }
            }
            this.logger.log('✅ Vérification des matricules temporaires terminée');
        }
        catch (error) {
            this.logger.error(`❌ Erreur lors de la vérification des matricules temporaires: ${error.message}`);
        }
    }
};
exports.TerminalMatriculeMappingScheduler = TerminalMatriculeMappingScheduler;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_8AM),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TerminalMatriculeMappingScheduler.prototype, "checkExpiringTemporaryMatricules", null);
exports.TerminalMatriculeMappingScheduler = TerminalMatriculeMappingScheduler = TerminalMatriculeMappingScheduler_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        terminal_matricule_mapping_service_1.TerminalMatriculeMappingService])
], TerminalMatriculeMappingScheduler);
//# sourceMappingURL=terminal-matricule-mapping.scheduler.js.map