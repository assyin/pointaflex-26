import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { ImportScheduleResultDto } from './dto/import-schedule.dto';
import { getManagerLevel, getManagedEmployeeIds } from '../../common/utils/manager-level.util';
import * as XLSX from 'xlsx';

@Injectable()
export class SchedulesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Parse date string (YYYY-MM-DD) to Date object in UTC to avoid timezone issues
   */
  private parseDateString(dateStr: string): Date {
    // Parse YYYY-MM-DD format and create date in UTC
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  }

  /**
   * Format date to YYYY-MM-DD string in UTC
   */
  private formatDateToISO(date: Date): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Generate all dates between start and end date (inclusive)
   * Uses UTC to avoid timezone issues
   */
  private generateDateRange(startDate: Date, endDate: Date): Date[] {
    const dates: Date[] = [];
    const currentDate = new Date(startDate);
    
    // Reset time to midnight UTC for comparison
    currentDate.setUTCHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setUTCHours(0, 0, 0, 0);
    
    while (currentDate <= end) {
      dates.push(new Date(currentDate));
      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }
    
    return dates;
  }

  async create(tenantId: string, dto: CreateScheduleDto) {
    // Log pour debug
    console.log('SchedulesService.create called with:', {
      tenantId,
      dto: JSON.stringify(dto, null, 2),
    });

    // 1. Verify employee belongs to tenant and is active
    const employee = await this.prisma.employee.findFirst({
      where: {
        id: dto.employeeId,
        tenantId,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        matricule: true,
        isActive: true,
        teamId: true,
      },
    });

    if (!employee) {
      throw new NotFoundException(
        `L'employé avec l'ID ${dto.employeeId} n'existe pas ou n'appartient pas à votre entreprise`
      );
    }

    if (!employee.isActive) {
      throw new BadRequestException(
        `L'employé ${employee.firstName} ${employee.lastName} (${employee.matricule}) n'est pas actif. Impossible de créer un planning pour un employé inactif.`
      );
    }

    // 2. Verify shift belongs to tenant
    const shift = await this.prisma.shift.findFirst({
      where: {
        id: dto.shiftId,
        tenantId,
      },
    });

    if (!shift) {
      throw new NotFoundException(
        `Le shift avec l'ID ${dto.shiftId} n'existe pas ou n'appartient pas à votre entreprise`
      );
    }

    // 3. Verify team belongs to tenant and check employee-team consistency (if provided)
    if (dto.teamId) {
      const team = await this.prisma.team.findFirst({
        where: {
          id: dto.teamId,
          tenantId,
        },
      });

      if (!team) {
        throw new NotFoundException(
          `L'équipe avec l'ID ${dto.teamId} n'existe pas ou n'appartient pas à votre entreprise`
        );
      }

      // Vérifier cohérence employé/équipe
      if (employee.teamId && employee.teamId !== dto.teamId) {
        throw new BadRequestException(
          `L'employé ${employee.firstName} ${employee.lastName} (${employee.matricule}) n'appartient pas à l'équipe sélectionnée. Veuillez sélectionner l'équipe correcte ou laisser ce champ vide.`
        );
      }
    }

    // 4. Parse and validate dates (use UTC to avoid timezone issues)
    const startDate = this.parseDateString(dto.dateDebut);
    
    // Determine end date: if dateFin is provided, use it; otherwise, use dateDebut (single day)
    const endDate = dto.dateFin 
      ? this.parseDateString(dto.dateFin)
      : this.parseDateString(dto.dateDebut);

    // Validate date range
    if (endDate < startDate) {
      throw new BadRequestException('La date de fin doit être supérieure ou égale à la date de début');
    }

    // Check for maximum range (e.g., 1 year)
    const maxRange = 365; // days
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > maxRange) {
      throw new BadRequestException(
        `L'intervalle ne peut pas dépasser ${maxRange} jours. Vous avez sélectionné ${daysDiff} jour(s).`
      );
    }

    // 5. Validate custom hours if provided
    if (dto.customStartTime && dto.customEndTime) {
      const [startH, startM] = dto.customStartTime.split(':').map(Number);
      const [endH, endM] = dto.customEndTime.split(':').map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;
      
      if (endMinutes <= startMinutes) {
        throw new BadRequestException(
          `L'heure de fin (${dto.customEndTime}) doit être supérieure à l'heure de début (${dto.customStartTime})`
        );
      }
    }

    // 6. Generate all dates in the range
    const dates = this.generateDateRange(startDate, endDate);

    // 7. Check for existing schedules (optimized query)
    // IMPORTANT: Check for same employee and same date, REGARDLESS of shift
    // Business rule: An employee can only have ONE schedule per day, regardless of the shift
    // This is consistent with the database constraint: @@unique([employeeId, date])
    // Use UTC dates for query to avoid timezone issues
    const queryStartDate = new Date(startDate);
    queryStartDate.setUTCHours(0, 0, 0, 0);
    const queryEndDate = new Date(endDate);
    queryEndDate.setUTCHours(23, 59, 59, 999); // Include the entire end date
    
    const existingSchedules = await this.prisma.schedule.findMany({
      where: {
        tenantId,
        employeeId: dto.employeeId,
        // NOTE: We do NOT filter by shiftId - an employee can only have ONE schedule per day
        date: {
          gte: queryStartDate,
          lte: queryEndDate,
        },
      },
      select: {
        date: true,
        shiftId: true,
        shift: {
          select: {
            name: true,
            code: true,
          },
        },
      },
    });

    // Normalize existing dates to YYYY-MM-DD format in UTC for comparison
    const existingDatesMap = new Map<string, { shiftId: string; shiftName: string; shiftCode: string }>();
    existingSchedules.forEach((s) => {
      const dateStr = this.formatDateToISO(s.date);
      existingDatesMap.set(dateStr, {
        shiftId: s.shiftId,
        shiftName: s.shift.name,
        shiftCode: s.shift.code,
      });
    });

    // Filter out dates that already have schedules (regardless of shift)
    const datesToCreate = dates.filter((date) => {
      const dateStr = this.formatDateToISO(date);
      return !existingDatesMap.has(dateStr);
    });

    if (datesToCreate.length === 0) {
      const startDateStr = this.formatDateToISO(startDate);
      const endDateStr = this.formatDateToISO(endDate);
      const dateRangeStr = startDateStr === endDateStr 
        ? `le ${this.formatDate(startDateStr)}`
        : `la période du ${this.formatDate(startDateStr)} au ${this.formatDate(endDateStr)}`;
      
      // Get information about existing schedules for better error message
      const conflictingDates = dates
        .filter((date) => existingDatesMap.has(this.formatDateToISO(date)))
        .map((date) => {
          const dateStr = this.formatDateToISO(date);
          const existing = existingDatesMap.get(dateStr);
          return {
            date: this.formatDate(dateStr),
            shift: existing?.shiftName || existing?.shiftCode || 'shift inconnu',
          };
        });

      let errorMessage = `Un planning existe déjà pour ${dateRangeStr} pour l'employé ${employee.firstName} ${employee.lastName}. `;
      errorMessage += `Un employé ne peut avoir qu'un seul planning par jour. `;
      
      if (conflictingDates.length === 1) {
        errorMessage += `Le planning existant est pour le shift "${conflictingDates[0].shift}" le ${conflictingDates[0].date}. `;
      } else if (conflictingDates.length > 1) {
        errorMessage += `Plannings existants : `;
        errorMessage += conflictingDates.map(c => `${c.shift} le ${c.date}`).join(', ') + '. ';
      }
      
      errorMessage += `Veuillez modifier le planning existant ou choisir une autre date.`;
      
      throw new ConflictException(errorMessage);
    }

    // 8. Create all schedules
    // IMPORTANT: Ensure dates are stored correctly by using UTC dates
    // Since Prisma stores dates as Date type, we need to ensure they're normalized
    const schedulesToCreate = datesToCreate.map((date) => {
      // Ensure the date is normalized to UTC midnight for storage
      const normalizedDate = new Date(date);
      normalizedDate.setUTCHours(0, 0, 0, 0);
      
      return {
        tenantId,
        employeeId: dto.employeeId,
        shiftId: dto.shiftId,
        teamId: dto.teamId,
        date: normalizedDate,
        customStartTime: dto.customStartTime,
        customEndTime: dto.customEndTime,
        notes: dto.notes,
      };
    });

    const result = await this.prisma.schedule.createMany({
      data: schedulesToCreate,
      skipDuplicates: true,
    });

    // 9. Verify that schedules were actually created
    // This is a safety check in case the database constraint prevents creation
    if (result.count === 0 && schedulesToCreate.length > 0) {
      // This should not happen if our conflict check is correct, but it's a safety net
      const startDateStr = this.formatDateToISO(startDate);
      const endDateStr = this.formatDateToISO(endDate);
      const dateRangeStr = startDateStr === endDateStr 
        ? `le ${this.formatDate(startDateStr)}`
        : `la période du ${this.formatDate(startDateStr)} au ${this.formatDate(endDateStr)}`;
      throw new ConflictException(
        `Impossible de créer le planning pour ${dateRangeStr} pour l'employé ${employee.firstName} ${employee.lastName}. Un planning existe déjà pour cette période. Veuillez modifier le planning existant ou choisir une autre date.`
      );
    }

    // 10. Prepare conflicting dates for response
    const conflictingDates = dates
      .filter((date) => existingDatesMap.has(this.formatDateToISO(date)))
      .map((date) => {
        const dateStr = this.formatDateToISO(date);
        const existing = existingDatesMap.get(dateStr);
        return {
          date: dateStr,
          shift: existing?.shiftName || existing?.shiftCode || 'shift inconnu',
        };
      });

    // Return detailed summary
    return {
      count: result.count,
      created: result.count,
      skipped: dates.length - datesToCreate.length,
      conflictingDates: conflictingDates.length > 0 ? conflictingDates : undefined,
      dateRange: {
        start: dto.dateDebut,
        end: dto.dateFin || dto.dateDebut,
      },
      message: `${result.count} planning(s) créé(s)${dates.length - datesToCreate.length > 0 ? `, ${dates.length - datesToCreate.length} ignoré(s) (déjà existants)` : ''}`,
    };
  }

  /**
   * Format date from YYYY-MM-DD to DD/MM/YYYY
   */
  private formatDate(dateStr: string): string {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  }

  async findAll(
    tenantId: string,
    page = 1,
    limit = 20,
    filters?: {
      employeeId?: string;
      teamId?: string;
      shiftId?: string;
      siteId?: string;
      startDate?: string;
      endDate?: string;
    },
    userId?: string,
    userPermissions?: string[],
  ) {
    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    // Filtrer par employé si l'utilisateur n'a que la permission 'schedule.view_own'
    const hasViewAll = userPermissions?.includes('schedule.view_all');
    const hasViewOwn = userPermissions?.includes('schedule.view_own');
    const hasViewTeam = userPermissions?.includes('schedule.view_team');
    const hasViewDepartment = userPermissions?.includes('schedule.view_department');
    const hasViewSite = userPermissions?.includes('schedule.view_site');

    // IMPORTANT: Détecter si l'utilisateur est un manager, mais seulement s'il n'a pas 'view_all'
    // Les admins avec 'view_all' doivent voir toutes les données, indépendamment de leur statut de manager
    // PRIORITÉ: La permission 'view_all' prime sur le statut de manager
    if (userId && !hasViewAll) {
      const managerLevel = await getManagerLevel(this.prisma, userId, tenantId);

      // Si l'utilisateur est un manager, appliquer le filtrage selon son niveau hiérarchique
      if (managerLevel.type === 'DEPARTMENT') {
        // Manager de département : filtrer par les employés du département
        const managedEmployeeIds = await getManagedEmployeeIds(this.prisma, managerLevel, tenantId);
        if (managedEmployeeIds.length === 0) {
          return {
            data: [],
            meta: {
              total: 0,
              page,
              limit,
              totalPages: 0,
            },
          };
        }
        where.employeeId = { in: managedEmployeeIds };
      } else if (managerLevel.type === 'SITE') {
        // Manager régional : filtrer par les employés du site ET département
        const managedEmployeeIds = await getManagedEmployeeIds(this.prisma, managerLevel, tenantId);
        if (managedEmployeeIds.length === 0) {
          return {
            data: [],
            meta: {
              total: 0,
              page,
              limit,
              totalPages: 0,
            },
          };
        }
        where.employeeId = { in: managedEmployeeIds };
      } else if (managerLevel.type === 'TEAM') {
        // Manager d'équipe : filtrer par l'équipe de l'utilisateur
        const employee = await this.prisma.employee.findFirst({
          where: { userId, tenantId },
          select: { teamId: true },
        });

        if (employee?.teamId) {
          // Filtrer les plannings de cette équipe
          where.teamId = employee.teamId;
        } else {
          // Si pas d'équipe, retourner vide
          return {
            data: [],
            meta: {
              total: 0,
              page,
              limit,
              totalPages: 0,
            },
          };
        }
      } else if (!hasViewAll && hasViewOwn) {
        // Si pas manager et a seulement 'view_own', filtrer par son propre ID
        const employee = await this.prisma.employee.findFirst({
          where: { userId, tenantId },
          select: { id: true },
        });

        if (employee) {
          where.employeeId = employee.id;
        } else {
          // Si pas d'employé lié, retourner vide
          return {
            data: [],
            meta: {
              total: 0,
              page,
              limit,
              totalPages: 0,
            },
          };
        }
      }
    }

    if (filters?.employeeId) {
      where.employeeId = filters.employeeId;
    }

    if (filters?.teamId) {
      where.teamId = filters.teamId;
    }

    if (filters?.shiftId) {
      where.shiftId = filters.shiftId;
    }

    if (filters?.siteId) {
      where.employee = {
        siteId: filters.siteId,
      };
    }

    if (filters?.startDate || filters?.endDate) {
      where.date = {};
      if (filters.startDate) {
        where.date.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.date.lte = new Date(filters.endDate);
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.schedule.findMany({
        where,
        skip,
        take: limit,
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              matricule: true,
              position: true,
              site: {
                select: {
                  id: true,
                  name: true,
                },
              },
              department: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          shift: true,
          team: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
        orderBy: [{ date: 'asc' }, { employee: { lastName: 'asc' } }],
      }),
      this.prisma.schedule.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(tenantId: string, id: string) {
    const schedule = await this.prisma.schedule.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            matricule: true,
            position: true,
          },
        },
        shift: true,
        team: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }

    return schedule;
  }

  async update(tenantId: string, id: string, dto: UpdateScheduleDto) {
    await this.findOne(tenantId, id);

    // Verify shift belongs to tenant (if provided)
    if (dto.shiftId) {
      const shift = await this.prisma.shift.findFirst({
        where: {
          id: dto.shiftId,
          tenantId,
        },
      });

      if (!shift) {
        throw new NotFoundException('Shift not found');
      }
    }

    // Verify team belongs to tenant (if provided)
    if (dto.teamId) {
      const team = await this.prisma.team.findFirst({
        where: {
          id: dto.teamId,
          tenantId,
        },
      });

      if (!team) {
        throw new NotFoundException('Team not found');
      }
    }

    // Prepare update data - handle dateDebut/dateFin if provided
    const updateData: any = { ...dto };
    
    // If dateDebut or dateFin are provided, we need to handle them differently
    // For update, we typically update a single schedule, so we only use dateDebut
    if (dto.dateDebut) {
      updateData.date = new Date(dto.dateDebut);
      delete updateData.dateDebut;
      delete updateData.dateFin; // Don't allow changing date range on update
    }

    return this.prisma.schedule.update({
      where: { id },
      data: updateData,
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            matricule: true,
          },
        },
        shift: true,
        team: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);

    return this.prisma.schedule.delete({
      where: { id },
    });
  }

  /**
   * Delete multiple schedules by IDs
   */
  async removeBulk(tenantId: string, ids: string[]) {
    if (!ids || ids.length === 0) {
      throw new BadRequestException('Aucun ID fourni pour la suppression');
    }

    // Verify all schedules belong to tenant
    const schedules = await this.prisma.schedule.findMany({
      where: {
        id: { in: ids },
        tenantId,
      },
      select: { id: true },
    });

    if (schedules.length !== ids.length) {
      throw new BadRequestException('Certains plannings n\'existent pas ou n\'appartiennent pas à votre entreprise');
    }

    const result = await this.prisma.schedule.deleteMany({
      where: {
        id: { in: ids },
        tenantId,
      },
    });

    return {
      count: result.count,
      deleted: result.count,
    };
  }

  async getWeekSchedule(
    tenantId: string,
    date: string,
    filters?: { teamId?: string; siteId?: string },
  ) {
    const targetDate = new Date(date);
    const dayOfWeek = targetDate.getDay();
    const diff = targetDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Monday
    const weekStart = new Date(targetDate.setDate(diff));
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const where: any = {
      tenantId,
      date: {
        gte: weekStart,
        lte: weekEnd,
      },
    };

    if (filters?.teamId) {
      where.teamId = filters.teamId;
    }

    if (filters?.siteId) {
      where.employee = {
        siteId: filters.siteId,
      };
    }

    const schedules = await this.prisma.schedule.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            matricule: true,
            position: true,
            site: {
              select: {
                id: true,
                name: true,
              },
            },
            department: {
              select: {
                id: true,
                name: true,
              },
            },
            team: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
        shift: true,
        team: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: [
        { employee: { lastName: 'asc' } },
        { date: 'asc' },
      ],
    });

    // Get leaves for the week
    const leaves = await this.prisma.leave.findMany({
      where: {
        tenantId,
        status: 'APPROVED',
        startDate: { lte: weekEnd },
        endDate: { gte: weekStart },
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        leaveType: true,
      },
    });

    // Get replacements for the week
    const replacements = await this.prisma.shiftReplacement.findMany({
      where: {
        tenantId,
        date: {
          gte: weekStart,
          lte: weekEnd,
        },
      },
      include: {
        originalEmployee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        replacementEmployee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        shift: true,
      },
    });

    return {
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
      schedules,
      leaves,
      replacements,
    };
  }

  async getMonthSchedule(
    tenantId: string,
    date: string,
    filters?: { teamId?: string; siteId?: string },
  ) {
    const targetDate = new Date(date);
    const monthStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
    monthStart.setHours(0, 0, 0, 0);
    const monthEnd = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);
    monthEnd.setHours(23, 59, 59, 999);

    const where: any = {
      tenantId,
      date: {
        gte: monthStart,
        lte: monthEnd,
      },
    };

    if (filters?.teamId) {
      where.teamId = filters.teamId;
    }

    if (filters?.siteId) {
      where.employee = {
        siteId: filters.siteId,
      };
    }

    const schedules = await this.prisma.schedule.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            matricule: true,
            position: true,
            site: {
              select: {
                id: true,
                name: true,
              },
            },
            department: {
              select: {
                id: true,
                name: true,
              },
            },
            team: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
        shift: true,
        team: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: [
        { date: 'asc' },
        { employee: { lastName: 'asc' } },
      ],
    });

    // Get leaves for the month
    const leaves = await this.prisma.leave.findMany({
      where: {
        tenantId,
        status: 'APPROVED',
        startDate: { lte: monthEnd },
        endDate: { gte: monthStart },
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        leaveType: true,
      },
    });

    // Get replacements for the month
    const replacements = await this.prisma.shiftReplacement.findMany({
      where: {
        tenantId,
        date: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
      include: {
        originalEmployee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        replacementEmployee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        shift: true,
      },
    });

    return {
      monthStart: monthStart.toISOString(),
      monthEnd: monthEnd.toISOString(),
      schedules,
      leaves,
      replacements,
    };
  }

  async createBulk(tenantId: string, schedules: CreateScheduleDto[]) {
    if (!schedules || schedules.length === 0) {
      throw new BadRequestException('Schedules array cannot be empty');
    }

    // Validate all employees, shifts, and teams belong to tenant
    const employeeIds = [...new Set(schedules.map((s) => s.employeeId))];
    const shiftIds = [...new Set(schedules.map((s) => s.shiftId))];
    const teamIds = schedules
      .map((s) => s.teamId)
      .filter((id) => id)
      .filter((id, index, self) => self.indexOf(id) === index);

    const [employees, shifts, teams] = await Promise.all([
      this.prisma.employee.findMany({
        where: {
          id: { in: employeeIds },
          tenantId,
        },
      }),
      this.prisma.shift.findMany({
        where: {
          id: { in: shiftIds },
          tenantId,
        },
      }),
      teamIds.length > 0
        ? this.prisma.team.findMany({
            where: {
              id: { in: teamIds },
              tenantId,
            },
          })
        : [],
    ]);

    if (employees.length !== employeeIds.length) {
      throw new NotFoundException('One or more employees not found');
    }

    if (shifts.length !== shiftIds.length) {
      throw new NotFoundException('One or more shifts not found');
    }

    if (teamIds.length > 0 && teams.length !== teamIds.length) {
      throw new NotFoundException('One or more teams not found');
    }

    // Process each schedule and expand date ranges
    const schedulesToCreate: Array<{
      tenantId: string;
      employeeId: string;
      shiftId: string;
      teamId?: string;
      date: Date;
      customStartTime?: string;
      customEndTime?: string;
      notes?: string;
    }> = [];

    for (const schedule of schedules) {
      const startDate = new Date(schedule.dateDebut);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = schedule.dateFin 
        ? new Date(schedule.dateFin)
        : new Date(schedule.dateDebut);
      endDate.setHours(0, 0, 0, 0);

      // Validate date range
      if (endDate < startDate) {
        continue; // Skip invalid ranges
      }

      // Generate all dates in the range
      const dates = this.generateDateRange(startDate, endDate);

      // Add schedules for each date
      dates.forEach((date) => {
        schedulesToCreate.push({
          tenantId,
          employeeId: schedule.employeeId,
          shiftId: schedule.shiftId,
          teamId: schedule.teamId,
          date,
          customStartTime: schedule.customStartTime,
          customEndTime: schedule.customEndTime,
          notes: schedule.notes,
        });
      });
    }

    if (schedulesToCreate.length === 0) {
      throw new BadRequestException('No valid schedules to create');
    }

    // Create all schedules (skip duplicates)
    const created = await this.prisma.schedule.createMany({
      data: schedulesToCreate,
      skipDuplicates: true,
    });

    return {
      count: created.count,
      total: schedulesToCreate.length,
      skipped: schedulesToCreate.length - created.count,
      message: `Successfully created ${created.count} schedule(s)${schedulesToCreate.length - created.count > 0 ? `, ${schedulesToCreate.length - created.count} skipped (already exist)` : ''}`,
    };
  }

  // Replacements methods
  async createReplacement(tenantId: string, dto: any) {
    // Verify employees belong to tenant
    const [originalEmployee, replacementEmployee] = await Promise.all([
      this.prisma.employee.findFirst({
        where: { id: dto.originalEmployeeId, tenantId },
      }),
      this.prisma.employee.findFirst({
        where: { id: dto.replacementEmployeeId, tenantId },
      }),
    ]);

    if (!originalEmployee || !replacementEmployee) {
      throw new NotFoundException('One or more employees not found');
    }

    // Verify shift belongs to tenant
    const shift = await this.prisma.shift.findFirst({
      where: { id: dto.shiftId, tenantId },
    });

    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    return this.prisma.shiftReplacement.create({
      data: {
        tenantId,
        date: new Date(dto.date),
        originalEmployeeId: dto.originalEmployeeId,
        replacementEmployeeId: dto.replacementEmployeeId,
        shiftId: dto.shiftId,
        reason: dto.reason,
        status: 'PENDING',
      },
      include: {
        originalEmployee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            matricule: true,
          },
        },
        replacementEmployee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            matricule: true,
          },
        },
        shift: true,
      },
    });
  }

  async findAllReplacements(
    tenantId: string,
    filters?: {
      status?: string;
      startDate?: string;
      endDate?: string;
    },
  ) {
    const where: any = { tenantId };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.startDate || filters?.endDate) {
      where.date = {};
      if (filters.startDate) {
        where.date.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.date.lte = new Date(filters.endDate);
      }
    }

    return this.prisma.shiftReplacement.findMany({
      where,
      include: {
        originalEmployee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            matricule: true,
          },
        },
        replacementEmployee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            matricule: true,
          },
        },
        shift: true,
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async approveReplacement(tenantId: string, id: string, approvedBy: string) {
    const replacement = await this.prisma.shiftReplacement.findFirst({
      where: { id, tenantId },
    });

    if (!replacement) {
      throw new NotFoundException('Replacement not found');
    }

    return this.prisma.shiftReplacement.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedBy,
        approvedAt: new Date(),
      },
      include: {
        originalEmployee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        replacementEmployee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        shift: true,
      },
    });
  }

  async rejectReplacement(tenantId: string, id: string, approvedBy: string) {
    const replacement = await this.prisma.shiftReplacement.findFirst({
      where: { id, tenantId },
    });

    if (!replacement) {
      throw new NotFoundException('Replacement not found');
    }

    return this.prisma.shiftReplacement.update({
      where: { id },
      data: {
        status: 'REJECTED',
        approvedBy,
        approvedAt: new Date(),
      },
      include: {
        originalEmployee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        replacementEmployee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        shift: true,
      },
    });
  }

  /**
   * Parse date string (supports DD/MM/YYYY and YYYY-MM-DD formats)
   */
  private parseDate(dateStr: string): Date | null {
    if (!dateStr || typeof dateStr !== 'string') {
      return null;
    }

    const trimmed = dateStr.trim();

    // Try DD/MM/YYYY format (French format)
    const frenchFormat = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
    const frenchMatch = trimmed.match(frenchFormat);
    if (frenchMatch) {
      const [, day, month, year] = frenchMatch;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (date.getFullYear() === parseInt(year) && 
          date.getMonth() === parseInt(month) - 1 && 
          date.getDate() === parseInt(day)) {
        return date;
      }
    }

    // Try YYYY-MM-DD format (ISO format)
    const isoFormat = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;
    const isoMatch = trimmed.match(isoFormat);
    if (isoMatch) {
      const [, year, month, day] = isoMatch;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (date.getFullYear() === parseInt(year) && 
          date.getMonth() === parseInt(month) - 1 && 
          date.getDate() === parseInt(day)) {
        return date;
      }
    }

    // Try Excel date serial number (if it's a number)
    if (!isNaN(Number(trimmed)) && Number(trimmed) > 0) {
      // Excel epoch is 1900-01-01, but JavaScript epoch is 1970-01-01
      // Excel incorrectly treats 1900 as a leap year, so we need to adjust
      const excelEpoch = new Date(1899, 11, 30); // December 30, 1899
      const days = Number(trimmed);
      const date = new Date(excelEpoch);
      date.setDate(date.getDate() + days);
      return date;
    }

    // Try standard Date parsing as fallback
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }

    return null;
  }

  /**
   * Import schedules from Excel file buffer
   */
  async importFromExcel(tenantId: string, fileBuffer: Buffer): Promise<ImportScheduleResultDto> {
    const result: ImportScheduleResultDto = {
      success: 0,
      failed: 0,
      errors: [],
      imported: [],
    };

    try {
      // Read Excel file
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // Convert to JSON
      const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // Skip header row
      const dataRows = rows.slice(1);

      // Get all employees, shifts, and teams for this tenant
      const [employees, shifts, teams] = await Promise.all([
        this.prisma.employee.findMany({
          where: { tenantId },
          select: { id: true, matricule: true },
        }),
        this.prisma.shift.findMany({
          where: { tenantId },
          select: { id: true, code: true },
        }),
        this.prisma.team.findMany({
          where: { tenantId },
          select: { id: true, code: true },
        }),
      ]);

      // Create lookup maps
      const employeeMap = new Map(employees.map((e) => [e.matricule.toUpperCase(), e.id]));
      const shiftMap = new Map(shifts.map((s) => [s.code.toUpperCase(), s.id]));
      const teamMap = new Map(teams.map((t) => [t.code.toUpperCase(), t.id]));

      // Process each row
      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const rowNumber = i + 2; // +2 because of header and 0-index

        try {
          if (!row || row.length === 0 || !row[0]) {
            continue; // Skip empty rows
          }

          const matricule = String(row[0] || '').trim().toUpperCase();
          const dateDebutStr = String(row[1] || '').trim();
          const dateFinStr = row[2] ? String(row[2]).trim() : undefined; // Date fin optionnelle
          const shiftCode = String(row[3] || '').trim().toUpperCase();
          const customStartTime = row[4] ? String(row[4]).trim() : undefined;
          const customEndTime = row[5] ? String(row[5]).trim() : undefined;
          const teamCode = row[6] ? String(row[6]).trim().toUpperCase() : undefined;
          const notes = row[7] ? String(row[7]).trim() : undefined;

          // Validate required fields
          if (!matricule) {
            result.errors.push({
              row: rowNumber,
              error: 'Matricule manquant',
            });
            result.failed++;
            continue;
          }

          if (!dateDebutStr) {
            result.errors.push({
              row: rowNumber,
              matricule,
              error: 'Date de début manquante',
            });
            result.failed++;
            continue;
          }

          if (!shiftCode) {
            result.errors.push({
              row: rowNumber,
              matricule,
              error: 'Code shift manquant',
            });
            result.failed++;
            continue;
          }

          // Parse dates (supports DD/MM/YYYY and YYYY-MM-DD formats)
          let dateDebut: Date;
          let dateFin: Date | undefined;
          
          try {
            dateDebut = this.parseDate(dateDebutStr);
            if (!dateDebut || isNaN(dateDebut.getTime())) {
              throw new Error('Invalid date');
            }
            dateDebut.setHours(0, 0, 0, 0);
          } catch {
            result.errors.push({
              row: rowNumber,
              matricule,
              error: `Date de début invalide: ${dateDebutStr}. Format attendu: DD/MM/YYYY ou YYYY-MM-DD`,
            });
            result.failed++;
            continue;
          }

          // Parse date fin if provided
          if (dateFinStr) {
            try {
              dateFin = this.parseDate(dateFinStr);
              if (!dateFin || isNaN(dateFin.getTime())) {
                throw new Error('Invalid date');
              }
              dateFin.setHours(0, 0, 0, 0);
              if (dateFin < dateDebut) {
                result.errors.push({
                  row: rowNumber,
                  matricule,
                  error: 'La date de fin doit être supérieure ou égale à la date de début',
                });
                result.failed++;
                continue;
              }
            } catch {
              result.errors.push({
                row: rowNumber,
                matricule,
                error: `Date de fin invalide: ${dateFinStr}. Format attendu: DD/MM/YYYY ou YYYY-MM-DD`,
              });
              result.failed++;
              continue;
            }
          }

          // Find employee
          const employeeId = employeeMap.get(matricule);
          if (!employeeId) {
            result.errors.push({
              row: rowNumber,
              matricule,
              error: `Employé avec matricule ${matricule} introuvable`,
            });
            result.failed++;
            continue;
          }

          // Find shift
          const shiftId = shiftMap.get(shiftCode);
          if (!shiftId) {
            result.errors.push({
              row: rowNumber,
              matricule,
              error: `Shift avec code ${shiftCode} introuvable`,
            });
            result.failed++;
            continue;
          }

          // Find team (optional)
          let teamId: string | undefined;
          if (teamCode) {
            teamId = teamMap.get(teamCode);
            if (!teamId) {
              result.errors.push({
                row: rowNumber,
                matricule,
                error: `Équipe avec code ${teamCode} introuvable`,
              });
              result.failed++;
              continue;
            }
          }

          // Validate time format if provided
          const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
          if (customStartTime && !timeRegex.test(customStartTime)) {
            result.errors.push({
              row: rowNumber,
              matricule,
              error: `Heure début invalide: ${customStartTime}. Format attendu: HH:mm`,
            });
            result.failed++;
            continue;
          }

          if (customEndTime && !timeRegex.test(customEndTime)) {
            result.errors.push({
              row: rowNumber,
              matricule,
              error: `Heure fin invalide: ${customEndTime}. Format attendu: HH:mm`,
            });
            result.failed++;
            continue;
          }

          // Generate dates to create
          const endDate = dateFin || dateDebut;
          const datesToCreate = this.generateDateRange(dateDebut, endDate);

          // Check for existing schedules
          const existingSchedules = await this.prisma.schedule.findMany({
            where: {
              tenantId,
              employeeId,
              date: {
                gte: dateDebut,
                lte: endDate,
              },
            },
            select: {
              date: true,
            },
          });

          const existingDates = new Set(
            existingSchedules.map((s) => s.date.toISOString().split('T')[0])
          );

          // Filter out dates that already have schedules
          const datesToCreateFiltered = datesToCreate.filter((date) => {
            const dateStr = date.toISOString().split('T')[0];
            return !existingDates.has(dateStr);
          });

          if (datesToCreateFiltered.length === 0) {
            result.errors.push({
              row: rowNumber,
              matricule,
              error: `Tous les plannings pour cette période existent déjà`,
            });
            result.failed++;
            continue;
          }

          // Create all schedules
          const schedulesToCreate = datesToCreateFiltered.map((date) => ({
            tenantId,
            employeeId,
            shiftId,
            date,
            teamId,
            customStartTime: customStartTime || null,
            customEndTime: customEndTime || null,
            notes: notes || null,
          }));

          await this.prisma.schedule.createMany({
            data: schedulesToCreate,
            skipDuplicates: true,
          });

          result.success += schedulesToCreate.length;
          result.imported.push({
            matricule,
            date: `${dateDebutStr}${dateFinStr ? ` - ${dateFinStr}` : ''}`,
            shiftCode,
          });
        } catch (error: any) {
          result.errors.push({
            row: rowNumber,
            error: error.message || 'Erreur inconnue',
          });
          result.failed++;
        }
      }
    } catch (error: any) {
      throw new BadRequestException(`Erreur lors de la lecture du fichier: ${error.message}`);
    }

    return result;
  }
}
