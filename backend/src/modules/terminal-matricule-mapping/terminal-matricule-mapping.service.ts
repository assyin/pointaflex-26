import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class TerminalMatriculeMappingService {
  constructor(private prisma: PrismaService) {}

  /**
   * Crée un mapping entre le matricule terminal et le matricule officiel
   */
  async createMapping(
    tenantId: string,
    employeeId: string,
    terminalMatricule: string,
    officialMatricule: string,
    deviceId?: string,
  ) {
    // Vérifier que le matricule terminal n'existe pas déjà pour ce tenant
    const existing = await this.prisma.terminalMatriculeMapping.findFirst({
      where: {
        tenantId,
        terminalMatricule,
        isActive: true,
      },
    });

    if (existing && existing.employeeId !== employeeId) {
      throw new ConflictException(
        `Le matricule terminal "${terminalMatricule}" est déjà utilisé par un autre employé`,
      );
    }

    // Si un mapping existe déjà pour cet employé, le désactiver
    if (existing && existing.employeeId === employeeId) {
      await this.prisma.terminalMatriculeMapping.update({
        where: { id: existing.id },
        data: { isActive: false },
      });
    }

    return this.prisma.terminalMatriculeMapping.create({
      data: {
        tenantId,
        employeeId,
        terminalMatricule,
        officialMatricule,
        deviceId,
        isActive: true,
        assignedAt: new Date(),
      },
    });
  }

  /**
   * Trouve un employé par son matricule terminal
   */
  async findEmployeeByTerminalMatricule(
    tenantId: string,
    terminalMatricule: string,
  ) {
    const mapping = await this.prisma.terminalMatriculeMapping.findFirst({
      where: {
        tenantId,
        terminalMatricule,
        isActive: true,
      },
      include: {
        employee: true,
      },
    });

    return mapping?.employee || null;
  }

  /**
   * Met à jour le matricule officiel dans le mapping
   */
  async updateOfficialMatricule(
    employeeId: string,
    officialMatricule: string,
  ) {
    return this.prisma.terminalMatriculeMapping.updateMany({
      where: {
        employeeId,
        isActive: true,
      },
      data: {
        officialMatricule,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Désactive tous les mappings d'un employé
   */
  async deactivateMappings(employeeId: string) {
    return this.prisma.terminalMatriculeMapping.updateMany({
      where: {
        employeeId,
        isActive: true,
      },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Récupère tous les mappings actifs d'un employé
   */
  async getEmployeeMappings(employeeId: string) {
    return this.prisma.terminalMatriculeMapping.findMany({
      where: {
        employeeId,
        isActive: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Récupère tous les employés avec matricule temporaire expiré ou expirant
   */
  async getExpiringTemporaryMatricules(
    tenantId: string,
    expiryDays: number,
  ) {
    // D'abord, trouver tous les employés avec matricule temporaire (même sans mapping)
    const employeesWithTempMatricule = await this.prisma.employee.findMany({
      where: {
        tenantId,
        isActive: true,
        matricule: {
          startsWith: 'TEMP-',
        },
      },
      select: {
        id: true,
        matricule: true,
        firstName: true,
        lastName: true,
        email: true,
        hireDate: true,
        createdAt: true,
      },
    });

    // Pour chaque employé, vérifier s'il a un mapping, sinon en créer un
    const results = await Promise.all(
      employeesWithTempMatricule.map(async (employee) => {
        // Chercher un mapping existant
        let mapping = await this.prisma.terminalMatriculeMapping.findFirst({
          where: {
            tenantId,
            employeeId: employee.id,
            isActive: true,
          },
        });

        // Si pas de mapping, en créer un
        if (!mapping) {
          mapping = await this.createMapping(
            tenantId,
            employee.id,
            employee.matricule,
            employee.matricule,
          );
        }

        // Calculer les jours depuis l'assignation
        const assignedDate = mapping.assignedAt || employee.createdAt;
        const daysSince = Math.floor(
          (new Date().getTime() - new Date(assignedDate).getTime()) /
            (1000 * 60 * 60 * 24),
        );

        return {
          ...mapping,
          employee,
          daysSinceAssignment: daysSince,
        };
      }),
    );

    // Filtrer pour ne retourner que ceux qui sont expirés ou expirant
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() - expiryDays);

    return results.filter((result) => {
      const assignedDate = result.assignedAt || result.employee.createdAt;
      return new Date(assignedDate) <= expiryDate;
    });
  }

  /**
   * Récupère TOUS les employés avec matricule temporaire (même non expirés)
   */
  async getAllTemporaryMatricules(
    tenantId: string,
    expiryDays: number,
  ) {
    // Trouver tous les employés avec matricule temporaire
    const employeesWithTempMatricule = await this.prisma.employee.findMany({
      where: {
        tenantId,
        isActive: true,
        matricule: {
          startsWith: 'TEMP-',
        },
      },
      select: {
        id: true,
        matricule: true,
        firstName: true,
        lastName: true,
        email: true,
        hireDate: true,
        createdAt: true,
      },
    });

    // Pour chaque employé, vérifier s'il a un mapping, sinon en créer un
    const results = await Promise.all(
      employeesWithTempMatricule.map(async (employee) => {
        // Chercher un mapping existant
        let mapping = await this.prisma.terminalMatriculeMapping.findFirst({
          where: {
            tenantId,
            employeeId: employee.id,
            isActive: true,
          },
        });

        // Si pas de mapping, en créer un
        if (!mapping) {
          mapping = await this.createMapping(
            tenantId,
            employee.id,
            employee.matricule,
            employee.matricule,
          );
        }

        // Calculer les jours depuis l'assignation
        const assignedDate = mapping.assignedAt || employee.createdAt;
        const daysSince = Math.floor(
          (new Date().getTime() - new Date(assignedDate).getTime()) /
            (1000 * 60 * 60 * 24),
        );

        return {
          ...mapping,
          employee,
          daysSinceAssignment: daysSince,
        };
      }),
    );

    return results;
  }

  /**
   * Récupère l'historique complet des mappings (actifs et inactifs)
   */
  async getMappingHistory(
    tenantId: string,
    filters?: {
      employeeId?: string;
      terminalMatricule?: string;
      officialMatricule?: string;
      startDate?: Date;
      endDate?: Date;
      isActive?: boolean;
      page?: number;
      limit?: number;
    },
  ) {
    const where: any = {
      tenantId,
    };

    if (filters?.employeeId) {
      where.employeeId = filters.employeeId;
    }

    if (filters?.terminalMatricule) {
      where.terminalMatricule = {
        contains: filters.terminalMatricule,
        mode: 'insensitive',
      };
    }

    if (filters?.officialMatricule) {
      where.officialMatricule = {
        contains: filters.officialMatricule,
        mode: 'insensitive',
      };
    }

    if (filters?.startDate || filters?.endDate) {
      where.assignedAt = {};
      if (filters.startDate) {
        where.assignedAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.assignedAt.lte = filters.endDate;
      }
    }

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    const page = filters?.page || 1;
    const limit = filters?.limit || 10;
    const skip = (page - 1) * limit;

    // Compter le total
    const total = await this.prisma.terminalMatriculeMapping.count({
      where,
    });

    // Récupérer les données paginées
    const mappings = await this.prisma.terminalMatriculeMapping.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            matricule: true,
            firstName: true,
            lastName: true,
            email: true,
            hireDate: true,
          },
        },
      },
      orderBy: {
        assignedAt: 'desc',
      },
      skip,
      take: limit,
    });

    const data = mappings.map((mapping) => ({
      ...mapping,
      daysSinceAssignment: Math.floor(
        (new Date().getTime() - mapping.assignedAt.getTime()) /
          (1000 * 60 * 60 * 24),
      ),
    }));

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Vérifie si un matricule est temporaire
   */
  isTemporaryMatricule(matricule: string): boolean {
    return matricule.startsWith('TEMP-');
  }
}

