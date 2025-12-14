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

    // Vérifier que ce manager ne gère pas déjà un site dans un autre département
    const otherSiteManagers = await this.prisma.siteManager.findMany({
      where: {
        managerId: dto.managerId,
        tenantId,
        departmentId: { not: dto.departmentId },
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

    if (otherSiteManagers.length > 0) {
      const otherSite = otherSiteManagers[0];
      throw new ForbiddenException(
        `Ce manager gère déjà le site "${otherSite.site.name}" dans le département "${otherSite.department.name}". ` +
        `Un manager régional ne peut gérer qu'un seul département.`,
      );
    }

    // Créer le SiteManager
    return this.prisma.siteManager.create({
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

      // Vérifier que le nouveau manager ne gère pas déjà un site dans un autre département
      const otherSiteManagers = await this.prisma.siteManager.findMany({
        where: {
          managerId: dto.managerId,
          tenantId,
          id: { not: id }, // Exclure le SiteManager actuel
          departmentId: { not: siteManager.departmentId },
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

      if (otherSiteManagers.length > 0) {
        const otherSite = otherSiteManagers[0];
        throw new ForbiddenException(
          `Ce manager gère déjà le site "${otherSite.site.name}" dans le département "${otherSite.department.name}". ` +
          `Un manager régional ne peut gérer qu'un seul département.`,
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
