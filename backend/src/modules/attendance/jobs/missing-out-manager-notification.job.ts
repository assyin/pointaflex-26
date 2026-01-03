import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../../database/prisma.service';
import { AttendanceType, LeaveStatus } from '@prisma/client';
import { MailService } from '../../mail/mail.service';
import { renderEmailTemplate } from '../../mail/mail.utils';

/**
 * Job de notification MISSING_OUT aux managers
 *
 * Objectif: Envoyer un email au manager lorsque la session de travail d'un employé
 * reste ouverte au-delà d'une fenêtre configurable.
 *
 * Règles métier critiques:
 * - NE PAS notifier pour overtime légitime (seulement après fenêtre de détection)
 * - Max 1 notification par employé par jour
 * - Exclure employés en congé/mission/télétravail
 * - Étendre fenêtre pour shifts de nuit (jusqu'au lendemain midi minimum)
 */
@Injectable()
export class MissingOutManagerNotificationJob {
  private readonly logger = new Logger(MissingOutManagerNotificationJob.name);

  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

  /**
   * Job exécuté toutes les 15 minutes (configurable par tenant)
   * IMPORTANT: La fréquence peut être configurée via
   * TenantSettings.missingOutNotificationFrequencyMinutes
   */
  @Cron('*/15 * * * *') // Toutes les 15 minutes par défaut
  async handleMissingOutNotifications() {
    this.logger.log('🔍 Démarrage détection MISSING_OUT pour notifications manager...');

    try {
      const tenants = await this.getActiveTenants();
      this.logger.log(`Traitement de ${tenants.length} tenant(s)...`);

      for (const tenant of tenants) {
        try {
          await this.processTenant(tenant.id);
        } catch (error) {
          this.logger.error(
            `Erreur lors du traitement MISSING_OUT pour tenant ${tenant.id}:`,
            error,
          );
        }
      }

      this.logger.log('✅ Détection MISSING_OUT terminée');
    } catch (error) {
      this.logger.error('Erreur critique dans le job MISSING_OUT:', error);
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
   * Traite un tenant: détecte les MISSING_OUT et envoie les notifications
   */
  private async processTenant(tenantId: string) {
    // 1. Récupérer les paramètres du tenant
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
      select: {
        missingOutDetectionWindowMinutes: true,
        missingOutNotificationFrequencyMinutes: true,
        allowMissingOutForRemoteWork: true,
        allowMissingOutForMissions: true,
      },
    });

    if (!settings) {
      this.logger.warn(`Pas de settings pour tenant ${tenantId}, skip`);
      return;
    }

    const detectionWindowMinutes = settings.missingOutDetectionWindowMinutes || 120;

    // 2. Sélectionner les sessions candidates (IN sans OUT)
    const openSessions = await this.getOpenSessions(tenantId);

    this.logger.log(
      `Tenant ${tenantId}: ${openSessions.length} session(s) ouverte(s) à analyser`,
    );

    for (const session of openSessions) {
      try {
        await this.processSession(
          tenantId,
          session,
          detectionWindowMinutes,
          settings,
        );
      } catch (error) {
        this.logger.error(
          `Erreur traitement session ${session.id}:`,
          error,
        );
      }
    }
  }

  /**
   * Récupère toutes les sessions ouvertes (IN sans OUT aujourd'hui)
   */
  private async getOpenSessions(tenantId: string) {
    const now = new Date();
    const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    const endOfToday = new Date(startOfToday);
    endOfToday.setUTCDate(endOfToday.getUTCDate() + 1);
    endOfToday.setUTCMilliseconds(-1);

    // Récupérer tous les IN d'aujourd'hui
    const inRecords = await this.prisma.attendance.findMany({
      where: {
        tenantId,
        type: AttendanceType.IN,
        timestamp: {
          gte: startOfToday,
          lte: endOfToday,
        },
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
      },
      orderBy: {
        timestamp: 'asc',
      },
    });

    // Filtrer ceux qui n'ont pas de OUT correspondant
    const openSessions = [];

    for (const inRecord of inRecords) {
      const hasOut = await this.prisma.attendance.findFirst({
        where: {
          tenantId,
          employeeId: inRecord.employeeId,
          type: AttendanceType.OUT,
          timestamp: {
            gte: inRecord.timestamp,
            lte: endOfToday,
          },
        },
      });

      if (!hasOut) {
        openSessions.push(inRecord);
      }
    }

    return openSessions;
  }

  /**
   * Traite une session individuelle
   */
  private async processSession(
    tenantId: string,
    session: any,
    detectionWindowMinutes: number,
    settings: any,
  ) {
    const { employee, timestamp: inTimestamp } = session;

    // ÉTAPE 1: Filtrer employés exclus (congé, mission, télétravail)
    const isExcluded = await this.isEmployeeExcluded(
      tenantId,
      employee.id,
      inTimestamp,
      settings,
    );

    if (isExcluded) {
      return; // Skip silencieusement
    }

    // ÉTAPE 2: Récupérer le schedule correspondant au IN
    const schedule = await this.getScheduleWithFallback(
      tenantId,
      employee.id,
      inTimestamp,
    );

    if (!schedule) {
      this.logger.warn(
        `Pas de schedule trouvé pour ${employee.firstName} ${employee.lastName}, skip`,
      );
      return;
    }

    // ÉTAPE 3: Calculer la fenêtre de détection
    const detectionThreshold = this.calculateDetectionThreshold(
      inTimestamp,
      schedule,
      detectionWindowMinutes,
    );

    // ÉTAPE 4: Décision RÈGLE D'OR
    const now = new Date();
    if (now <= detectionThreshold) {
      // Heures supplémentaires légitimes, aucune action
      return;
    }

    // ÉTAPE 5: Vérifier si déjà notifié aujourd'hui pour CE shift spécifique
    const inDate = new Date(inTimestamp);
    const startOfToday = new Date(Date.UTC(inDate.getUTCFullYear(), inDate.getUTCMonth(), inDate.getUTCDate()));
    const shiftEndString = schedule.customEndTime || schedule.shift.endTime;

    const alreadyNotified = await this.prisma.missingOutNotificationLog.findUnique({
      where: {
        tenantId_employeeId_sessionDate_shiftEnd: {
          tenantId,
          employeeId: employee.user.id,
          sessionDate: startOfToday,
          shiftEnd: shiftEndString,
        },
      },
    });

    if (alreadyNotified) {
      return; // Déjà notifié pour ce shift, skip
    }

    // ÉTAPE 6: Récupérer le manager
    const manager = await this.getEmployeeManager(employee.id);

    if (!manager || !manager.email) {
      this.logger.warn(
        `Pas de manager avec email pour ${employee.firstName} ${employee.lastName}`,
      );
      return;
    }

    // ÉTAPE 7: Envoyer notification
    await this.sendManagerNotification(
      tenantId,
      employee,
      manager,
      inTimestamp,
      schedule,
      startOfToday,
    );
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

    // TODO: Vérifier mission si allowMissingOutForMissions est false
    // TODO: Vérifier télétravail si allowMissingOutForRemoteWork est false
    // TODO: Vérifier présence externe (GPS/mobile)

    return false;
  }

  /**
   * Récupère le schedule correspondant au IN avec fallback
   * IMPORTANT: Utilise le timestamp du IN pour trouver le bon shift
   */
  private async getScheduleWithFallback(
    tenantId: string,
    employeeId: string,
    inTimestamp: Date,
  ) {
    const inDate = new Date(inTimestamp);
    const startOfDay = new Date(Date.UTC(inDate.getUTCFullYear(), inDate.getUTCMonth(), inDate.getUTCDate()));

    const endOfDay = new Date(startOfDay);
    endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);
    endOfDay.setUTCMilliseconds(-1);

    // Chercher TOUS les schedules du jour
    const schedules = await this.prisma.schedule.findMany({
      where: {
        tenantId,
        employeeId,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: 'PUBLISHED',
      },
      include: {
        shift: true,
      },
      orderBy: {
        shift: {
          startTime: 'asc',
        },
      },
    });

    if (schedules.length === 0) {
      return null;
    }

    if (schedules.length === 1) {
      return schedules[0];
    }

    // Multiples schedules: trouver le plus proche de l'heure du IN
    const inHour = inTimestamp.getUTCHours();
    const inMinutes = inTimestamp.getUTCMinutes();
    const inTimeInMinutes = inHour * 60 + inMinutes;

    let closestSchedule = schedules[0];
    let smallestDifference = Infinity;

    for (const schedule of schedules) {
      const startTime = this.parseTimeString(
        schedule.customStartTime || schedule.shift.startTime,
      );

      const shiftStartInMinutes = startTime.hours * 60 + startTime.minutes;

      // Ajuster pour timezone (simplifié: Africa/Casablanca = UTC+1)
      const shiftStartInMinutesUTC = shiftStartInMinutes - 60;

      const difference = Math.abs(inTimeInMinutes - shiftStartInMinutesUTC);

      if (difference < smallestDifference) {
        smallestDifference = difference;
        closestSchedule = schedule;
      }
    }

    return closestSchedule;
  }

  /**
   * Calcule le seuil de détection (fenêtre raisonnable)
   */
  private calculateDetectionThreshold(
    inTimestamp: Date,
    schedule: any,
    detectionWindowMinutes: number,
  ): Date {
    const shiftEndTime = this.parseTimeString(
      schedule.customEndTime || schedule.shift.endTime,
    );

    // Créer la date de fin de shift prévue
    const shiftEnd = new Date(Date.UTC(
      inTimestamp.getUTCFullYear(),
      inTimestamp.getUTCMonth(),
      inTimestamp.getUTCDate(),
      shiftEndTime.hours,
      shiftEndTime.minutes,
      0,
      0,
    ));

    // Ajouter la fenêtre de détection
    const threshold = new Date(
      shiftEnd.getTime() + detectionWindowMinutes * 60 * 1000,
    );

    // Pour shifts de nuit: étendre jusqu'au lendemain midi minimum
    const shiftStartTime = this.parseTimeString(
      schedule.customStartTime || schedule.shift.startTime,
    );

    const isNightShift = this.isNightShift(shiftStartTime, shiftEndTime);

    if (isNightShift) {
      const nextDayNoon = new Date(inTimestamp);
      nextDayNoon.setUTCDate(nextDayNoon.getUTCDate() + 1);
      nextDayNoon.setUTCHours(12, 0, 0, 0);

      return new Date(Math.max(threshold.getTime(), nextDayNoon.getTime()));
    }

    return threshold;
  }

  /**
   * Détermine si un shift est un shift de nuit
   */
  private isNightShift(
    startTime: { hours: number; minutes: number },
    endTime: { hours: number; minutes: number },
  ): boolean {
    return startTime.hours >= 20 || endTime.hours <= 8;
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
    inTimestamp: Date,
    schedule: any,
    sessionDate: Date,
  ) {
    // Vérifier si les notifications MISSING_OUT sont activées
    const emailConfig = await this.prisma.emailConfig.findUnique({
      where: { tenantId },
    });

    if (!emailConfig || !emailConfig.enabled || !emailConfig.notifyMissingOut) {
      this.logger.debug(
        `Notifications MISSING_OUT désactivées pour tenant ${tenantId}, skip email`,
      );
      return;
    }

    // Charger le template depuis la BDD
    const template = await this.prisma.emailTemplate.findUnique({
      where: {
        tenantId_code: {
          tenantId,
          code: 'MISSING_OUT',
        },
      },
    });

    if (!template || !template.active) {
      this.logger.warn(
        `Template MISSING_OUT non trouvé ou inactif pour tenant ${tenantId}`,
      );
      return;
    }

    const shiftEnd = schedule.customEndTime || schedule.shift.endTime;

    // Préparer les données pour le template
    const templateData = {
      managerName: `${manager.firstName} ${manager.lastName}`,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      sessionDate: sessionDate.toLocaleDateString('fr-FR'),
      inTime: inTimestamp.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      shiftEnd,
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
        type: 'MISSING_OUT',
        employeeId: employee.user.id,
        managerId: manager.id,
        templateId: template.id,
      },
      tenantId,
    );

    this.logger.log(
      `📧 Email MISSING_OUT envoyé à ${manager.email} pour ${employee.firstName} ${employee.lastName}`,
    );

    // Logger dans la table d'audit
    await this.prisma.missingOutNotificationLog.create({
      data: {
        tenantId,
        employeeId: employee.user.id,
        managerId: manager.id,
        sessionDate,
        inTimestamp,
        shiftEnd,
      },
    });

    this.logger.log(
      `✅ Notification MISSING_OUT enregistrée pour ${employee.firstName} ${employee.lastName}`,
    );
  }
}
