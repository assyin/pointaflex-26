import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../../database/prisma.service';
import { MailService } from '../../mail/mail.service';
import { renderEmailTemplate } from '../../mail/mail.utils';
import { AttendanceService } from '../attendance.service';

/**
 * Job d'escalade des pointages en PENDING_VALIDATION
 *
 * Objectif: Escalader automatiquement les pointages ambigus non validés
 * selon les délais configurés (24h → manager, 48h → RH, 72h → direction)
 *
 * Règles métier:
 * - Niveau 1 (24h): Rappel au manager direct
 * - Niveau 2 (48h): Escalade à la RH
 * - Niveau 3 (72h): Escalade urgente à la direction
 * - Tous les délais sont configurables via TenantSettings
 */
@Injectable()
export class PendingValidationEscalationJob {
  private readonly logger = new Logger(PendingValidationEscalationJob.name);

  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
    private attendanceService: AttendanceService,
  ) {}

  /**
   * Job exécuté toutes les heures
   * L'heure exacte d'envoi des notifications est configurable par tenant
   * via TenantSettings.ambiguousPunchEscalationCheckTime
   */
  @Cron('0 * * * *') // Toutes les heures
  async handlePendingValidationEscalations() {
    this.logger.log('🔍 Démarrage escalade PENDING_VALIDATION...');

    try {
      const tenants = await this.getActiveTenants();
      this.logger.log(`Traitement de ${tenants.length} tenant(s)...`);

      for (const tenant of tenants) {
        try {
          await this.processTenant(tenant);
        } catch (error) {
          this.logger.error(
            `Erreur lors du traitement escalade pour tenant ${tenant.id}:`,
            error,
          );
        }
      }

      this.logger.log('✅ Escalade PENDING_VALIDATION terminée');
    } catch (error) {
      this.logger.error('Erreur critique dans le job escalade:', error);
    }
  }

  /**
   * Récupère tous les tenants actifs avec leurs paramètres
   */
  private async getActiveTenants() {
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

  /**
   * Vérifie si c'est l'heure configurée pour l'escalade
   */
  private isScheduledTime(checkTime: string): boolean {
    const now = new Date();
    const [hour] = (checkTime || '09:00').split(':').map(Number);
    return now.getHours() === hour;
  }

  /**
   * Traite un tenant: escalade et envoie les notifications
   */
  private async processTenant(tenant: any) {
    const settings = tenant.settings;

    // Vérifier si l'escalade est activée
    if (!settings || settings.ambiguousPunchEscalationEnabled === false) {
      this.logger.debug(`Escalade désactivée pour tenant ${tenant.id}`);
      return;
    }

    // Vérifier si c'est l'heure configurée (par défaut 09:00)
    const checkTime = settings.ambiguousPunchEscalationCheckTime || '09:00';
    if (!this.isScheduledTime(checkTime)) {
      return;
    }

    this.logger.log(`⏰ Traitement escalade pour tenant ${tenant.companyName} (${tenant.id})`);

    // Appeler le service d'escalade
    const result = await this.attendanceService.escalatePendingValidations(tenant.id);

    if (result.escalated > 0) {
      this.logger.log(
        `📊 ${result.escalated} pointage(s) escaladé(s) sur ${result.processed} en attente`,
      );

      // Envoyer les notifications pour chaque escalade
      for (const escalation of result.escalations) {
        await this.sendEscalationNotification(tenant, escalation, settings);
      }
    } else if (result.processed > 0) {
      this.logger.debug(`Aucune escalade nécessaire pour ${result.processed} pointage(s) en attente`);
    }
  }

  /**
   * Envoie les notifications d'escalade
   */
  private async sendEscalationNotification(tenant: any, escalation: any, settings: any) {
    try {
      // Récupérer les infos complètes de l'employé et du manager
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

      if (!attendance) return;

      const employee = attendance.employee;
      const manager = employee.department?.manager;
      const shift = employee.currentShift;

      // Données du template
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

      // Niveau 1: Notifier le manager
      if (escalation.newLevel === 1 && settings.ambiguousPunchNotifyManager && manager?.user?.email) {
        await this.sendNotificationEmail(
          manager.user.email,
          `${manager.user.firstName} ${manager.user.lastName}`,
          templateData,
          tenant,
        );
        this.logger.log(`📧 Notification niveau 1 envoyée au manager: ${manager.user.email}`);
      }

      // Niveau 2: Notifier la RH
      if (escalation.newLevel === 2 && settings.ambiguousPunchNotifyHR && tenant.hrEmail) {
        await this.sendNotificationEmail(
          tenant.hrEmail,
          'Équipe RH',
          templateData,
          tenant,
        );
        this.logger.log(`📧 Notification niveau 2 envoyée à la RH: ${tenant.hrEmail}`);
      }

      // Niveau 3: Notifier la direction (RH + manager)
      if (escalation.newLevel === 3) {
        if (settings.ambiguousPunchNotifyHR && tenant.hrEmail) {
          await this.sendNotificationEmail(
            tenant.hrEmail,
            'Équipe RH',
            { ...templateData, urgent: true },
            tenant,
          );
        }
        if (settings.ambiguousPunchNotifyManager && manager?.user?.email) {
          await this.sendNotificationEmail(
            manager.user.email,
            `${manager.user.firstName} ${manager.user.lastName}`,
            { ...templateData, urgent: true },
            tenant,
          );
        }
        this.logger.log(`🚨 Notifications niveau 3 (urgentes) envoyées`);
      }

      // Optionnel: Notifier l'employé
      if (settings.ambiguousPunchNotifyEmployee && employee.email) {
        await this.sendNotificationEmail(
          employee.email,
          `${employee.firstName} ${employee.lastName}`,
          { ...templateData, isEmployeeNotification: true },
          tenant,
        );
      }

    } catch (error) {
      this.logger.error(`Erreur envoi notification escalade: ${error.message}`);
    }
  }

  /**
   * Envoie un email de notification
   */
  private async sendNotificationEmail(
    to: string,
    recipientName: string,
    templateData: any,
    tenant: any,
  ) {
    try {
      const html = await renderEmailTemplate('pending-validation-notification', {
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
    } catch (error) {
      this.logger.error(`Erreur envoi email à ${to}: ${error.message}`);
    }
  }
}
