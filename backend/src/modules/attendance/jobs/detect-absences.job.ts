import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../database/prisma.service';
import { AttendanceType, DeviceType } from '@prisma/client';

@Injectable()
export class DetectAbsencesJob {
  private readonly logger = new Logger(DetectAbsencesJob.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Job batch quotidien pour détecter les absences complètes (Cas B)
   * Exécution par défaut à 1h du matin chaque jour
   * L'heure peut être configurée via TenantSettings.absenceDetectionTime
   */
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async detectAbsences() {
    this.logger.log('Démarrage de la détection des absences...');

    try {
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

      for (const tenant of tenants) {
        try {
          await this.detectAbsencesForTenant(tenant.id, yesterday, endOfYesterday);
        } catch (error) {
          this.logger.error(
            `Erreur lors de la détection des absences pour le tenant ${tenant.id}:`,
            error,
          );
        }
      }

      this.logger.log('Détection des absences terminée avec succès');
    } catch (error) {
      this.logger.error('Erreur lors de la détection des absences:', error);
    }
  }

  /**
   * Détecte les absences pour un tenant spécifique
   */
  private async detectAbsencesForTenant(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ) {
    // Récupérer les paramètres du tenant
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
      select: {
        workingDays: true,
        requireScheduleForAttendance: true,
      },
    });

    const workingDays = (settings?.workingDays as number[]) || [1, 2, 3, 4, 5, 6]; // Lun-Sam par défaut
    const requireScheduleForAttendance = settings?.requireScheduleForAttendance ?? true;

    // 1. Détecter les absences pour les plannings spécifiques existants
    const schedules = await this.prisma.schedule.findMany({
      where: {
        tenantId,
        date: { gte: startDate, lte: endDate },
        status: 'PUBLISHED', // Seulement les plannings publiés
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            matricule: true,
            isActive: true,
          },
        },
        shift: {
          select: {
            id: true,
            startTime: true,
            endTime: true,
          },
        },
      },
    });

    let absenceCount = 0;

    // Traiter les plannings spécifiques
    for (const schedule of schedules) {
      // Ignorer les employés inactifs
      if (!schedule.employee.isActive) {
        continue;
      }

      // NOTE: Pour les plannings personnalisés, on ne vérifie PAS les jours ouvrables.
      // Si un employé a un planning spécifique pour un jour (même weekend/férié),
      // et qu'il n'a pas pointé, c'est une absence.
      // Le planning personnalisé PRIME sur la configuration des jours ouvrables.

      // Vérifier s'il y a un pointage IN pour cette date
      const hasAttendance = await this.prisma.attendance.findFirst({
        where: {
          tenantId,
          employeeId: schedule.employeeId,
          type: AttendanceType.IN,
          timestamp: {
            gte: new Date(schedule.date.setHours(0, 0, 0, 0)),
            lte: new Date(schedule.date.setHours(23, 59, 59, 999)),
          },
        },
      });

      if (!hasAttendance) {
        // Vérifier s'il y a un congé approuvé
        const leave = await this.prisma.leave.findFirst({
          where: {
            tenantId,
            employeeId: schedule.employeeId,
            startDate: { lte: schedule.date },
            endDate: { gte: schedule.date },
            status: { in: ['APPROVED', 'MANAGER_APPROVED'] },
          },
        });

        if (!leave) {
          // Créer un enregistrement d'absence
          await this.createAbsenceRecord(tenantId, schedule);
          absenceCount++;
        }
      }
    }

    // 2. FALLBACK : Détecter les absences pour les employés avec currentShiftId mais sans planning spécifique
    const employeesWithDefaultShift = await this.prisma.employee.findMany({
      where: {
        tenantId,
        isActive: true,
        currentShiftId: { not: null },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        matricule: true,
        isActive: true,
        currentShift: {
          select: {
            id: true,
            startTime: true,
            endTime: true,
          },
        },
      },
    });

    // Pour chaque jour dans la plage
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      const normalizedDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;

      // Vérifier si c'est un jour ouvrable
      if (workingDays.includes(normalizedDayOfWeek)) {
        for (const employee of employeesWithDefaultShift) {
          // Vérifier s'il y a un planning spécifique pour cet employé et cette date
          const specificSchedule = await this.prisma.schedule.findFirst({
            where: {
              tenantId,
              employeeId: employee.id,
              date: {
                gte: new Date(currentDate.setHours(0, 0, 0, 0)),
                lte: new Date(currentDate.setHours(23, 59, 59, 999)),
              },
            },
          });

          // Si pas de planning spécifique, utiliser le shift par défaut
          if (!specificSchedule) {
            // Vérifier s'il y a un pointage IN pour cette date
            const hasAttendance = await this.prisma.attendance.findFirst({
              where: {
                tenantId,
                employeeId: employee.id,
                type: AttendanceType.IN,
                timestamp: {
                  gte: new Date(currentDate.setHours(0, 0, 0, 0)),
                  lte: new Date(currentDate.setHours(23, 59, 59, 999)),
                },
              },
            });

            if (!hasAttendance) {
              // Vérifier s'il y a un congé approuvé
              const leave = await this.prisma.leave.findFirst({
                where: {
                  tenantId,
                  employeeId: employee.id,
                  startDate: { lte: currentDate },
                  endDate: { gte: currentDate },
                  status: { in: ['APPROVED', 'MANAGER_APPROVED'] },
                },
              });

              if (!leave) {
                // Créer un enregistrement d'absence avec le shift par défaut
                await this.createAbsenceRecord(tenantId, {
                  employeeId: employee.id,
                  date: new Date(currentDate),
                  shift: employee.currentShift,
                  customStartTime: null,
                  employee: {
                    id: employee.id,
                    firstName: employee.firstName,
                    lastName: employee.lastName,
                    matricule: employee.matricule,
                    isActive: employee.isActive,
                  },
                });
                absenceCount++;
              }
            }
          }
        }
      }

      // Passer au jour suivant
      currentDate.setDate(currentDate.getDate() + 1);
    }

    if (absenceCount > 0) {
      this.logger.log(
        `${absenceCount} absence(s) détectée(s) pour le tenant ${tenantId}`,
      );
    }
  }

  /**
   * Crée un enregistrement d'absence virtuel
   * FIX 17/01/2026: Vérifier s'il existe un pointage réel proche avant de créer une absence
   */
  private async createAbsenceRecord(tenantId: string, schedule: any) {
    try {
      // Calculer l'heure prévue d'entrée
      const expectedStartTime = this.parseTimeString(
        schedule.customStartTime || schedule.shift.startTime,
      );
      const absenceTimestamp = new Date(schedule.date);
      absenceTimestamp.setHours(
        expectedStartTime.hours,
        expectedStartTime.minutes,
        0,
        0,
      );

      // FIX 17/01/2026: Créer des copies des dates pour éviter la mutation
      const startOfDay = new Date(schedule.date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(schedule.date);
      endOfDay.setHours(23, 59, 59, 999);

      // Vérifier si un enregistrement d'absence n'existe pas déjà
      const existingAbsence = await this.prisma.attendance.findFirst({
        where: {
          tenantId,
          employeeId: schedule.employeeId,
          timestamp: {
            gte: startOfDay,
            lte: endOfDay,
          },
          anomalyType: 'ABSENCE',
          isGenerated: true,
          generatedBy: 'ABSENCE_DETECTION_JOB',
        },
      });

      if (existingAbsence) {
        return; // L'absence a déjà été détectée
      }

      // FIX 17/01/2026: Vérifier s'il existe un pointage RÉEL (non généré) proche de l'heure prévue
      // Fenêtre de tolérance: 30 minutes avant/après l'heure prévue
      const TOLERANCE_MINUTES = 30;
      const toleranceStart = new Date(absenceTimestamp.getTime() - TOLERANCE_MINUTES * 60 * 1000);
      const toleranceEnd = new Date(absenceTimestamp.getTime() + TOLERANCE_MINUTES * 60 * 1000);

      const existingRealPunch = await this.prisma.attendance.findFirst({
        where: {
          tenantId,
          employeeId: schedule.employeeId,
          timestamp: {
            gte: toleranceStart,
            lte: toleranceEnd,
          },
          // Exclure les pointages générés automatiquement
          OR: [
            { isGenerated: false },
            { isGenerated: null },
          ],
          // Exclure les enregistrements DEBOUNCE_BLOCKED
          NOT: {
            anomalyType: 'DEBOUNCE_BLOCKED',
          },
        },
      });

      if (existingRealPunch) {
        this.logger.debug(
          `Pointage réel trouvé pour ${schedule.employee.firstName} ${schedule.employee.lastName} à ${existingRealPunch.timestamp.toISOString()} - Absence NON créée`,
        );
        return; // Un pointage réel existe, ne pas créer d'absence
      }

      // Vérifier aussi s'il y a un pointage RÉEL n'importe quand dans la journée
      const anyRealPunchToday = await this.prisma.attendance.findFirst({
        where: {
          tenantId,
          employeeId: schedule.employeeId,
          timestamp: {
            gte: startOfDay,
            lte: endOfDay,
          },
          OR: [
            { isGenerated: false },
            { isGenerated: null },
          ],
          NOT: {
            anomalyType: 'DEBOUNCE_BLOCKED',
          },
        },
      });

      if (anyRealPunchToday) {
        this.logger.debug(
          `Pointage réel trouvé ailleurs dans la journée pour ${schedule.employee.firstName} ${schedule.employee.lastName} - Absence NON créée`,
        );
        return; // L'employé a pointé, ce n'est pas une absence complète
      }

      // Créer le pointage d'absence virtuel
      await this.prisma.attendance.create({
        data: {
          tenantId,
          employeeId: schedule.employeeId,
          timestamp: absenceTimestamp,
          type: AttendanceType.IN,
          method: DeviceType.MANUAL,
          hasAnomaly: true,
          anomalyType: 'ABSENCE',
          anomalyNote: 'Absence complète détectée : aucun pointage enregistré pour cette journée',
          isGenerated: true,
          generatedBy: 'ABSENCE_DETECTION_JOB',
        },
      });

      this.logger.debug(
        `Absence créée pour ${schedule.employee.firstName} ${schedule.employee.lastName} (${schedule.employee.matricule}) le ${schedule.date.toISOString().split('T')[0]}`,
      );
    } catch (error) {
      this.logger.error(
        `Erreur lors de la création de l'absence pour l'employé ${schedule.employeeId}:`,
        error,
      );
    }
  }

  /**
   * Parse une chaîne de temps (format "HH:mm") en heures et minutes
   */
  private parseTimeString(timeString: string): { hours: number; minutes: number } {
    const [hours, minutes] = timeString.split(':').map(Number);
    return { hours: hours || 0, minutes: minutes || 0 };
  }

  /**
   * Détecte les absences dues aux erreurs techniques (Cas E)
   * À appeler depuis le job principal ou séparément
   */
  async detectTechnicalAbsences(tenantId: string, date: Date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Récupérer les tentatives échouées sans pointage réussi
    const failedAttempts = await this.prisma.attendanceAttempt.findMany({
      where: {
        tenantId,
        timestamp: { gte: startOfDay, lte: endOfDay },
        status: 'FAILED',
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            matricule: true,
            isActive: true,
          },
        },
      },
      distinct: ['employeeId'],
    });

    for (const attempt of failedAttempts) {
      if (!attempt.employee.isActive) {
        continue;
      }

      // Vérifier si un pointage réussi existe pour cet employé ce jour
      const hasSuccess = await this.prisma.attendance.findFirst({
        where: {
          tenantId,
          employeeId: attempt.employeeId,
          timestamp: { gte: startOfDay, lte: endOfDay },
        },
      });

      if (!hasSuccess) {
        // Vérifier s'il y a un planning pour cette date
        const schedule = await this.prisma.schedule.findFirst({
          where: {
            tenantId,
            employeeId: attempt.employeeId,
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

        if (schedule) {
          // Vérifier s'il y a un congé
          const leave = await this.prisma.leave.findFirst({
            where: {
              tenantId,
              employeeId: attempt.employeeId,
              startDate: { lte: date },
              endDate: { gte: date },
              status: { in: ['APPROVED', 'MANAGER_APPROVED'] },
            },
          });

          if (!leave) {
            // Créer absence technique
            await this.createAbsenceRecord(tenantId, {
              employeeId: attempt.employeeId,
              date,
              shift: schedule.shift,
              customStartTime: schedule.customStartTime,
              employee: attempt.employee,
            });
          }
        }
      }
    }
  }
}

