import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { ImportScheduleResultDto } from './dto/import-schedule.dto';
import * as XLSX from 'xlsx';

@Injectable()
export class SchedulesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Generate all dates between start and end date (inclusive)
   */
  private generateDateRange(startDate: Date, endDate: Date): Date[] {
    const dates: Date[] = [];
    const currentDate = new Date(startDate);
    
    // Reset time to midnight for comparison
    currentDate.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);
    
    while (currentDate <= end) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return dates;
  }

  async create(tenantId: string, dto: CreateScheduleDto) {
    // Log pour debug
    console.log('SchedulesService.create called with:', {
      tenantId,
      dto: JSON.stringify(dto, null, 2),
    });

    // Verify employee belongs to tenant
    const employee = await this.prisma.employee.findFirst({
      where: {
        id: dto.employeeId,
        tenantId,
      },
    });

    if (!employee) {
      console.log('Employee not found:', dto.employeeId);
      throw new NotFoundException('Employee not found');
    }

    // Verify shift belongs to tenant
    const shift = await this.prisma.shift.findFirst({
      where: {
        id: dto.shiftId,
        tenantId,
      },
    });

    if (!shift) {
      throw new NotFoundException('Shift not found');
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

    // Parse dates
    const startDate = new Date(dto.dateDebut);
    startDate.setHours(0, 0, 0, 0);
    
    // Determine end date: if dateFin is provided, use it; otherwise, use dateDebut (single day)
    const endDate = dto.dateFin 
      ? new Date(dto.dateFin)
      : new Date(dto.dateDebut);
    endDate.setHours(0, 0, 0, 0);

    // Validate date range
    if (endDate < startDate) {
      throw new BadRequestException('La date de fin doit être supérieure ou égale à la date de début');
    }

    // Check for maximum range (e.g., 1 year)
    const maxRange = 365; // days
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > maxRange) {
      throw new BadRequestException(`L'intervalle ne peut pas dépasser ${maxRange} jours`);
    }

    // Generate all dates in the range
    const dates = this.generateDateRange(startDate, endDate);

    // Check for existing schedules
    const existingSchedules = await this.prisma.schedule.findMany({
      where: {
        tenantId,
        employeeId: dto.employeeId,
        date: {
          gte: startDate,
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
    const datesToCreate = dates.filter((date) => {
      const dateStr = date.toISOString().split('T')[0];
      return !existingDates.has(dateStr);
    });

    if (datesToCreate.length === 0) {
      throw new ConflictException('Tous les plannings pour cette période existent déjà');
    }

    // Create all schedules
    const schedulesToCreate = datesToCreate.map((date) => ({
      tenantId,
      employeeId: dto.employeeId,
      shiftId: dto.shiftId,
      teamId: dto.teamId,
      date,
      customStartTime: dto.customStartTime,
      customEndTime: dto.customEndTime,
      notes: dto.notes,
    }));

    const result = await this.prisma.schedule.createMany({
      data: schedulesToCreate,
      skipDuplicates: true,
    });

    // Return summary
    return {
      count: result.count,
      created: result.count,
      skipped: dates.length - datesToCreate.length,
      dateRange: {
        start: dto.dateDebut,
        end: dto.dateFin || dto.dateDebut,
      },
      message: `${result.count} planning(s) créé(s)${dates.length - datesToCreate.length > 0 ? `, ${dates.length - datesToCreate.length} ignoré(s) (déjà existants)` : ''}`,
    };
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
  ) {
    const skip = (page - 1) * limit;

    const where: any = { tenantId };

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
