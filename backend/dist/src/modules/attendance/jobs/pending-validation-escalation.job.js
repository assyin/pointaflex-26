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
var PendingValidationEscalationJob_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PendingValidationEscalationJob = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../../../database/prisma.service");
const mail_service_1 = require("../../mail/mail.service");
const mail_utils_1 = require("../../mail/mail.utils");
const attendance_service_1 = require("../attendance.service");
let PendingValidationEscalationJob = PendingValidationEscalationJob_1 = class PendingValidationEscalationJob {
    constructor(prisma, mailService, attendanceService) {
        this.prisma = prisma;
        this.mailService = mailService;
        this.attendanceService = attendanceService;
        this.logger = new common_1.Logger(PendingValidationEscalationJob_1.name);
    }
    async handlePendingValidationEscalations() {
        this.logger.log('🔍 Démarrage escalade PENDING_VALIDATION...');
        try {
            const tenants = await this.getActiveTenants();
            this.logger.log(`Traitement de ${tenants.length} tenant(s)...`);
            for (const tenant of tenants) {
                try {
                    await this.processTenant(tenant);
                }
                catch (error) {
                    this.logger.error(`Erreur lors du traitement escalade pour tenant ${tenant.id}:`, error);
                }
            }
            this.logger.log('✅ Escalade PENDING_VALIDATION terminée');
        }
        catch (error) {
            this.logger.error('Erreur critique dans le job escalade:', error);
        }
    }
    async getActiveTenants() {
        return this.prisma.tenant.findMany({
            include: {
                settings: {
                    select: {
                        ambiguousPunchEscalationEnabled: true,
                        ambiguousPunchEscalationCheckTime: true,
                        ambiguousPunchEscalationLevel1Hours: true,
                        ambiguousPunchEscalationLevel2Hours: true,
                        ambiguousPunchEscalationLevel3Hours: true,
                        ambiguousPunchNotifyManager: true,
                        ambiguousPunchNotifyHR: true,
                        ambiguousPunchNotifyEmployee: true,
                    },
                },
            },
        });
    }
    isScheduledTime(checkTime) {
        const now = new Date();
        const [hour] = (checkTime || '09:00').split(':').map(Number);
        return now.getHours() === hour;
    }
    async processTenant(tenant) {
        const settings = tenant.settings;
        if (!settings || settings.ambiguousPunchEscalationEnabled === false) {
            this.logger.debug(`Escalade désactivée pour tenant ${tenant.id}`);
            return;
        }
        const checkTime = settings.ambiguousPunchEscalationCheckTime || '09:00';
        if (!this.isScheduledTime(checkTime)) {
            return;
        }
        this.logger.log(`⏰ Traitement escalade pour tenant ${tenant.companyName} (${tenant.id})`);
        const result = await this.attendanceService.escalatePendingValidations(tenant.id);
        if (result.escalated > 0) {
            this.logger.log(`📊 ${result.escalated} pointage(s) escaladé(s) sur ${result.processed} en attente`);
            for (const escalation of result.escalations) {
                await this.sendEscalationNotification(tenant, escalation, settings);
            }
        }
        else if (result.processed > 0) {
            this.logger.debug(`Aucune escalade nécessaire pour ${result.processed} pointage(s) en attente`);
        }
    }
    async sendEscalationNotification(tenant, escalation, settings) {
        try {
            const attendance = await this.prisma.attendance.findUnique({
                where: { id: escalation.attendanceId },
                include: {
                    employee: {
                        include: {
                            currentShift: true,
                            department: {
                                include: {
                                    manager: {
                                        include: {
                                            user: { select: { email: true, firstName: true, lastName: true } },
                                        },
                                    },
                                },
                            },
                            site: true,
                        },
                    },
                },
            });
            if (!attendance)
                return;
            const employee = attendance.employee;
            const manager = employee.department?.manager;
            const shift = employee.currentShift;
            const templateData = {
                isEscalation: true,
                escalationLevel: escalation.newLevel,
                employeeName: `${employee.firstName} ${employee.lastName}`,
                matricule: employee.matricule,
                punchDate: attendance.timestamp.toLocaleDateString('fr-FR'),
                punchTime: attendance.timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
                punchType: attendance.type,
                shiftName: shift?.name || 'Non assigné',
                shiftHours: shift ? `${shift.startTime} - ${shift.endTime}` : '-',
                siteName: employee.site?.name,
                ambiguityReason: attendance.ambiguityReason,
                createdAt: attendance.createdAt.toLocaleString('fr-FR'),
                ageHours: escalation.ageHours,
                validationUrl: `${process.env.FRONTEND_URL || 'http://localhost:3001'}/attendance/anomalies?filter=PENDING_VALIDATION`,
            };
            if (escalation.newLevel === 1 && settings.ambiguousPunchNotifyManager && manager?.user?.email) {
                await this.sendNotificationEmail(manager.user.email, `${manager.user.firstName} ${manager.user.lastName}`, templateData, tenant);
                this.logger.log(`📧 Notification niveau 1 envoyée au manager: ${manager.user.email}`);
            }
            if (escalation.newLevel === 2 && settings.ambiguousPunchNotifyHR && tenant.hrEmail) {
                await this.sendNotificationEmail(tenant.hrEmail, 'Équipe RH', templateData, tenant);
                this.logger.log(`📧 Notification niveau 2 envoyée à la RH: ${tenant.hrEmail}`);
            }
            if (escalation.newLevel === 3) {
                if (settings.ambiguousPunchNotifyHR && tenant.hrEmail) {
                    await this.sendNotificationEmail(tenant.hrEmail, 'Équipe RH', { ...templateData, urgent: true }, tenant);
                }
                if (settings.ambiguousPunchNotifyManager && manager?.user?.email) {
                    await this.sendNotificationEmail(manager.user.email, `${manager.user.firstName} ${manager.user.lastName}`, { ...templateData, urgent: true }, tenant);
                }
                this.logger.log(`🚨 Notifications niveau 3 (urgentes) envoyées`);
            }
            if (settings.ambiguousPunchNotifyEmployee && employee.email) {
                await this.sendNotificationEmail(employee.email, `${employee.firstName} ${employee.lastName}`, { ...templateData, isEmployeeNotification: true }, tenant);
            }
        }
        catch (error) {
            this.logger.error(`Erreur envoi notification escalade: ${error.message}`);
        }
    }
    async sendNotificationEmail(to, recipientName, templateData, tenant) {
        try {
            const html = await (0, mail_utils_1.renderEmailTemplate)('pending-validation-notification', {
                ...templateData,
                recipientName,
            });
            const subject = templateData.escalationLevel === 3
                ? `🚨 URGENT: Pointage en attente de validation depuis ${templateData.ageHours}h`
                : templateData.escalationLevel === 2
                    ? `⏰ Escalade RH: Pointage non validé - ${templateData.employeeName}`
                    : `🕐 Rappel: Pointage en attente de validation - ${templateData.employeeName}`;
            await this.mailService.sendMail({
                to,
                subject,
                html,
            }, tenant.id);
        }
        catch (error) {
            this.logger.error(`Erreur envoi email à ${to}: ${error.message}`);
        }
    }
};
exports.PendingValidationEscalationJob = PendingValidationEscalationJob;
__decorate([
    (0, schedule_1.Cron)('0 * * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PendingValidationEscalationJob.prototype, "handlePendingValidationEscalations", null);
exports.PendingValidationEscalationJob = PendingValidationEscalationJob = PendingValidationEscalationJob_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        mail_service_1.MailService,
        attendance_service_1.AttendanceService])
], PendingValidationEscalationJob);
//# sourceMappingURL=pending-validation-escalation.job.js.map