import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateSiteManagerDto } from './dto/create-site-manager.dto';
import { UpdateSiteManagerDto } from './dto/update-site-manager.dto';

@Injectable()
export class SiteManagersService {
  constructor(private prisma: PrismaService) {}

  /**
   * Créer un nouveau SiteManager (manager régional)
   */
  async create(tenantId: string, dto: CreateSiteManagerDto) {
    // Vérifier que le site existe
    const site = await this.prisma.site.findFirst({
      where: {
        id: dto.siteId,
        tenantId,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!site) {
      throw new NotFoundException(`Site avec l'ID ${dto.siteId} non trouvé`);
    }

    // Vérifier que le département existe
    const department = await this.prisma.department.findFirst({
      where: {
        id: dto.departmentId,
        tenantId,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!department) {
      throw new NotFoundException(`Département avec l'ID ${dto.departmentId} non trouvé`);
    }

    // Vérifier que le manager (employé) existe et appartient au bon département
    const manager = await this.prisma.employee.findFirst({
      where: {
        id: dto.managerId,
        tenantId,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        departmentId: true,
        userId: true,
      },
    });

    if (!manager) {
      throw new NotFoundException(`Manager avec l'ID ${dto.managerId} non trouvé`);
    }

    // Vérifier que le manager appartient au département spécifié
    if (manager.departmentId !== dto.departmentId) {
      throw new BadRequestException(
        `Le manager "${manager.firstName} ${manager.lastName}" n'appartient pas au département "${department.name}". ` +
        `Il appartient à un autre département.`,
      );
    }

    // Vérifier qu'il n'existe pas déjà un manager pour ce site et ce département
    const existing = await this.prisma.siteManager.findFirst({
      where: {
        siteId: dto.siteId,
        departmentId: dto.departmentId,
        tenantId,
      },
    });

    if (existing) {
      throw new ConflictException(
        `Un manager régional existe déjà pour le site "${site.name}" et le département "${department.name}". ` +
        `Un seul manager par département par site est autorisé.`,
      );
    }

    // Vérifier que le manager n'est pas déjà Manager de Direction de ce département
    const isDirectorOfDepartment = await this.prisma.department.findFirst({
      where: {
        managerId: dto.managerId,
        tenantId,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (isDirectorOfDepartment) {
      throw new ConflictException(
        `L'employé "${manager.firstName} ${manager.lastName}" est déjà Manager de Direction du département "${isDirectorOfDepartment.name}". ` +
        `Un employé ne peut pas être à la fois Manager de Direction et Manager Régional.`,
      );
    }

    // Vérifier que le manager ne gère pas déjà un AUTRE département (différent de celui-ci)
    // Un manager régional peut gérer plusieurs sites du MÊME département
    const differentDepartmentManagement = await this.prisma.siteManager.findFirst({
      where: {
        managerId: dto.managerId,
        tenantId,
        departmentId: { not: dto.departmentId }, // Uniquement les autres départements
      },
      include: {
        site: {
          select: { name: true },
        },
        department: {
          select: { name: true },
        },
      },
    });

    if (differentDepartmentManagement) {
      throw new ForbiddenException(
        `Ce manager gère déjà le département "${differentDepartmentManagement.department.name}" ` +
        `dans le site "${differentDepartmentManagement.site.name}". ` +
        `Un manager régional ne peut gérer qu'un seul département. ` +
        `Il peut cependant gérer ce même département dans plusieurs sites.`,
      );
    }

    // Créer le SiteManager
    const siteManager = await this.prisma.siteManager.create({
      data: {
        tenantId,
        siteId: dto.siteId,
        managerId: dto.managerId,
        departmentId: dto.departmentId,
      },
      include: {
        site: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        department: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            matricule: true,
            email: true,
          },
        },
      },
    });

    // Mettre à jour le rôle de l'utilisateur en "Manager" s'il a un compte utilisateur
    if (manager.userId) {
      // Trouver le rôle "Manager" pour ce tenant
      const managerRole = await this.prisma.role.findFirst({
        where: {
          tenantId,
          name: 'Manager',
        },
      });

      if (managerRole) {
        // Mettre à jour UserTenantRole
        await this.prisma.userTenantRole.updateMany({
          where: {
            userId: manager.userId,
            tenantId,
          },
          data: {
            roleId: managerRole.id,
            updatedAt: new Date(),
          },
        });

        // Mettre à jour le rôle legacy dans User
        await this.prisma.user.update({
          where: { id: manager.userId },
          data: { role: 'MANAGER' },
        });
      }
    }

    return siteManager;
  }

  /**
   * Récupérer tous les SiteManagers d'un tenant
   */
  async findAll(tenantId: string, filters?: { siteId?: string; departmentId?: string }) {
    const where: any = { tenantId };

    if (filters?.siteId) {
      where.siteId = filters.siteId;
    }

    if (filters?.departmentId) {
      where.departmentId = filters.departmentId;
    }

    return this.prisma.siteManager.findMany({
      where,
      include: {
        site: {
          select: {
            id: true,
            name: true,
            code: true,
            city: true,
          },
        },
        department: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            matricule: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: [
        { site: { name: 'asc' } },
        { department: { name: 'asc' } },
      ],
    });
  }

  /**
   * Récupérer un SiteManager par ID
   */
  async findOne(tenantId: string, id: string) {
    const siteManager = await this.prisma.siteManager.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        site: {
          select: {
            id: true,
            name: true,
            code: true,
            city: true,
          },
        },
        department: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            matricule: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!siteManager) {
      throw new NotFoundException(`SiteManager avec l'ID ${id} non trouvé`);
    }

    return siteManager;
  }

  /**
   * Mettre à jour un SiteManager
   */
  async update(tenantId: string, id: string, dto: UpdateSiteManagerDto) {
    // Vérifier que le SiteManager existe
    const siteManager = await this.prisma.siteManager.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        site: {
          select: { name: true },
        },
        department: {
          select: { name: true, id: true },
        },
      },
    });

    if (!siteManager) {
      throw new NotFoundException(`SiteManager avec l'ID ${id} non trouvé`);
    }

    // Si on change le manager
    if (dto.managerId && dto.managerId !== siteManager.managerId) {
      // Vérifier que le nouveau manager existe
      const newManager = await this.prisma.employee.findFirst({
        where: {
          id: dto.managerId,
          tenantId,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          departmentId: true,
        },
      });

      if (!newManager) {
        throw new NotFoundException(`Manager avec l'ID ${dto.managerId} non trouvé`);
      }

      // Vérifier que le nouveau manager appartient au bon département
      if (newManager.departmentId !== siteManager.departmentId) {
        throw new BadRequestException(
          `Le manager "${newManager.firstName} ${newManager.lastName}" n'appartient pas au département "${siteManager.department.name}".`,
        );
      }

      // Vérifier que le nouveau manager n'est pas déjà Manager de Direction
      const isDirectorOfDepartment = await this.prisma.department.findFirst({
        where: {
          managerId: dto.managerId,
          tenantId,
        },
        select: {
          id: true,
          name: true,
        },
      });

      if (isDirectorOfDepartment) {
        throw new ConflictException(
          `L'employé "${newManager.firstName} ${newManager.lastName}" est déjà Manager de Direction du département "${isDirectorOfDepartment.name}". ` +
          `Un employé ne peut pas être à la fois Manager de Direction et Manager Régional.`,
        );
      }

      // Vérifier que le nouveau manager ne gère pas déjà un AUTRE département (différent de celui-ci)
      // Un manager régional peut gérer plusieurs sites du MÊME département
      const differentDepartmentManagement = await this.prisma.siteManager.findMany({
        where: {
          managerId: dto.managerId,
          tenantId,
          id: { not: id }, // Exclure le SiteManager actuel
          departmentId: { not: siteManager.departmentId }, // Uniquement les autres départements
        },
        include: {
          site: {
            select: { name: true },
          },
          department: {
            select: { name: true },
          },
        },
      });

      if (differentDepartmentManagement.length > 0) {
        const otherSite = differentDepartmentManagement[0];
        throw new ForbiddenException(
          `Ce manager gère déjà le département "${otherSite.department.name}" ` +
          `dans le site "${otherSite.site.name}". ` +
          `Un manager régional ne peut gérer qu'un seul département. ` +
          `Il peut cependant gérer ce même département dans plusieurs sites.`,
        );
      }
    }

    // Mettre à jour
    return this.prisma.siteManager.update({
      where: { id },
      data: dto,
      include: {
        site: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        department: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            matricule: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Supprimer un SiteManager
   */
  async remove(tenantId: string, id: string) {
    const siteManager = await this.prisma.siteManager.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!siteManager) {
      throw new NotFoundException(`SiteManager avec l'ID ${id} non trouvé`);
    }

    await this.prisma.siteManager.delete({
      where: { id },
    });

    return { message: 'SiteManager supprimé avec succès' };
  }

  /**
   * Récupérer les managers régionaux d'un site
   */
  async findBySite(tenantId: string, siteId: string) {
    return this.prisma.siteManager.findMany({
      where: {
        tenantId,
        siteId,
      },
      include: {
        department: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            matricule: true,
            email: true,
          },
        },
      },
      orderBy: {
        department: {
          name: 'asc',
        },
      },
    });
  }

  /**
   * Récupérer les sites gérés par un manager
   */
  async findByManager(tenantId: string, managerId: string) {
    return this.prisma.siteManager.findMany({
      where: {
        tenantId,
        managerId,
      },
      include: {
        site: {
          select: {
            id: true,
            name: true,
            code: true,
            city: true,
          },
        },
        department: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: {
        site: {
          name: 'asc',
        },
      },
    });
  }
}
