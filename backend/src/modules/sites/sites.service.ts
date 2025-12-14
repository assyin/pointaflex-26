import { Injectable, NotFoundException, ConflictException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateSiteDto } from './dto/create-site.dto';
import { UpdateSiteDto } from './dto/update-site.dto';

@Injectable()
export class SitesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Valide qu'un manager ne gère pas déjà un site dans un autre département
   * Contrainte: Un manager régional ne peut gérer qu'un seul département
   */
  private async validateManagerDepartmentConstraint(
    managerId: string,
    departmentId: string | null | undefined,
    currentSiteId?: string,
  ) {
    if (!managerId) {
      return; // Pas de manager, pas de validation
    }

    // Récupérer tous les sites managés par cet employé (sauf le site actuel)
    const where: any = {
      managerId,
      departmentId: { not: null }, // Uniquement les sites avec un département
    };

    if (currentSiteId) {
      where.id = { not: currentSiteId }; // Exclure le site actuel lors de la mise à jour
    }

    const otherManagedSites = await this.prisma.site.findMany({
      where,
      include: {
        department: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    // Si le manager gère déjà un site dans un département différent, rejeter
    for (const site of otherManagedSites) {
      if (site.department && site.departmentId !== departmentId) {
        throw new ForbiddenException(
          `Ce manager gère déjà le site "${site.name}" dans le département "${site.department.name}". ` +
          `Un manager régional ne peut gérer qu'un seul département.`,
        );
      }
    }
  }

  async create(tenantId: string, dto: CreateSiteDto) {
    // Vérifier que le code n'existe pas déjà pour ce tenant (si la colonne existe)
    if (dto.code) {
      try {
        const existing = await this.prisma.site.findFirst({
          where: {
            tenantId,
            code: dto.code,
          },
        });

        if (existing) {
          throw new ConflictException(`Le code "${dto.code}" existe déjà pour ce tenant`);
        }
      } catch (error) {
        // Si la colonne code n'existe pas, ignorer la vérification
        if (error.message?.includes('does not exist')) {
          // Colonne code n'existe pas encore, continuer sans vérification
        } else {
          throw error;
        }
      }
    }

    // Valider le manager si fourni
    if (dto.managerId) {
      const manager = await this.prisma.employee.findFirst({
        where: {
          id: dto.managerId,
          tenantId,
        },
        select: {
          id: true,
          departmentId: true,
        },
      });

      if (!manager) {
        throw new NotFoundException(`Manager avec l'ID ${dto.managerId} non trouvé`);
      }

      // Valider que le manager appartient au département du site (si département spécifié)
      if (dto.departmentId && manager.departmentId !== dto.departmentId) {
        throw new BadRequestException(
          `Le manager doit appartenir au département du site. ` +
          `Le manager appartient au département "${manager.departmentId}" ` +
          `mais le site est assigné au département "${dto.departmentId}".`
        );
      }

      // Valider la contrainte: un manager régional ne peut gérer qu'un seul département
      await this.validateManagerDepartmentConstraint(
        dto.managerId,
        dto.departmentId,
      );
    }

    // Exclure code si la colonne n'existe pas
    const data: any = {
      ...dto,
      tenantId,
      workingDays: dto.workingDays || null,
    };
    
    // Ne pas inclure code si la colonne n'existe pas
    try {
      return await this.prisma.site.create({
        data,
        include: {
          manager: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              matricule: true,
            },
          },
          _count: {
            select: {
              employees: true,
              devices: true,
            },
          },
        },
      });
    } catch (error) {
      if (error.message?.includes('code') && error.message?.includes('does not exist')) {
        // Retirer code des données et réessayer
        delete data.code;
        return await this.prisma.site.create({
          data,
          include: {
            manager: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                matricule: true,
              },
            },
            _count: {
              select: {
                employees: true,
                devices: true,
              },
            },
          },
        });
      }
      throw error;
    }
  }

  async findAll(tenantId: string) {
    try {
      const sites = await this.prisma.site.findMany({
        where: { tenantId },
        include: {
          manager: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              matricule: true,
            },
          },
          _count: {
            select: {
              employees: true,
              devices: true,
              attendance: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      });

      return {
        data: sites,
        total: sites.length,
      };
    } catch (error: any) {
      // Si erreur liée à des colonnes manquantes, utiliser une requête plus simple
      if (error.message?.includes('does not exist') || error.code === 'P2021') {
        const sites = await this.prisma.site.findMany({
          where: { tenantId },
          orderBy: { name: 'asc' },
        });

        // Calculer les counts manuellement si nécessaire
        const sitesWithCounts = await Promise.all(
          sites.map(async (site) => {
            const [employeesCount, devicesCount] = await Promise.all([
              this.prisma.employee.count({ where: { siteId: site.id } }).catch(() => 0),
              this.prisma.attendanceDevice.count({ where: { siteId: site.id } }).catch(() => 0),
            ]);

            return {
              ...site,
              _count: {
                employees: employeesCount,
                devices: devicesCount,
                attendance: 0, // Peut être calculé si nécessaire
              },
            };
          }),
        );

        return {
          data: sitesWithCounts,
          total: sitesWithCounts.length,
        };
      }
      throw error;
    }
  }

  async findOne(tenantId: string, id: string) {
    const site = await this.prisma.site.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            matricule: true,
          },
        },
        employees: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            matricule: true,
          },
          take: 10,
        },
        devices: {
          select: {
            id: true,
            name: true,
            deviceId: true,
          },
        },
        _count: {
          select: {
            employees: true,
            devices: true,
            attendance: true,
          },
        },
      },
    });

    if (!site) {
      throw new NotFoundException('Site non trouvé');
    }

    return site;
  }

  async update(tenantId: string, id: string, dto: UpdateSiteDto) {
    // Vérifier que le site appartient au tenant
    const site = await this.prisma.site.findFirst({
      where: { id, tenantId },
    });

    if (!site) {
      throw new NotFoundException('Site non trouvé');
    }

    // Valider le manager si fourni
    if (dto.managerId) {
      const manager = await this.prisma.employee.findFirst({
        where: {
          id: dto.managerId,
          tenantId,
        },
        select: {
          id: true,
          departmentId: true,
        },
      });

      if (!manager) {
        throw new NotFoundException(`Manager avec l'ID ${dto.managerId} non trouvé`);
      }
    }

    // Valider la contrainte si managerId ou departmentId change
    const finalManagerId = dto.managerId !== undefined ? dto.managerId : site.managerId;
    const finalDepartmentId = dto.departmentId !== undefined ? dto.departmentId : (site as any).departmentId;

    if (finalManagerId && (dto.managerId !== undefined || dto.departmentId !== undefined)) {
      // Si un manager est assigné et un département est spécifié, vérifier que le manager appartient au département
      if (finalManagerId && finalDepartmentId) {
        const manager = await this.prisma.employee.findFirst({
          where: {
            id: finalManagerId,
            tenantId,
          },
          select: {
            id: true,
            departmentId: true,
          },
        });

        if (manager && manager.departmentId !== finalDepartmentId) {
          throw new BadRequestException(
            `Le manager doit appartenir au département du site. ` +
            `Le manager appartient au département "${manager.departmentId}" ` +
            `mais le site est assigné au département "${finalDepartmentId}".`
          );
        }
      }

      // Valider la contrainte: un manager régional ne peut gérer qu'un seul département
      await this.validateManagerDepartmentConstraint(
        finalManagerId,
        finalDepartmentId,
        id, // Pass current site ID to exclude it from the check
      );
    }

    // Si le code change, vérifier qu'il n'existe pas déjà (si la colonne existe)
    if (dto.code && (site as any).code && dto.code !== (site as any).code) {
      try {
        const existing = await this.prisma.site.findFirst({
          where: {
            tenantId,
            code: dto.code,
          },
        });

        if (existing) {
          throw new ConflictException(`Le code "${dto.code}" existe déjà`);
        }
      } catch (error) {
        // Si la colonne code n'existe pas, ignorer la vérification
        if (error.message?.includes('does not exist')) {
          // Colonne code n'existe pas encore, continuer sans vérification
        } else {
          throw error;
        }
      }
    }

    // Exclure code si la colonne n'existe pas
    const data: any = {
      ...dto,
      workingDays: dto.workingDays || undefined,
    };
    
    try {
      return await this.prisma.site.update({
        where: { id },
        data,
        include: {
          manager: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              matricule: true,
            },
          },
          _count: {
            select: {
              employees: true,
              devices: true,
            },
          },
        },
      });
    } catch (error) {
      if (error.message?.includes('code') && error.message?.includes('does not exist')) {
        // Retirer code des données et réessayer
        delete data.code;
        return await this.prisma.site.update({
          where: { id },
          data,
          include: {
            manager: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                matricule: true,
              },
            },
            _count: {
              select: {
                employees: true,
                devices: true,
              },
            },
          },
        });
      }
      throw error;
    }
  }

  async remove(tenantId: string, id: string) {
    // Vérifier que le site appartient au tenant
    const site = await this.prisma.site.findFirst({
      where: { id, tenantId },
      include: {
        _count: {
          select: {
            employees: true,
            devices: true,
          },
        },
      },
    });

    if (!site) {
      throw new NotFoundException('Site non trouvé');
    }

    // Vérifier qu'il n'y a pas d'employés ou de devices assignés
    if (site._count.employees > 0) {
      throw new ConflictException(
        `Impossible de supprimer: ${site._count.employees} employé(s) assigné(s) à ce site`,
      );
    }

    if (site._count.devices > 0) {
      throw new ConflictException(
        `Impossible de supprimer: ${site._count.devices} appareil(s) assigné(s) à ce site`,
      );
    }

    await this.prisma.site.delete({
      where: { id },
    });

    return { message: 'Site supprimé avec succès' };
  }
}
