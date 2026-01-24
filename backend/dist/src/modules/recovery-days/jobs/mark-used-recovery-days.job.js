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
var MarkUsedRecoveryDaysJob_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarkUsedRecoveryDaysJob = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../../../database/prisma.service");
const client_1 = require("@prisma/client");
let MarkUsedRecoveryDaysJob = MarkUsedRecoveryDaysJob_1 = class MarkUsedRecoveryDaysJob {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(MarkUsedRecoveryDaysJob_1.name);
    }
    async markPastRecoveryDaysAsUsed() {
        this.logger.log('Démarrage du job de marquage des récupérations passées...');
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const pastApprovedRecoveryDays = await this.prisma.recoveryDay.findMany({
                where: {
                    status: client_1.RecoveryDayStatus.APPROVED,
                    endDate: {
                        lt: today,
                    },
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
            let usedCount = 0;
            for (const recoveryDay of pastApprovedRecoveryDays) {
                try {
                    await this.prisma.recoveryDay.update({
                        where: { id: recoveryDay.id },
                        data: {
                            status: client_1.RecoveryDayStatus.USED,
                            updatedAt: new Date(),
                        },
                    });
                    this.logger.debug(`Récupération APPROVED → USED: ${recoveryDay.employee.firstName} ${recoveryDay.employee.lastName}`);
                    usedCount++;
                }
                catch (error) {
                    this.logger.error(`Erreur marquage USED ${recoveryDay.id}:`, error);
                }
            }
            const pastPendingRecoveryDays = await this.prisma.recoveryDay.findMany({
                where: {
                    status: client_1.RecoveryDayStatus.PENDING,
                    endDate: {
                        lt: today,
                    },
                },
            });
            let cancelledCount = 0;
            for (const recoveryDay of pastPendingRecoveryDays) {
                try {
                    const linkedOvertimes = await this.prisma.overtimeRecoveryDay.findMany({
                        where: { recoveryDayId: recoveryDay.id },
                        select: { overtimeId: true, hoursUsed: true },
                    });
                    await this.prisma.$transaction(async (tx) => {
                        for (const link of linkedOvertimes) {
                            const hoursToRestore = Number(link.hoursUsed || 0);
                            if (hoursToRestore > 0) {
                                const currentOvertime = await tx.overtime.findUnique({
                                    where: { id: link.overtimeId },
                                    select: { convertedHoursToRecoveryDays: true },
                                });
                                const currentConverted = Number(currentOvertime?.convertedHoursToRecoveryDays || 0);
                                const newConverted = Math.max(0, currentConverted - hoursToRestore);
                                await tx.overtime.update({
                                    where: { id: link.overtimeId },
                                    data: {
                                        status: 'APPROVED',
                                        convertedHoursToRecoveryDays: newConverted,
                                        updatedAt: new Date(),
                                    },
                                });
                            }
                            else {
                                await tx.overtime.update({
                                    where: { id: link.overtimeId },
                                    data: {
                                        status: 'APPROVED',
                                        updatedAt: new Date(),
                                    },
                                });
                            }
                        }
                        await tx.overtimeRecoveryDay.deleteMany({
                            where: { recoveryDayId: recoveryDay.id },
                        });
                        await tx.recoveryDay.update({
                            where: { id: recoveryDay.id },
                            data: {
                                status: client_1.RecoveryDayStatus.CANCELLED,
                                notes: (recoveryDay.notes || '') +
                                    `\n[Auto-annulé le ${new Date().toISOString().split('T')[0]}] Expirée - non approuvée avant la date de récupération`,
                                updatedAt: new Date(),
                            },
                        });
                    });
                    this.logger.debug(`Récupération PENDING → CANCELLED (expirée): employeeId=${recoveryDay.employeeId}`);
                    cancelledCount++;
                }
                catch (error) {
                    this.logger.error(`Erreur annulation ${recoveryDay.id}:`, error);
                }
            }
            this.logger.log(`Job terminé: ${usedCount} → USED, ${cancelledCount} → CANCELLED (expirées)`);
        }
        catch (error) {
            this.logger.error('Erreur lors du job de marquage des récupérations:', error);
        }
    }
    async markRecoveryDayAsUsed(recoveryDayId) {
        try {
            const recoveryDay = await this.prisma.recoveryDay.findUnique({
                where: { id: recoveryDayId },
            });
            if (!recoveryDay) {
                this.logger.warn(`Récupération non trouvée: ${recoveryDayId}`);
                return false;
            }
            if (recoveryDay.status !== client_1.RecoveryDayStatus.APPROVED) {
                this.logger.warn(`La récupération ${recoveryDayId} n'est pas en statut APPROVED (statut actuel: ${recoveryDay.status})`);
                return false;
            }
            await this.prisma.recoveryDay.update({
                where: { id: recoveryDayId },
                data: {
                    status: client_1.RecoveryDayStatus.USED,
                    updatedAt: new Date(),
                },
            });
            this.logger.log(`Récupération ${recoveryDayId} marquée comme USED`);
            return true;
        }
        catch (error) {
            this.logger.error(`Erreur lors du marquage manuel de la récupération ${recoveryDayId}:`, error);
            return false;
        }
    }
    async markPastRecoveryDaysForTenant(tenantId) {
        this.logger.log(`Marquage des récupérations passées pour le tenant ${tenantId}...`);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const result = await this.prisma.recoveryDay.updateMany({
            where: {
                tenantId,
                status: client_1.RecoveryDayStatus.APPROVED,
                endDate: {
                    lt: today,
                },
            },
            data: {
                status: client_1.RecoveryDayStatus.USED,
                updatedAt: new Date(),
            },
        });
        this.logger.log(`${result.count} récupération(s) marquée(s) comme USED pour le tenant ${tenantId}`);
        return result;
    }
};
exports.MarkUsedRecoveryDaysJob = MarkUsedRecoveryDaysJob;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_2AM),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MarkUsedRecoveryDaysJob.prototype, "markPastRecoveryDaysAsUsed", null);
exports.MarkUsedRecoveryDaysJob = MarkUsedRecoveryDaysJob = MarkUsedRecoveryDaysJob_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], MarkUsedRecoveryDaysJob);
//# sourceMappingURL=mark-used-recovery-days.job.js.map