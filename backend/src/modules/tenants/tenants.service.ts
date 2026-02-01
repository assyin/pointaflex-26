import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { UpdateTenantSettingsDto } from './dto/update-tenant-settings.dto';

@Injectable()
export class TenantsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateTenantDto) {
    // Vérifier si le slug existe
    const existing = await this.prisma.tenant.findUnique({
      where: { slug: dto.slug },
    });

    if (existing) {
      throw new ConflictException('Slug already exists');
    }

    const tenant = await this.prisma.tenant.create({
      data: {
        ...dto,
        settings: {
          create: {}, // Settings par défaut
        },
      },
      include: {
        settings: true,
      },
    });

    return tenant;
  }

  async findAll(page = 1, limit = 20, search?: string) {
    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            { companyName: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [data, total] = await Promise.all([
      this.prisma.tenant.findMany({
        where,
        skip,
        take: limit,
        include: {
          settings: true,
          _count: {
            select: {
              users: true,
              employees: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.tenant.count({ where }),
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

  async findOne(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        settings: true,
        _count: {
          select: {
            users: true,
            employees: true,
            sites: true,
          },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return tenant;
  }

  async update(id: string, dto: UpdateTenantDto) {
    await this.findOne(id);

    return this.prisma.tenant.update({
      where: { id },
      data: dto,
      include: {
        settings: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.tenant.delete({
      where: { id },
    });
  }

  async getSettings(tenantId: string) {
    try {
      // Essayer d'abord avec legalName
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: {
          legalName: true,
          displayName: true,
          country: true,
          city: true,
          hrEmail: true,
          phone: true,
          language: true,
          settings: true,
        },
      });

      if (!tenant) {
        throw new NotFoundException('Tenant not found');
      }

      // Return combined Tenant and Settings data, handling potential null settings
      return {
        // Company Info (from Tenant)
        legalName: tenant.legalName || '',
        displayName: tenant.displayName || '',
        country: tenant.country || '',
        city: tenant.city || '',
        hrEmail: tenant.hrEmail || '',
        phone: tenant.phone || '',
        language: tenant.language || '',
        // Settings (from TenantSettings) - avec valeurs par défaut si null
        ...(tenant.settings || {}),
      };
    } catch (error: any) {
      // Si legalName n'existe pas, réessayer sans cette colonne
      if (error.message?.includes('legalName') || error.message?.includes('does not exist') || error.code === 'P2021') {
        try {
          const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId },
            select: {
              displayName: true,
              country: true,
              city: true,
              hrEmail: true,
              phone: true,
              language: true,
              settings: true,
            },
          });

          if (!tenant) {
            throw new NotFoundException('Tenant not found');
          }

          return {
            legalName: '',
            displayName: tenant.displayName || '',
            country: tenant.country || '',
            city: tenant.city || '',
            hrEmail: tenant.hrEmail || '',
            phone: tenant.phone || '',
            language: tenant.language || '',
            ...(tenant.settings || {}),
          };
        } catch (innerError: any) {
          // Si même cette requête échoue, utiliser include au lieu de select
          const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId },
            include: {
              settings: true,
            },
          });

          if (!tenant) {
            throw new NotFoundException('Tenant not found');
          }

          return {
            legalName: (tenant as any).legalName || '',
            displayName: (tenant as any).displayName || '',
            country: (tenant as any).country || '',
            city: (tenant as any).city || '',
            hrEmail: (tenant as any).hrEmail || '',
            phone: (tenant as any).phone || '',
            language: (tenant as any).language || '',
            ...(tenant.settings || {}),
          };
        }
      }
      throw error;
    }
  }

  async updateSettings(tenantId: string, dto: UpdateTenantSettingsDto) {
    // Verify tenant exists
    await this.findOne(tenantId);

    // Split DTO into Tenant fields and TenantSettings fields
    const {
      legalName,
      displayName,
      country,
      city,
      hrEmail,
      phone,
      language,
      timezone,
      ...settingsData
    } = dto;

    try {
      // Filtrer et mapper les champs de settingsData vers les colonnes TenantSettings
      const filteredSettingsData: any = {};
      
      // Mapper les champs valides de TenantSettings
      const validSettingsFields = [
        'firstDayOfWeek', 'workingDays', 'workDaysPerWeek', 'maxWeeklyHours',
        'lateToleranceEntry', 'earlyToleranceExit', 'breakDuration',
        'overtimeRounding', 'overtimeMinimumThreshold', 'overtimeRate', 'nightShiftRate',
        'overtimeMajorationEnabled', 'overtimeRateStandard', 'overtimeRateNight', 'overtimeRateHoliday', 'overtimeRateEmergency', 'overtimeAutoDetectType',
        'overtimePendingNotificationTime', 'overtimeAutoApprove', 'overtimeAutoApproveMaxHours',
        'nightShiftStart', 'nightShiftEnd',
        'alertWeeklyHoursExceeded', 'alertInsufficientRest', 'alertNightWorkRepetitive', 'alertMinimumStaffing',
        'annualLeaveDays', 'leaveApprovalLevels', 'twoLevelWorkflow', 'anticipatedLeave', 'leaveIncludeSaturday',
        'monthlyPayrollEmail', 'sfptExport', 'requireBreakPunch', 'requireScheduleForAttendance',
        'temporaryMatriculeExpiryDays', 'recoveryConversionRate', 'recoveryExpiryDays', 'dailyWorkingHours',
        'absencePartialThreshold', 'absenceDetectionTime',
        'enableInsufficientRestDetection', 'minimumRestHours', 'minimumRestHoursNightShift',
        'holidayOvertimeEnabled', 'holidayOvertimeRate', 'holidayOvertimeAsNormalHours',
        'missingInDetectionWindowMinutes', 'missingInNotificationFrequencyMinutes',
        'missingOutDetectionWindowMinutes', 'missingOutNotificationFrequencyMinutes',
        'lateNotificationFrequencyMinutes', 'lateNotificationThresholdMinutes',
        'absenceNotificationFrequencyMinutes', 'absenceDetectionBufferMinutes',
        'absencePartialNotificationFrequencyMinutes',
        'doubleInDetectionWindow', 'orphanInThreshold', 'doublePunchToleranceMinutes',
        // Pauses implicites et clôture automatique
        'allowImplicitBreaks', 'minImplicitBreakMinutes', 'maxImplicitBreakMinutes',
        'autoCloseOrphanSessions', 'autoCloseDefaultTime', 'autoCloseOvertimeBuffer', 'autoCloseCheckApprovedOvertime',
        'enableDoubleInPatternDetection', 'doubleInPatternAlertThreshold',
        'allowMissingInForRemoteWork', 'allowMissingInForMissions',
        'missingInReminderEnabled', 'missingInReminderDelay', 'missingInReminderMaxPerDay',
        'enableMissingInPatternDetection', 'missingInPatternAlertThreshold',
        'missingOutDetectionTime', 'missingOutDetectionWindow',
        'allowMissingOutForRemoteWork', 'allowMissingOutForMissions',
        'missingOutReminderEnabled', 'missingOutReminderDelay', 'missingOutReminderBeforeClosing',
        'enableMissingOutPatternDetection', 'missingOutPatternAlertThreshold',
        // Wrong type detection
        'enableWrongTypeDetection', 'wrongTypeAutoCorrect', 'wrongTypeDetectionMethod',
        'wrongTypeShiftMarginMinutes', 'wrongTypeConfidenceThreshold', 'wrongTypeRequiresValidation'
      ];

      for (const [key, value] of Object.entries(settingsData)) {
        if (value !== undefined && validSettingsFields.includes(key)) {
          // Convertir workingDays en JSON si c'est un tableau
          if (key === 'workingDays' && Array.isArray(value)) {
            filteredSettingsData[key] = value;
          } else {
            filteredSettingsData[key] = value;
          }
        }
      }

      // Update both Tenant and TenantSettings in a transaction
      const [tenant, settings] = await this.prisma.$transaction([
        // Update Tenant fields
        this.prisma.tenant.update({
          where: { id: tenantId },
          data: {
            ...(legalName !== undefined && { legalName }),
            ...(displayName !== undefined && { displayName }),
            ...(country !== undefined && { country }),
            ...(city !== undefined && { city }),
            ...(hrEmail !== undefined && { hrEmail }),
            ...(phone !== undefined && { phone }),
            ...(language !== undefined && { language }),
            ...(timezone !== undefined && { timezone }),
          },
        }),
        // Upsert TenantSettings
        this.prisma.tenantSettings.upsert({
          where: { tenantId },
          create: {
            tenantId,
            ...filteredSettingsData,
          },
          update: filteredSettingsData,
        }),
      ]);

      return {
        ...tenant,
        settings,
      };
    } catch (error: any) {
      // Logger l'erreur pour debug
      console.error('Error updating tenant settings:', {
        message: error.message,
        code: error.code,
        meta: error.meta,
        stack: error.stack,
      });
      
      // Si legalName ou d'autres colonnes n'existent pas, réessayer sans ces colonnes
      if (error.message?.includes('does not exist') || error.code === 'P2021' || error.code === 'P2009' || error.code === 'P2011') {
        const tenantData: any = {};
        if (displayName !== undefined) tenantData.displayName = displayName;
        if (country !== undefined) tenantData.country = country;
        if (city !== undefined) tenantData.city = city;
        if (hrEmail !== undefined) tenantData.hrEmail = hrEmail;
        if (phone !== undefined) tenantData.phone = phone;
        if (language !== undefined) tenantData.language = language;
        if (timezone !== undefined) tenantData.timezone = timezone;

        // Filtrer et mapper les champs de settingsData
        const filteredSettingsData: any = {};
        const validSettingsFields = [
          'firstDayOfWeek', 'workingDays', 'workDaysPerWeek', 'maxWeeklyHours',
          'lateToleranceEntry', 'earlyToleranceExit', 'breakDuration',
          'overtimeRounding', 'overtimeMinimumThreshold', 'overtimeRate', 'nightShiftRate',
          'overtimeMajorationEnabled', 'overtimeRateStandard', 'overtimeRateNight', 'overtimeRateHoliday', 'overtimeRateEmergency', 'overtimeAutoDetectType',
          'overtimePendingNotificationTime', 'overtimeAutoApprove', 'overtimeAutoApproveMaxHours',
          'nightShiftStart', 'nightShiftEnd',
          'alertWeeklyHoursExceeded', 'alertInsufficientRest', 'alertNightWorkRepetitive', 'alertMinimumStaffing',
          'annualLeaveDays', 'leaveApprovalLevels', 'twoLevelWorkflow', 'anticipatedLeave', 'leaveIncludeSaturday',
          'monthlyPayrollEmail', 'sfptExport', 'requireBreakPunch', 'requireScheduleForAttendance',
          'temporaryMatriculeExpiryDays', 'recoveryConversionRate', 'recoveryExpiryDays', 'dailyWorkingHours',
          'absencePartialThreshold', 'absenceDetectionTime',
          'enableInsufficientRestDetection', 'minimumRestHours', 'minimumRestHoursNightShift',
          'holidayOvertimeEnabled', 'holidayOvertimeRate', 'holidayOvertimeAsNormalHours',
          'missingInDetectionWindowMinutes', 'missingInNotificationFrequencyMinutes',
          'missingOutDetectionWindowMinutes', 'missingOutNotificationFrequencyMinutes',
          'lateNotificationFrequencyMinutes', 'lateNotificationThresholdMinutes',
          'absenceNotificationFrequencyMinutes', 'absenceDetectionBufferMinutes',
          'absencePartialNotificationFrequencyMinutes',
          'doubleInDetectionWindow', 'orphanInThreshold', 'doublePunchToleranceMinutes',
          // Pauses implicites et clôture automatique
          'allowImplicitBreaks', 'minImplicitBreakMinutes', 'maxImplicitBreakMinutes',
          'autoCloseOrphanSessions', 'autoCloseDefaultTime', 'autoCloseOvertimeBuffer', 'autoCloseCheckApprovedOvertime',
          'enableDoubleInPatternDetection', 'doubleInPatternAlertThreshold',
          'allowMissingInForRemoteWork', 'allowMissingInForMissions',
          'missingInReminderEnabled', 'missingInReminderDelay', 'missingInReminderMaxPerDay',
          'enableMissingInPatternDetection', 'missingInPatternAlertThreshold',
          'missingOutDetectionTime', 'missingOutDetectionWindow',
          'allowMissingOutForRemoteWork', 'allowMissingOutForMissions',
          'missingOutReminderEnabled', 'missingOutReminderDelay', 'missingOutReminderBeforeClosing',
          'enableMissingOutPatternDetection', 'missingOutPatternAlertThreshold',
          // Wrong type detection
          'enableWrongTypeDetection', 'wrongTypeAutoCorrect', 'wrongTypeDetectionMethod',
          'wrongTypeShiftMarginMinutes', 'wrongTypeConfidenceThreshold', 'wrongTypeRequiresValidation'
        ];

        for (const [key, value] of Object.entries(settingsData)) {
          if (value !== undefined && validSettingsFields.includes(key)) {
            // Convertir workingDays en JSON si c'est un tableau
            if (key === 'workingDays' && Array.isArray(value)) {
              filteredSettingsData[key] = value;
            } else {
              filteredSettingsData[key] = value;
            }
          }
        }

        try {
          const [tenant, settings] = await this.prisma.$transaction([
            // Update Tenant fields (sans legalName)
            this.prisma.tenant.update({
              where: { id: tenantId },
              data: tenantData,
            }),
            // Upsert TenantSettings
            this.prisma.tenantSettings.upsert({
              where: { tenantId },
              create: {
                tenantId,
                ...filteredSettingsData,
              },
              update: filteredSettingsData,
            }),
          ]);

          return {
            ...tenant,
            settings,
          };
        } catch (innerError: any) {
          console.error('Error in fallback update:', innerError.message, innerError.code);
          // Si même le fallback échoue, essayer de mettre à jour seulement TenantSettings
          try {
            const filteredSettingsData: any = {};
            const validSettingsFields = [
              'firstDayOfWeek', 'workingDays', 'workDaysPerWeek', 'maxWeeklyHours',
              'lateToleranceEntry', 'earlyToleranceExit', 'breakDuration',
              'overtimeRounding', 'overtimeMinimumThreshold', 'overtimeRate', 'nightShiftRate',
              'overtimeMajorationEnabled', 'overtimeRateStandard', 'overtimeRateNight', 'overtimeRateHoliday', 'overtimeRateEmergency', 'overtimeAutoDetectType',
              'overtimePendingNotificationTime', 'overtimeAutoApprove', 'overtimeAutoApproveMaxHours',
              'nightShiftStart', 'nightShiftEnd',
              'alertWeeklyHoursExceeded', 'alertInsufficientRest', 'alertNightWorkRepetitive', 'alertMinimumStaffing',
              'annualLeaveDays', 'leaveApprovalLevels', 'twoLevelWorkflow', 'anticipatedLeave', 'leaveIncludeSaturday',
              'monthlyPayrollEmail', 'sfptExport', 'requireBreakPunch', 'requireScheduleForAttendance',
              'temporaryMatriculeExpiryDays', 'recoveryConversionRate', 'recoveryExpiryDays', 'dailyWorkingHours',
              'absencePartialThreshold', 'absenceDetectionTime',
              'enableInsufficientRestDetection', 'minimumRestHours', 'minimumRestHoursNightShift',
              'holidayOvertimeEnabled', 'holidayOvertimeRate', 'holidayOvertimeAsNormalHours',
              'missingInDetectionWindowMinutes', 'missingInNotificationFrequencyMinutes',
              'missingOutDetectionWindowMinutes', 'missingOutNotificationFrequencyMinutes',
              'lateNotificationFrequencyMinutes', 'lateNotificationThresholdMinutes',
              'absenceNotificationFrequencyMinutes', 'absenceDetectionBufferMinutes',
              'absencePartialNotificationFrequencyMinutes',
              'doubleInDetectionWindow', 'orphanInThreshold', 'doublePunchToleranceMinutes',
              // Pauses implicites et clôture automatique
              'allowImplicitBreaks', 'minImplicitBreakMinutes', 'maxImplicitBreakMinutes',
              'autoCloseOrphanSessions', 'autoCloseDefaultTime', 'autoCloseOvertimeBuffer', 'autoCloseCheckApprovedOvertime',
              'enableDoubleInPatternDetection', 'doubleInPatternAlertThreshold',
              'allowMissingInForRemoteWork', 'allowMissingInForMissions',
              'missingInReminderEnabled', 'missingInReminderDelay', 'missingInReminderMaxPerDay',
              'enableMissingInPatternDetection', 'missingInPatternAlertThreshold',
              'missingOutDetectionTime', 'missingOutDetectionWindow',
              'allowMissingOutForRemoteWork', 'allowMissingOutForMissions',
              'missingOutReminderEnabled', 'missingOutReminderDelay', 'missingOutReminderBeforeClosing',
              'enableMissingOutPatternDetection', 'missingOutPatternAlertThreshold'
            ];

            for (const [key, value] of Object.entries(settingsData)) {
              if (value !== undefined && validSettingsFields.includes(key)) {
                // Convertir workingDays en JSON si c'est un tableau
                if (key === 'workingDays' && Array.isArray(value)) {
                  filteredSettingsData[key] = value;
                } else {
                  filteredSettingsData[key] = value;
                }
              }
            }
            
            const settings = await this.prisma.tenantSettings.upsert({
              where: { tenantId },
              create: {
                tenantId,
                ...filteredSettingsData,
              },
              update: filteredSettingsData,
            });

            return {
              id: tenantId,
              settings,
            };
          } catch (finalError: any) {
            console.error('Final error:', finalError.message, finalError.code);
            throw finalError;
          }
        }
      }
      throw error;
    }
  }
}
