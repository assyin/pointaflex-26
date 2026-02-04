import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../database/prisma.service';
import { AttendanceType, OvertimeStatus, LeaveStatus, RecoveryDayStatus } from '@prisma/client';
import { OvertimeService } from '../overtime.service';

@Injectable()
export class DetectOvertimeJob {
  private readonly logger = new Logger(DetectOvertimeJob.name);

  constructor(
    private prisma: PrismaService,
    private overtimeService: OvertimeService,
  ) {}

  /**
   * Job batch quotidien de CONSOLIDATION des heures supplémentaires
   *
   * MODÈLE HYBRIDE:
   * - Niveau 1 (Temps réel): Les Overtime sont créés immédiatement lors du pointage OUT
   *   dans AttendanceService.createAutoOvertime()
   * - Niveau 2 (Ce job): Filet de sécurité qui vérifie, recalcule et corrige les incohérences
   *
   * Ce job ne crée plus systématiquement de nouvelles heures, mais:
   * 1. Détecte les pointages avec overtimeMinutes > seuil SANS Overtime associé
   * 2. Recalcule les heures si nécessaire (corrections de pointage)
   * 3. Signale les incohérences pour audit
   *
   * Exécution par défaut à minuit chaque jour
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async detectOvertime() {
    this.logger.log('🔄 Démarrage du job de CONSOLIDATION des heures supplémentaires...');

    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const yesterdayEnd = new Date(yesterday);
      yesterdayEnd.setHours(23, 59, 59, 999);

      // Récupérer tous les tenants
      const tenants = await this.prisma.tenant.findMany({
        include: {
          settings: true,
        },
      });

      this.logger.log(`Traitement de ${tenants.length} tenant(s)...`);

      for (const tenant of tenants) {
        try {
          await this.consolidateOvertimeForTenant(tenant.id, yesterday, yesterdayEnd);
        } catch (error) {
          this.logger.error(
            `Erreur lors de la consolidation des heures sup pour le tenant ${tenant.id}:`,
            error,
          );
        }
      }

      this.logger.log('✅ Consolidation des heures supplémentaires terminée avec succès');
    } catch (error) {
      this.logger.error('Erreur lors de la consolidation globale des heures sup:', error);
    }
  }

  /**
   * Consolide et vérifie les Overtime pour un tenant spécifique
   *
   * Rôle: Filet de sécurité pour détecter et corriger les incohérences
   * - Crée les Overtime manquants (si le temps réel a échoué)
   * - Vérifie la cohérence entre pointages et Overtime existants
   * - Log les anomalies pour audit
   */
  private async consolidateOvertimeForTenant(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ) {
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
      select: {
        overtimeMinimumThreshold: true,
        overtimeAutoDetectType: true,
        nightShiftStart: true,
        nightShiftEnd: true,
        overtimeMajorationEnabled: true,
        overtimeRateStandard: true,
        overtimeRateNight: true,
        overtimeRateHoliday: true,
        overtimeRateEmergency: true,
        // Auto-approbation
        overtimeAutoApprove: true,
        overtimeAutoApproveMaxHours: true,
        // Fallback sur anciens champs
        overtimeRate: true,
        nightShiftRate: true,
      },
    });

    const minimumThreshold = settings?.overtimeMinimumThreshold || 30; // Défaut: 30 minutes
    const autoDetectType = settings?.overtimeAutoDetectType !== false; // Activé par défaut
    const autoApprove = settings?.overtimeAutoApprove === true; // Désactivé par défaut
    const autoApproveMaxHours = Number(settings?.overtimeAutoApproveMaxHours) || 4.0; // 4h par défaut

    // Récupérer tous les Attendance avec overtimeMinutes > seuil minimum
    const attendancesWithOvertime = await this.prisma.attendance.findMany({
      where: {
        tenantId,
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
        type: AttendanceType.OUT,
        overtimeMinutes: {
          gt: minimumThreshold, // Seulement si supérieur au seuil minimum
        },
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            matricule: true,
            isEligibleForOvertime: true,
            maxOvertimeHoursPerMonth: true,
            maxOvertimeHoursPerWeek: true,
          },
        },
      },
      orderBy: { timestamp: 'asc' },
    });

    this.logger.log(
      `🔍 Vérification de ${attendancesWithOvertime.length} pointage(s) avec heures sup pour le tenant ${tenantId}...`,
    );

    // Charger les jours fériés pour la période (si détection auto activée)
    let holidays: Set<string> = new Set();
    if (autoDetectType) {
      const holidayRecords = await this.prisma.holiday.findMany({
        where: {
          tenantId,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: { date: true },
      });
      holidays = new Set(holidayRecords.map(h => h.date.toISOString().split('T')[0]));
      this.logger.debug(`${holidays.size} jour(s) férié(s) trouvé(s) pour la période`);
    }

    let createdCount = 0;
    let existingCount = 0;
    let skippedCount = 0;

    for (const attendance of attendancesWithOvertime) {
      try {
        // Vérifier l'éligibilité
        if (attendance.employee.isEligibleForOvertime === false) {
          this.logger.debug(
            `Skipping overtime pour ${attendance.employee.firstName} ${attendance.employee.lastName} (non éligible)`,
          );
          skippedCount++;
          continue;
        }

        // FIX 03/02/2026: Trouver le IN correspondant pour utiliser sa date comme date de travail
        // Pour les shifts de nuit, le OUT peut être le lendemain du IN
        const outTimestamp = new Date(attendance.timestamp);
        const searchStart = new Date(outTimestamp);
        searchStart.setHours(searchStart.getHours() - 24); // Chercher jusqu'à 24h avant

        const matchingIn = await this.prisma.attendance.findFirst({
          where: {
            tenantId,
            employeeId: attendance.employeeId,
            type: AttendanceType.IN,
            timestamp: {
              gte: searchStart,
              lt: outTimestamp,
            },
            NOT: {
              anomalyType: { in: ['DEBOUNCE_BLOCKED', 'ABSENCE'] },
            },
          },
          orderBy: { timestamp: 'desc' },
        });

        // Utiliser la date du IN si trouvé, sinon la date du OUT
        const workDate = matchingIn
          ? new Date(matchingIn.timestamp.toISOString().split('T')[0])
          : new Date(outTimestamp.toISOString().split('T')[0]);

        // Vérifier si l'employé est en congé ou en récupération
        const attendanceDate = workDate;
        const leaveCheck = await this.isEmployeeOnLeaveOrRecovery(
          tenantId,
          attendance.employeeId,
          attendanceDate,
        );

        if (leaveCheck.isOnLeave) {
          this.logger.debug(
            `Skipping overtime pour ${attendance.employee.firstName} ${attendance.employee.lastName} (${leaveCheck.reason})`,
          );
          skippedCount++;
          continue;
        }

        // Vérifier si un Overtime existe déjà pour cette date
        const existingOvertime = await this.prisma.overtime.findFirst({
          where: {
            tenantId,
            employeeId: attendance.employeeId,
            date: workDate,
          },
        });

        if (existingOvertime) {
          // L'overtime existe déjà (créé en temps réel) - vérification OK
          existingCount++;
          continue;
        }

        // ⚠️ FILET DE SÉCURITÉ: Overtime manquant détecté
        const workDateStr = workDate.toISOString().split('T')[0];
        this.logger.warn(
          `⚠️ [CONSOLIDATION] Overtime manquant détecté pour ${attendance.employee.firstName} ${attendance.employee.lastName} le ${workDateStr} - Création...`,
        );

        // Convertir overtimeMinutes en heures
        const overtimeHours = (attendance.overtimeMinutes || 0) / 60;

        // Vérifier les plafonds si configurés
        let hoursToCreate = overtimeHours;
        if (
          attendance.employee.maxOvertimeHoursPerMonth ||
          attendance.employee.maxOvertimeHoursPerWeek
        ) {
          const limitsCheck = await this.overtimeService.checkOvertimeLimits(
            tenantId,
            attendance.employeeId,
            overtimeHours,
            workDate,
          );

          if (limitsCheck.exceedsLimit) {
            this.logger.warn(
              `Plafond atteint pour ${attendance.employee.firstName} ${attendance.employee.lastName}. Overtime non créé.`,
            );
            skippedCount++;
            continue;
          }

          // Si le plafond est partiellement atteint, ajuster les heures
          if (limitsCheck.adjustedHours !== undefined && limitsCheck.adjustedHours < overtimeHours) {
            hoursToCreate = limitsCheck.adjustedHours;
            this.logger.warn(
              `Plafond partiel pour ${attendance.employee.firstName} ${attendance.employee.lastName}. ${hoursToCreate.toFixed(2)}h créées au lieu de ${overtimeHours.toFixed(2)}h`,
            );
          }
        }

        // Détecter le type d'overtime si l'option est activée
        let overtimeType: 'STANDARD' | 'NIGHT' | 'HOLIDAY' | 'EMERGENCY' = 'STANDARD';

        if (autoDetectType) {
          // Vérifier si c'est un jour férié (utiliser workDateStr)
          if (holidays.has(workDateStr)) {
            overtimeType = 'HOLIDAY';
            this.logger.debug(`Type HOLIDAY détecté pour ${workDateStr} (jour férié)`);
          }
          // Vérifier si c'est un shift de nuit
          else if (this.isNightShiftTime(attendance.timestamp, settings)) {
            overtimeType = 'NIGHT';
            this.logger.debug(`Type NIGHT détecté pour ${attendance.timestamp.toISOString()}`);
          }
        }

        // Calculer le taux de majoration avec la méthode du service
        const rate = this.overtimeService.getOvertimeRate(settings, overtimeType);

        // Déterminer le statut selon l'auto-approbation
        const shouldAutoApprove = autoApprove && hoursToCreate <= autoApproveMaxHours;
        const status = shouldAutoApprove ? OvertimeStatus.APPROVED : OvertimeStatus.PENDING;
        const statusNote = shouldAutoApprove ? ' - Auto-approuvé' : '';

        // Créer l'Overtime
        await this.prisma.overtime.create({
          data: {
            tenantId,
            employeeId: attendance.employeeId,
            date: workDate,
            hours: hoursToCreate,
            approvedHours: shouldAutoApprove ? hoursToCreate : null,
            type: overtimeType,
            rate,
            isNightShift: overtimeType === 'NIGHT', // Backward compatibility
            status,
            approvedAt: shouldAutoApprove ? new Date() : null,
            notes: `[CONSOLIDATION] Créé par le job de filet de sécurité depuis le pointage du ${attendance.timestamp.toLocaleDateString('fr-FR')}${overtimeType !== 'STANDARD' ? ` (${overtimeType})` : ''}${statusNote}`,
          },
        });

        createdCount++;
        const statusEmoji = shouldAutoApprove ? '✅' : '⏳';
        const statusText = shouldAutoApprove ? 'auto-approuvé' : 'en attente';
        this.logger.log(
          `${statusEmoji} Overtime ${statusText} pour ${attendance.employee.firstName} ${attendance.employee.lastName} (${attendance.employee.matricule}): ${hoursToCreate.toFixed(2)}h`,
        );
      } catch (error) {
        this.logger.error(
          `Erreur lors de la création de l'Overtime pour le pointage ${attendance.id}:`,
          error,
        );
        skippedCount++;
      }
    }

    // Log de synthèse
    if (createdCount > 0) {
      this.logger.warn(
        `⚠️ [CONSOLIDATION] ${createdCount} overtime(s) manquant(s) créé(s) par le filet de sécurité`,
      );
    }

    this.logger.log(
      `📊 Consolidation pour tenant ${tenantId}: ${existingCount} déjà créé(s) en temps réel, ${createdCount} récupéré(s), ${skippedCount} ignoré(s).`,
    );
  }

  /**
   * Vérifie si un timestamp tombe dans la plage horaire de nuit configurée
   * @param timestamp Le timestamp à vérifier
   * @param settings Configuration du tenant avec nightShiftStart et nightShiftEnd
   * @returns true si le timestamp est dans la plage de nuit
   */
  private isNightShiftTime(timestamp: Date, settings: any): boolean {
    // Valeurs par défaut: 21:00 - 06:00
    const nightStart = settings?.nightShiftStart || '21:00';
    const nightEnd = settings?.nightShiftEnd || '06:00';

    const [startHour, startMin] = nightStart.split(':').map(Number);
    const [endHour, endMin] = nightEnd.split(':').map(Number);

    const hour = timestamp.getHours();
    const minute = timestamp.getMinutes();
    const currentMinutes = hour * 60 + minute;
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    // Cas où le shift de nuit traverse minuit (ex: 21:00 - 06:00)
    if (startMinutes > endMinutes) {
      // Le timestamp est dans la plage de nuit s'il est >= startMinutes OU <= endMinutes
      return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
    } else {
      // Cas normal (ex: 22:00 - 02:00 qui serait 22:00 - 26:00 en heures continues)
      // ou cas atypique où nightEnd > nightStart (ex: 06:00 - 14:00)
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    }
  }

  /**
   * Vérifie si un employé est en congé ou en récupération pour une date donnée
   * @param tenantId L'ID du tenant
   * @param employeeId L'ID de l'employé
   * @param date La date à vérifier
   * @returns Un objet avec isOnLeave, leaveType (si applicable)
   */
  private async isEmployeeOnLeaveOrRecovery(
    tenantId: string,
    employeeId: string,
    date: Date,
  ): Promise<{ isOnLeave: boolean; reason?: string }> {
    // Vérifier les congés approuvés
    const approvedLeaveStatuses = [
      LeaveStatus.APPROVED,
      LeaveStatus.MANAGER_APPROVED,
      LeaveStatus.HR_APPROVED,
    ];

    const leave = await this.prisma.leave.findFirst({
      where: {
        tenantId,
        employeeId,
        status: { in: approvedLeaveStatuses },
        startDate: { lte: date },
        endDate: { gte: date },
      },
      include: {
        leaveType: { select: { name: true } },
      },
    });

    if (leave) {
      return {
        isOnLeave: true,
        reason: `en congé (${leave.leaveType.name})`,
      };
    }

    // Vérifier les jours de récupération approuvés ou utilisés
    const recoveryDay = await this.prisma.recoveryDay.findFirst({
      where: {
        tenantId,
        employeeId,
        status: { in: [RecoveryDayStatus.APPROVED, RecoveryDayStatus.USED] },
        startDate: { lte: date },
        endDate: { gte: date },
      },
    });

    if (recoveryDay) {
      return {
        isOnLeave: true,
        reason: 'en jour de récupération',
      };
    }

    return { isOnLeave: false };
  }
}

