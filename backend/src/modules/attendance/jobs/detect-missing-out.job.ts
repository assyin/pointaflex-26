import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../database/prisma.service';
import { AttendanceType } from '@prisma/client';

@Injectable()
export class DetectMissingOutJob {
  private readonly logger = new Logger(DetectMissingOutJob.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Parse une chaîne de temps (HH:mm) en objet {hours, minutes}
   */
  private parseTimeString(timeString: string): { hours: number; minutes: number } {
    const [hours, minutes] = timeString.split(':').map(Number);
    return { hours: hours || 0, minutes: minutes || 0 };
  }

  /**
   * Job batch quotidien pour détecter les MISSING_OUT (sessions ouvertes sans OUT)
   * Exécution par défaut à minuit chaque jour
   * L'heure peut être configurée via TenantSettings.missingOutDetectionTime
   * 
   * Règles métier respectées:
   * - Un IN ouvre une session
   * - Un OUT ferme une seule session
   * - Fenêtre de détection basée sur fin de shift, pas date civile
   * - BREAK ≠ OUT
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async detectMissingOuts() {
    this.logger.log('Démarrage de la détection des MISSING_OUT...');

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
          await this.detectMissingOutsForTenant(tenant.id, yesterday, endOfYesterday);
        } catch (error) {
          this.logger.error(
            `Erreur lors de la détection des MISSING_OUT pour le tenant ${tenant.id}:`,
            error,
          );
        }
      }

      this.logger.log('Détection des MISSING_OUT terminée avec succès');
    } catch (error) {
      this.logger.error('Erreur lors de la détection des MISSING_OUT:', error);
    }
  }

  /**
   * Détecte les MISSING_OUT pour un tenant spécifique
   * Basé sur fin de shift, pas date civile
   */
  private async detectMissingOutsForTenant(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ) {
    // Récupérer les paramètres du tenant
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
      select: {
        missingOutDetectionWindow: true,
      },
    });

    const detectionWindowHours = settings?.missingOutDetectionWindow || 12;

    // Récupérer tous les IN de la période (hier)
    const inRecords = await this.prisma.attendance.findMany({
      where: {
        tenantId,
        type: AttendanceType.IN,
        timestamp: { gte: startDate, lte: endDate },
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            matricule: true,
          },
        },
      },
      orderBy: { timestamp: 'asc' },
    });

    this.logger.log(`Analyse de ${inRecords.length} pointage(s) IN pour le tenant ${tenantId}...`);

    let missingOutCount = 0;

    for (const inRecord of inRecords) {
      try {
        // RÈGLE MÉTIER : Un IN ouvre une session
        // Vérifier si cette session a un OUT correspondant
        // Fenêtre basée sur fin de shift, pas date civile
        
        // Récupérer le schedule pour déterminer la fin du shift
        // IMPORTANT: Chercher TOUS les schedules pour gérer les multiples shifts par jour
        const startOfDay = new Date(inRecord.timestamp);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(inRecord.timestamp);
        endOfDay.setHours(23, 59, 59, 999);

        const schedules = await this.prisma.schedule.findMany({
          where: {
            tenantId,
            employeeId: inRecord.employeeId,
            date: { gte: startOfDay, lte: endOfDay },
            status: 'PUBLISHED',
          },
          include: {
            shift: {
              select: {
                id: true,
                startTime: true,
                endTime: true,
              },
            },
          },
          orderBy: {
            shift: {
              startTime: 'asc',
            },
          },
        });

        // Si multiples schedules, trouver le plus proche de l'heure du IN
        let schedule = null;
        if (schedules.length > 0) {
          if (schedules.length === 1) {
            schedule = schedules[0];
          } else {
            // Multiple shifts - trouver le plus proche
            const inHour = inRecord.timestamp.getUTCHours();
            const inMinutes = inRecord.timestamp.getUTCMinutes();
            const inTimeInMinutes = inHour * 60 + inMinutes;

            let closestSchedule = schedules[0];
            let smallestDifference = Infinity;

            // Récupérer le timezone du tenant
            const tenant = await this.prisma.tenant.findUnique({
              where: { id: tenantId },
              select: { timezone: true },
            });

            // Extraire l'offset (ex: "UTC" = 0, "Africa/Casablanca" = +1)
            const timezoneOffset = tenant?.timezone === 'UTC' ? 0 : 1; // Simplifié

            for (const sched of schedules) {
              const startTime = this.parseTimeString(
                sched.customStartTime || sched.shift.startTime,
              );

              const shiftStartInMinutesLocal = startTime.hours * 60 + startTime.minutes;
              const shiftStartInMinutesUTC = shiftStartInMinutesLocal - (timezoneOffset * 60);

              const difference = Math.abs(inTimeInMinutes - shiftStartInMinutesUTC);

              if (difference < smallestDifference) {
                smallestDifference = difference;
                closestSchedule = sched;
              }
            }

            schedule = closestSchedule;
          }
        }

        // Fallback vers currentShiftId si pas de schedule
        let shift = schedule?.shift;
        if (!shift) {
          const employee = await this.prisma.employee.findUnique({
            where: { id: inRecord.employeeId },
            include: {
              currentShift: {
                select: {
                  id: true,
                  startTime: true,
                  endTime: true,
                },
              },
            },
          });
          shift = employee?.currentShift || null;
        }

        let detectionWindowEnd: Date;
        
        if (shift) {
          // Calculer la fin du shift prévu
          const expectedEndTime = this.parseTimeString(
            schedule?.customEndTime || shift.endTime,
          );

          // IMPORTANT: Utiliser UTC pour éviter les problèmes de timezone
          detectionWindowEnd = new Date(Date.UTC(
            inRecord.timestamp.getFullYear(),
            inRecord.timestamp.getMonth(),
            inRecord.timestamp.getDate(),
            expectedEndTime.hours,
            expectedEndTime.minutes,
            0,
            0
          ));

          // Si shift de nuit, ajuster la date
          const startTime = this.parseTimeString(
            schedule?.customStartTime || shift.startTime,
          );
          const isNightShift = startTime.hours >= 20 || expectedEndTime.hours <= 8;

          if (isNightShift) {
            detectionWindowEnd.setUTCDate(detectionWindowEnd.getUTCDate() + 1);
            detectionWindowEnd.setUTCHours(12, 0, 0, 0); // Midi le lendemain pour shift de nuit
          } else {
            // Ajouter la fenêtre de détection
            detectionWindowEnd.setTime(
              detectionWindowEnd.getTime() + detectionWindowHours * 60 * 60 * 1000,
            );
          }
        } else {
          // Pas de schedule, utiliser fenêtre par défaut (12h après IN)
          detectionWindowEnd = new Date(inRecord.timestamp);
          detectionWindowEnd.setTime(
            detectionWindowEnd.getTime() + detectionWindowHours * 60 * 60 * 1000,
          );
        }

        // Vérifier si on est déjà passé la fenêtre de détection
        if (new Date() < detectionWindowEnd) {
          // Trop tôt pour détecter (shift de nuit probablement)
          continue;
        }

        // RÈGLE MÉTIER : Un OUT ferme une seule session
        // RÈGLE MÉTIER : BREAK ≠ OUT
        // Chercher un OUT correspondant dans la fenêtre
        const correspondingOut = await this.prisma.attendance.findFirst({
          where: {
            tenantId,
            employeeId: inRecord.employeeId,
            type: AttendanceType.OUT,
            timestamp: {
              gte: inRecord.timestamp,
              lte: detectionWindowEnd,
            },
          },
          orderBy: { timestamp: 'asc' },
        });

        // Si pas de OUT, vérifier si l'anomalie existe déjà
        if (!correspondingOut) {
          const existingAnomaly = await this.prisma.attendance.findFirst({
            where: {
              id: inRecord.id,
              hasAnomaly: true,
              anomalyType: 'MISSING_OUT',
            },
          });

          if (!existingAnomaly) {
            // Créer/mettre à jour l'anomalie MISSING_OUT
            await this.prisma.attendance.update({
              where: { id: inRecord.id },
              data: {
                hasAnomaly: true,
                anomalyType: 'MISSING_OUT',
                anomalyNote: `Session ouverte depuis ${Math.round(
                  (new Date().getTime() - inRecord.timestamp.getTime()) / (1000 * 60 * 60),
                )}h sans sortie correspondante (détecté par job batch)`,
              },
            });

            missingOutCount++;
            this.logger.warn(
              `MISSING_OUT détecté pour ${inRecord.employee.firstName} ${inRecord.employee.lastName} (${inRecord.employee.matricule}) - IN à ${inRecord.timestamp.toLocaleString('fr-FR')}`,
            );
          }
        }
      } catch (error) {
        this.logger.error(
          `Erreur lors de la vérification du pointage IN ${inRecord.id}:`,
          error,
        );
      }
    }

    if (missingOutCount > 0) {
      this.logger.warn(
        `✅ ${missingOutCount} MISSING_OUT détecté(s) pour le tenant ${tenantId}`,
      );
    } else {
      this.logger.log(`✅ Aucun MISSING_OUT détecté pour le tenant ${tenantId}`);
    }
  }
}

