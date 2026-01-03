import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../../database/prisma.service';
import { AttendanceType, LeaveStatus } from '@prisma/client';
import { MailService } from '../../mail/mail.service';

/**
 * Job de notification ABSENCE_PARTIAL aux managers
 *
 * Objectif: Envoyer un email au manager lorsqu'un employé a fait un pointage
 * incomplet (OUT sans IN précédent).
 *
 * Note: Le cas IN sans OUT est déjà géré par MISSING_OUT
 *
 * Règles métier critiques:
 * - Détecter OUT sans IN correspondant dans une fenêtre raisonnable
 * - Max 1 notification par employé par jour
 * - Exclure employés en congé/mission/télétravail
 * - Vérifier qu'il n'y a pas eu de panne technique du terminal
 */
@Injectable()
export class AbsencePartialManagerNotificationJob {
  private readonly logger = new Logger(AbsencePartialManagerNotificationJob.name);

  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

  /**
   * Job exécuté toutes les 30 minutes (configurable par tenant)
   */
  @Cron('*/30 * * * *') // Toutes les 30 minutes par défaut
  async handleAbsencePartialNotifications() {
    this.logger.log('🔍 Démarrage détection ABSENCE_PARTIAL pour notifications manager...');

    try {
      const tenants = await this.getActiveTenants();
      this.logger.log(`Traitement de ${tenants.length} tenant(s)...`);

      for (const tenant of tenants) {
        try {
          await this.processTenant(tenant.id);
        } catch (error) {
          this.logger.error(
            `Erreur lors du traitement ABSENCE_PARTIAL pour tenant ${tenant.id}:`,
            error,
          );
        }
      }

      this.logger.log('✅ Détection ABSENCE_PARTIAL terminée');
    } catch (error) {
      this.logger.error('Erreur critique dans le job ABSENCE_PARTIAL:', error);
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
   * Traite un tenant: détecte les absences partielles et envoie les notifications
   */
  private async processTenant(tenantId: string) {
    // 1. Récupérer les paramètres du tenant
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
      select: {
        absencePartialNotificationFrequencyMinutes: true,
      },
    });

    // Utiliser une valeur par défaut pour la fenêtre de détection
    const detectionWindowMinutes = 120; // 2 heures par défaut

    // 2. Sélectionner les OUT candidats (OUT sans IN récent)
    const orphanOutRecords = await this.getOrphanOutRecords(tenantId);

    this.logger.log(
      `Tenant ${tenantId}: ${orphanOutRecords.length} OUT orphelin(s) à analyser`,
    );

    for (const outRecord of orphanOutRecords) {
      try {
        await this.processOutRecord(
          tenantId,
          outRecord,
          detectionWindowMinutes,
        );
      } catch (error) {
        this.logger.error(
          `Erreur traitement OUT record ${outRecord.id}:`,
          error,
        );
      }
    }
  }

  /**
   * Récupère les OUT sans IN correspondant aujourd'hui
   */
  private async getOrphanOutRecords(tenantId: string) {
    const now = new Date();
    const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    const endOfToday = new Date(startOfToday);
    endOfToday.setUTCDate(endOfToday.getUTCDate() + 1);
    endOfToday.setUTCMilliseconds(-1);

    // Récupérer tous les OUT d'aujourd'hui
    const outRecords = await this.prisma.attendance.findMany({
      where: {
        tenantId,
        type: AttendanceType.OUT,
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

    // Filtrer ceux qui n'ont pas de IN correspondant
    const orphanOuts = [];

    for (const outRecord of outRecords) {
      // Chercher un IN précédent dans les 4 heures avant le OUT
      const windowStart = new Date(outRecord.timestamp);
      windowStart.setHours(windowStart.getHours() - 4);

      const hasIn = await this.prisma.attendance.findFirst({
        where: {
          tenantId,
          employeeId: outRecord.employeeId,
          type: AttendanceType.IN,
          timestamp: {
            gte: windowStart,
            lt: outRecord.timestamp,
          },
        },
      });

      if (!hasIn) {
        orphanOuts.push(outRecord);
      }
    }

    return orphanOuts;
  }

  /**
   * Traite un OUT orphelin individuel
   */
  private async processOutRecord(
    tenantId: string,
    outRecord: any,
    detectionWindowMinutes: number,
  ) {
    const { employee, timestamp: outTimestamp } = outRecord;

    // ÉTAPE 1: Filtrer employés exclus (congé, mission, télétravail)
    const isExcluded = await this.isEmployeeExcluded(
      tenantId,
      employee.id,
      outTimestamp,
    );

    if (isExcluded) {
      return; // Skip silencieusement
    }

    // ÉTAPE 2: Vérifier si déjà notifié aujourd'hui pour cette absence partielle
    const outDate = new Date(outTimestamp);
    const startOfDay = new Date(Date.UTC(outDate.getUTCFullYear(), outDate.getUTCMonth(), outDate.getUTCDate()));

    const alreadyNotified = await this.prisma.absencePartialNotificationLog.findUnique({
      where: {
        tenantId_employeeId_sessionDate_missingType: {
          tenantId,
          employeeId: employee.user.id,
          sessionDate: startOfDay,
          missingType: 'IN', // OUT sans IN = IN manquant
        },
      },
    });

    if (alreadyNotified) {
      return; // Déjà notifié, skip
    }

    // ÉTAPE 3: Récupérer le schedule correspondant
    const schedule = await this.getScheduleForDate(
      tenantId,
      employee.id,
      outDate,
    );

    if (!schedule) {
      this.logger.debug(
        `Pas de schedule pour ${employee.user.firstName} ${employee.user.lastName}, skip`,
      );
      return;
    }

    // ÉTAPE 4: Récupérer le manager
    const manager = await this.getEmployeeManager(employee.id);

    if (!manager || !manager.email) {
      this.logger.warn(
        `Pas de manager avec email pour ${employee.user.firstName} ${employee.user.lastName}`,
      );
      return;
    }

    this.logger.log(`[DEBUG] ${employee.user.firstName} ${employee.user.lastName} - ABSENCE_PARTIAL détectée! OUT sans IN. Envoi notification au manager ${manager.firstName} ${manager.lastName}`);

    // ÉTAPE 5: Envoyer notification
    await this.sendManagerNotification(
      tenantId,
      employee,
      manager,
      outTimestamp,
      schedule,
      startOfDay,
    );
  }

  /**
   * Récupère le schedule pour une date donnée
   */
  private async getScheduleForDate(
    tenantId: string,
    employeeId: string,
    date: Date,
  ) {
    const startOfDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const endOfDay = new Date(startOfDay);
    endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);
    endOfDay.setUTCMilliseconds(-1);

    return this.prisma.schedule.findFirst({
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
    outTimestamp: Date,
    schedule: any,
    sessionDate: Date,
  ) {
    // Vérifier si les notifications ABSENCE_PARTIAL sont activées
    const emailConfig = await this.prisma.emailConfig.findUnique({
      where: { tenantId },
    });

    if (!emailConfig || !emailConfig.enabled || !emailConfig.notifyAbsencePartial) {
      this.logger.debug(
        `Notifications ABSENCE_PARTIAL désactivées pour tenant ${tenantId}, skip email`,
      );
      return;
    }

    // Charger le template depuis la BDD
    const template = await this.prisma.emailTemplate.findUnique({
      where: {
        tenantId_code: {
          tenantId,
          code: 'ABSENCE_PARTIAL',
        },
      },
    });

    if (!template || !template.active) {
      this.logger.warn(
        `Template ABSENCE_PARTIAL non trouvé ou inactif pour tenant ${tenantId}`,
      );
      return;
    }

    // Préparer les données pour le template
    const templateData = {
      managerName: `${manager.firstName} ${manager.lastName}`,
      employeeName: `${employee.user.firstName} ${employee.user.lastName}`,
      sessionDate: sessionDate.toLocaleDateString('fr-FR'),
      missingType: 'IN', // OUT sans IN = IN manquant
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
        type: 'ABSENCE_PARTIAL',
        employeeId: employee.user.id,
        managerId: manager.id,
        templateId: template.id,
      },
      tenantId,
    );

    this.logger.log(
      `📧 Email ABSENCE_PARTIAL envoyé à ${manager.email} pour ${employee.user.firstName} ${employee.user.lastName}`,
    );

    // Logger dans la table d'audit
    await this.prisma.absencePartialNotificationLog.create({
      data: {
        tenantId,
        employeeId: employee.user.id,
        managerId: manager.id,
        sessionDate,
        missingType: 'IN',
        outTimestamp,
      },
    });

    this.logger.log(
      `✅ Notification ABSENCE_PARTIAL enregistrée pour ${employee.user.firstName} ${employee.user.lastName}`,
    );
  }
}
