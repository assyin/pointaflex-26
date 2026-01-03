import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../../database/prisma.service';
import { AttendanceType, LeaveStatus } from '@prisma/client';
import { MailService } from '../../mail/mail.service';

/**
 * Job de notification ABSENCE aux managers
 *
 * Objectif: Envoyer un email au manager lorsqu'un employé avec un schedule
 * publié n'a fait AUCUN pointage (ni IN ni OUT) de toute la journée.
 *
 * Règles métier critiques:
 * - Détecter uniquement si schedule publié existe
 * - Vérifier qu'il n'y a NI IN NI OUT durant toute la journée
 * - Max 1 notification par employé par jour
 * - Exclure employés en congé/mission/télétravail
 * - Exécuter en fin de journée (ex: 20h) pour laisser le temps de pointer
 */
@Injectable()
export class AbsenceManagerNotificationJob {
  private readonly logger = new Logger(AbsenceManagerNotificationJob.name);

  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

  /**
   * Job exécuté toutes les heures (configurable par tenant)
   * IMPORTANT: Devrait idéalement s'exécuter en fin de journée (20h-22h)
   * pour détecter les absences complètes
   */
  @Cron('0 */1 * * *') // Toutes les heures par défaut
  async handleAbsenceNotifications() {
    this.logger.log('🔍 Démarrage détection ABSENCE pour notifications manager...');

    try {
      const tenants = await this.getActiveTenants();
      this.logger.log(`Traitement de ${tenants.length} tenant(s)...`);

      for (const tenant of tenants) {
        try {
          await this.processTenant(tenant.id);
        } catch (error) {
          this.logger.error(
            `Erreur lors du traitement ABSENCE pour tenant ${tenant.id}:`,
            error,
          );
        }
      }

      this.logger.log('✅ Détection ABSENCE terminée');
    } catch (error) {
      this.logger.error('Erreur critique dans le job ABSENCE:', error);
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
   * Traite un tenant: détecte les absences complètes et envoie les notifications
   */
  private async processTenant(tenantId: string) {
    // 1. Récupérer les paramètres du tenant
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
      select: {
        absenceNotificationFrequencyMinutes: true, // Fréquence de notification
        absenceDetectionBufferMinutes: true, // Délai après fin du shift
      },
    });

    if (!settings) {
      this.logger.warn(`Pas de settings pour tenant ${tenantId}, skip`);
      return;
    }

    // Buffer configurable en minutes après la fin du shift pour considérer comme absence
    const absenceBufferMinutes = settings.absenceDetectionBufferMinutes || 60;

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
          absenceBufferMinutes,
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
   * IMPORTANT: Détecte l'absence seulement APRÈS la fin du shift (+ buffer configurable)
   */
  private async processSchedule(
    tenantId: string,
    schedule: any,
    bufferMinutes: number,
  ) {
    const { employee, shift } = schedule;
    const now = new Date();

    // ÉTAPE 0: Vérifier si le shift est terminé (+ buffer configurable)
    const shiftEndTime = schedule.customEndTime || shift.endTime;
    const [endHour, endMinute] = shiftEndTime.split(':').map(Number);

    // Créer la date de fin du shift
    const shiftEndDate = new Date();
    shiftEndDate.setHours(endHour, endMinute, 0, 0);

    // Ajouter le buffer configurable
    const detectionTime = new Date(shiftEndDate.getTime() + bufferMinutes * 60 * 1000);

    // Gérer les shifts de nuit (qui se terminent le lendemain)
    // Si l'heure de fin est avant l'heure de début, le shift se termine le lendemain
    const shiftStartTime = schedule.customStartTime || shift.startTime;
    const [startHour] = shiftStartTime.split(':').map(Number);
    const isNightShift = endHour < startHour;

    if (isNightShift) {
      // Pour les shifts de nuit, on ne détecte pas encore (le shift n'est pas terminé)
      // Le job de demain le détectera
      this.logger.debug(
        `[DEBUG] ${employee?.user?.firstName} ${employee?.user?.lastName} - Shift de nuit (${shiftStartTime}-${shiftEndTime}), sera détecté demain`,
      );
      return;
    }

    if (now < detectionTime) {
      // Shift pas encore terminé + buffer
      this.logger.debug(
        `[DEBUG] ${employee?.user?.firstName} ${employee?.user?.lastName} - Shift ${shiftStartTime}-${shiftEndTime} pas encore terminé (détection à ${detectionTime.toLocaleTimeString('fr-FR')})`,
      );
      return;
    }

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

    // ÉTAPE 2: Vérifier si l'employé a fait des pointages aujourd'hui
    const hasAnyAttendance = await this.hasEmployeeAttendanceToday(
      tenantId,
      employee.id,
    );

    if (hasAnyAttendance) {
      // Employé a fait au moins un pointage, pas d'absence complète
      return;
    }

    // ÉTAPE 3: Vérifier si déjà notifié aujourd'hui pour CE shift spécifique
    const startOfToday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    const shiftStartString = schedule.customStartTime || shift.startTime;

    const alreadyNotified = await this.prisma.absenceNotificationLog.findUnique({
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
      this.logger.debug(`[DEBUG] ${employee.user.firstName} ${employee.user.lastName} - Déjà notifié pour absence shift ${shiftStartString}`);
      return; // Déjà notifié pour ce shift, skip
    }

    // ÉTAPE 4: Récupérer le manager
    const manager = await this.getEmployeeManager(employee.id);

    if (!manager || !manager.email) {
      this.logger.warn(
        `Pas de manager avec email pour ${employee.user.firstName} ${employee.user.lastName}`,
      );
      return;
    }

    this.logger.log(`[DEBUG] ${employee.user.firstName} ${employee.user.lastName} - ABSENCE complète détectée! Envoi notification au manager ${manager.firstName} ${manager.lastName}`);

    // ÉTAPE 5: Envoyer notification
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
   * Vérifie si l'employé a fait des pointages aujourd'hui (IN ou OUT)
   */
  private async hasEmployeeAttendanceToday(
    tenantId: string,
    employeeId: string,
  ): Promise<boolean> {
    const now = new Date();
    const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const endOfToday = new Date(startOfToday);
    endOfToday.setUTCDate(endOfToday.getUTCDate() + 1);
    endOfToday.setUTCMilliseconds(-1);

    const attendance = await this.prisma.attendance.findFirst({
      where: {
        tenantId,
        employeeId,
        timestamp: {
          gte: startOfToday,
          lte: endOfToday,
        },
      },
    });

    return !!attendance;
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

    // TODO: Vérifier mission si allowAbsenceForMissions est false
    // TODO: Vérifier télétravail si allowAbsenceForRemoteWork est false

    return false;
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
    // Vérifier si les notifications ABSENCE sont activées
    const emailConfig = await this.prisma.emailConfig.findUnique({
      where: { tenantId },
    });

    if (!emailConfig || !emailConfig.enabled || !emailConfig.notifyAbsence) {
      this.logger.debug(
        `Notifications ABSENCE désactivées pour tenant ${tenantId}, skip email`,
      );
      return;
    }

    // Charger le template depuis la BDD
    const template = await this.prisma.emailTemplate.findUnique({
      where: {
        tenantId_code: {
          tenantId,
          code: 'ABSENCE',
        },
      },
    });

    if (!template || !template.active) {
      this.logger.warn(
        `Template ABSENCE non trouvé ou inactif pour tenant ${tenantId}`,
      );
      return;
    }

    const shiftStart = schedule.customStartTime || shift.startTime;

    // Préparer les données pour le template
    const templateData = {
      managerName: `${manager.firstName} ${manager.lastName}`,
      employeeName: `${employee.user.firstName} ${employee.user.lastName}`,
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
        type: 'ABSENCE',
        employeeId: employee.user.id,
        managerId: manager.id,
        templateId: template.id,
      },
      tenantId,
    );

    this.logger.log(
      `📧 Email ABSENCE envoyé à ${manager.email} pour ${employee.user.firstName} ${employee.user.lastName}`,
    );

    // Logger dans la table d'audit
    await this.prisma.absenceNotificationLog.create({
      data: {
        tenantId,
        employeeId: employee.user.id,
        managerId: manager.id,
        sessionDate,
        shiftStart,
      },
    });

    this.logger.log(
      `✅ Notification ABSENCE enregistrée pour ${employee.user.firstName} ${employee.user.lastName}`,
    );
  }
}
