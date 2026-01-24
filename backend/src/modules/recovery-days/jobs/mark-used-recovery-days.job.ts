import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../database/prisma.service';
import { RecoveryDayStatus } from '@prisma/client';

@Injectable()
export class MarkUsedRecoveryDaysJob {
  private readonly logger = new Logger(MarkUsedRecoveryDaysJob.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Job quotidien pour marquer les journées de récupération passées
   *
   * Logique:
   * - Si une récupération est APPROVED et que endDate < aujourd'hui → USED
   * - Si une récupération est PENDING et que endDate < aujourd'hui → CANCELLED (expirée)
   *
   * Exécution: tous les jours à 2h du matin
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async markPastRecoveryDaysAsUsed() {
    this.logger.log('Démarrage du job de marquage des récupérations passées...');

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // 1. Marquer les récupérations APPROVED passées comme USED
      const pastApprovedRecoveryDays = await this.prisma.recoveryDay.findMany({
        where: {
          status: RecoveryDayStatus.APPROVED,
          endDate: {
            lt: today,
          },
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
      });

      let usedCount = 0;
      for (const recoveryDay of pastApprovedRecoveryDays) {
        try {
          await this.prisma.recoveryDay.update({
            where: { id: recoveryDay.id },
            data: {
              status: RecoveryDayStatus.USED,
              updatedAt: new Date(),
            },
          });
          this.logger.debug(
            `Récupération APPROVED → USED: ${recoveryDay.employee.firstName} ${recoveryDay.employee.lastName}`,
          );
          usedCount++;
        } catch (error) {
          this.logger.error(`Erreur marquage USED ${recoveryDay.id}:`, error);
        }
      }

      // 2. Annuler les récupérations PENDING passées (expirées - non approuvées à temps)
      const pastPendingRecoveryDays = await this.prisma.recoveryDay.findMany({
        where: {
          status: RecoveryDayStatus.PENDING,
          endDate: {
            lt: today,
          },
        },
      });

      let cancelledCount = 0;
      for (const recoveryDay of pastPendingRecoveryDays) {
        try {
          // Récupérer les heures sup liées via OvertimeRecoveryDay avec les heures utilisées
          const linkedOvertimes = await this.prisma.overtimeRecoveryDay.findMany({
            where: { recoveryDayId: recoveryDay.id },
            select: { overtimeId: true, hoursUsed: true },
          });

          // Annuler la récupération et restaurer les heures supplémentaires
          await this.prisma.$transaction(async (tx) => {
            // Restaurer les heures sup associées: remettre en APPROVED et réinitialiser convertedHoursToRecoveryDays
            for (const link of linkedOvertimes) {
              const hoursToRestore = Number(link.hoursUsed || 0);
              if (hoursToRestore > 0) {
                // Récupérer la valeur actuelle et soustraire
                const currentOvertime = await tx.overtime.findUnique({
                  where: { id: link.overtimeId },
                  select: { convertedHoursToRecoveryDays: true },
                });
                const currentConverted = Number(currentOvertime?.convertedHoursToRecoveryDays || 0);
                const newConverted = Math.max(0, currentConverted - hoursToRestore);

                await tx.overtime.update({
                  where: { id: link.overtimeId },
                  data: {
                    status: 'APPROVED',
                    convertedHoursToRecoveryDays: newConverted,
                    updatedAt: new Date(),
                  },
                });
              } else {
                await tx.overtime.update({
                  where: { id: link.overtimeId },
                  data: {
                    status: 'APPROVED',
                    updatedAt: new Date(),
                  },
                });
              }
            }

            // Supprimer les liens OvertimeRecoveryDay pour libérer les heures sup
            await tx.overtimeRecoveryDay.deleteMany({
              where: { recoveryDayId: recoveryDay.id },
            });

            // Annuler la récupération
            await tx.recoveryDay.update({
              where: { id: recoveryDay.id },
              data: {
                status: RecoveryDayStatus.CANCELLED,
                notes: (recoveryDay.notes || '') +
                  `\n[Auto-annulé le ${new Date().toISOString().split('T')[0]}] Expirée - non approuvée avant la date de récupération`,
                updatedAt: new Date(),
              },
            });
          });

          this.logger.debug(
            `Récupération PENDING → CANCELLED (expirée): employeeId=${recoveryDay.employeeId}`,
          );
          cancelledCount++;
        } catch (error) {
          this.logger.error(`Erreur annulation ${recoveryDay.id}:`, error);
        }
      }

      this.logger.log(
        `Job terminé: ${usedCount} → USED, ${cancelledCount} → CANCELLED (expirées)`,
      );
    } catch (error) {
      this.logger.error('Erreur lors du job de marquage des récupérations:', error);
    }
  }

  /**
   * Méthode manuelle pour marquer une récupération spécifique comme utilisée
   * Utile pour les cas de régularisation ou les tests
   */
  async markRecoveryDayAsUsed(recoveryDayId: string): Promise<boolean> {
    try {
      const recoveryDay = await this.prisma.recoveryDay.findUnique({
        where: { id: recoveryDayId },
      });

      if (!recoveryDay) {
        this.logger.warn(`Récupération non trouvée: ${recoveryDayId}`);
        return false;
      }

      if (recoveryDay.status !== RecoveryDayStatus.APPROVED) {
        this.logger.warn(
          `La récupération ${recoveryDayId} n'est pas en statut APPROVED (statut actuel: ${recoveryDay.status})`,
        );
        return false;
      }

      await this.prisma.recoveryDay.update({
        where: { id: recoveryDayId },
        data: {
          status: RecoveryDayStatus.USED,
          updatedAt: new Date(),
        },
      });

      this.logger.log(`Récupération ${recoveryDayId} marquée comme USED`);
      return true;
    } catch (error) {
      this.logger.error(
        `Erreur lors du marquage manuel de la récupération ${recoveryDayId}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Méthode pour exécuter le job manuellement pour un tenant spécifique
   * Utile pour les tests ou la régularisation
   */
  async markPastRecoveryDaysForTenant(tenantId: string) {
    this.logger.log(`Marquage des récupérations passées pour le tenant ${tenantId}...`);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await this.prisma.recoveryDay.updateMany({
      where: {
        tenantId,
        status: RecoveryDayStatus.APPROVED,
        endDate: {
          lt: today,
        },
      },
      data: {
        status: RecoveryDayStatus.USED,
        updatedAt: new Date(),
      },
    });

    this.logger.log(`${result.count} récupération(s) marquée(s) comme USED pour le tenant ${tenantId}`);
    return result;
  }
}
