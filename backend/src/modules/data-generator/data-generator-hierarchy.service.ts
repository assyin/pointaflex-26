import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { DataGeneratorOrchestratorService } from './data-generator-orchestrator.service';

@Injectable()
export class DataGeneratorHierarchyService {
  private readonly logger = new Logger(DataGeneratorHierarchyService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => DataGeneratorOrchestratorService))
    private readonly orchestrator: DataGeneratorOrchestratorService,
  ) {}

  /**
   * Configure la hiérarchie des managers
   */
  async configureHierarchy(tenantId: string, managerDistribution?: {
    departmentManagers: number;
    siteManagers: number;
    teamManagers: number;
  }): Promise<{
    departmentManagers: number;
    siteManagers: number;
    teamManagers: number;
  }> {
    this.logger.log(`👔 Configuration de la hiérarchie managers pour tenant ${tenantId}`);

    // Récupérer les structures
    const departments = await this.prisma.department.findMany({ where: { tenantId } });
    const sites = await this.prisma.site.findMany({ where: { tenantId } });
    const teams = await this.prisma.team.findMany({ where: { tenantId } });

    // Récupérer les employés potentiels managers (avec au moins 2 ans d'ancienneté)
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

    const potentialManagers = await this.prisma.employee.findMany({
      where: {
        tenantId,
        hireDate: { lte: twoYearsAgo },
        isActive: true,
      },
      include: {
        user: {
          include: {
            userTenantRoles: {
              include: { role: true },
            },
          },
        },
      },
      orderBy: { hireDate: 'asc' },
    });

    if (potentialManagers.length === 0) {
      this.logger.warn('⚠️ Aucun employé avec suffisamment d\'ancienneté pour être manager');
      return { departmentManagers: 0, siteManagers: 0, teamManagers: 0 };
    }

    let managerIndex = 0;
    let departmentManagersAssigned = 0;
    let siteManagersAssigned = 0;
    let teamManagersAssigned = 0;

    // Assigner des managers aux départements
    for (const department of departments) {
      if (managerIndex >= potentialManagers.length) break;

      const manager = potentialManagers[managerIndex];
      await this.prisma.department.update({
        where: { id: department.id },
        data: { managerId: manager.id },
      });

      // Assigner le rôle MANAGER si l'utilisateur existe
      if (manager.userId) {
        await this.assignManagerRole(tenantId, manager.userId);
      }

      departmentManagersAssigned++;
      managerIndex++;
      this.logger.log(`✅ Manager assigné au département ${department.name}`);
    }

    // Assigner des managers régionaux aux sites (un par département présent dans le site)
    // Récupérer les départements déjà managés pour éviter les conflits
    const managedDepartments = await this.prisma.department.findMany({
      where: { tenantId, managerId: { not: null } },
      select: { managerId: true },
    });
    const managedDepartmentManagerIds = new Set(managedDepartments.map(d => d.managerId).filter(Boolean));

    // Récupérer les départements présents dans chaque site (via les employés)
    for (const site of sites) {
      // Récupérer les départements qui ont des employés dans ce site
      const employeesInSite = await this.prisma.employee.findMany({
        where: {
          siteId: site.id,
          tenantId,
          isActive: true,
        },
        select: {
          departmentId: true,
        },
        distinct: ['departmentId'],
      });

      const departmentsInSite = employeesInSite
        .map(e => e.departmentId)
        .filter((id): id is string => id !== null);

      if (departmentsInSite.length === 0) {
        this.logger.warn(`⚠️ Aucun département trouvé dans le site ${site.name}, aucun manager régional assigné`);
        continue;
      }

      // Assigner un manager régional pour chaque département présent dans le site
      for (const departmentId of departmentsInSite) {
        // Filtrer les managers disponibles (pas managers de direction, du même département)
        let availableManagers = potentialManagers.filter(
          (m, idx) => idx >= managerIndex && 
                      !managedDepartmentManagerIds.has(m.id) &&
                      m.departmentId === departmentId
        );

        if (availableManagers.length === 0) {
          this.logger.warn(`⚠️ Aucun manager disponible pour le site ${site.name} et le département ${departmentId}`);
          continue;
        }

        const manager = availableManagers[0];

        // Créer l'entrée SiteManager (nouveau système)
        await this.prisma.siteManager.create({
          data: {
            tenantId,
            siteId: site.id,
            managerId: manager.id,
            departmentId: departmentId,
          },
        });

        // Assigner le rôle MANAGER si l'utilisateur existe
        if (manager.userId) {
          await this.assignManagerRole(tenantId, manager.userId);
        }

        siteManagersAssigned++;
        managerIndex = potentialManagers.indexOf(manager) + 1;
        this.logger.log(`✅ Manager régional assigné au site ${site.name} pour le département ${departmentId}`);
      }
    }

    // Assigner des managers aux équipes
    for (const team of teams) {
      if (managerIndex >= potentialManagers.length) break;

      const manager = potentialManagers[managerIndex];
      await this.prisma.team.update({
        where: { id: team.id },
        data: { managerId: manager.id },
      });

      // Assigner le rôle MANAGER si l'utilisateur existe
      if (manager.userId) {
        await this.assignManagerRole(tenantId, manager.userId);
      }

      teamManagersAssigned++;
      managerIndex++;
      this.logger.log(`✅ Manager assigné à l'équipe ${team.name}`);
    }

    this.logger.log(
      `✅ Hiérarchie configurée: ${departmentManagersAssigned} départements, ${siteManagersAssigned} sites, ${teamManagersAssigned} équipes`,
    );

    return {
      departmentManagers: departmentManagersAssigned,
      siteManagers: siteManagersAssigned,
      teamManagers: teamManagersAssigned,
    };
  }

  /**
   * Assigne le rôle MANAGER à un utilisateur
   */
  private async assignManagerRole(tenantId: string, userId: string): Promise<void> {
    // Trouver le rôle MANAGER
    const managerRole = await this.prisma.role.findFirst({
      where: {
        OR: [
          { tenantId: null, name: 'MANAGER' }, // Rôle système
          { tenantId, name: 'MANAGER' }, // Rôle personnalisé
        ],
      },
    });

    if (!managerRole) {
      this.logger.warn('⚠️ Rôle MANAGER non trouvé');
      return;
    }

    // Vérifier si la liaison existe déjà
    const existing = await this.prisma.userTenantRole.findFirst({
      where: {
        userId,
        tenantId,
        roleId: managerRole.id,
      },
    });

    if (!existing) {
      await this.prisma.userTenantRole.create({
        data: {
          userId,
          tenantId,
          roleId: managerRole.id,
        },
      });
      this.logger.log(`✅ Rôle MANAGER assigné à l'utilisateur ${userId}`);
    }
  }
}

