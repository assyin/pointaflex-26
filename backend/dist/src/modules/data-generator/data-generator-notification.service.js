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
var DataGeneratorNotificationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataGeneratorNotificationService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
const data_generator_orchestrator_service_1 = require("./data-generator-orchestrator.service");
const client_1 = require("@prisma/client");
let DataGeneratorNotificationService = DataGeneratorNotificationService_1 = class DataGeneratorNotificationService {
    constructor(prisma, orchestrator) {
        this.prisma = prisma;
        this.orchestrator = orchestrator;
        this.logger = new common_1.Logger(DataGeneratorNotificationService_1.name);
    }
    async generateNotifications(tenantId, config) {
        this.logger.log(`🔔 Génération de ${config.count || 0} notifications pour tenant ${tenantId}`);
        const count = config.count || 20;
        const types = config.types || [
            { type: client_1.NotificationType.LEAVE_APPROVED, count: 5 },
            { type: client_1.NotificationType.LEAVE_REJECTED, count: 2 },
            { type: client_1.NotificationType.OVERTIME_APPROVED, count: 3 },
            { type: client_1.NotificationType.SHIFT_CHANGE, count: 1 },
            { type: client_1.NotificationType.SCHEDULE_UPDATED, count: 4 },
            { type: client_1.NotificationType.REPLACEMENT_REQUEST, count: 3 },
            { type: client_1.NotificationType.ALERT_LEGAL, count: 2 },
        ];
        const employees = await this.prisma.employee.findMany({
            where: { tenantId, isActive: true },
        });
        if (employees.length === 0) {
            this.logger.warn('⚠️ Aucun employé actif trouvé');
            return 0;
        }
        let created = 0;
        for (const typeConfig of types) {
            for (let i = 0; i < typeConfig.count && created < count; i++) {
                const employee = employees[Math.floor(Math.random() * employees.length)];
                await this.prisma.notification.create({
                    data: {
                        tenantId,
                        employeeId: employee.id,
                        type: typeConfig.type,
                        title: this.generateTitle(typeConfig.type),
                        message: this.generateMessage(typeConfig.type),
                        isRead: Math.random() > 0.5,
                        createdAt: this.generateRandomDate(-30, 0),
                    },
                });
                created++;
                this.orchestrator.incrementEntityCount('Notification');
            }
        }
        while (created < count) {
            const employee = employees[Math.floor(Math.random() * employees.length)];
            const type = types[Math.floor(Math.random() * types.length)].type;
            await this.prisma.notification.create({
                data: {
                    tenantId,
                    employeeId: employee.id,
                    type,
                    title: this.generateTitle(type),
                    message: this.generateMessage(type),
                    isRead: Math.random() > 0.5,
                    createdAt: this.generateRandomDate(-30, 0),
                },
            });
            created++;
            this.orchestrator.incrementEntityCount('Notification');
        }
        this.logger.log(`✅ ${created} notifications créées`);
        return created;
    }
    generateTitle(type) {
        const titles = {
            LEAVE_APPROVED: 'Congé approuvé',
            LEAVE_REJECTED: 'Congé refusé',
            OVERTIME_APPROVED: 'Heures supplémentaires approuvées',
            OVERTIME_REJECTED: 'Heures supplémentaires refusées',
            SCHEDULE_CHANGED: 'Planning modifié',
            REPLACEMENT_REQUESTED: 'Demande de remplacement',
            ATTENDANCE_ANOMALY: 'Anomalie de pointage détectée',
        };
        return titles[type] || 'Notification';
    }
    generateMessage(type) {
        const messages = {
            LEAVE_APPROVED: 'Votre demande de congé a été approuvée. Bonnes vacances !',
            LEAVE_REJECTED: 'Votre demande de congé a été refusée. Veuillez contacter votre manager.',
            OVERTIME_APPROVED: 'Vos heures supplémentaires ont été approuvées.',
            OVERTIME_REJECTED: 'Vos heures supplémentaires ont été refusées.',
            SCHEDULE_CHANGED: 'Votre planning a été modifié. Veuillez consulter les détails.',
            REPLACEMENT_REQUESTED: 'Une demande de remplacement vous a été assignée.',
            ATTENDANCE_ANOMALY: 'Une anomalie a été détectée dans vos pointages. Veuillez vérifier.',
        };
        return messages[type] || 'Nouvelle notification';
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
exports.DataGeneratorNotificationService = DataGeneratorNotificationService;
exports.DataGeneratorNotificationService = DataGeneratorNotificationService = DataGeneratorNotificationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)((0, common_1.forwardRef)(() => data_generator_orchestrator_service_1.DataGeneratorOrchestratorService))),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        data_generator_orchestrator_service_1.DataGeneratorOrchestratorService])
], DataGeneratorNotificationService);
//# sourceMappingURL=data-generator-notification.service.js.map