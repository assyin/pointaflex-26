import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { DataGeneratorOrchestratorService } from './data-generator-orchestrator.service';
import { NotificationsConfigDto } from './dto/generate-all-data.dto';
import { NotificationType } from '@prisma/client';

@Injectable()
export class DataGeneratorNotificationService {
  private readonly logger = new Logger(DataGeneratorNotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => DataGeneratorOrchestratorService))
    private readonly orchestrator: DataGeneratorOrchestratorService,
  ) {}

  /**
   * Génère des notifications
   */
  async generateNotifications(tenantId: string, config: NotificationsConfigDto): Promise<number> {
    this.logger.log(`🔔 Génération de ${config.count || 0} notifications pour tenant ${tenantId}`);

    const count = config.count || 20;
    const types = config.types || [
      { type: NotificationType.LEAVE_APPROVED, count: 5 },
      { type: NotificationType.LEAVE_REJECTED, count: 2 },
      { type: NotificationType.OVERTIME_APPROVED, count: 3 },
      { type: NotificationType.SHIFT_CHANGE, count: 1 },
      { type: NotificationType.SCHEDULE_UPDATED, count: 4 },
      { type: NotificationType.REPLACEMENT_REQUEST, count: 3 },
      { type: NotificationType.ALERT_LEGAL, count: 2 },
    ];

    // Récupérer les employés
    const employees = await this.prisma.employee.findMany({
      where: { tenantId, isActive: true },
    });

    if (employees.length === 0) {
      this.logger.warn('⚠️ Aucun employé actif trouvé');
      return 0;
    }

    let created = 0;

    // Générer selon les types spécifiés
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
            isRead: Math.random() > 0.5, // 50% lues
            createdAt: this.generateRandomDate(-30, 0), // 30 derniers jours
          },
        });

        created++;
        this.orchestrator.incrementEntityCount('Notification');
      }
    }

    // Si on n'a pas atteint le count, générer des notifications supplémentaires
    while (created < count) {
      const employee = employees[Math.floor(Math.random() * employees.length)];
      const type: NotificationType = types[Math.floor(Math.random() * types.length)].type;

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

  /**
   * Génère un titre selon le type
   */
  private generateTitle(type: string): string {
    const titles: Record<string, string> = {
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

  /**
   * Génère un message selon le type
   */
  private generateMessage(type: string): string {
    const messages: Record<string, string> = {
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

  /**
   * Génère une date aléatoire
   */
  private generateRandomDate(daysAgo: number, daysAhead: number): Date {
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() + daysAgo);
    const end = new Date(now);
    end.setDate(end.getDate() + daysAhead);
    const randomTime = start.getTime() + Math.random() * (end.getTime() - start.getTime());
    return new Date(randomTime);
  }
}

