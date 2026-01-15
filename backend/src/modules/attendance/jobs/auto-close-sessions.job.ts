import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../../database/prisma.service';
import { AttendanceType, DeviceType } from '@prisma/client';

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * JOB DE CLOTURE AUTOMATIQUE DES SESSIONS ORPHELINES
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Ce job s'exécute chaque jour à 2h du matin pour clôturer automatiquement
 * les sessions qui n'ont pas de OUT correspondant (badge oublié).
 *
 * Configuration par tenant (TenantSettings):
 * - autoCloseOrphanSessions: Boolean - Active/désactive la clôture auto (défaut: true)
 * - autoCloseDefaultTime: String - Heure de clôture si pas de shift (défaut: "23:59")
 * - autoCloseOvertimeBuffer: Int - Minutes à ajouter après fin shift (défaut: 0)
 * - autoCloseCheckApprovedOvertime: Boolean - Vérifier overtime approuvé (défaut: true)
 *
 * GESTION DES HEURES SUPPLÉMENTAIRES:
 * Ce job vérifie si l'employé a des heures supplémentaires pour éviter de perdre
 * du temps de travail lors de la clôture automatique.
 *
 * Comportement:
 * 1. Pour chaque tenant avec autoCloseOrphanSessions activé
 * 2. Trouve tous les IN de la veille sans OUT correspondant (MISSING_OUT)
 * 3. Vérifie les heures supplémentaires pour l'employé (si checkApprovedOvertime activé):
 *    - Si APPROVED: Ajoute les heures sup à l'heure de fin de shift
 *    - Si PENDING: Marque comme AUTO_CLOSED_CHECK_OVERTIME pour vérification RH
 *    - Si aucun: Applique le buffer configuré (overtimeBuffer minutes)
 * 4. Crée un OUT automatique à:
 *    - Heure fin shift + heures sup approuvées (si overtime APPROVED)
 *    - Heure fin shift + buffer (si buffer configuré)
 *    - Heure fin du schedule/shift/défaut sinon
 * 5. Types d'anomalie créés:
 *    - AUTO_CORRECTION: Session fermée normalement
 *    - AUTO_CLOSED_CHECK_OVERTIME: Heures sup PENDING détectées → à vérifier par RH
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */
@Injectable()
export class AutoCloseSessionsJob {
  private readonly logger = new Logger(AutoCloseSessionsJob.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Parse une chaîne de temps (HH:mm) en objet {hours, minutes}
   */
  private parseTimeString(timeString: string): { hours: number; minutes: number } {
    const [hours, minutes] = timeString.split(':').map(Number);
    return { hours: hours || 0, minutes: minutes || 0 };
  }

  /**
   * Job de clôture automatique - Exécuté à 2h du matin
   */
  @Cron('0 2 * * *') // Tous les jours à 2h00
  async autoCloseSessions() {
    this.logger.log('🔄 Démarrage de la clôture automatique des sessions orphelines...');

    try {
      // Calculer la veille
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const endOfYesterday = new Date(yesterday);
      endOfYesterday.setHours(23, 59, 59, 999);

      // Récupérer tous les tenants
      const tenants = await this.prisma.tenant.findMany({
        include: {
          settings: true,
        },
      });

      this.logger.log(`Traitement de ${tenants.length} tenant(s)...`);

      let totalClosed = 0;

      for (const tenant of tenants) {
        try {
          // Vérifier si la clôture automatique est activée pour ce tenant
          const autoCloseEnabled = tenant.settings?.autoCloseOrphanSessions ?? true;

          if (!autoCloseEnabled) {
            this.logger.log(`⏭️ Tenant ${tenant.id}: Clôture automatique désactivée`);
            continue;
          }

          // Récupérer les paramètres de clôture depuis TenantSettings
          const autoCloseSettings = {
            defaultCloseTime: tenant.settings?.autoCloseDefaultTime || '23:59',
            overtimeBuffer: tenant.settings?.autoCloseOvertimeBuffer ?? 0,
            checkApprovedOvertime: tenant.settings?.autoCloseCheckApprovedOvertime ?? true,
          };

          const closedCount = await this.closeOrphanSessionsForTenant(
            tenant.id,
            yesterday,
            endOfYesterday,
            autoCloseSettings,
          );
          totalClosed += closedCount;
        } catch (error) {
          this.logger.error(
            `Erreur lors de la clôture des sessions pour le tenant ${tenant.id}:`,
            error,
          );
        }
      }

      this.logger.log(`✅ Clôture automatique terminée: ${totalClosed} session(s) clôturée(s)`);
    } catch (error) {
      this.logger.error('Erreur lors de la clôture automatique des sessions:', error);
    }
  }

  /**
   * Clôture les sessions orphelines pour un tenant spécifique
   * @param tenantId ID du tenant
   * @param startDate Date de début de recherche
   * @param endDate Date de fin de recherche
   * @param settings Paramètres de clôture automatique
   */
  private async closeOrphanSessionsForTenant(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    settings: {
      defaultCloseTime: string;
      overtimeBuffer: number;
      checkApprovedOvertime: boolean;
    },
  ): Promise<number> {
    const { defaultCloseTime, overtimeBuffer, checkApprovedOvertime } = settings;

    // Trouver tous les IN de la veille qui ont une anomalie MISSING_OUT
    const orphanIns = await this.prisma.attendance.findMany({
      where: {
        tenantId,
        type: AttendanceType.IN,
        timestamp: { gte: startDate, lte: endDate },
        hasAnomaly: true,
        anomalyType: 'MISSING_OUT',
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            matricule: true,
            currentShiftId: true,
            currentShift: {
              select: {
                endTime: true,
              },
            },
          },
        },
      },
      orderBy: { timestamp: 'asc' },
    });

    this.logger.log(`Tenant ${tenantId}: ${orphanIns.length} session(s) orpheline(s) à clôturer`);

    let closedCount = 0;

    for (const inRecord of orphanIns) {
      try {
        // Vérifier qu'il n'y a vraiment pas de OUT correspondant
        const existingOut = await this.prisma.attendance.findFirst({
          where: {
            tenantId,
            employeeId: inRecord.employeeId,
            type: AttendanceType.OUT,
            timestamp: {
              gt: inRecord.timestamp,
              lte: endDate,
            },
          },
        });

        if (existingOut) {
          // Un OUT existe déjà, nettoyer l'anomalie MISSING_OUT
          await this.prisma.attendance.update({
            where: { id: inRecord.id },
            data: {
              hasAnomaly: false,
              anomalyType: null,
              anomalyNote: null,
            },
          });
          this.logger.log(`🧹 Anomalie MISSING_OUT nettoyée pour ${inRecord.employee.matricule} (OUT trouvé)`);
          continue;
        }

        // Déterminer l'heure du OUT automatique
        let autoOutTime: Date;
        let autoOutNote: string;
        let hasOvertimeConflict = false;
        let overtimeInfo: { status: string; hours: number } | null = null;

        // Chercher le schedule du jour pour cet employé
        const inDate = new Date(inRecord.timestamp);
        const startOfInDay = new Date(inDate);
        startOfInDay.setHours(0, 0, 0, 0);
        const endOfInDay = new Date(inDate);
        endOfInDay.setHours(23, 59, 59, 999);

        // ════════════════════════════════════════════════════════════════════════
        // VÉRIFICATION DES HEURES SUPPLÉMENTAIRES APPROUVÉES
        // ════════════════════════════════════════════════════════════════════════
        if (checkApprovedOvertime) {
          // Chercher si l'employé a des heures supplémentaires approuvées pour ce jour
          const approvedOvertime = await this.prisma.overtime.findFirst({
            where: {
              tenantId,
              employeeId: inRecord.employeeId,
              date: { gte: startOfInDay, lte: endOfInDay },
              status: 'APPROVED',
            },
            orderBy: { hours: 'desc' }, // Prendre la plus grande durée si plusieurs
          });

          if (approvedOvertime) {
            // Heures sup approuvées trouvées - utiliser cette info pour le OUT
            overtimeInfo = {
              status: 'APPROVED',
              hours: Number(approvedOvertime.hours),
            };
            this.logger.log(
              `📊 Overtime APPROVED trouvé pour ${inRecord.employee.matricule}: ${approvedOvertime.hours}h`,
            );
          } else {
            // Chercher des heures supplémentaires en attente (PENDING)
            const pendingOvertime = await this.prisma.overtime.findFirst({
              where: {
                tenantId,
                employeeId: inRecord.employeeId,
                date: { gte: startOfInDay, lte: endOfInDay },
                status: 'PENDING',
              },
              orderBy: { hours: 'desc' },
            });

            if (pendingOvertime) {
              // Heures sup en attente - marquer pour vérification RH
              hasOvertimeConflict = true;
              overtimeInfo = {
                status: 'PENDING',
                hours: Number(pendingOvertime.hours),
              };
              this.logger.log(
                `⚠️ Overtime PENDING trouvé pour ${inRecord.employee.matricule}: ${pendingOvertime.hours}h - Vérification RH requise`,
              );
            }
          }
        }

        const schedule = await this.prisma.schedule.findFirst({
          where: {
            tenantId,
            employeeId: inRecord.employeeId,
            date: { gte: startOfInDay, lte: endOfInDay },
            status: 'PUBLISHED',
          },
          include: {
            shift: true,
          },
        });

        // Calculer l'heure de fin de base (shift)
        let baseEndTime: Date;
        let baseEndTimeStr: string;

        if (schedule?.shift?.endTime) {
          // Utiliser l'heure de fin du shift
          const endTime = this.parseTimeString(schedule.customEndTime || schedule.shift.endTime);
          baseEndTime = new Date(inDate);
          baseEndTime.setHours(endTime.hours, endTime.minutes, 0, 0);
          baseEndTimeStr = schedule.customEndTime || schedule.shift.endTime;

          // Si l'heure de fin est avant l'heure de début (shift de nuit), ajouter un jour
          const startTime = this.parseTimeString(schedule.customStartTime || schedule.shift.startTime);
          if (endTime.hours < startTime.hours) {
            baseEndTime.setDate(baseEndTime.getDate() + 1);
          }
        } else if (inRecord.employee.currentShift?.endTime) {
          // Utiliser le shift par défaut de l'employé
          const endTime = this.parseTimeString(inRecord.employee.currentShift.endTime);
          baseEndTime = new Date(inDate);
          baseEndTime.setHours(endTime.hours, endTime.minutes, 0, 0);
          baseEndTimeStr = inRecord.employee.currentShift.endTime;
        } else {
          // Pas de shift, utiliser l'heure par défaut configurée dans TenantSettings
          const defaultTime = this.parseTimeString(defaultCloseTime);
          baseEndTime = new Date(inDate);
          baseEndTime.setHours(defaultTime.hours, defaultTime.minutes, 0, 0);
          baseEndTimeStr = defaultCloseTime;
        }

        // ════════════════════════════════════════════════════════════════════════
        // CALCUL DE L'HEURE DE CLÔTURE FINALE
        // ════════════════════════════════════════════════════════════════════════
        if (overtimeInfo?.status === 'APPROVED' && overtimeInfo.hours > 0) {
          // Heures sup approuvées : ajouter les heures après la fin du shift
          autoOutTime = new Date(baseEndTime.getTime() + overtimeInfo.hours * 60 * 60 * 1000);
          autoOutNote = `OUT automatique créé avec ${overtimeInfo.hours}h d'heures supplémentaires approuvées. Fin shift: ${baseEndTimeStr}, OUT calculé: ${autoOutTime.toLocaleTimeString('fr-FR')}. Badge oublié détecté par le système.`;
        } else if (overtimeBuffer > 0) {
          // Buffer configuré : ajouter X minutes après la fin du shift
          autoOutTime = new Date(baseEndTime.getTime() + overtimeBuffer * 60 * 1000);
          autoOutNote = `OUT automatique créé à fin de shift (${baseEndTimeStr}) + buffer overtime (${overtimeBuffer} min). Badge oublié détecté par le système.`;
        } else {
          // Pas d'overtime ni de buffer : utiliser l'heure de fin de shift
          autoOutTime = baseEndTime;
          if (schedule?.shift?.endTime) {
            autoOutNote = `OUT automatique créé à l'heure de fin de shift (${baseEndTimeStr}). Badge oublié détecté par le système.`;
          } else if (inRecord.employee.currentShift?.endTime) {
            autoOutNote = `OUT automatique créé à l'heure de fin de shift par défaut (${baseEndTimeStr}). Badge oublié détecté par le système.`;
          } else {
            autoOutNote = `OUT automatique créé à ${defaultCloseTime} (pas de shift défini, heure configurée). Badge oublié détecté par le système.`;
          }
        }

        // Déterminer le type d'anomalie en fonction du contexte overtime
        let anomalyType = 'AUTO_CORRECTION';
        if (hasOvertimeConflict) {
          anomalyType = 'AUTO_CLOSED_CHECK_OVERTIME';
          autoOutNote += ` ⚠️ ATTENTION: Heures supplémentaires PENDING (${overtimeInfo?.hours}h) - Vérification RH requise pour ajuster si nécessaire.`;
        }

        // Créer le OUT automatique
        await this.prisma.attendance.create({
          data: {
            tenantId,
            employeeId: inRecord.employeeId,
            deviceId: inRecord.deviceId,
            siteId: inRecord.siteId,
            timestamp: autoOutTime,
            type: AttendanceType.OUT,
            method: DeviceType.MANUAL, // Marqué comme manuel pour indiquer correction
            hasAnomaly: true,
            anomalyType: anomalyType,
            anomalyNote: autoOutNote,
            rawData: {
              autoGenerated: true,
              originalInId: inRecord.id,
              generatedAt: new Date().toISOString(),
              reason: 'MISSING_OUT_AUTO_CLOSE',
              overtimeInfo: overtimeInfo,
              overtimeBuffer: overtimeBuffer,
              baseEndTime: baseEndTime.toISOString(),
              hasOvertimeConflict: hasOvertimeConflict,
            },
          },
        });

        // Mettre à jour le IN pour indiquer qu'il a été clôturé automatiquement
        const inAnomalyType = hasOvertimeConflict ? 'AUTO_CLOSED_CHECK_OVERTIME' : 'AUTO_CLOSED';
        await this.prisma.attendance.update({
          where: { id: inRecord.id },
          data: {
            hasAnomaly: true,
            anomalyType: inAnomalyType,
            anomalyNote: `Session clôturée automatiquement à ${autoOutTime.toLocaleTimeString('fr-FR')}. ${autoOutNote}`,
          },
        });

        closedCount++;
        const logIcon = hasOvertimeConflict ? '⚠️' : '✅';
        this.logger.log(
          `${logIcon} Session clôturée: ${inRecord.employee.firstName} ${inRecord.employee.lastName} (${inRecord.employee.matricule}) - IN à ${inRecord.timestamp.toLocaleString('fr-FR')} → OUT à ${autoOutTime.toLocaleString('fr-FR')}${hasOvertimeConflict ? ' (OVERTIME CONFLICT - À VÉRIFIER)' : ''}`,
        );
      } catch (error) {
        this.logger.error(
          `Erreur lors de la clôture de la session ${inRecord.id}:`,
          error,
        );
      }
    }

    return closedCount;
  }
}
