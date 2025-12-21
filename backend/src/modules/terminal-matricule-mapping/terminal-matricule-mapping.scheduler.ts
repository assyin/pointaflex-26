import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';
import { TerminalMatriculeMappingService } from './terminal-matricule-mapping.service';
import { NotificationType } from '@prisma/client';

@Injectable()
export class TerminalMatriculeMappingScheduler {
  private readonly logger = new Logger(TerminalMatriculeMappingScheduler.name);

  constructor(
    private prisma: PrismaService,
    private mappingService: TerminalMatriculeMappingService,
  ) {}

  /**
   * Vérifie quotidiennement les matricules temporaires expirés ou expirant
   * Exécuté tous les jours à 8h00
   */
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async checkExpiringTemporaryMatricules() {
    this.logger.log('🔍 Vérification des matricules temporaires expirés/expirant...');

    try {
      // Récupérer tous les tenants
      const tenants = await this.prisma.tenant.findMany({
        select: {
          id: true,
          companyName: true,
        },
      });

      for (const tenant of tenants) {
        try {
          // Récupérer le délai d'expiration depuis les settings
          const settings = await this.prisma.tenantSettings.findUnique({
            where: { tenantId: tenant.id },
            select: { temporaryMatriculeExpiryDays: true },
          });

          const expiryDays = settings?.temporaryMatriculeExpiryDays || 8; // Par défaut 8 jours

          // Récupérer les employés avec matricule temporaire expiré/expirant
          const expiringMatricules =
            await this.mappingService.getExpiringTemporaryMatricules(
              tenant.id,
              expiryDays,
            );

          if (expiringMatricules.length === 0) {
            this.logger.log(
              `✅ Aucun matricule temporaire expiré/expirant pour le tenant ${tenant.companyName}`,
            );
            continue;
          }

          this.logger.warn(
            `⚠️  ${expiringMatricules.length} employé(s) avec matricule temporaire expiré/expirant pour ${tenant.companyName}`,
          );

          // Notifier les RH pour chaque employé
          for (const mapping of expiringMatricules) {
            const daysSince = mapping.daysSinceAssignment;
            const isExpired = daysSince >= expiryDays;
            const isExpiring = daysSince >= expiryDays - 1; // Notifier 1 jour avant expiration

            // Récupérer les utilisateurs RH du tenant
            const hrUsers = await this.prisma.user.findMany({
              where: {
                tenantId: tenant.id,
                userTenantRoles: {
                  some: {
                    role: {
                      code: {
                        in: ['ADMIN_RH', 'MANAGER'],
                      },
                    },
                  },
                },
                isActive: true,
              },
              select: {
                id: true,
                email: true,
                employee: {
                  select: {
                    id: true,
                  },
                },
              },
            });

            // Créer une notification pour chaque RH qui a un employé associé
            for (const hrUser of hrUsers) {
              // Vérifier que l'utilisateur RH a un employé associé
              if (!hrUser.employee?.id) {
                this.logger.warn(
                  `⚠️  Utilisateur RH ${hrUser.email} n'a pas d'employé associé, notification non envoyée`,
                );
                continue;
              }

              const notificationType = isExpired
                ? NotificationType.TEMPORARY_MATRICULE_EXPIRED
                : NotificationType.TEMPORARY_MATRICULE_EXPIRING;

              const message = isExpired
                ? `⚠️ Le matricule temporaire de ${mapping.employee.firstName} ${mapping.employee.lastName} (${mapping.terminalMatricule}) a expiré depuis ${daysSince - expiryDays} jour(s). Veuillez assigner un matricule officiel.`
                : `⏰ Le matricule temporaire de ${mapping.employee.firstName} ${mapping.employee.lastName} (${mapping.terminalMatricule}) expire dans ${expiryDays - daysSince} jour(s). Veuillez assigner un matricule officiel.`;

              await this.prisma.notification.create({
                data: {
                  tenantId: tenant.id,
                  employeeId: hrUser.employee.id,
                  type: notificationType,
                  title: isExpired
                    ? 'Matricule temporaire expiré'
                    : 'Matricule temporaire expirant',
                  message: message,
                  isRead: false,
                },
              });
            }

            this.logger.log(
              `📧 Notifications envoyées pour ${mapping.employee.firstName} ${mapping.employee.lastName} (${mapping.terminalMatricule})`,
            );
          }
        } catch (error) {
          this.logger.error(
            `❌ Erreur lors de la vérification pour le tenant ${tenant.companyName}: ${error.message}`,
          );
        }
      }

      this.logger.log('✅ Vérification des matricules temporaires terminée');
    } catch (error) {
      this.logger.error(
        `❌ Erreur lors de la vérification des matricules temporaires: ${error.message}`,
      );
    }
  }
}

