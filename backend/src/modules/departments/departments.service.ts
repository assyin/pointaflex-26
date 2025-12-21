import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { getManagerLevel } from '../../common/utils/manager-level.util';

@Injectable()
export class DepartmentsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Génère un code unique basé sur le nom du département
   * Format: 3 premières lettres (majuscules, sans accents) + numéro si nécessaire
   * Exemple: "Ressources Humaines" -> "RES", "Ressources Humaines 2" -> "RES001"
   */
  private async generateUniqueCode(tenantId: string, departmentName: string): Promise<string> {
    // Normaliser le nom: enlever accents, garder seulement lettres et chiffres
    const normalized = departmentName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Enlever les accents
      .replace(/[^a-zA-Z0-9\s]/g, '') // Enlever caractères spéciaux
      .replace(/\s+/g, ' ') // Normaliser les espaces
      .trim()
      .toUpperCase();

    // Extraire les 3 premières lettres/chiffres (enlever les espaces)
    let baseCode = normalized
      .replace(/\s/g, '')
      .substring(0, 3);

    // Si moins de 3 caractères, compléter avec des X
    if (baseCode.length < 3) {
      baseCode = baseCode.padEnd(3, 'X');
    }

    // Vérifier si le code de base existe déjà
    try {
      const existing = await this.prisma.department.findFirst({
        where: {
          tenantId,
          code: baseCode,
        },
      });

      if (!existing) {
        return baseCode;
      }
    } catch (error) {
      // Si la colonne code n'existe pas, retourner le code de base
      if (error.message?.includes('does not exist')) {
        return baseCode;
      }
      throw error;
    }

    // Si le code existe, essayer avec des numéros incrémentaux
    let counter = 1;
    let uniqueCode: string;
    do {
      uniqueCode = `${baseCode}${String(counter).padStart(3, '0')}`;
      
      try {
        const existing = await this.prisma.department.findFirst({
          where: {
            tenantId,
            code: uniqueCode,
          },
        });

        if (!existing) {
          return uniqueCode;
        }
      } catch (error) {
        // Si la colonne code n'existe pas, retourner le code généré
        if (error.message?.includes('does not exist')) {
          return uniqueCode;
        }
        throw error;
      }

      counter++;
      // Limite de sécurité pour éviter les boucles infinies
      if (counter > 9999) {
        // Si on atteint la limite, utiliser un UUID court
        return `DEPT${Date.now().toString().slice(-6)}`;
      }
    } while (true);
  }

  async create(tenantId: string, createDepartmentDto: CreateDepartmentDto) {
    // Générer automatiquement un code unique si non fourni
    let finalCode = createDepartmentDto.code;
    if (!finalCode) {
      finalCode = await this.generateUniqueCode(tenantId, createDepartmentDto.name);
    } else {
      // Vérifier que le code fourni n'existe pas déjà pour ce tenant
      try {
        const existing = await this.prisma.department.findFirst({
          where: {
            tenantId,
            code: createDepartmentDto.code,
          },
        });

        if (existing) {
          throw new ConflictException(`Le code "${createDepartmentDto.code}" existe déjà pour ce tenant`);
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

    return this.prisma.department.create({
      data: {
        ...createDepartmentDto,
        code: finalCode,
        tenantId,
      },
      include: {
        _count: {
          select: {
            employees: true,
          },
        },
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async findAll(tenantId: string, userId?: string, userPermissions?: string[]) {
    const where: any = { tenantId };

    // Vérifier si l'utilisateur a la permission de voir tous les départements
    const hasViewAll = userPermissions?.includes('department.view_all') || false;

    // IMPORTANT: Même avec 'view_all', un manager régional ne doit voir que son département/site assigné
    // Seuls les ADMIN_RH et SUPER_ADMIN devraient voir tous les départements
    // Toujours vérifier le niveau du manager pour appliquer les restrictions appropriées
    if (userId) {
      const managerLevel = await getManagerLevel(this.prisma, userId, tenantId);

      // Si l'utilisateur est un manager, appliquer le filtrage selon son niveau
      // Même avec 'view_all', un manager ne voit que ce qu'il gère
      if (managerLevel.type === 'DEPARTMENT') {
        // Manager de département : voir uniquement son département
        where.id = managerLevel.departmentId;
      } else if (managerLevel.type === 'SITE') {
        // Manager régional : voir uniquement son département
        if (managerLevel.departmentId) {
          where.id = managerLevel.departmentId;
        } else {
          // Si pas de département, retourner vide
          return [];
        }
      } else if (managerLevel.type === 'TEAM') {
        // Manager d'équipe : récupérer le département de son équipe
        const team = await this.prisma.team.findUnique({
          where: { id: managerLevel.teamId },
          select: { 
            employees: {
              select: { departmentId: true },
              take: 1,
            },
          },
        });
        
        if (team?.employees?.[0]?.departmentId) {
          where.id = team.employees[0].departmentId;
        } else {
          // Si pas de département dans l'équipe, retourner vide
          return [];
        }
      }
      // Si managerLevel.type === null, l'utilisateur n'est pas manager
      // Dans ce cas, si il a 'view_all', il voit tout (ADMIN_RH, SUPER_ADMIN)
      // Sinon, il ne voit rien (ou seulement son propre département si applicable)
    }
    
    return this.prisma.department.findMany({
      where,
      include: {
        _count: {
          select: {
            employees: true,
          },
        },
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, tenantId: string) {
    const department = await this.prisma.department.findFirst({
      where: { id, tenantId },
      include: {
        _count: {
          select: {
            employees: true,
          },
        },
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        employees: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            matricule: true,
            position: true,
            email: true,
          },
          take: 100,
          orderBy: { lastName: 'asc' },
        },
      },
    });

    if (!department) {
      throw new NotFoundException(`Department with ID ${id} not found`);
    }

    return department;
  }

  async update(id: string, tenantId: string, updateDepartmentDto: UpdateDepartmentDto) {
    const department = await this.findOne(id, tenantId);

    return this.prisma.department.update({
      where: { id: department.id },
      data: updateDepartmentDto,
      include: {
        _count: {
          select: {
            employees: true,
          },
        },
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async remove(id: string, tenantId: string) {
    const department = await this.findOne(id, tenantId);

    // Vérifier s'il y a des employés dans ce département
    const employeeCount = await this.prisma.employee.count({
      where: { departmentId: id },
    });

    if (employeeCount > 0) {
      throw new Error(
        `Cannot delete department. It has ${employeeCount} employee(s). Please reassign them first.`,
      );
    }

    return this.prisma.department.delete({
      where: { id: department.id },
    });
  }

  async getStats(tenantId: string, userId?: string, userPermissions?: string[]) {
    const departments = await this.findAll(tenantId, userId, userPermissions);

    const total = departments.length;
    const totalEmployees = await this.prisma.employee.count({
      where: { tenantId, departmentId: { not: null } },
    });

    const employeesWithoutDepartment = await this.prisma.employee.count({
      where: { tenantId, departmentId: null },
    });

    const departmentStats = departments.map(dept => ({
      id: dept.id,
      name: dept.name,
      code: dept.code,
      employeeCount: dept._count.employees,
      percentage: total > 0 ? ((dept._count.employees / totalEmployees) * 100).toFixed(1) : 0,
    }));

    return {
      totalDepartments: total,
      totalEmployees,
      employeesWithoutDepartment,
      departments: departmentStats.sort((a, b) => b.employeeCount - a.employeeCount),
    };
  }
}
