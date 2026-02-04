import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RecoveryDayStatus, LeaveStatus, OvertimeStatus } from '@prisma/client';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { WebhookAttendanceDto } from './dto/webhook-attendance.dto';
import { WebhookStateDto, WebhookStateResponseDto } from './dto/webhook-state.dto';
import { CorrectAttendanceDto } from './dto/correct-attendance.dto';
import { ValidateAttendanceDto, ValidationAction } from './dto/validate-attendance.dto';
import { AttendanceType, NotificationType, DeviceType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { findEmployeeByMatriculeFlexible } from '../../common/utils/matricule.util';
import { getManagerLevel, getManagedEmployeeIds } from '../../common/utils/manager-level.util';
import { SupplementaryDaysService } from '../supplementary-days/supplementary-days.service';
import { WrongTypeDetectionService } from './wrong-type-detection.service';

@Injectable()
export class AttendanceService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => SupplementaryDaysService))
    private supplementaryDaysService: SupplementaryDaysService,
    private wrongTypeDetectionService: WrongTypeDetectionService,
  ) {}

  /**
   * Arrondit les heures supplémentaires selon la configuration du tenant
   * @param hours Heures en décimal (ex: 1.75 pour 1h45)
   * @param roundingMinutes Minutes d'arrondi (15, 30, ou 60)
   * @returns Heures arrondies
   */
  private roundOvertimeHours(hours: number, roundingMinutes: number): number {
    if (roundingMinutes <= 0) return hours;

    const totalMinutes = hours * 60;
    const roundedMinutes = Math.round(totalMinutes / roundingMinutes) * roundingMinutes;
    return roundedMinutes / 60;
  }

  /**
   * Récupère le taux de majoration selon le type d'heures supplémentaires
   * @param settings Configuration du tenant
   * @param overtimeType Type d'heures supplémentaires
   * @returns Taux de majoration
   */
  private getOvertimeRate(settings: any, overtimeType: string): number {
    const majorationEnabled = settings?.overtimeMajorationEnabled !== false;
    if (!majorationEnabled) return 1.0;

    switch (overtimeType) {
      case 'NIGHT':
        return Number(settings?.overtimeRateNight ?? settings?.nightShiftRate ?? 1.50);
      case 'HOLIDAY':
        return Number(settings?.overtimeRateHoliday ?? settings?.holidayOvertimeRate ?? 2.00);
      case 'EMERGENCY':
        return Number(settings?.overtimeRateEmergency ?? 1.30);
      case 'STANDARD':
      default:
        return Number(settings?.overtimeRateStandard ?? settings?.overtimeRate ?? 1.25);
    }
  }

  /**
   * Vérifie si un timestamp tombe dans la plage horaire de nuit configurée
   */
  private isNightShiftTime(timestamp: Date, settings: any): boolean {
    const nightStart = settings?.nightShiftStart || '21:00';
    const nightEnd = settings?.nightShiftEnd || '06:00';

    const [startHour, startMin] = nightStart.split(':').map(Number);
    const [endHour, endMin] = nightEnd.split(':').map(Number);

    const hour = timestamp.getHours();
    const minute = timestamp.getMinutes();
    const currentMinutes = hour * 60 + minute;
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    if (startMinutes > endMinutes) {
      return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
    }
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  }

  /**
   * Création automatique d'Overtime en temps réel lors d'un pointage OUT
   * avec heures supplémentaires détectées (Modèle hybride - Niveau 1)
   */
  private async createAutoOvertime(
    tenantId: string,
    attendance: any,
    overtimeMinutes: number,
  ): Promise<void> {
    try {
      // 1. Récupérer les settings du tenant
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
          overtimeAutoApprove: true,
          overtimeAutoApproveMaxHours: true,
          overtimeRate: true,
          nightShiftRate: true,
        },
      });

      const minimumThreshold = settings?.overtimeMinimumThreshold || 30;

      // Vérifier si les heures supplémentaires dépassent le seuil minimum
      if (overtimeMinutes <= minimumThreshold) {
        console.log(`[AutoOvertime] ${overtimeMinutes}min <= seuil ${minimumThreshold}min, pas de création`);
        return;
      }

      // 2. Vérifier l'éligibilité de l'employé
      const employee = await this.prisma.employee.findUnique({
        where: { id: attendance.employeeId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          matricule: true,
          isEligibleForOvertime: true,
          maxOvertimeHoursPerMonth: true,
          maxOvertimeHoursPerWeek: true,
        },
      });

      if (!employee || employee.isEligibleForOvertime === false) {
        console.log(`[AutoOvertime] Employé non éligible: ${employee?.firstName} ${employee?.lastName}`);
        return;
      }

      // 3. FIX 03/02/2026: Trouver le IN correspondant pour utiliser sa date comme date de travail
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
          // Exclure les pointages bloqués ou générés
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

      console.log(`[AutoOvertime] Date de travail déterminée: ${workDate.toISOString().split('T')[0]} (IN: ${matchingIn ? matchingIn.timestamp.toISOString() : 'non trouvé'}, OUT: ${outTimestamp.toISOString()})`);

      // 4. Vérifier si l'employé est en congé ou récupération
      const attendanceDate = workDate;
      const approvedLeaveStatuses = [LeaveStatus.APPROVED, LeaveStatus.MANAGER_APPROVED, LeaveStatus.HR_APPROVED];

      const leave = await this.prisma.leave.findFirst({
        where: {
          tenantId,
          employeeId: attendance.employeeId,
          status: { in: approvedLeaveStatuses },
          startDate: { lte: attendanceDate },
          endDate: { gte: attendanceDate },
        },
      });

      if (leave) {
        console.log(`[AutoOvertime] Employé en congé, pas de création`);
        return;
      }

      const recoveryDay = await this.prisma.recoveryDay.findFirst({
        where: {
          tenantId,
          employeeId: attendance.employeeId,
          status: { in: ['APPROVED', 'USED'] },
          startDate: { lte: attendanceDate },
          endDate: { gte: attendanceDate },
        },
      });

      if (recoveryDay) {
        console.log(`[AutoOvertime] Employé en jour de récupération, pas de création`);
        return;
      }

      // 4. Vérifier si un Overtime existe déjà pour cette date
      const existingOvertime = await this.prisma.overtime.findFirst({
        where: {
          tenantId,
          employeeId: attendance.employeeId,
          date: attendanceDate,
        },
      });

      if (existingOvertime) {
        console.log(`[AutoOvertime] Overtime existe déjà pour ${employee.firstName} ${employee.lastName} le ${attendanceDate.toISOString().split('T')[0]}`);
        return;
      }

      // 5. Convertir en heures et déterminer le type
      const overtimeHours = overtimeMinutes / 60;
      const autoDetectType = settings?.overtimeAutoDetectType !== false;

      let overtimeType: 'STANDARD' | 'NIGHT' | 'HOLIDAY' | 'EMERGENCY' = 'STANDARD';
      const dateStr = attendanceDate.toISOString().split('T')[0];

      if (autoDetectType) {
        // Vérifier si c'est un jour férié
        const holiday = await this.prisma.holiday.findFirst({
          where: {
            tenantId,
            date: attendanceDate,
          },
        });

        if (holiday) {
          overtimeType = 'HOLIDAY';
        } else if (this.isNightShiftTime(attendance.timestamp, settings)) {
          overtimeType = 'NIGHT';
        }
      }

      // 6. Calculer le taux de majoration
      const rate = this.getOvertimeRate(settings, overtimeType);

      // 7. Déterminer le statut (auto-approbation si configurée)
      const autoApprove = settings?.overtimeAutoApprove === true;
      const autoApproveMaxHours = Number(settings?.overtimeAutoApproveMaxHours) || 4.0;
      const shouldAutoApprove = autoApprove && overtimeHours <= autoApproveMaxHours;
      const status = shouldAutoApprove ? OvertimeStatus.APPROVED : OvertimeStatus.PENDING;

      // 8. Créer l'Overtime
      const overtime = await this.prisma.overtime.create({
        data: {
          tenantId,
          employeeId: attendance.employeeId,
          date: attendanceDate,
          hours: overtimeHours,
          approvedHours: shouldAutoApprove ? overtimeHours : null,
          type: overtimeType,
          rate,
          isNightShift: overtimeType === 'NIGHT',
          status,
          approvedAt: shouldAutoApprove ? new Date() : null,
          notes: `Créé automatiquement depuis pointage du ${attendance.timestamp.toLocaleDateString('fr-FR')}${overtimeType !== 'STANDARD' ? ` (${overtimeType})` : ''}${shouldAutoApprove ? ' - Auto-approuvé' : ''}`,
        },
      });

      const statusEmoji = shouldAutoApprove ? '✅' : '⏳';
      const statusText = shouldAutoApprove ? 'auto-approuvé' : 'en attente';
      console.log(`[AutoOvertime] ${statusEmoji} Overtime ${statusText} créé pour ${employee.firstName} ${employee.lastName} (${employee.matricule}): ${overtimeHours.toFixed(2)}h de type ${overtimeType}`);

    } catch (error) {
      // Ne pas bloquer le pointage si la création de l'overtime échoue
      console.error(`[AutoOvertime] Erreur lors de la création automatique:`, error);
    }
  }

  /**
   * Création automatique d'un jour supplémentaire en temps réel lors d'un pointage OUT
   * sur un weekend ou jour férié (Modèle hybride - Niveau 1)
   */
  private async createAutoSupplementaryDay(
    tenantId: string,
    attendance: any,
    hoursWorked: number,
    checkIn?: Date,
  ): Promise<void> {
    try {
      // Ne pas créer si pas d'heures travaillées
      if (!hoursWorked || hoursWorked <= 0) {
        return;
      }

      // Trouver le pointage IN correspondant si non fourni
      let checkInTime = checkIn;
      if (!checkInTime) {
        const attendanceDate = new Date(attendance.timestamp);
        const startOfDay = new Date(attendanceDate);
        startOfDay.setHours(0, 0, 0, 0);

        const checkInAttendance = await this.prisma.attendance.findFirst({
          where: {
            tenantId,
            employeeId: attendance.employeeId,
            type: 'IN',
            timestamp: {
              gte: startOfDay,
              lt: attendance.timestamp,
            },
          },
          orderBy: { timestamp: 'desc' },
        });

        checkInTime = checkInAttendance?.timestamp || attendance.timestamp;
      }

      // Appeler le service de jours supplémentaires
      const result = await this.supplementaryDaysService.createAutoSupplementaryDay({
        tenantId,
        employeeId: attendance.employeeId,
        attendanceId: attendance.id,
        date: new Date(attendance.timestamp),
        checkIn: checkInTime,
        checkOut: attendance.timestamp,
        hoursWorked,
      });

      if (result.created) {
        console.log(`[AutoSupplementaryDay] ✅ Jour supplémentaire créé depuis pointage`);
      }
    } catch (error) {
      // Ne pas bloquer le pointage si la création du jour supplémentaire échoue
      console.error(`[AutoSupplementaryDay] Erreur lors de la création automatique:`, error);
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════════════
   * POINTAGE MANUEL (via interface RH/Admin)
   * ═══════════════════════════════════════════════════════════════════════════════
   *
   * PHILOSOPHIE : Contrôle strict avec validation
   *
   * Contrairement aux pointages terminal, les pointages manuels sont soumis à une
   * validation stricte via validateScheduleOrShift() qui peut BLOQUER le pointage si :
   * - C'est un weekend/jour férié sans planning explicite
   * - Aucun shift par défaut n'est assigné ET aucun planning publié
   *
   * RAISON : L'interface RH permet d'afficher des messages d'erreur clairs et de
   * guider l'utilisateur vers la bonne configuration avant la saisie.
   *
   * Pour les jours ouvrables sans planning/shift, le pointage est AUTORISÉ mais
   * une anomalie UNPLANNED_PUNCH est créée pour traçabilité.
   *
   * @see handleWebhookFast() pour la philosophie différente des pointages terminal
   * ═══════════════════════════════════════════════════════════════════════════════
   */
  async create(tenantId: string, createAttendanceDto: CreateAttendanceDto) {
    // Logger la tentative de pointage (Cas E)
    let attemptId: string | null = null;
    try {
      // Créer un log de tentative
      const attempt = await this.prisma.attendanceAttempt.create({
        data: {
          tenantId,
          employeeId: createAttendanceDto.employeeId,
          deviceId: createAttendanceDto.deviceId || null,
          timestamp: new Date(createAttendanceDto.timestamp),
          type: createAttendanceDto.type,
          method: createAttendanceDto.method,
          status: 'SUCCESS', // Sera mis à jour si échec
          rawData: createAttendanceDto.rawData || null,
        },
      });
      attemptId = attempt.id;
    } catch (error) {
      // Ne pas bloquer si le logging échoue
      console.error('Erreur lors du logging de la tentative:', error);
    }

    try {
      // Vérifier que l'employé existe
      const employee = await this.prisma.employee.findFirst({
        where: {
          id: createAttendanceDto.employeeId,
          tenantId,
        },
      });

      if (!employee) {
        // Mettre à jour le log en échec
        if (attemptId) {
          await this.prisma.attendanceAttempt.update({
            where: { id: attemptId },
            data: {
              status: 'FAILED',
              errorCode: 'EMPLOYEE_NOT_FOUND',
              errorMessage: 'Employee not found',
            },
          });
        }
        throw new NotFoundException('Employee not found');
      }

      // Vérifier la configuration du pointage des repos
      await this.validateBreakPunch(tenantId, createAttendanceDto.type);

      // VALIDATION RENFORCÉE : Vérifier qu'un planning ou shift existe
      await this.validateScheduleOrShift(tenantId, createAttendanceDto.employeeId, new Date(createAttendanceDto.timestamp), createAttendanceDto.type);

      // ═══════════════════════════════════════════════════════════════════════════════
      // ANTI-REBOND (Debounce) pour pointages manuels - Même logique que les terminaux
      // ═══════════════════════════════════════════════════════════════════════════════
      const debounceSettings = await this.prisma.tenantSettings.findUnique({
        where: { tenantId },
        select: { doublePunchToleranceMinutes: true },
      });
      const DEBOUNCE_MINUTES = debounceSettings?.doublePunchToleranceMinutes ?? 4;
      const punchTimestamp = new Date(createAttendanceDto.timestamp);

      // DEBUG: Log des valeurs
      console.log(`🔍 [DEBOUNCE-DEBUG] tenantId: ${tenantId}`);
      console.log(`🔍 [DEBOUNCE-DEBUG] employeeId: ${createAttendanceDto.employeeId}`);
      console.log(`🔍 [DEBOUNCE-DEBUG] punchTimestamp: ${punchTimestamp.toISOString()}`);
      console.log(`🔍 [DEBOUNCE-DEBUG] DEBOUNCE_MINUTES: ${DEBOUNCE_MINUTES}`);

      // Count existing punches for this employee
      const existingCount = await this.prisma.attendance.count({
        where: { tenantId, employeeId: createAttendanceDto.employeeId },
      });
      console.log(`🔍 [DEBOUNCE-DEBUG] existingPunchCount: ${existingCount}`);

      // Chercher le dernier pointage (exclure les DEBOUNCE_BLOCKED)
      // FIX: Utiliser OR pour inclure les enregistrements avec anomalyType NULL
      const lastPunch = await this.prisma.attendance.findFirst({
        where: {
          tenantId,
          employeeId: createAttendanceDto.employeeId,
          OR: [
            { anomalyType: null },
            { anomalyType: { not: 'DEBOUNCE_BLOCKED' } },
          ],
        },
        orderBy: { timestamp: 'desc' },
      });

      console.log(`🔍 [DEBOUNCE-DEBUG] lastPunch: ${lastPunch ? lastPunch.timestamp.toISOString() : 'NULL'}`);

      if (lastPunch) {
        const diffMinutes = (punchTimestamp.getTime() - lastPunch.timestamp.getTime()) / (1000 * 60);
        console.log(`🔍 [DEBOUNCE-DEBUG] diffMinutes: ${diffMinutes.toFixed(2)} (condition: >= 0 && < ${DEBOUNCE_MINUTES})`);

        if (diffMinutes >= 0 && diffMinutes < DEBOUNCE_MINUTES) {
          console.log(`⚠️ [DEBOUNCE-MANUAL] Badge ignoré pour ${employee.matricule}: ${diffMinutes.toFixed(1)} min depuis le dernier (< ${DEBOUNCE_MINUTES} min)`);

          // Créer un enregistrement DEBOUNCE_BLOCKED informatif
          const debounceRecord = await this.prisma.attendance.create({
            data: {
              tenantId,
              employeeId: createAttendanceDto.employeeId,
              siteId: createAttendanceDto.siteId || null,
              deviceId: createAttendanceDto.deviceId || null,
              timestamp: punchTimestamp,
              type: createAttendanceDto.type,
              method: createAttendanceDto.method,
              hasAnomaly: true,
              anomalyType: 'DEBOUNCE_BLOCKED',
              anomalyNote: `Badge ignoré (anti-rebond manuel): ${diffMinutes.toFixed(1)} min depuis le dernier pointage (seuil: ${DEBOUNCE_MINUTES} min)`,
              rawData: {
                source: 'DEBOUNCE_LOG_MANUAL',
                blockedReason: 'DEBOUNCE',
                previousPunchId: lastPunch.id,
                threshold: DEBOUNCE_MINUTES,
                actualDiff: diffMinutes,
              },
            },
            include: {
              employee: {
                select: { id: true, matricule: true, firstName: true, lastName: true, photo: true },
              },
              site: true,
              device: true,
            },
          });

          console.log(`📋 [DEBOUNCE-MANUAL] Enregistrement informatif créé: ${debounceRecord.id}`);

          // Retourner le record avec un flag indiquant que c'est un debounce
          return {
            ...debounceRecord,
            _debounced: true,
            _debounceInfo: {
              reason: 'DEBOUNCE',
              message: `Pointage enregistré comme informatif: trop proche du précédent (${diffMinutes.toFixed(1)} min < ${DEBOUNCE_MINUTES} min)`,
              previousPunchId: lastPunch.id,
              previousPunchTime: lastPunch.timestamp,
              configuredTolerance: DEBOUNCE_MINUTES,
            },
          };
        }
      }
      // ═══════════════════════════════════════════════════════════════════════════════

      // Détecter les anomalies
      const anomaly = await this.detectAnomalies(
        tenantId,
        createAttendanceDto.employeeId,
        new Date(createAttendanceDto.timestamp),
        createAttendanceDto.type,
      );

      // Log informatif pour double badgeage rapide (pas une anomalie bloquante)
      if ((anomaly as any).isInformativeDoublePunch) {
        console.log(`ℹ️ [INFORMATIF] ${(anomaly as any).informativeNote} - Employé: ${createAttendanceDto.employeeId}`);
      }

      // Calculer les métriques
      const metrics = await this.calculateMetrics(
        tenantId,
        createAttendanceDto.employeeId,
        new Date(createAttendanceDto.timestamp),
        createAttendanceDto.type,
      );

      const attendance = await this.prisma.attendance.create({
        data: {
          ...createAttendanceDto,
          tenantId,
          timestamp: new Date(createAttendanceDto.timestamp),
          hasAnomaly: anomaly.hasAnomaly,
          anomalyType: anomaly.type,
          anomalyNote: anomaly.note,
          hoursWorked: metrics.hoursWorked ? new Decimal(metrics.hoursWorked) : null,
          lateMinutes: metrics.lateMinutes,
          earlyLeaveMinutes: metrics.earlyLeaveMinutes,
          overtimeMinutes: metrics.overtimeMinutes,
        },
        include: {
          employee: {
            select: {
              id: true,
              matricule: true,
              firstName: true,
              lastName: true,
              photo: true,
              userId: true,
              department: {
                select: {
                  id: true,
                  managerId: true,
                },
              },
              site: {
                select: {
                  id: true,
                  siteManagers: {
                    select: {
                      managerId: true,
                    },
                  },
                },
              },
            },
          },
          site: true,
          device: true,
        },
      });

      // Notifier les managers si anomalie détectée
      if (anomaly.hasAnomaly) {
        await this.notifyManagersOfAnomaly(tenantId, attendance);
      }

      // Création automatique d'Overtime en temps réel (Modèle hybride - Niveau 1)
      if (createAttendanceDto.type === AttendanceType.OUT && metrics.overtimeMinutes && metrics.overtimeMinutes > 0) {
        await this.createAutoOvertime(tenantId, attendance, metrics.overtimeMinutes);
      }

      // Création automatique de Jour Supplémentaire si weekend/jour férié (Modèle hybride - Niveau 1)
      if (createAttendanceDto.type === AttendanceType.OUT && metrics.hoursWorked && metrics.hoursWorked > 0) {
        await this.createAutoSupplementaryDay(tenantId, attendance, metrics.hoursWorked);
      }

      // ═══════════════════════════════════════════════════════════════════════════════
      // FIX 14/01/2026: TOUJOURS nettoyer MISSING_OUT quand un OUT arrive
      // (ne plus dépendre de hoursWorked qui peut être undefined)
      // ═══════════════════════════════════════════════════════════════════════════════
      if (createAttendanceDto.type === AttendanceType.OUT) {
        const timestamp = new Date(createAttendanceDto.timestamp);
        const startOfDay = new Date(timestamp);
        startOfDay.setHours(0, 0, 0, 0);

        // Chercher directement le dernier IN avec MISSING_OUT pour cet employé aujourd'hui
        const inWithMissingOut = await this.prisma.attendance.findFirst({
          where: {
            tenantId,
            employeeId: createAttendanceDto.employeeId,
            type: AttendanceType.IN,
            timestamp: { gte: startOfDay, lt: timestamp },
            hasAnomaly: true,
            anomalyType: 'MISSING_OUT',
          },
          orderBy: { timestamp: 'desc' },
        });

        if (inWithMissingOut) {
          await this.prisma.attendance.update({
            where: { id: inWithMissingOut.id },
            data: {
              hasAnomaly: false,
              anomalyType: null,
              anomalyNote: null,
            },
          });
          console.log(`✅ [Create] Anomalie MISSING_OUT effacée sur IN ${inWithMissingOut.id}`);
        }
      }

      return attendance;
    } catch (error) {
      // Mettre à jour le log en échec si erreur
      if (attemptId) {
        try {
          await this.prisma.attendanceAttempt.update({
            where: { id: attemptId },
            data: {
              status: 'FAILED',
              errorCode: error.code || 'UNKNOWN_ERROR',
              errorMessage: error.message || 'Unknown error occurred',
            },
          });
        } catch (updateError) {
          console.error('Erreur lors de la mise à jour du log:', updateError);
        }
      }
      throw error;
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════════════
   * ═══════════════════════════════════════════════════════════════════════════════
   * DETERMINE PUNCH TYPE - Algorithme intelligent de détection IN/OUT
   * ═══════════════════════════════════════════════════════════════════════════════
   *
   * Algorithme professionnel avec 3 niveaux de priorité:
   * 1. ALTERNATION (HIGH confidence): Basé sur le dernier pointage valide
   * 2. SHIFT_BASED (MEDIUM confidence): Basé sur le shift de l'employé
   * 3. TIME_BASED (LOW confidence): Fallback basé sur l'heure du jour
   *
   * Gère tous les scénarios:
   * - Shifts normaux et de nuit
   * - Sessions ouvertes de la veille
   * - Re-syncs et doublons
   * - Employés sans shift assigné
   */
  /**
   * @deprecated DEPUIS 19/01/2026 - Utiliser processTerminalPunch() à la place
   *
   * Cette méthode DÉDUIT le type IN/OUT via des heuristiques complexes.
   * Elle est conservée pour la rétrocompatibilité avec les anciens endpoints.
   *
   * NOUVELLE APPROCHE (RECOMMANDÉE):
   * - Utiliser l'endpoint /webhook/state avec processTerminalPunch()
   * - Le type IN/OUT vient directement du terminal via le champ state
   * - Aucune déduction nécessaire, fiabilité 100%
   *
   * Cette méthode sera supprimée dans une version future.
   */
  async determinePunchType(
    tenantId: string,
    employeeId: string,
    punchTimeStr: string,
    deviceId?: string,
    apiKey?: string,
  ): Promise<{
    type: 'IN' | 'OUT';
    method: 'ALTERNATION' | 'SHIFT_BASED' | 'TIME_BASED';
    confidence: 'HIGH' | 'MEDIUM' | 'LOW';
    reason: string;
    debug?: any;
    isAmbiguous?: boolean;
    validationStatus?: 'NONE' | 'PENDING_VALIDATION';
    ambiguityReason?: string;
  }> {
    const punchTime = new Date(punchTimeStr);
    const punchHour = punchTime.getHours();
    const punchDate = punchTime.toISOString().split('T')[0];

    // Validation du device si fourni
    if (deviceId) {
      const device = await this.prisma.attendanceDevice.findFirst({
        where: { deviceId, tenantId },
        select: { id: true, apiKey: true },
      });

      if (device && apiKey && device.apiKey && device.apiKey !== apiKey) {
        throw new Error('Invalid API key');
      }
    }

    // Trouver l'employé
    const employee = await findEmployeeByMatriculeFlexible(
      this.prisma,
      tenantId,
      employeeId,
    );

    if (!employee) {
      // Employé inconnu → premier pointage = IN
      return {
        type: 'IN',
        method: 'TIME_BASED',
        confidence: 'LOW',
        reason: 'Employé non trouvé, défaut à IN',
      };
    }

    // FIX 17/01/2026: Utiliser getScheduleWithFallback pour récupérer le planning personnalisé
    // au lieu de currentShift (shift par défaut) - CRITIQUE pour la détection IN/OUT correcte
    const schedule = await this.getScheduleWithFallback(tenantId, employee.id, punchTime);
    const shift = schedule?.shift as {
      id: string;
      name: string;
      startTime: string;
      endTime: string;
      isNightShift?: boolean;
      breakStartTime?: string | null;
    } | null;

    // Récupérer les paramètres tenant pour les seuils
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
      select: {
        nightShiftEnd: true,
        nightShiftStart: true,
        enableAmbiguousPunchDetection: true,
        ambiguousPunchWindowHours: true,
      },
    });

    const nightShiftEndHour = parseInt((settings?.nightShiftEnd || '06:00').split(':')[0]);
    const nightShiftStartHour = parseInt((settings?.nightShiftStart || '21:00').split(':')[0]);
    const ambiguousWindowHours = settings?.ambiguousPunchWindowHours ?? 3;
    const enableAmbiguousDetection = settings?.enableAmbiguousPunchDetection !== false;

    // Récupérer la marge pour la détection SHIFT_BASED (en minutes)
    const shiftMarginSettings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
      select: { wrongTypeShiftMarginMinutes: true },
    });
    const SHIFT_MARGIN_MINUTES = shiftMarginSettings?.wrongTypeShiftMarginMinutes ?? 600; // 10h par défaut

    // Définir la fenêtre de recherche (48h pour couvrir tous les cas de shifts de nuit)
    const searchWindowStart = new Date(punchTime);
    searchWindowStart.setUTCHours(searchWindowStart.getUTCHours() - 48);
    const searchWindowEnd = punchTime;

    // DEBUG: Log la recherche
    console.log(`🔍 [determinePunchType] Analyse pour ${employee.matricule}:`);
    console.log(`   - punchTime: ${punchTime.toISOString()} (${punchHour}h${punchTime.getMinutes().toString().padStart(2, '0')})`);
    console.log(`   - shift: ${shift ? `${shift.name} (${shift.startTime}-${shift.endTime})` : 'AUCUN'}`);

    // ═══════════════════════════════════════════════════════════════════════════════
    // PRIORITÉ 1: SHIFT_BASED - Basé sur l'horaire du shift (NOUVEAU - 03/02/2026)
    // Plus fiable car indépendant des erreurs passées
    // ═══════════════════════════════════════════════════════════════════════════════

    if (shift) {
      const shiftStartHour = parseInt(shift.startTime.split(':')[0]);
      const shiftStartMin = parseInt(shift.startTime.split(':')[1] || '0');
      const shiftEndHour = parseInt(shift.endTime.split(':')[0]);
      const shiftEndMin = parseInt(shift.endTime.split(':')[1] || '0');
      const punchMinutes = punchHour * 60 + punchTime.getMinutes();
      const shiftStartMinutes = shiftStartHour * 60 + shiftStartMin;
      const shiftEndMinutes = shiftEndHour * 60 + shiftEndMin;

      // Calculer les distances avec gestion du passage à minuit
      let distanceToStart = Math.abs(punchMinutes - shiftStartMinutes);
      let distanceToEnd = Math.abs(punchMinutes - shiftEndMinutes);

      // Gérer le wrap-around minuit
      if (distanceToStart > 720) distanceToStart = 1440 - distanceToStart;
      if (distanceToEnd > 720) distanceToEnd = 1440 - distanceToEnd;

      // Pour les shifts de nuit, ajuster les calculs
      if (shift.isNightShift) {
        // Shift de nuit ex: 17:00-02:00
        // Normaliser le punch et la fin pour comparaison
        const normalizedPunch = punchMinutes < shiftStartMinutes ? punchMinutes + 1440 : punchMinutes;
        const normalizedEnd = shiftEndMinutes < shiftStartMinutes ? shiftEndMinutes + 1440 : shiftEndMinutes;
        distanceToStart = Math.abs(normalizedPunch - shiftStartMinutes);
        if (distanceToStart > 720) distanceToStart = 1440 - distanceToStart;
        distanceToEnd = Math.abs(normalizedPunch - normalizedEnd);
        if (distanceToEnd > 720) distanceToEnd = 1440 - distanceToEnd;
      }

      console.log(`   📊 [SHIFT_BASED] distanceToStart: ${distanceToStart}min, distanceToEnd: ${distanceToEnd}min, margin: ${SHIFT_MARGIN_MINUTES}min`);

      // Déterminer le type attendu basé sur la proximité
      const isNearStart = distanceToStart <= SHIFT_MARGIN_MINUTES;
      const isNearEnd = distanceToEnd <= SHIFT_MARGIN_MINUTES;

      // CAS 1: Clairement proche du DÉBUT → IN
      if (isNearStart && (!isNearEnd || distanceToStart < distanceToEnd)) {
        // Calculer la confiance (plus proche = plus confiant)
        const confidence = distanceToStart <= 120 ? 'HIGH' : (distanceToStart <= 300 ? 'MEDIUM' : 'LOW');
        console.log(`   ✅ [SHIFT_BASED] Proche début shift → IN (confiance: ${confidence})`);
        return {
          type: 'IN',
          method: 'SHIFT_BASED',
          confidence,
          reason: `Proche début shift ${shift.startTime} (distance: ${distanceToStart}min) → IN`,
          debug: { shift, punchMinutes, shiftStartMinutes, distanceToStart, distanceToEnd },
        };
      }

      // CAS 2: Clairement proche de la FIN → OUT
      if (isNearEnd && (!isNearStart || distanceToEnd < distanceToStart)) {
        const confidence = distanceToEnd <= 120 ? 'HIGH' : (distanceToEnd <= 300 ? 'MEDIUM' : 'LOW');
        console.log(`   ✅ [SHIFT_BASED] Proche fin shift → OUT (confiance: ${confidence})`);
        return {
          type: 'OUT',
          method: 'SHIFT_BASED',
          confidence,
          reason: `Proche fin shift ${shift.endTime} (distance: ${distanceToEnd}min) → OUT`,
          debug: { shift, punchMinutes, shiftEndMinutes, distanceToStart, distanceToEnd },
        };
      }

      // CAS 3: Ni proche du début ni de la fin → utiliser ALTERNATION comme fallback
      console.log(`   ⚠️ [SHIFT_BASED] Hors marges, fallback vers ALTERNATION`);
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // PRIORITÉ 2: ALTERNATION - Basé sur le dernier pointage valide (FALLBACK)
    // Utilisé quand pas de shift ou pointage hors marges du shift
    // ═══════════════════════════════════════════════════════════════════════════════

    // Chercher le dernier pointage valide (exclure DEBOUNCE_BLOCKED)
    const lastPunch = await this.prisma.attendance.findFirst({
      where: {
        tenantId,
        employeeId: employee.id,
        timestamp: {
          gte: searchWindowStart,
          lt: searchWindowEnd,
        },
        OR: [
          { anomalyType: null },
          { anomalyType: { not: 'DEBOUNCE_BLOCKED' } },
        ],
      },
      orderBy: { timestamp: 'desc' },
      select: {
        id: true,
        type: true,
        timestamp: true,
      },
    });

    console.log(`   🔄 [ALTERNATION] lastPunch: ${lastPunch ? `${lastPunch.type} à ${lastPunch.timestamp}` : 'AUCUN'}`);

    if (lastPunch) {
      const hoursSinceLastPunch = (punchTime.getTime() - lastPunch.timestamp.getTime()) / (1000 * 60 * 60);

      // Si le dernier était IN → celui-ci est OUT
      if (lastPunch.type === 'IN') {
        // Si session très longue (>16h), marquer potentiellement ambigu
        if (hoursSinceLastPunch > 16) {
          const isLikelyNightShift = punchHour < 10 || (shift?.isNightShift === true);
          return {
            type: 'OUT',
            method: 'ALTERNATION',
            confidence: isLikelyNightShift ? 'HIGH' : 'MEDIUM',
            reason: `Session IN ouverte depuis ${hoursSinceLastPunch.toFixed(1)}h → OUT (fallback ALTERNATION)`,
            debug: { lastPunch, hoursSinceLastPunch, isLikelyNightShift },
            isAmbiguous: !isLikelyNightShift && hoursSinceLastPunch > 24,
            validationStatus: (!isLikelyNightShift && hoursSinceLastPunch > 24) ? 'PENDING_VALIDATION' : 'NONE',
            ambiguityReason: (!isLikelyNightShift && hoursSinceLastPunch > 24)
              ? `Session ouverte depuis ${hoursSinceLastPunch.toFixed(1)}h - Vérification recommandée`
              : undefined,
          };
        }
        return {
          type: 'OUT',
          method: 'ALTERNATION',
          confidence: 'HIGH',
          reason: `Dernier pointage: IN (${hoursSinceLastPunch.toFixed(1)}h) → OUT`,
          debug: { lastPunch, hoursSinceLastPunch },
        };
      }

      // Si le dernier était OUT → celui-ci est IN
      if (lastPunch.type === 'OUT') {
        return {
          type: 'IN',
          method: 'ALTERNATION',
          confidence: 'HIGH',
          reason: `Dernier pointage: OUT → IN`,
          debug: { lastPunch, hoursSinceLastPunch },
        };
      }
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // PRIORITÉ 3: SHIFT_BASED FALLBACK - Si pas de lastPunch mais shift existe
    // ═══════════════════════════════════════════════════════════════════════════════

    if (shift) {
      const shiftStartHour = parseInt(shift.startTime.split(':')[0]);
      const shiftEndHour = parseInt(shift.endTime.split(':')[0]);

      if (shift.isNightShift) {
        // ═══════════════════════════════════════════════════════════════════════════════
        // SHIFT DE NUIT - ALGORITHME FENÊTRE DYNAMIQUE (configurable)
        // ═══════════════════════════════════════════════════════════════════════════════
        // Règle métier : Un pointage est IN seulement s'il est dans une fenêtre
        // autour de l'heure de début du shift. En dehors, c'est un OUT ou AMBIGU.
        // ═══════════════════════════════════════════════════════════════════════════════

        const WINDOW_HOURS = ambiguousWindowHours; // Fenêtre configurable (défaut: ±3h)

        // Calculer la fenêtre IN [shiftStart - Xh, shiftStart + Xh]
        let windowStart = shiftStartHour - WINDOW_HOURS;
        let windowEnd = shiftStartHour + WINDOW_HOURS;

        // Normaliser pour gérer le passage de minuit
        // Ex: shift 23:00 → fenêtre [20, 26] où 26 = 2h du matin
        if (windowStart < 0) windowStart += 24;
        if (windowEnd >= 24) windowEnd -= 24;

        // Vérifier si le punch est dans la fenêtre IN
        // Cas complexe car la fenêtre peut traverser minuit
        let isInWindow = false;
        if (windowStart < windowEnd) {
          // Fenêtre ne traverse pas minuit (ex: 14:00-20:00)
          isInWindow = punchHour >= windowStart && punchHour <= windowEnd;
        } else {
          // Fenêtre traverse minuit (ex: 20:00-02:00)
          isInWindow = punchHour >= windowStart || punchHour <= windowEnd;
        }

        // CAS 1: Punch dans la fenêtre IN → Entrée normale
        if (isInWindow) {
          return {
            type: 'IN',
            method: 'SHIFT_BASED',
            confidence: 'HIGH',
            reason: `Shift nuit ${shift.name}: punch ${punchHour}h dans fenêtre IN [${windowStart}h-${windowEnd}h] → IN`,
            debug: { shift, punchHour, windowStart, windowEnd },
          };
        }

        // CAS 2: Punch hors fenêtre IN → Vérifier s'il y a une session ouverte
        // Chercher le dernier IN non fermé (48h en arrière)
        const lastOpenIn = await this.prisma.attendance.findFirst({
          where: {
            tenantId,
            employeeId: employee.id,
            type: 'IN',
            timestamp: {
              gte: searchWindowStart,
              lt: punchTime,
            },
            OR: [
              { anomalyType: null },
              { anomalyType: { not: 'DEBOUNCE_BLOCKED' } },
            ],
          },
          orderBy: { timestamp: 'desc' },
        });

        if (lastOpenIn) {
          // Vérifier s'il y a déjà un OUT après ce IN
          const hasOutAfterIn = await this.prisma.attendance.findFirst({
            where: {
              tenantId,
              employeeId: employee.id,
              type: 'OUT',
              timestamp: {
                gt: lastOpenIn.timestamp,
                lt: punchTime,
              },
              OR: [
                { anomalyType: null },
                { anomalyType: { not: 'DEBOUNCE_BLOCKED' } },
              ],
            },
          });

          if (!hasOutAfterIn) {
            // Session ouverte trouvée → c'est un OUT
            return {
              type: 'OUT',
              method: 'SHIFT_BASED',
              confidence: 'HIGH',
              reason: `Shift nuit: Session ouverte depuis ${lastOpenIn.timestamp.toISOString()} → OUT`,
              debug: { shift, lastOpenIn, punchHour, windowStart, windowEnd },
            };
          }
        }

        // CAS 3: Hors fenêtre IN ET pas de session ouverte → PENDING_VALIDATION (si activé)
        // C'est un cas ambigu qui nécessite validation humaine
        if (enableAmbiguousDetection) {
          return {
            type: 'IN',
            method: 'SHIFT_BASED',
            confidence: 'LOW',
            reason: `Shift nuit: punch ${punchHour}h hors fenêtre IN [${windowStart}h-${windowEnd}h], aucune session ouverte → PENDING_VALIDATION`,
            debug: { shift, punchHour, windowStart, windowEnd },
            isAmbiguous: true,
            validationStatus: 'PENDING_VALIDATION',
            ambiguityReason: `Pointage à ${punchHour}h hors fenêtre d'entrée normale [${windowStart}h-${windowEnd}h] pour shift ${shift.name}`,
          };
        } else {
          // Détection ambiguë désactivée: retourner IN simple
          return {
            type: 'IN',
            method: 'SHIFT_BASED',
            confidence: 'LOW',
            reason: `Shift nuit: punch ${punchHour}h hors fenêtre IN [${windowStart}h-${windowEnd}h], détection ambiguë désactivée → IN par défaut`,
            debug: { shift, punchHour, windowStart, windowEnd },
          };
        }
      } else {
        // SHIFT NORMAL (JOUR)
        // Calculer le point médian du shift
        const shiftMidpoint = shiftStartHour + (shiftEndHour - shiftStartHour) / 2;

        if (punchHour < shiftMidpoint) {
          return {
            type: 'IN',
            method: 'SHIFT_BASED',
            confidence: 'MEDIUM',
            reason: `Shift ${shift.name} (${shift.startTime}-${shift.endTime}): punch ${punchHour}h < midpoint ${shiftMidpoint}h → IN`,
            debug: { shift, punchHour, shiftMidpoint },
          };
        } else {
          return {
            type: 'OUT',
            method: 'SHIFT_BASED',
            confidence: 'MEDIUM',
            reason: `Shift ${shift.name} (${shift.startTime}-${shift.endTime}): punch ${punchHour}h ≥ midpoint ${shiftMidpoint}h → OUT`,
            debug: { shift, punchHour, shiftMidpoint },
          };
        }
      }
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // PRIORITÉ 3: TIME_BASED - Fallback basé sur l'heure du jour
    // ═══════════════════════════════════════════════════════════════════════════════

    // Vérifier s'il y a une session ouverte aujourd'hui (IN sans OUT correspondant)
    const startOfToday = new Date(punchDate + 'T00:00:00.000Z');
    const todayPunches = await this.prisma.attendance.findMany({
      where: {
        tenantId,
        employeeId: employee.id,
        timestamp: {
          gte: startOfToday,
          lt: punchTime,
        },
        OR: [
          { anomalyType: null },
          { anomalyType: { not: 'DEBOUNCE_BLOCKED' } },
        ],
      },
      orderBy: { timestamp: 'asc' },
      select: { type: true, timestamp: true },
    });

    const inCount = todayPunches.filter(p => p.type === 'IN').length;
    const outCount = todayPunches.filter(p => p.type === 'OUT').length;
    const hasOpenSession = inCount > outCount;

    if (hasOpenSession) {
      return {
        type: 'OUT',
        method: 'TIME_BASED',
        confidence: 'LOW',
        reason: `Session ouverte aujourd'hui (${inCount} IN, ${outCount} OUT) → OUT`,
        debug: { inCount, outCount, todayPunches },
      };
    }

    // Pas de session ouverte - utiliser l'heure du jour
    // Seuil par défaut: 12h00
    const DEFAULT_MIDDAY = 12;

    if (punchHour < DEFAULT_MIDDAY) {
      return {
        type: 'IN',
        method: 'TIME_BASED',
        confidence: 'LOW',
        reason: `Pas de session ouverte, punch ${punchHour}h < ${DEFAULT_MIDDAY}h → IN (premier pointage de la journée)`,
        debug: { punchHour, inCount, outCount },
      };
    } else {
      // Après midi sans session ouverte - vérifier hier
      const startOfYesterday = new Date(startOfToday);
      startOfYesterday.setUTCDate(startOfYesterday.getUTCDate() - 1);

      const lastInYesterday = await this.prisma.attendance.findFirst({
        where: {
          tenantId,
          employeeId: employee.id,
          type: 'IN',
          timestamp: {
            gte: startOfYesterday,
            lt: startOfToday,
          },
          OR: [
            { anomalyType: null },
            { anomalyType: { not: 'DEBOUNCE_BLOCKED' } },
          ],
        },
        orderBy: { timestamp: 'desc' },
      });

      // Vérifier s'il y a un OUT après ce IN
      if (lastInYesterday) {
        const matchingOut = await this.prisma.attendance.findFirst({
          where: {
            tenantId,
            employeeId: employee.id,
            type: 'OUT',
            timestamp: { gt: lastInYesterday.timestamp },
            OR: [
              { anomalyType: null },
              { anomalyType: { not: 'DEBOUNCE_BLOCKED' } },
            ],
          },
        });

        if (!matchingOut) {
          return {
            type: 'OUT',
            method: 'TIME_BASED',
            confidence: 'LOW',
            reason: `Session ouverte depuis hier ${lastInYesterday.timestamp.toISOString()} → OUT`,
            debug: { lastInYesterday },
          };
        }
      }

      // Par défaut après midi = IN (l'employé a probablement oublié de pointer le matin)
      return {
        type: 'IN',
        method: 'TIME_BASED',
        confidence: 'LOW',
        reason: `Pas de session ouverte, punch ${punchHour}h ≥ ${DEFAULT_MIDDAY}h mais pas de IN précédent → IN (oubli probable du matin)`,
        debug: { punchHour, inCount, outCount },
      };
    }
  }

  /**
   * GET PUNCH COUNT FOR DAY - Utilisé par le script de sync pour déterminer IN/OUT
   * ═══════════════════════════════════════════════════════════════════════════════
   *
   * @deprecated Utiliser determinePunchType() pour une détection plus fiable
   * Retourne le nombre de pointages pour un employé sur une date donnée.
   * Utilisé par le script de synchronisation ZKTeco pour déterminer automatiquement
   * si le prochain pointage doit être IN ou OUT (alternance).
   */
  async getPunchCountForDay(
    tenantId: string,
    employeeId: string,
    date: string,
    deviceId?: string,
    apiKey?: string,
    punchTime?: string, // Heure du pointage pour détection shift de nuit
  ) {
    // Validation du device si fourni
    if (deviceId) {
      const device = await this.prisma.attendanceDevice.findFirst({
        where: { deviceId, tenantId },
        select: { id: true, apiKey: true },
      });

      if (!device) {
        throw new Error(`Device ${deviceId} not found for tenant ${tenantId}`);
      }

      // Validation API Key si fournie
      if (apiKey && device.apiKey && device.apiKey !== apiKey) {
        throw new Error('Invalid API key');
      }
    }

    // Trouver l'employé par matricule
    const employee = await findEmployeeByMatriculeFlexible(
      this.prisma,
      tenantId,
      employeeId,
    );

    if (!employee) {
      // Si l'employé n'existe pas, retourner 0 (premier pointage = IN)
      return { count: 0, forceType: null };
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // DÉTECTION SHIFT DE NUIT (Configurable via TenantSettings)
    // ═══════════════════════════════════════════════════════════════════════════════
    // Si le pointage est tôt le matin (avant nightShiftEnd + marge) et qu'il y a
    // une session ouverte de la veille, c'est probablement le OUT d'un shift de nuit.
    // ═══════════════════════════════════════════════════════════════════════════════

    // Récupérer les paramètres de shift de nuit depuis TenantSettings
    const nightShiftSettings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
      select: {
        nightShiftEnd: true,    // Défaut: "06:00"
        nightShiftStart: true,  // Défaut: "21:00"
      },
    });

    // Parser nightShiftEnd pour obtenir l'heure de fin du shift de nuit
    const nightShiftEndStr = nightShiftSettings?.nightShiftEnd || '06:00';
    const [nightEndHour] = nightShiftEndStr.split(':').map(Number);
    // Ajouter une marge de 4h après la fin du shift de nuit pour la détection
    const NIGHT_SHIFT_MORNING_THRESHOLD = nightEndHour + 4;

    const punchDateTime = punchTime ? new Date(punchTime) : null;
    const punchHour = punchDateTime ? punchDateTime.getUTCHours() : null;

    if (punchHour !== null && punchHour < NIGHT_SHIFT_MORNING_THRESHOLD) {
      // Calculer la veille
      const yesterday = new Date(date);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      const startOfYesterday = new Date(`${yesterdayStr}T00:00:00.000Z`);
      const endOfYesterday = new Date(`${yesterdayStr}T23:59:59.999Z`);

      // Chercher le dernier IN de la veille sans OUT correspondant
      // Inclure le shift de l'employé pour vérifier isNightShift
      const lastInYesterday = await this.prisma.attendance.findFirst({
        where: {
          tenantId,
          employeeId: employee.id,
          type: 'IN',
          timestamp: {
            gte: startOfYesterday,
            lte: endOfYesterday,
          },
        },
        orderBy: { timestamp: 'desc' },
        include: {
          employee: {
            select: {
              currentShift: {
                select: { isNightShift: true, endTime: true },
              },
            },
          },
        },
      });

      if (lastInYesterday) {
        // Vérifier s'il y a un OUT après ce IN (hier ou aujourd'hui)
        const matchingOut = await this.prisma.attendance.findFirst({
          where: {
            tenantId,
            employeeId: employee.id,
            type: 'OUT',
            timestamp: {
              gt: lastInYesterday.timestamp,
            },
          },
        });

        if (!matchingOut) {
          // Vérifier si c'est vraiment un shift de nuit (flag ou heure)
          const isNightShiftEmployee = lastInYesterday.employee?.currentShift?.isNightShift === true;
          const inHour = lastInYesterday.timestamp.getUTCHours();
          const nightStartHour = parseInt((nightShiftSettings?.nightShiftStart || '21:00').split(':')[0]);
          const isLateInTime = inHour >= nightStartHour || inHour < nightEndHour;

          // Session ouverte de la veille + (shift de nuit OU entrée tardive) = C'est un OUT de nuit
          if (isNightShiftEmployee || isLateInTime) {
            console.log(`🌙 [NIGHT SHIFT] Session ouverte depuis ${lastInYesterday.timestamp.toISOString()} - Forçage OUT pour ${employee.matricule} [isNightShift: ${isNightShiftEmployee}, inHour: ${inHour}, nightEnd: ${nightShiftEndStr}]`);
            return {
              count: 1, // Impair = OUT
              forceType: 'OUT',
              reason: 'NIGHT_SHIFT_DETECTION',
              openSessionFrom: lastInYesterday.timestamp,
              nightShiftConfig: {
                nightShiftEnd: nightShiftEndStr,
                isNightShiftEmployee,
                inHour,
              },
            };
          }
        }
      }
    }

    // Calculer les bornes de la journée
    const startOfDay = new Date(`${date}T00:00:00.000Z`);
    const endOfDay = new Date(`${date}T23:59:59.999Z`);

    // Compter les pointages pour cette journée
    const count = await this.prisma.attendance.count({
      where: {
        tenantId,
        employeeId: employee.id,
        timestamp: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    return { count, forceType: null };
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════════════
   * POINTAGE TERMINAL - WEBHOOK RAPIDE (via ZKTeco ou autre terminal biométrique)
   * ═══════════════════════════════════════════════════════════════════════════════
   *
   * PHILOSOPHIE : Toujours accepter, toujours tracer
   *
   * Les pointages provenant des terminaux biométriques ne sont JAMAIS bloqués.
   * Raisons :
   * 1. AUCUNE PERTE DE DONNÉES - Un employé qui pointe ne doit jamais être "perdu"
   * 2. RÉALITÉ TERRAIN - Le terminal ne peut pas afficher d'erreurs complexes
   * 3. TRAÇABILITÉ - Les anomalies (UNPLANNED_PUNCH, etc.) permettent au RH de corriger
   * 4. FLEXIBILITÉ - Gère les cas exceptionnels (oubli d'assigner un shift, urgence)
   *
   * Contrairement à create() (pointage manuel), cette méthode n'appelle PAS
   * validateScheduleOrShift() et ne bloque jamais le pointage.
   *
   * Les anomalies sont détectées et enregistrées pour traitement ultérieur par le RH.
   *
   * @see create() pour la philosophie différente des pointages manuels
   * ═══════════════════════════════════════════════════════════════════════════════
   */
  async handleWebhookFast(
    tenantId: string,
    deviceId: string,
    webhookData: WebhookAttendanceDto,
    apiKey?: string,
  ) {
    // 1. Validation rapide du device
    const device = await this.prisma.attendanceDevice.findFirst({
      where: { deviceId, tenantId },
      select: { id: true, apiKey: true, siteId: true },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    if (device.apiKey && device.apiKey !== apiKey) {
      throw new ForbiddenException('Invalid API Key');
    }

    // 2. Trouver l'employé rapidement
    let employee = await findEmployeeByMatriculeFlexible(
      this.prisma,
      tenantId,
      webhookData.employeeId,
    );

    if (!employee) {
      throw new NotFoundException(`Employee ${webhookData.employeeId} not found`);
    }

    const punchTime = new Date(webhookData.timestamp);

    // FIX 18/01/2026: Auto-détection IN/OUT par ALTERNATION
    // Quand le terminal n'envoie pas de type fiable (state=0 pour tout), utiliser l'alternance
    // Cela garantit une séquence IN-OUT-IN-OUT correcte
    // IMPORTANT: Passer le matricule (webhookData.employeeId) et NON l'UUID (employee.id)
    const detectedType = await this.determinePunchType(
      tenantId,
      webhookData.employeeId, // matricule, pas UUID!
      webhookData.timestamp,
      deviceId,
      apiKey,
    );

    // Utiliser le type détecté au lieu du type reçu
    const effectiveType = detectedType.type as AttendanceType;
    console.log(`🔄 [Webhook] Type détecté: ${effectiveType} (méthode: ${detectedType.method}, reçu: ${webhookData.type})`);

    // 2.5a DÉDUPLICATION - Vérifier si un pointage identique existe déjà (y compris DEBOUNCE_BLOCKED)
    // Cela gère le cas où le terminal push ET le script sync envoient le même pointage
    const existingPunch = await this.prisma.attendance.findFirst({
      where: {
        tenantId,
        employeeId: employee.id,
        timestamp: punchTime,
      },
    });

    if (existingPunch) {
      return {
        status: 'duplicate',
        reason: 'EXACT_DUPLICATE',
        message: `Pointage ignoré: un pointage identique existe déjà à ${punchTime.toISOString()}`,
        existingAttendanceId: existingPunch.id,
      };
    }

    // 2.5b ANTI-REBOND (Debounce) INTELLIGENT - Éviter les doubles badges par erreur
    // FIX 17/01/2026: Debounce adaptatif selon le type de pointage
    // - MÊME TYPE (IN-IN ou OUT-OUT): Debounce strict (configurable, défaut 2 min)
    // - TYPES DIFFÉRENTS (IN-OUT ou OUT-IN): Debounce minimal (5 secondes)
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
      select: { doublePunchToleranceMinutes: true },
    });
    const DEBOUNCE_SAME_TYPE_MINUTES = settings?.doublePunchToleranceMinutes ?? 2;
    // FIX 18/01/2026: Utiliser le même paramètre pour les types différents (était hardcodé à 5 secondes)
    const DEBOUNCE_DIFFERENT_TYPE_MINUTES = settings?.doublePunchToleranceMinutes ?? 2;

    // Exclure les enregistrements DEBOUNCE_BLOCKED de la recherche du dernier pointage
    // pour éviter les doublons en cascade
    const lastPunch = await this.prisma.attendance.findFirst({
      where: {
        tenantId,
        employeeId: employee.id,
        OR: [
          { anomalyType: null },
          { anomalyType: { not: 'DEBOUNCE_BLOCKED' } },
        ],
      },
      orderBy: { timestamp: 'desc' },
      select: { timestamp: true, type: true },
    });

    if (lastPunch) {
      const diffMinutes = (punchTime.getTime() - lastPunch.timestamp.getTime()) / 60000;
      const diffSeconds = diffMinutes * 60;
      const isSameType = lastPunch.type === effectiveType;

      // Appliquer le debounce approprié selon le type
      // FIX 18/01/2026: Utiliser des minutes pour les deux cas (était en secondes pour types différents)
      const shouldBlock = isSameType
        ? (diffMinutes >= 0 && diffMinutes < DEBOUNCE_SAME_TYPE_MINUTES)
        : (diffMinutes >= 0 && diffMinutes < DEBOUNCE_DIFFERENT_TYPE_MINUTES);

      if (shouldBlock) {
        // FIX 18/01/2026: Affichage unifié en minutes
        const threshold = `${isSameType ? DEBOUNCE_SAME_TYPE_MINUTES : DEBOUNCE_DIFFERENT_TYPE_MINUTES} min`;
        const timeDisplay = `${diffMinutes.toFixed(1)} min`;
        console.log(`⚠️ [DEBOUNCE] Badge ignoré pour ${employee.matricule}: ${timeDisplay} depuis le dernier ${lastPunch.type} (seuil ${isSameType ? 'même type' : 'type différent'}: ${threshold})`);

        // Créer un enregistrement informatif (non-bloquant) pour traçabilité
        const debounceRecord = await this.prisma.attendance.create({
          data: {
            tenantId,
            employeeId: employee.id,
            deviceId: device.id,
            siteId: device.siteId,
            timestamp: punchTime,
            type: effectiveType,
            method: webhookData.method,
            hasAnomaly: true,
            anomalyType: 'DEBOUNCE_BLOCKED',
            anomalyNote: `Badge ignoré (anti-rebond ${isSameType ? 'même type' : 'type différent'}): ${timeDisplay} depuis le dernier pointage (seuil: ${threshold})`,
            needsApproval: false, // Informatif seulement, pas d'action requise
            rawData: {
              source: 'DEBOUNCE_LOG',
              blockedReason: 'DEBOUNCE',
              timeSinceLastPunch: diffMinutes,
              thresholdType: isSameType ? 'SAME_TYPE' : 'DIFFERENT_TYPE',
              threshold: isSameType ? DEBOUNCE_SAME_TYPE_MINUTES : DEBOUNCE_DIFFERENT_TYPE_MINUTES,
              lastPunchTime: lastPunch.timestamp,
              lastPunchType: lastPunch.type,
              newPunchType: effectiveType,
            },
          },
        });

        console.log(`📋 [DEBOUNCE] Enregistrement informatif créé: ${debounceRecord.id}`);

        return {
          status: 'logged_info',
          reason: 'DEBOUNCE',
          message: `Pointage enregistré comme informatif: trop proche du précédent (${timeDisplay} < ${threshold})`,
          attendanceId: debounceRecord.id,
          lastPunchTime: lastPunch.timestamp,
          lastPunchType: lastPunch.type,
          configuredTolerance: isSameType ? DEBOUNCE_SAME_TYPE_MINUTES : DEBOUNCE_DIFFERENT_TYPE_MINUTES,
        };
      }
    }

    // 3. Créer l'enregistrement avec rawData standardisé pour traçabilité
    // Format standardisé du rawData pour l'audit et la traçabilité
    // Mapper DeviceType vers la source pour traçabilité
    const getSourceFromMethod = (method: DeviceType): string => {
      switch (method) {
        case DeviceType.FINGERPRINT:
        case DeviceType.FACE_RECOGNITION:
        case DeviceType.RFID_BADGE:
          return 'TERMINAL_ZKTECO';
        case DeviceType.MOBILE_GPS:
          return 'MOBILE_APP';
        case DeviceType.MANUAL:
          return 'MANUAL';
        case DeviceType.QR_CODE:
        case DeviceType.PIN_CODE:
          return 'TERMINAL_OTHER';
        default:
          return 'UNKNOWN';
      }
    };

    const standardizedRawData = {
      // Source du pointage
      source: getSourceFromMethod(webhookData.method),

      // Données brutes originales du terminal/webhook
      originalData: webhookData.rawData || null,

      // Métadonnées de détection IN/OUT
      inOutDetection: {
        method: 'ALTERNATION', // Par défaut, alternation (le script sync détermine)
        receivedType: webhookData.type, // Type reçu du terminal/webhook
        processedAt: new Date().toISOString(),
      },

      // Informations de réception
      receivedAt: new Date().toISOString(),
      deviceId: device.id,
    };

    const attendance = await this.prisma.attendance.create({
      data: {
        tenantId,
        employeeId: employee.id,
        deviceId: device.id,
        siteId: device.siteId,
        timestamp: new Date(webhookData.timestamp),
        type: effectiveType,
        method: webhookData.method,
        rawData: standardizedRawData,
        // Champs de validation pour pointages ambigus (shifts de nuit)
        isAmbiguous: detectedType.isAmbiguous || false,
        validationStatus: detectedType.validationStatus === 'PENDING_VALIDATION' ? 'PENDING_VALIDATION' : 'NONE',
        ambiguityReason: detectedType.ambiguityReason || null,
        // Si ambigu, marquer aussi comme anomalie pour apparaître dans le dashboard
        hasAnomaly: detectedType.isAmbiguous || false,
        anomalyType: detectedType.isAmbiguous ? 'PENDING_VALIDATION' : null,
        anomalyNote: detectedType.isAmbiguous ? detectedType.ambiguityReason : null,
      },
    });

    // 4. Mettre à jour lastSync du terminal
    this.prisma.attendanceDevice.update({
      where: { id: device.id },
      data: { lastSync: new Date() },
    }).catch(() => {}); // Fire and forget

    // 5. Traiter les métriques et anomalies en arrière-plan (fire and forget)
    setImmediate(async () => {
      try {
        const metrics = await this.calculateMetrics(
          tenantId,
          employee.id,
          new Date(webhookData.timestamp),
          effectiveType,
        );

        const anomaly = await this.detectAnomalies(
          tenantId,
          employee.id,
          new Date(webhookData.timestamp),
          effectiveType,
        );

        // Mettre à jour l'attendance avec les métriques
        // FIX: Vérifier correctement anomaly.hasAnomaly au lieu de !!anomaly
        const hasAnomalyFlag = (anomaly as any)?.hasAnomaly === true;
        const anomalyTypeValue = hasAnomalyFlag ? (anomaly as any).type : null;

        await this.prisma.attendance.update({
          where: { id: attendance.id },
          data: {
            hoursWorked: metrics.hoursWorked,
            lateMinutes: metrics.lateMinutes,
            earlyLeaveMinutes: metrics.earlyLeaveMinutes,
            overtimeMinutes: metrics.overtimeMinutes,
            hasAnomaly: hasAnomalyFlag,
            anomalyType: anomalyTypeValue,
          },
        });

        // ═══════════════════════════════════════════════════════════════════════════════
        // FIX 14/01/2026: TOUJOURS nettoyer MISSING_OUT quand un OUT arrive
        // (ne plus dépendre de hoursWorked qui peut être undefined)
        // ═══════════════════════════════════════════════════════════════════════════════
        if (effectiveType === AttendanceType.OUT) {
          const timestamp = new Date(webhookData.timestamp);
          const startOfDay = new Date(timestamp);
          startOfDay.setHours(0, 0, 0, 0);

          // Chercher directement le dernier IN avec MISSING_OUT pour cet employé aujourd'hui
          const inWithMissingOut = await this.prisma.attendance.findFirst({
            where: {
              tenantId,
              employeeId: employee.id,
              type: AttendanceType.IN,
              timestamp: { gte: startOfDay, lt: timestamp },
              hasAnomaly: true,
              anomalyType: 'MISSING_OUT',
            },
            orderBy: { timestamp: 'desc' },
          });

          if (inWithMissingOut) {
            await this.prisma.attendance.update({
              where: { id: inWithMissingOut.id },
              data: {
                hasAnomaly: false,
                anomalyType: null,
                anomalyNote: null,
              },
            });
            console.log(`✅ [WebhookFast] Anomalie MISSING_OUT effacée sur IN ${inWithMissingOut.id} pour ${employee.matricule}`);
          }
        }

        console.log(`✅ [WebhookFast] Métriques calculées pour ${employee.matricule}`);
      } catch (error) {
        console.error(`❌ [WebhookFast] Erreur calcul métriques:`, error.message);
      }
    });

    // 6. Retourner immédiatement
    return {
      success: true,
      attendanceId: attendance.id,
      employee: {
        id: employee.id,
        matricule: employee.matricule,
        name: `${employee.firstName} ${employee.lastName}`,
      },
      timestamp: webhookData.timestamp,
      type: effectiveType,
      detectionMethod: detectedType.method,
    };
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════════════
   * POINTAGE TERMINAL - WEBHOOK STANDARD (via ZKTeco ou autre terminal biométrique)
   * ═══════════════════════════════════════════════════════════════════════════════
   *
   * PHILOSOPHIE : Toujours accepter, toujours tracer
   *
   * Même philosophie que handleWebhookFast() - les pointages terminal ne sont
   * JAMAIS bloqués. Cette version est synchrone (attend le traitement complet)
   * contrairement à handleWebhookFast() qui retourne immédiatement.
   *
   * @see handleWebhookFast() pour la version asynchrone (recommandée)
   * @see create() pour la philosophie différente des pointages manuels
   * ═══════════════════════════════════════════════════════════════════════════════
   */
  async handleWebhook(
    tenantId: string,
    deviceId: string,
    webhookData: WebhookAttendanceDto,
    apiKey?: string,
  ) {
    // Vérifier que le terminal existe
    const device = await this.prisma.attendanceDevice.findFirst({
      where: { deviceId, tenantId },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    // Validation de l'API Key si le device en a une configurée
    if (device.apiKey) {
      if (!apiKey) {
        throw new ForbiddenException('API Key required for this device');
      }
      if (device.apiKey !== apiKey) {
        throw new ForbiddenException('Invalid API Key');
      }
    }

    // Trouver l'employé par matricule ou ID
    // D'abord, essayer de trouver par ID (UUID)
    let employee = await this.prisma.employee.findFirst({
      where: {
        tenantId,
        id: webhookData.employeeId,
      },
    });

    // Si pas trouvé par ID, chercher dans le mapping terminal matricule
    if (!employee) {
      try {
        const mapping = await this.prisma.terminalMatriculeMapping.findFirst({
          where: {
            tenantId,
            terminalMatricule: webhookData.employeeId,
            isActive: true,
          },
          include: {
            employee: true,
          },
        });

        if (mapping) {
          employee = mapping.employee;
          console.log(
            `[AttendanceService] ✅ Employé trouvé via mapping terminal: ${mapping.terminalMatricule} → ${mapping.officialMatricule} (${employee.firstName} ${employee.lastName})`,
          );
        }
      } catch (error) {
        console.error(
          `[AttendanceService] Erreur lors de la recherche dans le mapping terminal:`,
          error,
        );
      }
    }

    // Si toujours pas trouvé, chercher par matricule avec gestion des zéros à gauche
    if (!employee) {
      try {
        employee = await findEmployeeByMatriculeFlexible(
          this.prisma,
          tenantId,
          webhookData.employeeId,
        );
      } catch (error) {
        // Log l'erreur pour le débogage mais continue
        console.error(
          `[AttendanceService] Erreur lors de la recherche flexible du matricule ${webhookData.employeeId}:`,
          error,
        );
      }
    }

    if (!employee) {
      throw new NotFoundException(`Employee ${webhookData.employeeId} not found`);
    }

    const punchTime = new Date(webhookData.timestamp);

    // FIX 18/01/2026: Auto-détection IN/OUT par ALTERNATION pour handleWebhook
    // IMPORTANT: Passer le matricule (webhookData.employeeId) et NON l'UUID (employee.id)
    // car determinePunchType utilise findEmployeeByMatriculeFlexible qui cherche par matricule
    const detectedType2 = await this.determinePunchType(
      tenantId,
      webhookData.employeeId, // matricule, pas UUID!
      webhookData.timestamp,
      deviceId,
      apiKey,
    );
    const effectiveType2 = detectedType2.type as AttendanceType;
    console.log(`🔄 [handleWebhook] Type détecté: ${effectiveType2} (méthode: ${detectedType2.method}, reçu: ${webhookData.type})`);

    // DÉDUPLICATION - Vérifier si un pointage identique existe déjà (y compris DEBOUNCE_BLOCKED)
    // Cela gère le cas où le terminal push ET le script sync envoient le même pointage
    const existingPunch = await this.prisma.attendance.findFirst({
      where: {
        tenantId,
        employeeId: employee.id,
        timestamp: punchTime,
      },
    });

    if (existingPunch) {
      return {
        status: 'duplicate',
        reason: 'EXACT_DUPLICATE',
        message: `Pointage ignoré: un pointage identique existe déjà à ${punchTime.toISOString()}`,
        existingAttendanceId: existingPunch.id,
      };
    }

    // ANTI-REBOND (Debounce) INTELLIGENT - Éviter les doubles badges par erreur
    // FIX 17/01/2026: Debounce adaptatif selon le type de pointage
    const debounceSettings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
      select: { doublePunchToleranceMinutes: true },
    });
    const DEBOUNCE_SAME_TYPE_MINUTES_2 = debounceSettings?.doublePunchToleranceMinutes ?? 2;
    // FIX 18/01/2026: Utiliser le même paramètre pour les types différents (était hardcodé à 5 secondes)
    const DEBOUNCE_DIFFERENT_TYPE_MINUTES_2 = debounceSettings?.doublePunchToleranceMinutes ?? 2;

    // Exclure les enregistrements DEBOUNCE_BLOCKED de la recherche du dernier pointage
    // pour éviter les doublons en cascade (un DEBOUNCE_BLOCKED ne doit pas bloquer le suivant)
    const lastPunch = await this.prisma.attendance.findFirst({
      where: {
        tenantId,
        employeeId: employee.id,
        OR: [
          { anomalyType: null },
          { anomalyType: { not: 'DEBOUNCE_BLOCKED' } },
        ],
      },
      orderBy: { timestamp: 'desc' },
      select: { timestamp: true, type: true },
    });

    if (lastPunch) {
      const diffMinutes = (punchTime.getTime() - lastPunch.timestamp.getTime()) / 60000;
      const diffSeconds = diffMinutes * 60;
      const isSameType = lastPunch.type === effectiveType2;

      // FIX 18/01/2026: Utiliser des minutes pour les deux cas
      const shouldBlock = isSameType
        ? (diffMinutes >= 0 && diffMinutes < DEBOUNCE_SAME_TYPE_MINUTES_2)
        : (diffMinutes >= 0 && diffMinutes < DEBOUNCE_DIFFERENT_TYPE_MINUTES_2);

      if (shouldBlock) {
        // FIX 18/01/2026: Affichage unifié en minutes
        const threshold = `${isSameType ? DEBOUNCE_SAME_TYPE_MINUTES_2 : DEBOUNCE_DIFFERENT_TYPE_MINUTES_2} min`;
        const timeDisplay = `${diffMinutes.toFixed(1)} min`;
        console.log(`⚠️ [DEBOUNCE] Badge ignoré pour ${employee.matricule}: ${timeDisplay} depuis le dernier ${lastPunch.type} (seuil: ${threshold})`);

        // Créer un enregistrement informatif (non-bloquant) pour traçabilité
        const debounceRecord = await this.prisma.attendance.create({
          data: {
            tenantId,
            employeeId: employee.id,
            deviceId: device.id,
            siteId: device.siteId,
            timestamp: punchTime,
            type: effectiveType2,
            method: webhookData.method,
            hasAnomaly: true,
            anomalyType: 'DEBOUNCE_BLOCKED',
            anomalyNote: `Badge ignoré (anti-rebond ${isSameType ? 'même type' : 'type différent'}): ${timeDisplay} depuis le dernier pointage (seuil: ${threshold})`,
            needsApproval: false, // Informatif seulement, pas d'action requise
            rawData: {
              source: 'DEBOUNCE_LOG',
              blockedReason: 'DEBOUNCE',
              timeSinceLastPunch: diffMinutes,
              thresholdType: isSameType ? 'SAME_TYPE' : 'DIFFERENT_TYPE',
              threshold: isSameType ? DEBOUNCE_SAME_TYPE_MINUTES_2 : DEBOUNCE_DIFFERENT_TYPE_MINUTES_2,
              lastPunchTime: lastPunch.timestamp,
              lastPunchType: lastPunch.type,
              newPunchType: effectiveType2,
            },
          },
        });

        console.log(`📋 [DEBOUNCE] Enregistrement informatif créé: ${debounceRecord.id}`);

        return {
          status: 'logged_info',
          reason: 'DEBOUNCE',
          message: `Pointage enregistré comme informatif: trop proche du précédent (${timeDisplay} < ${threshold})`,
          attendanceId: debounceRecord.id,
          lastPunchTime: lastPunch.timestamp,
          lastPunchType: lastPunch.type,
          configuredTolerance: isSameType ? DEBOUNCE_SAME_TYPE_MINUTES_2 : DEBOUNCE_DIFFERENT_TYPE_MINUTES_2,
        };
      }
    }

    // Vérifier la configuration du pointage des repos
    await this.validateBreakPunch(tenantId, effectiveType2);

    // Détecter les anomalies
    const anomaly = await this.detectAnomalies(
      tenantId,
      employee.id,
      new Date(webhookData.timestamp),
      effectiveType2,
    );

    // Log informatif pour double badgeage rapide (pas une anomalie bloquante)
    if ((anomaly as any).isInformativeDoublePunch) {
      console.log(`ℹ️ [INFORMATIF] ${(anomaly as any).informativeNote} - Employé: ${employee.matricule} (${employee.firstName} ${employee.lastName})`);
    }

    // Calculer les métriques
    const metrics = await this.calculateMetrics(
      tenantId,
      employee.id,
      new Date(webhookData.timestamp),
      effectiveType2,
    );

    // Mettre à jour lastSync du terminal pour indiquer qu'il est connecté
    await this.prisma.attendanceDevice.update({
      where: { id: device.id },
      data: { lastSync: new Date() },
    });

    // Format standardisé du rawData pour l'audit et la traçabilité
    // Réutiliser la même logique de mapping
    const getSourceFromMethodWebhook = (method: DeviceType): string => {
      switch (method) {
        case DeviceType.FINGERPRINT:
        case DeviceType.FACE_RECOGNITION:
        case DeviceType.RFID_BADGE:
          return 'TERMINAL_ZKTECO';
        case DeviceType.MOBILE_GPS:
          return 'MOBILE_APP';
        case DeviceType.MANUAL:
          return 'MANUAL';
        case DeviceType.QR_CODE:
        case DeviceType.PIN_CODE:
          return 'TERMINAL_OTHER';
        default:
          return 'UNKNOWN';
      }
    };

    const standardizedRawDataWebhook = {
      // Source du pointage
      source: getSourceFromMethodWebhook(webhookData.method),

      // Données brutes originales du terminal/webhook
      originalData: webhookData.rawData || null,

      // Métadonnées de détection IN/OUT
      inOutDetection: {
        method: 'ALTERNATION',
        receivedType: webhookData.type,
        processedAt: new Date().toISOString(),
      },

      // Informations de réception
      receivedAt: new Date().toISOString(),
      deviceId: device.id,
    };

    // FIX 03/02/2026: Détecter si le type a été corrigé par l'alternance
    // Si le terminal a envoyé IN mais l'alternance a détecté OUT (ou inversement)
    // → marquer comme AUTO_CORRECTED_WRONG_TYPE
    const isTypeCorrectedByAlternation = webhookData.type !== effectiveType2;
    let finalAnomalyType = webhookData.isAmbiguous ? 'PENDING_VALIDATION' : anomaly.type;
    let finalAnomalyNote = webhookData.ambiguityReason || anomaly.note;
    let finalHasAnomaly = anomaly.hasAnomaly || webhookData.isAmbiguous || false;
    let isCorrected = false;
    let needsApproval = false;
    let approvalStatus: string | null = null;

    if (isTypeCorrectedByAlternation) {
      console.log(`🔄 [AUTO-CORRECTION] Type corrigé par alternance: ${webhookData.type} → ${effectiveType2}`);
      finalAnomalyType = 'AUTO_CORRECTED_WRONG_TYPE';
      finalAnomalyNote = `Mauvais bouton auto-corrigé: terminal a envoyé ${webhookData.type}, corrigé en ${effectiveType2} par alternance (méthode: ${detectedType2.method}).`;
      finalHasAnomaly = true;
      isCorrected = true;
      needsApproval = true;
      approvalStatus = 'PENDING_APPROVAL';
    }

    const attendance = await this.prisma.attendance.create({
      data: {
        tenantId,
        employeeId: employee.id,
        deviceId: device.id,
        siteId: device.siteId,
        timestamp: new Date(webhookData.timestamp),
        type: effectiveType2, // FIX 18/01/2026: Utiliser le type auto-détecté
        method: webhookData.method,
        rawData: standardizedRawDataWebhook,
        hasAnomaly: finalHasAnomaly,
        anomalyType: finalAnomalyType,
        anomalyNote: finalAnomalyNote,
        isCorrected,
        needsApproval,
        approvalStatus,
        hoursWorked: metrics.hoursWorked ? new Decimal(metrics.hoursWorked) : null,
        lateMinutes: metrics.lateMinutes,
        earlyLeaveMinutes: metrics.earlyLeaveMinutes,
        overtimeMinutes: metrics.overtimeMinutes,
        // Champs PENDING_VALIDATION pour shifts de nuit
        isAmbiguous: webhookData.isAmbiguous || false,
        validationStatus: webhookData.validationStatus || 'NONE',
        ambiguityReason: webhookData.ambiguityReason || null,
      },
      include: {
        employee: {
          select: {
            id: true,
            matricule: true,
            firstName: true,
            lastName: true,
            userId: true,
            department: {
              select: {
                id: true,
                managerId: true,
              },
            },
            site: {
              select: {
                id: true,
                siteManagers: {
                  select: {
                    managerId: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Notifier les managers si anomalie détectée
    if (anomaly.hasAnomaly) {
      await this.notifyManagersOfAnomaly(tenantId, attendance);
    }

    // Création automatique d'Overtime en temps réel (Modèle hybride - Niveau 1)
    if (effectiveType2 === AttendanceType.OUT && metrics.overtimeMinutes && metrics.overtimeMinutes > 0) {
      await this.createAutoOvertime(tenantId, attendance, metrics.overtimeMinutes);
    }

    // Création automatique de Jour Supplémentaire si weekend/jour férié (Modèle hybride - Niveau 1)
    if (effectiveType2 === AttendanceType.OUT && metrics.hoursWorked && metrics.hoursWorked > 0) {
      await this.createAutoSupplementaryDay(tenantId, attendance, metrics.hoursWorked);
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // FIX 14/01/2026: TOUJOURS nettoyer MISSING_OUT quand un OUT arrive
    // (ne plus dépendre de hoursWorked qui peut être undefined)
    // ═══════════════════════════════════════════════════════════════════════════════
    if (effectiveType2 === AttendanceType.OUT) {
      const timestamp = new Date(webhookData.timestamp);
      const startOfDay = new Date(timestamp);
      startOfDay.setHours(0, 0, 0, 0);

      // Chercher directement le dernier IN avec MISSING_OUT pour cet employé aujourd'hui
      const inWithMissingOut = await this.prisma.attendance.findFirst({
        where: {
          tenantId,
          employeeId: employee.id,
          type: AttendanceType.IN,
          timestamp: { gte: startOfDay, lt: timestamp },
          hasAnomaly: true,
          anomalyType: 'MISSING_OUT',
        },
        orderBy: { timestamp: 'desc' },
      });

      if (inWithMissingOut) {
        await this.prisma.attendance.update({
          where: { id: inWithMissingOut.id },
          data: {
            hasAnomaly: false,
            anomalyType: null,
            anomalyNote: null,
          },
        });
        console.log(`✅ [Webhook] Anomalie MISSING_OUT effacée sur IN ${inWithMissingOut.id} pour ${employee.matricule}`);
      }
    }

    return attendance;
  }

  async findAll(
    tenantId: string,
    filters?: {
      employeeId?: string;
      siteId?: string;
      startDate?: string;
      endDate?: string;
      hasAnomaly?: boolean;
      type?: AttendanceType;
      search?: string;
      page?: number;
      limit?: number;
      departmentId?: string;
      anomalyType?: string;
      source?: string;
      status?: string;
      shiftId?: string;
    },
    userId?: string,
    userPermissions?: string[],
  ) {
    const where: any = { tenantId };

    // Filtrer par employé si l'utilisateur n'a que la permission 'attendance.view_own'
    const hasViewAll = userPermissions?.includes('attendance.view_all');
    const hasViewOwn = userPermissions?.includes('attendance.view_own');
    const hasViewTeam = userPermissions?.includes('attendance.view_team');
    const hasViewDepartment = userPermissions?.includes('attendance.view_department');
    const hasViewSite = userPermissions?.includes('attendance.view_site');

    // IMPORTANT: Détecter si l'utilisateur est un manager, mais seulement s'il n'a pas 'view_all'
    // Les admins avec 'view_all' doivent voir toutes les données, indépendamment de leur statut de manager
    // PRIORITÉ: La permission 'view_all' prime sur le statut de manager
    if (userId && !hasViewAll) {
      const managerLevel = await getManagerLevel(this.prisma, userId, tenantId);

      // Si l'utilisateur est un manager, appliquer le filtrage selon son niveau hiérarchique
      if (managerLevel.type === 'DEPARTMENT') {
        // Manager de département : filtrer par les employés du département
        const managedEmployeeIds = await getManagedEmployeeIds(this.prisma, managerLevel, tenantId);
        if (managedEmployeeIds.length === 0) {
          return [];
        }
        where.employeeId = { in: managedEmployeeIds };
      } else if (managerLevel.type === 'SITE') {
        // Manager régional : filtrer par les employés du site ET département
        const managedEmployeeIds = await getManagedEmployeeIds(this.prisma, managerLevel, tenantId);
        if (managedEmployeeIds.length === 0) {
          return [];
        }
        where.employeeId = { in: managedEmployeeIds };
      } else if (managerLevel.type === 'TEAM') {
        // Manager d'équipe : filtrer par l'équipe de l'utilisateur
        const employee = await this.prisma.employee.findFirst({
          where: { userId, tenantId },
          select: { teamId: true },
        });

        if (employee?.teamId) {
          // Récupérer tous les employés de la même équipe
          const teamMembers = await this.prisma.employee.findMany({
            where: { teamId: employee.teamId, tenantId },
            select: { id: true },
          });

          where.employeeId = {
            in: teamMembers.map(m => m.id),
          };
        } else {
          // Si pas d'équipe, retourner tableau vide
          return [];
        }
      } else if (!hasViewAll && hasViewOwn) {
        // Si pas manager et a seulement 'view_own', filtrer par son propre ID
        const employee = await this.prisma.employee.findFirst({
          where: { userId, tenantId },
          select: { id: true },
        });

        if (employee) {
          where.employeeId = employee.id;
        } else {
          // Si pas d'employé lié, retourner tableau vide
          return [];
        }
      }
    }

    if (filters?.employeeId) where.employeeId = filters.employeeId;
    if (filters?.siteId) where.siteId = filters.siteId;
    if (filters?.hasAnomaly !== undefined) where.hasAnomaly = filters.hasAnomaly;
    if (filters?.type) where.type = filters.type;

    // Recherche par nom/prénom/matricule de l'employé
    if (filters?.search) {
      const searchTerm = filters.search.trim();
      where.employee = {
        OR: [
          { firstName: { contains: searchTerm, mode: 'insensitive' } },
          { lastName: { contains: searchTerm, mode: 'insensitive' } },
          { matricule: { contains: searchTerm, mode: 'insensitive' } },
        ],
      };
    }

    // PERF FIX 01/02/2026: Filtres côté serveur (avant: filtrage client sur 500 records)
    if (filters?.departmentId) {
      where.employee = {
        ...where.employee,
        departmentId: filters.departmentId,
      };
    }
    if (filters?.shiftId) {
      // Filtrer par shift: employés avec ce shift par défaut OU qui ont un schedule publié avec ce shift dans la période
      const employeesWithShift = await this.prisma.employee.findMany({
        where: { tenantId, currentShiftId: filters.shiftId },
        select: { id: true },
      });
      const scheduledEmployees = filters.startDate ? await this.prisma.schedule.findMany({
        where: {
          tenantId,
          shiftId: filters.shiftId,
          status: 'PUBLISHED',
          ...(filters.startDate && { date: { gte: new Date(filters.startDate + 'T00:00:00.000Z') } }),
          ...(filters.endDate && { date: { lte: new Date(filters.endDate + 'T23:59:59.999Z') } }),
        },
        select: { employeeId: true },
        distinct: ['employeeId'],
      }) : [];
      const shiftEmployeeIds = [...new Set([
        ...employeesWithShift.map(e => e.id),
        ...scheduledEmployees.map(s => s.employeeId),
      ])];
      if (shiftEmployeeIds.length === 0) {
        // Aucun employé avec ce shift — retourner résultat vide
        return { data: [], meta: { total: 0, totalIN: 0, totalOUT: 0, totalAnomalies: 0, page: 1, limit: filters.limit || 50, totalPages: 0 } };
      }
      // Combiner avec le filtre employeeId existant
      if (where.employeeId?.in) {
        where.employeeId = { in: where.employeeId.in.filter((id: string) => shiftEmployeeIds.includes(id)) };
      } else if (where.employeeId && typeof where.employeeId === 'string') {
        if (!shiftEmployeeIds.includes(where.employeeId)) {
          return { data: [], meta: { total: 0, totalIN: 0, totalOUT: 0, totalAnomalies: 0, page: 1, limit: filters.limit || 50, totalPages: 0 } };
        }
      } else {
        where.employeeId = { in: shiftEmployeeIds };
      }
    }
    if (filters?.anomalyType) {
      where.anomalyType = filters.anomalyType;
    }
    if (filters?.source) {
      where.OR = [
        { method: filters.source },
        { source: filters.source },
      ];
    }
    if (filters?.status) {
      if (filters.status === 'VALID') {
        where.hasAnomaly = false;
        where.isCorrected = false;
      } else if (filters.status === 'HAS_ANOMALY') {
        where.hasAnomaly = true;
      } else if (filters.status === 'CORRECTED') {
        where.isCorrected = true;
      } else if (filters.status === 'PENDING_APPROVAL') {
        where.approvalStatus = 'PENDING_APPROVAL';
      }
    }

    // Exclure les enregistrements DEBOUNCE_BLOCKED de la liste normale
    // NOTE: Si un filtre source a déjà mis un OR, on doit combiner avec AND
    if (!filters?.source) {
      where.OR = [
        { anomalyType: null },
        { anomalyType: { not: 'DEBOUNCE_BLOCKED' } },
      ];
    } else {
      where.AND = [
        { OR: where.OR },
        { OR: [{ anomalyType: null }, { anomalyType: { not: 'DEBOUNCE_BLOCKED' } }] },
      ];
      delete where.OR;
    }

    if (filters?.startDate || filters?.endDate) {
      where.timestamp = {};
      if (filters.startDate) {
        // Start of day in UTC (00:00:00.000Z)
        // IMPORTANT: Utiliser format ISO explicite pour éviter les problèmes de timezone
        where.timestamp.gte = new Date(filters.startDate + 'T00:00:00.000Z');
      }
      if (filters.endDate) {
        // End of day in UTC (23:59:59.999Z)
        // IMPORTANT: Utiliser format ISO explicite pour éviter les problèmes de timezone
        where.timestamp.lte = new Date(filters.endDate + 'T23:59:59.999Z');
      }
    }

    // Pagination par défaut pour améliorer les performances
    const page = filters?.page || 1;
    const limit = filters?.limit || 50; // PERF FIX 01/02/2026: Limite par défaut réduite de 500 à 50
    const skip = (page - 1) * limit;

    const shouldPaginate = filters?.page !== undefined || filters?.limit !== undefined;
    const maxLimit = shouldPaginate ? limit : Math.min(limit, 200);

    const [data, total, totalIN, totalOUT, totalAnomalies] = await Promise.all([
      this.prisma.attendance.findMany({
        where,
        skip: shouldPaginate ? skip : undefined,
        take: maxLimit,
        select: {
          id: true,
          createdAt: true,
          updatedAt: true,
          tenantId: true,
          employeeId: true,
          siteId: true,
          deviceId: true,
          timestamp: true,
          type: true,
          method: true,
          latitude: true,
          longitude: true,
          hasAnomaly: true,
          anomalyType: true,
          anomalyNote: true,
          isCorrected: true,
          correctedBy: true,
          correctedAt: true,
          correctionNote: true,
          hoursWorked: true,
          lateMinutes: true,
          earlyLeaveMinutes: true,
          overtimeMinutes: true,
          needsApproval: true,
          approvalStatus: true,
          approvedBy: true,
          approvedAt: true,
          rawData: true,
          generatedBy: true,
          isGenerated: true,
          employee: {
            select: {
              id: true,
              matricule: true,
              firstName: true,
              lastName: true,
              photo: true,
              departmentId: true,
              siteId: true,
              department: {
                select: {
                  id: true,
                  name: true,
                },
              },
              currentShift: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                  startTime: true,
                  endTime: true,
                },
              },
            },
          },
          site: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          device: {
            select: {
              id: true,
              name: true,
              deviceId: true,
              deviceType: true,
            },
          },
        },
        orderBy: { timestamp: 'desc' },
      }),
      this.prisma.attendance.count({ where }),
      this.prisma.attendance.count({ where: { AND: [where, { type: 'IN' }] } }),
      this.prisma.attendance.count({ where: { AND: [where, { type: 'OUT' }] } }),
      this.prisma.attendance.count({ where: { AND: [where, { hasAnomaly: true }] } }),
    ]);

    // FIX 17/01/2026: Enrichir les données avec le planning effectif (personnalisé ou par défaut)
    // Récupérer tous les schedules nécessaires en une seule requête pour optimiser les performances
    const employeeDatePairs = new Map<string, Set<string>>();
    for (const record of data) {
      const dateStr = record.timestamp.toISOString().split('T')[0];
      if (!employeeDatePairs.has(record.employeeId)) {
        employeeDatePairs.set(record.employeeId, new Set());
      }
      employeeDatePairs.get(record.employeeId)!.add(dateStr);
    }

    // PERF FIX 01/02/2026: Batch query au lieu de N+1 queries
    // Avant: 1 requête par (employeeId, date) = ~500 requêtes séquentielles (~5s)
    // Après: 1 seule requête batch (~50-100ms)
    const scheduleMap = new Map<string, any>();
    const orConditions = Array.from(employeeDatePairs.entries()).flatMap(([employeeId, dates]) =>
      Array.from(dates).map(dateStr => ({
        employeeId,
        date: new Date(dateStr + 'T00:00:00.000Z'),
      }))
    );

    if (orConditions.length > 0) {
      const allSchedules = await this.prisma.schedule.findMany({
        where: {
          tenantId,
          status: 'PUBLISHED',
          OR: orConditions,
        },
        include: {
          shift: {
            select: {
              id: true,
              name: true,
              code: true,
              startTime: true,
              endTime: true,
            },
          },
        },
      });

      for (const schedule of allSchedules) {
        if (schedule.shift) {
          const dateStr = schedule.date.toISOString().split('T')[0];
          scheduleMap.set(`${schedule.employeeId}_${dateStr}`, schedule.shift);
        }
      }
    }

    // Convertir les valeurs Decimal en nombres et ajouter effectiveShift
    const transformedData = data.map(record => {
      const dateStr = record.timestamp.toISOString().split('T')[0];
      const scheduleShift = scheduleMap.get(`${record.employeeId}_${dateStr}`);

      // Utiliser le planning personnalisé s'il existe, sinon le shift par défaut
      const effectiveShift = scheduleShift || record.employee?.currentShift || null;

      return {
        ...record,
        hoursWorked: record.hoursWorked ? Number(record.hoursWorked) : null,
        effectiveShift, // Le shift réellement utilisé pour cette date
      };
    });

    // Si pagination demandée, retourner avec métadonnées
    if (shouldPaginate) {
      const result = {
        data: transformedData,
        meta: {
          total,
          totalIN,
          totalOUT,
          totalAnomalies,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
      return result;
    }

    // Sinon, retourner juste les données (compatibilité avec l'ancien code)
    return transformedData;
  }

  async remove(tenantId: string, id: string, userId?: string, userPermissions?: string[]) {
    // Récupérer le pointage
    const attendance = await this.prisma.attendance.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            matricule: true,
            departmentId: true,
            siteId: true,
            userId: true,
          },
        },
      },
    });

    if (!attendance) {
      throw new NotFoundException('Pointage non trouvé');
    }

    // Vérifier que le pointage appartient au tenant
    if (attendance.tenantId !== tenantId) {
      throw new ForbiddenException('Accès non autorisé à ce pointage');
    }

    // Vérifier que c'est un pointage manuel (seuls les pointages manuels peuvent être supprimés)
    if (attendance.method !== DeviceType.MANUAL) {
      throw new BadRequestException(
        'Seuls les pointages manuels peuvent être supprimés. Les pointages provenant de dispositifs biométriques ne peuvent pas être supprimés.',
      );
    }

    // Vérifier les permissions
    if (userPermissions && userId) {
      const hasViewAll = userPermissions.includes('attendance.view_all');
      const hasDelete = userPermissions.includes('attendance.delete') || userPermissions.includes('attendance.edit');

      if (!hasDelete) {
        throw new ForbiddenException('Vous n\'avez pas la permission de supprimer des pointages');
      }

      if (!hasViewAll) {
        // Vérifier que l'utilisateur peut voir ce pointage
        const hasViewOwn = userPermissions.includes('attendance.view_own');
        const hasViewTeam = userPermissions.includes('attendance.view_team');
        const hasViewDepartment = userPermissions.includes('attendance.view_department');
        const hasViewSite = userPermissions.includes('attendance.view_site');

        // Vérifier si l'utilisateur est l'employé concerné
        if (hasViewOwn && attendance.employee.userId === userId) {
          // OK, peut supprimer son propre pointage
        } else if (hasViewTeam || hasViewDepartment || hasViewSite) {
          // Vérifier si l'utilisateur est manager de l'employé
          const managerLevel = await getManagerLevel(this.prisma, userId, tenantId);
          const managedEmployeeIds = await getManagedEmployeeIds(
            this.prisma,
            managerLevel,
            tenantId,
          );

          if (!managedEmployeeIds.includes(attendance.employeeId)) {
            throw new ForbiddenException(
              'Vous ne pouvez supprimer que les pointages de vos employés',
            );
          }
        } else {
          throw new ForbiddenException('Vous n\'avez pas la permission de supprimer ce pointage');
        }
      }
    }

    // Si c'est un pointage OUT avec des heures supplémentaires, vérifier l'overtime associé
    if (attendance.type === AttendanceType.OUT && attendance.overtimeMinutes && attendance.overtimeMinutes > 0) {
      const attendanceDate = new Date(attendance.timestamp.toISOString().split('T')[0]);

      // Vérifier si un overtime APPROUVÉ existe pour cette date
      const approvedOvertime = await this.prisma.overtime.findFirst({
        where: {
          tenantId,
          employeeId: attendance.employeeId,
          date: attendanceDate,
          status: OvertimeStatus.APPROVED,
        },
      });

      // BLOQUER la suppression si l'overtime est déjà approuvé
      if (approvedOvertime) {
        throw new BadRequestException(
          `Impossible de supprimer ce pointage : les heures supplémentaires associées (${(approvedOvertime.hours as any).toFixed(2)}h) ont déjà été approuvées. Veuillez d'abord annuler l'approbation de l'overtime.`,
        );
      }

      // Supprimer l'overtime PENDING associé
      const deletedOvertime = await this.prisma.overtime.deleteMany({
        where: {
          tenantId,
          employeeId: attendance.employeeId,
          date: attendanceDate,
          status: OvertimeStatus.PENDING,
        },
      });

      if (deletedOvertime.count > 0) {
        console.log(`[AutoOvertime] 🗑️ Overtime PENDING supprimé suite à la suppression du pointage OUT pour ${attendance.employee.firstName} ${attendance.employee.lastName}`);
      }
    }

    // Supprimer le pointage
    try {
      await this.prisma.attendance.delete({
        where: { id },
      });

      return {
        success: true,
        message: 'Pointage supprimé avec succès',
      };
    } catch (error) {
      console.error('Erreur lors de la suppression du pointage:', error);
      if (error.code === 'P2025') {
        // Record not found
        throw new NotFoundException('Pointage non trouvé');
      }
      throw new BadRequestException(
        `Erreur lors de la suppression du pointage: ${error.message || 'Erreur inconnue'}`,
      );
    }
  }

  async findOne(tenantId: string, id: string) {
    const attendance = await this.prisma.attendance.findFirst({
      where: { id, tenantId },
      include: {
        employee: {
          select: {
            id: true,
            matricule: true,
            firstName: true,
            lastName: true,
            photo: true,
            position: true,
            department: true,
            team: true,
          },
        },
        site: true,
        device: true,
      },
    });

    if (!attendance) {
      throw new NotFoundException(`Attendance record ${id} not found`);
    }

    return attendance;
  }

  async invertAttendanceType(
    tenantId: string,
    id: string,
    userId?: string,
    note?: string,
  ) {
    const attendance = await this.prisma.attendance.findFirst({
      where: { id, tenantId },
    });

    if (!attendance) {
      throw new NotFoundException('Attendance not found');
    }

    const newType = attendance.type === 'IN' ? 'OUT' : 'IN';
    const correctionNote = `[INVERSION] Type inversé: ${attendance.type} → ${newType}${note ? `. ${note}` : ''}`;

    return this.prisma.attendance.update({
      where: { id },
      data: {
        type: newType as AttendanceType,
        isCorrected: true,
        correctedBy: userId,
        correctedAt: new Date(),
        correctionNote,
        anomalyType: attendance.anomalyType === 'PROBABLE_WRONG_TYPE' ? null : attendance.anomalyType,
        hasAnomaly: attendance.anomalyType !== 'PROBABLE_WRONG_TYPE' && !!attendance.anomalyType,
      },
      include: {
        employee: {
          select: { id: true, matricule: true, firstName: true, lastName: true },
        },
      },
    });
  }

  async createMissingPunch(
    tenantId: string,
    attendanceId: string,
    userId?: string,
    suggestedTimestamp?: string,
    note?: string,
  ) {
    // Trouver le pointage existant qui a l'anomalie
    const existing = await this.prisma.attendance.findFirst({
      where: { id: attendanceId, tenantId },
      include: {
        employee: {
          select: { id: true, currentShiftId: true, currentShift: true, siteId: true },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Attendance not found');
    }

    if (!existing.anomalyType || !['MISSING_IN', 'MISSING_OUT'].includes(existing.anomalyType)) {
      throw new BadRequestException('Ce pointage n\'a pas d\'anomalie MISSING_IN ou MISSING_OUT');
    }

    // Déterminer le type du pointage manquant
    const missingType: 'IN' | 'OUT' = existing.anomalyType === 'MISSING_IN' ? 'IN' : 'OUT';

    // Calculer le timestamp suggéré basé sur le shift
    let timestamp: Date;
    if (suggestedTimestamp) {
      timestamp = new Date(suggestedTimestamp);
    } else {
      const schedule = await this.getScheduleWithFallback(tenantId, existing.employeeId, existing.timestamp);
      const shift = schedule?.shift as { startTime: string; endTime: string; isNightShift?: boolean } | null;

      if (shift) {
        const dateStr = existing.timestamp.toISOString().split('T')[0];
        if (missingType === 'IN') {
          // Créer IN à l'heure de début du shift
          const [h, m] = shift.startTime.split(':').map(Number);
          timestamp = new Date(dateStr + 'T00:00:00Z');
          timestamp.setUTCHours(h, m, 0, 0);
          // Pour shift nuit, le IN est la veille du OUT
          if (shift.isNightShift || shift.startTime > shift.endTime) {
            timestamp.setDate(timestamp.getDate() - 1);
          }
        } else {
          // Créer OUT à l'heure de fin du shift
          const [h, m] = shift.endTime.split(':').map(Number);
          timestamp = new Date(dateStr + 'T00:00:00Z');
          timestamp.setUTCHours(h, m, 0, 0);
          // Pour shift nuit, le OUT est le lendemain du IN
          if (shift.isNightShift || shift.startTime > shift.endTime) {
            timestamp.setDate(timestamp.getDate() + 1);
          }
        }
      } else {
        throw new BadRequestException('Aucun shift trouvé. Veuillez fournir un timestamp.');
      }
    }

    // Créer le pointage manquant
    const created = await this.prisma.attendance.create({
      data: {
        tenantId,
        employeeId: existing.employeeId,
        siteId: existing.siteId,
        timestamp,
        type: missingType as AttendanceType,
        method: 'MANUAL' as DeviceType,
        source: 'MANUAL',
        isGenerated: true,
        generatedBy: userId || 'system',
        correctionNote: note || `[AUTO] Pointage ${missingType} créé pour compléter la session. Basé sur le shift assigné.`,
      },
      include: {
        employee: {
          select: { id: true, matricule: true, firstName: true, lastName: true },
        },
      },
    });

    // Marquer l'anomalie comme corrigée sur le pointage original
    await this.prisma.attendance.update({
      where: { id: attendanceId },
      data: {
        isCorrected: true,
        correctedBy: userId,
        correctedAt: new Date(),
        correctionNote: `${missingType} manquant créé automatiquement (ID: ${created.id})`,
        hasAnomaly: false,
        anomalyType: null,
      },
    });

    return created;
  }

  async correctAttendance(
    tenantId: string,
    id: string,
    correctionDto: CorrectAttendanceDto,
    userId?: string,
    userPermissions?: string[],
  ) {
    const attendance = await this.prisma.attendance.findFirst({
      where: { id, tenantId },
      include: {
        employee: {
          select: {
            id: true,
            departmentId: true,
            siteId: true,
            teamId: true,
          },
        },
      },
    });

    if (!attendance) {
      throw new NotFoundException(`Attendance record ${id} not found`);
    }

    // Vérifier si l'utilisateur peut corriger ce pointage (si c'est un manager)
    if (userId && userPermissions) {
      const hasViewAll = userPermissions.includes('attendance.view_all');
      
      // Si l'utilisateur n'a pas 'view_all', vérifier qu'il peut gérer cet employé
      if (!hasViewAll) {
        const managerLevel = await getManagerLevel(this.prisma, userId, tenantId);
        
        if (managerLevel.type) {
          // Récupérer les IDs des employés que le manager peut gérer
          const managedEmployeeIds = await getManagedEmployeeIds(this.prisma, managerLevel, tenantId);
          
          // Vérifier que l'employé du pointage est dans la liste des employés gérés
          if (!managedEmployeeIds.includes(attendance.employeeId)) {
            throw new ForbiddenException(
              'Vous ne pouvez corriger que les pointages des employés de votre périmètre',
            );
          }
        } else {
          // Si pas manager et pas 'view_all', vérifier si c'est son propre pointage
          const hasViewOwn = userPermissions.includes('attendance.view_own');
          if (hasViewOwn) {
            const employee = await this.prisma.employee.findFirst({
              where: { userId, tenantId },
              select: { id: true },
            });
            
            if (employee?.id !== attendance.employeeId) {
              throw new ForbiddenException(
                'Vous ne pouvez corriger que vos propres pointages',
              );
            }
          } else {
            throw new ForbiddenException(
              'Vous n\'avez pas la permission de corriger ce pointage',
            );
          }
        }
      }
    }

    // Nouveau timestamp si fourni
    const newTimestamp = correctionDto.correctedTimestamp
      ? new Date(correctionDto.correctedTimestamp)
      : attendance.timestamp;

    // Déterminer si le timestamp a changé
    const timestampChanged = correctionDto.correctedTimestamp &&
      new Date(correctionDto.correctedTimestamp).getTime() !== attendance.timestamp.getTime();

    // Re-détecter les anomalies SEULEMENT si le timestamp a changé
    // Sinon, on préserve l'anomalie originale (on corrige juste en ajoutant une justification)
    let finalHasAnomaly = attendance.hasAnomaly;
    let finalAnomalyType = attendance.anomalyType;

    if (timestampChanged) {
      const anomaly = await this.detectAnomalies(
        tenantId,
        attendance.employeeId,
        newTimestamp,
        attendance.type,
      );

      // Log informatif pour double badgeage rapide (pas une anomalie bloquante)
      if ((anomaly as any).isInformativeDoublePunch) {
        console.log(`ℹ️ [INFORMATIF] ${(anomaly as any).informativeNote} - Employé: ${attendance.employeeId}`);
      }

      finalHasAnomaly = anomaly.hasAnomaly;
      finalAnomalyType = anomaly.type;
    }
    // Si pas de changement de timestamp, on garde l'anomalie originale mais on la marque comme corrigée

    // Recalculer les métriques
    const metrics = await this.calculateMetrics(
      tenantId,
      attendance.employeeId,
      newTimestamp,
      attendance.type,
    );

    // NOUVEAU COMPORTEMENT: Les managers corrigent directement sans approbation
    // Déterminer si l'utilisateur est un manager corrigeant le pointage d'un autre
    const isManagerCorrection = await this.isManagerCorrectingOthersAttendance(
      userId,
      attendance.employeeId,
      tenantId,
      userPermissions || [],
    );

    // Plus d'approbation nécessaire - les managers corrigent directement
    // Les employés ne peuvent corriger que leurs propres pointages (vérifié plus haut)
    const needsApproval = false; // SUPPRIMÉ: le workflow d'approbation n'est plus utilisé

    // Utiliser correctedBy du DTO ou le userId passé par le controller
    const correctorId = correctionDto.correctedBy || userId;

    // Construire la note de correction avec le code motif si fourni
    const fullCorrectionNote = correctionDto.reasonCode
      ? `[${correctionDto.reasonCode}] ${correctionDto.correctionNote}`
      : correctionDto.correctionNote;

    const updatedAttendance = await this.prisma.attendance.update({
      where: { id },
      data: {
        isCorrected: true, // Correction immédiate
        correctedBy: correctorId,
        correctedAt: new Date(),
        correctionNote: fullCorrectionNote,
        timestamp: newTimestamp,
        // IMPORTANT: Préserver le type d'anomalie original si pas de changement de timestamp
        // Cela permet de garder l'historique de ce qui a été corrigé
        hasAnomaly: finalHasAnomaly,
        anomalyType: finalAnomalyType,
        hoursWorked: metrics.hoursWorked ? new Decimal(metrics.hoursWorked) : null,
        lateMinutes: metrics.lateMinutes,
        earlyLeaveMinutes: metrics.earlyLeaveMinutes,
        overtimeMinutes: metrics.overtimeMinutes,
        needsApproval: false,
        approvalStatus: 'APPROVED', // Auto-approuvé pour les managers
        approvedBy: isManagerCorrection ? correctorId : null,
        approvedAt: isManagerCorrection ? new Date() : null,
      },
      include: {
        employee: {
          select: {
            id: true,
            matricule: true,
            firstName: true,
            lastName: true,
            userId: true,
          },
        },
      },
    });

    // TOUJOURS notifier l'employé quand un manager corrige son pointage
    if (isManagerCorrection && updatedAttendance.employee.userId) {
      await this.notifyEmployeeOfManagerCorrection(
        tenantId,
        updatedAttendance,
        correctorId,
        correctionDto.reasonCode,
        correctionDto.correctionNote,
      );
    }

    // Création automatique d'Overtime lors de correction (Modèle hybride - Niveau 1)
    if (attendance.type === AttendanceType.OUT && metrics.overtimeMinutes && metrics.overtimeMinutes > 0) {
      await this.createAutoOvertime(tenantId, updatedAttendance, metrics.overtimeMinutes);
    }

    // Création automatique de Jour Supplémentaire lors de correction (Modèle hybride - Niveau 1)
    if (attendance.type === AttendanceType.OUT && metrics.hoursWorked && metrics.hoursWorked > 0) {
      await this.createAutoSupplementaryDay(tenantId, updatedAttendance, metrics.hoursWorked);
    }

    return updatedAttendance;
  }

  /**
   * Vérifie si c'est un manager qui corrige le pointage d'un autre employé
   */
  private async isManagerCorrectingOthersAttendance(
    userId: string | undefined,
    employeeId: string,
    tenantId: string,
    permissions: string[],
  ): Promise<boolean> {
    if (!userId) return false;

    // Vérifier si l'utilisateur a la permission de correction
    const hasCorrectPermission = permissions.includes('attendance.correct') ||
      permissions.includes('attendance.view_all');

    if (!hasCorrectPermission) return false;

    // Vérifier si l'utilisateur corrige son propre pointage
    const userEmployee = await this.prisma.employee.findFirst({
      where: { userId, tenantId },
      select: { id: true },
    });

    // C'est une correction manager si l'utilisateur corrige le pointage d'un autre
    return userEmployee?.id !== employeeId;
  }

  /**
   * Détermine si une correction nécessite une approbation
   */
  private requiresApproval(
    attendance: any,
    newTimestamp: Date,
    correctionNote: string,
  ): boolean {
    // Correction nécessite approbation si :
    // 1. Changement de timestamp > 2 heures
    const timeDiff = Math.abs(newTimestamp.getTime() - attendance.timestamp.getTime()) / (1000 * 60 * 60);
    if (timeDiff > 2) {
      return true;
    }

    // 2. Anomalie de type ABSENCE, UNPLANNED_PUNCH ou INSUFFICIENT_REST
    // - ABSENCE : pas de pointage alors qu'un planning existe
    // - UNPLANNED_PUNCH : pointage effectué sans planning existant
    // - INSUFFICIENT_REST : repos insuffisant entre shifts
    if (
      attendance.anomalyType === 'ABSENCE' ||
      attendance.anomalyType === 'UNPLANNED_PUNCH' ||
      attendance.anomalyType === 'INSUFFICIENT_REST'
    ) {
      return true;
    }

    return false;
  }

  /**
   * Notifie les managers d'une nouvelle anomalie
   */
  private async notifyManagersOfAnomaly(tenantId: string, attendance: any): Promise<void> {
    try {
      const managerIds = new Set<string>();

      // Récupérer le manager du département
      if (attendance.employee?.department?.managerId) {
        managerIds.add(attendance.employee.department.managerId);
      }

      // Récupérer les managers régionaux du site
      if (attendance.employee?.site?.siteManagers) {
        attendance.employee.site.siteManagers.forEach((sm: any) => {
          managerIds.add(sm.managerId);
        });
      }

      // Créer des notifications pour chaque manager
      for (const managerId of managerIds) {
        const manager = await this.prisma.employee.findUnique({
          where: { id: managerId },
          select: { userId: true, firstName: true, lastName: true },
        });

        if (manager?.userId) {
          await this.prisma.notification.create({
            data: {
              tenantId,
              employeeId: managerId,
              type: NotificationType.ATTENDANCE_ANOMALY,
              title: 'Nouvelle anomalie de pointage détectée',
              message: `Anomalie ${attendance.anomalyType} détectée pour ${attendance.employee.firstName} ${attendance.employee.lastName} (${attendance.employee.matricule})`,
              metadata: {
                attendanceId: attendance.id,
                anomalyType: attendance.anomalyType,
                employeeId: attendance.employeeId,
              },
            },
          });
        }
      }
    } catch (error) {
      console.error('Erreur lors de la notification des managers:', error);
      // Ne pas bloquer la création du pointage en cas d'erreur de notification
    }
  }

  /**
   * Notifie l'employé d'une correction (méthode legacy)
   */
  private async notifyEmployeeOfCorrection(tenantId: string, attendance: any): Promise<void> {
    try {
      if (!attendance.employee?.userId) return;

      await this.prisma.notification.create({
        data: {
          tenantId,
          employeeId: attendance.employeeId,
          type: NotificationType.ATTENDANCE_CORRECTED,
          title: 'Votre pointage a été corrigé',
          message: `Votre pointage du ${new Date(attendance.timestamp).toLocaleDateString('fr-FR')} a été corrigé par un manager.`,
          metadata: {
            attendanceId: attendance.id,
            correctedAt: attendance.correctedAt,
          },
        },
      });
    } catch (error) {
      console.error('Erreur lors de la notification de l\'employé:', error);
    }
  }

  /**
   * Notifie l'employé qu'un manager a corrigé son pointage (notification détaillée)
   */
  private async notifyEmployeeOfManagerCorrection(
    tenantId: string,
    attendance: any,
    correctedByUserId: string,
    reasonCode?: string,
    correctionNote?: string,
  ): Promise<void> {
    try {
      if (!attendance.employee?.userId) return;

      // Récupérer les infos du manager qui a corrigé
      const corrector = await this.prisma.user.findUnique({
        where: { id: correctedByUserId },
        select: { firstName: true, lastName: true },
      });

      const correctorName = corrector
        ? `${corrector.firstName} ${corrector.lastName}`
        : 'Un manager';

      // Construire le message détaillé
      const dateStr = new Date(attendance.timestamp).toLocaleDateString('fr-FR');
      const timeStr = new Date(attendance.timestamp).toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      });

      // Labels pour les codes de motif
      const reasonLabels: Record<string, string> = {
        FORGOT_BADGE: 'Oubli de badge',
        DEVICE_FAILURE: 'Panne terminal',
        EXTERNAL_MEETING: 'Réunion externe',
        MANAGER_AUTH: 'Autorisation manager',
        SYSTEM_ERROR: 'Erreur système',
        TELEWORK: 'Télétravail',
        MISSION: 'Mission extérieure',
        MEDICAL: 'Raison médicale',
        OTHER: 'Autre',
      };

      const reasonLabel = reasonCode ? reasonLabels[reasonCode] || reasonCode : null;

      let message = `${correctorName} a corrigé votre pointage du ${dateStr} à ${timeStr}.`;
      if (reasonLabel) {
        message += ` Motif: ${reasonLabel}.`;
      }
      if (correctionNote) {
        message += ` Note: ${correctionNote}`;
      }

      // Créer la notification in-app
      await this.prisma.notification.create({
        data: {
          tenantId,
          employeeId: attendance.employeeId,
          type: NotificationType.ATTENDANCE_CORRECTED,
          title: 'Correction de pointage par votre manager',
          message,
          metadata: {
            attendanceId: attendance.id,
            correctedAt: attendance.correctedAt,
            correctedBy: correctedByUserId,
            correctorName,
            reasonCode,
            correctionNote,
          },
        },
      });

      console.log(
        `📧 Notification envoyée à ${attendance.employee.firstName} ${attendance.employee.lastName} pour correction par ${correctorName}`,
      );
    } catch (error) {
      console.error('Erreur lors de la notification de correction manager:', error);
      // Ne pas bloquer en cas d'erreur de notification
    }
  }

  /**
   * Notifie les managers qu'une approbation est nécessaire
   */
  private async notifyManagersOfApprovalRequired(tenantId: string, attendance: any): Promise<void> {
    try {
      const managerIds = new Set<string>();

      if (attendance.employee?.department?.managerId) {
        managerIds.add(attendance.employee.department.managerId);
      }

      if (attendance.employee?.site?.siteManagers) {
        attendance.employee.site.siteManagers.forEach((sm: any) => {
          managerIds.add(sm.managerId);
        });
      }

      for (const managerId of managerIds) {
        const manager = await this.prisma.employee.findUnique({
          where: { id: managerId },
          select: { userId: true },
        });

        if (manager?.userId) {
          await this.prisma.notification.create({
            data: {
              tenantId,
              employeeId: managerId,
              type: NotificationType.ATTENDANCE_APPROVAL_REQUIRED,
              title: 'Approbation de correction requise',
              message: `Une correction de pointage pour ${attendance.employee.firstName} ${attendance.employee.lastName} nécessite votre approbation.`,
              metadata: {
                attendanceId: attendance.id,
                employeeId: attendance.employeeId,
              },
            },
          });
        }
      }
    } catch (error) {
      console.error('Erreur lors de la notification des managers pour approbation:', error);
    }
  }

  async getAnomalies(
    tenantId: string,
    date?: string,
    userId?: string,
    userPermissions?: string[],
  ) {
    const where: any = {
      tenantId,
      hasAnomaly: true,
      isCorrected: false,
    };

    // Filtrer par manager si nécessaire (seulement si l'utilisateur n'a pas 'view_all')
    const hasViewAll = userPermissions?.includes('attendance.view_all');
    if (userId && !hasViewAll) {
      const managerLevel = await getManagerLevel(this.prisma, userId, tenantId);
      if (managerLevel.type !== null) {
        const managedEmployeeIds = await getManagedEmployeeIds(this.prisma, managerLevel, tenantId);
        if (managedEmployeeIds.length === 0) {
          return [];
        }
        where.employeeId = { in: managedEmployeeIds };
      } else if (userPermissions?.includes('attendance.view_own')) {
        // Si pas manager et a seulement 'view_own', filtrer par son propre ID
        const employee = await this.prisma.employee.findFirst({
          where: { userId, tenantId },
          select: { id: true },
        });
        if (employee) {
          where.employeeId = employee.id;
        } else {
          return [];
        }
      }
    }

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      where.timestamp = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }

    const anomalies = await this.prisma.attendance.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            matricule: true,
            firstName: true,
            lastName: true,
            photo: true,
            site: {
              select: {
                id: true,
                name: true,
              },
            },
            department: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        site: true,
      },
    });

    // Trier par score de criticité (amélioré) puis par date
    const anomaliesWithScores = await Promise.all(
      anomalies.map(async anomaly => ({
        ...anomaly,
        score: await this.calculateAnomalyScore(
          tenantId,
          anomaly.employeeId,
          anomaly.anomalyType,
          anomaly.timestamp,
          !!anomaly.correctionNote, // hasJustification
        ),
      })),
    );

    return anomaliesWithScores.sort((a, b) => {
      if (a.score !== b.score) {
        return b.score - a.score; // Score décroissant
      }

      // Si même score, trier par date (plus récent en premier)
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  }

  /**
   * Get anomalies with full filter support and pagination
   */
  async getAnomaliesPaginated(
    tenantId: string,
    filters: {
      startDate?: string;
      endDate?: string;
      employeeId?: string;
      departmentId?: string;
      siteId?: string;
      anomalyType?: string;
      isCorrected?: boolean;
      page?: number;
      limit?: number;
    },
    userId?: string,
    userPermissions?: string[],
  ) {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100); // Max 100 par page
    const skip = (page - 1) * limit;

    // Construire la condition de base pour les anomalies
    // On veut afficher :
    // - Les anomalies actuelles (hasAnomaly: true)
    // - OU les anomalies corrigées (isCorrected: true), même si hasAnomaly est devenu false après correction
    const where: any = {
      tenantId,
      OR: [
        { hasAnomaly: true },
        { isCorrected: true },
      ],
    };

    // Filtre isCorrected - si spécifié, filtrer selon l'état de correction
    if (filters.isCorrected !== undefined) {
      // Remplacer la condition OR par une condition plus spécifique
      if (filters.isCorrected) {
        // Afficher uniquement les corrigées
        delete where.OR;
        where.isCorrected = true;
      } else {
        // Afficher uniquement les non corrigées (anomalies en cours)
        delete where.OR;
        where.hasAnomaly = true;
        where.isCorrected = false;
      }
    }

    // Filtre par date (en UTC pour éviter les problèmes de timezone)
    if (filters.startDate || filters.endDate) {
      where.timestamp = {};
      if (filters.startDate) {
        // Start of day in UTC
        where.timestamp.gte = new Date(filters.startDate + 'T00:00:00.000Z');
      }
      if (filters.endDate) {
        // End of day in UTC
        where.timestamp.lte = new Date(filters.endDate + 'T23:59:59.999Z');
      }
    }

    // Filtre par employé
    if (filters.employeeId) {
      where.employeeId = filters.employeeId;
    }

    // Filtre par type d'anomalie
    if (filters.anomalyType) {
      where.anomalyType = filters.anomalyType;
    }

    // Filtre par département
    if (filters.departmentId) {
      where.employee = {
        departmentId: filters.departmentId,
      };
    }

    // Filtre par site
    if (filters.siteId) {
      where.siteId = filters.siteId;
    }

    // Filtrer par manager si nécessaire
    const hasViewAll = userPermissions?.includes('attendance.view_all');
    if (userId && !hasViewAll) {
      const managerLevel = await getManagerLevel(this.prisma, userId, tenantId);
      if (managerLevel.type !== null) {
        const managedEmployeeIds = await getManagedEmployeeIds(this.prisma, managerLevel, tenantId);
        if (managedEmployeeIds.length === 0) {
          return { data: [], meta: { total: 0, page, limit, totalPages: 0 } };
        }
        where.employeeId = { in: managedEmployeeIds };
      } else if (userPermissions?.includes('attendance.view_own')) {
        const employee = await this.prisma.employee.findFirst({
          where: { userId, tenantId },
          select: { id: true },
        });
        if (employee) {
          where.employeeId = employee.id;
        } else {
          return { data: [], meta: { total: 0, page, limit, totalPages: 0 } };
        }
      }
    }

    // Compter le total et récupérer les données paginées
    const [total, anomalies] = await Promise.all([
      this.prisma.attendance.count({ where }),
      this.prisma.attendance.findMany({
        where,
        include: {
          employee: {
            select: {
              id: true,
              matricule: true,
              firstName: true,
              lastName: true,
              photo: true,
              site: { select: { id: true, name: true } },
              department: { select: { id: true, name: true } },
              currentShift: { select: { id: true, name: true, startTime: true, endTime: true } },
            },
          },
          site: true,
        },
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    // Batch-fetch schedules+shifts for each anomaly's (employeeId, date)
    const dateEmployeePairs = anomalies.map((a: any) => ({
      employeeId: a.employeeId,
      date: new Date(a.timestamp.toISOString().split('T')[0]),
    }));

    let scheduleMap = new Map<string, any>();
    if (dateEmployeePairs.length > 0) {
      const schedules = await this.prisma.schedule.findMany({
        where: {
          tenantId,
          OR: dateEmployeePairs.map(p => ({
            employeeId: p.employeeId,
            date: p.date,
          })),
        },
        include: {
          shift: { select: { id: true, name: true, startTime: true, endTime: true } },
        },
      });
      for (const s of schedules) {
        const key = `${s.employeeId}_${s.date.toISOString().split('T')[0]}`;
        scheduleMap.set(key, { id: s.id, shift: s.shift });
      }
    }

    // Enrich: use schedule shift, fallback to employee's default shift
    const enrichedAnomalies = anomalies.map((a: any) => {
      const key = `${a.employeeId}_${a.timestamp.toISOString().split('T')[0]}`;
      const scheduleData = scheduleMap.get(key) || null;
      const defaultShift = a.employee?.currentShift || null;
      return {
        ...a,
        schedule: scheduleData || (defaultShift ? { id: null, shift: defaultShift, isDefault: true } : null),
      };
    });

    return {
      data: enrichedAnomalies,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  async getDailyReport(tenantId: string, date: string) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const [totalRecords, uniqueEmployees, lateEntries, anomalies] = await Promise.all([
      this.prisma.attendance.count({
        where: {
          tenantId,
          timestamp: { gte: startOfDay, lte: endOfDay },
        },
      }),

      this.prisma.attendance.findMany({
        where: {
          tenantId,
          timestamp: { gte: startOfDay, lte: endOfDay },
          type: AttendanceType.IN,
        },
        distinct: ['employeeId'],
        select: { employeeId: true },
      }),

      this.prisma.attendance.count({
        where: {
          tenantId,
          timestamp: { gte: startOfDay, lte: endOfDay },
          hasAnomaly: true,
          anomalyType: { contains: 'LATE' },
        },
      }),

      this.prisma.attendance.count({
        where: {
          tenantId,
          timestamp: { gte: startOfDay, lte: endOfDay },
          hasAnomaly: true,
        },
      }),
    ]);

    return {
      date,
      totalRecords,
      uniqueEmployees: uniqueEmployees.length,
      lateEntries,
      anomalies,
    };
  }

  /**
   * Valide si le pointage de repos est autorisé selon la configuration
   */
  private async validateBreakPunch(tenantId: string, type: AttendanceType): Promise<void> {
    // Vérifier si c'est un pointage de repos
    if (type !== AttendanceType.BREAK_START && type !== AttendanceType.BREAK_END) {
      return; // Pas un pointage de repos, pas de validation nécessaire
    }

    // Récupérer la configuration du tenant
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
      select: { requireBreakPunch: true },
    });

    // Si requireBreakPunch est false, rejeter les pointages de repos
    if (!settings?.requireBreakPunch) {
      throw new BadRequestException(
        'Le pointage des repos (pauses) est désactivé pour ce tenant. Contactez votre administrateur pour activer cette fonctionnalité.',
      );
    }
  }

  /**
   * Calcule les métriques (heures travaillées, retards, etc.)
   * Vérifie l'éligibilité de l'employé aux heures supplémentaires
   */
  private async calculateMetrics(
    tenantId: string,
    employeeId: string,
    timestamp: Date,
    type: AttendanceType,
  ): Promise<{
    hoursWorked?: number;
    lateMinutes?: number;
    earlyLeaveMinutes?: number;
    overtimeMinutes?: number;
  }> {
    // Vérifier l'éligibilité de l'employé aux heures supplémentaires
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { isEligibleForOvertime: true },
    });

    // Si l'employé n'est pas éligible, ne pas calculer les heures sup
    const isEligibleForOvertime = employee?.isEligibleForOvertime ?? true; // Par défaut éligible pour rétrocompatibilité

    // ═══════════════════════════════════════════════════════════════════════════════
    // FIX 16/01/2026: Pour les shifts de nuit, le IN peut être du jour précédent
    // Étendre la fenêtre de recherche à 24h avant le timestamp actuel
    // ═══════════════════════════════════════════════════════════════════════════════
    const startOfSearchWindow = new Date(timestamp);
    startOfSearchWindow.setHours(startOfSearchWindow.getHours() - 24); // 24h avant
    const endOfDay = new Date(timestamp);
    endOfDay.setHours(23, 59, 59, 999);

    // Récupérer les pointages des dernières 24h + jour actuel (pour shifts de nuit)
    // FIX 18/01/2026: Exclure les DEBOUNCE_BLOCKED du calcul des métriques
    const todayRecords = await this.prisma.attendance.findMany({
      where: {
        tenantId,
        employeeId,
        timestamp: { gte: startOfSearchWindow, lte: endOfDay },
        OR: [
          { anomalyType: null },
          { anomalyType: { not: 'DEBOUNCE_BLOCKED' } },
        ],
      },
      orderBy: { timestamp: 'asc' },
    });

    console.log(`[calculateMetrics] Fenêtre de recherche: ${startOfSearchWindow.toISOString()} → ${endOfDay.toISOString()}, ${todayRecords.length} records trouvés`);

    const metrics: {
      hoursWorked?: number;
      lateMinutes?: number;
      earlyLeaveMinutes?: number;
      overtimeMinutes?: number;
    } = {};

    // Vérifier si l'employé est en congé approuvé pour cette date
    // Si oui, on ne calcule PAS de retard/départ anticipé (car il ne devrait pas travailler)
    const leave = await this.prisma.leave.findFirst({
      where: {
        tenantId,
        employeeId,
        startDate: { lte: timestamp },
        endDate: { gte: timestamp },
        status: { in: ['APPROVED', 'MANAGER_APPROVED', 'HR_APPROVED'] },
      },
    });

    const isOnApprovedLeave = !!leave;

    // Calculer les heures travaillées si c'est une sortie
    if (type === AttendanceType.OUT) {
      // IMPORTANT: Trouver le IN correspondant (pas forcément le premier!)
      // Utiliser le même algorithme que dans calculateMetrics avancé
      const sortedRecords = [...todayRecords].sort((a, b) =>
        a.timestamp.getTime() - b.timestamp.getTime()
      );

      let inRecord: typeof todayRecords[0] | undefined;
      let outCount = 0;

      for (let i = sortedRecords.length - 1; i >= 0; i--) {
        const record = sortedRecords[i];

        if (record.timestamp.getTime() > timestamp.getTime()) continue;
        if (record.type === AttendanceType.BREAK_START || record.type === AttendanceType.BREAK_END) continue;

        if (record.type === AttendanceType.OUT) {
          outCount++;
        }

        if (record.type === AttendanceType.IN) {
          if (outCount === 0) {
            inRecord = record;
            break;
          } else {
            outCount--;
          }
        }
      }

      if (inRecord) {
        // Calculer les heures brutes
        let hoursWorked = (timestamp.getTime() - inRecord.timestamp.getTime()) / (1000 * 60 * 60);

        // Déduire la pause du shift si applicable
        // IMPORTANT: Utiliser le timestamp du IN pour trouver le bon shift!
        const schedule = await this.getScheduleWithFallback(tenantId, employeeId, inRecord.timestamp);
        if (schedule?.shift?.breakDuration) {
          const breakHours = schedule.shift.breakDuration / 60;
          hoursWorked = Math.max(0, hoursWorked - breakHours);
        }

        metrics.hoursWorked = Math.max(0, hoursWorked);
      }
    }

    // Calculer les retards si c'est une entrée (SAUF si l'employé est en congé approuvé)
    if (type === AttendanceType.IN && !isOnApprovedLeave) {
      // Utiliser la fonction helper avec fallback vers currentShiftId
      const schedule = await this.getScheduleWithFallback(tenantId, employeeId, timestamp);

      if (schedule?.shift) {
        // Calculer l'heure d'entrée prévue
        const expectedStartTime = this.parseTimeString(
          schedule.customStartTime || schedule.shift.startTime,
        );

        // Récupérer le timezone du tenant
        const tenant = await this.prisma.tenant.findUnique({
          where: { id: tenantId },
          select: { timezone: true },
        });
        const timezoneOffset = this.getTimezoneOffset(tenant?.timezone || 'UTC');

        // Construire l'heure de début attendue en tenant compte du timezone
        const expectedStart = new Date(Date.UTC(
          timestamp.getUTCFullYear(),
          timestamp.getUTCMonth(),
          timestamp.getUTCDate(),
          expectedStartTime.hours - timezoneOffset,
          expectedStartTime.minutes,
          0,
          0
        ));

        // Récupérer la tolérance depuis les settings
        const settings = await this.prisma.tenantSettings.findUnique({
          where: { tenantId },
          select: { lateToleranceEntry: true },
        });

        const toleranceMinutes = settings?.lateToleranceEntry || 10;

        // Calculer le retard
        const lateMinutes = Math.max(
          0,
          (timestamp.getTime() - expectedStart.getTime()) / (1000 * 60) - toleranceMinutes,
        );

        if (lateMinutes > 0) {
          metrics.lateMinutes = Math.round(lateMinutes);
        }
      }
    }

    // Calculer le départ anticipé si c'est une sortie (SAUF si l'employé est en congé approuvé)
    if (type === AttendanceType.OUT && !isOnApprovedLeave) {
      // IMPORTANT: Trouver d'abord le IN correspondant pour utiliser le bon shift
      const sortedRecordsForEarly = [...todayRecords].sort((a, b) =>
        a.timestamp.getTime() - b.timestamp.getTime()
      );

      let inRecordForEarly: typeof todayRecords[0] | undefined;
      let outCountForEarly = 0;

      for (let i = sortedRecordsForEarly.length - 1; i >= 0; i--) {
        const record = sortedRecordsForEarly[i];
        if (record.timestamp.getTime() > timestamp.getTime()) continue;
        if (record.type === AttendanceType.BREAK_START || record.type === AttendanceType.BREAK_END) continue;

        if (record.type === AttendanceType.OUT) {
          outCountForEarly++;
        }

        if (record.type === AttendanceType.IN) {
          if (outCountForEarly === 0) {
            inRecordForEarly = record;
            break;
          } else {
            outCountForEarly--;
          }
        }
      }

      // Utiliser le timestamp du IN correspondant pour trouver le bon shift!
      const schedule = inRecordForEarly
        ? await this.getScheduleWithFallback(tenantId, employeeId, inRecordForEarly.timestamp)
        : await this.getScheduleWithFallback(tenantId, employeeId, timestamp);

      if (schedule?.shift) {
        const expectedEndTime = this.parseTimeString(
          schedule.customEndTime || schedule.shift.endTime,
        );

        // Récupérer le timezone du tenant
        const tenant = await this.prisma.tenant.findUnique({
          where: { id: tenantId },
          select: { timezone: true },
        });
        const timezoneOffset = this.getTimezoneOffset(tenant?.timezone || 'UTC');

        // Construire l'heure de fin attendue en tenant compte du timezone
        const expectedEnd = new Date(Date.UTC(
          timestamp.getUTCFullYear(),
          timestamp.getUTCMonth(),
          timestamp.getUTCDate(),
          expectedEndTime.hours - timezoneOffset,
          expectedEndTime.minutes,
          0,
          0
        ));

        // GESTION SHIFT DE NUIT : Si c'est un shift de nuit et que expectedEnd est dans le futur,
        // c'est que la fin devrait être la veille
        const isNight = this.isNightShift(schedule.shift, expectedEndTime);
        if (isNight && expectedEnd.getTime() > timestamp.getTime()) {
          const hoursDiff = (expectedEnd.getTime() - timestamp.getTime()) / (1000 * 60 * 60);
          // Si la différence est > 12h, c'est probablement qu'on doit regarder la veille
          if (hoursDiff > 12) {
            expectedEnd.setUTCDate(expectedEnd.getUTCDate() - 1);
          }
        }

        const settings = await this.prisma.tenantSettings.findUnique({
          where: { tenantId },
          select: { earlyToleranceExit: true },
        });

        const toleranceMinutes = settings?.earlyToleranceExit || 5;

        const earlyLeaveMinutes = Math.max(
          0,
          (expectedEnd.getTime() - timestamp.getTime()) / (1000 * 60) - toleranceMinutes,
        );

        // DEBUG: Logger les calculs de départ anticipé
        console.log(`[calculateMetrics] Départ anticipé:
          - timestamp: ${timestamp.toISOString()}
          - expectedEnd: ${expectedEnd.toISOString()}
          - isNight: ${isNight}
          - diff minutes: ${(expectedEnd.getTime() - timestamp.getTime()) / (1000 * 60)}
          - tolerance: ${toleranceMinutes}
          - earlyLeaveMinutes: ${earlyLeaveMinutes}
        `);

        if (earlyLeaveMinutes > 0) {
          metrics.earlyLeaveMinutes = Math.round(earlyLeaveMinutes);
        }
      }
    }

    // Calculer les heures supplémentaires si c'est une sortie
    if (type === AttendanceType.OUT) {
      console.log(`\n🔍 ===== DEBUG CALCUL HEURES POUR OUT =====`);
      console.log(`📍 OUT timestamp: ${timestamp.toISOString()}`);
      console.log(`📋 todayRecords (${todayRecords.length} records):`);
      todayRecords.forEach((r, i) => {
        console.log(`  ${i}: ${r.type} à ${r.timestamp.toISOString()}`);
      });

      // IMPORTANT: Trouver le IN correspondant à ce OUT spécifique
      // Règle métier: Un OUT ferme UNE session (la dernière session ouverte)
      // Si un employé a plusieurs shifts le même jour, il y aura plusieurs paires IN/OUT

      // Trier les pointages par timestamp (plus anciens d'abord)
      const sortedRecords = [...todayRecords].sort((a, b) =>
        a.timestamp.getTime() - b.timestamp.getTime()
      );

      console.log(`🔍 Recherche du IN correspondant:`);
      // Trouver le IN qui correspond à ce OUT
      // Parcourir en arrière depuis le OUT actuel
      let inRecord: typeof todayRecords[0] | undefined;
      let outCount = 0;

      for (let i = sortedRecords.length - 1; i >= 0; i--) {
        const record = sortedRecords[i];

        console.log(`  i=${i}: ${record.type} à ${record.timestamp.toISOString()}, outCount=${outCount}`);

        // Arrêter si on dépasse l'heure du OUT actuel
        if (record.timestamp.getTime() > timestamp.getTime()) {
          console.log(`    ⏩ Skip (après OUT)`);
          continue;
        }

        // Ignorer les BREAK (BREAK ≠ OUT)
        if (record.type === AttendanceType.BREAK_START || record.type === AttendanceType.BREAK_END) {
          console.log(`    ⏩ Skip (BREAK)`);
          continue;
        }

        // Si on trouve un OUT, augmenter le compteur
        if (record.type === AttendanceType.OUT) {
          outCount++;
          console.log(`    📤 OUT → outCount = ${outCount}`);
        }

        // Si on trouve un IN
        if (record.type === AttendanceType.IN) {
          if (outCount === 0) {
            // C'est le IN qu'on cherche!
            inRecord = record;
            console.log(`    ✅ IN TROUVÉ!`);
            break;
          } else {
            // Ce IN correspond à un autre OUT, décrémenter
            outCount--;
            console.log(`    ⏩ IN autre session → outCount = ${outCount}`);
          }
        }
      }

      if (inRecord) {
        console.log(`\n✅ IN correspondant: ${inRecord.timestamp.toISOString()}`);
        const durationMin = (timestamp.getTime() - inRecord.timestamp.getTime()) / (1000 * 60);
        console.log(`⏱️  Durée brute: ${durationMin.toFixed(2)} min = ${(durationMin / 60).toFixed(2)} h`);
      } else {
        console.log(`\n❌ AUCUN IN trouvé!`);
      }

      if (inRecord) {
        // Récupérer la configuration du tenant (CRITIQUE pour le calcul de la pause et majoration jours fériés)
        const settings = await this.prisma.tenantSettings.findUnique({
          where: { tenantId },
          select: {
            requireBreakPunch: true,
            breakDuration: true,
            overtimeRounding: true,
            holidayOvertimeEnabled: true,
            holidayOvertimeRate: true,
            holidayOvertimeAsNormalHours: true,
          },
        });

        // Utiliser la fonction helper avec fallback vers currentShiftId
        // IMPORTANT: Pour un OUT, utiliser le timestamp du IN correspondant pour trouver le bon shift
        const schedule = await this.getScheduleWithFallback(tenantId, employeeId, inRecord.timestamp);

        if (schedule?.shift) {
          // 1. Calculer les heures travaillées brutes
          const workedMinutesRaw = (timestamp.getTime() - inRecord.timestamp.getTime()) / (1000 * 60);

          // 2. Calculer la pause réelle selon la configuration
          let actualBreakMinutes = 0;

          if (settings?.requireBreakPunch === true) {
            // CAS 1 : Pointage repos ACTIVÉ → Utiliser les pointages BREAK_START/BREAK_END réels
            const breakEvents = todayRecords.filter(
              r => r.type === AttendanceType.BREAK_START || r.type === AttendanceType.BREAK_END,
            );

            // Trier par timestamp
            breakEvents.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

            // Parcourir les paires BREAK_START/BREAK_END
            for (let i = 0; i < breakEvents.length; i += 2) {
              if (
                breakEvents[i].type === AttendanceType.BREAK_START &&
                breakEvents[i + 1]?.type === AttendanceType.BREAK_END
              ) {
                const breakDuration =
                  (breakEvents[i + 1].timestamp.getTime() - breakEvents[i].timestamp.getTime()) /
                  (1000 * 60);
                actualBreakMinutes += breakDuration;
              }
              // Si BREAK_START sans BREAK_END, on ignore (pause non terminée)
            }
          } else {
            // CAS 2 : Pointage repos DÉSACTIVÉ → Utiliser la durée configurée dans TenantSettings
            actualBreakMinutes = settings?.breakDuration || 60; // Défaut: 60 minutes
          }

          // 3. Déduire la pause réelle des heures travaillées brutes
          const workedMinutes = workedMinutesRaw - actualBreakMinutes;

          // 4. Calculer les heures prévues du shift
          const expectedStartTime = this.parseTimeString(
            schedule.customStartTime || schedule.shift.startTime,
          );
          const expectedEndTime = this.parseTimeString(
            schedule.customEndTime || schedule.shift.endTime,
          );

          // Convertir en minutes depuis minuit
          const startMinutes = expectedStartTime.hours * 60 + expectedStartTime.minutes;
          const endMinutes = expectedEndTime.hours * 60 + expectedEndTime.minutes;

          let plannedMinutes = endMinutes - startMinutes;
          // Gérer le cas d'un shift de nuit (ex: 22h-6h)
          if (plannedMinutes < 0) {
            plannedMinutes += 24 * 60; // Ajouter 24 heures
          }

          // 5. Déduire la pause prévue des heures prévues
          // Utiliser TenantSettings.breakDuration en priorité (fallback sur shift.breakDuration)
          const plannedBreakMinutes = settings?.breakDuration || schedule.shift.breakDuration || 60;
          plannedMinutes -= plannedBreakMinutes;

          // 6. Calculer les heures supplémentaires (seulement si l'employé est éligible)
          if (isEligibleForOvertime) {
            // Vérifier si c'est un jour férié
            // IMPORTANT: Utiliser UTC pour éviter les problèmes de timezone
            const dateOnly = new Date(Date.UTC(
              timestamp.getFullYear(),
              timestamp.getMonth(),
              timestamp.getDate(),
              0, 0, 0, 0
            ));
            const dateOnlyEnd = new Date(Date.UTC(
              timestamp.getFullYear(),
              timestamp.getMonth(),
              timestamp.getDate(),
              23, 59, 59, 999
            ));

            const holiday = await this.prisma.holiday.findFirst({
              where: {
                tenantId,
                date: {
                  gte: dateOnly,
                  lte: dateOnlyEnd,
                },
              },
            });

            // Calculer les heures travaillées avant et après minuit (pour shifts de nuit)
            // IMPORTANT: Utiliser UTC pour éviter les problèmes de timezone
            const midnight = new Date(Date.UTC(
              timestamp.getFullYear(),
              timestamp.getMonth(),
              timestamp.getDate(),
              0, 0, 0, 0
            ));
            const inDate = new Date(Date.UTC(
              inRecord.timestamp.getFullYear(),
              inRecord.timestamp.getMonth(),
              inRecord.timestamp.getDate(),
              0, 0, 0, 0
            ));

            let normalHoursMinutes = workedMinutes;
            let holidayHoursMinutes = 0;

            // Si le shift traverse minuit et que le jour de sortie est un jour férié
            if (holiday && inDate.getTime() < dateOnly.getTime()) {
              // Shift de nuit traversant un jour férié
              const midnightTime = midnight.getTime();
              const inTime = inRecord.timestamp.getTime();
              const outTime = timestamp.getTime();

              // Heures avant minuit (jour normal)
              const beforeMidnightMinutes = Math.max(0, (midnightTime - inTime) / (1000 * 60));
              // Heures après minuit (jour férié)
              const afterMidnightMinutes = Math.max(0, (outTime - midnightTime) / (1000 * 60));

              // Déduire la pause proportionnellement
              const totalMinutes = beforeMidnightMinutes + afterMidnightMinutes;
              const breakBeforeMidnight = actualBreakMinutes * (beforeMidnightMinutes / totalMinutes);
              const breakAfterMidnight = actualBreakMinutes * (afterMidnightMinutes / totalMinutes);

              normalHoursMinutes = beforeMidnightMinutes - breakBeforeMidnight;
              holidayHoursMinutes = afterMidnightMinutes - breakAfterMidnight;
            } else if (holiday && inDate.getTime() === dateOnly.getTime()) {
              // Pointage normal un jour férié (pas de shift de nuit)
              // Toutes les heures sont travaillées le jour férié
              holidayHoursMinutes = workedMinutes;
              normalHoursMinutes = 0;
            }

            // Calculer les heures supplémentaires normales
            let overtimeMinutes = normalHoursMinutes - plannedMinutes;
            if (overtimeMinutes < 0) {
              overtimeMinutes = 0;
            }

            // Calculer les heures supplémentaires avec majoration jour férié
            let holidayOvertimeMinutes = 0;
            if (holiday && settings?.holidayOvertimeEnabled !== false) {
              if (settings?.holidayOvertimeAsNormalHours === true) {
                // Traiter comme heures normales sans majoration
                holidayOvertimeMinutes = holidayHoursMinutes;
              } else {
                // Appliquer la majoration
                const holidayRate = settings?.holidayOvertimeRate
                  ? Number(settings.holidayOvertimeRate)
                  : 2.0; // Défaut: double
                holidayOvertimeMinutes = holidayHoursMinutes * holidayRate;
              }
            } else if (holiday && settings?.holidayOvertimeEnabled === false) {
              // Majoration désactivée : traiter comme heures normales
              holidayOvertimeMinutes = holidayHoursMinutes;
            }

            // Total des heures supplémentaires
            const totalOvertimeMinutes = overtimeMinutes + holidayOvertimeMinutes;

            // DEBUG: Logger les calculs d'heures supplémentaires
            console.log(`[calculateMetrics] Heures supplémentaires:
              - workedMinutes: ${workedMinutes}
              - plannedMinutes: ${plannedMinutes}
              - normalHoursMinutes: ${normalHoursMinutes}
              - overtimeMinutes (avant arrondi): ${overtimeMinutes}
              - holidayOvertimeMinutes: ${holidayOvertimeMinutes}
              - totalOvertimeMinutes: ${totalOvertimeMinutes}
            `);

            if (totalOvertimeMinutes > 0) {
              const roundingMinutes = settings?.overtimeRounding || 15;
              const overtimeHours = totalOvertimeMinutes / 60;
              const roundedHours = this.roundOvertimeHours(overtimeHours, roundingMinutes);

              // Convertir en minutes pour le stockage
              metrics.overtimeMinutes = Math.round(roundedHours * 60);

              console.log(`[calculateMetrics] Après arrondi:
                - roundingMinutes: ${roundingMinutes}
                - overtimeHours: ${overtimeHours}
                - roundedHours: ${roundedHours}
                - metrics.overtimeMinutes: ${metrics.overtimeMinutes}
              `);
            }
          } else {
            // Employé non éligible : pas de calcul d'heures sup
            metrics.overtimeMinutes = 0;
          }
        }
      }
    }

    return metrics;
  }

  /**
   * Récupère le schedule pour une date donnée, avec fallback vers currentShiftId si aucun schedule n'existe
   * @returns Schedule avec shift inclus, ou null si aucun schedule et pas de currentShiftId
   */
  private async getScheduleWithFallback(
    tenantId: string,
    employeeId: string,
    date: Date,
  ): Promise<{
    id: string;
    date: Date;
    shiftId: string;
    shift: { id: string; startTime: string; endTime: string; breakDuration?: number; breakStartTime?: string | null };
    customStartTime: string | null;
    customEndTime: string | null;
    status: string;
    tenantId: string;
    employeeId: string;
    createdAt: Date;
    updatedAt: Date;
  } | null> {
    // IMPORTANT: Utiliser Date.UTC pour éviter les problèmes de timezone
    const dateOnly = new Date(Date.UTC(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      0, 0, 0, 0
    ));

    console.log(`[getScheduleWithFallback] Recherche de planning pour la date exacte: ${dateOnly.toISOString()}`);

    // 1. Chercher TOUS les schedules existants pour cette date (PUBLISHED uniquement)
    // IMPORTANT: Un employé peut avoir plusieurs shifts le même jour!
    const schedules = await this.prisma.schedule.findMany({
      where: {
        tenantId,
        employeeId,
        date: dateOnly, // Comparaison exacte de la date
        status: 'PUBLISHED', // Ignorer les plannings suspendus
      },
      include: {
        shift: {
          select: {
            id: true,
            name: true,
            startTime: true,
            endTime: true,
            breakDuration: true,
            breakStartTime: true,
            isNightShift: true,
          },
        },
      },
      orderBy: {
        shift: {
          startTime: 'asc', // Trier par heure de début
        },
      },
    });

    // 2. Si des schedules existent, trouver le plus proche de l'heure du pointage
    if (schedules.length > 0) {
      if (schedules.length === 1) {
        console.log(`[getScheduleWithFallback] ✅ Un seul planning physique trouvé: ${schedules[0].shift.startTime} - ${schedules[0].shift.endTime}`);
        return schedules[0] as any;
      }

      // Multiple shifts le même jour - trouver le plus proche
      console.log(`[getScheduleWithFallback] ⚠️ ${schedules.length} plannings trouvés pour cette date - sélection du plus proche de l'heure du pointage`);

      const attendanceHour = date.getUTCHours();
      const attendanceMinutes = date.getUTCMinutes();
      const attendanceTimeInMinutes = attendanceHour * 60 + attendanceMinutes;

      let closestSchedule = schedules[0];
      let smallestDifference = Infinity;

      // Récupérer le timezone du tenant pour calculer correctement
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { timezone: true },
      });
      const timezoneOffset = this.getTimezoneOffset(tenant?.timezone || 'UTC');

      for (const schedule of schedules) {
        const startTime = this.parseTimeString(
          schedule.customStartTime || schedule.shift.startTime,
        );

        // Convertir l'heure de début du shift en minutes UTC
        const shiftStartInMinutesLocal = startTime.hours * 60 + startTime.minutes;
        const shiftStartInMinutesUTC = shiftStartInMinutesLocal - (timezoneOffset * 60);

        // Calculer la différence absolue
        const difference = Math.abs(attendanceTimeInMinutes - shiftStartInMinutesUTC);

        console.log(`  - Shift ${schedule.shift.startTime}: différence = ${difference} minutes`);

        if (difference < smallestDifference) {
          smallestDifference = difference;
          closestSchedule = schedule;
        }
      }

      console.log(`[getScheduleWithFallback] ✅ Planning le plus proche sélectionné: ${closestSchedule.shift.startTime} - ${closestSchedule.shift.endTime} (différence: ${smallestDifference} min)`);
      return closestSchedule as any;
    }

    console.log(`[getScheduleWithFallback] ❌ Aucun planning physique trouvé pour cette date`);

    // 2.1. GESTION SHIFT DE NUIT : Si pas de planning trouvé et qu'on est tôt le matin (avant 14h),
    // chercher un planning de la veille qui pourrait être un shift de nuit
    const currentHour = date.getHours();
    if (currentHour < 14) {
      console.log(`[getScheduleWithFallback] Heure < 14h (${currentHour}h) → Recherche d'un shift de nuit de la veille`);

      const previousDayDate = new Date(Date.UTC(
        date.getFullYear(),
        date.getMonth(),
        date.getDate() - 1,
        0, 0, 0, 0
      ));

      const previousDaySchedule = await this.prisma.schedule.findFirst({
        where: {
          tenantId,
          employeeId,
          date: previousDayDate,
          status: 'PUBLISHED',
        },
        include: {
          shift: {
            select: {
              id: true,
              name: true,
              startTime: true,
              endTime: true,
              breakDuration: true,
              breakStartTime: true,
              isNightShift: true,
            },
          },
        },
      });

      if (previousDaySchedule?.shift) {
        const expectedEndTime = this.parseTimeString(
          previousDaySchedule.customEndTime || previousDaySchedule.shift.endTime,
        );

        // Vérifier si c'est un shift de nuit (qui se termine tôt le matin)
        const isNight = this.isNightShift(previousDaySchedule.shift, expectedEndTime);

        if (isNight) {
          console.log(`[getScheduleWithFallback] ✅ Shift de nuit trouvé de la veille: ${previousDaySchedule.shift.startTime} - ${previousDaySchedule.shift.endTime}`);
          return previousDaySchedule as any;
        } else {
          console.log(`[getScheduleWithFallback] Planning de la veille trouvé mais ce n'est pas un shift de nuit`);
        }
      } else {
        console.log(`[getScheduleWithFallback] Aucun planning trouvé pour la veille`);
      }
    }

    // 3. FALLBACK : Si pas de schedule, utiliser currentShiftId
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        currentShiftId: true,
        currentShift: {
          select: {
            id: true,
            name: true,
            startTime: true,
            endTime: true,
            breakDuration: true,
            breakStartTime: true,
            isNightShift: true,
          },
        },
      },
    });

    // 4. Si l'employé a un currentShift, créer un schedule virtuel
    if (employee?.currentShift) {
      console.log(`[getScheduleWithFallback] ✅ Shift par défaut trouvé (virtuel): ${employee.currentShift.startTime} - ${employee.currentShift.endTime}`);
      return {
        id: 'virtual',
        date: date,
        shiftId: employee.currentShift.id,
        shift: employee.currentShift,
        customStartTime: null,
        customEndTime: null,
        status: 'PUBLISHED',
        tenantId,
        employeeId,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any;
    }

    // 5. Aucun schedule et pas de currentShift
    console.log(`[getScheduleWithFallback] ❌ Aucun planning ni shift par défaut`);
    return null;
  }

  /**
   * Valide qu'un planning ou shift par défaut existe pour la date donnée
   * @throws BadRequestException si aucun planning ni shift n'existe et que c'est un jour ouvrable sans congé
   */
  private async validateScheduleOrShift(
    tenantId: string,
    employeeId: string,
    timestamp: Date,
    attendanceType?: AttendanceType,
  ): Promise<void> {
    console.log(`[validateScheduleOrShift] Validation pour ${timestamp.toISOString()}, type: ${attendanceType}`);

    // 1. Vérifier si un planning existe pour cette date
    // IMPORTANT: Utiliser Date.UTC pour éviter les problèmes de timezone
    const dateOnly = new Date(Date.UTC(
      timestamp.getFullYear(),
      timestamp.getMonth(),
      timestamp.getDate(),
      0, 0, 0, 0
    ));

    console.log(`[validateScheduleOrShift] Recherche de planning pour la date exacte: ${dateOnly.toISOString()}`);

    const schedule = await this.prisma.schedule.findFirst({
      where: {
        tenantId,
        employeeId,
        date: dateOnly, // Comparaison exacte de la date (sans intervalle)
        status: 'PUBLISHED', // Seulement les plannings publiés
      },
    });

    console.log(`[validateScheduleOrShift] Planning trouvé pour ce jour: ${schedule ? 'OUI' : 'NON'}`);

    // Si un planning existe, la validation passe
    if (schedule) {
      console.log(`[validateScheduleOrShift] ✅ Planning existe → validation OK`);
      return;
    }

    // 1.1. CAS SPÉCIAL : Shift de nuit - Si c'est un OUT et qu'il n'y a pas de planning pour ce jour,
    // vérifier s'il y a un IN la veille (shift de nuit qui traverse minuit)
    if (attendanceType === AttendanceType.OUT) {
      console.log(`[validateScheduleOrShift] Vérification shift de nuit pour OUT...`);

      // Calculer la date de la veille avec UTC
      const previousDayDate = new Date(Date.UTC(
        timestamp.getFullYear(),
        timestamp.getMonth(),
        timestamp.getDate() - 1,
        0, 0, 0, 0
      ));

      console.log(`[validateScheduleOrShift] Recherche planning de la veille: ${previousDayDate.toISOString()}`);

      // Vérifier s'il y a un planning pour la veille
      const previousDaySchedule = await this.prisma.schedule.findFirst({
        where: {
          tenantId,
          employeeId,
          date: previousDayDate, // Comparaison exacte de la date
          status: 'PUBLISHED',
        },
        include: {
          shift: true,
        },
      });

      if (previousDaySchedule) {
        console.log(`[validateScheduleOrShift] Planning de la veille trouvé: ${previousDaySchedule.shift.startTime} - ${previousDaySchedule.shift.endTime}`);

        // Vérifier si c'est un shift de nuit
        const expectedEndTime = this.parseTimeString(
          previousDaySchedule.customEndTime || previousDaySchedule.shift.endTime,
        );
        const isNightShift = this.isNightShift(previousDaySchedule.shift, expectedEndTime);

        console.log(`[validateScheduleOrShift] Est un shift de nuit: ${isNightShift}`);

        if (isNightShift) {
          console.log(`[validateScheduleOrShift] ✅ Shift de nuit détecté pour la veille → OUT du lendemain autorisé`);
          console.log(`[validateScheduleOrShift] Note: Pas besoin de vérifier l'IN - le système de détection d'anomalies gérera MISSING_IN si nécessaire`);
          // C'est un shift de nuit qui traverse minuit, autoriser le OUT
          // Même si l'employé a oublié de pointer l'IN, on autorise le OUT
          // Le système de détection d'anomalies créera MISSING_IN si nécessaire
          return;
        }
      } else {
        console.log(`[validateScheduleOrShift] Aucun planning trouvé pour la veille`);
      }
    }

    // 2. Vérifier si l'employé a un shift par défaut
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        currentShiftId: true,
        firstName: true,
        lastName: true,
        matricule: true,
      },
    });

    // 3. Vérifier le paramètre de configuration
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
      select: {
        workingDays: true,
        requireScheduleForAttendance: true,
      },
    });

    // 4. PRIORITÉ MAXIMALE : Vérifier si c'est un jour férié
    // Les jours fériés nécessitent TOUJOURS un planning explicite, même si l'employé a un currentShiftId
    const timestampDate = new Date(timestamp);
    const holidayDateOnly = new Date(Date.UTC(
      timestampDate.getFullYear(),
      timestampDate.getMonth(),
      timestampDate.getDate(),
      0, 0, 0, 0
    ));

    const holiday = await this.prisma.holiday.findFirst({
      where: {
        tenantId,
        date: holidayDateOnly,
      },
    });

    // Si c'est un jour férié et que requireScheduleForAttendance est activé, vérifier le planning
    if (holiday && settings?.requireScheduleForAttendance !== false) {
      // Vérifier s'il y a un congé ou récupération approuvé pour ce jour férié
      const leave = await this.prisma.leave.findFirst({
        where: {
          tenantId,
          employeeId,
          startDate: { lte: timestamp },
          endDate: { gte: timestamp },
          status: { in: ['APPROVED', 'MANAGER_APPROVED', 'HR_APPROVED'] },
        },
      });

      const recoveryDay = await this.prisma.recoveryDay.findFirst({
        where: {
          tenantId,
          employeeId,
          startDate: { lte: timestamp },
          endDate: { gte: timestamp },
          status: { in: ['APPROVED', 'PENDING'] },
        },
      });

      if (!leave && !recoveryDay) {
        const employeeName = employee
          ? `${employee.firstName} ${employee.lastName} (${employee.matricule})`
          : `ID: ${employeeId}`;

        const dayNames = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
        const dayName = dayNames[timestamp.getDay()];

        throw new BadRequestException(
          `Impossible de créer un pointage pour ${employeeName} le ${timestamp.toLocaleDateString('fr-FR')} (${dayName} - jour férié: ${holiday.name}) : ` +
          `aucun planning publié pour ce jour férié. ` +
          `Veuillez créer un planning pour autoriser le travail le jour férié "${holiday.name}".`
        );
      }
    }

    // 5. VÉRIFIER D'ABORD SI C'EST UN WEEKEND (AVANT currentShiftId)
    // Les weekends nécessitent TOUJOURS un planning explicite, même si l'employé a un currentShiftId
    const dayOfWeek = timestamp.getDay(); // 0 = Dimanche, 1 = Lundi, etc.
    const workingDays = (settings?.workingDays as number[]) || [1, 2, 3, 4, 5, 6];
    const normalizedDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;
    const isWorkingDay = workingDays.includes(normalizedDayOfWeek);

    // Si c'est un weekend (jour non ouvrable) ET qu'il n'y a ni planning,
    // TOUJOURS rejeter le pointage, même si l'employé a un currentShiftId
    if (!isWorkingDay) {
      // Vérifier s'il y a un congé ou récupération approuvé pour le weekend
      const leave = await this.prisma.leave.findFirst({
        where: {
          tenantId,
          employeeId,
          startDate: { lte: timestamp },
          endDate: { gte: timestamp },
          status: { in: ['APPROVED', 'MANAGER_APPROVED', 'HR_APPROVED'] },
        },
      });

      const recoveryDay = await this.prisma.recoveryDay.findFirst({
        where: {
          tenantId,
          employeeId,
          startDate: { lte: timestamp },
          endDate: { gte: timestamp },
          status: { in: ['APPROVED', 'PENDING'] },
        },
      });

      if (!leave && !recoveryDay) {
        const employeeName = employee
          ? `${employee.firstName} ${employee.lastName} (${employee.matricule})`
          : `ID: ${employeeId}`;

        const dayNames = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
        const dayName = dayNames[dayOfWeek];

        throw new BadRequestException(
          `Impossible de créer un pointage pour ${employeeName} le ${timestamp.toLocaleDateString('fr-FR')} (${dayName} - weekend) : ` +
          `jour non ouvrable sans planning publié. ` +
          `Veuillez créer un planning pour autoriser le travail en weekend.`
        );
      }
    }

    // 6. Si un shift par défaut existe (et que c'est un jour ouvrable), la validation passe
    if (employee?.currentShiftId) {
      return;
    }

    // 7. Si la validation est désactivée, permettre le pointage (mais l'anomalie sera détectée)
    if (settings?.requireScheduleForAttendance === false) {
      return;
    }

    // 8. Pour jour ouvrable sans planning ni shift:
    // - Laisser passer (pas de blocage strict)
    // - La détection d'anomalies créera ABSENCE ou LEAVE_CONFLICT selon le cas
    if (isWorkingDay) {
      // Jour ouvrable sans planning → Laisser passer, anomalie sera détectée
      console.log(`[validateScheduleOrShift] Jour ouvrable sans planning → Autoriser (anomalie sera détectée)`);
      return;
    }

    // 9. Vérifier s'il y a une récupération approuvée pour cette date
    const recoveryDay = await this.prisma.recoveryDay.findFirst({
      where: {
        tenantId,
        employeeId,
        startDate: { lte: timestamp },
        endDate: { gte: timestamp },
        status: { in: ['APPROVED', 'PENDING'] },
      },
    });

    // Si une récupération est approuvée, autoriser le pointage
    if (recoveryDay) {
      return;
    }

    // 8. Aucune exception trouvée : refuser le pointage
    const employeeName = employee 
      ? `${employee.firstName} ${employee.lastName} (${employee.matricule})`
      : `ID: ${employeeId}`;
    
    throw new BadRequestException(
      `Impossible de créer un pointage pour ${employeeName} le ${timestamp.toLocaleDateString('fr-FR')} : ` +
      `aucun planning publié, aucun shift par défaut assigné, et aucun congé/récupération approuvé pour cette date. ` +
      `Veuillez créer un planning ou assigner un shift par défaut à l'employé.`
    );
  }

  /**
   * Parse une chaîne de temps (HH:mm) en objet {hours, minutes}
   */
  private parseTimeString(timeString: string): { hours: number; minutes: number } {
    const [hours, minutes] = timeString.split(':').map(Number);
    return { hours: hours || 0, minutes: minutes || 0 };
  }

  /**
   * Détection améliorée de DOUBLE_IN avec toutes les améliorations
   * Implémente:
   * - 1.1 Fenêtre Temporelle Intelligente
   * - 1.2 Gestion des Shifts Multiples
   * - 1.3 Détection de Patterns Suspects (analytics)
   * - 1.4 Suggestion Automatique de Correction
   * - 1.5 Gestion des Erreurs de Badgeage
   */
  private async detectDoubleInImproved(
    tenantId: string,
    employeeId: string,
    timestamp: Date,
    todayRecords: any[],
  ): Promise<{ hasAnomaly: boolean; type?: string | null; note?: string | null; suggestedCorrection?: any; isInformativeDoublePunch?: boolean; informativeNote?: string }> {
    // Récupérer les paramètres configurables
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
      select: {
        doubleInDetectionWindow: true,
        orphanInThreshold: true,
        doublePunchToleranceMinutes: true,
        enableDoubleInPatternDetection: true,
        doubleInPatternAlertThreshold: true,
      },
    });

    const detectionWindowHours = settings?.doubleInDetectionWindow || 24;
    const orphanThresholdHours = settings?.orphanInThreshold || 12;
    const toleranceMinutes = settings?.doublePunchToleranceMinutes || 2;
    const enablePatternDetection = settings?.enableDoubleInPatternDetection !== false;
    const patternAlertThreshold = settings?.doubleInPatternAlertThreshold || 3;

    // Récupérer les IN du jour
    const todayInRecords = todayRecords.filter(r => r.type === AttendanceType.IN);

    // 1.5 Gestion des Erreurs de Badgeage Rapide - Ne pas créer d'anomalie bloquante
    // Le double badgeage rapide est INFORMATIF seulement (pas de correction manager requise)
    if (todayInRecords.length > 0) {
      const lastIn = todayInRecords[todayInRecords.length - 1];
      const timeDiff = (timestamp.getTime() - lastIn.timestamp.getTime()) / (1000 * 60); // en minutes

      if (timeDiff <= toleranceMinutes) {
        // Erreur de badgeage rapide - INFORMATIF, pas une anomalie bloquante
        // Le pointage est créé normalement sans flag d'anomalie
        // hasAnomaly: false = pas d'anomalie, ne nécessite pas correction du manager
        return {
          hasAnomaly: false, // MODIFIÉ: informatif seulement
          type: null,
          note: null,
          isInformativeDoublePunch: true, // Flag pour logging informatif
          informativeNote: `Double badgeage rapide détecté (${Math.round(timeDiff)} min d'intervalle). Pointage accepté automatiquement.`,
        };
      }
    }

    // 1.1 Fenêtre Temporelle Intelligente - Vérifier les IN orphelins
    const detectionWindowStart = new Date(timestamp.getTime() - detectionWindowHours * 60 * 60 * 1000);

    // Récupérer tous les IN dans la fenêtre de détection
    // FIX 18/01/2026: Exclure les DEBOUNCE_BLOCKED - ils ne comptent pas comme de vrais IN
    const recentInRecords = await this.prisma.attendance.findMany({
      where: {
        tenantId,
        employeeId,
        type: AttendanceType.IN,
        timestamp: { gte: detectionWindowStart, lt: timestamp },
        OR: [
          { anomalyType: null },
          { anomalyType: { not: 'DEBOUNCE_BLOCKED' } },
        ],
      },
      orderBy: { timestamp: 'desc' },
    });

    // Vérifier si le dernier IN est orphelin (sans OUT correspondant)
    if (recentInRecords.length > 0) {
      const lastInRecord = recentInRecords[0];
      const hoursSinceLastIn = (timestamp.getTime() - lastInRecord.timestamp.getTime()) / (1000 * 60 * 60);

      // Vérifier s'il y a un OUT après ce IN
      const correspondingOut = await this.prisma.attendance.findFirst({
        where: {
          tenantId,
          employeeId,
          type: AttendanceType.OUT,
          timestamp: { gte: lastInRecord.timestamp, lt: timestamp },
        },
        orderBy: { timestamp: 'asc' },
      });

      // Si pas de OUT et que le IN est orphelin (dépassé le seuil)
      if (!correspondingOut && hoursSinceLastIn >= orphanThresholdHours) {
        // Suggérer d'ajouter un OUT manquant (sans auto-ajout)
        const suggestedOutTime = new Date(lastInRecord.timestamp);
        // Suggérer l'heure de fin du shift prévu ou 17:00 par défaut
        const schedule = await this.getScheduleWithFallback(tenantId, employeeId, lastInRecord.timestamp);
        if (schedule?.shift) {
          const expectedEndTime = this.parseTimeString(
            schedule.customEndTime || schedule.shift.endTime,
          );
          suggestedOutTime.setHours(expectedEndTime.hours, expectedEndTime.minutes, 0, 0);
        } else {
          suggestedOutTime.setHours(17, 0, 0, 0); // Défaut: 17:00
        }

        return {
          hasAnomaly: true,
          type: 'DOUBLE_IN',
          note: `Pointage IN précédent sans OUT depuis ${Math.round(hoursSinceLastIn)}h. Suggestion: ajouter un OUT manquant à ${suggestedOutTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}.`,
          suggestedCorrection: {
            type: 'ADD_MISSING_OUT',
            previousInId: lastInRecord.id,
            suggestedOutTime: suggestedOutTime.toISOString(),
            confidence: 85,
            reason: 'ORPHAN_IN_DETECTED',
          },
        };
      }
    }

    // 1.2 Gestion des Shifts Multiples - Vérifier si plusieurs shifts sont prévus
    // Note: Le système supporte maintenant plusieurs schedules par jour (contrainte: employeeId + date + shiftId)
    // Un employé peut avoir plusieurs shifts le même jour (ex: MI JOUR 08:00-12:00, MI SOIR 14:00-18:00)
    const schedule = await this.getScheduleWithFallback(tenantId, employeeId, timestamp);

    // Vérifier s'il y a déjà un IN aujourd'hui
    if (todayInRecords.length > 0) {
      // Règle métier: Un IN est valide s'il y a un OUT entre le dernier IN et le nouveau IN
      // Cela permet de supporter les multiples shifts par jour (IN1, OUT1, IN2, OUT2)

      // Considérer comme DOUBLE_IN seulement si pas de OUT entre les deux IN
      const lastIn = todayInRecords[todayInRecords.length - 1];
      const hasOutBetween = todayRecords.some(
        r => r.type === AttendanceType.OUT && 
        r.timestamp > lastIn.timestamp && 
        r.timestamp < timestamp
      );

      if (!hasOutBetween) {
        // DOUBLE_IN détecté - générer une suggestion de correction
        const correctionSuggestion = await this.generateDoubleInCorrectionSuggestion(
          tenantId,
          employeeId,
          lastIn,
          timestamp,
          schedule,
        );

        // 1.3 Détection de Patterns Suspects (analytics informatif)
        let patternNote = '';
        if (enablePatternDetection) {
          const patternInfo = await this.analyzeDoubleInPattern(tenantId, employeeId);
          if (patternInfo.count >= patternAlertThreshold) {
            patternNote = ` ⚠️ Pattern suspect: ${patternInfo.count} DOUBLE_IN sur 30 jours.`;
          }
        }

        return {
          hasAnomaly: true,
          type: 'DOUBLE_IN',
          note: `Double pointage d'entrée détecté.${patternNote}`,
          suggestedCorrection: correctionSuggestion,
        };
      }
    }

    return { hasAnomaly: false };
  }

  /**
   * Génère une suggestion de correction pour DOUBLE_IN
   * Implémente 1.4 Suggestion Automatique de Correction
   */
  private async generateDoubleInCorrectionSuggestion(
    tenantId: string,
    employeeId: string,
    firstIn: any,
    secondInTimestamp: Date,
    schedule: any,
  ): Promise<any> {
    const suggestions = [];

    // Option 1: Supprimer le deuxième IN (si le premier est cohérent)
    const firstInSchedule = await this.getScheduleWithFallback(tenantId, employeeId, firstIn.timestamp);
    let firstInScore = 50;
    if (firstInSchedule?.shift) {
      const expectedStartTime = this.parseTimeString(
        firstInSchedule.customStartTime || firstInSchedule.shift.startTime,
      );
      const firstInTime = new Date(firstIn.timestamp);
      const expectedStart = new Date(firstIn.timestamp);
      expectedStart.setHours(expectedStartTime.hours, expectedStartTime.minutes, 0, 0);
      
      const diffMinutes = Math.abs((firstInTime.getTime() - expectedStart.getTime()) / (1000 * 60));
      if (diffMinutes <= 30) {
        firstInScore = 90; // Très cohérent
      } else if (diffMinutes <= 60) {
        firstInScore = 70; // Assez cohérent
      }
    }

    suggestions.push({
      action: 'DELETE_SECOND_IN',
      description: 'Supprimer le deuxième pointage IN',
      confidence: 100 - firstInScore,
      reason: firstInScore < 50 ? 'Le premier IN semble plus cohérent' : 'Le deuxième IN semble être une erreur',
    });

    // Option 2: Corriger le premier IN (si le deuxième est plus cohérent)
    let secondInScore = 50;
    if (schedule?.shift) {
      const expectedStartTime = this.parseTimeString(
        schedule.customStartTime || schedule.shift.startTime,
      );
      const expectedStart = new Date(secondInTimestamp);
      expectedStart.setHours(expectedStartTime.hours, expectedStartTime.minutes, 0, 0);
      
      const diffMinutes = Math.abs((secondInTimestamp.getTime() - expectedStart.getTime()) / (1000 * 60));
      if (diffMinutes <= 30) {
        secondInScore = 90;
      } else if (diffMinutes <= 60) {
        secondInScore = 70;
      }
    }

    suggestions.push({
      action: 'DELETE_FIRST_IN',
      description: 'Supprimer le premier pointage IN',
      confidence: 100 - secondInScore,
      reason: secondInScore < 50 ? 'Le deuxième IN semble plus cohérent' : 'Le premier IN semble être une erreur',
    });

    // Option 3: Ajouter un OUT manquant entre les deux IN
    const timeBetween = (secondInTimestamp.getTime() - firstIn.timestamp.getTime()) / (1000 * 60 * 60);
    if (timeBetween >= 4) { // Au moins 4 heures entre les deux IN
      const suggestedOutTime = new Date(firstIn.timestamp.getTime() + (timeBetween / 2) * 60 * 60 * 1000);
      suggestions.push({
        action: 'ADD_OUT_BETWEEN',
        description: 'Ajouter un OUT manquant entre les deux IN',
        confidence: 60,
        suggestedOutTime: suggestedOutTime.toISOString(),
        reason: 'Il semble y avoir eu une sortie non pointée entre les deux entrées',
      });
    }

    // Retourner la suggestion avec le score le plus élevé
    const bestSuggestion = suggestions.sort((a, b) => b.confidence - a.confidence)[0];

    return {
      type: 'DOUBLE_IN_CORRECTION',
      suggestions: suggestions,
      recommended: bestSuggestion,
      firstInId: firstIn.id,
      firstInTimestamp: firstIn.timestamp.toISOString(),
      secondInTimestamp: secondInTimestamp.toISOString(),
    };
  }

  /**
   * Analyse les patterns de DOUBLE_IN pour un employé (analytics informatif)
   * Implémente 1.3 Détection de Patterns Suspects
   */
  private async analyzeDoubleInPattern(
    tenantId: string,
    employeeId: string,
  ): Promise<{ count: number; averageInterval: number; hours: number[] }> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Récupérer tous les DOUBLE_IN des 30 derniers jours
    const doubleInRecords = await this.prisma.attendance.findMany({
      where: {
        tenantId,
        employeeId,
        type: AttendanceType.IN,
        hasAnomaly: true,
        anomalyType: 'DOUBLE_IN',
        timestamp: { gte: thirtyDaysAgo },
      },
      orderBy: { timestamp: 'asc' },
    });

    const hours: number[] = [];
    let totalInterval = 0;
    let intervalCount = 0;

    // Analyser les heures et intervalles
    for (let i = 1; i < doubleInRecords.length; i++) {
      const hour = doubleInRecords[i].timestamp.getHours();
      hours.push(hour);
      
      if (i > 0) {
        const interval = (doubleInRecords[i].timestamp.getTime() - doubleInRecords[i - 1].timestamp.getTime()) / (1000 * 60);
        totalInterval += interval;
        intervalCount++;
      }
    }

    return {
      count: doubleInRecords.length,
      averageInterval: intervalCount > 0 ? totalInterval / intervalCount : 0,
      hours: hours,
    };
  }

  /**
   * Détection améliorée de MISSING_IN avec toutes les améliorations
   * Implémente:
   * - 2.1 Vérification des Pointages Précédents (requalification MISSING_OUT jour N-1)
   * - 2.2 Gestion des Cas Légitimes (télétravail, mission externe → PRESENCE_EXTERNE)
   * - 2.3 Suggestion Automatique d'Heure d'Entrée
   * - 2.4 Détection de Patterns d'Oubli (analytics)
   * - 2.5 Arrivées Tardives avec OUT Direct
   */
  private async detectMissingInImproved(
    tenantId: string,
    employeeId: string,
    timestamp: Date,
    todayRecords: any[],
  ): Promise<{ hasAnomaly: boolean; type?: string; note?: string; suggestedCorrection?: any }> {
    // Récupérer les paramètres configurables
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
      select: {
        allowMissingInForRemoteWork: true,
        allowMissingInForMissions: true,
        enableMissingInPatternDetection: true,
        missingInPatternAlertThreshold: true,
      },
    });

    const allowRemoteWork = settings?.allowMissingInForRemoteWork !== false;
    const allowMissions = settings?.allowMissingInForMissions !== false;
    const enablePatternDetection = settings?.enableMissingInPatternDetection !== false;
    const patternAlertThreshold = settings?.missingInPatternAlertThreshold || 3;

    // Vérifier s'il y a un IN aujourd'hui
    const hasInToday = todayRecords.some(r => r.type === AttendanceType.IN);

    // Si IN existe, pas de MISSING_IN
    if (hasInToday) {
      return { hasAnomaly: false };
    }

    // 2.2 Gestion des Cas Légitimes - Vérifier télétravail, mission externe, pointage mobile/GPS
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        id: true,
        userId: true,
      },
    });

    // Vérifier si le pointage provient d'une application mobile (GPS)
    const isMobilePunch = todayRecords.some(r => r.method === 'MOBILE_GPS' || r.latitude !== null);

    // Vérifier si l'employé a un congé/mission pour aujourd'hui
    const startOfDay = new Date(timestamp);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(timestamp);
    endOfDay.setHours(23, 59, 59, 999);

    const leave = await this.prisma.leave.findFirst({
      where: {
        tenantId,
        employeeId,
        startDate: { lte: endOfDay },
        endDate: { gte: startOfDay },
        status: { in: ['APPROVED', 'MANAGER_APPROVED'] },
      },
    });

    // Si pointage mobile/GPS ou congé approuvé, considérer comme présence externe
    if (isMobilePunch || leave) {
      return {
        hasAnomaly: false, // Pas d'anomalie, présence externe légitime
        type: 'PRESENCE_EXTERNE',
        note: isMobilePunch 
          ? 'Pointage externe (mobile/GPS) détecté - présence externe légitime'
          : 'Congé approuvé pour cette journée - présence externe légitime',
      };
    }

    // 2.1 Vérification des Pointages Précédents - CORRECTION IMPORTANTE
    // Vérifier s'il y a un IN hier sans OUT correspondant
    const yesterday = new Date(timestamp);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const endOfYesterday = new Date(yesterday);
    endOfYesterday.setHours(23, 59, 59, 999);

    // Récupérer TOUS les pointages d'hier (IN et OUT) triés par timestamp
    const yesterdayAllRecords = await this.prisma.attendance.findMany({
      where: {
        tenantId,
        employeeId,
        timestamp: { gte: yesterday, lte: endOfYesterday },
        type: { in: [AttendanceType.IN, AttendanceType.OUT] },
      },
      orderBy: { timestamp: 'desc' },
    });

    // Vérifier si le DERNIER pointage d'hier est un IN sans OUT après lui
    const lastRecordYesterday = yesterdayAllRecords.length > 0 ? yesterdayAllRecords[0] : null;
    const hasUnmatchedInYesterday = lastRecordYesterday?.type === AttendanceType.IN;

    // Si le dernier pointage d'hier est un IN (sans OUT après), vérifier si c'est un shift de nuit
    if (hasUnmatchedInYesterday && lastRecordYesterday) {
      const lastInYesterday = lastRecordYesterday;

      console.log('🔍 [NIGHT SHIFT DETECTION] OUT sans IN détecté');
      console.log(`   IN d'hier: ${lastInYesterday.timestamp.toISOString()}`);
      console.log(`   OUT d'aujourd'hui: ${timestamp.toISOString()}`);

      // Analyser le pattern temporel pour détecter un shift de nuit
      // (IN le soir, OUT le matin du lendemain)
      const inTime = { hours: lastInYesterday.timestamp.getHours(), minutes: lastInYesterday.timestamp.getMinutes() };
      const outTime = { hours: timestamp.getHours(), minutes: timestamp.getMinutes() };

      console.log(`   Heures IN: ${inTime.hours}:${inTime.minutes.toString().padStart(2, '0')}`);
      console.log(`   Heures OUT: ${outTime.hours}:${outTime.minutes.toString().padStart(2, '0')}`);

      // Vérifier que le OUT est le lendemain (après minuit)
      const inDate = new Date(lastInYesterday.timestamp);
      inDate.setHours(0, 0, 0, 0);
      const outDate = new Date(timestamp);
      outDate.setHours(0, 0, 0, 0);
      const isNextDay = outDate.getTime() > inDate.getTime();

      // Vérifier que le temps entre IN et OUT est raisonnable (entre 6h et 14h pour un shift de nuit)
      const timeBetweenInAndOut = timestamp.getTime() - lastInYesterday.timestamp.getTime();
      const hoursBetween = timeBetweenInAndOut / (1000 * 60 * 60);
      const isReasonableTimeSpan = hoursBetween >= 6 && hoursBetween <= 14;

      console.log(`   Est le jour suivant: ${isNextDay}`);
      console.log(`   Heures entre IN et OUT: ${hoursBetween.toFixed(2)}h`);
      console.log(`   Durée raisonnable (6-14h): ${isReasonableTimeSpan}`);

      // Condition 1 : OUT le lendemain ET temps raisonnable
      if (isNextDay && isReasonableTimeSpan) {
        console.log('✅ Conditions de base remplies (jour suivant + durée raisonnable)');

        // IMPORTANT: Chercher le planning pour le jour d'entrée (hier), pas le jour de sortie (aujourd'hui)
        const schedule = await this.getScheduleWithFallback(tenantId, employeeId, lastInYesterday.timestamp);

        console.log(`   Planning trouvé pour le jour d'entrée: ${schedule ? 'OUI' : 'NON'}`);

        // Si un planning existe, vérifier si c'est effectivement un shift de nuit
        if (schedule?.shift) {
          const expectedStartTime = this.parseTimeString(
            schedule.customStartTime || schedule.shift.startTime
          );
          const expectedEndTime = this.parseTimeString(
            schedule.customEndTime || schedule.shift.endTime
          );

          console.log(`   Shift prévu: ${expectedStartTime.hours}:${expectedStartTime.minutes.toString().padStart(2, '0')} - ${expectedEndTime.hours}:${expectedEndTime.minutes.toString().padStart(2, '0')}`);

          // Vérifier si c'est un shift de nuit (commence le soir et finit le lendemain matin)
          const isNightShift = this.isNightShift(schedule.shift, expectedEndTime);

          console.log(`   Est un shift de nuit (planning): ${isNightShift}`);

          if (isNightShift) {
            console.log('✅ Shift de nuit confirmé par le planning → PAS d\'anomalie');
            return { hasAnomaly: false };
          }
        }

        // Même sans planning, si le pattern temporel correspond à un shift de nuit, accepter
        // Critère 1: IN après 17h ET OUT avant 14h
        const criterion1 = inTime.hours >= 17 && outTime.hours < 14;
        console.log(`   Critère 1 (IN ≥17h ET OUT <14h): ${criterion1}`);

        if (criterion1) {
          console.log('✅ Pattern de shift de nuit détecté (critère 1) → PAS d\'anomalie');
          return { hasAnomaly: false };
        }

        // Critère 2: IN après 20h ET OUT avant 12h
        const criterion2 = inTime.hours >= 20 && outTime.hours < 12;
        console.log(`   Critère 2 (IN ≥20h ET OUT <12h): ${criterion2}`);

        if (criterion2) {
          console.log('✅ Pattern de shift de nuit détecté (critère 2) → PAS d\'anomalie');
          return { hasAnomaly: false };
        }

        // Critère 3: Durée entre 8h-12h ET IN après 18h ET OUT avant 12h
        const criterion3 = hoursBetween >= 8 && hoursBetween <= 12 && inTime.hours >= 18 && outTime.hours < 12;
        console.log(`   Critère 3 (8h≤durée≤12h ET IN ≥18h ET OUT <12h): ${criterion3}`);

        if (criterion3) {
          console.log('✅ Pattern de shift de nuit détecté (critère 3) → PAS d\'anomalie');
          return { hasAnomaly: false };
        }

        console.log('❌ Aucun critère de shift de nuit rempli → Anomalie MISSING_OUT');
      } else {
        console.log('❌ Conditions de base non remplies');
      }

      // Si ce n'est pas un shift de nuit ou si les heures ne correspondent pas,
      // alors c'est effectivement un MISSING_OUT (jour N-1)
      console.log('⚠️ Création d\'une anomalie MISSING_OUT pour le jour précédent');

      return {
        hasAnomaly: true,
        type: 'MISSING_OUT', // Requalification : MISSING_OUT jour N-1
        note: `OUT détecté aujourd'hui sans IN aujourd'hui, mais un IN existe hier (${lastInYesterday.timestamp.toLocaleDateString('fr-FR')}) sans OUT. Voulez-vous clôturer la journée d'hier ?`,
        suggestedCorrection: {
          type: 'CLOSE_YESTERDAY_SESSION',
          previousInId: lastInYesterday.id,
          previousInTimestamp: lastInYesterday.timestamp.toISOString(),
          currentOutTimestamp: timestamp.toISOString(),
          confidence: 90,
          reason: 'OUT_TODAY_CLOSES_YESTERDAY_SESSION',
        },
      };
    }

    // 2.5 Arrivées Tardives avec OUT Direct - Analyser autres événements
    const otherEventsToday = todayRecords.filter(
      r => r.type !== AttendanceType.OUT && r.type !== AttendanceType.IN
    );

    // Si d'autres événements existent (BREAK_START, BREAK_END, MISSION_START, etc.), suggérer un IN rétroactif
    if (otherEventsToday.length > 0) {
      const firstEvent = otherEventsToday.sort((a, b) => 
        a.timestamp.getTime() - b.timestamp.getTime()
      )[0];

      // Suggérer un IN à l'heure du premier événement ou avant
      const suggestedInTime = new Date(firstEvent.timestamp);
      suggestedInTime.setMinutes(suggestedInTime.getMinutes() - 30); // 30 min avant le premier événement

      const suggestion = await this.generateMissingInTimeSuggestion(
        tenantId,
        employeeId,
        timestamp,
        suggestedInTime,
      );

      return {
        hasAnomaly: true,
        type: 'MISSING_IN',
        note: `Pointage de sortie sans entrée. Autres événements détectés aujourd'hui (${otherEventsToday.length}). Suggestion: créer un IN rétroactif.`,
        suggestedCorrection: {
          type: 'ADD_MISSING_IN_RETROACTIVE',
          suggestedInTime: suggestedInTime.toISOString(),
          confidence: 70,
          reason: 'OTHER_EVENTS_DETECTED',
          firstEventType: firstEvent.type,
          firstEventTime: firstEvent.timestamp.toISOString(),
          ...suggestion,
        },
      };
    }

    // Si aucun autre événement → MISSING_IN confirmé
    // 2.3 Suggestion Automatique d'Heure d'Entrée
    const suggestion = await this.generateMissingInTimeSuggestion(
      tenantId,
      employeeId,
      timestamp,
      null, // Pas d'indice d'événement
    );

    // 2.4 Détection de Patterns d'Oubli (analytics informatif)
    let patternNote = '';
    if (enablePatternDetection) {
      const patternInfo = await this.analyzeMissingInPattern(tenantId, employeeId);
      if (patternInfo.count >= patternAlertThreshold) {
        patternNote = ` ⚠️ Pattern d'oubli: ${patternInfo.count} MISSING_IN sur 30 jours.`;
      }
    }

        return {
          hasAnomaly: true,
          type: 'MISSING_IN',
      note: `Pointage de sortie sans entrée.${patternNote}`,
      suggestedCorrection: {
        type: 'ADD_MISSING_IN',
        ...suggestion,
      },
    };
  }

  /**
   * Génère une suggestion d'heure d'entrée pour MISSING_IN
   * Implémente 2.3 Suggestion Automatique d'Heure d'Entrée
   */
  private async generateMissingInTimeSuggestion(
    tenantId: string,
    employeeId: string,
    outTimestamp: Date,
    eventBasedTime: Date | null,
  ): Promise<any> {
    const suggestions = [];

    // Option 1: Heure prévue du planning
    const schedule = await this.getScheduleWithFallback(tenantId, employeeId, outTimestamp);
    if (schedule?.shift) {
      const expectedStartTime = this.parseTimeString(
        schedule.customStartTime || schedule.shift.startTime,
      );
      const suggestedTime = new Date(outTimestamp);
      suggestedTime.setHours(expectedStartTime.hours, expectedStartTime.minutes, 0, 0);

      suggestions.push({
        source: 'PLANNING',
        suggestedTime: suggestedTime.toISOString(),
        confidence: 90,
        description: `Heure prévue du shift: ${expectedStartTime.hours.toString().padStart(2, '0')}:${expectedStartTime.minutes.toString().padStart(2, '0')}`,
      });
    }

    // Option 2: Heure moyenne historique (30 derniers jours)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const historicalInRecords = await this.prisma.attendance.findMany({
      where: {
        tenantId,
        employeeId,
        type: AttendanceType.IN,
        timestamp: { gte: thirtyDaysAgo, lt: outTimestamp },
        hasAnomaly: false, // Exclure les anomalies pour avoir une moyenne fiable
      },
      orderBy: { timestamp: 'asc' },
    });

    if (historicalInRecords.length > 0) {
      // Calculer l'heure moyenne d'arrivée
      let totalMinutes = 0;
      historicalInRecords.forEach(record => {
        const recordTime = new Date(record.timestamp);
        totalMinutes += recordTime.getHours() * 60 + recordTime.getMinutes();
      });
      const avgMinutes = Math.round(totalMinutes / historicalInRecords.length);
      const avgHours = Math.floor(avgMinutes / 60);
      const avgMins = avgMinutes % 60;

      const suggestedTime = new Date(outTimestamp);
      suggestedTime.setHours(avgHours, avgMins, 0, 0);

      suggestions.push({
        source: 'HISTORICAL_AVERAGE',
        suggestedTime: suggestedTime.toISOString(),
        confidence: 75,
        description: `Heure moyenne d'arrivée (30 derniers jours): ${avgHours.toString().padStart(2, '0')}:${avgMins.toString().padStart(2, '0')}`,
        sampleSize: historicalInRecords.length,
      });
    }

    // Option 3: Heure basée sur événement (si fournie)
    if (eventBasedTime) {
      suggestions.push({
        source: 'EVENT_BASED',
        suggestedTime: eventBasedTime.toISOString(),
        confidence: 60,
        description: `Basé sur le premier événement détecté aujourd'hui`,
      });
    }

    // Retourner la suggestion avec le score le plus élevé
    const bestSuggestion = suggestions.sort((a, b) => b.confidence - a.confidence)[0] || {
      source: 'DEFAULT',
      suggestedTime: new Date(outTimestamp).setHours(8, 0, 0, 0), // Défaut: 08:00
      confidence: 50,
      description: 'Heure par défaut: 08:00',
    };

    return {
      suggestions: suggestions,
      recommended: bestSuggestion,
      outTimestamp: outTimestamp.toISOString(),
    };
  }

  /**
   * Détection améliorée de MISSING_OUT avec toutes les améliorations et règles métier
   *
   * ═══════════════════════════════════════════════════════════════════════════════
   * FIX 14/01/2026: DÉSACTIVATION DE LA DÉTECTION EN TEMPS RÉEL
   * ═══════════════════════════════════════════════════════════════════════════════
   *
   * PROBLÈME: La détection en temps réel créait des faux positifs MISSING_OUT
   * sur les pointages IN qui étaient ensuite nettoyés quand le OUT arrivait.
   * Mais le nettoyage ne fonctionnait pas toujours, laissant des anomalies incorrectes.
   *
   * SOLUTION: Ne PAS détecter MISSING_OUT en temps réel.
   * Laisser le job batch (detect-missing-out.job.ts) qui s'exécute à minuit
   * faire la détection après la fin de la journée de travail.
   *
   * Le job batch vérifie:
   * - Tous les IN de la veille
   * - S'ils ont un OUT correspondant dans la fenêtre de détection
   * - Si non, marque MISSING_OUT
   *
   * Cette approche évite les faux positifs car on attend que la journée soit finie.
   * ═══════════════════════════════════════════════════════════════════════════════
   */
  private async detectMissingOutImproved(
    tenantId: string,
    employeeId: string,
    timestamp: Date,
    todayRecords: any[],
  ): Promise<{ hasAnomaly: boolean; type?: string; note?: string; suggestedCorrection?: any }> {
    // ═══════════════════════════════════════════════════════════════════════════════
    // FIX: Ne pas détecter MISSING_OUT en temps réel
    // La détection est faite par le job batch à minuit (detect-missing-out.job.ts)
    // ═══════════════════════════════════════════════════════════════════════════════
    console.log(`[detectMissingOutImproved] Détection temps réel désactivée - le job batch s'en charge`);
    return { hasAnomaly: false };

    // Code original conservé ci-dessous pour référence (non exécuté)
    // ═══════════════════════════════════════════════════════════════════════════════

    // Récupérer les paramètres configurables
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
      select: {
        missingOutDetectionWindow: true,
        allowMissingOutForRemoteWork: true,
        allowMissingOutForMissions: true,
        enableMissingOutPatternDetection: true,
        missingOutPatternAlertThreshold: true,
      },
    });

    const detectionWindowHours = settings?.missingOutDetectionWindow || 12;
    const allowRemoteWork = settings?.allowMissingOutForRemoteWork !== false;
    const allowMissions = settings?.allowMissingOutForMissions !== false;
    const enablePatternDetection = settings?.enableMissingOutPatternDetection !== false;
    const patternAlertThreshold = settings?.missingOutPatternAlertThreshold || 3;

    // RÈGLE MÉTIER : Un IN ouvre une session
    // Récupérer tous les IN du jour (sessions ouvertes)
    const todayInRecords = todayRecords.filter(r => r.type === AttendanceType.IN);
    const todayOutRecords = todayRecords.filter(r => r.type === AttendanceType.OUT);

    // Si pas de IN aujourd'hui, pas de session ouverte → pas de MISSING_OUT
    if (todayInRecords.length === 0) {
      return { hasAnomaly: false };
    }

    // RÈGLE MÉTIER : Un OUT ferme une seule session
    // RÈGLE MÉTIER : BREAK ≠ OUT
    // Vérifier les sessions ouvertes (IN sans OUT correspondant)
    const openSessions: any[] = [];
    
    for (const inRecord of todayInRecords) {
      // Trouver le OUT suivant le plus proche (dans la fenêtre de détection)
      const detectionWindowEnd = new Date(inRecord.timestamp.getTime() + detectionWindowHours * 60 * 60 * 1000);
      
      const correspondingOut = await this.prisma.attendance.findFirst({
        where: {
          tenantId,
          employeeId,
          type: AttendanceType.OUT,
          timestamp: {
            gte: inRecord.timestamp,
            lte: detectionWindowEnd,
          },
        },
        orderBy: { timestamp: 'asc' },
      });

      // RÈGLE MÉTIER : BREAK ≠ OUT
      // Vérifier s'il y a des BREAK_START/BREAK_END entre IN et OUT (ou maintenant)
      const breakEvents = await this.prisma.attendance.findMany({
        where: {
          tenantId,
          employeeId,
          type: { in: [AttendanceType.BREAK_START, AttendanceType.BREAK_END] },
          timestamp: {
            gte: inRecord.timestamp,
            lte: correspondingOut?.timestamp || new Date(),
          },
        },
        orderBy: { timestamp: 'asc' },
      });

      // Si pas de OUT correspondant, c'est une session ouverte
      if (!correspondingOut) {
        openSessions.push({
          inRecord,
          breakEvents,
          hoursOpen: (new Date().getTime() - inRecord.timestamp.getTime()) / (1000 * 60 * 60),
        });
      }
    }

    // Si toutes les sessions sont fermées, pas de MISSING_OUT
    if (openSessions.length === 0) {
      return { hasAnomaly: false };
    }

    // RÈGLE MÉTIER : Une session ne traverse jamais plusieurs shifts sans validation
    // Vérifier si une session ouverte traverse plusieurs shifts
    // FIX: Ne pas détecter MISSING_OUT si le shift n'est pas encore terminé + 2h
    let anySessionPastShiftEnd = false;

    for (const session of openSessions) {
      const inSchedule = await this.getScheduleWithFallback(tenantId, employeeId, session.inRecord.timestamp);

      if (inSchedule?.shift) {
        const expectedEndTime = this.parseTimeString(
          inSchedule.customEndTime || inSchedule.shift.endTime,
        );
        const expectedEnd = new Date(session.inRecord.timestamp);
        expectedEnd.setHours(expectedEndTime.hours, expectedEndTime.minutes, 0, 0);

        // Si shift de nuit, ajuster la date
        if (expectedEndTime.hours < expectedEndTime.hours ||
            (expectedEndTime.hours >= 20 && expectedEndTime.hours <= 23)) {
          expectedEnd.setDate(expectedEnd.getDate() + 1);
        }

        // Vérifier si on a dépassé la fin du shift de plus de X heures
        const hoursAfterShiftEnd = (new Date().getTime() - expectedEnd.getTime()) / (1000 * 60 * 60);

        console.log(`[detectMissingOut] Session ${session.inRecord.id}: hoursAfterShiftEnd=${hoursAfterShiftEnd.toFixed(2)}, expectedEnd=${expectedEnd.toISOString()}`);

        if (hoursAfterShiftEnd > 2) { // Plus de 2h après la fin du shift
          anySessionPastShiftEnd = true;
          // Session qui traverse plusieurs shifts sans validation
          return {
            hasAnomaly: true,
            type: 'MISSING_OUT',
            note: `Session ouverte depuis ${Math.round(session.hoursOpen)}h. La session traverse plusieurs shifts sans validation.`,
            suggestedCorrection: {
              type: 'CLOSE_SESSION_MULTI_SHIFT',
              inId: session.inRecord.id,
              inTimestamp: session.inRecord.timestamp.toISOString(),
              expectedEndTime: expectedEnd.toISOString(),
              confidence: 85,
              reason: 'SESSION_TRAVERSES_MULTIPLE_SHIFTS',
            },
          };
        } else {
          // FIX: Le shift n'est pas encore terminé + 2h → pas d'anomalie MISSING_OUT
          // L'employé est toujours dans sa période de travail normale
          console.log(`[detectMissingOut] Session ${session.inRecord.id}: Shift pas encore terminé + 2h → pas d'anomalie`);
        }
      }
    }

    // FIX: Si aucune session n'a dépassé la fin du shift + 2h, pas d'anomalie
    // (les employés sont encore dans leur période de travail normale)
    if (!anySessionPastShiftEnd && openSessions.length > 0) {
      // Vérifier si au moins une session a un schedule valide
      const lastSession = openSessions[openSessions.length - 1];
      const lastSchedule = await this.getScheduleWithFallback(tenantId, employeeId, lastSession.inRecord.timestamp);

      if (lastSchedule?.shift) {
        console.log(`[detectMissingOut] Toutes les sessions sont dans la période normale → pas d'anomalie MISSING_OUT`);
        return { hasAnomaly: false };
      }
    }

    // 3.4 Gestion des Cas Légitimes - Vérifier télétravail, mission externe
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, userId: true },
    });

    // Vérifier si le pointage provient d'une application mobile (GPS)
    const isMobilePunch = todayRecords.some(r => r.method === 'MOBILE_GPS' || r.latitude !== null);

    // Vérifier si l'employé a un congé/mission pour aujourd'hui
    const startOfDay = new Date(timestamp);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(timestamp);
    endOfDay.setHours(23, 59, 59, 999);

    const leave = await this.prisma.leave.findFirst({
      where: {
        tenantId,
        employeeId,
        startDate: { lte: endOfDay },
        endDate: { gte: startOfDay },
        status: { in: ['APPROVED', 'MANAGER_APPROVED'] },
      },
    });

    // Si pointage mobile/GPS ou congé approuvé, considérer comme présence externe
    if (isMobilePunch || leave) {
      return {
        hasAnomaly: false, // Pas d'anomalie, présence externe légitime
        type: 'PRESENCE_EXTERNE',
        note: isMobilePunch 
          ? 'Pointage externe (mobile/GPS) détecté - présence externe légitime'
          : 'Congé approuvé pour cette journée - présence externe légitime',
      };
    }

    // 3.2 Gestion des Shifts de Nuit
    const lastOpenSession = openSessions[openSessions.length - 1];
    const sessionSchedule = await this.getScheduleWithFallback(tenantId, employeeId, lastOpenSession.inRecord.timestamp);
    
    if (sessionSchedule?.shift) {
      const expectedEndTime = this.parseTimeString(
        sessionSchedule.customEndTime || sessionSchedule.shift.endTime,
      );
      const expectedEnd = new Date(lastOpenSession.inRecord.timestamp);
      expectedEnd.setHours(expectedEndTime.hours, expectedEndTime.minutes, 0, 0);
      
      // Identifier si c'est un shift de nuit
      const isNightShift = this.isNightShift(sessionSchedule.shift, expectedEndTime);
      
      if (isNightShift) {
        // Pour shift de nuit, étendre la fenêtre jusqu'au lendemain midi
        const detectionDeadline = new Date(expectedEnd);
        detectionDeadline.setDate(detectionDeadline.getDate() + 1);
        detectionDeadline.setHours(12, 0, 0, 0); // Midi le lendemain
        
        if (new Date() < detectionDeadline) {
          // Trop tôt pour détecter MISSING_OUT (shift de nuit)
          return { hasAnomaly: false };
        }
      }
    }

    // 3.3 Suggestion Automatique d'Heure de Sortie
    const suggestion = await this.generateMissingOutTimeSuggestion(
      tenantId,
      employeeId,
      lastOpenSession.inRecord,
      lastOpenSession.breakEvents,
    );

    // 3.5 Détection de Patterns d'Oubli (analytics informatif)
    let patternNote = '';
    if (enablePatternDetection) {
      const patternInfo = await this.analyzeMissingOutPattern(tenantId, employeeId);
      if (patternInfo.count >= patternAlertThreshold) {
        patternNote = ` ⚠️ Pattern d'oubli: ${patternInfo.count} MISSING_OUT sur 30 jours.`;
      }
    }

    return {
      hasAnomaly: true,
      type: 'MISSING_OUT',
      note: `Session ouverte depuis ${Math.round(lastOpenSession.hoursOpen)}h sans sortie correspondante.${patternNote}`,
      suggestedCorrection: {
        type: 'ADD_MISSING_OUT',
        inId: lastOpenSession.inRecord.id,
        inTimestamp: lastOpenSession.inRecord.timestamp.toISOString(),
        ...suggestion,
      },
    };
  }

  /**
   * Extrait l'offset UTC d'un timezone (en heures) - Version dynamique
   * Utilise l'API JavaScript Intl pour calculer l'offset réel (supporte DST)
   * Ex: "Africa/Casablanca" → 1 (UTC+1), "Europe/Paris" → 1 ou 2 selon DST
   * @param timezone - IANA timezone string (ex: "Africa/Casablanca", "Europe/Paris")
   * @param referenceDate - Date de référence pour le calcul (optionnel, défaut: now)
   */
  private getTimezoneOffset(timezone: string, referenceDate?: Date): number {
    if (!timezone || timezone === 'UTC') {
      return 0;
    }

    try {
      const date = referenceDate || new Date();

      // Méthode 1: Utiliser Intl.DateTimeFormat pour obtenir les parties de date
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: 'numeric',
        hourCycle: 'h23',
        timeZoneName: 'shortOffset',
      });

      const parts = formatter.formatToParts(date);
      const offsetPart = parts.find(p => p.type === 'timeZoneName');

      if (offsetPart?.value) {
        // Parse "GMT+1", "GMT-5", "GMT+5:30", etc.
        const match = offsetPart.value.match(/GMT([+-]?)(\d+)(?::(\d+))?/);
        if (match) {
          const sign = match[1] === '-' ? -1 : 1;
          const hours = parseInt(match[2], 10);
          const minutes = parseInt(match[3] || '0', 10);
          return sign * (hours + minutes / 60);
        }
      }

      // Méthode 2 (fallback): Calculer la différence entre UTC et timezone local
      const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
      const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
      const diffMs = tzDate.getTime() - utcDate.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      return Math.round(diffHours * 2) / 2; // Arrondir à 0.5h près (pour les timezones comme India +5:30)
    } catch (error) {
      console.warn(`⚠️ Timezone invalide ou non supporté: ${timezone}, utilisant UTC`);
      return 0;
    }
  }

  /**
   * Vérifie si un shift est un shift de nuit
   * Critères améliorés:
   * 1. Shift qui traverse minuit (startTime > endTime numériquement)
   * 2. Shift qui commence après 20h (20:00+)
   * 3. Shift qui finit après minuit et avant 8h
   * 4. La majorité des heures sont dans la période nocturne (22h-6h)
   */
  private isNightShift(shift: any, endTime: { hours: number; minutes: number }): boolean {
    const startTime = this.parseTimeString(shift.startTime);
    const startMinutes = startTime.hours * 60 + startTime.minutes;
    const endMinutes = endTime.hours * 60 + endTime.minutes;

    // Critère 1: Traverse minuit (ex: 22:00 → 06:00)
    // Si startTime > endTime numériquement, le shift traverse minuit
    if (startMinutes > endMinutes) {
      return true;
    }

    // Critère 2: Commence après 20h (même si finit le même jour)
    if (startTime.hours >= 20) {
      return true;
    }

    // Critère 3: Finit dans la période nocturne matinale (avant 8h)
    // Mais seulement si commence tard la veille (pas un shift du matin qui finit tôt)
    if (endTime.hours <= 8 && endTime.hours > 0 && startTime.hours >= 18) {
      return true;
    }

    // Critère 4: Calcul du temps passé dans la période nocturne (22h-6h)
    // Si plus de 50% du shift est dans cette période, c'est un shift de nuit
    const nightPeriodStart = 22 * 60; // 22:00
    const nightPeriodEnd = 6 * 60;    // 06:00

    let nightMinutes = 0;
    let totalMinutes = 0;

    if (startMinutes <= endMinutes) {
      // Shift normal (même jour)
      totalMinutes = endMinutes - startMinutes;

      // Heures après 22h
      if (endMinutes > nightPeriodStart) {
        nightMinutes += Math.min(endMinutes, 24 * 60) - Math.max(startMinutes, nightPeriodStart);
      }
      // Heures avant 6h
      if (startMinutes < nightPeriodEnd) {
        nightMinutes += Math.min(endMinutes, nightPeriodEnd) - startMinutes;
      }
    } else {
      // Shift qui traverse minuit
      totalMinutes = (24 * 60 - startMinutes) + endMinutes;

      // Toutes les heures après 22h jusqu'à minuit
      if (startMinutes < 24 * 60) {
        nightMinutes += 24 * 60 - Math.max(startMinutes, nightPeriodStart);
      }
      // Toutes les heures de minuit jusqu'à 6h ou endTime
      nightMinutes += Math.min(endMinutes, nightPeriodEnd);
    }

    // Si plus de 50% du shift est dans la période nocturne
    if (totalMinutes > 0 && (nightMinutes / totalMinutes) >= 0.5) {
      return true;
    }

    return false;
  }

  /**
   * Génère une suggestion d'heure de sortie pour MISSING_OUT
   * Implémente 3.3 Suggestion Automatique d'Heure de Sortie
   */
  private async generateMissingOutTimeSuggestion(
    tenantId: string,
    employeeId: string,
    inRecord: any,
    breakEvents: any[],
  ): Promise<any> {
    const suggestions = [];

    // Option 1: Heure prévue du planning
    const schedule = await this.getScheduleWithFallback(tenantId, employeeId, inRecord.timestamp);
    if (schedule?.shift) {
      const expectedEndTime = this.parseTimeString(
        schedule.customEndTime || schedule.shift.endTime,
      );
      const suggestedTime = new Date(inRecord.timestamp);
      suggestedTime.setHours(expectedEndTime.hours, expectedEndTime.minutes, 0, 0);
      
      // Si shift de nuit, ajuster la date
      if (this.isNightShift(schedule.shift, expectedEndTime)) {
        suggestedTime.setDate(suggestedTime.getDate() + 1);
      }

      suggestions.push({
        source: 'PLANNING',
        suggestedTime: suggestedTime.toISOString(),
        confidence: 90,
        description: `Heure prévue du shift: ${expectedEndTime.hours.toString().padStart(2, '0')}:${expectedEndTime.minutes.toString().padStart(2, '0')}`,
      });
    }

    // Option 2: Heure moyenne historique (30 derniers jours)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const historicalOutRecords = await this.prisma.attendance.findMany({
      where: {
        tenantId,
        employeeId,
        type: AttendanceType.OUT,
        timestamp: { gte: thirtyDaysAgo, lt: inRecord.timestamp },
        hasAnomaly: false, // Exclure les anomalies pour avoir une moyenne fiable
      },
      orderBy: { timestamp: 'asc' },
    });

    if (historicalOutRecords.length > 0) {
      // Calculer l'heure moyenne de sortie
      let totalMinutes = 0;
      historicalOutRecords.forEach(record => {
        const recordTime = new Date(record.timestamp);
        totalMinutes += recordTime.getHours() * 60 + recordTime.getMinutes();
      });
      const avgMinutes = Math.round(totalMinutes / historicalOutRecords.length);
      const avgHours = Math.floor(avgMinutes / 60);
      const avgMins = avgMinutes % 60;

      const suggestedTime = new Date(inRecord.timestamp);
      suggestedTime.setHours(avgHours, avgMins, 0, 0);

      suggestions.push({
        source: 'HISTORICAL_AVERAGE',
        suggestedTime: suggestedTime.toISOString(),
        confidence: 75,
        description: `Heure moyenne de sortie (30 derniers jours): ${avgHours.toString().padStart(2, '0')}:${avgMins.toString().padStart(2, '0')}`,
        sampleSize: historicalOutRecords.length,
      });
    }

    // Option 3: Heure du dernier pointage (BREAK_END, etc.)
    if (breakEvents.length > 0) {
      const lastBreakEnd = breakEvents
        .filter(e => e.type === AttendanceType.BREAK_END)
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
      
      if (lastBreakEnd) {
        const suggestedTime = new Date(lastBreakEnd.timestamp);
        suggestedTime.setHours(suggestedTime.getHours() + 4); // 4h après la fin de pause (estimation)

        suggestions.push({
          source: 'LAST_EVENT',
          suggestedTime: suggestedTime.toISOString(),
          confidence: 60,
          description: `Basé sur le dernier pointage (BREAK_END)`,
        });
      }
    }

    // Option 4: Heure de fermeture du site (si disponible)
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: { site: true },
    });

    if (employee?.site) {
      // Par défaut, suggérer 18:00 comme heure de fermeture
      const suggestedTime = new Date(inRecord.timestamp);
      suggestedTime.setHours(18, 0, 0, 0);

      suggestions.push({
        source: 'SITE_CLOSING',
        suggestedTime: suggestedTime.toISOString(),
        confidence: 40,
        description: `Heure de fermeture du site (estimation)`,
      });
    }

    // Retourner la suggestion avec le score le plus élevé
    const bestSuggestion = suggestions.sort((a, b) => b.confidence - a.confidence)[0] || {
      source: 'DEFAULT',
      suggestedTime: new Date(inRecord.timestamp).setHours(17, 0, 0, 0), // Défaut: 17:00
      confidence: 50,
      description: 'Heure par défaut: 17:00',
    };

    return {
      suggestions: suggestions,
      recommended: bestSuggestion,
      inTimestamp: inRecord.timestamp.toISOString(),
    };
  }

  /**
   * Analyse les patterns de MISSING_OUT pour un employé (analytics informatif)
   * Implémente 3.5 Détection de Patterns d'Oubli
   */
  private async analyzeMissingOutPattern(
    tenantId: string,
    employeeId: string,
  ): Promise<{ count: number; daysOfWeek: number[]; hours: number[] }> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Récupérer tous les MISSING_OUT des 30 derniers jours
    const missingOutRecords = await this.prisma.attendance.findMany({
      where: {
        tenantId,
        employeeId,
        type: AttendanceType.IN,
        hasAnomaly: true,
        anomalyType: 'MISSING_OUT',
        timestamp: { gte: thirtyDaysAgo },
      },
      orderBy: { timestamp: 'asc' },
    });

    const daysOfWeek: number[] = [];
    const hours: number[] = [];

    // Analyser les jours de la semaine et heures
    missingOutRecords.forEach(record => {
      const date = new Date(record.timestamp);
      daysOfWeek.push(date.getDay()); // 0 = Dimanche, 1 = Lundi, etc.
      hours.push(date.getHours());
    });

    return {
      count: missingOutRecords.length,
      daysOfWeek: daysOfWeek,
      hours: hours,
    };
  }

  /**
   * Analyse les patterns de MISSING_IN pour un employé (analytics informatif)
   * Implémente 2.4 Détection de Patterns d'Oubli
   */
  private async analyzeMissingInPattern(
    tenantId: string,
    employeeId: string,
  ): Promise<{ count: number; daysOfWeek: number[]; hours: number[] }> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Récupérer tous les MISSING_IN des 30 derniers jours
    const missingInRecords = await this.prisma.attendance.findMany({
      where: {
        tenantId,
        employeeId,
        type: AttendanceType.OUT,
        hasAnomaly: true,
        anomalyType: 'MISSING_IN',
        timestamp: { gte: thirtyDaysAgo },
      },
      orderBy: { timestamp: 'asc' },
    });

    const daysOfWeek: number[] = [];
    const hours: number[] = [];

    // Analyser les jours de la semaine et heures
    missingInRecords.forEach(record => {
      const date = new Date(record.timestamp);
      daysOfWeek.push(date.getDay()); // 0 = Dimanche, 1 = Lundi, etc.
      hours.push(date.getHours());
    });

    return {
      count: missingInRecords.length,
      daysOfWeek: daysOfWeek,
      hours: hours,
    };
  }

  /**
   * Détecte les anomalies dans les pointages
   */
  private async detectAnomalies(
    tenantId: string,
    employeeId: string,
    timestamp: Date,
    type: AttendanceType,
  ): Promise<{ hasAnomaly: boolean; type?: string; note?: string }> {
    // ═══════════════════════════════════════════════════════════════════════════════
    // FIX 16/01/2026: Pour les shifts de nuit, étendre la fenêtre de recherche
    // ═══════════════════════════════════════════════════════════════════════════════
    const startOfSearchWindow = new Date(timestamp);
    startOfSearchWindow.setHours(startOfSearchWindow.getHours() - 24); // 24h avant
    const endOfDay = new Date(timestamp);
    endOfDay.setHours(23, 59, 59, 999);

    // Récupérer les pointages des dernières 24h + jour actuel (pour shifts de nuit)
    // FIX 18/01/2026: Exclure les DEBOUNCE_BLOCKED de l'analyse d'anomalies
    // Un pointage bloqué par anti-rebond ne doit pas être compté pour DOUBLE_IN/MISSING_IN/etc.
    const todayRecords = await this.prisma.attendance.findMany({
      where: {
        tenantId,
        employeeId,
        timestamp: { gte: startOfSearchWindow, lte: endOfDay },
        OR: [
          { anomalyType: null },
          { anomalyType: { not: 'DEBOUNCE_BLOCKED' } },
        ],
      },
      orderBy: { timestamp: 'asc' },
    });

    // PRIORITÉ 1 : Vérifier si l'employé a un congé approuvé pour cette date
    const leave = await this.prisma.leave.findFirst({
      where: {
        tenantId,
        employeeId,
        startDate: { lte: timestamp },
        endDate: { gte: timestamp },
        status: { in: ['APPROVED', 'MANAGER_APPROVED', 'HR_APPROVED'] },
      },
      include: {
        leaveType: true,
      },
    });

    if (leave) {
      // L'employé est en congé - créer une anomalie LEAVE_CONFLICT
      const employee = await this.prisma.employee.findUnique({
        where: { id: employeeId },
        select: { firstName: true, lastName: true, matricule: true },
      });

      const employeeName = employee
        ? `${employee.firstName} ${employee.lastName} (${employee.matricule})`
        : `l'employé ${employeeId}`;

      console.log(`[detectAnomalies] ⚠️ Pointage pendant congé détecté: ${leave.leaveType.name} du ${leave.startDate.toLocaleDateString('fr-FR')} au ${leave.endDate.toLocaleDateString('fr-FR')}`);

      return {
        hasAnomaly: true,
        type: 'LEAVE_CONFLICT',
        note: `Pointage effectué pendant un congé approuvé (${leave.leaveType.name}) du ${leave.startDate.toLocaleDateString('fr-FR')} au ${leave.endDate.toLocaleDateString('fr-FR')}. ` +
              `${employeeName} ne devrait pas travailler pendant cette période. ` +
              `Veuillez vérifier avec l'employé et annuler soit le congé, soit le pointage.`,
      };
    }

    // Vérifier double entrée (avec améliorations)
    if (type === AttendanceType.IN) {
      const doubleInResult = await this.detectDoubleInImproved(
        tenantId,
        employeeId,
        timestamp,
        todayRecords,
      );
      if (doubleInResult.hasAnomaly) {
        return doubleInResult;
      }
    }

    // Vérifier sortie sans entrée (avec améliorations)
    if (type === AttendanceType.OUT) {
      const missingInResult = await this.detectMissingInImproved(
        tenantId,
        employeeId,
        timestamp,
        todayRecords,
      );
      if (missingInResult.hasAnomaly) {
        return missingInResult;
      }
    }

    // Vérifier entrée sans sortie (avec améliorations et règles métier)
    if (type === AttendanceType.IN) {
      const missingOutResult = await this.detectMissingOutImproved(
        tenantId,
        employeeId,
        timestamp,
        todayRecords,
      );
      if (missingOutResult.hasAnomaly) {
        return missingOutResult;
      }
    }

    // Détecter les jours fériés travaillés (anomalie informative)
    // Note: on garde cette info mais on continue les autres vérifications
    const holidayCheck = await this.detectHolidayWork(tenantId, employeeId, timestamp, type);

    // Vérifier retards (nécessite le planning de l'employé)
    if (type === AttendanceType.IN) {
      // Utiliser la fonction helper avec fallback vers currentShiftId
      const schedule = await this.getScheduleWithFallback(tenantId, employeeId, timestamp);

      // Vérifier le statut du planning (Cas D) - seulement si ce n'est pas un schedule virtuel
      if (schedule && schedule.id !== 'virtual' && schedule.status !== 'PUBLISHED') {
        // Planning existe mais non publié/annulé
        const leave = await this.prisma.leave.findFirst({
          where: {
            tenantId,
            employeeId,
            startDate: { lte: timestamp },
            endDate: { gte: timestamp },
            status: { in: ['APPROVED', 'MANAGER_APPROVED'] },
          },
        });

        if (!leave) {
          return {
            hasAnomaly: true,
            type: 'ABSENCE_TECHNICAL',
            note: `Absence technique : planning ${schedule.status.toLowerCase()}`,
          };
        }
      }

      // Utiliser le schedule (physique ou virtuel) pour la détection
      if (schedule?.shift && (schedule.id === 'virtual' || schedule.status === 'PUBLISHED')) {
        const expectedStartTime = this.parseTimeString(
          schedule.customStartTime || schedule.shift.startTime,
        );

        // Récupérer le timezone du tenant pour calculer correctement
        const tenant = await this.prisma.tenant.findUnique({
          where: { id: tenantId },
          select: { timezone: true },
        });

        // Extraire l'offset UTC du timezone (ex: "Africa/Casablanca" = UTC+1)
        // Pour simplifier, on parse si c'est au format "UTC+X" ou on utilise un mapping
        const timezoneOffset = this.getTimezoneOffset(tenant?.timezone || 'UTC');

        // Construire l'heure de début attendue en tenant compte du timezone
        // Le shift dit "14:00" en heure locale du tenant
        // Si tenant est UTC+1, alors 14:00 locale = 13:00 UTC
        const expectedStart = new Date(Date.UTC(
          timestamp.getUTCFullYear(),
          timestamp.getUTCMonth(),
          timestamp.getUTCDate(),
          expectedStartTime.hours - timezoneOffset,
          expectedStartTime.minutes,
          0,
          0
        ));

        const settings = await this.prisma.tenantSettings.findUnique({
          where: { tenantId },
          select: {
            lateToleranceEntry: true,
            absencePartialThreshold: true, // Nouveau paramètre pour Cas C
            // Paramètres pauses implicites
            allowImplicitBreaks: true,
            minImplicitBreakMinutes: true,
            maxImplicitBreakMinutes: true,
          },
        });

        const toleranceMinutes = settings?.lateToleranceEntry || 10;
        const absenceThreshold = settings?.absencePartialThreshold || 2; // Heures par défaut

        // Calculer le retard en heures
        const lateHours = (timestamp.getTime() - expectedStart.getTime()) / (1000 * 60 * 60);
        const lateMinutes = (timestamp.getTime() - expectedStart.getTime()) / (1000 * 60);

        // ═══════════════════════════════════════════════════════════════════════════════
        // PAUSES IMPLICITES : Vérifier si ce IN est un retour de pause
        // Un OUT suivi d'un IN dans un délai raisonnable est considéré comme pause
        // ═══════════════════════════════════════════════════════════════════════════════
        const allowImplicitBreaks = settings?.allowImplicitBreaks ?? true;
        // FIX 14/01/2026: Elargir la fenêtre de pause implicite (15-180 min au lieu de 30-120)
        // pour couvrir les pauses courtes et les pauses dejeuner prolongées
        const minBreakMinutes = settings?.minImplicitBreakMinutes ?? 15;
        const maxBreakMinutes = settings?.maxImplicitBreakMinutes ?? 180;

        if (allowImplicitBreaks && lateMinutes > toleranceMinutes) {
          // Chercher un OUT récent pour cet employé (possible pause)
          const recentOut = await this.prisma.attendance.findFirst({
            where: {
              tenantId,
              employeeId,
              type: AttendanceType.OUT,
              timestamp: {
                // OUT doit être entre (IN - maxBreakMinutes) et (IN - minBreakMinutes)
                gte: new Date(timestamp.getTime() - maxBreakMinutes * 60 * 1000),
                lte: new Date(timestamp.getTime() - minBreakMinutes * 60 * 1000),
              },
            },
            orderBy: { timestamp: 'desc' },
          });

          if (recentOut) {
            const breakDurationMinutes = (timestamp.getTime() - recentOut.timestamp.getTime()) / 60000;
            console.log(`✅ [detectAnomalies] Pause implicite détectée pour employé ${employeeId}: OUT à ${recentOut.timestamp.toLocaleTimeString('fr-FR')} → IN à ${timestamp.toLocaleTimeString('fr-FR')} (${breakDurationMinutes.toFixed(0)} min)`);

            // FIX: Nettoyer l'anomalie EARLY_LEAVE sur le OUT si elle existe
            // Car ce OUT n'est pas un départ anticipé mais une pause déjeuner
            if (recentOut.hasAnomaly && recentOut.anomalyType === 'EARLY_LEAVE') {
              console.log(`🧹 [detectAnomalies] Nettoyage anomalie EARLY_LEAVE sur OUT ${recentOut.id} (c'était une pause)`);
              await this.prisma.attendance.update({
                where: { id: recentOut.id },
                data: { hasAnomaly: false, anomalyType: null, anomalyNote: null },
              });
            }

            // C'est un retour de pause - ne pas créer d'anomalie ABSENCE_PARTIAL/LATE
            // La pause est dans la fenêtre configurée (minBreakMinutes à maxBreakMinutes)
            return { hasAnomaly: false };
          }
        }

        // Cas C : Absence partielle si retard >= seuil configuré
        if (lateHours >= absenceThreshold) {
          return {
            hasAnomaly: true,
            type: 'ABSENCE_PARTIAL',
            note: `Absence partielle détectée : arrivée ${lateHours.toFixed(1)}h après l'heure prévue`,
          };
        }

        // Sinon, traitement normal du retard
        if (lateMinutes > toleranceMinutes) {
          return {
            hasAnomaly: true,
            type: 'LATE',
            note: `Retard de ${Math.round(lateMinutes)} minutes détecté`,
          };
        }
      } else if (!schedule) {
        // Pas de planning ET pas de currentShiftId - vérifier selon requireScheduleForAttendance
        const settings = await this.prisma.tenantSettings.findUnique({
          where: { tenantId },
          select: {
            workingDays: true,
            requireScheduleForAttendance: true,
          },
        });

        const dayOfWeek = timestamp.getDay(); // 0 = Dimanche, 1 = Lundi, etc.
        const workingDays = (settings?.workingDays as number[]) || [1, 2, 3, 4, 5, 6]; // Par défaut: Lun-Sam
        const normalizedDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;
        const isWorkingDay = workingDays.includes(normalizedDayOfWeek);

        // TOUJOURS créer une anomalie si pas de planning, shift, congé ou récupération
        // Distinguer entre weekend (WEEKEND_WORK_UNAUTHORIZED) et jour ouvrable (ABSENCE)
        if (true) {
          // Vérifier s'il y a un congé
          const leave = await this.prisma.leave.findFirst({
            where: {
              tenantId,
              employeeId,
              startDate: { lte: timestamp },
              endDate: { gte: timestamp },
              status: { in: ['APPROVED', 'MANAGER_APPROVED', 'HR_APPROVED'] },
            },
          });

          // Vérifier s'il y a une récupération
          const recoveryDay = await this.prisma.recoveryDay.findFirst({
            where: {
              tenantId,
              employeeId,
              startDate: { lte: timestamp },
              endDate: { gte: timestamp },
              status: { in: ['APPROVED', 'PENDING'] },
            },
          });

          if (!leave && !recoveryDay) {
            // Récupérer le nom de l'employé pour le message
            const employee = await this.prisma.employee.findUnique({
              where: { id: employeeId },
              select: { firstName: true, lastName: true, matricule: true },
            });

            const employeeName = employee
              ? `${employee.firstName} ${employee.lastName} (${employee.matricule})`
              : `l'employé ${employeeId}`;

            // Détermine le jour de la semaine en français
            const dayNames = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
            const dayName = dayNames[dayOfWeek];

            // Si c'est un weekend (jour non ouvrable), utiliser le type spécifique
            if (!isWorkingDay) {
              return {
                hasAnomaly: true,
                type: 'WEEKEND_WORK_UNAUTHORIZED',
                note: `Pointage effectué le ${timestamp.toLocaleDateString('fr-FR')} (weekend - ${dayName}) : ` +
                       `aucun planning publié et jour non ouvrable. ` +
                       `Veuillez créer un planning pour autoriser le travail en weekend ou annuler ce pointage.`,
              };
            }

            // UNPLANNED_PUNCH : Pointage effectué sans planning existant
            // (différent de ABSENCE qui signifie "pas de pointage alors qu'un planning existe")
            return {
              hasAnomaly: true,
              type: 'UNPLANNED_PUNCH',
              note: `Pointage non planifié pour ${employeeName} le ${timestamp.toLocaleDateString('fr-FR')} (jour ouvrable - ${dayName}) : ` +
                     `aucun planning publié, aucun shift par défaut assigné, et aucun congé/récupération approuvé. ` +
                     `Veuillez créer un planning ou assigner un shift par défaut.`,
            };
          }
        }
      }
    }

    // Vérifier départ anticipé
    if (type === AttendanceType.OUT) {
      // IMPORTANT: Trouver le IN correspondant pour utiliser le bon shift
      const todayRecordsForDetect = await this.prisma.attendance.findMany({
        where: {
          tenantId,
          employeeId,
          timestamp: {
            gte: new Date(Date.UTC(timestamp.getUTCFullYear(), timestamp.getUTCMonth(), timestamp.getUTCDate(), 0, 0, 0)),
            lte: new Date(Date.UTC(timestamp.getUTCFullYear(), timestamp.getUTCMonth(), timestamp.getUTCDate(), 23, 59, 59)),
          },
        },
        orderBy: { timestamp: 'asc' },
      });

      const sortedRecordsDetect = [...todayRecordsForDetect].sort((a, b) =>
        a.timestamp.getTime() - b.timestamp.getTime()
      );

      let inRecordDetect: typeof todayRecordsForDetect[0] | undefined;
      let outCountDetect = 0;

      for (let i = sortedRecordsDetect.length - 1; i >= 0; i--) {
        const record = sortedRecordsDetect[i];
        if (record.timestamp.getTime() > timestamp.getTime()) continue;
        if (record.type === AttendanceType.BREAK_START || record.type === AttendanceType.BREAK_END) continue;

        if (record.type === AttendanceType.OUT) {
          outCountDetect++;
        }

        if (record.type === AttendanceType.IN) {
          if (outCountDetect === 0) {
            inRecordDetect = record;
            break;
          } else {
            outCountDetect--;
          }
        }
      }

      // Utiliser le timestamp du IN correspondant pour trouver le bon shift!
      const schedule = inRecordDetect
        ? await this.getScheduleWithFallback(tenantId, employeeId, inRecordDetect.timestamp)
        : await this.getScheduleWithFallback(tenantId, employeeId, timestamp);

      // Utiliser le schedule (physique ou virtuel) pour la détection
      if (schedule?.shift && (schedule.id === 'virtual' || schedule.status === 'PUBLISHED')) {
        const expectedEndTime = this.parseTimeString(
          schedule.customEndTime || schedule.shift.endTime,
        );
        const expectedEnd = new Date(timestamp);
        expectedEnd.setHours(expectedEndTime.hours, expectedEndTime.minutes, 0, 0);

        // GESTION SHIFT DE NUIT : Si c'est un shift de nuit et que expectedEnd est dans le futur,
        // c'est que la fin devrait être la veille
        const isNight = this.isNightShift(schedule.shift, expectedEndTime);
        if (isNight && expectedEnd.getTime() > timestamp.getTime()) {
          const hoursDiff = (expectedEnd.getTime() - timestamp.getTime()) / (1000 * 60 * 60);
          // Si la différence est > 12h, c'est probablement qu'on doit regarder la veille
          if (hoursDiff > 12) {
            expectedEnd.setDate(expectedEnd.getDate() - 1);
          }
        }

        const settings = await this.prisma.tenantSettings.findUnique({
          where: { tenantId },
          select: {
            earlyToleranceExit: true,
            requireBreakPunch: true,
            allowImplicitBreaks: true,
          },
        });

        const toleranceMinutes = settings?.earlyToleranceExit || 5;
        const earlyLeaveMinutes = (expectedEnd.getTime() - timestamp.getTime()) / (1000 * 60);

        // ═══════════════════════════════════════════════════════════════════════════════
        // FIX 14/01/2026: Ne pas détecter EARLY_LEAVE pendant les heures de pause
        // si requireBreakPunch = false (pauses implicites activées)
        // UTILISE breakStartTime du shift pour calculer la fenêtre de pause
        // ═══════════════════════════════════════════════════════════════════════════════
        if (earlyLeaveMinutes > toleranceMinutes) {
          // Vérifier si c'est probablement une pause déjeuner
          const requireBreakPunch = settings?.requireBreakPunch ?? false;
          const allowImplicitBreaks = settings?.allowImplicitBreaks ?? true;

          // Si les pauses explicites ne sont PAS requises ET les pauses implicites sont activées
          if (!requireBreakPunch && allowImplicitBreaks) {
            // Calculer la fenêtre de pause basée sur le shift
            const breakDuration = schedule.shift.breakDuration || 60; // Durée en minutes
            const breakStartTimeStr = schedule.shift.breakStartTime; // Ex: "12:00" ou null

            let breakWindowStart: number;
            let breakWindowEnd: number;

            if (breakStartTimeStr) {
              // Le shift a un breakStartTime défini - l'utiliser
              const breakStartParsed = this.parseTimeString(breakStartTimeStr);
              breakWindowStart = breakStartParsed.hours * 60 + breakStartParsed.minutes;
              breakWindowEnd = breakWindowStart + breakDuration;

              // Ajouter une tolérance de 30 minutes avant et après
              breakWindowStart -= 30;
              breakWindowEnd += 30;
            } else {
              // Pas de breakStartTime - calculer au milieu du shift
              const shiftStartTime = this.parseTimeString(
                schedule.customStartTime || schedule.shift.startTime,
              );
              let shiftStartMinutes = shiftStartTime.hours * 60 + shiftStartTime.minutes;
              let shiftEndMinutes = expectedEndTime.hours * 60 + expectedEndTime.minutes;

              // Gérer les shifts de nuit
              if (shiftEndMinutes < shiftStartMinutes) {
                shiftEndMinutes += 24 * 60;
              }

              // Milieu du shift
              const shiftMiddle = shiftStartMinutes + Math.floor((shiftEndMinutes - shiftStartMinutes) / 2);
              breakWindowStart = shiftMiddle - Math.floor(breakDuration / 2) - 30;
              breakWindowEnd = shiftMiddle + Math.floor(breakDuration / 2) + 30;
            }

            // Normaliser pour gérer le passage à minuit
            breakWindowStart = ((breakWindowStart % (24 * 60)) + (24 * 60)) % (24 * 60);
            breakWindowEnd = ((breakWindowEnd % (24 * 60)) + (24 * 60)) % (24 * 60);

            // Heure du OUT en minutes depuis minuit
            const outTimeInMinutes = timestamp.getHours() * 60 + timestamp.getMinutes();

            // Vérifier si le OUT est dans la fenêtre de pause
            let isInBreakWindow = false;
            if (breakWindowStart <= breakWindowEnd) {
              isInBreakWindow = outTimeInMinutes >= breakWindowStart && outTimeInMinutes <= breakWindowEnd;
            } else {
              // Cas shift de nuit (passage à minuit)
              isInBreakWindow = outTimeInMinutes >= breakWindowStart || outTimeInMinutes <= breakWindowEnd;
            }

            if (isInBreakWindow) {
              // C'est probablement une pause - ne pas détecter EARLY_LEAVE maintenant
              const breakStartFormatted = `${Math.floor(breakWindowStart / 60).toString().padStart(2, '0')}:${(breakWindowStart % 60).toString().padStart(2, '0')}`;
              const breakEndFormatted = `${Math.floor(breakWindowEnd / 60).toString().padStart(2, '0')}:${(breakWindowEnd % 60).toString().padStart(2, '0')}`;
              console.log(`⏸️ [detectAnomalies] OUT à ${timestamp.toLocaleTimeString('fr-FR')} dans fenêtre pause shift (${breakStartFormatted}-${breakEndFormatted}) - EARLY_LEAVE non détecté`);
              // Ne pas retourner d'anomalie - laisser passer
            } else {
              // Hors fenêtre de pause - c'est un vrai départ anticipé
              return {
                hasAnomaly: true,
                type: 'EARLY_LEAVE',
                note: `Départ anticipé de ${Math.round(earlyLeaveMinutes)} minutes détecté`,
              };
            }
          } else {
            // Pauses explicites requises - détecter normalement
            return {
              hasAnomaly: true,
              type: 'EARLY_LEAVE',
              note: `Départ anticipé de ${Math.round(earlyLeaveMinutes)} minutes détecté`,
            };
          }
        }
      } else if (!schedule) {
        // Pas de planning ET pas de currentShiftId pour le jour du OUT

        // IMPORTANT: Pour un OUT, vérifier d'abord si c'est un shift de nuit de la veille
        const previousDayDate = new Date(Date.UTC(
          timestamp.getFullYear(),
          timestamp.getMonth(),
          timestamp.getDate() - 1,
          0, 0, 0, 0
        ));

        const previousDaySchedule = await this.prisma.schedule.findFirst({
          where: {
            tenantId,
            employeeId,
            date: previousDayDate,
            status: 'PUBLISHED',
          },
          include: {
            shift: true,
          },
        });

        if (previousDaySchedule) {
          const expectedEndTime = this.parseTimeString(
            previousDaySchedule.customEndTime || previousDaySchedule.shift.endTime,
          );
          const isNightShift = this.isNightShift(previousDaySchedule.shift, expectedEndTime);

          if (isNightShift) {
            console.log(`[detectAnomalies OUT] ✅ Shift de nuit de la veille détecté → Pas d'anomalie pour ce OUT`);
            // C'est la sortie légitime d'un shift de nuit de la veille
            return { hasAnomaly: false };
          }
        }

        // Si ce n'est pas un shift de nuit, vérifier les congés/absences/weekend
        const settings = await this.prisma.tenantSettings.findUnique({
          where: { tenantId },
          select: {
            workingDays: true,
            requireScheduleForAttendance: true,
          },
        });

        const dayOfWeek = timestamp.getDay(); // 0 = Dimanche, 1 = Lundi, etc.
        const workingDays = (settings?.workingDays as number[]) || [1, 2, 3, 4, 5, 6]; // Par défaut: Lun-Sam
        const normalizedDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;
        const isWorkingDay = workingDays.includes(normalizedDayOfWeek);

        // TOUJOURS créer une anomalie si pas de planning, shift, congé ou récupération
        // Distinguer entre weekend (WEEKEND_WORK_UNAUTHORIZED) et jour ouvrable (ABSENCE)
        if (true) {
          // Vérifier s'il y a un congé
          const leave = await this.prisma.leave.findFirst({
            where: {
              tenantId,
              employeeId,
              startDate: { lte: timestamp },
              endDate: { gte: timestamp },
              status: { in: ['APPROVED', 'MANAGER_APPROVED', 'HR_APPROVED'] },
            },
          });

          // Vérifier s'il y a une récupération
          const recoveryDay = await this.prisma.recoveryDay.findFirst({
            where: {
              tenantId,
              employeeId,
              startDate: { lte: timestamp },
              endDate: { gte: timestamp },
              status: { in: ['APPROVED', 'PENDING'] },
            },
          });

          if (!leave && !recoveryDay) {
            // Récupérer le nom de l'employé pour le message
            const employee = await this.prisma.employee.findUnique({
              where: { id: employeeId },
              select: { firstName: true, lastName: true, matricule: true },
            });

            const employeeName = employee
              ? `${employee.firstName} ${employee.lastName} (${employee.matricule})`
              : `l'employé ${employeeId}`;

            // Détermine le jour de la semaine en français
            const dayNames = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
            const dayName = dayNames[dayOfWeek];

            // Si c'est un weekend (jour non ouvrable), utiliser le type spécifique
            if (!isWorkingDay) {
              return {
                hasAnomaly: true,
                type: 'WEEKEND_WORK_UNAUTHORIZED',
                note: `Pointage effectué le ${timestamp.toLocaleDateString('fr-FR')} (weekend - ${dayName}) : ` +
                       `aucun planning publié et jour non ouvrable. ` +
                       `Fin de shift commencé le weekend sans autorisation.`,
              };
            }

            // UNPLANNED_PUNCH : Pointage effectué sans planning existant
            // (différent de ABSENCE qui signifie "pas de pointage alors qu'un planning existe")
            return {
              hasAnomaly: true,
              type: 'UNPLANNED_PUNCH',
              note: `Pointage non planifié pour ${employeeName} le ${timestamp.toLocaleDateString('fr-FR')} (jour ouvrable - ${dayName}) : ` +
                     `aucun planning publié, aucun shift par défaut assigné, et aucun congé/récupération approuvé. ` +
                     `Veuillez créer un planning ou assigner un shift par défaut.`,
            };
          }
        }
      }
    }

    // Vérifier repos insuffisant entre shifts (INSUFFICIENT_REST)
    if (type === AttendanceType.IN) {
      // Récupérer le dernier pointage de sortie
      const lastOutRecord = await this.prisma.attendance.findFirst({
        where: {
          tenantId,
          employeeId,
          type: AttendanceType.OUT,
          timestamp: { lt: timestamp },
        },
        orderBy: { timestamp: 'desc' },
      });

      if (lastOutRecord) {
        // Récupérer tous les paramètres du tenant nécessaires en une seule requête
        const settings = await this.prisma.tenantSettings.findUnique({
          where: { tenantId },
          select: {
            enableInsufficientRestDetection: true,
            minimumRestHours: true,
            minimumRestHoursNightShift: true,
            nightShiftStart: true,
            nightShiftEnd: true,
          },
        });

        // Vérifier si la détection est activée
        if (settings?.enableInsufficientRestDetection !== false) {
          // Calculer le temps de repos entre la sortie précédente et l'entrée actuelle
          const restHours = (timestamp.getTime() - lastOutRecord.timestamp.getTime()) / (1000 * 60 * 60);

          // Vérifier si c'est un shift de nuit
          const schedule = await this.getScheduleWithFallback(tenantId, employeeId, timestamp);
          
          // Déterminer si c'est un shift de nuit (vérifier les heures du shift)
          let isNightShift = false;
          if (schedule?.shift) {
            const shiftStartTime = this.parseTimeString(
              schedule.customStartTime || schedule.shift.startTime
            );
            const nightStartTime = this.parseTimeString(settings?.nightShiftStart || '21:00');
            const nightEndTime = this.parseTimeString(settings?.nightShiftEnd || '06:00');
            
            // Vérifier si le shift commence pendant les heures de nuit
            const shiftStartMinutes = shiftStartTime.hours * 60 + shiftStartTime.minutes;
            const nightStartMinutes = nightStartTime.hours * 60 + nightStartTime.minutes;
            const nightEndMinutes = nightEndTime.hours * 60 + nightEndTime.minutes;
            
            // Shift de nuit si commence entre les heures de nuit définies
            if (nightStartMinutes > nightEndMinutes) {
              // Shift de nuit qui traverse minuit (ex: 21h-6h)
              isNightShift = shiftStartMinutes >= nightStartMinutes || shiftStartMinutes <= nightEndMinutes;
            } else {
              // Shift de nuit normal (ex: 22h-2h)
              isNightShift = shiftStartMinutes >= nightStartMinutes && shiftStartMinutes <= nightEndMinutes;
            }
          }

          // Repos minimum requis : configurable, avec option pour shift de nuit
          const minimumRestHours = isNightShift && settings?.minimumRestHoursNightShift
            ? Number(settings.minimumRestHoursNightShift)
            : Number(settings?.minimumRestHours || 11);

          if (restHours < minimumRestHours) {
            return {
              hasAnomaly: true,
              type: 'INSUFFICIENT_REST',
              note: `Repos insuffisant détecté : ${restHours.toFixed(2)}h de repos (minimum requis: ${minimumRestHours}h)`,
            };
          }
        }
      }
    }

    // Vérifier si le pointage est lié à une mission (MISSION_START ou MISSION_END)
    if (type === AttendanceType.MISSION_START || type === AttendanceType.MISSION_END) {
      // Les pointages de mission ne sont pas considérés comme des anomalies
      // mais peuvent être utilisés pour le contexte
      return { hasAnomaly: false };
    }

    // Si aucune anomalie bloquante n'a été détectée mais qu'un jour férié a été détecté,
    // retourner l'anomalie informative du jour férié
    if (holidayCheck.hasAnomaly) {
      return holidayCheck;
    }

    return { hasAnomaly: false };
  }

  /**
   * Approuve une correction de pointage
   */
  async approveCorrection(
    tenantId: string,
    id: string,
    approvedBy: string,
    approved: boolean,
    comment?: string,
  ) {
    const attendance = await this.prisma.attendance.findFirst({
      where: { id, tenantId },
      include: {
        employee: {
          select: {
            id: true,
            userId: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!attendance) {
      throw new NotFoundException(`Attendance record ${id} not found`);
    }

    if (!attendance.needsApproval) {
      throw new BadRequestException('Cette correction ne nécessite pas d\'approbation');
    }

    if (attendance.approvalStatus === 'APPROVED' || attendance.approvalStatus === 'REJECTED') {
      throw new BadRequestException('Cette correction a déjà été traitée');
    }

    // Si rejet d'une auto-correction mauvais bouton → restaurer le type original
    const isAutoCorrectReject = !approved && attendance.anomalyType === 'AUTO_CORRECTED_WRONG_TYPE';

    const updatedAttendance = await this.prisma.attendance.update({
      where: { id },
      data: {
        isCorrected: approved,
        correctedAt: approved ? new Date() : null,
        needsApproval: false,
        approvalStatus: approved ? 'APPROVED' : 'REJECTED',
        approvedBy: approved ? approvedBy : null,
        approvedAt: approved ? new Date() : null,
        correctionNote: comment || attendance.correctionNote,
        // Restaurer le type original si rejet d'auto-correction
        // terminalState 4=IN, 5=OUT → le type original est l'inverse du type actuel
        ...(isAutoCorrectReject && {
          type: attendance.type === 'IN' ? 'OUT' : 'IN',
          anomalyType: 'PROBABLE_WRONG_TYPE',
          anomalyNote: `Auto-correction rejetée par le manager. Type restauré à ${attendance.type === 'IN' ? 'OUT' : 'IN'} (terminal state=${attendance.terminalState}).`,
        }),
        // Nettoyer l'anomalie si approuvé
        ...(approved && attendance.anomalyType === 'AUTO_CORRECTED_WRONG_TYPE' && {
          hasAnomaly: false,
          anomalyType: null,
          anomalyNote: `Auto-correction validée par le manager.`,
        }),
      },
      include: {
        employee: {
          select: {
            id: true,
            userId: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Notifier l'employé du résultat de l'approbation
    if (updatedAttendance.employee.userId) {
      await this.prisma.notification.create({
        data: {
          tenantId,
          employeeId: attendance.employeeId,
          type: NotificationType.ATTENDANCE_CORRECTED,
          title: approved
            ? 'Correction de pointage approuvée'
            : 'Correction de pointage rejetée',
          message: approved
            ? `Votre correction de pointage a été approuvée.`
            : `Votre correction de pointage a été rejetée.`,
          metadata: {
            attendanceId: attendance.id,
            approved,
            comment,
          },
        },
      });
    }

    return updatedAttendance;
  }

  /**
   * Calcule le taux de présence d'un employé
   */
  async getPresenceRate(
    tenantId: string,
    employeeId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    presenceRate: number;
    totalDays: number;
    presentDays: number;
    absentDays: number;
    leaveDays: number;
    recoveryDays: number;
  }> {
    // Récupérer les plannings dans la période
    const schedules = await this.prisma.schedule.findMany({
      where: {
        tenantId,
        employeeId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const totalDays = schedules.length;

    if (totalDays === 0) {
      return {
        presenceRate: 0,
        totalDays: 0,
        presentDays: 0,
        absentDays: 0,
        leaveDays: 0,
        recoveryDays: 0,
      };
    }

    // Récupérer les pointages d'entrée dans la période
    const attendanceEntries = await this.prisma.attendance.findMany({
      where: {
        tenantId,
        employeeId,
        type: AttendanceType.IN,
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        timestamp: true,
      },
    });

    // Compter les jours uniques avec pointage
    const presentDaysSet = new Set<string>();
    attendanceEntries.forEach((entry) => {
      const date = new Date(entry.timestamp);
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      presentDaysSet.add(dateKey);
    });

    const presentDays = presentDaysSet.size;

    // Récupérer les congés approuvés dans la période
    const leaves = await this.prisma.leave.findMany({
      where: {
        tenantId,
        employeeId,
        status: {
          in: ['APPROVED', 'MANAGER_APPROVED'],
        },
        OR: [
          {
            startDate: { lte: endDate },
            endDate: { gte: startDate },
          },
        ],
      },
    });

    // AJOUT: Récupérer les journées de récupération approuvées dans la période
    const recoveryDays = await this.prisma.recoveryDay.findMany({
      where: {
        tenantId,
        employeeId,
        status: {
          in: [RecoveryDayStatus.APPROVED, RecoveryDayStatus.USED],
        },
        OR: [
          {
            startDate: { lte: endDate },
            endDate: { gte: startDate },
          },
        ],
      },
    });

    // Calculer les jours de congé qui chevauchent avec les plannings
    let leaveDays = 0;
    schedules.forEach((schedule) => {
      const scheduleDate = new Date(schedule.date);
      const hasLeave = leaves.some(
        (leave) =>
          scheduleDate >= new Date(leave.startDate) &&
          scheduleDate <= new Date(leave.endDate),
      );
      if (hasLeave) {
        leaveDays++;
      }
    });

    // AJOUT: Calculer les jours de récupération qui chevauchent avec les plannings
    let recoveryDaysCount = 0;
    schedules.forEach((schedule) => {
      const scheduleDate = new Date(schedule.date);
      const hasRecovery = recoveryDays.some(
        (rd) =>
          scheduleDate >= new Date(rd.startDate) &&
          scheduleDate <= new Date(rd.endDate),
      );
      if (hasRecovery) {
        recoveryDaysCount++;
      }
    });

    // Jours absents = jours planifiés - jours présents - jours de congé - jours de récupération
    const absentDays = totalDays - presentDays - leaveDays - recoveryDaysCount;

    // Taux de présence = (jours présents + jours de récupération) / jours planifiés * 100
    const presenceRate = totalDays > 0 ? ((presentDays + recoveryDaysCount) / totalDays) * 100 : 0;

    return {
      presenceRate: Math.round(presenceRate * 100) / 100, // Arrondir à 2 décimales
      totalDays,
      presentDays: presentDays + recoveryDaysCount, // MODIFIÉ: inclure les récupérations
      absentDays,
      leaveDays,
      recoveryDays: recoveryDaysCount, // NOUVEAU
    };
  }

  /**
   * Calcule le taux de ponctualité d'un employé
   */
  async getPunctualityRate(
    tenantId: string,
    employeeId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    punctualityRate: number;
    totalEntries: number;
    onTimeEntries: number;
    lateEntries: number;
    averageLateMinutes: number;
  }> {
    // Récupérer les pointages d'entrée avec retards dans la période
    const attendanceEntries = await this.prisma.attendance.findMany({
      where: {
        tenantId,
        employeeId,
        type: AttendanceType.IN,
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        timestamp: true,
        lateMinutes: true,
        hasAnomaly: true,
        anomalyType: true,
      },
    });

    const totalEntries = attendanceEntries.length;

    if (totalEntries === 0) {
      return {
        punctualityRate: 0,
        totalEntries: 0,
        onTimeEntries: 0,
        lateEntries: 0,
        averageLateMinutes: 0,
      };
    }

    // Compter les entrées en retard
    const lateEntries = attendanceEntries.filter(
      (entry) => entry.lateMinutes && entry.lateMinutes > 0,
    ).length;

    const onTimeEntries = totalEntries - lateEntries;

    // Calculer la moyenne des minutes de retard
    const lateMinutesSum = attendanceEntries.reduce(
      (sum, entry) => sum + (entry.lateMinutes || 0),
      0,
    );
    const averageLateMinutes =
      lateEntries > 0 ? Math.round(lateMinutesSum / lateEntries) : 0;

    // Taux de ponctualité = (entrées à l'heure / total entrées) * 100
    const punctualityRate =
      totalEntries > 0 ? (onTimeEntries / totalEntries) * 100 : 0;

    return {
      punctualityRate: Math.round(punctualityRate * 100) / 100,
      totalEntries,
      onTimeEntries,
      lateEntries,
      averageLateMinutes,
    };
  }

  /**
   * Récupère les tendances (graphiques) pour une période
   */
  async getTrends(
    tenantId: string,
    employeeId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    dailyTrends: Array<{
      date: string;
      lateCount: number;
      absentCount: number;
      earlyLeaveCount: number;
      anomaliesCount: number;
    }>;
    weeklyTrends: Array<{
      week: string;
      lateCount: number;
      absentCount: number;
      earlyLeaveCount: number;
      anomaliesCount: number;
    }>;
  }> {
    // Récupérer tous les pointages avec anomalies dans la période
    const attendances = await this.prisma.attendance.findMany({
      where: {
        tenantId,
        employeeId,
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
        hasAnomaly: true,
      },
      select: {
        timestamp: true,
        anomalyType: true,
      },
    });

    // Grouper par jour
    const dailyMap = new Map<string, any>();
    const weeklyMap = new Map<string, any>();

    attendances.forEach((attendance) => {
      const date = new Date(attendance.timestamp);
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

      // Calculer la semaine (ISO week)
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay() + 1); // Lundi
      const weekKey = `${weekStart.getFullYear()}-W${String(Math.ceil((weekStart.getTime() - new Date(weekStart.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000))).padStart(2, '0')}`;

      // Initialiser les compteurs pour le jour
      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, {
          date: dateKey,
          lateCount: 0,
          absentCount: 0,
          earlyLeaveCount: 0,
          anomaliesCount: 0,
        });
      }

      // Initialiser les compteurs pour la semaine
      if (!weeklyMap.has(weekKey)) {
        weeklyMap.set(weekKey, {
          week: weekKey,
          lateCount: 0,
          absentCount: 0,
          earlyLeaveCount: 0,
          anomaliesCount: 0,
        });
      }

      const daily = dailyMap.get(dateKey);
      const weekly = weeklyMap.get(weekKey);

      daily.anomaliesCount++;
      weekly.anomaliesCount++;

      if (attendance.anomalyType === 'LATE') {
        daily.lateCount++;
        weekly.lateCount++;
      } else if (attendance.anomalyType === 'ABSENCE') {
        daily.absentCount++;
        weekly.absentCount++;
      } else if (attendance.anomalyType === 'EARLY_LEAVE') {
        daily.earlyLeaveCount++;
        weekly.earlyLeaveCount++;
      }
    });

    // Convertir en tableaux triés
    const dailyTrends = Array.from(dailyMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date),
    );
    const weeklyTrends = Array.from(weeklyMap.values()).sort((a, b) =>
      a.week.localeCompare(b.week),
    );

    return {
      dailyTrends,
      weeklyTrends,
    };
  }

  /**
   * Détecte les anomalies récurrentes pour un employé
   */
  async detectRecurringAnomalies(
    tenantId: string,
    employeeId: string,
    days: number = 30,
  ): Promise<Array<{
    type: string;
    count: number;
    lastOccurrence: Date;
    frequency: string;
  }>> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Récupérer toutes les anomalies dans la période
    const anomalies = await this.prisma.attendance.findMany({
      where: {
        tenantId,
        employeeId,
        hasAnomaly: true,
        timestamp: {
          gte: startDate,
        },
      },
      select: {
        anomalyType: true,
        timestamp: true,
      },
    });

    // Grouper par type d'anomalie
    const anomalyMap = new Map<string, { count: number; lastOccurrence: Date }>();

    anomalies.forEach((anomaly) => {
      if (!anomaly.anomalyType) return;

      if (!anomalyMap.has(anomaly.anomalyType)) {
        anomalyMap.set(anomaly.anomalyType, {
          count: 0,
          lastOccurrence: new Date(anomaly.timestamp),
        });
      }

      const entry = anomalyMap.get(anomaly.anomalyType)!;
      entry.count++;
      if (new Date(anomaly.timestamp) > entry.lastOccurrence) {
        entry.lastOccurrence = new Date(anomaly.timestamp);
      }
    });

    // Filtrer les anomalies récurrentes (au moins 3 occurrences)
    const recurring = Array.from(anomalyMap.entries())
      .filter(([_, data]) => data.count >= 3)
      .map(([type, data]) => {
        const frequency = data.count / days; // Occurrences par jour
        return {
          type,
          count: data.count,
          lastOccurrence: data.lastOccurrence,
          frequency: frequency > 0.5 ? 'Quotidienne' : frequency > 0.2 ? 'Hebdomadaire' : 'Mensuelle',
        };
      })
      .sort((a, b) => b.count - a.count);

    return recurring;
  }

  /**
   * Corrige plusieurs pointages en une seule opération
   */
  async bulkCorrectAttendance(
    tenantId: string,
    bulkDto: {
      attendances: Array<{
        attendanceId: string;
        correctedTimestamp?: string;
        correctionNote?: string;
      }>;
      generalNote: string;
      correctedBy: string;
      forceApproval?: boolean;
    },
  ) {
    const results = [];
    const errors = [];

    for (const item of bulkDto.attendances) {
      try {
        const attendance = await this.prisma.attendance.findFirst({
          where: { id: item.attendanceId, tenantId },
        });

        if (!attendance) {
          errors.push({
            attendanceId: item.attendanceId,
            error: 'Pointage non trouvé',
          });
          continue;
        }

        const correctionDto: CorrectAttendanceDto = {
          correctionNote: item.correctionNote || bulkDto.generalNote,
          correctedBy: bulkDto.correctedBy,
          correctedTimestamp: item.correctedTimestamp,
          forceApproval: bulkDto.forceApproval,
        };

        const corrected = await this.correctAttendance(
          tenantId,
          item.attendanceId,
          correctionDto,
        );

        results.push({
          attendanceId: item.attendanceId,
          success: true,
          data: corrected,
        });
      } catch (error: any) {
        errors.push({
          attendanceId: item.attendanceId,
          error: error.message || 'Erreur lors de la correction',
        });
      }
    }

    return {
      total: bulkDto.attendances.length,
      success: results.length,
      failed: errors.length,
      results,
      errors,
    };
  }

  /**
   * Exporte uniquement les anomalies dans un format spécifique
   */
  async exportAnomalies(
    tenantId: string,
    filters: {
      startDate?: string;
      endDate?: string;
      employeeId?: string;
      anomalyType?: string;
    },
    format: 'csv' | 'excel',
  ) {
    const where: any = {
      tenantId,
      hasAnomaly: true,
    };

    if (filters.employeeId) {
      where.employeeId = filters.employeeId;
    }

    if (filters.anomalyType) {
      where.anomalyType = filters.anomalyType;
    }

    if (filters.startDate || filters.endDate) {
      where.timestamp = {};
      if (filters.startDate) {
        // Start of day in UTC
        where.timestamp.gte = new Date(filters.startDate + 'T00:00:00.000Z');
      }
      if (filters.endDate) {
        // End of day in UTC
        where.timestamp.lte = new Date(filters.endDate + 'T23:59:59.999Z');
      }
    }

    const anomalies = await this.prisma.attendance.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            matricule: true,
            firstName: true,
            lastName: true,
            department: {
              select: {
                name: true,
              },
            },
            site: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: { timestamp: 'desc' },
    });

    // Convertir en format CSV ou Excel
    if (format === 'csv') {
      const csvRows = [
        [
          'Date',
          'Heure',
          'Employé',
          'Matricule',
          'Département',
          'Site',
          'Type d\'anomalie',
          'Note',
          'Statut correction',
          'Corrigé par',
          'Date correction',
        ].join(','),
      ];

      anomalies.forEach((anomaly) => {
        const date = new Date(anomaly.timestamp);
        csvRows.push(
          [
            date.toISOString().split('T')[0],
            date.toTimeString().split(' ')[0],
            `${anomaly.employee.firstName} ${anomaly.employee.lastName}`,
            anomaly.employee.matricule || '',
            anomaly.employee.department?.name || '',
            anomaly.employee.site?.name || '',
            anomaly.anomalyType || '',
            (anomaly.anomalyNote || '').replace(/,/g, ';'),
            anomaly.isCorrected ? 'Corrigé' : 'Non corrigé',
            anomaly.correctedBy || '',
            anomaly.correctedAt ? new Date(anomaly.correctedAt).toISOString().split('T')[0] : '',
          ].join(','),
        );
      });

      return csvRows.join('\n');
    } else {
      // Format Excel (JSON pour l'instant, à convertir en Excel avec une librairie)
      return anomalies.map((anomaly) => ({
        date: new Date(anomaly.timestamp).toISOString().split('T')[0],
        time: new Date(anomaly.timestamp).toTimeString().split(' ')[0],
        employee: `${anomaly.employee.firstName} ${anomaly.employee.lastName}`,
        matricule: anomaly.employee.matricule || '',
        department: anomaly.employee.department?.name || '',
        site: anomaly.employee.site?.name || '',
        anomalyType: anomaly.anomalyType || '',
        note: anomaly.anomalyNote || '',
        status: anomaly.isCorrected ? 'Corrigé' : 'Non corrigé',
        correctedBy: anomaly.correctedBy || '',
        correctedAt: anomaly.correctedAt ? new Date(anomaly.correctedAt).toISOString() : '',
      }));
    }
  }

  /**
   * Exporte tous les pointages dans un format CSV ou Excel
   */
  async exportAttendance(
    tenantId: string,
    filters: {
      startDate?: string;
      endDate?: string;
      employeeId?: string;
      departmentId?: string;
      siteId?: string;
      type?: string;
    },
    format: 'csv' | 'excel',
    userId?: string,
    userPermissions?: string[],
  ): Promise<string | Buffer> {
    const where: any = {
      tenantId,
    };

    // Filtre par employé
    if (filters.employeeId) {
      where.employeeId = filters.employeeId;
    }

    // Filtre par type (IN/OUT)
    if (filters.type) {
      where.type = filters.type;
    }

    // Filtre par département ou site via l'employé
    if (filters.departmentId || filters.siteId) {
      where.employee = {};
      if (filters.departmentId) {
        where.employee.departmentId = filters.departmentId;
      }
      if (filters.siteId) {
        where.employee.siteId = filters.siteId;
      }
    }

    // Filtre par date
    if (filters.startDate || filters.endDate) {
      where.timestamp = {};
      if (filters.startDate) {
        where.timestamp.gte = new Date(filters.startDate + 'T00:00:00.000Z');
      }
      if (filters.endDate) {
        where.timestamp.lte = new Date(filters.endDate + 'T23:59:59.999Z');
      }
    }

    // Filtrer par manager si nécessaire
    const hasViewAll = userPermissions?.includes('attendance.view_all');
    if (userId && !hasViewAll) {
      const managerLevel = await getManagerLevel(this.prisma, userId, tenantId);
      const managedEmployeeIds = await getManagedEmployeeIds(this.prisma, managerLevel, tenantId);
      if (managedEmployeeIds.length > 0) {
        where.employeeId = { in: managedEmployeeIds };
      }
    }

    const attendances = await this.prisma.attendance.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            matricule: true,
            firstName: true,
            lastName: true,
            position: true,
            department: {
              select: { name: true },
            },
            site: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: [
        { timestamp: 'desc' },
      ],
      take: 10000, // Limite pour éviter les exports trop volumineux
    });

    // Générer le CSV
    if (format === 'csv') {
      const BOM = '\uFEFF'; // Pour l'encodage UTF-8 dans Excel
      const csvRows = [
        [
          'Date',
          'Heure',
          'Nom',
          'Prénom',
          'Matricule',
          'Département',
          'Fonction',
          'Type',
          'Anomalie',
          'Retard (min)',
          'Départ anticipé (min)',
          'Heures sup (min)',
          'Statut validation',
        ].join(';'), // Utiliser ; pour compatibilité Excel FR
      ];

      attendances.forEach((att) => {
        const date = new Date(att.timestamp);
        const localDate = date.toLocaleDateString('fr-FR');
        const localTime = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

        csvRows.push(
          [
            localDate,
            localTime,
            att.employee.lastName || '',
            att.employee.firstName || '',
            att.employee.matricule || '',
            att.employee.department?.name || '',
            att.employee.position || '',
            att.type === 'IN' ? 'Entrée' : 'Sortie',
            att.anomalyType || '',
            att.lateMinutes || '',
            att.earlyLeaveMinutes || '',
            att.overtimeMinutes || '',
            att.validationStatus || 'NONE',
          ].join(';'),
        );
      });

      return BOM + csvRows.join('\n');
    } else {
      // Format Excel - retourner JSON structuré (le frontend peut utiliser une librairie xlsx)
      const data = attendances.map((att) => {
        const date = new Date(att.timestamp);
        return {
          Date: date.toLocaleDateString('fr-FR'),
          Heure: date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
          Nom: att.employee.lastName || '',
          Prénom: att.employee.firstName || '',
          Matricule: att.employee.matricule || '',
          Département: att.employee.department?.name || '',
          Fonction: att.employee.position || '',
          Type: att.type === 'IN' ? 'Entrée' : 'Sortie',
          Anomalie: att.anomalyType || '',
          'Retard (min)': att.lateMinutes || '',
          'Départ anticipé (min)': att.earlyLeaveMinutes || '',
          'Heures sup (min)': att.overtimeMinutes || '',
          'Statut validation': att.validationStatus || 'NONE',
        };
      });

      // Pour Excel, on retourne du CSV pour l'instant (simple et fonctionne)
      const BOM = '\uFEFF';
      const headers = Object.keys(data[0] || {});
      const csvRows = [headers.join(';')];
      data.forEach((row) => {
        csvRows.push(headers.map((h) => row[h] || '').join(';'));
      });
      return BOM + csvRows.join('\n');
    }
  }

  /**
   * Récupère un dashboard de synthèse des anomalies
   */
  async getAnomaliesDashboard(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    userId?: string,
    userPermissions?: string[],
  ) {
    const where: any = {
      tenantId,
      hasAnomaly: true,
      timestamp: {
        gte: startDate,
        lte: endDate,
      },
    };

    // Filtrer par manager si nécessaire (seulement si l'utilisateur n'a pas 'view_all')
    const hasViewAll = userPermissions?.includes('attendance.view_all');
    if (userId && !hasViewAll) {
      const managerLevel = await getManagerLevel(this.prisma, userId, tenantId);
      if (managerLevel.type !== null) {
        const managedEmployeeIds = await getManagedEmployeeIds(this.prisma, managerLevel, tenantId);
        if (managedEmployeeIds.length === 0) {
          return this.getEmptyDashboard();
        }
        where.employeeId = { in: managedEmployeeIds };
      }
    }

    // Statistiques globales
    const [
      totalAnomalies,
      correctedAnomalies,
      pendingAnomalies,
      byType,
      byEmployee,
      byDay,
    ] = await Promise.all([
      // Total anomalies
      this.prisma.attendance.count({ where }),

      // Anomalies corrigées
      this.prisma.attendance.count({
        where: { ...where, isCorrected: true },
      }),

      // Anomalies en attente
      this.prisma.attendance.count({
        where: { ...where, isCorrected: false },
      }),

      // Par type d'anomalie
      this.prisma.attendance.groupBy({
        by: ['anomalyType'],
        where,
        _count: { id: true },
      }),

      // Par employé (top 10)
      this.prisma.attendance.groupBy({
        by: ['employeeId'],
        where,
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),

      // Par jour (derniers 7 jours)
      this.prisma.attendance.groupBy({
        by: ['timestamp'],
        where: {
          ...where,
          timestamp: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            lte: endDate,
          },
        },
        _count: { id: true },
      }),
    ]);

    // Enrichir les données par employé
    const employeeIds = byEmployee.map((e) => e.employeeId);
    const employees = await this.prisma.employee.findMany({
      where: { id: { in: employeeIds } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        matricule: true,
      },
    });

    const byEmployeeEnriched = byEmployee.map((item) => {
      const employee = employees.find((e) => e.id === item.employeeId);
      return {
        employeeId: item.employeeId,
        employeeName: employee
          ? `${employee.firstName} ${employee.lastName}`
          : 'Inconnu',
        matricule: employee?.matricule || '',
        count: item._count.id,
      };
    });

    return {
      summary: {
        total: totalAnomalies,
        corrected: correctedAnomalies,
        pending: pendingAnomalies,
        correctionRate: totalAnomalies > 0 ? (correctedAnomalies / totalAnomalies) * 100 : 0,
      },
      byType: byType.map((item) => ({
        type: item.anomalyType || 'UNKNOWN',
        count: item._count.id,
      })),
      byEmployee: byEmployeeEnriched,
      byDay: byDay.map((item) => ({
        date: new Date(item.timestamp).toISOString().split('T')[0],
        count: item._count.id,
      })),
    };
  }

  /**
   * Retourne un dashboard vide
   */
  private getEmptyDashboard() {
    return {
      summary: {
        total: 0,
        corrected: 0,
        pending: 0,
        correctionRate: 0,
      },
      byType: [],
      byEmployee: [],
      byDay: [],
    };
  }

  /**
   * Priorise les anomalies selon leur type et criticité
   * Version améliorée avec scoring contextuel
   */
  getAnomalyPriority(anomalyType: string | null): number {
    const priorities: Record<string, number> = {
      INSUFFICIENT_REST: 10, // Critique (légal)
      ABSENCE: 9, // Très important
      ABSENCE_PARTIAL: 8, // Très important
      ABSENCE_TECHNICAL: 7, // Important
      MISSING_OUT: 8, // Important (impact calcul heures)
      MISSING_IN: 7, // Important (impact calcul heures)
      LATE: 6, // Moyen
      EARLY_LEAVE: 5, // Moyen
      DOUBLE_IN: 4, // Faible
      PRESENCE_EXTERNE: 0, // Pas une anomalie
    };

    return priorities[anomalyType || ''] || 1;
  }

  /**
   * Calcule un score de criticité complet pour une anomalie
   * Implémente 1. Système de Scoring et Priorisation
   * 
   * Critères :
   * - Impact métier (base)
   * - Fréquence (plus répétée = plus critique)
   * - Contexte (avec justification vs sans)
   * - Historique employé (historique propre vs nombreuses anomalies)
   */
  async calculateAnomalyScore(
    tenantId: string,
    employeeId: string,
    anomalyType: string | null,
    timestamp: Date,
    hasJustification?: boolean,
  ): Promise<number> {
    // Score de base selon l'impact métier
    let score = this.getAnomalyPriority(anomalyType || null);

    // Critère 1: Fréquence - Plus un type d'anomalie se répète, plus le score est élevé
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentAnomalies = await this.prisma.attendance.count({
      where: {
        tenantId,
        employeeId,
        hasAnomaly: true,
        anomalyType: anomalyType || null,
        timestamp: { gte: thirtyDaysAgo },
      },
    });

    // Bonus de fréquence : +0.5 par occurrence supplémentaire (max +5)
    const frequencyBonus = Math.min(recentAnomalies * 0.5, 5);
    score += frequencyBonus;

    // Critère 2: Contexte - Anomalie avec justification vs sans justification
    if (!hasJustification) {
      score += 1; // +1 si pas de justification
    }

    // Critère 3: Historique - Employé avec historique propre vs nombreuses anomalies
    const totalAnomalies = await this.prisma.attendance.count({
      where: {
        tenantId,
        employeeId,
        hasAnomaly: true,
        timestamp: { gte: thirtyDaysAgo },
      },
    });

    // Si beaucoup d'anomalies (>10), augmenter le score
    if (totalAnomalies > 10) {
      score += 2; // +2 si historique chargé
    } else if (totalAnomalies > 5) {
      score += 1; // +1 si historique modéré
    }

    return Math.min(score, 20); // Score max: 20
  }

  /**
   * Récupère l'historique des corrections pour un pointage
   * Implémente 2. Interface de Correction Unifiée - Historique
   */
  async getCorrectionHistory(tenantId: string, attendanceId: string) {
    const attendance = await this.prisma.attendance.findFirst({
      where: { id: attendanceId, tenantId },
      select: {
        id: true,
        createdAt: true,
        correctedBy: true,
        correctedAt: true,
        correctionNote: true,
        isCorrected: true,
        approvalStatus: true,
        approvedBy: true,
        approvedAt: true,
        timestamp: true,
        rawData: true,
      },
    });

    if (!attendance) {
      throw new NotFoundException('Attendance record not found');
    }

    const history = [];

    // Action 1: Création initiale
    history.push({
      action: 'CREATED',
      timestamp: attendance.createdAt,
      note: 'Pointage créé',
    });

    // Action 2: Correction (si corrigé)
    if (attendance.isCorrected && attendance.correctedAt) {
      const correctedBy = attendance.correctedBy
        ? await this.prisma.user.findUnique({
            where: { id: attendance.correctedBy },
            select: { firstName: true, lastName: true },
          })
        : null;

      history.push({
        action: 'CORRECTED',
        timestamp: attendance.correctedAt,
        correctedBy: attendance.correctedBy,
        correctedByName: correctedBy
          ? `${correctedBy.firstName} ${correctedBy.lastName}`
          : null,
        correctionNote: attendance.correctionNote,
      });
    }

    // Action 3: Approbation (si approuvé)
    if (attendance.approvalStatus && attendance.approvedAt) {
      const approvedBy = attendance.approvedBy
        ? await this.prisma.user.findUnique({
            where: { id: attendance.approvedBy },
            select: { firstName: true, lastName: true },
          })
        : null;

      history.push({
        action: 'APPROVED',
        timestamp: attendance.approvedAt,
        approvedBy: attendance.approvedBy,
        approvedByName: approvedBy
          ? `${approvedBy.firstName} ${approvedBy.lastName}`
          : null,
        approvalStatus: attendance.approvalStatus,
      });
    }

    return history.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }

  /**
   * Correction en masse de plusieurs anomalies (wrapper pour compatibilité)
   * Implémente 2. Interface de Correction Unifiée - Bulk Correction
   * Note: bulkCorrectAttendance existe déjà, cette méthode est un wrapper
   */
  async bulkCorrect(
    tenantId: string,
    corrections: Array<{
      attendanceId: string;
      correctedTimestamp?: string;
      correctionNote?: string;
    }>,
    generalNote: string,
    correctedBy: string,
    userId?: string,
    userPermissions?: string[],
  ) {
    // Utiliser la méthode existante bulkCorrectAttendance
    return this.bulkCorrectAttendance(tenantId, {
      attendances: corrections,
      generalNote,
      correctedBy,
    });
  }

  /**
   * Analytics des anomalies - Métriques complètes
   * Implémente 3. Analytics et Reporting
   */
  async getAnomaliesAnalytics(
    tenantId: string,
    startDate: string,
    endDate: string,
    filters?: {
      employeeId?: string;
      departmentId?: string;
      siteId?: string;
      anomalyType?: string;
    },
  ) {
    // Utiliser le format ISO explicite pour éviter les problèmes de timezone
    const start = new Date(startDate + 'T00:00:00.000Z');
    const end = new Date(endDate + 'T23:59:59.999Z');

    const where: any = {
      tenantId,
      hasAnomaly: true,
      timestamp: { gte: start, lte: end },
    };

    if (filters?.employeeId) where.employeeId = filters.employeeId;
    if (filters?.departmentId) {
      where.employee = { departmentId: filters.departmentId };
    }
    if (filters?.siteId) where.siteId = filters.siteId;
    if (filters?.anomalyType) where.anomalyType = filters.anomalyType;

    // Métrique 1: Taux d'anomalies par type
    const byType = await this.prisma.attendance.groupBy({
      by: ['anomalyType'],
      where,
      _count: { id: true },
    });

    // Métrique 2: Taux d'anomalies par employé
    const byEmployee = await this.prisma.attendance.groupBy({
      by: ['employeeId'],
      where,
      _count: { id: true },
      _avg: { hoursWorked: true },
    });

    // Métrique 3: Taux d'anomalies par département
    const byDepartment = await this.prisma.attendance.groupBy({
      by: ['siteId'],
      where: {
        ...where,
        employee: filters?.departmentId ? { departmentId: filters.departmentId } : undefined,
      },
      _count: { id: true },
    });

    // Métrique 4: Temps moyen de résolution
    const correctedAnomalies = await this.prisma.attendance.findMany({
      where: {
        ...where,
        isCorrected: true,
        correctedAt: { not: null },
      },
      select: {
        createdAt: true,
        correctedAt: true,
      },
    });

    const avgResolutionTime = correctedAnomalies.length > 0
      ? correctedAnomalies.reduce((sum, a) => {
          const resolutionTime = a.correctedAt
            ? (a.correctedAt.getTime() - a.createdAt.getTime()) / (1000 * 60 * 60) // en heures
            : 0;
          return sum + resolutionTime;
        }, 0) / correctedAnomalies.length
      : 0;

    // Métrique 5: Tendances temporelles (par jour)
    const dailyTrends = await this.prisma.$queryRaw<Array<{
      date: Date;
      count: bigint;
    }>>`
      SELECT DATE(timestamp) as date, COUNT(*)::bigint as count
      FROM "Attendance"
      WHERE "tenantId" = ${tenantId}
        AND "hasAnomaly" = true
        AND "timestamp" >= ${start}
        AND "timestamp" <= ${end}
      GROUP BY DATE(timestamp)
      ORDER BY date ASC
    `;

    // Métrique 6: Patterns récurrents (jours de la semaine)
    const dayOfWeekPatterns = await this.prisma.$queryRaw<Array<{
      dayOfWeek: number;
      count: bigint;
    }>>`
      SELECT EXTRACT(DOW FROM timestamp)::int as "dayOfWeek", COUNT(*)::bigint as count
      FROM "Attendance"
      WHERE "tenantId" = ${tenantId}
        AND "hasAnomaly" = true
        AND "timestamp" >= ${start}
        AND "timestamp" <= ${end}
      GROUP BY EXTRACT(DOW FROM timestamp)
      ORDER BY "dayOfWeek" ASC
    `;

    return {
      summary: {
        total: await this.prisma.attendance.count({ where }),
        corrected: await this.prisma.attendance.count({
          where: { ...where, isCorrected: true },
        }),
        pending: await this.prisma.attendance.count({
          where: { ...where, isCorrected: false },
        }),
        avgResolutionTimeHours: Math.round(avgResolutionTime * 100) / 100,
      },
      byType: byType.map(item => ({
        type: item.anomalyType,
        count: item._count.id,
      })),
      byEmployee: await Promise.all(
        byEmployee.map(async item => {
          const employee = await this.prisma.employee.findUnique({
            where: { id: item.employeeId },
            select: { firstName: true, lastName: true, matricule: true },
          });
          return {
            employeeId: item.employeeId,
            employeeName: employee
              ? `${employee.firstName} ${employee.lastName}`
              : 'Unknown',
            matricule: employee?.matricule,
            count: item._count.id,
          };
        }),
      ),
      byDepartment: byDepartment.map(item => ({
        siteId: item.siteId,
        count: item._count.id,
      })),
      trends: dailyTrends.map(item => ({
        date: item.date,
        count: Number(item.count),
      })),
      dayOfWeekPatterns: dayOfWeekPatterns.map(item => ({
        dayOfWeek: item.dayOfWeek,
        dayName: ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'][
          item.dayOfWeek
        ],
        count: Number(item.count),
      })),
    };
  }

  /**
   * Génère un rapport mensuel des anomalies par département
   * Implémente 3. Analytics et Reporting - Rapports
   */
  async getMonthlyAnomaliesReport(
    tenantId: string,
    year: number,
    month: number,
  ) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59, 999);

    const anomalies = await this.prisma.attendance.findMany({
      where: {
        tenantId,
        hasAnomaly: true,
        timestamp: { gte: start, lte: end },
      },
      include: {
        employee: {
          include: {
            department: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // Grouper par département
    const byDepartment = anomalies.reduce((acc, anomaly) => {
      const deptId = anomaly.employee.department?.id || 'unknown';
      const deptName = anomaly.employee.department?.name || 'Non assigné';

      if (!acc[deptId]) {
        acc[deptId] = {
          departmentId: deptId,
          departmentName: deptName,
          total: 0,
          byType: {} as Record<string, number>,
          corrected: 0,
          pending: 0,
        };
      }

      acc[deptId].total++;
      acc[deptId].byType[anomaly.anomalyType || 'UNKNOWN'] =
        (acc[deptId].byType[anomaly.anomalyType || 'UNKNOWN'] || 0) + 1;

      if (anomaly.isCorrected) {
        acc[deptId].corrected++;
      } else {
        acc[deptId].pending++;
      }

      return acc;
    }, {} as Record<string, any>);

    return {
      period: { year, month },
      summary: {
        total: anomalies.length,
        corrected: anomalies.filter(a => a.isCorrected).length,
        pending: anomalies.filter(a => !a.isCorrected).length,
      },
      byDepartment: Object.values(byDepartment),
    };
  }

  /**
   * Détecte les employés avec taux d'anomalies élevé
   * Implémente 3. Analytics et Reporting - Alertes
   */
  async getHighAnomalyRateEmployees(
    tenantId: string,
    threshold: number = 5, // Nombre minimum d'anomalies
    days: number = 30,
  ) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const employees = await this.prisma.employee.findMany({
      where: { tenantId, isActive: true },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        matricule: true,
        department: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Use a single groupBy query instead of N parallel queries to avoid pool exhaustion
    const anomalyCounts = await this.prisma.attendance.groupBy({
      by: ['employeeId'],
      where: {
        tenantId,
        employeeId: { in: employees.map(e => e.id) },
        hasAnomaly: true,
        timestamp: { gte: startDate },
      },
      _count: { id: true },
      having: {
        id: { _count: { gte: threshold } },
      },
    });

    const countMap = new Map(anomalyCounts.map(a => [a.employeeId, a._count.id]));

    return employees
      .filter(e => countMap.has(e.id))
      .map(e => ({
        employeeId: e.id,
        employeeName: `${e.firstName} ${e.lastName}`,
        matricule: e.matricule,
        department: e.department?.name,
        anomalyCount: countMap.get(e.id)!,
        recommendation: this.generateRecommendation(countMap.get(e.id)!),
      }));
  }

  /**
   * Détecte si un pointage est effectué un jour férié
   * Retourne une alerte informative JOUR_FERIE_TRAVAILLE
   */
  private async detectHolidayWork(
    tenantId: string,
    employeeId: string,
    timestamp: Date,
    type: AttendanceType,
  ): Promise<{ hasAnomaly: boolean; type?: string; note?: string }> {
    // Vérifier si c'est un jour férié - CORRECTION: comparer uniquement la date
    const timestampDate = new Date(timestamp);
    const dateOnly = new Date(Date.UTC(
      timestampDate.getFullYear(),
      timestampDate.getMonth(),
      timestampDate.getDate(),
      0, 0, 0, 0
    ));

    console.log(`[detectHolidayWork] Checking ${type} at ${timestamp.toISOString()}, dateOnly: ${dateOnly.toISOString()}`);

    const holiday = await this.prisma.holiday.findFirst({
      where: {
        tenantId,
        date: dateOnly,
      },
    });

    console.log(`[detectHolidayWork] Holiday found: ${holiday ? `${holiday.name} (${holiday.date.toISOString()})` : 'NONE'}`);

    if (!holiday) {
      return { hasAnomaly: false };
    }

    // Récupérer les paramètres de majoration des jours fériés
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
      select: {
        holidayOvertimeEnabled: true,
        holidayOvertimeRate: true,
        holidayOvertimeAsNormalHours: true,
      },
    });

    const holidayOvertimeEnabled = settings?.holidayOvertimeEnabled !== false;

    // Si c'est un OUT et qu'il n'y a pas de planning pour ce jour,
    // vérifier s'il y a un IN la veille (shift de nuit)
    if (type === AttendanceType.OUT) {
      const previousDay = new Date(timestamp);
      previousDay.setDate(previousDay.getDate() - 1);
      previousDay.setHours(0, 0, 0, 0);
      const previousDayEnd = new Date(previousDay);
      previousDayEnd.setHours(23, 59, 59, 999);

      // Vérifier s'il y a un IN la veille
      const inRecord = await this.prisma.attendance.findFirst({
        where: {
          tenantId,
          employeeId,
          type: AttendanceType.IN,
          timestamp: {
            gte: previousDay,
            lte: previousDayEnd,
          },
        },
        orderBy: { timestamp: 'desc' },
      });

      if (inRecord) {
        // Vérifier s'il y a un planning pour la veille (shift de nuit)
        const previousDaySchedule = await this.prisma.schedule.findFirst({
          where: {
            tenantId,
            employeeId,
            date: {
              gte: previousDay,
              lte: previousDayEnd,
            },
            status: 'PUBLISHED',
          },
          include: {
            shift: true,
          },
        });

        if (previousDaySchedule) {
          const expectedEndTime = this.parseTimeString(
            previousDaySchedule.customEndTime || previousDaySchedule.shift.endTime,
          );
          const isNightShift = this.isNightShift(previousDaySchedule.shift, expectedEndTime);

          if (isNightShift) {
            // Calculer les heures travaillées sur le jour férié (de minuit au OUT)
            const midnightHolidayDate = new Date(holiday.date);
            midnightHolidayDate.setHours(0, 0, 0, 0);
            const hoursOnHoliday = (timestamp.getTime() - midnightHolidayDate.getTime()) / (1000 * 60 * 60);
            const hoursDisplay = Math.floor(hoursOnHoliday);
            const minutesDisplay = Math.round((hoursOnHoliday - hoursDisplay) * 60);

            // Message selon la configuration
            let note = `Shift de nuit traversant le jour férié "${holiday.name}" (${holiday.date.toLocaleDateString('fr-FR')}).`;

            if (holidayOvertimeEnabled) {
              note += ` De 00:00 à ${timestamp.getHours().toString().padStart(2, '0')}:${timestamp.getMinutes().toString().padStart(2, '0')} = ${hoursDisplay}h${minutesDisplay.toString().padStart(2, '0')} potentiellement majorées.`;
            }

            return {
              hasAnomaly: true,
              type: 'JOUR_FERIE_TRAVAILLE',
              note,
            };
          }
        }
      }
    }

    // Pointage normal un jour férié
    let note = `Pointage effectué le jour férié "${holiday.name}" (${holiday.date.toLocaleDateString('fr-FR')}).`;

    if (holidayOvertimeEnabled) {
      note += ` Les heures travaillées seront potentiellement majorées.`;
    }

    return {
      hasAnomaly: true,
      type: 'JOUR_FERIE_TRAVAILLE',
      note,
    };
  }

  /**
   * Génère une recommandation basée sur le nombre d'anomalies
   */
  private generateRecommendation(anomalyCount: number): string {
    if (anomalyCount >= 10) {
      return 'Formation urgente requise - Vérifier le badge et le processus de pointage';
    } else if (anomalyCount >= 5) {
      return 'Formation recommandée - Rappel des procédures de pointage';
    } else {
      return 'Surveillance recommandée - Vérifier les patterns récurrents';
    }
  }

  // ============================================
  // GESTION DES ANOMALIES TECHNIQUES
  // ============================================

  /**
   * Crée une anomalie technique dans la base de données
   * Utilisé pour tracker les problèmes de terminal, réseau, etc.
   */
  async createTechnicalAnomaly(
    tenantId: string,
    employeeId: string,
    data: {
      subType: string; // DEVICE_OFFLINE, POWER_OUTAGE, NETWORK_ERROR, BADGE_FAILURE, etc.
      description: string;
      severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      deviceId?: string;
      attendanceId?: string;
      scheduleId?: string;
      occurredAt?: Date;
      metadata?: any;
    },
  ) {
    return this.prisma.attendanceAnomaly.create({
      data: {
        tenantId,
        employeeId,
        type: 'TECHNICAL',
        subType: data.subType,
        description: data.description,
        severity: data.severity || 'MEDIUM',
        occurredAt: data.occurredAt || new Date(),
        deviceId: data.deviceId,
        attendanceId: data.attendanceId,
        scheduleId: data.scheduleId,
        metadata: data.metadata,
        status: 'OPEN',
      },
    });
  }

  /**
   * Détecte et crée des anomalies techniques basées sur les tentatives échouées
   * Appelé périodiquement ou après échec de pointage
   */
  async detectDeviceFailures(tenantId: string, deviceId: string) {
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    // Compter les tentatives échouées sur ce terminal
    const failedAttempts = await this.prisma.attendanceAttempt.findMany({
      where: {
        tenantId,
        deviceId,
        status: 'FAILED',
        timestamp: { gte: oneHourAgo },
      },
      include: {
        employee: true,
      },
    });

    // Si plus de 5 échecs en 1h, c'est probablement un problème technique
    if (failedAttempts.length >= 5) {
      const device = await this.prisma.attendanceDevice.findUnique({
        where: { id: deviceId },
      });

      // Regrouper par employé pour créer des anomalies
      const byEmployee = failedAttempts.reduce((acc, attempt) => {
        if (!acc[attempt.employeeId]) {
          acc[attempt.employeeId] = [];
        }
        acc[attempt.employeeId].push(attempt);
        return acc;
      }, {} as Record<string, typeof failedAttempts>);

      for (const [employeeId, attempts] of Object.entries(byEmployee)) {
        // Vérifier si une anomalie existe déjà pour cet employé/terminal aujourd'hui
        const existingAnomaly = await this.prisma.attendanceAnomaly.findFirst({
          where: {
            tenantId,
            employeeId,
            deviceId,
            type: 'TECHNICAL',
            subType: 'DEVICE_FAILURE',
            detectedAt: { gte: oneHourAgo },
          },
        });

        if (!existingAnomaly) {
          await this.createTechnicalAnomaly(tenantId, employeeId, {
            subType: 'DEVICE_FAILURE',
            description: `${attempts.length} tentatives de pointage échouées sur le terminal "${device?.name || deviceId}". Codes d'erreur: ${[...new Set(attempts.map((a) => a.errorCode))].join(', ')}`,
            severity: attempts.length >= 10 ? 'HIGH' : 'MEDIUM',
            deviceId,
            occurredAt: attempts[0].timestamp,
            metadata: {
              failedAttemptsCount: attempts.length,
              errorCodes: [...new Set(attempts.map((a) => a.errorCode))],
              firstFailure: attempts[attempts.length - 1].timestamp,
              lastFailure: attempts[0].timestamp,
            },
          });
        }
      }
    }
  }

  /**
   * Détecte les terminaux hors ligne et crée des anomalies
   * Appelé par un job périodique
   */
  async detectOfflineDevices(tenantId: string) {
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    // Trouver les terminaux sans heartbeat depuis 1h
    const offlineDevices = await this.prisma.attendanceDevice.findMany({
      where: {
        tenantId,
        isActive: true,
        OR: [
          { lastSync: { lt: oneHourAgo } },
          { lastSync: null },
        ],
      },
    });

    for (const device of offlineDevices) {
      // Trouver les employés qui auraient dû pointer sur ce terminal
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const scheduledEmployees = await this.prisma.schedule.findMany({
        where: {
          tenantId,
          date: today,
          status: 'PUBLISHED',
          employee: {
            siteId: device.siteId,
          },
        },
        include: {
          employee: true,
        },
      });

      for (const schedule of scheduledEmployees) {
        // Vérifier si l'employé a déjà un pointage aujourd'hui
        const hasAttendance = await this.prisma.attendance.findFirst({
          where: {
            tenantId,
            employeeId: schedule.employeeId,
            timestamp: { gte: today },
          },
        });

        if (!hasAttendance) {
          // Vérifier si une anomalie existe déjà
          const existingAnomaly = await this.prisma.attendanceAnomaly.findFirst({
            where: {
              tenantId,
              employeeId: schedule.employeeId,
              deviceId: device.id,
              type: 'TECHNICAL',
              subType: 'DEVICE_OFFLINE',
              detectedAt: { gte: today },
            },
          });

          if (!existingAnomaly) {
            await this.createTechnicalAnomaly(tenantId, schedule.employeeId, {
              subType: 'DEVICE_OFFLINE',
              description: `Le terminal "${device.name}" est hors ligne depuis ${device.lastSync ? device.lastSync.toLocaleString('fr-FR') : 'inconnu'}. L'employé n'a pas pu pointer.`,
              severity: 'HIGH',
              deviceId: device.id,
              scheduleId: schedule.id,
              metadata: {
                deviceName: device.name,
                lastSync: device.lastSync,
                siteId: device.siteId,
              },
            });
          }
        }
      }
    }
  }

  /**
   * Résout une anomalie technique
   */
  async resolveAnomaly(
    anomalyId: string,
    resolvedBy: string,
    resolution: string,
  ) {
    return this.prisma.attendanceAnomaly.update({
      where: { id: anomalyId },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
        resolvedBy,
        resolution,
      },
    });
  }

  /**
   * Récupère les anomalies techniques non résolues
   */
  async getOpenTechnicalAnomalies(tenantId: string, filters?: {
    employeeId?: string;
    deviceId?: string;
    severity?: string;
    limit?: number;
  }) {
    return this.prisma.attendanceAnomaly.findMany({
      where: {
        tenantId,
        type: 'TECHNICAL',
        status: { in: ['OPEN', 'INVESTIGATING'] },
        ...(filters?.employeeId && { employeeId: filters.employeeId }),
        ...(filters?.deviceId && { deviceId: filters.deviceId }),
        ...(filters?.severity && { severity: filters.severity }),
      },
      include: {
        employee: {
          include: {
            user: {
              select: { firstName: true, lastName: true, email: true },
            },
            department: true,
          },
        },
        device: true,
        schedule: { include: { shift: true } },
      },
      orderBy: [
        { severity: 'desc' },
        { detectedAt: 'desc' },
      ],
      take: filters?.limit || 100,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // VALIDATION DES POINTAGES AMBIGUS (SHIFTS DE NUIT)
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Récupère les pointages en attente de validation
   */
  async getPendingValidations(
    tenantId: string,
    userId: string,
    filters?: {
      employeeId?: string;
      dateFrom?: string;
      dateTo?: string;
      limit?: number;
    },
  ) {
    // Vérifier les permissions (manager ou RH)
    const managerLevel = await getManagerLevel(this.prisma, userId, tenantId);
    const managedEmployeeIds = await getManagedEmployeeIds(this.prisma, managerLevel, tenantId);

    const where: any = {
      tenantId,
      validationStatus: 'PENDING_VALIDATION',
      isAmbiguous: true,
    };

    // Si pas admin global, filtrer sur les employés managés
    if (managedEmployeeIds.length > 0) {
      where.employeeId = { in: managedEmployeeIds };
    }

    if (filters?.employeeId) {
      where.employeeId = filters.employeeId;
    }

    if (filters?.dateFrom || filters?.dateTo) {
      where.timestamp = {};
      if (filters.dateFrom) where.timestamp.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.timestamp.lte = new Date(filters.dateTo + 'T23:59:59.999Z');
    }

    return this.prisma.attendance.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            matricule: true,
            firstName: true,
            lastName: true,
            currentShift: { select: { name: true, startTime: true, endTime: true, isNightShift: true } },
          },
        },
        site: { select: { name: true } },
        device: { select: { name: true } },
      },
      orderBy: [
        { escalationLevel: 'desc' },
        { timestamp: 'asc' },
      ],
      take: filters?.limit || 50,
    });
  }

  /**
   * Valide un pointage ambigu (Manager/RH)
   */
  async validateAmbiguousPunch(
    tenantId: string,
    userId: string,
    dto: ValidateAttendanceDto,
  ) {
    // 1. Récupérer le pointage
    const attendance = await this.prisma.attendance.findFirst({
      where: { id: dto.attendanceId, tenantId },
      include: { employee: true },
    });

    if (!attendance) {
      throw new NotFoundException('Pointage non trouvé');
    }

    if (attendance.validationStatus !== 'PENDING_VALIDATION') {
      throw new BadRequestException('Ce pointage n\'est pas en attente de validation');
    }

    // 2. Vérifier les permissions (manager direct ou RH)
    const managerLevel = await getManagerLevel(this.prisma, userId, tenantId);
    const managedEmployeeIds = await getManagedEmployeeIds(this.prisma, managerLevel, tenantId);
    const canValidate = managedEmployeeIds.includes(attendance.employeeId) || !managerLevel.type;

    if (!canValidate) {
      throw new ForbiddenException('Vous n\'avez pas la permission de valider ce pointage');
    }

    // 3. Effectuer la validation selon l'action
    const now = new Date();
    let updateData: any = {
      validatedBy: userId,
      validatedAt: now,
    };

    switch (dto.action) {
      case ValidationAction.VALIDATE:
        // Garder le type actuel, marquer comme validé
        updateData.validationStatus = 'VALIDATED';
        updateData.isAmbiguous = false;
        updateData.hasAnomaly = false;
        updateData.anomalyType = null;
        updateData.anomalyNote = `Validé par manager/RH: ${dto.validationNote || 'Aucune note'}`;
        break;

      case ValidationAction.REJECT:
        // Marquer comme rejeté (pointage erroné)
        updateData.validationStatus = 'REJECTED';
        updateData.hasAnomaly = true;
        updateData.anomalyType = 'REJECTED_PUNCH';
        updateData.anomalyNote = `Rejeté: ${dto.validationNote || 'Pointage invalide'}`;
        break;

      case ValidationAction.CORRECT:
        // Corriger le type et valider
        if (!dto.correctedType) {
          throw new BadRequestException('Type corrigé requis pour l\'action CORRECT');
        }
        updateData.validationStatus = 'VALIDATED';
        updateData.isAmbiguous = false;
        updateData.hasAnomaly = false;
        updateData.anomalyType = null;
        updateData.type = dto.correctedType;
        updateData.isCorrected = true;
        updateData.correctedBy = userId;
        updateData.correctedAt = now;
        updateData.correctionNote = `Corrigé de ${attendance.type} vers ${dto.correctedType}: ${dto.validationNote || ''}`;
        break;
    }

    // 4. Mettre à jour le pointage
    const updated = await this.prisma.attendance.update({
      where: { id: dto.attendanceId },
      data: updateData,
      include: {
        employee: { select: { matricule: true, firstName: true, lastName: true } },
      },
    });

    console.log(`✅ [VALIDATION] Pointage ${dto.attendanceId} ${dto.action} par ${userId}`);

    return {
      success: true,
      attendance: updated,
      action: dto.action,
      message: `Pointage ${dto.action === ValidationAction.VALIDATE ? 'validé' : dto.action === ValidationAction.REJECT ? 'rejeté' : 'corrigé'} avec succès`,
    };
  }

  /**
   * Validation en masse de pointages ambigus
   */
  async bulkValidateAmbiguousPunches(
    tenantId: string,
    userId: string,
    dtos: ValidateAttendanceDto[],
  ) {
    const results = [];
    const errors = [];

    for (const dto of dtos) {
      try {
        const result = await this.validateAmbiguousPunch(tenantId, userId, dto);
        results.push(result);
      } catch (error) {
        errors.push({
          attendanceId: dto.attendanceId,
          error: error.message,
        });
      }
    }

    return {
      success: errors.length === 0,
      validated: results.length,
      errors: errors.length,
      results,
      errorDetails: errors,
    };
  }

  /**
   * Escalade des pointages non validés après délai
   * Appelé par un job CRON - Utilise les paramètres configurables
   */
  async escalatePendingValidations(tenantId: string) {
    // Récupérer les paramètres d'escalade configurables
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
      select: {
        ambiguousPunchEscalationEnabled: true,
        ambiguousPunchEscalationLevel1Hours: true,
        ambiguousPunchEscalationLevel2Hours: true,
        ambiguousPunchEscalationLevel3Hours: true,
        ambiguousPunchNotifyManager: true,
        ambiguousPunchNotifyHR: true,
        ambiguousPunchNotifyEmployee: true,
      },
    });

    // Vérifier si l'escalade est activée
    if (settings?.ambiguousPunchEscalationEnabled === false) {
      console.log(`⚠️ [ESCALADE] Escalade désactivée pour tenant ${tenantId}`);
      return {
        processed: 0,
        escalated: 0,
        escalations: [],
        message: 'Escalade désactivée dans les paramètres',
      };
    }

    const now = new Date();

    // Utiliser les paramètres configurables (avec valeurs par défaut)
    const HOURS_LEVEL1 = (settings?.ambiguousPunchEscalationLevel1Hours ?? 24) * 60 * 60 * 1000;
    const HOURS_LEVEL2 = (settings?.ambiguousPunchEscalationLevel2Hours ?? 48) * 60 * 60 * 1000;
    const HOURS_LEVEL3 = (settings?.ambiguousPunchEscalationLevel3Hours ?? 72) * 60 * 60 * 1000;

    // Récupérer les pointages en attente
    const pendingPunches = await this.prisma.attendance.findMany({
      where: {
        tenantId,
        validationStatus: 'PENDING_VALIDATION',
        isAmbiguous: true,
      },
      include: {
        employee: {
          select: {
            id: true,
            matricule: true,
            firstName: true,
            lastName: true,
            email: true,
            department: {
              select: {
                managerId: true,
                manager: { select: { user: { select: { email: true } } } },
              },
            },
          },
        },
      },
    });

    const escalations = [];

    for (const punch of pendingPunches) {
      const ageMs = now.getTime() - punch.createdAt.getTime();
      let newLevel = punch.escalationLevel;

      // Déterminer le niveau d'escalade selon les paramètres configurés
      if (ageMs >= HOURS_LEVEL3 && punch.escalationLevel < 3) {
        newLevel = 3; // Escalade finale à direction
      } else if (ageMs >= HOURS_LEVEL2 && punch.escalationLevel < 2) {
        newLevel = 2; // Escalade à RH
      } else if (ageMs >= HOURS_LEVEL1 && punch.escalationLevel < 1) {
        newLevel = 1; // Rappel au manager
      }

      if (newLevel > punch.escalationLevel) {
        await this.prisma.attendance.update({
          where: { id: punch.id },
          data: { escalationLevel: newLevel },
        });

        const escalation = {
          attendanceId: punch.id,
          employeeId: punch.employeeId,
          employee: `${punch.employee.firstName} ${punch.employee.lastName}`,
          employeeEmail: punch.employee.email,
          managerEmail: punch.employee.department?.manager?.user?.email,
          oldLevel: punch.escalationLevel,
          newLevel,
          ageHours: Math.round(ageMs / (60 * 60 * 1000)),
          timestamp: punch.timestamp,
          ambiguityReason: punch.ambiguityReason,
          notifySettings: {
            notifyManager: settings?.ambiguousPunchNotifyManager ?? true,
            notifyHR: settings?.ambiguousPunchNotifyHR ?? true,
            notifyEmployee: settings?.ambiguousPunchNotifyEmployee ?? false,
          },
        };

        escalations.push(escalation);

        console.log(`⏫ [ESCALADE] Pointage ${punch.id} escaladé de niveau ${punch.escalationLevel} à ${newLevel} (${escalation.employee})`);
      }
    }

    return {
      processed: pendingPunches.length,
      escalated: escalations.length,
      escalations,
      settings: {
        level1Hours: settings?.ambiguousPunchEscalationLevel1Hours ?? 24,
        level2Hours: settings?.ambiguousPunchEscalationLevel2Hours ?? 48,
        level3Hours: settings?.ambiguousPunchEscalationLevel3Hours ?? 72,
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // NOUVEAU: TRAITEMENT AVEC STATE DU TERMINAL (19/01/2026)
  // SOLUTION FINALE - AUCUNE DÉDUCTION
  // Le type IN/OUT vient DIRECTEMENT du terminal via le champ state
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Traite un pointage avec STATE du terminal ZKTeco
   *
   * PHILOSOPHIE: Le terminal envoie le type IN/OUT via le champ state.
   * Le backend NE DÉDUIT PLUS le type - il le reçoit et l'utilise directement.
   *
   * Mapping STATE → TYPE (standard ZKTeco):
   * - state 0 = IN  (Check-In)
   * - state 1 = OUT (Check-Out)
   * - state 2 = OUT (Break-Out)
   * - state 3 = IN  (Break-In)
   * - state 4 = IN  (OT-In)
   * - state 5 = OUT (OT-Out)
   *
   * @param tenantId ID du tenant
   * @param deviceId ID du terminal
   * @param webhookData Données avec state du terminal
   * @param apiKey Clé API optionnelle
   */
  async processTerminalPunch(
    tenantId: string,
    deviceId: string,
    webhookData: WebhookStateDto,
    apiKey?: string,
  ): Promise<WebhookStateResponseDto> {
    const startTime = Date.now();

    console.log(`\n═══════════════════════════════════════════════════════════════`);
    console.log(`📥 [TERMINAL-STATE] Pointage reçu avec STATE natif`);
    console.log(`   Matricule: ${webhookData.employeeId}`);
    console.log(`   Type: ${webhookData.type} (state=${webhookData.terminalState})`);
    console.log(`   Timestamp: ${webhookData.timestamp}`);
    console.log(`═══════════════════════════════════════════════════════════════\n`);

    try {
      // 1. VÉRIFIER LE TERMINAL
      const device = await this.prisma.attendanceDevice.findFirst({
        where: { deviceId, tenantId },
        select: { id: true, apiKey: true, siteId: true, isActive: true },
      });

      if (!device) {
        console.log(`❌ [TERMINAL-STATE] Terminal non trouvé: ${deviceId}`);
        return {
          status: 'ERROR',
          error: `Terminal non trouvé: ${deviceId}`,
          duration: Date.now() - startTime,
        };
      }

      if (!device.isActive) {
        console.log(`❌ [TERMINAL-STATE] Terminal inactif: ${deviceId}`);
        return {
          status: 'ERROR',
          error: `Terminal inactif: ${deviceId}`,
          duration: Date.now() - startTime,
        };
      }

      // Validation API Key si configurée
      if (device.apiKey && apiKey && device.apiKey !== apiKey) {
        console.log(`❌ [TERMINAL-STATE] API Key invalide`);
        return {
          status: 'ERROR',
          error: 'API Key invalide',
          duration: Date.now() - startTime,
        };
      }

      // 2. TROUVER L'EMPLOYÉ (par matricule)
      let employee = await findEmployeeByMatriculeFlexible(
        this.prisma,
        tenantId,
        webhookData.employeeId,
      );

      // Chercher aussi dans le mapping terminal si non trouvé
      if (!employee) {
        const mapping = await this.prisma.terminalMatriculeMapping.findFirst({
          where: {
            tenantId,
            terminalMatricule: webhookData.employeeId,
            isActive: true,
          },
          include: { employee: true },
        });
        if (mapping) {
          employee = mapping.employee;
          console.log(`   ✅ Employé trouvé via mapping: ${mapping.terminalMatricule} → ${employee.matricule}`);
        }
      }

      if (!employee) {
        console.log(`❌ [TERMINAL-STATE] Employé non trouvé: ${webhookData.employeeId}`);
        return {
          status: 'ERROR',
          error: `Employé non trouvé: ${webhookData.employeeId}`,
          duration: Date.now() - startTime,
        };
      }

      console.log(`   ✅ Employé: ${employee.firstName} ${employee.lastName} (${employee.matricule})`);

      const punchTime = new Date(webhookData.timestamp);

      // Récupérer les settings du tenant pour la tolérance anti-doublon et les jours ouvrables
      const tenantSettings = await this.prisma.tenantSettings.findUnique({
        where: { tenantId },
        select: { doublePunchToleranceMinutes: true, workingDays: true },
      });
      const toleranceMinutes = tenantSettings?.doublePunchToleranceMinutes ?? 4; // Défaut: 4 minutes
      const workingDays = (tenantSettings?.workingDays as number[]) || [1, 2, 3, 4, 5]; // Défaut: Lundi-Vendredi
      const toleranceMs = toleranceMinutes * 60 * 1000;

      // 3. ANTI-DOUBLON (même employé, même timestamp ± tolérance configurée)
      const existingPunch = await this.prisma.attendance.findFirst({
        where: {
          tenantId,
          employeeId: employee.id,
          timestamp: {
            gte: new Date(punchTime.getTime() - toleranceMs),
            lte: new Date(punchTime.getTime() + toleranceMs),
          },
          type: webhookData.type,
        },
        select: { id: true },
      });

      if (existingPunch) {
        console.log(`⚠️ [TERMINAL-STATE] Doublon détecté: ${existingPunch.id} (tolérance: ${toleranceMinutes} min)`);

        // Créer un enregistrement informatif DEBOUNCE_BLOCKED (visible dans l'interface anomalies)
        const debounceRecord = await this.prisma.attendance.create({
          data: {
            tenantId,
            employeeId: employee.id,
            deviceId: device.id,
            siteId: device.siteId,
            timestamp: punchTime,
            type: webhookData.type,
            terminalState: webhookData.terminalState,
            method: webhookData.method || 'FINGERPRINT',
            source: webhookData.source || 'TERMINAL',
            detectionMethod: 'TERMINAL_STATE',
            hasAnomaly: true,
            anomalyType: 'DEBOUNCE_BLOCKED',
            isCorrected: true, // Marqué comme traité (informatif, pas de correction nécessaire)
            correctionNote: `Doublon du pointage ${existingPunch.id} (tolérance: ${toleranceMinutes} min)`,
            validationStatus: 'NONE',
            rawData: {
              terminalState: webhookData.terminalState,
              source: 'TERMINAL_STATE_WEBHOOK',
              processedAt: new Date().toISOString(),
              duplicateOf: existingPunch.id,
              toleranceMinutes,
            },
          },
        });

        console.log(`   📝 Enregistré comme DEBOUNCE_BLOCKED: ${debounceRecord.id}`);

        return {
          status: 'DEBOUNCE_BLOCKED',
          id: debounceRecord.id,
          existingId: existingPunch.id,
          duration: Date.now() - startTime,
        };
      }

      // 4. ENRICHISSEMENT MÉTIER
      const schedule = await this.getScheduleWithFallback(tenantId, employee.id, punchTime);
      const shift = schedule?.shift as {
        id: string;
        name: string;
        startTime: string;
        endTime: string;
        isNightShift?: boolean;
        breakDuration?: number;
      } | null;

      // Vérifier jour férié
      const punchDate = punchTime.toISOString().split('T')[0];
      const holiday = await this.prisma.holiday.findFirst({
        where: {
          tenantId,
          date: new Date(punchDate),
        },
      });
      const isHoliday = !!holiday;

      // Vérifier congé
      const leave = await this.prisma.leave.findFirst({
        where: {
          tenantId,
          employeeId: employee.id,
          status: { in: ['APPROVED', 'MANAGER_APPROVED', 'HR_APPROVED'] },
          startDate: { lte: new Date(punchDate) },
          endDate: { gte: new Date(punchDate) },
        },
      });
      const isOnLeave = !!leave;

      console.log(`   📋 Shift: ${shift?.name || 'Aucun'} (${shift?.startTime || '-'} → ${shift?.endTime || '-'})`);
      console.log(`   📅 Jour férié: ${isHoliday ? 'OUI' : 'Non'}, En congé: ${isOnLeave ? 'OUI' : 'Non'}`);

      // 4.1. VÉRIFICATION JOUR OUVRABLE (WEEKEND CHECK)
      // Si c'est un jour non ouvrable ET que le schedule est virtuel (pas de planning explicite)
      const dayOfWeek = punchTime.getDay(); // 0 = Dimanche, 1 = Lundi, etc.
      const normalizedDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek; // Normaliser dimanche à 7
      const isWorkingDay = workingDays.includes(normalizedDayOfWeek);
      const isVirtualSchedule = schedule?.id === 'virtual';
      const dayNames = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
      const dayName = dayNames[dayOfWeek];

      console.log(`   📆 Jour: ${dayName} (${normalizedDayOfWeek}), Ouvrable: ${isWorkingDay ? 'OUI' : 'NON'}, Planning explicite: ${!isVirtualSchedule ? 'OUI' : 'NON (virtuel)'}`);

      // 5. CALCUL ANOMALIE (basé sur le type RÉEL du terminal)
      let anomalyType: string | null = null;
      let anomalyMinutes: number | null = null;
      let lateMinutes: number | null = null;
      let earlyLeaveMinutes: number | null = null;
      let overtimeMinutes: number | null = null;

      // Variables pour DOUBLE_IN (déclarées ici pour être accessibles dans la persistance)
      let isDoubleIn = false;
      let firstInTime: Date | null = null;

      // Variable pour MISSING_IN (OUT sans IN préalable)
      let isMissingIn = false;

      // Variable pour auto-correction mauvais bouton
      let isAutoCorrectedWrongType = false;
      let effectiveType = webhookData.type; // Type effectif (potentiellement corrigé)

      // ═══════════════════════════════════════════════════════════════
      // DÉTECTION PRÉCOCE MAUVAIS BOUTON:
      // Si OUT reçu proche de l'heure de début du shift → auto-inverser en IN
      // Cela évite la cascade MISSING_IN + DOUBLE_OUT + heures sup absurdes
      // ═══════════════════════════════════════════════════════════════
      if (webhookData.type === 'OUT' && shift?.startTime) {
        // Convertir en heure locale (UTC+1 pour le Maroc)
        const localPunchTime = new Date(punchTime.getTime() + 60 * 60 * 1000);
        const punchMins = localPunchTime.getUTCHours() * 60 + localPunchTime.getUTCMinutes();
        const shiftStartParts = shift.startTime.split(':');
        const shiftStartMins = parseInt(shiftStartParts[0]) * 60 + parseInt(shiftStartParts[1] || '0');
        const diffFromStart = Math.abs(punchMins - shiftStartMins);
        const diffFromStartWrapped = Math.min(diffFromStart, 24 * 60 - diffFromStart);

        if (diffFromStartWrapped <= 150) {
          // Vérifier qu'il n'y a PAS déjà un IN récent VALIDE (pour éviter de corriger une vraie sortie)
          // Exclure les IN auto-corrigés récents (double-appui mauvais bouton)
          const recentIn = await this.prisma.attendance.findFirst({
            where: {
              tenantId,
              employeeId: employee.id,
              type: 'IN',
              timestamp: {
                gte: new Date(punchTime.getTime() - 16 * 60 * 60 * 1000),
                lt: punchTime,
              },
              OR: [
                { anomalyType: null },
                { anomalyType: { notIn: ['DOUBLE_IN', 'DEBOUNCE_BLOCKED', 'AUTO_CORRECTED_WRONG_TYPE'] } },
              ],
            },
            orderBy: { timestamp: 'desc' },
          });

          if (!recentIn) {
            // Pas d'IN récent → c'est un mauvais bouton, auto-corriger OUT→IN
            isAutoCorrectedWrongType = true;
            effectiveType = 'IN';
            console.log(`   🔄 AUTO-CORRECTION: OUT→IN (bouton OUT à ${diffFromStartWrapped} min du début shift ${shift.startTime}, pas d'IN récent). En attente validation manager.`);
          } else {
            // Il y a un IN récent, mais si c'est dans la tolérance double badgeage c'est un double-appui (IN puis OUT par erreur)
            const timeSinceIn = punchTime.getTime() - recentIn.timestamp.getTime();
            const minutesSinceIn = timeSinceIn / (60 * 1000);
            if (minutesSinceIn <= toleranceMinutes) {
              isAutoCorrectedWrongType = true;
              effectiveType = 'IN';
              console.log(`   🔄 AUTO-CORRECTION: OUT→IN (OUT à ${minutesSinceIn.toFixed(1)} min après IN, tolérance double badgeage: ${toleranceMinutes} min, près du début shift ${shift.startTime}).`);
            }
          }
        }
      }

      // ═══════════════════════════════════════════════════════════════
      // DÉTECTION INVERSE MAUVAIS BOUTON:
      // Si IN reçu proche de l'heure de FIN du shift → auto-inverser en OUT
      // Cas: employé quitte son poste mais appuie sur IN au lieu de OUT
      // ═══════════════════════════════════════════════════════════════
      if (!isAutoCorrectedWrongType && webhookData.type === 'IN' && shift?.endTime) {
        // Convertir en heure locale (UTC+1 pour le Maroc)
        const localPunchTime2 = new Date(punchTime.getTime() + 60 * 60 * 1000);
        const punchMins = localPunchTime2.getUTCHours() * 60 + localPunchTime2.getUTCMinutes();
        const shiftEndParts = shift.endTime.split(':');
        const shiftEndMins = parseInt(shiftEndParts[0]) * 60 + parseInt(shiftEndParts[1] || '0');
        const diffFromEnd = Math.abs(punchMins - shiftEndMins);
        const diffFromEndWrapped = Math.min(diffFromEnd, 24 * 60 - diffFromEnd);

        if (diffFromEndWrapped <= 150) {
          // Vérifier qu'il y a un IN récent VALIDE (l'employé est bien entré avant)
          const recentIn = await this.prisma.attendance.findFirst({
            where: {
              tenantId,
              employeeId: employee.id,
              type: 'IN',
              timestamp: {
                gte: new Date(punchTime.getTime() - 16 * 60 * 60 * 1000),
                lt: punchTime,
              },
              OR: [
                { anomalyType: null },
                { anomalyType: { notIn: ['DOUBLE_IN', 'DEBOUNCE_BLOCKED', 'AUTO_CORRECTED_WRONG_TYPE'] } },
              ],
            },
            orderBy: { timestamp: 'desc' },
          });

          if (recentIn) {
            // Il y a un IN valide récent → cet IN est un mauvais bouton, auto-corriger IN→OUT
            isAutoCorrectedWrongType = true;
            effectiveType = 'OUT';
            console.log(`   🔄 AUTO-CORRECTION: IN→OUT (bouton IN à ${diffFromEndWrapped} min de la fin shift ${shift.endTime}). En attente validation manager.`);
          } else {
            // Pas d'IN récent, mais vérifier s'il y a un OUT récent dans la tolérance double badgeage (double-appui OUT puis IN)
            const recentOut = await this.prisma.attendance.findFirst({
              where: {
                tenantId,
                employeeId: employee.id,
                type: 'OUT',
                timestamp: {
                  gte: new Date(punchTime.getTime() - toleranceMs),
                  lt: punchTime,
                },
              },
              orderBy: { timestamp: 'desc' },
            });
            if (recentOut) {
              isAutoCorrectedWrongType = true;
              effectiveType = 'OUT';
              const minutesSinceOut = (punchTime.getTime() - recentOut.timestamp.getTime()) / (60 * 1000);
              console.log(`   🔄 AUTO-CORRECTION: IN→OUT (IN à ${minutesSinceOut.toFixed(1)} min après OUT, tolérance double badgeage: ${toleranceMinutes} min, près de la fin shift ${shift.endTime}).`);
            }
          }
        }
      }

      // WEEKEND_WORK et HOLIDAY_WORKED ne doivent être détectés que sur les ENTRÉES (IN)
      // Un OUT sur un weekend/férié = fin de shift, pas une nouvelle anomalie
      if (effectiveType === 'IN') {
        if (isHoliday && !isOnLeave) {
          anomalyType = 'HOLIDAY_WORKED';
        } else if (isOnLeave) {
          anomalyType = 'LEAVE_BUT_PRESENT';
        } else if (!isWorkingDay && isVirtualSchedule) {
          anomalyType = 'WEEKEND_WORK';
          console.log(`   ⚠️ Anomalie WEEKEND_WORK: pointage IN le ${dayName} sans planning explicite`);
        }
      }

      if (!anomalyType && shift) {
        const punchMinutes = punchTime.getHours() * 60 + punchTime.getMinutes();
        const [startH, startM] = shift.startTime.split(':').map(Number);
        const [endH, endM] = shift.endTime.split(':').map(Number);
        const shiftStartMinutes = startH * 60 + startM;
        let shiftEndMinutes = endH * 60 + endM;

        // Ajustement shift nuit
        if (shift.isNightShift && shiftEndMinutes < shiftStartMinutes) {
          shiftEndMinutes += 1440; // +24h
        }

        // Récupérer les seuils du tenant
        const settings = await this.prisma.tenantSettings.findUnique({
          where: { tenantId },
          select: {
            lateToleranceEntry: true,
            earlyToleranceExit: true,
            overtimeMinimumThreshold: true,
          },
        });

        const lateThreshold = settings?.lateToleranceEntry ?? 10;
        const earlyThreshold = settings?.earlyToleranceExit ?? 5;
        const overtimeThreshold = settings?.overtimeMinimumThreshold ?? 30;

        if (effectiveType === 'IN') {
          const punchDate = punchTime.toISOString().split('T')[0];

          // ═══════════════════════════════════════════════════════════════
          // MISSING_OUT: Vérifier s'il y a un IN précédent (jours passés) sans OUT
          // ═══════════════════════════════════════════════════════════════
          const threeDaysAgo = new Date(punchTime);
          threeDaysAgo.setDate(threeDaysAgo.getDate() - 3); // Chercher sur 3 jours max

          const unclosedPreviousIn = await this.prisma.attendance.findFirst({
            where: {
              tenantId,
              employeeId: employee.id,
              type: 'IN',
              timestamp: {
                gte: threeDaysAgo,
                lt: new Date(punchDate + 'T00:00:00Z'), // Avant aujourd'hui
              },
              OR: [
                { anomalyType: null },
                { anomalyType: { notIn: ['MISSING_OUT', 'DOUBLE_IN', 'DEBOUNCE_BLOCKED'] } },
              ],
            },
            orderBy: { timestamp: 'desc' }, // Le plus récent d'abord
          });

          if (unclosedPreviousIn) {
            // FIX 30/01/2026: Ne PAS exclure les OUT marqués MISSING_IN — ce sont
            // des sorties valides pour les sessions nuit cross-day
            const hasOutAfter = await this.prisma.attendance.findFirst({
              where: {
                tenantId,
                employeeId: employee.id,
                type: 'OUT',
                timestamp: {
                  gt: unclosedPreviousIn.timestamp,
                },
                OR: [
                  { anomalyType: null },
                  { anomalyType: { notIn: ['DOUBLE_OUT', 'DEBOUNCE_BLOCKED'] } },
                ],
              },
            });

            if (hasOutAfter) {
              // Un OUT existe après cet ancien IN → session fermée (probablement cross-day nuit)
              // Nettoyer les anomalies si elles avaient été posées
              if (unclosedPreviousIn.anomalyType === 'MISSING_OUT') {
                await this.prisma.attendance.update({
                  where: { id: unclosedPreviousIn.id },
                  data: { hasAnomaly: false, anomalyType: null, anomalyNote: null },
                });
                console.log(`   🧹 Nettoyage MISSING_OUT: IN du ${unclosedPreviousIn.timestamp.toISOString()} fermé par OUT du ${hasOutAfter.timestamp.toISOString()}`);
              }
              if (hasOutAfter.anomalyType === 'MISSING_IN') {
                await this.prisma.attendance.update({
                  where: { id: hasOutAfter.id },
                  data: { hasAnomaly: false, anomalyType: null, anomalyNote: null },
                });
                console.log(`   🧹 Nettoyage MISSING_IN: OUT du ${hasOutAfter.timestamp.toISOString()} pairé avec IN du ${unclosedPreviousIn.timestamp.toISOString()}`);
              }
            } else {
              // Pas de OUT après ce IN → vrai MISSING_OUT
              const inDate = unclosedPreviousIn.timestamp;
              const inDateStr = inDate.toISOString().split('T')[0];

              const oldSchedule = await this.getScheduleWithFallback(tenantId, employee.id, inDate);
              const oldShift = oldSchedule?.shift as { endTime: string; isNightShift?: boolean } | null;

              let shiftEnded = true;

              if (oldShift) {
                const [endH, endM] = oldShift.endTime.split(':').map(Number);
                let expectedEndTime = new Date(inDateStr + 'T00:00:00Z');
                expectedEndTime.setUTCHours(endH, endM, 0, 0);

                if (oldShift.isNightShift) {
                  expectedEndTime.setDate(expectedEndTime.getDate() + 1);
                }

                const bufferMs = 2 * 60 * 60 * 1000;
                shiftEnded = punchTime.getTime() > (expectedEndTime.getTime() + bufferMs);
              }

              if (shiftEnded) {
                await this.prisma.attendance.update({
                  where: { id: unclosedPreviousIn.id },
                  data: {
                    hasAnomaly: true,
                    anomalyType: 'MISSING_OUT',
                    isCorrected: false,
                    anomalyNote: `Entrée du ${inDate.toLocaleDateString('fr-FR')} sans sortie. Veuillez ajouter l'heure de sortie manuellement.`,
                  },
                });
                console.log(`   ⚠️ MISSING_OUT détecté: IN du ${inDate.toLocaleDateString('fr-FR')} à ${inDate.toLocaleTimeString('fr-FR')} sans OUT`);
              }
            }
          }

          // ═══════════════════════════════════════════════════════════════
          // DOUBLE_IN: Vérifier s'il existe déjà une entrée
          // FIX 31/01/2026: Pour les shifts nuit, chercher dans les 16h
          // précédentes (pas seulement le même jour calendaire)
          // ═══════════════════════════════════════════════════════════════
          const isNightShiftForDoubleIn = shift?.isNightShift === true || (shift && shift.startTime > shift.endTime);
          const doubleInSearchFrom = isNightShiftForDoubleIn
            ? new Date(punchTime.getTime() - 16 * 60 * 60 * 1000) // 16h avant pour shift nuit
            : new Date(punchDate + 'T00:00:00Z');                  // même jour pour shift jour

          const existingIn = await this.prisma.attendance.findFirst({
            where: {
              tenantId,
              employeeId: employee.id,
              type: 'IN',
              timestamp: {
                gte: doubleInSearchFrom,
                lt: punchTime,
              },
              OR: [
                { anomalyType: null },
                { anomalyType: { notIn: ['DOUBLE_IN', 'DEBOUNCE_BLOCKED'] } },
              ],
            },
            orderBy: { timestamp: 'asc' }, // Premier IN (le plus ancien)
          });

          if (existingIn) {
            // Vérifier s'il y a un OUT entre l'ancien IN et le nouveau IN
            const hasOutBetween = await this.prisma.attendance.findFirst({
              where: {
                tenantId,
                employeeId: employee.id,
                type: 'OUT',
                timestamp: {
                  gt: existingIn.timestamp,
                  lt: punchTime,
                },
                OR: [
                  { anomalyType: null },
                  { anomalyType: { notIn: ['DOUBLE_OUT', 'DEBOUNCE_BLOCKED'] } },
                ],
              },
            });

            if (!hasOutBetween) {
              // Pas de OUT entre les deux IN → le NOUVEAU IN est un DOUBLE_IN
              // On garde le PREMIER IN comme valide (heure d'arrivée réelle)
              isDoubleIn = true;
              firstInTime = existingIn.timestamp;
              console.log(`   📝 Nouveau pointage sera marqué comme DOUBLE_IN (première entrée: ${existingIn.timestamp.toLocaleTimeString('fr-FR')})`);
            }
          }

          // RETARD = IN après début shift + tolérance
          const late = punchMinutes - shiftStartMinutes;
          if (late > lateThreshold) {
            anomalyType = 'LATE';
            lateMinutes = late;
            anomalyMinutes = late;
            console.log(`   ⚠️ Anomalie: RETARD de ${late} min`);
          }
        }

        if (effectiveType === 'OUT') {
          const punchDate = punchTime.toISOString().split('T')[0];

          // ═══════════════════════════════════════════════════════════════
          // MISSING_IN: Vérifier s'il existe une entrée pour cet employé
          // FIX 30/01/2026: Pour les shifts nuit, chercher dans les 16h
          // précédentes (pas seulement le même jour calendaire)
          // ═══════════════════════════════════════════════════════════════
          const isNight = shift?.isNightShift === true || (shift && shift.startTime > shift.endTime);

          let existingIn: any = null;

          if (isNight) {
            // Shift nuit: chercher IN dans les 16h avant ce OUT
            const searchFrom = new Date(punchTime.getTime() - 16 * 60 * 60 * 1000);
            existingIn = await this.prisma.attendance.findFirst({
              where: {
                tenantId,
                employeeId: employee.id,
                type: 'IN',
                timestamp: { gte: searchFrom, lt: punchTime },
                OR: [
                  { anomalyType: null },
                  { anomalyType: { notIn: ['DOUBLE_IN', 'DEBOUNCE_BLOCKED'] } },
                ],
              },
              orderBy: { timestamp: 'desc' },
            });
            if (existingIn) {
              console.log(`   ✅ Session nuit cross-day: IN trouvé le ${existingIn.timestamp.toISOString()} pour OUT du ${punchTime.toISOString()}`);
            }
          } else {
            // Shift jour: chercher IN le même jour calendaire (logique originale)
            existingIn = await this.prisma.attendance.findFirst({
              where: {
                tenantId,
                employeeId: employee.id,
                type: 'IN',
                timestamp: {
                  gte: new Date(punchDate + 'T00:00:00Z'),
                  lt: new Date(punchDate + 'T23:59:59Z'),
                },
                OR: [
                  { anomalyType: null },
                  { anomalyType: { notIn: ['DOUBLE_IN', 'DEBOUNCE_BLOCKED'] } },
                ],
              },
            });
          }

          if (!existingIn) {
            // ═══════════════════════════════════════════════════════════════
            // Pas de IN trouvé. Avant de marquer MISSING_IN, vérifier s'il
            // y a un ancien IN non-fermé que ce OUT peut fermer (cross-day)
            // ═══════════════════════════════════════════════════════════════
            const sixteenHoursAgo = new Date(punchTime.getTime() - 16 * 60 * 60 * 1000);

            const unclosedPreviousIn = await this.prisma.attendance.findFirst({
              where: {
                tenantId,
                employeeId: employee.id,
                type: 'IN',
                timestamp: {
                  gte: sixteenHoursAgo,
                  lt: new Date(punchDate + 'T00:00:00Z'),
                },
              },
              orderBy: { timestamp: 'desc' },
            });

            if (unclosedPreviousIn) {
              // Trouvé un IN récent (< 16h) d'un jour précédent → session nuit cross-day
              // Ce OUT ferme cet ancien IN → PAS de MISSING_IN
              console.log(`   ✅ Pairage cross-day: OUT ${punchTime.toISOString()} ferme IN ${unclosedPreviousIn.timestamp.toISOString()}`);

              // Nettoyer l'anomalie MISSING_OUT si elle avait été posée sur cet ancien IN
              if (unclosedPreviousIn.anomalyType === 'MISSING_OUT') {
                await this.prisma.attendance.update({
                  where: { id: unclosedPreviousIn.id },
                  data: {
                    hasAnomaly: false,
                    anomalyType: null,
                    anomalyNote: null,
                  },
                });
                console.log(`   🧹 Nettoyage MISSING_OUT sur IN du ${unclosedPreviousIn.timestamp.toISOString()}`);
              }
            } else {
              // Pas de IN récent cross-day non plus → vrai MISSING_IN
              isMissingIn = true;
              console.log(`   ⚠️ MISSING_IN détecté: Aucune entrée trouvée (même jour ni cross-day)`);

              // Vérifier aussi s'il y a un ancien IN (> 16h) sans OUT → vrai MISSING_OUT
              const threeDaysAgo = new Date(punchTime);
              threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

              const oldUnclosedIn = await this.prisma.attendance.findFirst({
                where: {
                  tenantId,
                  employeeId: employee.id,
                  type: 'IN',
                  timestamp: {
                    gte: threeDaysAgo,
                    lt: sixteenHoursAgo,
                  },
                  OR: [
                    { anomalyType: null },
                    { anomalyType: { notIn: ['MISSING_OUT', 'DOUBLE_IN', 'DEBOUNCE_BLOCKED'] } },
                  ],
                },
                orderBy: { timestamp: 'desc' },
              });

              if (oldUnclosedIn) {
                const hasOutAfter = await this.prisma.attendance.findFirst({
                  where: {
                    tenantId,
                    employeeId: employee.id,
                    type: 'OUT',
                    timestamp: { gt: oldUnclosedIn.timestamp, lt: punchTime },
                  },
                });

                if (!hasOutAfter) {
                  const inDate = oldUnclosedIn.timestamp;
                  await this.prisma.attendance.update({
                    where: { id: oldUnclosedIn.id },
                    data: {
                      hasAnomaly: true,
                      anomalyType: 'MISSING_OUT',
                      isCorrected: false,
                      anomalyNote: `Entrée du ${inDate.toLocaleDateString('fr-FR')} sans sortie. Veuillez ajouter l'heure de sortie manuellement.`,
                    },
                  });
                  console.log(`   ⚠️ MISSING_OUT détecté: IN du ${inDate.toLocaleDateString('fr-FR')} à ${inDate.toLocaleTimeString('fr-FR')} sans OUT (> 16h)`);
                }
              }
            }
          }

          // Vérifier s'il existe déjà une sortie pour cet employé aujourd'hui (DOUBLE_OUT)
          const existingOut = await this.prisma.attendance.findFirst({
            where: {
              tenantId,
              employeeId: employee.id,
              type: 'OUT',
              timestamp: {
                gte: new Date(punchDate + 'T00:00:00'),
                lt: new Date(punchDate + 'T23:59:59'),
              },
            },
            orderBy: { timestamp: 'desc' },
          });

          if (existingOut) {
            // Vérifier si l'ancien OUT appartient à une session nuit de la veille (pairé avec un IN des 16h précédentes)
            const existingOutTime = new Date(existingOut.timestamp);
            const pairedInForExistingOut = await this.prisma.attendance.findFirst({
              where: {
                tenantId,
                employeeId: employee.id,
                type: 'IN',
                timestamp: {
                  gte: new Date(existingOutTime.getTime() - 16 * 60 * 60 * 1000),
                  lt: existingOutTime,
                },
                OR: [
                  { anomalyType: null },
                  { anomalyType: { notIn: ['DOUBLE_IN', 'DEBOUNCE_BLOCKED'] } },
                ],
              },
              orderBy: { timestamp: 'desc' },
            });

            // Si l'ancien OUT est pairé avec un IN de la veille → session nuit, ne pas marquer DOUBLE_OUT
            const isNightSessionOut = pairedInForExistingOut &&
              new Date(pairedInForExistingOut.timestamp).toISOString().slice(0, 10) !== existingOutTime.toISOString().slice(0, 10);

            if (isNightSessionOut) {
              console.log(`   ✅ Ancien OUT ${existingOut.id} appartient à une session nuit (IN ${pairedInForExistingOut.id} de la veille) — pas de DOUBLE_OUT`);
            } else {
            // Vérifier si l'ancien OUT est en réalité une entrée (mauvais bouton)
            // = l'ancien OUT est proche de l'heure de début du shift
            let isWrongButton = false;
            if (shift?.startTime) {
              const existingOutLocal = new Date(existingOut.timestamp);
              const existingOutMinutes = existingOutLocal.getHours() * 60 + existingOutLocal.getMinutes();
              const shiftStartParts = shift.startTime.split(':');
              const shiftStartMins = parseInt(shiftStartParts[0]) * 60 + parseInt(shiftStartParts[1] || '0');
              const diffMins = Math.abs(existingOutMinutes - shiftStartMins);
              // Si le OUT est dans les 150 minutes autour du début du shift → mauvais bouton
              if (diffMins <= 150 || diffMins >= (24 * 60 - 150)) {
                isWrongButton = true;
              }
            }

            if (isWrongButton) {
              // Mauvais bouton: l'ancien OUT est probablement une entrée
              await this.prisma.attendance.update({
                where: { id: existingOut.id },
                data: {
                  hasAnomaly: true,
                  anomalyType: 'PROBABLE_WRONG_TYPE',
                  isCorrected: false,
                  anomalyNote: `Sortie enregistrée proche de l'heure de début du shift (${shift.startTime}). L'employé a probablement appuyé sur le mauvais bouton.`,
                },
              });
              console.log(`   ⚠️ Ancien OUT ${existingOut.id} marqué PROBABLE_WRONG_TYPE (proche début shift ${shift.startTime})`);
            } else {
              // Vrai DOUBLE_OUT
              await this.prisma.attendance.update({
                where: { id: existingOut.id },
                data: {
                  hasAnomaly: true,
                  anomalyType: 'DOUBLE_OUT',
                  isCorrected: true,
                  correctionNote: `Remplacé par sortie ultérieure à ${punchTime.toLocaleTimeString('fr-FR')}`,
                  overtimeMinutes: null,
                },
              });
              console.log(`   📝 Ancienne sortie ${existingOut.id} marquée comme DOUBLE_OUT`);

              // Supprimer l'overtime associé à l'ancienne sortie (sera recréé avec la nouvelle)
              await this.prisma.overtime.deleteMany({
                where: {
                  tenantId,
                  employeeId: employee.id,
                  date: new Date(punchDate),
                },
              });
              console.log(`   🗑️ Ancien overtime supprimé pour recalcul`);
            }
            } // end else (not night session)
          }

          // Ajuster pour shift nuit si le punch est après minuit
          let adjustedPunchMinutes = punchMinutes;
          if (shift.isNightShift && punchMinutes < shiftStartMinutes) {
            adjustedPunchMinutes += 1440;
          }

          const diff = shiftEndMinutes - adjustedPunchMinutes;

          if (diff > earlyThreshold) {
            // Départ anticipé
            anomalyType = 'EARLY_LEAVE';
            earlyLeaveMinutes = diff;
            anomalyMinutes = diff;
            console.log(`   ⚠️ Anomalie: DÉPART ANTICIPÉ de ${diff} min`);
          } else if (diff < -overtimeThreshold) {
            // Heures supplémentaires (PAS une anomalie, juste du travail en plus)
            // Vérifier d'abord si l'employé est éligible aux heures sup
            if (employee.isEligibleForOvertime !== false) {
              overtimeMinutes = Math.abs(diff);
              console.log(`   ⏱️ HEURES SUP détectées: ${Math.abs(diff)} min`);
            } else {
              console.log(`   ℹ️ Heures sup ignorées (employé non éligible): ${Math.abs(diff)} min`);
            }
          }
        }
      }

      // 6. PERSISTANCE
      // Priorité des anomalies: AUTO_CORRECTED_WRONG_TYPE > MISSING_IN > DOUBLE_IN > autres
      let finalAnomalyType = anomalyType;
      if (isAutoCorrectedWrongType) {
        finalAnomalyType = 'AUTO_CORRECTED_WRONG_TYPE';
      } else if (isMissingIn) {
        finalAnomalyType = 'MISSING_IN';
      } else if (isDoubleIn) {
        finalAnomalyType = 'DOUBLE_IN';
      }
      // WEEKEND_WORK et HOLIDAY_WORKED = alertes informatives, PAS des anomalies
      const isInfoAlert = finalAnomalyType === 'WEEKEND_WORK' || finalAnomalyType === 'HOLIDAY_WORKED';
      const finalHasAnomaly = !isInfoAlert && (isAutoCorrectedWrongType || isMissingIn || isDoubleIn || !!anomalyType);

      const attendance = await this.prisma.attendance.create({
        data: {
          tenantId,
          employeeId: employee.id,
          deviceId: device.id,
          siteId: device.siteId,
          timestamp: punchTime,
          type: effectiveType,                    // ← Type effectif (auto-corrigé si mauvais bouton)
          terminalState: webhookData.terminalState, // ← STATE BRUT CONSERVÉ (audit)
          method: webhookData.method || 'FINGERPRINT',
          source: webhookData.source || 'TERMINAL',
          detectionMethod: 'TERMINAL_STATE',   // ← TOUJOURS
          hasAnomaly: finalHasAnomaly,
          anomalyType: finalAnomalyType,
          lateMinutes,
          earlyLeaveMinutes,
          overtimeMinutes,
          validationStatus: 'NONE',
          // MISSING_IN: à corriger manuellement (pas auto-corrigé)
          ...(isMissingIn && {
            isCorrected: false,
            anomalyNote: `Sortie enregistrée sans entrée préalable. Veuillez ajouter l'heure d'entrée manuellement.`,
          }),
          // DOUBLE_IN: marquer comme auto-corrigé (informatif)
          ...(isDoubleIn && !isMissingIn && {
            isCorrected: true,
            correctionNote: `Entrée en double - première entrée à ${firstInTime?.toLocaleTimeString('fr-FR')} conservée`,
          }),
          // AUTO-CORRECTION MAUVAIS BOUTON: OUT→IN, en attente validation manager
          ...(isAutoCorrectedWrongType && {
            isCorrected: true,
            needsApproval: true,
            approvalStatus: 'PENDING_APPROVAL',
            anomalyNote: webhookData.type === 'OUT'
              ? `Sortie auto-corrigée en entrée (bouton OUT pressé à ${punchTime.toLocaleTimeString('fr-FR')}, proche début shift ${shift?.startTime}). En attente validation manager.`
              : `Entrée auto-corrigée en sortie (bouton IN pressé à ${punchTime.toLocaleTimeString('fr-FR')}, proche fin shift ${shift?.endTime}). En attente validation manager.`,
            correctionNote: webhookData.type === 'OUT'
              ? `Auto-correction: OUT→IN (terminal state=${webhookData.terminalState}, shift début=${shift?.startTime})`
              : `Auto-correction: IN→OUT (terminal state=${webhookData.terminalState}, shift fin=${shift?.endTime})`,
          }),
          rawData: webhookData.rawData || {
            terminalState: webhookData.terminalState,
            source: 'TERMINAL_STATE_WEBHOOK',
            processedAt: new Date().toISOString(),
          },
        },
      });

      console.log(`   ✅ CRÉÉ: ${attendance.id}`);
      console.log(`   📊 Type: ${attendance.type}, Anomalie: ${finalAnomalyType || 'Aucune'}`);

      // 6b. DÉTECTION ERREUR DE TYPE (WRONG TYPE)
      try {
        const wrongTypeResult = await this.wrongTypeDetectionService.detect(
          tenantId,
          employee.id,
          punchTime,
          effectiveType as 'IN' | 'OUT',
          employee.departmentId || undefined,
        );

        if (wrongTypeResult.isWrongType) {
          console.log(`   ⚠️ [WRONG-TYPE] Erreur probable détectée: ${effectiveType} → attendu ${wrongTypeResult.expectedType} (confiance: ${wrongTypeResult.confidence}%)`);
          console.log(`   📋 Raison: ${wrongTypeResult.reason}`);

          // Ajouter l'anomalie PROBABLE_WRONG_TYPE (en complément, pas en remplacement)
          const wrongTypeNote = `[WRONG_TYPE] Type probable: ${wrongTypeResult.expectedType} (confiance: ${wrongTypeResult.confidence}%). ${wrongTypeResult.reason}`;

          await this.prisma.attendance.update({
            where: { id: attendance.id },
            data: {
              hasAnomaly: true,
              anomalyType: attendance.anomalyType || 'PROBABLE_WRONG_TYPE',
              anomalyNote: attendance.anomalyNote
                ? `${attendance.anomalyNote} | ${wrongTypeNote}`
                : wrongTypeNote,
            },
          });
        }
      } catch (wrongTypeError) {
        // Ne pas bloquer le pointage si la détection échoue
        console.error(`   ❌ [WRONG-TYPE] Erreur lors de la détection:`, wrongTypeError);
      }

      // 7. CRÉATION AUTO OVERTIME si applicable
      if (overtimeMinutes && overtimeMinutes > 0) {
        await this.createAutoOvertime(tenantId, attendance, overtimeMinutes);
      }

      // 8. CRÉATION AUTO JOUR SUPPLÉMENTAIRE si weekend/jour férié
      if (effectiveType === 'OUT') {
        // Trouver le IN correspondant pour calculer les heures travaillées
        const punchDateStr = punchTime.toISOString().split('T')[0];
        const matchingIn = await this.prisma.attendance.findFirst({
          where: {
            tenantId,
            employeeId: employee.id,
            type: 'IN',
            timestamp: {
              gte: new Date(punchDateStr + 'T00:00:00Z'),
              lt: punchTime,
            },
            OR: [
              { anomalyType: null },
              { anomalyType: { notIn: ['DOUBLE_IN', 'DEBOUNCE_BLOCKED'] } },
            ],
          },
          orderBy: { timestamp: 'desc' },
        });

        if (matchingIn) {
          const hoursWorked = (punchTime.getTime() - matchingIn.timestamp.getTime()) / (1000 * 60 * 60);
          if (hoursWorked > 0) {
            await this.createAutoSupplementaryDay(tenantId, attendance, hoursWorked, matchingIn.timestamp);
          }
        }
      }

      const duration = Date.now() - startTime;
      console.log(`   ⏱️ Traitement: ${duration}ms`);
      console.log(`═══════════════════════════════════════════════════════════════\n`);

      return {
        status: 'CREATED',
        id: attendance.id,
        type: attendance.type,
        anomaly: finalAnomalyType || undefined,
        duration,
      };

    } catch (error) {
      console.error(`❌ [TERMINAL-STATE] Erreur:`, error);
      return {
        status: 'ERROR',
        error: error.message || 'Erreur inconnue',
        duration: Date.now() - startTime,
      };
    }
  }
}
