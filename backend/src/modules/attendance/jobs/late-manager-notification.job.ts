import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../../database/prisma.service';
import { AttendanceType, LeaveStatus } from '@prisma/client';
import { MailService } from '../../mail/mail.service';

/**
 * Job de notification LATE aux managers
 *
 * Objectif: Envoyer un email au manager lorsqu'un employé arrive en retard
 * (IN effectué après la tolérance de retard configurée).
 *
 * Règles métier critiques:
 * - Détecter uniquement si schedule publié existe
 * - Calculer le retard = (timestamp IN) - (shift start + tolérance)
 * - Max 1 notification par employé par jour
 * - Exclure employés en congé/mission/télétravail
 * - Seuil de notification configurable (ex: notifier seulement si retard > 15 min)
 */
@Injectable()
export class LateManagerNotificationJob {
  private readonly logger = new Logger(LateManagerNotificationJob.name);

  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

  /**
   * Job exécuté toutes les 15 minutes (configurable par tenant)
   * IMPORTANT: La fréquence peut être configurée via
   * TenantSettings.lateNotificationFrequencyMinutes
   */
  @Cron('*/15 * * * *') // Toutes les 15 minutes par défaut
  async handleLateNotifications() {
    this.logger.log('🔍 Démarrage détection LATE pour notifications manager...');

    try {
      const tenants = await this.getActiveTenants();
      this.logger.log(`Traitement de ${tenants.length} tenant(s)...`);

      for (const tenant of tenants) {
        try {
          await this.processTenant(tenant.id);
        } catch (error) {
          this.logger.error(
            `Erreur lors du traitement LATE pour tenant ${tenant.id}:`,
            error,
          );
        }
      }

      this.logger.log('✅ Détection LATE terminée');
    } catch (error) {
      this.logger.error('Erreur critique dans le job LATE:', error);
    }
  }

  /**
   * Récupère tous les tenants actifs
   */
  private async getActiveTenants() {
    return this.prisma.tenant.findMany({
      where: {
        // Ajouter condition d'activation si besoin
      },
      include: {
        settings: true,
      },
    });
  }

  /**
   * Traite un tenant: détecte les retards et envoie les notifications
   */
  private async processTenant(tenantId: string) {
    // 1. Récupérer les paramètres du tenant
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
      select: {
        lateToleranceEntry: true,
        lateNotificationThresholdMinutes: true,
        lateNotificationFrequencyMinutes: true,
      },
    });

    if (!settings) {
      this.logger.warn(`Pas de settings pour tenant ${tenantId}, skip`);
      return;
    }

    const lateToleranceMinutes = settings.lateToleranceEntry || 15;
    // Seuil configurable: notifier seulement si retard > X min
    const notificationThreshold = settings.lateNotificationThresholdMinutes || 15;

    // 2. Récupérer tous les schedules publiés d'aujourd'hui
    const scheduledEmployees = await this.getScheduledEmployeesToday(tenantId);

    this.logger.log(
      `Tenant ${tenantId}: ${scheduledEmployees.length} employé(s) schedulé(s) aujourd'hui`,
    );

    for (const schedule of scheduledEmployees) {
      try {
        await this.processSchedule(
          tenantId,
          schedule,
          lateToleranceMinutes,
          notificationThreshold,
        );
      } catch (error) {
        this.logger.error(
          `Erreur traitement schedule ${schedule.id}:`,
          error,
        );
      }
    }
  }

  /**
   * Récupère tous les schedules publiés pour aujourd'hui
   */
  private async getScheduledEmployeesToday(tenantId: string) {
    const now = new Date();
    const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    const endOfToday = new Date(startOfToday);
    endOfToday.setUTCDate(endOfToday.getUTCDate() + 1);
    endOfToday.setUTCMilliseconds(-1);

    return this.prisma.schedule.findMany({
      where: {
        tenantId,
        date: {
          gte: startOfToday,
          lte: endOfToday,
        },
        status: 'PUBLISHED',
        // Exclure les schedules suspendus par congé
        suspendedByLeaveId: null,
      },
      include: {
        employee: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        shift: true,
      },
      orderBy: {
        shift: {
          startTime: 'asc',
        },
      },
    });
  }

  /**
   * Traite un schedule individuel
   */
  private async processSchedule(
    tenantId: string,
    schedule: any,
    lateToleranceMinutes: number,
    notificationThreshold: number,
  ) {
    const { employee, shift } = schedule;

    // ÉTAPE 1: Filtrer employés exclus (congé, mission, télétravail)
    const today = new Date();
    const isExcluded = await this.isEmployeeExcluded(
      tenantId,
      employee.id,
      today,
    );

    if (isExcluded) {
      this.logger.debug(`[DEBUG] ${employee.user.firstName} ${employee.user.lastName} - Exclu (congé/mission/télétravail)`);
      return; // Skip silencieusement
    }

    // ÉTAPE 2: Vérifier si l'employé a fait un IN aujourd'hui
    const inRecord = await this.getEmployeeInToday(tenantId, employee.id);

    if (!inRecord) {
      // Pas de IN = pas de retard détecté (sera géré par ABSENCE ou MISSING_IN)
      return;
    }

    // ÉTAPE 3: Calculer le début du shift prévu + tolérance
    const shiftStartTime = this.parseTimeString(
      schedule.customStartTime || shift.startTime,
    );

    const expectedStartTime = new Date();
    expectedStartTime.setHours(shiftStartTime.hours, shiftStartTime.minutes, 0, 0);

    // Ajouter la tolérance
    const lateThreshold = new Date(
      expectedStartTime.getTime() + lateToleranceMinutes * 60 * 1000,
    );

    // ÉTAPE 4: Vérifier si l'employé est en retard
    const inTimestamp = new Date(inRecord.timestamp);

    if (inTimestamp <= lateThreshold) {
      // Pas de retard, IN dans la tolérance
      return;
    }

    // ÉTAPE 5: Calculer le retard en minutes
    const lateMinutes = Math.round(
      (inTimestamp.getTime() - expectedStartTime.getTime()) / (60 * 1000),
    );

    // ÉTAPE 6: Vérifier si le retard dépasse le seuil de notification
    if (lateMinutes < notificationThreshold) {
      // Retard trop petit pour notifier
      this.logger.debug(`[DEBUG] ${employee.user.firstName} ${employee.user.lastName} - Retard de ${lateMinutes} min (seuil: ${notificationThreshold} min), pas de notification`);
      return;
    }

    // ÉTAPE 7: Vérifier si déjà notifié aujourd'hui pour CE shift spécifique
    const startOfToday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    const shiftStartString = schedule.customStartTime || shift.startTime;

    const alreadyNotified = await this.prisma.lateNotificationLog.findUnique({
      where: {
        tenantId_employeeId_sessionDate_shiftStart: {
          tenantId,
          employeeId: employee.user.id,
          sessionDate: startOfToday,
          shiftStart: shiftStartString,
        },
      },
    });

    if (alreadyNotified) {
      this.logger.debug(`[DEBUG] ${employee.user.firstName} ${employee.user.lastName} - Déjà notifié pour retard shift ${shiftStartString}`);
      return; // Déjà notifié pour ce shift, skip
    }

    // ÉTAPE 8: Récupérer le manager
    const manager = await this.getEmployeeManager(employee.id);

    if (!manager || !manager.email) {
      this.logger.warn(
        `Pas de manager avec email pour ${employee.user.firstName} ${employee.user.lastName}`,
      );
      return;
    }

    this.logger.log(`[DEBUG] ${employee.user.firstName} ${employee.user.lastName} - LATE détecté! Retard de ${lateMinutes} min. Envoi notification au manager ${manager.firstName} ${manager.lastName}`);

    // ÉTAPE 9: Envoyer notification
    await this.sendManagerNotification(
      tenantId,
      employee,
      manager,
      shift,
      schedule,
      startOfToday,
      inTimestamp,
      lateMinutes,
    );
  }

  /**
   * Récupère le IN de l'employé aujourd'hui
   */
  private async getEmployeeInToday(
    tenantId: string,
    employeeId: string,
  ) {
    const now = new Date();
    const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const endOfToday = new Date(startOfToday);
    endOfToday.setUTCDate(endOfToday.getUTCDate() + 1);
    endOfToday.setUTCMilliseconds(-1);

    return this.prisma.attendance.findFirst({
      where: {
        tenantId,
        employeeId,
        type: AttendanceType.IN,
        timestamp: {
          gte: startOfToday,
          lte: endOfToday,
        },
      },
      orderBy: {
        timestamp: 'asc', // Prendre le premier IN de la journée
      },
    });
  }

  /**
   * Vérifie si l'employé doit être exclu de la détection
   */
  private async isEmployeeExcluded(
    tenantId: string,
    employeeId: string,
    date: Date,
  ): Promise<boolean> {
    // Vérifier congé approuvé
    const leave = await this.prisma.leave.findFirst({
      where: {
        tenantId,
        employeeId,
        status: LeaveStatus.APPROVED,
        startDate: { lte: date },
        endDate: { gte: date },
      },
    });

    if (leave) {
      return true;
    }

    // TODO: Vérifier mission si allowLateForMissions est false
    // TODO: Vérifier télétravail si allowLateForRemoteWork est false

    return false;
  }

  /**
   * Parse une chaîne HH:mm en objet {hours, minutes}
   */
  private parseTimeString(timeString: string): { hours: number; minutes: number } {
    const [hours, minutes] = timeString.split(':').map(Number);
    return { hours: hours || 0, minutes: minutes || 0 };
  }

  /**
   * Récupère le manager de l'employé
   */
  private async getEmployeeManager(employeeId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        department: {
          include: {
            manager: {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return employee?.department?.manager?.user || null;
  }

  /**
   * Envoie la notification au manager et log dans la table d'audit
   */
  private async sendManagerNotification(
    tenantId: string,
    employee: any,
    manager: any,
    shift: any,
    schedule: any,
    sessionDate: Date,
    inTimestamp: Date,
    lateMinutes: number,
  ) {
    // Vérifier si les notifications LATE sont activées
    const emailConfig = await this.prisma.emailConfig.findUnique({
      where: { tenantId },
    });

    if (!emailConfig || !emailConfig.enabled || !emailConfig.notifyLate) {
      this.logger.debug(
        `Notifications LATE désactivées pour tenant ${tenantId}, skip email`,
      );
      return;
    }

    // Charger le template depuis la BDD
    const template = await this.prisma.emailTemplate.findUnique({
      where: {
        tenantId_code: {
          tenantId,
          code: 'LATE',
        },
      },
    });

    if (!template || !template.active) {
      this.logger.warn(
        `Template LATE non trouvé ou inactif pour tenant ${tenantId}`,
      );
      return;
    }

    const shiftStart = schedule.customStartTime || shift.startTime;
    const actualIn = inTimestamp.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    // Préparer les données pour le template
    const templateData = {
      managerName: `${manager.firstName} ${manager.lastName}`,
      employeeName: `${employee.user.firstName} ${employee.user.lastName}`,
      sessionDate: sessionDate.toLocaleDateString('fr-FR'),
      shiftStart,
      actualIn,
      lateMinutes: lateMinutes.toString(),
    };

    // Remplacer les variables dans le template
    let html = template.htmlContent;
    Object.keys(templateData).forEach((key) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      html = html.replace(regex, templateData[key]);
    });

    // Envoyer l'email via MailService
    await this.mailService.sendMail(
      {
        to: manager.email,
        subject: template.subject,
        html,
        type: 'LATE',
        employeeId: employee.user.id,
        managerId: manager.id,
        templateId: template.id,
      },
      tenantId,
    );

    this.logger.log(
      `📧 Email LATE envoyé à ${manager.email} pour ${employee.user.firstName} ${employee.user.lastName} (retard: ${lateMinutes} min)`,
    );

    // Logger dans la table d'audit
    await this.prisma.lateNotificationLog.create({
      data: {
        tenantId,
        employeeId: employee.user.id,
        managerId: manager.id,
        sessionDate,
        shiftStart,
        actualIn: inTimestamp,
        lateMinutes,
      },
    });

    this.logger.log(
      `✅ Notification LATE enregistrée pour ${employee.user.firstName} ${employee.user.lastName}`,
    );
  }
}
