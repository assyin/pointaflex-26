import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreatePositionDto } from './dto/create-position.dto';
import { UpdatePositionDto } from './dto/update-position.dto';

@Injectable()
export class PositionsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Génère un code unique basé sur le nom de la position
   * Format: 3 premières lettres (majuscules, sans accents) + numéro si nécessaire
   * Exemple: "Développeur Full Stack" -> "DEV", "Développeur Full Stack 2" -> "DEV001"
   */
  private async generateUniqueCode(tenantId: string, positionName: string): Promise<string> {
    // Normaliser le nom: enlever accents, garder seulement lettres et chiffres
    const normalized = positionName
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
      const existing = await this.prisma.position.findFirst({
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
        const existing = await this.prisma.position.findFirst({
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
        return `POS${Date.now().toString().slice(-6)}`;
      }
    } while (true);
  }

  async create(tenantId: string, createPositionDto: CreatePositionDto) {
    // Générer automatiquement un code unique si non fourni
    let finalCode = createPositionDto.code;
    if (!finalCode) {
      finalCode = await this.generateUniqueCode(tenantId, createPositionDto.name);
    } else {
      // Vérifier que le code fourni n'existe pas déjà pour ce tenant
      try {
        const existing = await this.prisma.position.findFirst({
          where: {
            tenantId,
            code: createPositionDto.code,
          },
        });

        if (existing) {
          throw new ConflictException(`Le code "${createPositionDto.code}" existe déjà pour ce tenant`);
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

    return this.prisma.position.create({
      data: {
        ...createPositionDto,
        code: finalCode,
        tenantId,
      },
      include: {
        _count: {
          select: {
            employees: true,
          },
        },
      },
    });
  }

  async findAll(tenantId: string, category?: string) {
    const where: any = { tenantId };
    if (category) {
      where.category = category;
    }

    return this.prisma.position.findMany({
      where,
      include: {
        _count: {
          select: {
            employees: true,
          },
        },
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string, tenantId: string) {
    const position = await this.prisma.position.findFirst({
      where: { id, tenantId },
      include: {
        _count: {
          select: {
            employees: true,
          },
        },
        employees: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            matricule: true,
            email: true,
            department: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          take: 100,
          orderBy: { lastName: 'asc' },
        },
      },
    });

    if (!position) {
      throw new NotFoundException(`Position with ID ${id} not found`);
    }

    return position;
  }

  async update(id: string, tenantId: string, updatePositionDto: UpdatePositionDto) {
    const position = await this.findOne(id, tenantId);

    return this.prisma.position.update({
      where: { id: position.id },
      data: updatePositionDto,
      include: {
        _count: {
          select: {
            employees: true,
          },
        },
      },
    });
  }

  async remove(id: string, tenantId: string) {
    const position = await this.findOne(id, tenantId);

    // Vérifier s'il y a des employés avec cette position
    const employeeCount = await this.prisma.employee.count({
      where: { positionId: id },
    });

    if (employeeCount > 0) {
      throw new Error(
        `Cannot delete position. It has ${employeeCount} employee(s). Please reassign them first.`,
      );
    }

    return this.prisma.position.delete({
      where: { id: position.id },
    });
  }

  async getStats(tenantId: string) {
    const positions = await this.findAll(tenantId);

    const total = positions.length;
    const totalEmployees = await this.prisma.employee.count({
      where: { tenantId, positionId: { not: null } },
    });

    const employeesWithoutPosition = await this.prisma.employee.count({
      where: { tenantId, positionId: null },
    });

    // Grouper par catégorie
    const categoryStats = positions.reduce((acc: any, pos) => {
      const cat = pos.category || 'Non catégorisé';
      if (!acc[cat]) {
        acc[cat] = { category: cat, count: 0, employeeCount: 0 };
      }
      acc[cat].count++;
      acc[cat].employeeCount += pos._count.employees;
      return acc;
    }, {});

    const positionStats = positions.map(pos => ({
      id: pos.id,
      name: pos.name,
      code: pos.code,
      category: pos.category,
      employeeCount: pos._count.employees,
      percentage: totalEmployees > 0 ? ((pos._count.employees / totalEmployees) * 100).toFixed(1) : 0,
    }));

    return {
      totalPositions: total,
      totalEmployees,
      employeesWithoutPosition,
      categories: Object.values(categoryStats),
      positions: positionStats.sort((a, b) => b.employeeCount - a.employeeCount),
    };
  }

  async getCategories(tenantId: string) {
    const positions = await this.prisma.position.findMany({
      where: { tenantId },
      select: { category: true },
      distinct: ['category'],
    });

    return positions
      .filter(p => p.category)
      .map(p => p.category)
      .sort();
  }
}
