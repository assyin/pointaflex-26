import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RecoveryDayStatus, ScheduleStatus } from '@prisma/client';
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
  /**
   * Génère une plage de dates avec filtrage selon les critères métier
   * @returns Objet contenant les dates valides et les dates exclues avec leurs raisons
   */
  private generateDateRange(
    startDate: Date,
    endDate: Date,
    filters?: {
      workingDays?: number[]; // Jours ouvrables du tenant (1=Lundi, 2=Mardi, ..., 7=Dimanche)
      holidays?: Array<{ date: Date; name: string }>; // Jours fériés
      employeeId?: string; // Pour vérifier congés et récupérations
      tenantId?: string; // Pour les requêtes
      leaves?: Array<{ startDate: Date; endDate: Date; leaveType?: { name: string } }>; // Congés approuvés
      recoveryDays?: Array<{ startDate: Date; endDate: Date }>; // Jours de récupération
    },
  ): {
    validDates: Date[];
    excludedDates: Array<{ date: Date; reason: string; details?: string }>;
  } {
    const validDates: Date[] = [];
    const excludedDates: Array<{ date: Date; reason: string; details?: string }> = [];
    
    const currentDate = new Date(startDate);
    // Reset time to midnight UTC for comparison
    currentDate.setUTCHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setUTCHours(0, 0, 0, 0);
    
    while (currentDate <= end) {
      const dateStr = currentDate.toISOString().split('T')[0];
      let excluded = false;
      let reason = '';
      let details = '';

      // 1. Vérifier les jours ouvrables
      if (filters?.workingDays && filters.workingDays.length > 0) {
        const dayOfWeek = currentDate.getDay(); // 0 = Dimanche, 1 = Lundi, etc.
        const normalizedDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek; // Convertir dimanche en 7
        
        if (!filters.workingDays.includes(normalizedDayOfWeek)) {
          const dayNames = ['', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
          excluded = true;
          reason = 'NON_OUVRABLE';
          details = `Jour non ouvrable (${dayNames[normalizedDayOfWeek]}) selon la configuration du tenant`;
        }
      }

      // 2. Vérifier les jours fériés (seulement si pas déjà exclu)
      // NOTE: Ne PAS exclure automatiquement les jours fériés
      // L'utilisateur peut vouloir créer un planning pour un jour férié (travail exceptionnel)
      // Les jours fériés sont simplement notés comme information
      if (!excluded && filters?.holidays && filters.holidays.length > 0) {
        const isHoliday = filters.holidays.some((h) => {
          const holidayDate = new Date(h.date);
          holidayDate.setUTCHours(0, 0, 0, 0);
          return holidayDate.getTime() === currentDate.getTime();
        });

        if (isHoliday) {
          // Ne PAS exclure - juste noter qu'il s'agit d'un jour férié
          // L'utilisateur peut décider de créer un planning malgré tout
          // excluded = true;
          // reason = 'JOUR_FERIE';
          // details = `Jour férié détecté mais planning autorisé`;
        }
      }

      // 3. Vérifier les congés approuvés (seulement si pas déjà exclu et employeeId fourni)
      if (!excluded && filters?.employeeId && filters?.leaves && filters.leaves.length > 0) {
        const isOnLeave = filters.leaves.some((leave) => {
          const leaveStart = new Date(leave.startDate);
          leaveStart.setUTCHours(0, 0, 0, 0);
          const leaveEnd = new Date(leave.endDate);
          leaveEnd.setUTCHours(23, 59, 59, 999);
          return currentDate >= leaveStart && currentDate <= leaveEnd;
        });

        if (isOnLeave) {
          const leave = filters.leaves.find((l) => {
            const leaveStart = new Date(l.startDate);
            leaveStart.setUTCHours(0, 0, 0, 0);
            const leaveEnd = new Date(l.endDate);
            leaveEnd.setUTCHours(23, 59, 59, 999);
            return currentDate >= leaveStart && currentDate <= leaveEnd;
          });
          excluded = true;
          reason = 'CONGE';
          details = `Congé approuvé${leave?.leaveType?.name ? `: ${leave.leaveType.name}` : ''}`;
        }
      }

      // 4. Vérifier les jours de récupération (seulement si pas déjà exclu et employeeId fourni)
      if (!excluded && filters?.employeeId && filters?.recoveryDays && filters.recoveryDays.length > 0) {
        const isRecoveryDay = filters.recoveryDays.some((recovery) => {
          const recoveryStart = new Date(recovery.startDate);
          recoveryStart.setUTCHours(0, 0, 0, 0);
          const recoveryEnd = new Date(recovery.endDate);
          recoveryEnd.setUTCHours(23, 59, 59, 999);
          return currentDate >= recoveryStart && currentDate <= recoveryEnd;
        });

        if (isRecoveryDay) {
          excluded = true;
          reason = 'RECUPERATION';
          details = 'Jour de récupération approuvé';
        }
      }

      if (excluded) {
        excludedDates.push({
          date: new Date(currentDate),
          reason,
          details,
        });
      } else {
        validDates.push(new Date(currentDate));
      }

      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }

    return { validDates, excludedDates };
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

    // Récupérer les paramètres du tenant (workingDays)
    const tenantSettings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
      select: { workingDays: true },
    });

    const workingDays = (tenantSettings?.workingDays as number[]) || [1, 2, 3, 4, 5, 6]; // Par défaut: Lun-Sam

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

    // 6. Récupérer les jours fériés pour la période
    const holidays = await this.prisma.holiday.findMany({
      where: {
        tenantId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        date: true,
        name: true,
      },
    });

    // 7. Récupérer les congés approuvés de l'employé pour la période
    const leaves = await this.prisma.leave.findMany({
      where: {
        tenantId,
        employeeId: dto.employeeId,
        status: { in: ['APPROVED', 'MANAGER_APPROVED', 'HR_APPROVED'] },
        OR: [
          {
            startDate: { lte: endDate },
            endDate: { gte: startDate },
          },
        ],
      },
      select: {
        startDate: true,
        endDate: true,
        leaveType: {
          select: {
            name: true,
          },
        },
      },
    });

    // 8. Récupérer les jours de récupération de l'employé pour la période
    const recoveryDays = await this.prisma.recoveryDay.findMany({
      where: {
        tenantId,
        employeeId: dto.employeeId,
        status: { in: [RecoveryDayStatus.APPROVED, RecoveryDayStatus.PENDING] },
        OR: [
          {
            startDate: { lte: endDate },
            endDate: { gte: startDate },
          },
        ],
      },
      select: {
        startDate: true,
        endDate: true,
      },
    });

    // 9. Générer les dates avec filtrage selon tous les critères
    const { validDates: dates, excludedDates } = this.generateDateRange(startDate, endDate, {
      workingDays,
      holidays: holidays.map((h) => ({ date: h.date, name: h.name })),
      employeeId: dto.employeeId,
      tenantId,
      leaves: leaves.map((l) => ({
        startDate: l.startDate,
        endDate: l.endDate,
        leaveType: l.leaveType ? { name: l.leaveType.name } : undefined,
      })),
      recoveryDays: recoveryDays.map((r) => ({
        startDate: r.startDate,
        endDate: r.endDate,
      })),
    });

    // 10. Check for existing schedules (optimized query)
    // IMPORTANT: Check for same employee, same date, AND same shift
    // Business rule: An employee can have MULTIPLE schedules per day for DIFFERENT shifts
    // This is consistent with the database constraint: @@unique([employeeId, date, shiftId])
    // Use UTC dates for query to avoid timezone issues
    const queryStartDate = new Date(startDate);
    queryStartDate.setUTCHours(0, 0, 0, 0);
    const queryEndDate = new Date(endDate);
    queryEndDate.setUTCHours(23, 59, 59, 999); // Include the entire end date

    console.log(`[createSchedule] Vérification des conflits pour ${employee.firstName} ${employee.lastName}`);
    console.log(`[createSchedule] Plage recherchée: ${queryStartDate.toISOString()} à ${queryEndDate.toISOString()}`);
    console.log(`[createSchedule] Shift: ${dto.shiftId}`);

    const existingSchedules = await this.prisma.schedule.findMany({
      where: {
        tenantId,
        employeeId: dto.employeeId,
        shiftId: dto.shiftId, // IMPORTANT: Filter by shiftId - allow multiple shifts per day
        // IMPORTANT: Only check PUBLISHED schedules as conflicts
        // Suspended/cancelled schedules can be replaced
        status: 'PUBLISHED',
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

    console.log(`[createSchedule] ${existingSchedules.length} planning(s) trouvé(s):`);
    existingSchedules.forEach((s) => {
      console.log(`   - Date: ${s.date.toISOString()}, Shift: ${s.shift.name}`);
    });

    // Normalize existing dates to YYYY-MM-DD format in UTC for comparison
    const existingDatesMap = new Map<string, { shiftId: string; shiftName: string; shiftCode: string }>();
    existingSchedules.forEach((s) => {
      const dateStr = this.formatDateToISO(s.date);
      console.log(`   - Normalisation: ${s.date.toISOString()} → ${dateStr}`);
      existingDatesMap.set(dateStr, {
        shiftId: s.shiftId,
        shiftName: s.shift.name,
        shiftCode: s.shift.code,
      });
    });

    // Filter out dates that already have schedules (regardless of shift)
    console.log(`[createSchedule] Dates à créer (avant filtrage):`);
    dates.forEach((d) => console.log(`   - ${this.formatDateToISO(d)}`));

    const datesToCreate = dates.filter((date) => {
      const dateStr = this.formatDateToISO(date);
      const exists = existingDatesMap.has(dateStr);
      if (exists) {
        console.log(`   ❌ ${dateStr} existe déjà`);
      }
      return !exists;
    });

    console.log(`[createSchedule] Dates à créer (après filtrage): ${datesToCreate.length}`);

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

      let errorMessage = `Un planning existe déjà pour le shift "${shift.name}" `;
      errorMessage += `pour ${dateRangeStr} pour l'employé ${employee.firstName} ${employee.lastName}. `;

      if (conflictingDates.length === 1) {
        errorMessage += `Le planning existant est le ${conflictingDates[0].date}. `;
      } else if (conflictingDates.length > 1) {
        errorMessage += `Plannings existants : `;
        errorMessage += conflictingDates.map(c => c.date).join(', ') + '. ';
      }

      errorMessage += `Veuillez modifier le planning existant, choisir un autre shift, ou choisir une autre date.`;
      
      throw new ConflictException(errorMessage);
    }

    // 11. Create all schedules
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

    // 12. Verify that schedules were actually created
    // This is a safety check in case the database constraint prevents creation
    if (result.count === 0 && schedulesToCreate.length > 0) {
      // This should not happen if our conflict check is correct, but it's a safety net
      const startDateStr = this.formatDateToISO(startDate);
      const endDateStr = this.formatDateToISO(endDate);
      const dateRangeStr = startDateStr === endDateStr
        ? `le ${this.formatDate(startDateStr)}`
        : `la période du ${this.formatDate(startDateStr)} au ${this.formatDate(endDateStr)}`;
      throw new ConflictException(
        `Impossible de créer le planning pour le shift "${shift.name}" pour ${dateRangeStr} pour l'employé ${employee.firstName} ${employee.lastName}. Un planning existe déjà pour ce shift pour cette période. Veuillez modifier le planning existant, choisir un autre shift, ou choisir une autre date.`
      );
    }

    // 13. Préparer les dates exclues pour la réponse (formater avec raisons)
    const formattedExcludedDates = excludedDates.map((excluded) => ({
      date: this.formatDateToISO(excluded.date),
      reason: excluded.reason,
      details: excluded.details,
    }));

    // 14. Préparer les dates en conflit (déjà existantes) pour la réponse
    const conflictingDates = dates
      .filter((date) => existingDatesMap.has(this.formatDateToISO(date)))
      .map((date) => {
        const dateStr = this.formatDateToISO(date);
        const existing = existingDatesMap.get(dateStr);
        return {
          date: dateStr,
          shift: existing?.shiftName || existing?.shiftCode || 'shift inconnu',
          reason: 'DEJA_EXISTANT',
          details: `Planning déjà existant pour le shift "${existing?.shiftName || existing?.shiftCode || 'shift inconnu'}"`,
        };
      });

    // 15. Construire le message détaillé
    const totalExcluded = formattedExcludedDates.length + conflictingDates.length;
    let message = `${result.count} planning(s) créé(s)`;
    
    if (totalExcluded > 0) {
      const excludedReasons = new Map<string, number>();
      formattedExcludedDates.forEach((ex) => {
        excludedReasons.set(ex.reason, (excludedReasons.get(ex.reason) || 0) + 1);
      });
      conflictingDates.forEach(() => {
        excludedReasons.set('DEJA_EXISTANT', (excludedReasons.get('DEJA_EXISTANT') || 0) + 1);
      });

      const reasonLabels: Record<string, string> = {
        NON_OUVRABLE: 'jours non ouvrables',
        JOUR_FERIE: 'jours fériés',
        CONGE: 'jours en congé',
        RECUPERATION: 'jours de récupération',
        DEJA_EXISTANT: 'jours avec planning existant',
      };

      const reasonsText = Array.from(excludedReasons.entries())
        .map(([reason, count]) => `${count} ${reasonLabels[reason] || reason}`)
        .join(', ');
      
      message += `, ${totalExcluded} jour(s) exclu(s) (${reasonsText})`;
    }

    // Return detailed summary
    return {
      count: result.count,
      created: result.count,
      skipped: dates.length - datesToCreate.length,
      excluded: formattedExcludedDates.length,
      conflictingDates: conflictingDates.length > 0 ? conflictingDates : undefined,
      excludedDates: formattedExcludedDates.length > 0 ? formattedExcludedDates : undefined,
      dateRange: {
        start: dto.dateDebut,
        end: dto.dateFin || dto.dateDebut,
      },
      message,
      summary: {
        totalDatesInRange: dates.length + excludedDates.length,
        validDates: dates.length,
        created: result.count,
        excludedByReason: {
          nonOuvrable: formattedExcludedDates.filter((e) => e.reason === 'NON_OUVRABLE').length,
          jourFerie: formattedExcludedDates.filter((e) => e.reason === 'JOUR_FERIE').length,
          conge: formattedExcludedDates.filter((e) => e.reason === 'CONGE').length,
          recuperation: formattedExcludedDates.filter((e) => e.reason === 'RECUPERATION').length,
          dejaExistant: conflictingDates.length,
        },
      },
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

    // IMPORTANT: Toujours vérifier le niveau du manager pour appliquer les restrictions appropriées
    // Même avec 'view_all', un manager régional ne doit voir que son département/site assigné
    // Seuls les ADMIN_RH et SUPER_ADMIN (qui ne sont pas managers) devraient voir tous les plannings
    if (userId) {
      const managerLevel = await getManagerLevel(this.prisma, userId, tenantId);

      // Si l'utilisateur est un manager, appliquer le filtrage selon son niveau hiérarchique
      // Même avec 'view_all', un manager ne voit que ce qu'il gère
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
      } else if (hasViewOwn && !hasViewAll) {
        // Si pas manager, n'a PAS 'view_all', mais a 'view_own', filtrer par son propre ID
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
      // Si managerLevel.type === null ET hasViewAll, l'utilisateur voit tout (ADMIN_RH, SUPER_ADMIN)
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
      const { validDates: dates } = this.generateDateRange(startDate, endDate);

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
          const { validDates: datesToCreate } = this.generateDateRange(dateDebut, endDate);

          // Check for existing schedules (same employee, date, AND shift)
          const existingSchedules = await this.prisma.schedule.findMany({
            where: {
              tenantId,
              employeeId,
              shiftId, // IMPORTANT: Check for same shift - allow multiple shifts per day
              // Only check PUBLISHED schedules as conflicts
              status: 'PUBLISHED',
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

          // Filter out dates that already have schedules for this specific shift
          const datesToCreateFiltered = datesToCreate.filter((date) => {
            const dateStr = date.toISOString().split('T')[0];
            return !existingDates.has(dateStr);
          });

          if (datesToCreateFiltered.length === 0) {
            result.errors.push({
              row: rowNumber,
              matricule,
              error: `Tous les plannings pour le shift ${shiftCode} pour cette période existent déjà`,
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

  /**
   * Import schedules from Weekly Calendar Excel format
   * Format: Matricule | Nom | Prénom | Lun | Mar | Mer | Jeu | Ven | Sam | Dim
   * With week start date in a parameters row or separate sheet
   */
  async importFromWeeklyCalendar(tenantId: string, fileBuffer: Buffer): Promise<ImportScheduleResultDto> {
    const result: ImportScheduleResultDto = {
      success: 0,
      failed: 0,
      errors: [],
      imported: [],
    };

    try {
      const XLSX = require('xlsx');
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

      // Check for "Planning" sheet
      const planningSheetName = workbook.SheetNames.find((name: string) =>
        name.toLowerCase().includes('planning') || name === workbook.SheetNames[0]
      );

      if (!planningSheetName) {
        throw new BadRequestException('Feuille "Planning" introuvable dans le fichier');
      }

      const worksheet = workbook.Sheets[planningSheetName];
      const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // Find week start date - look for "Semaine du" row
      let weekStartDate: Date | null = null;
      let dataStartRow = 0;

      for (let i = 0; i < Math.min(5, rows.length); i++) {
        const row = rows[i];
        if (row && row[0]) {
          const firstCell = String(row[0]).toLowerCase();
          if (firstCell.includes('semaine du') || firstCell.includes('semaine')) {
            // Try to find date in the row
            for (let j = 1; j < row.length; j++) {
              if (row[j]) {
                const dateVal = this.parseDate(String(row[j]));
                if (dateVal && !isNaN(dateVal.getTime())) {
                  weekStartDate = dateVal;
                  break;
                }
              }
            }
            dataStartRow = i + 1;
            break;
          }
        }
      }

      // If no "Semaine du" row found, look for header row with Matricule
      if (!weekStartDate) {
        for (let i = 0; i < Math.min(5, rows.length); i++) {
          const row = rows[i];
          if (row && row[0] && String(row[0]).toLowerCase().includes('matricule')) {
            dataStartRow = i + 1;
            // Default to current week's Monday if no date specified
            const today = new Date();
            const dayOfWeek = today.getDay();
            const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Monday
            weekStartDate = new Date(today);
            weekStartDate.setDate(today.getDate() + diff);
            weekStartDate.setHours(0, 0, 0, 0);

            result.errors.push({
              row: 0,
              error: `Date de semaine non trouvée, utilisation de la semaine courante: ${weekStartDate.toLocaleDateString('fr-FR')}`,
            });
            break;
          }
        }
      }

      if (!weekStartDate) {
        throw new BadRequestException('Impossible de déterminer la date de début de semaine. Ajoutez une ligne "Semaine du" avec la date.');
      }

      // Calculate dates for each day of the week (Lun-Dim)
      const weekDates: Date[] = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(weekStartDate);
        date.setDate(weekStartDate.getDate() + i);
        date.setHours(0, 0, 0, 0);
        weekDates.push(date);
      }

      // Get all employees, shifts for this tenant
      const [employees, shifts] = await Promise.all([
        this.prisma.employee.findMany({
          where: { tenantId },
          select: { id: true, matricule: true, firstName: true, lastName: true },
        }),
        this.prisma.shift.findMany({
          where: { tenantId },
          select: { id: true, code: true, name: true },
        }),
      ]);

      // Create lookup maps
      const employeeMap = new Map(employees.map((e) => [e.matricule.toUpperCase(), e.id]));
      const shiftMap = new Map(shifts.map((s) => [s.code.toUpperCase(), s.id]));

      // Also create a map for shift name lookup (case insensitive)
      const shiftNameMap = new Map(shifts.map((s) => [s.name.toUpperCase(), s.id]));

      // Special codes
      const skipCodes = new Set(['-', 'R', 'C', 'REPOS', 'CONGE', 'CONGÉ', 'REC', 'RECUP', 'RÉCUP', '']);

      // Find header row to identify column positions
      let headerRow: any[] | null = null;
      for (let i = dataStartRow - 1; i >= 0; i--) {
        const row = rows[i];
        if (row && row[0] && String(row[0]).toLowerCase().includes('matricule')) {
          headerRow = row;
          break;
        }
      }

      // Determine day columns (assuming order: Matricule, Nom, Prénom, Lun, Mar, Mer, Jeu, Ven, Sam, Dim)
      // Or with département: Matricule, Nom, Prénom, Département, Lun, Mar, Mer, Jeu, Ven, Sam, Dim
      let dayStartCol = 3; // Default: after Matricule, Nom, Prénom

      if (headerRow) {
        for (let j = 0; j < headerRow.length; j++) {
          const header = String(headerRow[j] || '').toLowerCase();
          if (header.includes('lun') || header.includes('mon')) {
            dayStartCol = j;
            break;
          }
        }
      }

      // Process data rows
      const dataRows = rows.slice(dataStartRow);

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const rowNumber = dataStartRow + i + 1; // Excel row number (1-indexed)

        if (!row || row.length === 0 || !row[0]) {
          continue; // Skip empty rows
        }

        const matricule = String(row[0] || '').trim().toUpperCase();

        // Skip total rows or empty matricules
        if (!matricule || matricule === 'TOTAL' || matricule.includes('TOTAL')) {
          continue;
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

        // Process each day column (Lun to Dim = 7 days)
        for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
          const colIndex = dayStartCol + dayIndex;
          const cellValue = row[colIndex] ? String(row[colIndex]).trim().toUpperCase() : '';

          // Skip empty cells or rest/leave codes
          if (!cellValue || skipCodes.has(cellValue)) {
            continue;
          }

          // Parse shift code (may include custom time like "M(08:00-17:00)")
          let shiftCode = cellValue;
          let customStartTime: string | null = null;
          let customEndTime: string | null = null;

          // Check for custom time format: CODE(HH:mm-HH:mm)
          const timeMatch = cellValue.match(/^([A-Z0-9-]+)\((\d{1,2}:\d{2})-(\d{1,2}:\d{2})\)$/);
          if (timeMatch) {
            shiftCode = timeMatch[1];
            customStartTime = timeMatch[2];
            customEndTime = timeMatch[3];
          }

          // Find shift by code or name
          let shiftId = shiftMap.get(shiftCode);
          if (!shiftId) {
            shiftId = shiftNameMap.get(shiftCode);
          }

          if (!shiftId) {
            result.errors.push({
              row: rowNumber,
              matricule,
              error: `Shift "${cellValue}" non reconnu pour le jour ${dayIndex + 1}. Codes disponibles: ${Array.from(shiftMap.keys()).join(', ')}`,
            });
            result.failed++;
            continue;
          }

          const scheduleDate = weekDates[dayIndex];

          // Check for existing schedule
          const existingSchedule = await this.prisma.schedule.findFirst({
            where: {
              tenantId,
              employeeId,
              shiftId,
              date: scheduleDate,
              status: 'PUBLISHED',
            },
          });

          if (existingSchedule) {
            // Skip silently - planning already exists
            continue;
          }

          // Create schedule
          try {
            await this.prisma.schedule.create({
              data: {
                tenantId,
                employeeId,
                shiftId,
                date: scheduleDate,
                customStartTime,
                customEndTime,
                status: 'PUBLISHED',
              },
            });

            result.success++;
          } catch (error: any) {
            // Handle unique constraint violation silently
            if (!error.message?.includes('Unique constraint')) {
              result.errors.push({
                row: rowNumber,
                matricule,
                error: `Erreur création planning: ${error.message}`,
              });
              result.failed++;
            }
          }
        }

        // Add to imported list
        result.imported.push({
          matricule,
          date: `Semaine du ${weekStartDate.toLocaleDateString('fr-FR')}`,
          shiftCode: 'Multiple',
        });
      }

    } catch (error: any) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Erreur lors de la lecture du fichier: ${error.message}`);
    }

    return result;
  }

  /**
   * Generate Weekly Calendar Excel Template
   */
  async generateWeeklyCalendarTemplate(tenantId: string): Promise<Buffer> {
    const XLSX = require('xlsx');

    // Get shifts for this tenant
    const shifts = await this.prisma.shift.findMany({
      where: { tenantId },
      select: { code: true, name: true, startTime: true, endTime: true, isNightShift: true },
      orderBy: { code: 'asc' },
    });

    // Get employees with department info
    const employees = await this.prisma.employee.findMany({
      where: { tenantId, isActive: true },
      include: {
        department: { select: { name: true } },
      },
      orderBy: [
        { department: { name: 'asc' } },
        { lastName: 'asc' },
      ],
    });

    // Calculate current week's Monday
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);

    // Format dates for headers
    const dayHeaders = [];
    const dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      dayHeaders.push(`${dayNames[i]} ${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`);
    }

    // Create Planning sheet
    const planningData = [
      ['PLANNING HEBDOMADAIRE - CALENDRIER'],
      [],
      ['Semaine du', monday.toLocaleDateString('fr-FR'), '', '', '', '', '', '', '', ''],
      [],
      ['Matricule', 'Nom', 'Prénom', 'Département', ...dayHeaders],
    ];

    // Add employee rows
    for (const emp of employees) {
      planningData.push([
        emp.matricule,
        emp.lastName,
        emp.firstName,
        emp.department?.name || '-',
        '', '', '', '', '', '', '' // Empty cells for shifts
      ]);
    }

    // Add totals row
    planningData.push([]);
    planningData.push(['', '', '', 'TOTAL', '', '', '', '', '', '', '']);

    // Create workbook
    const workbook = XLSX.utils.book_new();

    // Planning sheet
    const planningSheet = XLSX.utils.aoa_to_sheet(planningData);
    planningSheet['!cols'] = [
      { wch: 12 }, // Matricule
      { wch: 18 }, // Nom
      { wch: 18 }, // Prénom
      { wch: 15 }, // Département
      { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, // Days
    ];
    XLSX.utils.book_append_sheet(workbook, planningSheet, 'Planning');

    // Create Reference sheet with shift codes
    const referenceData = [
      ['CODES SHIFTS DISPONIBLES'],
      [],
      ['Code', 'Nom du Shift', 'Heure Début', 'Heure Fin', 'Shift Nuit'],
    ];

    for (const shift of shifts) {
      referenceData.push([
        shift.code,
        shift.name,
        shift.startTime,
        shift.endTime,
        shift.isNightShift ? 'Oui' : 'Non',
      ]);
    }

    referenceData.push([]);
    referenceData.push(['CODES SPECIAUX']);
    referenceData.push(['Code', 'Signification']);
    referenceData.push(['-', 'Repos (pas de planning)']);
    referenceData.push(['R', 'Récupération']);
    referenceData.push(['C', 'Congé']);
    referenceData.push([]);
    referenceData.push(['NOTES']);
    referenceData.push(['- Remplissez le code shift dans chaque cellule jour']);
    referenceData.push(['- Laissez vide ou mettez "-" pour les jours de repos']);
    referenceData.push(['- Pour un horaire personnalisé: CODE(HH:mm-HH:mm)']);
    referenceData.push(['  Exemple: MATIN(09:00-18:00)']);

    const referenceSheet = XLSX.utils.aoa_to_sheet(referenceData);
    referenceSheet['!cols'] = [
      { wch: 15 },
      { wch: 25 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
    ];
    XLSX.utils.book_append_sheet(workbook, referenceSheet, 'Codes Shifts');

    // Create Instructions sheet
    const instructionsData = [
      ['INSTRUCTIONS D\'UTILISATION'],
      [],
      ['1. PREPARATION'],
      ['   - Modifiez la date "Semaine du" dans la feuille Planning'],
      ['   - La date doit être un LUNDI (début de semaine)'],
      [],
      ['2. REMPLISSAGE'],
      ['   - Pour chaque employé, indiquez le code shift pour chaque jour'],
      ['   - Utilisez les codes de la feuille "Codes Shifts"'],
      ['   - Laissez vide ou mettez "-" pour les jours de repos'],
      [],
      ['3. CODES SHIFT'],
      ['   - Consultez la feuille "Codes Shifts" pour les codes disponibles'],
      ['   - Les codes sont sensibles à la casse (utilisez MAJUSCULES)'],
      [],
      ['4. HORAIRES PERSONNALISES'],
      ['   - Format: CODE(HH:mm-HH:mm)'],
      ['   - Exemple: MATIN(08:30-17:30)'],
      [],
      ['5. IMPORT'],
      ['   - Sauvegardez le fichier au format .xlsx'],
      ['   - Importez via l\'interface PointaFlex'],
      ['   - Les plannings existants ne seront pas écrasés'],
      [],
      ['EXEMPLE:'],
      [],
      ['Matricule', 'Nom', 'Prénom', 'Département', 'Lun 13/01', 'Mar 14/01', 'Mer 15/01', 'Jeu 16/01', 'Ven 17/01', 'Sam 18/01', 'Dim 19/01'],
      ['00994', 'EL KHAYATI', 'Mohamed', 'GAB', 'MATIN', 'MATIN', 'MATIN', 'MATIN', 'MATIN', '-', '-'],
      ['01066', 'EL MEKKAOUI', 'Hamid', 'GAB', 'SOIR', 'SOIR', 'SOIR', 'SOIR', 'SOIR', '-', '-'],
      ['00906', 'ARABI', 'Yassine', 'TF', 'NUIT', 'NUIT', 'NUIT', 'NUIT', 'NUIT', '-', '-'],
    ];

    const instructionsSheet = XLSX.utils.aoa_to_sheet(instructionsData);
    instructionsSheet['!cols'] = [
      { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
      { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
    ];
    XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions');

    // Generate buffer
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  // ============== ROTATION PLANNING METHODS ==============

  /**
   * Preview rotation planning before generation
   * Shows what schedules will be created for each employee
   */
  async previewRotationPlanning(
    tenantId: string,
    dto: {
      workDays: number;
      restDays: number;
      endDate: string;
      employees: Array<{ employeeId: string; startDate: string }>;
    },
  ) {
    const cycleLength = dto.workDays + dto.restDays;
    const endDate = new Date(dto.endDate);
    endDate.setUTCHours(23, 59, 59, 999);

    const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

    // Get employee details
    const employeeIds = dto.employees.map((e) => e.employeeId);
    const employees = await this.prisma.employee.findMany({
      where: { tenantId, id: { in: employeeIds } },
      select: { id: true, matricule: true, firstName: true, lastName: true },
    });

    const employeeMap = new Map(employees.map((e) => [e.id, e]));

    const preview: Array<{
      employeeId: string;
      matricule: string;
      employeeName: string;
      startDate: string;
      schedule: Array<{ date: string; dayOfWeek: string; isWorkDay: boolean }>;
      totalWorkDays: number;
      totalRestDays: number;
    }> = [];

    let totalSchedulesToCreate = 0;

    for (const empDto of dto.employees) {
      const employee = employeeMap.get(empDto.employeeId);
      if (!employee) continue;

      const startDate = new Date(empDto.startDate);
      startDate.setUTCHours(0, 0, 0, 0);

      const schedule: Array<{ date: string; dayOfWeek: string; isWorkDay: boolean }> = [];
      let totalWorkDays = 0;
      let totalRestDays = 0;

      // Generate schedule from startDate to endDate
      const currentDate = new Date(startDate);
      let dayInCycle = 0; // 0 to cycleLength-1

      while (currentDate <= endDate) {
        const isWorkDay = dayInCycle < dto.workDays;
        const dateStr = currentDate.toISOString().split('T')[0];
        const dayOfWeek = dayNames[currentDate.getUTCDay()];

        schedule.push({
          date: dateStr,
          dayOfWeek,
          isWorkDay,
        });

        if (isWorkDay) {
          totalWorkDays++;
          totalSchedulesToCreate++;
        } else {
          totalRestDays++;
        }

        // Move to next day
        currentDate.setUTCDate(currentDate.getUTCDate() + 1);
        dayInCycle = (dayInCycle + 1) % cycleLength;
      }

      preview.push({
        employeeId: employee.id,
        matricule: employee.matricule,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        startDate: empDto.startDate,
        schedule,
        totalWorkDays,
        totalRestDays,
      });
    }

    return {
      preview,
      totalSchedulesToCreate,
    };
  }

  /**
   * Generate rotation planning (X days work / Y days rest)
   * Creates schedules for each employee based on their start date
   */
  async generateRotationPlanning(
    tenantId: string,
    dto: {
      workDays: number;
      restDays: number;
      shiftId: string;
      endDate: string;
      employees: Array<{ employeeId: string; startDate: string }>;
      overwriteExisting?: boolean;
      respectLeaves?: boolean;
      respectRecoveryDays?: boolean;
    },
  ) {
    const cycleLength = dto.workDays + dto.restDays;
    const endDate = new Date(dto.endDate);
    endDate.setUTCHours(23, 59, 59, 999);

    // Verify shift exists
    const shift = await this.prisma.shift.findFirst({
      where: { tenantId, id: dto.shiftId },
    });

    if (!shift) {
      throw new NotFoundException(`Shift avec l'ID ${dto.shiftId} introuvable`);
    }

    // Get employee details
    const employeeIds = dto.employees.map((e) => e.employeeId);
    const employees = await this.prisma.employee.findMany({
      where: { tenantId, id: { in: employeeIds } },
      select: { id: true, matricule: true, firstName: true, lastName: true },
    });

    const employeeMap = new Map(employees.map((e) => [e.id, e]));

    // Get approved leaves if needed
    let leavesMap = new Map<string, Array<{ startDate: Date; endDate: Date }>>();
    if (dto.respectLeaves !== false) {
      const leaves = await this.prisma.leave.findMany({
        where: {
          tenantId,
          employeeId: { in: employeeIds },
          status: 'APPROVED',
          startDate: { lte: endDate },
        },
        select: { employeeId: true, startDate: true, endDate: true },
      });

      for (const leave of leaves) {
        if (!leavesMap.has(leave.employeeId)) {
          leavesMap.set(leave.employeeId, []);
        }
        leavesMap.get(leave.employeeId)!.push({
          startDate: leave.startDate,
          endDate: leave.endDate,
        });
      }
    }

    // Get approved recovery days if needed
    let recoveryDaysMap = new Map<string, Array<{ startDate: Date; endDate: Date }>>();
    if (dto.respectRecoveryDays !== false) {
      const recoveryDays = await this.prisma.recoveryDay.findMany({
        where: {
          tenantId,
          employeeId: { in: employeeIds },
          status: 'APPROVED',
          startDate: { lte: endDate },
        },
        select: { employeeId: true, startDate: true, endDate: true },
      });

      for (const rd of recoveryDays) {
        if (!recoveryDaysMap.has(rd.employeeId)) {
          recoveryDaysMap.set(rd.employeeId, []);
        }
        recoveryDaysMap.get(rd.employeeId)!.push({
          startDate: rd.startDate,
          endDate: rd.endDate,
        });
      }
    }

    const result = {
      success: 0,
      skipped: 0,
      failed: 0,
      details: [] as Array<{
        employeeId: string;
        matricule: string;
        employeeName: string;
        created: number;
        skipped: number;
        errors: string[];
      }>,
    };

    for (const empDto of dto.employees) {
      const employee = employeeMap.get(empDto.employeeId);
      if (!employee) {
        result.failed++;
        result.details.push({
          employeeId: empDto.employeeId,
          matricule: 'INCONNU',
          employeeName: 'Employé introuvable',
          created: 0,
          skipped: 0,
          errors: [`Employé avec l'ID ${empDto.employeeId} introuvable`],
        });
        continue;
      }

      const startDate = new Date(empDto.startDate);
      startDate.setUTCHours(0, 0, 0, 0);

      const employeeLeaves = leavesMap.get(employee.id) || [];
      const employeeRecoveryDays = recoveryDaysMap.get(employee.id) || [];

      const empResult = {
        employeeId: employee.id,
        matricule: employee.matricule,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        created: 0,
        skipped: 0,
        errors: [] as string[],
      };

      // Generate schedules
      const currentDate = new Date(startDate);
      let dayInCycle = 0;

      const schedulesToCreate: Array<{
        tenantId: string;
        employeeId: string;
        shiftId: string;
        date: Date;
        status: ScheduleStatus;
      }> = [];

      while (currentDate <= endDate) {
        const isWorkDay = dayInCycle < dto.workDays;

        if (isWorkDay) {
          const dateToCheck = new Date(currentDate);

          // Check if date is on leave
          const isOnLeave = employeeLeaves.some((leave) => {
            const leaveStart = new Date(leave.startDate);
            leaveStart.setUTCHours(0, 0, 0, 0);
            const leaveEnd = new Date(leave.endDate);
            leaveEnd.setUTCHours(23, 59, 59, 999);
            return dateToCheck >= leaveStart && dateToCheck <= leaveEnd;
          });

          // Check if date is on recovery day
          const isOnRecovery = employeeRecoveryDays.some((rd) => {
            const rdStart = new Date(rd.startDate);
            rdStart.setUTCHours(0, 0, 0, 0);
            const rdEnd = new Date(rd.endDate);
            rdEnd.setUTCHours(23, 59, 59, 999);
            return dateToCheck >= rdStart && dateToCheck <= rdEnd;
          });

          if (!isOnLeave && !isOnRecovery) {
            schedulesToCreate.push({
              tenantId,
              employeeId: employee.id,
              shiftId: dto.shiftId,
              date: new Date(currentDate),
              status: ScheduleStatus.PUBLISHED,
            });
          } else {
            empResult.skipped++;
            result.skipped++;
          }
        }

        // Move to next day
        currentDate.setUTCDate(currentDate.getUTCDate() + 1);
        dayInCycle = (dayInCycle + 1) % cycleLength;
      }

      // Delete existing schedules if overwriteExisting is true
      // Delete ALL schedules in the date range, not just work days
      if (dto.overwriteExisting) {
        await this.prisma.schedule.deleteMany({
          where: {
            tenantId,
            employeeId: employee.id,
            date: {
              gte: startDate,
              lte: endDate,
            },
          },
        });
      }

      // Create schedules in batch
      if (schedulesToCreate.length > 0) {
        try {
          const createResult = await this.prisma.schedule.createMany({
            data: schedulesToCreate,
            skipDuplicates: !dto.overwriteExisting,
          });

          empResult.created = createResult.count;
          result.success += createResult.count;

          // If skipDuplicates was used, some might have been skipped
          const possiblySkipped = schedulesToCreate.length - createResult.count;
          if (possiblySkipped > 0 && !dto.overwriteExisting) {
            empResult.skipped += possiblySkipped;
            result.skipped += possiblySkipped;
          }
        } catch (error: any) {
          empResult.errors.push(error.message);
          result.failed += schedulesToCreate.length;
        }
      }

      result.details.push(empResult);
    }

    return result;
  }
}
