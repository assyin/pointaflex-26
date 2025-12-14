import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class DataGeneratorCleanupService {
  private readonly logger = new Logger(DataGeneratorCleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Nettoie toutes les données générées pour un tenant
   * Ordre inverse de génération pour respecter les contraintes de clés étrangères
   */
  async cleanupAll(tenantId: string): Promise<{
    deleted: Record<string, number>;
    total: number;
  }> {
    this.logger.log(`🧹 Démarrage du nettoyage pour tenant ${tenantId}`);

    const deleted: Record<string, number> = {};

    try {
      // Étape 1: Notifications
      deleted.notifications = (
        await this.prisma.notification.deleteMany({
          where: { tenantId },
        })
      ).count;
      this.logger.log(`✅ ${deleted.notifications} notifications supprimées`);

      // Étape 2: Shift Replacements
      deleted.shiftReplacements = (
        await this.prisma.shiftReplacement.deleteMany({
          where: {
            tenantId,
          },
        })
      ).count;
      this.logger.log(`✅ ${deleted.shiftReplacements} remplacements supprimés`);

      // Étape 3: Recovery
      deleted.recovery = (
        await this.prisma.recovery.deleteMany({
          where: { tenantId },
        })
      ).count;
      this.logger.log(`✅ ${deleted.recovery} récupérations supprimées`);

      // Étape 4: Overtime
      deleted.overtime = (
        await this.prisma.overtime.deleteMany({
          where: { tenantId },
        })
      ).count;
      this.logger.log(`✅ ${deleted.overtime} heures supplémentaires supprimées`);

      // Étape 5: Attendance
      deleted.attendance = (
        await this.prisma.attendance.deleteMany({
          where: { tenantId },
        })
      ).count;
      this.logger.log(`✅ ${deleted.attendance} pointages supprimés`);

      // Étape 6: Leaves
      deleted.leaves = (
        await this.prisma.leave.deleteMany({
          where: { tenantId },
        })
      ).count;
      this.logger.log(`✅ ${deleted.leaves} congés supprimés`);

      // Étape 7: LeaveTypes (seulement ceux générés)
      deleted.leaveTypes = (
        await this.prisma.leaveType.deleteMany({
          where: { tenantId },
        })
      ).count;
      this.logger.log(`✅ ${deleted.leaveTypes} types de congés supprimés`);

      // Étape 8: Schedules
      deleted.schedules = (
        await this.prisma.schedule.deleteMany({
          where: { tenantId },
        })
      ).count;
      this.logger.log(`✅ ${deleted.schedules} plannings supprimés`);

      // Étape 9: Attendance Devices
      deleted.devices = (
        await this.prisma.attendanceDevice.deleteMany({
          where: { tenantId },
        })
      ).count;
      this.logger.log(`✅ ${deleted.devices} terminaux supprimés`);

      // Étape 10: Holidays
      deleted.holidays = (
        await this.prisma.holiday.deleteMany({
          where: { tenantId },
        })
      ).count;
      this.logger.log(`✅ ${deleted.holidays} jours fériés supprimés`);

      // Étape 11: Shifts
      deleted.shifts = (
        await this.prisma.shift.deleteMany({
          where: { tenantId },
        })
      ).count;
      this.logger.log(`✅ ${deleted.shifts} shifts supprimés`);

      // Étape 12: Employees
      // Supprimer d'abord les ShiftReplacement liés
      await this.prisma.shiftReplacement.deleteMany({
        where: {
          OR: [
            { originalEmployee: { tenantId } },
            { replacementEmployee: { tenantId } },
          ],
        },
      });

      deleted.employees = (
        await this.prisma.employee.deleteMany({
          where: { tenantId },
        })
      ).count;
      this.logger.log(`✅ ${deleted.employees} employés supprimés`);

      // Étape 13: UserTenantRoles (liaisons RBAC)
      deleted.userTenantRoles = (
        await this.prisma.userTenantRole.deleteMany({
          where: { tenantId },
        })
      ).count;
      this.logger.log(`✅ ${deleted.userTenantRoles} liaisons RBAC supprimées`);

      // Étape 14: Users (seulement ceux du tenant)
      deleted.users = (
        await this.prisma.user.deleteMany({
          where: { tenantId },
        })
      ).count;
      this.logger.log(`✅ ${deleted.users} utilisateurs supprimés`);

      // Étape 15: Teams
      deleted.teams = (
        await this.prisma.team.deleteMany({
          where: { tenantId },
        })
      ).count;
      this.logger.log(`✅ ${deleted.teams} équipes supprimées`);

      // Étape 16: Positions
      deleted.positions = (
        await this.prisma.position.deleteMany({
          where: { tenantId },
        })
      ).count;
      this.logger.log(`✅ ${deleted.positions} positions supprimées`);

      // Étape 17: Departments
      deleted.departments = (
        await this.prisma.department.deleteMany({
          where: { tenantId },
        })
      ).count;
      this.logger.log(`✅ ${deleted.departments} départements supprimés`);

      // Étape 18: Sites
      deleted.sites = (
        await this.prisma.site.deleteMany({
          where: { tenantId },
        })
      ).count;
      this.logger.log(`✅ ${deleted.sites} sites supprimés`);

      // Étape 19: Roles personnalisés (seulement ceux du tenant)
      deleted.roles = (
        await this.prisma.role.deleteMany({
          where: { tenantId },
        })
      ).count;
      this.logger.log(`✅ ${deleted.roles} rôles personnalisés supprimés`);

      // Note: On ne supprime PAS Tenant, TenantSettings, Role système, Permission
      // car ce sont des entités système

      const total = Object.values(deleted).reduce((sum, count) => sum + count, 0);

      this.logger.log(`✅ Nettoyage terminé: ${total} entités supprimées au total`);

      return { deleted, total };
    } catch (error) {
      this.logger.error(`❌ Erreur lors du nettoyage: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Nettoie un type d'entité spécifique
   */
  async cleanupByType(
    tenantId: string,
    entityType: string,
  ): Promise<number> {
    this.logger.log(`🧹 Nettoyage de ${entityType} pour tenant ${tenantId}`);

    let count = 0;

    switch (entityType.toLowerCase()) {
      case 'notifications':
        count = (
          await this.prisma.notification.deleteMany({
            where: { tenantId },
          })
        ).count;
        break;
      case 'replacements':
      case 'shiftreplacements':
        count = (
          await this.prisma.shiftReplacement.deleteMany({
            where: { tenantId },
          })
        ).count;
        break;
      case 'recovery':
        count = (
          await this.prisma.recovery.deleteMany({
            where: { tenantId },
          })
        ).count;
        break;
      case 'overtime':
        count = (
          await this.prisma.overtime.deleteMany({
            where: { tenantId },
          })
        ).count;
        break;
      case 'attendance':
        count = (
          await this.prisma.attendance.deleteMany({
            where: { tenantId },
          })
        ).count;
        break;
      case 'leaves':
        count = (
          await this.prisma.leave.deleteMany({
            where: { tenantId },
          })
        ).count;
        break;
      case 'leavetypes':
        count = (
          await this.prisma.leaveType.deleteMany({
            where: { tenantId },
          })
        ).count;
        break;
      case 'schedules':
        count = (
          await this.prisma.schedule.deleteMany({
            where: { tenantId },
          })
        ).count;
        break;
      case 'devices':
      case 'attendancedevices':
        count = (
          await this.prisma.attendanceDevice.deleteMany({
            where: { tenantId },
          })
        ).count;
        break;
      case 'holidays':
        count = (
          await this.prisma.holiday.deleteMany({
            where: { tenantId },
          })
        ).count;
        break;
      case 'shifts':
        count = (
          await this.prisma.shift.deleteMany({
            where: { tenantId },
          })
        ).count;
        break;
      case 'employees':
        // Supprimer d'abord les ShiftReplacement liés
        await this.prisma.shiftReplacement.deleteMany({
          where: {
            OR: [
              { originalEmployee: { tenantId } },
              { replacementEmployee: { tenantId } },
            ],
          },
        });
        count = (
          await this.prisma.employee.deleteMany({
            where: { tenantId },
          })
        ).count;
        break;
      case 'users':
        count = (
          await this.prisma.user.deleteMany({
            where: { tenantId },
          })
        ).count;
        break;
      case 'teams':
        count = (
          await this.prisma.team.deleteMany({
            where: { tenantId },
          })
        ).count;
        break;
      case 'positions':
        count = (
          await this.prisma.position.deleteMany({
            where: { tenantId },
          })
        ).count;
        break;
      case 'departments':
        count = (
          await this.prisma.department.deleteMany({
            where: { tenantId },
          })
        ).count;
        break;
      case 'sites':
        count = (
          await this.prisma.site.deleteMany({
            where: { tenantId },
          })
        ).count;
        break;
      default:
        throw new Error(`Type d'entité non supporté: ${entityType}`);
    }

    this.logger.log(`✅ ${count} ${entityType} supprimés`);
    return count;
  }
}

