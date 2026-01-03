import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../../database/prisma.service';
import { AttendanceType, LeaveStatus } from '@prisma/client';
import { MailService } from '../../mail/mail.service';
import { renderEmailTemplate } from '../../mail/mail.utils';

/**
 * Job de notification MISSING_IN aux managers
 *
 * Objectif: Envoyer un email au manager lorsqu'un employé avec un schedule
 * publié n'a pas fait de pointage IN dans la fenêtre raisonnable après le début du shift.
 *
 * Règles métier critiques:
 * - Détecter uniquement si schedule publié existe
 * - NE PAS notifier pendant la fenêtre raisonnable (défaut: 30 min après début shift)
 * - Max 1 notification par employé par jour
 * - Exclure employés en congé/mission/télétravail
 * - Ne concerne que les absences non justifiées
 */
@Injectable()
export class MissingInManagerNotificationJob {
  private readonly logger = new Logger(MissingInManagerNotificationJob.name);

  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

  /**
   * Job exécuté toutes les 15 minutes (configurable par tenant)
   * IMPORTANT: La fréquence peut être configurée via
   * TenantSettings.missingInNotificationFrequencyMinutes
   */
  @Cron('*/15 * * * *') // Toutes les 15 minutes par défaut
  async handleMissingInNotifications() {
    this.logger.log('🔍 Démarrage détection MISSING_IN pour notifications manager...');

    try {
      const tenants = await this.getActiveTenants();
      this.logger.log(`Traitement de ${tenants.length} tenant(s)...`);

      for (const tenant of tenants) {
        try {
          await this.processTenant(tenant.id);
        } catch (error) {
          this.logger.error(
            `Erreur lors du traitement MISSING_IN pour tenant ${tenant.id}:`,
            error,
          );
        }
      }

      this.logger.log('✅ Détection MISSING_IN terminée');
    } catch (error) {
      this.logger.error('Erreur critique dans le job MISSING_IN:', error);
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
   * Traite un tenant: détecte les MISSING_IN et envoie les notifications
   */
  private async processTenant(tenantId: string) {
    // 1. Récupérer les paramètres du tenant
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
      select: {
        missingInDetectionWindowMinutes: true,
        missingInNotificationFrequencyMinutes: true,
        allowMissingInForRemoteWork: true,
        allowMissingInForMissions: true,
      },
    });

    if (!settings) {
      this.logger.warn(`Pas de settings pour tenant ${tenantId}, skip`);
      return;
    }

    const detectionWindowMinutes = settings.missingInDetectionWindowMinutes || 30;

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
          detectionWindowMinutes,
          settings,
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
    detectionWindowMinutes: number,
    settings: any,
  ) {
    const { employee, shift } = schedule;

    // ÉTAPE 1: Filtrer employés exclus (congé, mission, télétravail)
    const today = new Date();
    const isExcluded = await this.isEmployeeExcluded(
      tenantId,
      employee.id,
      today,
      settings,
    );

    if (isExcluded) {
      this.logger.debug(`[DEBUG] ${employee.user.firstName} ${employee.user.lastName} - Exclu (congé/mission/télétravail)`);
      return; // Skip silencieusement
    }

    // ÉTAPE 2: Calculer le début du shift prévu + fenêtre de détection
    const shiftStartTime = this.parseTimeString(
      schedule.customStartTime || shift.startTime,
    );

    const expectedStartTime = new Date();
    expectedStartTime.setHours(shiftStartTime.hours, shiftStartTime.minutes, 0, 0);

    // Ajouter la fenêtre de détection
    const detectionThreshold = new Date(
      expectedStartTime.getTime() + detectionWindowMinutes * 60 * 1000,
    );

    // ÉTAPE 3: Vérifier si on est déjà passé la fenêtre de détection
    const now = new Date();
    if (now <= detectionThreshold) {
      // Trop tôt pour notifier, encore dans la fenêtre raisonnable
      this.logger.debug(`[DEBUG] ${employee.user.firstName} ${employee.user.lastName} - Trop tôt (now: ${now.toISOString()}, threshold: ${detectionThreshold.toISOString()})`);
      return;
    }

    // ÉTAPE 4: Vérifier si l'employé a fait un IN aujourd'hui
    const hasIn = await this.hasEmployeeCheckedInToday(
      tenantId,
      employee.id,
      expectedStartTime,
      detectionThreshold,
    );

    if (hasIn) {
      // Employé a fait son IN, pas de MISSING_IN
      this.logger.debug(`[DEBUG] ${employee.user.firstName} ${employee.user.lastName} - A fait son IN`);
      return;
    }

    // ÉTAPE 5: Vérifier si déjà notifié aujourd'hui pour CE shift spécifique
    const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const shiftStartString = schedule.customStartTime || shift.startTime;

    const alreadyNotified = await this.prisma.missingInNotificationLog.findUnique({
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
      this.logger.debug(`[DEBUG] ${employee.user.firstName} ${employee.user.lastName} - Déjà notifié pour shift ${shiftStartString}`);
      return; // Déjà notifié pour ce shift, skip
    }

    // ÉTAPE 6: Récupérer le manager
    const manager = await this.getEmployeeManager(employee.id);

    if (!manager || !manager.email) {
      this.logger.warn(
        `Pas de manager avec email pour ${employee.user.firstName} ${employee.user.lastName}`,
      );
      return;
    }

    this.logger.log(`[DEBUG] ${employee.user.firstName} ${employee.user.lastName} - MISSING_IN détecté! Envoi notification au manager ${manager.firstName} ${manager.lastName}`);


    // ÉTAPE 7: Envoyer notification
    await this.sendManagerNotification(
      tenantId,
      employee,
      manager,
      shift,
      schedule,
      startOfToday,
    );
  }

  /**
   * Vérifie si l'employé a fait un IN aujourd'hui dans la fenêtre attendue
   */
  private async hasEmployeeCheckedInToday(
    tenantId: string,
    employeeId: string,
    expectedStart: Date,
    detectionThreshold: Date,
  ): Promise<boolean> {
    const inRecord = await this.prisma.attendance.findFirst({
      where: {
        tenantId,
        employeeId,
        type: AttendanceType.IN,
        timestamp: {
          // Chercher IN dans une fenêtre large (1h avant shift start jusqu'à maintenant)
          gte: new Date(expectedStart.getTime() - 60 * 60 * 1000),
          lte: new Date(),
        },
      },
    });

    return !!inRecord;
  }

  /**
   * Vérifie si l'employé doit être exclu de la détection
   */
  private async isEmployeeExcluded(
    tenantId: string,
    employeeId: string,
    date: Date,
    settings: any,
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

    // TODO: Vérifier mission si allowMissingInForMissions est false
    // TODO: Vérifier télétravail si allowMissingInForRemoteWork est false

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
  ) {
    // Vérifier si les notifications MISSING_IN sont activées
    const emailConfig = await this.prisma.emailConfig.findUnique({
      where: { tenantId },
    });

    if (!emailConfig || !emailConfig.enabled || !emailConfig.notifyMissingIn) {
      this.logger.debug(
        `Notifications MISSING_IN désactivées pour tenant ${tenantId}, skip email`,
      );
      return;
    }

    // Charger le template depuis la BDD
    const template = await this.prisma.emailTemplate.findUnique({
      where: {
        tenantId_code: {
          tenantId,
          code: 'MISSING_IN',
        },
      },
    });

    if (!template || !template.active) {
      this.logger.warn(
        `Template MISSING_IN non trouvé ou inactif pour tenant ${tenantId}`,
      );
      return;
    }

    const shiftStart = schedule.customStartTime || shift.startTime;

    // Préparer les données pour le template
    const templateData = {
      managerName: `${manager.firstName} ${manager.lastName}`,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      sessionDate: sessionDate.toLocaleDateString('fr-FR'),
      shiftStart,
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
        type: 'MISSING_IN',
        employeeId: employee.user.id,
        managerId: manager.id,
        templateId: template.id,
      },
      tenantId,
    );

    this.logger.log(
      `📧 Email MISSING_IN envoyé à ${manager.email} pour ${employee.firstName} ${employee.lastName}`,
    );

    // Logger dans la table d'audit
    await this.prisma.missingInNotificationLog.create({
      data: {
        tenantId,
        employeeId: employee.user.id,
        managerId: manager.id,
        sessionDate,
        shiftStart,
      },
    });

    this.logger.log(
      `✅ Notification MISSING_IN enregistrée pour ${employee.firstName} ${employee.lastName}`,
    );
  }
}
