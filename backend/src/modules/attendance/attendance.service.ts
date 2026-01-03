import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RecoveryDayStatus } from '@prisma/client';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { WebhookAttendanceDto } from './dto/webhook-attendance.dto';
import { CorrectAttendanceDto } from './dto/correct-attendance.dto';
import { AttendanceType, NotificationType, DeviceType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { findEmployeeByMatriculeFlexible } from '../../common/utils/matricule.util';
import { getManagerLevel, getManagedEmployeeIds } from '../../common/utils/manager-level.util';

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  /**
   * Arrondit les heures supplémentaires selon la configuration du tenant
   * @param hours Heures en décimal (ex: 1.75 pour 1h45)
   * @param roundingMinutes Minutes d'arrondi (15, 30, ou 60)
   * @returns Heures arrondies
   */
  private roundOvertimeHours(hours: number, roundingMinutes: number): number {
    if (roundingMinutes <= 0) return hours;
    
    const totalMinutes = hours * 60;
    const roundedMinutes = Math.round(totalMinutes / roundingMinutes) * roundingMinutes;
    return roundedMinutes / 60;
  }

  async create(tenantId: string, createAttendanceDto: CreateAttendanceDto) {
    // Logger la tentative de pointage (Cas E)
    let attemptId: string | null = null;
    try {
      // Créer un log de tentative
      const attempt = await this.prisma.attendanceAttempt.create({
        data: {
          tenantId,
          employeeId: createAttendanceDto.employeeId,
          deviceId: createAttendanceDto.deviceId || null,
          timestamp: new Date(createAttendanceDto.timestamp),
          type: createAttendanceDto.type,
          method: createAttendanceDto.method,
          status: 'SUCCESS', // Sera mis à jour si échec
          rawData: createAttendanceDto.rawData || null,
        },
      });
      attemptId = attempt.id;
    } catch (error) {
      // Ne pas bloquer si le logging échoue
      console.error('Erreur lors du logging de la tentative:', error);
    }

    try {
      // Vérifier que l'employé existe
      const employee = await this.prisma.employee.findFirst({
        where: {
          id: createAttendanceDto.employeeId,
          tenantId,
        },
      });

      if (!employee) {
        // Mettre à jour le log en échec
        if (attemptId) {
          await this.prisma.attendanceAttempt.update({
            where: { id: attemptId },
            data: {
              status: 'FAILED',
              errorCode: 'EMPLOYEE_NOT_FOUND',
              errorMessage: 'Employee not found',
            },
          });
        }
        throw new NotFoundException('Employee not found');
      }

      // Vérifier la configuration du pointage des repos
      await this.validateBreakPunch(tenantId, createAttendanceDto.type);

      // VALIDATION RENFORCÉE : Vérifier qu'un planning ou shift existe
      await this.validateScheduleOrShift(tenantId, createAttendanceDto.employeeId, new Date(createAttendanceDto.timestamp), createAttendanceDto.type);

      // Détecter les anomalies
      const anomaly = await this.detectAnomalies(
        tenantId,
        createAttendanceDto.employeeId,
        new Date(createAttendanceDto.timestamp),
        createAttendanceDto.type,
      );

      // Calculer les métriques
      const metrics = await this.calculateMetrics(
        tenantId,
        createAttendanceDto.employeeId,
        new Date(createAttendanceDto.timestamp),
        createAttendanceDto.type,
      );

      const attendance = await this.prisma.attendance.create({
        data: {
          ...createAttendanceDto,
          tenantId,
          timestamp: new Date(createAttendanceDto.timestamp),
          hasAnomaly: anomaly.hasAnomaly,
          anomalyType: anomaly.type,
          anomalyNote: anomaly.note,
          hoursWorked: metrics.hoursWorked ? new Decimal(metrics.hoursWorked) : null,
          lateMinutes: metrics.lateMinutes,
          earlyLeaveMinutes: metrics.earlyLeaveMinutes,
          overtimeMinutes: metrics.overtimeMinutes,
        },
        include: {
          employee: {
            select: {
              id: true,
              matricule: true,
              firstName: true,
              lastName: true,
              photo: true,
              userId: true,
              department: {
                select: {
                  id: true,
                  managerId: true,
                },
              },
              site: {
                select: {
                  id: true,
                  siteManagers: {
                    select: {
                      managerId: true,
                    },
                  },
                },
              },
            },
          },
          site: true,
          device: true,
        },
      });

      // Notifier les managers si anomalie détectée
      if (anomaly.hasAnomaly) {
        await this.notifyManagersOfAnomaly(tenantId, attendance);
      }

      return attendance;
    } catch (error) {
      // Mettre à jour le log en échec si erreur
      if (attemptId) {
        try {
          await this.prisma.attendanceAttempt.update({
            where: { id: attemptId },
            data: {
              status: 'FAILED',
              errorCode: error.code || 'UNKNOWN_ERROR',
              errorMessage: error.message || 'Unknown error occurred',
            },
          });
        } catch (updateError) {
          console.error('Erreur lors de la mise à jour du log:', updateError);
        }
      }
      throw error;
    }
  }

  async handleWebhook(
    tenantId: string,
    deviceId: string,
    webhookData: WebhookAttendanceDto,
  ) {
    // Vérifier que le terminal existe
    const device = await this.prisma.attendanceDevice.findFirst({
      where: { deviceId, tenantId },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    // Trouver l'employé par matricule ou ID
    // D'abord, essayer de trouver par ID (UUID)
    let employee = await this.prisma.employee.findFirst({
      where: {
        tenantId,
        id: webhookData.employeeId,
      },
    });

    // Si pas trouvé par ID, chercher dans le mapping terminal matricule
    if (!employee) {
      try {
        const mapping = await this.prisma.terminalMatriculeMapping.findFirst({
          where: {
            tenantId,
            terminalMatricule: webhookData.employeeId,
            isActive: true,
          },
          include: {
            employee: true,
          },
        });

        if (mapping) {
          employee = mapping.employee;
          console.log(
            `[AttendanceService] ✅ Employé trouvé via mapping terminal: ${mapping.terminalMatricule} → ${mapping.officialMatricule} (${employee.firstName} ${employee.lastName})`,
          );
        }
      } catch (error) {
        console.error(
          `[AttendanceService] Erreur lors de la recherche dans le mapping terminal:`,
          error,
        );
      }
    }

    // Si toujours pas trouvé, chercher par matricule avec gestion des zéros à gauche
    if (!employee) {
      try {
        employee = await findEmployeeByMatriculeFlexible(
          this.prisma,
          tenantId,
          webhookData.employeeId,
        );
      } catch (error) {
        // Log l'erreur pour le débogage mais continue
        console.error(
          `[AttendanceService] Erreur lors de la recherche flexible du matricule ${webhookData.employeeId}:`,
          error,
        );
      }
    }

    if (!employee) {
      throw new NotFoundException(`Employee ${webhookData.employeeId} not found`);
    }

    // Vérifier la configuration du pointage des repos
    await this.validateBreakPunch(tenantId, webhookData.type);

    // Détecter les anomalies
    const anomaly = await this.detectAnomalies(
      tenantId,
      employee.id,
      new Date(webhookData.timestamp),
      webhookData.type,
    );

    // Calculer les métriques
    const metrics = await this.calculateMetrics(
      tenantId,
      employee.id,
      new Date(webhookData.timestamp),
      webhookData.type,
    );

    // Mettre à jour lastSync du terminal pour indiquer qu'il est connecté
    await this.prisma.attendanceDevice.update({
      where: { id: device.id },
      data: { lastSync: new Date() },
    });

    const attendance = await this.prisma.attendance.create({
      data: {
        tenantId,
        employeeId: employee.id,
        deviceId: device.id,
        siteId: device.siteId,
        timestamp: new Date(webhookData.timestamp),
        type: webhookData.type,
        method: webhookData.method,
        rawData: webhookData.rawData,
        hasAnomaly: anomaly.hasAnomaly,
        anomalyType: anomaly.type,
        anomalyNote: anomaly.note,
        hoursWorked: metrics.hoursWorked ? new Decimal(metrics.hoursWorked) : null,
        lateMinutes: metrics.lateMinutes,
        earlyLeaveMinutes: metrics.earlyLeaveMinutes,
        overtimeMinutes: metrics.overtimeMinutes,
      },
      include: {
        employee: {
          select: {
            id: true,
            matricule: true,
            firstName: true,
            lastName: true,
            userId: true,
            department: {
              select: {
                id: true,
                managerId: true,
              },
            },
            site: {
              select: {
                id: true,
                siteManagers: {
                  select: {
                    managerId: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Notifier les managers si anomalie détectée
    if (anomaly.hasAnomaly) {
      await this.notifyManagersOfAnomaly(tenantId, attendance);
    }

    return attendance;
  }

  async findAll(
    tenantId: string,
    filters?: {
      employeeId?: string;
      siteId?: string;
      startDate?: string;
      endDate?: string;
      hasAnomaly?: boolean;
      type?: AttendanceType;
      page?: number;
      limit?: number;
    },
    userId?: string,
    userPermissions?: string[],
  ) {
    const where: any = { tenantId };

    // Filtrer par employé si l'utilisateur n'a que la permission 'attendance.view_own'
    const hasViewAll = userPermissions?.includes('attendance.view_all');
    const hasViewOwn = userPermissions?.includes('attendance.view_own');
    const hasViewTeam = userPermissions?.includes('attendance.view_team');
    const hasViewDepartment = userPermissions?.includes('attendance.view_department');
    const hasViewSite = userPermissions?.includes('attendance.view_site');

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
          return [];
        }
        where.employeeId = { in: managedEmployeeIds };
      } else if (managerLevel.type === 'SITE') {
        // Manager régional : filtrer par les employés du site ET département
        const managedEmployeeIds = await getManagedEmployeeIds(this.prisma, managerLevel, tenantId);
        if (managedEmployeeIds.length === 0) {
          return [];
        }
        where.employeeId = { in: managedEmployeeIds };
      } else if (managerLevel.type === 'TEAM') {
        // Manager d'équipe : filtrer par l'équipe de l'utilisateur
        const employee = await this.prisma.employee.findFirst({
          where: { userId, tenantId },
          select: { teamId: true },
        });

        if (employee?.teamId) {
          // Récupérer tous les employés de la même équipe
          const teamMembers = await this.prisma.employee.findMany({
            where: { teamId: employee.teamId, tenantId },
            select: { id: true },
          });

          where.employeeId = {
            in: teamMembers.map(m => m.id),
          };
        } else {
          // Si pas d'équipe, retourner tableau vide
          return [];
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
          // Si pas d'employé lié, retourner tableau vide
          return [];
        }
      }
    }

    if (filters?.employeeId) where.employeeId = filters.employeeId;
    if (filters?.siteId) where.siteId = filters.siteId;
    if (filters?.hasAnomaly !== undefined) where.hasAnomaly = filters.hasAnomaly;
    if (filters?.type) where.type = filters.type;

    if (filters?.startDate || filters?.endDate) {
      where.timestamp = {};
      if (filters.startDate) {
        // Start of day (00:00:00)
        where.timestamp.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        // End of day (23:59:59.999)
        const endDate = new Date(filters.endDate);
        endDate.setHours(23, 59, 59, 999);
        where.timestamp.lte = endDate;
      }
    }

    // Pagination par défaut pour améliorer les performances
    const page = filters?.page || 1;
    const limit = filters?.limit || 50; // Limite par défaut de 50 éléments
    const skip = (page - 1) * limit;

    // Si pas de pagination demandée explicitement, limiter quand même à 1000 pour éviter les problèmes de performance
    const shouldPaginate = filters?.page !== undefined || filters?.limit !== undefined;
    const maxLimit = shouldPaginate ? limit : Math.min(limit, 1000);

    const [data, total] = await Promise.all([
      this.prisma.attendance.findMany({
        where,
        skip: shouldPaginate ? skip : undefined,
        take: maxLimit,
        select: {
          id: true,
          createdAt: true,
          updatedAt: true,
          tenantId: true,
          employeeId: true,
          siteId: true,
          deviceId: true,
          timestamp: true,
          type: true,
          method: true,
          latitude: true,
          longitude: true,
          hasAnomaly: true,
          anomalyType: true,
          anomalyNote: true,
          isCorrected: true,
          correctedBy: true,
          correctedAt: true,
          correctionNote: true,
          hoursWorked: true,
          lateMinutes: true,
          earlyLeaveMinutes: true,
          overtimeMinutes: true,
          needsApproval: true,
          approvalStatus: true,
          approvedBy: true,
          approvedAt: true,
          rawData: true,
          generatedBy: true,
          isGenerated: true,
          employee: {
            select: {
              id: true,
              matricule: true,
              firstName: true,
              lastName: true,
              photo: true,
              currentShift: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                  startTime: true,
                  endTime: true,
                },
              },
            },
          },
          site: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          device: {
            select: {
              id: true,
              name: true,
              deviceId: true,
              deviceType: true,
            },
          },
        },
        orderBy: { timestamp: 'desc' },
      }),
      this.prisma.attendance.count({ where }),
    ]);

    // Convertir les valeurs Decimal en nombres pour une sérialisation JSON correcte
    const transformedData = data.map(record => ({
      ...record,
      hoursWorked: record.hoursWorked ? Number(record.hoursWorked) : null,
    }));

    // Si pagination demandée, retourner avec métadonnées
    if (shouldPaginate) {
      return {
        data: transformedData,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    }

    // Sinon, retourner juste les données (compatibilité avec l'ancien code)
    return transformedData;
  }

  async remove(tenantId: string, id: string, userId?: string, userPermissions?: string[]) {
    // Récupérer le pointage
    const attendance = await this.prisma.attendance.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            matricule: true,
            departmentId: true,
            siteId: true,
            userId: true,
          },
        },
      },
    });

    if (!attendance) {
      throw new NotFoundException('Pointage non trouvé');
    }

    // Vérifier que le pointage appartient au tenant
    if (attendance.tenantId !== tenantId) {
      throw new ForbiddenException('Accès non autorisé à ce pointage');
    }

    // Vérifier que c'est un pointage manuel (seuls les pointages manuels peuvent être supprimés)
    if (attendance.method !== DeviceType.MANUAL) {
      throw new BadRequestException(
        'Seuls les pointages manuels peuvent être supprimés. Les pointages provenant de dispositifs biométriques ne peuvent pas être supprimés.',
      );
    }

    // Vérifier les permissions
    if (userPermissions && userId) {
      const hasViewAll = userPermissions.includes('attendance.view_all');
      const hasDelete = userPermissions.includes('attendance.delete') || userPermissions.includes('attendance.edit');

      if (!hasDelete) {
        throw new ForbiddenException('Vous n\'avez pas la permission de supprimer des pointages');
      }

      if (!hasViewAll) {
        // Vérifier que l'utilisateur peut voir ce pointage
        const hasViewOwn = userPermissions.includes('attendance.view_own');
        const hasViewTeam = userPermissions.includes('attendance.view_team');
        const hasViewDepartment = userPermissions.includes('attendance.view_department');
        const hasViewSite = userPermissions.includes('attendance.view_site');

        // Vérifier si l'utilisateur est l'employé concerné
        if (hasViewOwn && attendance.employee.userId === userId) {
          // OK, peut supprimer son propre pointage
        } else if (hasViewTeam || hasViewDepartment || hasViewSite) {
          // Vérifier si l'utilisateur est manager de l'employé
          const managerLevel = await getManagerLevel(this.prisma, userId, tenantId);
          const managedEmployeeIds = await getManagedEmployeeIds(
            this.prisma,
            managerLevel,
            tenantId,
          );

          if (!managedEmployeeIds.includes(attendance.employeeId)) {
            throw new ForbiddenException(
              'Vous ne pouvez supprimer que les pointages de vos employés',
            );
          }
        } else {
          throw new ForbiddenException('Vous n\'avez pas la permission de supprimer ce pointage');
        }
      }
    }

    // Supprimer le pointage
    try {
      await this.prisma.attendance.delete({
        where: { id },
      });

      return {
        success: true,
        message: 'Pointage supprimé avec succès',
      };
    } catch (error) {
      console.error('Erreur lors de la suppression du pointage:', error);
      if (error.code === 'P2025') {
        // Record not found
        throw new NotFoundException('Pointage non trouvé');
      }
      throw new BadRequestException(
        `Erreur lors de la suppression du pointage: ${error.message || 'Erreur inconnue'}`,
      );
    }
  }

  async findOne(tenantId: string, id: string) {
    const attendance = await this.prisma.attendance.findFirst({
      where: { id, tenantId },
      include: {
        employee: {
          select: {
            id: true,
            matricule: true,
            firstName: true,
            lastName: true,
            photo: true,
            position: true,
            department: true,
            team: true,
          },
        },
        site: true,
        device: true,
      },
    });

    if (!attendance) {
      throw new NotFoundException(`Attendance record ${id} not found`);
    }

    return attendance;
  }

  async correctAttendance(
    tenantId: string,
    id: string,
    correctionDto: CorrectAttendanceDto,
    userId?: string,
    userPermissions?: string[],
  ) {
    const attendance = await this.prisma.attendance.findFirst({
      where: { id, tenantId },
      include: {
        employee: {
          select: {
            id: true,
            departmentId: true,
            siteId: true,
            teamId: true,
          },
        },
      },
    });

    if (!attendance) {
      throw new NotFoundException(`Attendance record ${id} not found`);
    }

    // Vérifier si l'utilisateur peut corriger ce pointage (si c'est un manager)
    if (userId && userPermissions) {
      const hasViewAll = userPermissions.includes('attendance.view_all');
      
      // Si l'utilisateur n'a pas 'view_all', vérifier qu'il peut gérer cet employé
      if (!hasViewAll) {
        const managerLevel = await getManagerLevel(this.prisma, userId, tenantId);
        
        if (managerLevel.type) {
          // Récupérer les IDs des employés que le manager peut gérer
          const managedEmployeeIds = await getManagedEmployeeIds(this.prisma, managerLevel, tenantId);
          
          // Vérifier que l'employé du pointage est dans la liste des employés gérés
          if (!managedEmployeeIds.includes(attendance.employeeId)) {
            throw new ForbiddenException(
              'Vous ne pouvez corriger que les pointages des employés de votre périmètre',
            );
          }
        } else {
          // Si pas manager et pas 'view_all', vérifier si c'est son propre pointage
          const hasViewOwn = userPermissions.includes('attendance.view_own');
          if (hasViewOwn) {
            const employee = await this.prisma.employee.findFirst({
              where: { userId, tenantId },
              select: { id: true },
            });
            
            if (employee?.id !== attendance.employeeId) {
              throw new ForbiddenException(
                'Vous ne pouvez corriger que vos propres pointages',
              );
            }
          } else {
            throw new ForbiddenException(
              'Vous n\'avez pas la permission de corriger ce pointage',
            );
          }
        }
      }
    }

    // Nouveau timestamp si fourni
    const newTimestamp = correctionDto.correctedTimestamp
      ? new Date(correctionDto.correctedTimestamp)
      : attendance.timestamp;

    // Re-détecter les anomalies avec le nouveau timestamp
    const anomaly = await this.detectAnomalies(
      tenantId,
      attendance.employeeId,
      newTimestamp,
      attendance.type,
    );

    // Recalculer les métriques
    const metrics = await this.calculateMetrics(
      tenantId,
      attendance.employeeId,
      newTimestamp,
      attendance.type,
    );

    // Déterminer si l'approbation est nécessaire (si correction importante)
    const needsApproval = correctionDto.forceApproval
      ? false
      : this.requiresApproval(attendance, newTimestamp, correctionDto.correctionNote);

    const updatedAttendance = await this.prisma.attendance.update({
      where: { id },
      data: {
        isCorrected: !needsApproval, // Seulement marqué comme corrigé si pas besoin d'approbation
        correctedBy: correctionDto.correctedBy,
        correctedAt: needsApproval ? null : new Date(),
        correctionNote: correctionDto.correctionNote,
        timestamp: newTimestamp,
        hasAnomaly: anomaly.hasAnomaly,
        anomalyType: anomaly.type,
        hoursWorked: metrics.hoursWorked ? new Decimal(metrics.hoursWorked) : null,
        lateMinutes: metrics.lateMinutes,
        earlyLeaveMinutes: metrics.earlyLeaveMinutes,
        overtimeMinutes: metrics.overtimeMinutes,
        needsApproval,
        approvalStatus: needsApproval ? 'PENDING_APPROVAL' : null,
      },
      include: {
        employee: {
          select: {
            id: true,
            matricule: true,
            firstName: true,
            lastName: true,
            userId: true,
          },
        },
      },
    });

    // Notifier l'employé de la correction
    if (!needsApproval && updatedAttendance.employee.userId) {
      await this.notifyEmployeeOfCorrection(tenantId, updatedAttendance);
    } else if (needsApproval) {
      // Notifier les managers qu'une approbation est nécessaire
      await this.notifyManagersOfApprovalRequired(tenantId, updatedAttendance);
    }

    return updatedAttendance;
  }

  /**
   * Détermine si une correction nécessite une approbation
   */
  private requiresApproval(
    attendance: any,
    newTimestamp: Date,
    correctionNote: string,
  ): boolean {
    // Correction nécessite approbation si :
    // 1. Changement de timestamp > 2 heures
    const timeDiff = Math.abs(newTimestamp.getTime() - attendance.timestamp.getTime()) / (1000 * 60 * 60);
    if (timeDiff > 2) {
      return true;
    }

    // 2. Anomalie de type ABSENCE, UNPLANNED_PUNCH ou INSUFFICIENT_REST
    // - ABSENCE : pas de pointage alors qu'un planning existe
    // - UNPLANNED_PUNCH : pointage effectué sans planning existant
    // - INSUFFICIENT_REST : repos insuffisant entre shifts
    if (
      attendance.anomalyType === 'ABSENCE' ||
      attendance.anomalyType === 'UNPLANNED_PUNCH' ||
      attendance.anomalyType === 'INSUFFICIENT_REST'
    ) {
      return true;
    }

    return false;
  }

  /**
   * Notifie les managers d'une nouvelle anomalie
   */
  private async notifyManagersOfAnomaly(tenantId: string, attendance: any): Promise<void> {
    try {
      const managerIds = new Set<string>();

      // Récupérer le manager du département
      if (attendance.employee?.department?.managerId) {
        managerIds.add(attendance.employee.department.managerId);
      }

      // Récupérer les managers régionaux du site
      if (attendance.employee?.site?.siteManagers) {
        attendance.employee.site.siteManagers.forEach((sm: any) => {
          managerIds.add(sm.managerId);
        });
      }

      // Créer des notifications pour chaque manager
      for (const managerId of managerIds) {
        const manager = await this.prisma.employee.findUnique({
          where: { id: managerId },
          select: { userId: true, firstName: true, lastName: true },
        });

        if (manager?.userId) {
          await this.prisma.notification.create({
            data: {
              tenantId,
              employeeId: managerId,
              type: NotificationType.ATTENDANCE_ANOMALY,
              title: 'Nouvelle anomalie de pointage détectée',
              message: `Anomalie ${attendance.anomalyType} détectée pour ${attendance.employee.firstName} ${attendance.employee.lastName} (${attendance.employee.matricule})`,
              metadata: {
                attendanceId: attendance.id,
                anomalyType: attendance.anomalyType,
                employeeId: attendance.employeeId,
              },
            },
          });
        }
      }
    } catch (error) {
      console.error('Erreur lors de la notification des managers:', error);
      // Ne pas bloquer la création du pointage en cas d'erreur de notification
    }
  }

  /**
   * Notifie l'employé d'une correction
   */
  private async notifyEmployeeOfCorrection(tenantId: string, attendance: any): Promise<void> {
    try {
      if (!attendance.employee?.userId) return;

      await this.prisma.notification.create({
        data: {
          tenantId,
          employeeId: attendance.employeeId,
          type: NotificationType.ATTENDANCE_CORRECTED,
          title: 'Votre pointage a été corrigé',
          message: `Votre pointage du ${new Date(attendance.timestamp).toLocaleDateString('fr-FR')} a été corrigé par un manager.`,
          metadata: {
            attendanceId: attendance.id,
            correctedAt: attendance.correctedAt,
          },
        },
      });
    } catch (error) {
      console.error('Erreur lors de la notification de l\'employé:', error);
    }
  }

  /**
   * Notifie les managers qu'une approbation est nécessaire
   */
  private async notifyManagersOfApprovalRequired(tenantId: string, attendance: any): Promise<void> {
    try {
      const managerIds = new Set<string>();

      if (attendance.employee?.department?.managerId) {
        managerIds.add(attendance.employee.department.managerId);
      }

      if (attendance.employee?.site?.siteManagers) {
        attendance.employee.site.siteManagers.forEach((sm: any) => {
          managerIds.add(sm.managerId);
        });
      }

      for (const managerId of managerIds) {
        const manager = await this.prisma.employee.findUnique({
          where: { id: managerId },
          select: { userId: true },
        });

        if (manager?.userId) {
          await this.prisma.notification.create({
            data: {
              tenantId,
              employeeId: managerId,
              type: NotificationType.ATTENDANCE_APPROVAL_REQUIRED,
              title: 'Approbation de correction requise',
              message: `Une correction de pointage pour ${attendance.employee.firstName} ${attendance.employee.lastName} nécessite votre approbation.`,
              metadata: {
                attendanceId: attendance.id,
                employeeId: attendance.employeeId,
              },
            },
          });
        }
      }
    } catch (error) {
      console.error('Erreur lors de la notification des managers pour approbation:', error);
    }
  }

  async getAnomalies(
    tenantId: string,
    date?: string,
    userId?: string,
    userPermissions?: string[],
  ) {
    const where: any = {
      tenantId,
      hasAnomaly: true,
      isCorrected: false,
    };

    // Filtrer par manager si nécessaire (seulement si l'utilisateur n'a pas 'view_all')
    const hasViewAll = userPermissions?.includes('attendance.view_all');
    if (userId && !hasViewAll) {
      const managerLevel = await getManagerLevel(this.prisma, userId, tenantId);
      if (managerLevel.type !== null) {
        const managedEmployeeIds = await getManagedEmployeeIds(this.prisma, managerLevel, tenantId);
        if (managedEmployeeIds.length === 0) {
          return [];
        }
        where.employeeId = { in: managedEmployeeIds };
      } else if (userPermissions?.includes('attendance.view_own')) {
        // Si pas manager et a seulement 'view_own', filtrer par son propre ID
        const employee = await this.prisma.employee.findFirst({
          where: { userId, tenantId },
          select: { id: true },
        });
        if (employee) {
          where.employeeId = employee.id;
        } else {
          return [];
        }
      }
    }

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      where.timestamp = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }

    const anomalies = await this.prisma.attendance.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            matricule: true,
            firstName: true,
            lastName: true,
            photo: true,
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
        site: true,
      },
    });

    // Trier par score de criticité (amélioré) puis par date
    const anomaliesWithScores = await Promise.all(
      anomalies.map(async anomaly => ({
        ...anomaly,
        score: await this.calculateAnomalyScore(
          tenantId,
          anomaly.employeeId,
          anomaly.anomalyType,
          anomaly.timestamp,
          !!anomaly.correctionNote, // hasJustification
        ),
      })),
    );

    return anomaliesWithScores.sort((a, b) => {
      if (a.score !== b.score) {
        return b.score - a.score; // Score décroissant
      }
      
      // Si même score, trier par date (plus récent en premier)
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  }

  async getDailyReport(tenantId: string, date: string) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const [totalRecords, uniqueEmployees, lateEntries, anomalies] = await Promise.all([
      this.prisma.attendance.count({
        where: {
          tenantId,
          timestamp: { gte: startOfDay, lte: endOfDay },
        },
      }),

      this.prisma.attendance.findMany({
        where: {
          tenantId,
          timestamp: { gte: startOfDay, lte: endOfDay },
          type: AttendanceType.IN,
        },
        distinct: ['employeeId'],
        select: { employeeId: true },
      }),

      this.prisma.attendance.count({
        where: {
          tenantId,
          timestamp: { gte: startOfDay, lte: endOfDay },
          hasAnomaly: true,
          anomalyType: { contains: 'LATE' },
        },
      }),

      this.prisma.attendance.count({
        where: {
          tenantId,
          timestamp: { gte: startOfDay, lte: endOfDay },
          hasAnomaly: true,
        },
      }),
    ]);

    return {
      date,
      totalRecords,
      uniqueEmployees: uniqueEmployees.length,
      lateEntries,
      anomalies,
    };
  }

  /**
   * Valide si le pointage de repos est autorisé selon la configuration
   */
  private async validateBreakPunch(tenantId: string, type: AttendanceType): Promise<void> {
    // Vérifier si c'est un pointage de repos
    if (type !== AttendanceType.BREAK_START && type !== AttendanceType.BREAK_END) {
      return; // Pas un pointage de repos, pas de validation nécessaire
    }

    // Récupérer la configuration du tenant
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
      select: { requireBreakPunch: true },
    });

    // Si requireBreakPunch est false, rejeter les pointages de repos
    if (!settings?.requireBreakPunch) {
      throw new BadRequestException(
        'Le pointage des repos (pauses) est désactivé pour ce tenant. Contactez votre administrateur pour activer cette fonctionnalité.',
      );
    }
  }

  /**
   * Calcule les métriques (heures travaillées, retards, etc.)
   * Vérifie l'éligibilité de l'employé aux heures supplémentaires
   */
  private async calculateMetrics(
    tenantId: string,
    employeeId: string,
    timestamp: Date,
    type: AttendanceType,
  ): Promise<{
    hoursWorked?: number;
    lateMinutes?: number;
    earlyLeaveMinutes?: number;
    overtimeMinutes?: number;
  }> {
    // Vérifier l'éligibilité de l'employé aux heures supplémentaires
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { isEligibleForOvertime: true },
    });

    // Si l'employé n'est pas éligible, ne pas calculer les heures sup
    const isEligibleForOvertime = employee?.isEligibleForOvertime ?? true; // Par défaut éligible pour rétrocompatibilité

    const startOfDay = new Date(timestamp);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(timestamp);
    endOfDay.setHours(23, 59, 59, 999);

    // Récupérer les pointages du jour
    const todayRecords = await this.prisma.attendance.findMany({
      where: {
        tenantId,
        employeeId,
        timestamp: { gte: startOfDay, lte: endOfDay },
      },
      orderBy: { timestamp: 'asc' },
    });

    const metrics: {
      hoursWorked?: number;
      lateMinutes?: number;
      earlyLeaveMinutes?: number;
      overtimeMinutes?: number;
    } = {};

    // Vérifier si l'employé est en congé approuvé pour cette date
    // Si oui, on ne calcule PAS de retard/départ anticipé (car il ne devrait pas travailler)
    const leave = await this.prisma.leave.findFirst({
      where: {
        tenantId,
        employeeId,
        startDate: { lte: timestamp },
        endDate: { gte: timestamp },
        status: { in: ['APPROVED', 'MANAGER_APPROVED', 'HR_APPROVED'] },
      },
    });

    const isOnApprovedLeave = !!leave;

    // Calculer les heures travaillées si c'est une sortie
    if (type === AttendanceType.OUT) {
      // IMPORTANT: Trouver le IN correspondant (pas forcément le premier!)
      // Utiliser le même algorithme que dans calculateMetrics avancé
      const sortedRecords = [...todayRecords].sort((a, b) =>
        a.timestamp.getTime() - b.timestamp.getTime()
      );

      let inRecord: typeof todayRecords[0] | undefined;
      let outCount = 0;

      for (let i = sortedRecords.length - 1; i >= 0; i--) {
        const record = sortedRecords[i];

        if (record.timestamp.getTime() > timestamp.getTime()) continue;
        if (record.type === AttendanceType.BREAK_START || record.type === AttendanceType.BREAK_END) continue;

        if (record.type === AttendanceType.OUT) {
          outCount++;
        }

        if (record.type === AttendanceType.IN) {
          if (outCount === 0) {
            inRecord = record;
            break;
          } else {
            outCount--;
          }
        }
      }

      if (inRecord) {
        // Calculer les heures brutes
        let hoursWorked = (timestamp.getTime() - inRecord.timestamp.getTime()) / (1000 * 60 * 60);

        // Déduire la pause du shift si applicable
        // IMPORTANT: Utiliser le timestamp du IN pour trouver le bon shift!
        const schedule = await this.getScheduleWithFallback(tenantId, employeeId, inRecord.timestamp);
        if (schedule?.shift?.breakDuration) {
          const breakHours = schedule.shift.breakDuration / 60;
          hoursWorked = Math.max(0, hoursWorked - breakHours);
        }

        metrics.hoursWorked = Math.max(0, hoursWorked);
      }
    }

    // Calculer les retards si c'est une entrée (SAUF si l'employé est en congé approuvé)
    if (type === AttendanceType.IN && !isOnApprovedLeave) {
      // Utiliser la fonction helper avec fallback vers currentShiftId
      const schedule = await this.getScheduleWithFallback(tenantId, employeeId, timestamp);

      if (schedule?.shift) {
        // Calculer l'heure d'entrée prévue
        const expectedStartTime = this.parseTimeString(
          schedule.customStartTime || schedule.shift.startTime,
        );

        // Récupérer le timezone du tenant
        const tenant = await this.prisma.tenant.findUnique({
          where: { id: tenantId },
          select: { timezone: true },
        });
        const timezoneOffset = this.getTimezoneOffset(tenant?.timezone || 'UTC');

        // Construire l'heure de début attendue en tenant compte du timezone
        const expectedStart = new Date(Date.UTC(
          timestamp.getUTCFullYear(),
          timestamp.getUTCMonth(),
          timestamp.getUTCDate(),
          expectedStartTime.hours - timezoneOffset,
          expectedStartTime.minutes,
          0,
          0
        ));

        // Récupérer la tolérance depuis les settings
        const settings = await this.prisma.tenantSettings.findUnique({
          where: { tenantId },
          select: { lateToleranceEntry: true },
        });

        const toleranceMinutes = settings?.lateToleranceEntry || 10;

        // Calculer le retard
        const lateMinutes = Math.max(
          0,
          (timestamp.getTime() - expectedStart.getTime()) / (1000 * 60) - toleranceMinutes,
        );

        if (lateMinutes > 0) {
          metrics.lateMinutes = Math.round(lateMinutes);
        }
      }
    }

    // Calculer le départ anticipé si c'est une sortie (SAUF si l'employé est en congé approuvé)
    if (type === AttendanceType.OUT && !isOnApprovedLeave) {
      // IMPORTANT: Trouver d'abord le IN correspondant pour utiliser le bon shift
      const sortedRecordsForEarly = [...todayRecords].sort((a, b) =>
        a.timestamp.getTime() - b.timestamp.getTime()
      );

      let inRecordForEarly: typeof todayRecords[0] | undefined;
      let outCountForEarly = 0;

      for (let i = sortedRecordsForEarly.length - 1; i >= 0; i--) {
        const record = sortedRecordsForEarly[i];
        if (record.timestamp.getTime() > timestamp.getTime()) continue;
        if (record.type === AttendanceType.BREAK_START || record.type === AttendanceType.BREAK_END) continue;

        if (record.type === AttendanceType.OUT) {
          outCountForEarly++;
        }

        if (record.type === AttendanceType.IN) {
          if (outCountForEarly === 0) {
            inRecordForEarly = record;
            break;
          } else {
            outCountForEarly--;
          }
        }
      }

      // Utiliser le timestamp du IN correspondant pour trouver le bon shift!
      const schedule = inRecordForEarly
        ? await this.getScheduleWithFallback(tenantId, employeeId, inRecordForEarly.timestamp)
        : await this.getScheduleWithFallback(tenantId, employeeId, timestamp);

      if (schedule?.shift) {
        const expectedEndTime = this.parseTimeString(
          schedule.customEndTime || schedule.shift.endTime,
        );

        // Récupérer le timezone du tenant
        const tenant = await this.prisma.tenant.findUnique({
          where: { id: tenantId },
          select: { timezone: true },
        });
        const timezoneOffset = this.getTimezoneOffset(tenant?.timezone || 'UTC');

        // Construire l'heure de fin attendue en tenant compte du timezone
        const expectedEnd = new Date(Date.UTC(
          timestamp.getUTCFullYear(),
          timestamp.getUTCMonth(),
          timestamp.getUTCDate(),
          expectedEndTime.hours - timezoneOffset,
          expectedEndTime.minutes,
          0,
          0
        ));

        // GESTION SHIFT DE NUIT : Si c'est un shift de nuit et que expectedEnd est dans le futur,
        // c'est que la fin devrait être la veille
        const isNight = this.isNightShift(schedule.shift, expectedEndTime);
        if (isNight && expectedEnd.getTime() > timestamp.getTime()) {
          const hoursDiff = (expectedEnd.getTime() - timestamp.getTime()) / (1000 * 60 * 60);
          // Si la différence est > 12h, c'est probablement qu'on doit regarder la veille
          if (hoursDiff > 12) {
            expectedEnd.setUTCDate(expectedEnd.getUTCDate() - 1);
          }
        }

        const settings = await this.prisma.tenantSettings.findUnique({
          where: { tenantId },
          select: { earlyToleranceExit: true },
        });

        const toleranceMinutes = settings?.earlyToleranceExit || 5;

        const earlyLeaveMinutes = Math.max(
          0,
          (expectedEnd.getTime() - timestamp.getTime()) / (1000 * 60) - toleranceMinutes,
        );

        // DEBUG: Logger les calculs de départ anticipé
        console.log(`[calculateMetrics] Départ anticipé:
          - timestamp: ${timestamp.toISOString()}
          - expectedEnd: ${expectedEnd.toISOString()}
          - isNight: ${isNight}
          - diff minutes: ${(expectedEnd.getTime() - timestamp.getTime()) / (1000 * 60)}
          - tolerance: ${toleranceMinutes}
          - earlyLeaveMinutes: ${earlyLeaveMinutes}
        `);

        if (earlyLeaveMinutes > 0) {
          metrics.earlyLeaveMinutes = Math.round(earlyLeaveMinutes);
        }
      }
    }

    // Calculer les heures supplémentaires si c'est une sortie
    if (type === AttendanceType.OUT) {
      console.log(`\n🔍 ===== DEBUG CALCUL HEURES POUR OUT =====`);
      console.log(`📍 OUT timestamp: ${timestamp.toISOString()}`);
      console.log(`📋 todayRecords (${todayRecords.length} records):`);
      todayRecords.forEach((r, i) => {
        console.log(`  ${i}: ${r.type} à ${r.timestamp.toISOString()}`);
      });

      // IMPORTANT: Trouver le IN correspondant à ce OUT spécifique
      // Règle métier: Un OUT ferme UNE session (la dernière session ouverte)
      // Si un employé a plusieurs shifts le même jour, il y aura plusieurs paires IN/OUT

      // Trier les pointages par timestamp (plus anciens d'abord)
      const sortedRecords = [...todayRecords].sort((a, b) =>
        a.timestamp.getTime() - b.timestamp.getTime()
      );

      console.log(`🔍 Recherche du IN correspondant:`);
      // Trouver le IN qui correspond à ce OUT
      // Parcourir en arrière depuis le OUT actuel
      let inRecord: typeof todayRecords[0] | undefined;
      let outCount = 0;

      for (let i = sortedRecords.length - 1; i >= 0; i--) {
        const record = sortedRecords[i];

        console.log(`  i=${i}: ${record.type} à ${record.timestamp.toISOString()}, outCount=${outCount}`);

        // Arrêter si on dépasse l'heure du OUT actuel
        if (record.timestamp.getTime() > timestamp.getTime()) {
          console.log(`    ⏩ Skip (après OUT)`);
          continue;
        }

        // Ignorer les BREAK (BREAK ≠ OUT)
        if (record.type === AttendanceType.BREAK_START || record.type === AttendanceType.BREAK_END) {
          console.log(`    ⏩ Skip (BREAK)`);
          continue;
        }

        // Si on trouve un OUT, augmenter le compteur
        if (record.type === AttendanceType.OUT) {
          outCount++;
          console.log(`    📤 OUT → outCount = ${outCount}`);
        }

        // Si on trouve un IN
        if (record.type === AttendanceType.IN) {
          if (outCount === 0) {
            // C'est le IN qu'on cherche!
            inRecord = record;
            console.log(`    ✅ IN TROUVÉ!`);
            break;
          } else {
            // Ce IN correspond à un autre OUT, décrémenter
            outCount--;
            console.log(`    ⏩ IN autre session → outCount = ${outCount}`);
          }
        }
      }

      if (inRecord) {
        console.log(`\n✅ IN correspondant: ${inRecord.timestamp.toISOString()}`);
        const durationMin = (timestamp.getTime() - inRecord.timestamp.getTime()) / (1000 * 60);
        console.log(`⏱️  Durée brute: ${durationMin.toFixed(2)} min = ${(durationMin / 60).toFixed(2)} h`);
      } else {
        console.log(`\n❌ AUCUN IN trouvé!`);
      }

      if (inRecord) {
        // Récupérer la configuration du tenant (CRITIQUE pour le calcul de la pause et majoration jours fériés)
        const settings = await this.prisma.tenantSettings.findUnique({
          where: { tenantId },
          select: {
            requireBreakPunch: true,
            breakDuration: true,
            overtimeRounding: true,
            holidayOvertimeEnabled: true,
            holidayOvertimeRate: true,
            holidayOvertimeAsNormalHours: true,
          },
        });

        // Utiliser la fonction helper avec fallback vers currentShiftId
        // IMPORTANT: Pour un OUT, utiliser le timestamp du IN correspondant pour trouver le bon shift
        const schedule = await this.getScheduleWithFallback(tenantId, employeeId, inRecord.timestamp);

        if (schedule?.shift) {
          // 1. Calculer les heures travaillées brutes
          const workedMinutesRaw = (timestamp.getTime() - inRecord.timestamp.getTime()) / (1000 * 60);

          // 2. Calculer la pause réelle selon la configuration
          let actualBreakMinutes = 0;

          if (settings?.requireBreakPunch === true) {
            // CAS 1 : Pointage repos ACTIVÉ → Utiliser les pointages BREAK_START/BREAK_END réels
            const breakEvents = todayRecords.filter(
              r => r.type === AttendanceType.BREAK_START || r.type === AttendanceType.BREAK_END,
            );

            // Trier par timestamp
            breakEvents.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

            // Parcourir les paires BREAK_START/BREAK_END
            for (let i = 0; i < breakEvents.length; i += 2) {
              if (
                breakEvents[i].type === AttendanceType.BREAK_START &&
                breakEvents[i + 1]?.type === AttendanceType.BREAK_END
              ) {
                const breakDuration =
                  (breakEvents[i + 1].timestamp.getTime() - breakEvents[i].timestamp.getTime()) /
                  (1000 * 60);
                actualBreakMinutes += breakDuration;
              }
              // Si BREAK_START sans BREAK_END, on ignore (pause non terminée)
            }
          } else {
            // CAS 2 : Pointage repos DÉSACTIVÉ → Utiliser la durée configurée dans TenantSettings
            actualBreakMinutes = settings?.breakDuration || 60; // Défaut: 60 minutes
          }

          // 3. Déduire la pause réelle des heures travaillées brutes
          const workedMinutes = workedMinutesRaw - actualBreakMinutes;

          // 4. Calculer les heures prévues du shift
          const expectedStartTime = this.parseTimeString(
            schedule.customStartTime || schedule.shift.startTime,
          );
          const expectedEndTime = this.parseTimeString(
            schedule.customEndTime || schedule.shift.endTime,
          );

          // Convertir en minutes depuis minuit
          const startMinutes = expectedStartTime.hours * 60 + expectedStartTime.minutes;
          const endMinutes = expectedEndTime.hours * 60 + expectedEndTime.minutes;

          let plannedMinutes = endMinutes - startMinutes;
          // Gérer le cas d'un shift de nuit (ex: 22h-6h)
          if (plannedMinutes < 0) {
            plannedMinutes += 24 * 60; // Ajouter 24 heures
          }

          // 5. Déduire la pause prévue des heures prévues
          // Utiliser TenantSettings.breakDuration en priorité (fallback sur shift.breakDuration)
          const plannedBreakMinutes = settings?.breakDuration || schedule.shift.breakDuration || 60;
          plannedMinutes -= plannedBreakMinutes;

          // 6. Calculer les heures supplémentaires (seulement si l'employé est éligible)
          if (isEligibleForOvertime) {
            // Vérifier si c'est un jour férié
            // IMPORTANT: Utiliser UTC pour éviter les problèmes de timezone
            const dateOnly = new Date(Date.UTC(
              timestamp.getFullYear(),
              timestamp.getMonth(),
              timestamp.getDate(),
              0, 0, 0, 0
            ));
            const dateOnlyEnd = new Date(Date.UTC(
              timestamp.getFullYear(),
              timestamp.getMonth(),
              timestamp.getDate(),
              23, 59, 59, 999
            ));

            const holiday = await this.prisma.holiday.findFirst({
              where: {
                tenantId,
                date: {
                  gte: dateOnly,
                  lte: dateOnlyEnd,
                },
              },
            });

            // Calculer les heures travaillées avant et après minuit (pour shifts de nuit)
            // IMPORTANT: Utiliser UTC pour éviter les problèmes de timezone
            const midnight = new Date(Date.UTC(
              timestamp.getFullYear(),
              timestamp.getMonth(),
              timestamp.getDate(),
              0, 0, 0, 0
            ));
            const inDate = new Date(Date.UTC(
              inRecord.timestamp.getFullYear(),
              inRecord.timestamp.getMonth(),
              inRecord.timestamp.getDate(),
              0, 0, 0, 0
            ));

            let normalHoursMinutes = workedMinutes;
            let holidayHoursMinutes = 0;

            // Si le shift traverse minuit et que le jour de sortie est un jour férié
            if (holiday && inDate.getTime() < dateOnly.getTime()) {
              // Shift de nuit traversant un jour férié
              const midnightTime = midnight.getTime();
              const inTime = inRecord.timestamp.getTime();
              const outTime = timestamp.getTime();

              // Heures avant minuit (jour normal)
              const beforeMidnightMinutes = Math.max(0, (midnightTime - inTime) / (1000 * 60));
              // Heures après minuit (jour férié)
              const afterMidnightMinutes = Math.max(0, (outTime - midnightTime) / (1000 * 60));

              // Déduire la pause proportionnellement
              const totalMinutes = beforeMidnightMinutes + afterMidnightMinutes;
              const breakBeforeMidnight = actualBreakMinutes * (beforeMidnightMinutes / totalMinutes);
              const breakAfterMidnight = actualBreakMinutes * (afterMidnightMinutes / totalMinutes);

              normalHoursMinutes = beforeMidnightMinutes - breakBeforeMidnight;
              holidayHoursMinutes = afterMidnightMinutes - breakAfterMidnight;
            } else if (holiday && inDate.getTime() === dateOnly.getTime()) {
              // Pointage normal un jour férié (pas de shift de nuit)
              // Toutes les heures sont travaillées le jour férié
              holidayHoursMinutes = workedMinutes;
              normalHoursMinutes = 0;
            }

            // Calculer les heures supplémentaires normales
            let overtimeMinutes = normalHoursMinutes - plannedMinutes;
            if (overtimeMinutes < 0) {
              overtimeMinutes = 0;
            }

            // Calculer les heures supplémentaires avec majoration jour férié
            let holidayOvertimeMinutes = 0;
            if (holiday && settings?.holidayOvertimeEnabled !== false) {
              if (settings?.holidayOvertimeAsNormalHours === true) {
                // Traiter comme heures normales sans majoration
                holidayOvertimeMinutes = holidayHoursMinutes;
              } else {
                // Appliquer la majoration
                const holidayRate = settings?.holidayOvertimeRate
                  ? Number(settings.holidayOvertimeRate)
                  : 2.0; // Défaut: double
                holidayOvertimeMinutes = holidayHoursMinutes * holidayRate;
              }
            } else if (holiday && settings?.holidayOvertimeEnabled === false) {
              // Majoration désactivée : traiter comme heures normales
              holidayOvertimeMinutes = holidayHoursMinutes;
            }

            // Total des heures supplémentaires
            const totalOvertimeMinutes = overtimeMinutes + holidayOvertimeMinutes;

            // DEBUG: Logger les calculs d'heures supplémentaires
            console.log(`[calculateMetrics] Heures supplémentaires:
              - workedMinutes: ${workedMinutes}
              - plannedMinutes: ${plannedMinutes}
              - normalHoursMinutes: ${normalHoursMinutes}
              - overtimeMinutes (avant arrondi): ${overtimeMinutes}
              - holidayOvertimeMinutes: ${holidayOvertimeMinutes}
              - totalOvertimeMinutes: ${totalOvertimeMinutes}
            `);

            if (totalOvertimeMinutes > 0) {
              const roundingMinutes = settings?.overtimeRounding || 15;
              const overtimeHours = totalOvertimeMinutes / 60;
              const roundedHours = this.roundOvertimeHours(overtimeHours, roundingMinutes);

              // Convertir en minutes pour le stockage
              metrics.overtimeMinutes = Math.round(roundedHours * 60);

              console.log(`[calculateMetrics] Après arrondi:
                - roundingMinutes: ${roundingMinutes}
                - overtimeHours: ${overtimeHours}
                - roundedHours: ${roundedHours}
                - metrics.overtimeMinutes: ${metrics.overtimeMinutes}
              `);
            }
          } else {
            // Employé non éligible : pas de calcul d'heures sup
            metrics.overtimeMinutes = 0;
          }
        }
      }
    }

    return metrics;
  }

  /**
   * Récupère le schedule pour une date donnée, avec fallback vers currentShiftId si aucun schedule n'existe
   * @returns Schedule avec shift inclus, ou null si aucun schedule et pas de currentShiftId
   */
  private async getScheduleWithFallback(
    tenantId: string,
    employeeId: string,
    date: Date,
  ): Promise<{
    id: string;
    date: Date;
    shiftId: string;
    shift: { id: string; startTime: string; endTime: string; breakDuration?: number };
    customStartTime: string | null;
    customEndTime: string | null;
    status: string;
    tenantId: string;
    employeeId: string;
    createdAt: Date;
    updatedAt: Date;
  } | null> {
    // IMPORTANT: Utiliser Date.UTC pour éviter les problèmes de timezone
    const dateOnly = new Date(Date.UTC(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      0, 0, 0, 0
    ));

    console.log(`[getScheduleWithFallback] Recherche de planning pour la date exacte: ${dateOnly.toISOString()}`);

    // 1. Chercher TOUS les schedules existants pour cette date (PUBLISHED uniquement)
    // IMPORTANT: Un employé peut avoir plusieurs shifts le même jour!
    const schedules = await this.prisma.schedule.findMany({
      where: {
        tenantId,
        employeeId,
        date: dateOnly, // Comparaison exacte de la date
        status: 'PUBLISHED', // Ignorer les plannings suspendus
      },
      include: {
        shift: {
          select: {
            id: true,
            startTime: true,
            endTime: true,
            breakDuration: true,
          },
        },
      },
      orderBy: {
        shift: {
          startTime: 'asc', // Trier par heure de début
        },
      },
    });

    // 2. Si des schedules existent, trouver le plus proche de l'heure du pointage
    if (schedules.length > 0) {
      if (schedules.length === 1) {
        console.log(`[getScheduleWithFallback] ✅ Un seul planning physique trouvé: ${schedules[0].shift.startTime} - ${schedules[0].shift.endTime}`);
        return schedules[0] as any;
      }

      // Multiple shifts le même jour - trouver le plus proche
      console.log(`[getScheduleWithFallback] ⚠️ ${schedules.length} plannings trouvés pour cette date - sélection du plus proche de l'heure du pointage`);

      const attendanceHour = date.getUTCHours();
      const attendanceMinutes = date.getUTCMinutes();
      const attendanceTimeInMinutes = attendanceHour * 60 + attendanceMinutes;

      let closestSchedule = schedules[0];
      let smallestDifference = Infinity;

      // Récupérer le timezone du tenant pour calculer correctement
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { timezone: true },
      });
      const timezoneOffset = this.getTimezoneOffset(tenant?.timezone || 'UTC');

      for (const schedule of schedules) {
        const startTime = this.parseTimeString(
          schedule.customStartTime || schedule.shift.startTime,
        );

        // Convertir l'heure de début du shift en minutes UTC
        const shiftStartInMinutesLocal = startTime.hours * 60 + startTime.minutes;
        const shiftStartInMinutesUTC = shiftStartInMinutesLocal - (timezoneOffset * 60);

        // Calculer la différence absolue
        const difference = Math.abs(attendanceTimeInMinutes - shiftStartInMinutesUTC);

        console.log(`  - Shift ${schedule.shift.startTime}: différence = ${difference} minutes`);

        if (difference < smallestDifference) {
          smallestDifference = difference;
          closestSchedule = schedule;
        }
      }

      console.log(`[getScheduleWithFallback] ✅ Planning le plus proche sélectionné: ${closestSchedule.shift.startTime} - ${closestSchedule.shift.endTime} (différence: ${smallestDifference} min)`);
      return closestSchedule as any;
    }

    console.log(`[getScheduleWithFallback] ❌ Aucun planning physique trouvé pour cette date`);

    // 2.1. GESTION SHIFT DE NUIT : Si pas de planning trouvé et qu'on est tôt le matin (avant 14h),
    // chercher un planning de la veille qui pourrait être un shift de nuit
    const currentHour = date.getHours();
    if (currentHour < 14) {
      console.log(`[getScheduleWithFallback] Heure < 14h (${currentHour}h) → Recherche d'un shift de nuit de la veille`);

      const previousDayDate = new Date(Date.UTC(
        date.getFullYear(),
        date.getMonth(),
        date.getDate() - 1,
        0, 0, 0, 0
      ));

      const previousDaySchedule = await this.prisma.schedule.findFirst({
        where: {
          tenantId,
          employeeId,
          date: previousDayDate,
          status: 'PUBLISHED',
        },
        include: {
          shift: {
            select: {
              id: true,
              startTime: true,
              endTime: true,
              breakDuration: true,
            },
          },
        },
      });

      if (previousDaySchedule?.shift) {
        const expectedEndTime = this.parseTimeString(
          previousDaySchedule.customEndTime || previousDaySchedule.shift.endTime,
        );

        // Vérifier si c'est un shift de nuit (qui se termine tôt le matin)
        const isNight = this.isNightShift(previousDaySchedule.shift, expectedEndTime);

        if (isNight) {
          console.log(`[getScheduleWithFallback] ✅ Shift de nuit trouvé de la veille: ${previousDaySchedule.shift.startTime} - ${previousDaySchedule.shift.endTime}`);
          return previousDaySchedule as any;
        } else {
          console.log(`[getScheduleWithFallback] Planning de la veille trouvé mais ce n'est pas un shift de nuit`);
        }
      } else {
        console.log(`[getScheduleWithFallback] Aucun planning trouvé pour la veille`);
      }
    }

    // 3. FALLBACK : Si pas de schedule, utiliser currentShiftId
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        currentShiftId: true,
        currentShift: {
          select: {
            id: true,
            startTime: true,
            endTime: true,
            breakDuration: true,
          },
        },
      },
    });

    // 4. Si l'employé a un currentShift, créer un schedule virtuel
    if (employee?.currentShift) {
      console.log(`[getScheduleWithFallback] ✅ Shift par défaut trouvé (virtuel): ${employee.currentShift.startTime} - ${employee.currentShift.endTime}`);
      return {
        id: 'virtual',
        date: date,
        shiftId: employee.currentShift.id,
        shift: employee.currentShift,
        customStartTime: null,
        customEndTime: null,
        status: 'PUBLISHED',
        tenantId,
        employeeId,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any;
    }

    // 5. Aucun schedule et pas de currentShift
    console.log(`[getScheduleWithFallback] ❌ Aucun planning ni shift par défaut`);
    return null;
  }

  /**
   * Valide qu'un planning ou shift par défaut existe pour la date donnée
   * @throws BadRequestException si aucun planning ni shift n'existe et que c'est un jour ouvrable sans congé
   */
  private async validateScheduleOrShift(
    tenantId: string,
    employeeId: string,
    timestamp: Date,
    attendanceType?: AttendanceType,
  ): Promise<void> {
    console.log(`[validateScheduleOrShift] Validation pour ${timestamp.toISOString()}, type: ${attendanceType}`);

    // 1. Vérifier si un planning existe pour cette date
    // IMPORTANT: Utiliser Date.UTC pour éviter les problèmes de timezone
    const dateOnly = new Date(Date.UTC(
      timestamp.getFullYear(),
      timestamp.getMonth(),
      timestamp.getDate(),
      0, 0, 0, 0
    ));

    console.log(`[validateScheduleOrShift] Recherche de planning pour la date exacte: ${dateOnly.toISOString()}`);

    const schedule = await this.prisma.schedule.findFirst({
      where: {
        tenantId,
        employeeId,
        date: dateOnly, // Comparaison exacte de la date (sans intervalle)
        status: 'PUBLISHED', // Seulement les plannings publiés
      },
    });

    console.log(`[validateScheduleOrShift] Planning trouvé pour ce jour: ${schedule ? 'OUI' : 'NON'}`);

    // Si un planning existe, la validation passe
    if (schedule) {
      console.log(`[validateScheduleOrShift] ✅ Planning existe → validation OK`);
      return;
    }

    // 1.1. CAS SPÉCIAL : Shift de nuit - Si c'est un OUT et qu'il n'y a pas de planning pour ce jour,
    // vérifier s'il y a un IN la veille (shift de nuit qui traverse minuit)
    if (attendanceType === AttendanceType.OUT) {
      console.log(`[validateScheduleOrShift] Vérification shift de nuit pour OUT...`);

      // Calculer la date de la veille avec UTC
      const previousDayDate = new Date(Date.UTC(
        timestamp.getFullYear(),
        timestamp.getMonth(),
        timestamp.getDate() - 1,
        0, 0, 0, 0
      ));

      console.log(`[validateScheduleOrShift] Recherche planning de la veille: ${previousDayDate.toISOString()}`);

      // Vérifier s'il y a un planning pour la veille
      const previousDaySchedule = await this.prisma.schedule.findFirst({
        where: {
          tenantId,
          employeeId,
          date: previousDayDate, // Comparaison exacte de la date
          status: 'PUBLISHED',
        },
        include: {
          shift: true,
        },
      });

      if (previousDaySchedule) {
        console.log(`[validateScheduleOrShift] Planning de la veille trouvé: ${previousDaySchedule.shift.startTime} - ${previousDaySchedule.shift.endTime}`);

        // Vérifier si c'est un shift de nuit
        const expectedEndTime = this.parseTimeString(
          previousDaySchedule.customEndTime || previousDaySchedule.shift.endTime,
        );
        const isNightShift = this.isNightShift(previousDaySchedule.shift, expectedEndTime);

        console.log(`[validateScheduleOrShift] Est un shift de nuit: ${isNightShift}`);

        if (isNightShift) {
          console.log(`[validateScheduleOrShift] ✅ Shift de nuit détecté pour la veille → OUT du lendemain autorisé`);
          console.log(`[validateScheduleOrShift] Note: Pas besoin de vérifier l'IN - le système de détection d'anomalies gérera MISSING_IN si nécessaire`);
          // C'est un shift de nuit qui traverse minuit, autoriser le OUT
          // Même si l'employé a oublié de pointer l'IN, on autorise le OUT
          // Le système de détection d'anomalies créera MISSING_IN si nécessaire
          return;
        }
      } else {
        console.log(`[validateScheduleOrShift] Aucun planning trouvé pour la veille`);
      }
    }

    // 2. Vérifier si l'employé a un shift par défaut
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        currentShiftId: true,
        firstName: true,
        lastName: true,
        matricule: true,
      },
    });

    // 3. Vérifier le paramètre de configuration
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
      select: {
        workingDays: true,
        requireScheduleForAttendance: true,
      },
    });

    // 4. PRIORITÉ MAXIMALE : Vérifier si c'est un jour férié
    // Les jours fériés nécessitent TOUJOURS un planning explicite, même si l'employé a un currentShiftId
    const timestampDate = new Date(timestamp);
    const holidayDateOnly = new Date(Date.UTC(
      timestampDate.getFullYear(),
      timestampDate.getMonth(),
      timestampDate.getDate(),
      0, 0, 0, 0
    ));

    const holiday = await this.prisma.holiday.findFirst({
      where: {
        tenantId,
        date: holidayDateOnly,
      },
    });

    // Si c'est un jour férié et que requireScheduleForAttendance est activé, vérifier le planning
    if (holiday && settings?.requireScheduleForAttendance !== false) {
      // Vérifier s'il y a un congé ou récupération approuvé pour ce jour férié
      const leave = await this.prisma.leave.findFirst({
        where: {
          tenantId,
          employeeId,
          startDate: { lte: timestamp },
          endDate: { gte: timestamp },
          status: { in: ['APPROVED', 'MANAGER_APPROVED', 'HR_APPROVED'] },
        },
      });

      const recoveryDay = await this.prisma.recoveryDay.findFirst({
        where: {
          tenantId,
          employeeId,
          startDate: { lte: timestamp },
          endDate: { gte: timestamp },
          status: { in: ['APPROVED', 'PENDING'] },
        },
      });

      if (!leave && !recoveryDay) {
        const employeeName = employee
          ? `${employee.firstName} ${employee.lastName} (${employee.matricule})`
          : `ID: ${employeeId}`;

        const dayNames = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
        const dayName = dayNames[timestamp.getDay()];

        throw new BadRequestException(
          `Impossible de créer un pointage pour ${employeeName} le ${timestamp.toLocaleDateString('fr-FR')} (${dayName} - jour férié: ${holiday.name}) : ` +
          `aucun planning publié pour ce jour férié. ` +
          `Veuillez créer un planning pour autoriser le travail le jour férié "${holiday.name}".`
        );
      }
    }

    // 5. VÉRIFIER D'ABORD SI C'EST UN WEEKEND (AVANT currentShiftId)
    // Les weekends nécessitent TOUJOURS un planning explicite, même si l'employé a un currentShiftId
    const dayOfWeek = timestamp.getDay(); // 0 = Dimanche, 1 = Lundi, etc.
    const workingDays = (settings?.workingDays as number[]) || [1, 2, 3, 4, 5, 6];
    const normalizedDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;
    const isWorkingDay = workingDays.includes(normalizedDayOfWeek);

    // Si c'est un weekend (jour non ouvrable) ET qu'il n'y a ni planning,
    // TOUJOURS rejeter le pointage, même si l'employé a un currentShiftId
    if (!isWorkingDay) {
      // Vérifier s'il y a un congé ou récupération approuvé pour le weekend
      const leave = await this.prisma.leave.findFirst({
        where: {
          tenantId,
          employeeId,
          startDate: { lte: timestamp },
          endDate: { gte: timestamp },
          status: { in: ['APPROVED', 'MANAGER_APPROVED', 'HR_APPROVED'] },
        },
      });

      const recoveryDay = await this.prisma.recoveryDay.findFirst({
        where: {
          tenantId,
          employeeId,
          startDate: { lte: timestamp },
          endDate: { gte: timestamp },
          status: { in: ['APPROVED', 'PENDING'] },
        },
      });

      if (!leave && !recoveryDay) {
        const employeeName = employee
          ? `${employee.firstName} ${employee.lastName} (${employee.matricule})`
          : `ID: ${employeeId}`;

        const dayNames = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
        const dayName = dayNames[dayOfWeek];

        throw new BadRequestException(
          `Impossible de créer un pointage pour ${employeeName} le ${timestamp.toLocaleDateString('fr-FR')} (${dayName} - weekend) : ` +
          `jour non ouvrable sans planning publié. ` +
          `Veuillez créer un planning pour autoriser le travail en weekend.`
        );
      }
    }

    // 6. Si un shift par défaut existe (et que c'est un jour ouvrable), la validation passe
    if (employee?.currentShiftId) {
      return;
    }

    // 7. Si la validation est désactivée, permettre le pointage (mais l'anomalie sera détectée)
    if (settings?.requireScheduleForAttendance === false) {
      return;
    }

    // 8. Pour jour ouvrable sans planning ni shift:
    // - Laisser passer (pas de blocage strict)
    // - La détection d'anomalies créera ABSENCE ou LEAVE_CONFLICT selon le cas
    if (isWorkingDay) {
      // Jour ouvrable sans planning → Laisser passer, anomalie sera détectée
      console.log(`[validateScheduleOrShift] Jour ouvrable sans planning → Autoriser (anomalie sera détectée)`);
      return;
    }

    // 9. Vérifier s'il y a une récupération approuvée pour cette date
    const recoveryDay = await this.prisma.recoveryDay.findFirst({
      where: {
        tenantId,
        employeeId,
        startDate: { lte: timestamp },
        endDate: { gte: timestamp },
        status: { in: ['APPROVED', 'PENDING'] },
      },
    });

    // Si une récupération est approuvée, autoriser le pointage
    if (recoveryDay) {
      return;
    }

    // 8. Aucune exception trouvée : refuser le pointage
    const employeeName = employee 
      ? `${employee.firstName} ${employee.lastName} (${employee.matricule})`
      : `ID: ${employeeId}`;
    
    throw new BadRequestException(
      `Impossible de créer un pointage pour ${employeeName} le ${timestamp.toLocaleDateString('fr-FR')} : ` +
      `aucun planning publié, aucun shift par défaut assigné, et aucun congé/récupération approuvé pour cette date. ` +
      `Veuillez créer un planning ou assigner un shift par défaut à l'employé.`
    );
  }

  /**
   * Parse une chaîne de temps (HH:mm) en objet {hours, minutes}
   */
  private parseTimeString(timeString: string): { hours: number; minutes: number } {
    const [hours, minutes] = timeString.split(':').map(Number);
    return { hours: hours || 0, minutes: minutes || 0 };
  }

  /**
   * Détection améliorée de DOUBLE_IN avec toutes les améliorations
   * Implémente:
   * - 1.1 Fenêtre Temporelle Intelligente
   * - 1.2 Gestion des Shifts Multiples
   * - 1.3 Détection de Patterns Suspects (analytics)
   * - 1.4 Suggestion Automatique de Correction
   * - 1.5 Gestion des Erreurs de Badgeage
   */
  private async detectDoubleInImproved(
    tenantId: string,
    employeeId: string,
    timestamp: Date,
    todayRecords: any[],
  ): Promise<{ hasAnomaly: boolean; type?: string; note?: string; suggestedCorrection?: any }> {
    // Récupérer les paramètres configurables
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
      select: {
        doubleInDetectionWindow: true,
        orphanInThreshold: true,
        doublePunchToleranceMinutes: true,
        enableDoubleInPatternDetection: true,
        doubleInPatternAlertThreshold: true,
      },
    });

    const detectionWindowHours = settings?.doubleInDetectionWindow || 24;
    const orphanThresholdHours = settings?.orphanInThreshold || 12;
    const toleranceMinutes = settings?.doublePunchToleranceMinutes || 2;
    const enablePatternDetection = settings?.enableDoubleInPatternDetection !== false;
    const patternAlertThreshold = settings?.doubleInPatternAlertThreshold || 3;

    // Récupérer les IN du jour
    const todayInRecords = todayRecords.filter(r => r.type === AttendanceType.IN);

    // 1.5 Gestion des Erreurs de Badgeage - Vérifier si c'est un double badgeage rapide
    if (todayInRecords.length > 0) {
      const lastIn = todayInRecords[todayInRecords.length - 1];
      const timeDiff = (timestamp.getTime() - lastIn.timestamp.getTime()) / (1000 * 60); // en minutes

      if (timeDiff <= toleranceMinutes) {
        // Erreur de badgeage - journaliser mais ne pas créer d'anomalie
        // Le pointage sera créé mais marqué comme erreur de badgeage (soft delete suggéré)
        return {
          hasAnomaly: true,
          type: 'DOUBLE_IN',
          note: `Erreur de badgeage détectée (${Math.round(timeDiff)} min d'intervalle). Pointage à ignorer.`,
          suggestedCorrection: {
            type: 'IGNORE_DUPLICATE',
            reason: 'DOUBLE_PUNCH_ERROR',
            confidence: 95,
          },
        };
      }
    }

    // 1.1 Fenêtre Temporelle Intelligente - Vérifier les IN orphelins
    const detectionWindowStart = new Date(timestamp.getTime() - detectionWindowHours * 60 * 60 * 1000);
    
    // Récupérer tous les IN dans la fenêtre de détection
    const recentInRecords = await this.prisma.attendance.findMany({
      where: {
        tenantId,
        employeeId,
        type: AttendanceType.IN,
        timestamp: { gte: detectionWindowStart, lt: timestamp },
      },
      orderBy: { timestamp: 'desc' },
    });

    // Vérifier si le dernier IN est orphelin (sans OUT correspondant)
    if (recentInRecords.length > 0) {
      const lastInRecord = recentInRecords[0];
      const hoursSinceLastIn = (timestamp.getTime() - lastInRecord.timestamp.getTime()) / (1000 * 60 * 60);

      // Vérifier s'il y a un OUT après ce IN
      const correspondingOut = await this.prisma.attendance.findFirst({
        where: {
          tenantId,
          employeeId,
          type: AttendanceType.OUT,
          timestamp: { gte: lastInRecord.timestamp, lt: timestamp },
        },
        orderBy: { timestamp: 'asc' },
      });

      // Si pas de OUT et que le IN est orphelin (dépassé le seuil)
      if (!correspondingOut && hoursSinceLastIn >= orphanThresholdHours) {
        // Suggérer d'ajouter un OUT manquant (sans auto-ajout)
        const suggestedOutTime = new Date(lastInRecord.timestamp);
        // Suggérer l'heure de fin du shift prévu ou 17:00 par défaut
        const schedule = await this.getScheduleWithFallback(tenantId, employeeId, lastInRecord.timestamp);
        if (schedule?.shift) {
          const expectedEndTime = this.parseTimeString(
            schedule.customEndTime || schedule.shift.endTime,
          );
          suggestedOutTime.setHours(expectedEndTime.hours, expectedEndTime.minutes, 0, 0);
        } else {
          suggestedOutTime.setHours(17, 0, 0, 0); // Défaut: 17:00
        }

        return {
          hasAnomaly: true,
          type: 'DOUBLE_IN',
          note: `Pointage IN précédent sans OUT depuis ${Math.round(hoursSinceLastIn)}h. Suggestion: ajouter un OUT manquant à ${suggestedOutTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}.`,
          suggestedCorrection: {
            type: 'ADD_MISSING_OUT',
            previousInId: lastInRecord.id,
            suggestedOutTime: suggestedOutTime.toISOString(),
            confidence: 85,
            reason: 'ORPHAN_IN_DETECTED',
          },
        };
      }
    }

    // 1.2 Gestion des Shifts Multiples - Vérifier si plusieurs shifts sont prévus
    // Note: Le système supporte maintenant plusieurs schedules par jour (contrainte: employeeId + date + shiftId)
    // Un employé peut avoir plusieurs shifts le même jour (ex: MI JOUR 08:00-12:00, MI SOIR 14:00-18:00)
    const schedule = await this.getScheduleWithFallback(tenantId, employeeId, timestamp);

    // Vérifier s'il y a déjà un IN aujourd'hui
    if (todayInRecords.length > 0) {
      // Règle métier: Un IN est valide s'il y a un OUT entre le dernier IN et le nouveau IN
      // Cela permet de supporter les multiples shifts par jour (IN1, OUT1, IN2, OUT2)

      // Considérer comme DOUBLE_IN seulement si pas de OUT entre les deux IN
      const lastIn = todayInRecords[todayInRecords.length - 1];
      const hasOutBetween = todayRecords.some(
        r => r.type === AttendanceType.OUT && 
        r.timestamp > lastIn.timestamp && 
        r.timestamp < timestamp
      );

      if (!hasOutBetween) {
        // DOUBLE_IN détecté - générer une suggestion de correction
        const correctionSuggestion = await this.generateDoubleInCorrectionSuggestion(
          tenantId,
          employeeId,
          lastIn,
          timestamp,
          schedule,
        );

        // 1.3 Détection de Patterns Suspects (analytics informatif)
        let patternNote = '';
        if (enablePatternDetection) {
          const patternInfo = await this.analyzeDoubleInPattern(tenantId, employeeId);
          if (patternInfo.count >= patternAlertThreshold) {
            patternNote = ` ⚠️ Pattern suspect: ${patternInfo.count} DOUBLE_IN sur 30 jours.`;
          }
        }

        return {
          hasAnomaly: true,
          type: 'DOUBLE_IN',
          note: `Double pointage d'entrée détecté.${patternNote}`,
          suggestedCorrection: correctionSuggestion,
        };
      }
    }

    return { hasAnomaly: false };
  }

  /**
   * Génère une suggestion de correction pour DOUBLE_IN
   * Implémente 1.4 Suggestion Automatique de Correction
   */
  private async generateDoubleInCorrectionSuggestion(
    tenantId: string,
    employeeId: string,
    firstIn: any,
    secondInTimestamp: Date,
    schedule: any,
  ): Promise<any> {
    const suggestions = [];

    // Option 1: Supprimer le deuxième IN (si le premier est cohérent)
    const firstInSchedule = await this.getScheduleWithFallback(tenantId, employeeId, firstIn.timestamp);
    let firstInScore = 50;
    if (firstInSchedule?.shift) {
      const expectedStartTime = this.parseTimeString(
        firstInSchedule.customStartTime || firstInSchedule.shift.startTime,
      );
      const firstInTime = new Date(firstIn.timestamp);
      const expectedStart = new Date(firstIn.timestamp);
      expectedStart.setHours(expectedStartTime.hours, expectedStartTime.minutes, 0, 0);
      
      const diffMinutes = Math.abs((firstInTime.getTime() - expectedStart.getTime()) / (1000 * 60));
      if (diffMinutes <= 30) {
        firstInScore = 90; // Très cohérent
      } else if (diffMinutes <= 60) {
        firstInScore = 70; // Assez cohérent
      }
    }

    suggestions.push({
      action: 'DELETE_SECOND_IN',
      description: 'Supprimer le deuxième pointage IN',
      confidence: 100 - firstInScore,
      reason: firstInScore < 50 ? 'Le premier IN semble plus cohérent' : 'Le deuxième IN semble être une erreur',
    });

    // Option 2: Corriger le premier IN (si le deuxième est plus cohérent)
    let secondInScore = 50;
    if (schedule?.shift) {
      const expectedStartTime = this.parseTimeString(
        schedule.customStartTime || schedule.shift.startTime,
      );
      const expectedStart = new Date(secondInTimestamp);
      expectedStart.setHours(expectedStartTime.hours, expectedStartTime.minutes, 0, 0);
      
      const diffMinutes = Math.abs((secondInTimestamp.getTime() - expectedStart.getTime()) / (1000 * 60));
      if (diffMinutes <= 30) {
        secondInScore = 90;
      } else if (diffMinutes <= 60) {
        secondInScore = 70;
      }
    }

    suggestions.push({
      action: 'DELETE_FIRST_IN',
      description: 'Supprimer le premier pointage IN',
      confidence: 100 - secondInScore,
      reason: secondInScore < 50 ? 'Le deuxième IN semble plus cohérent' : 'Le premier IN semble être une erreur',
    });

    // Option 3: Ajouter un OUT manquant entre les deux IN
    const timeBetween = (secondInTimestamp.getTime() - firstIn.timestamp.getTime()) / (1000 * 60 * 60);
    if (timeBetween >= 4) { // Au moins 4 heures entre les deux IN
      const suggestedOutTime = new Date(firstIn.timestamp.getTime() + (timeBetween / 2) * 60 * 60 * 1000);
      suggestions.push({
        action: 'ADD_OUT_BETWEEN',
        description: 'Ajouter un OUT manquant entre les deux IN',
        confidence: 60,
        suggestedOutTime: suggestedOutTime.toISOString(),
        reason: 'Il semble y avoir eu une sortie non pointée entre les deux entrées',
      });
    }

    // Retourner la suggestion avec le score le plus élevé
    const bestSuggestion = suggestions.sort((a, b) => b.confidence - a.confidence)[0];

    return {
      type: 'DOUBLE_IN_CORRECTION',
      suggestions: suggestions,
      recommended: bestSuggestion,
      firstInId: firstIn.id,
      firstInTimestamp: firstIn.timestamp.toISOString(),
      secondInTimestamp: secondInTimestamp.toISOString(),
    };
  }

  /**
   * Analyse les patterns de DOUBLE_IN pour un employé (analytics informatif)
   * Implémente 1.3 Détection de Patterns Suspects
   */
  private async analyzeDoubleInPattern(
    tenantId: string,
    employeeId: string,
  ): Promise<{ count: number; averageInterval: number; hours: number[] }> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Récupérer tous les DOUBLE_IN des 30 derniers jours
    const doubleInRecords = await this.prisma.attendance.findMany({
      where: {
        tenantId,
        employeeId,
        type: AttendanceType.IN,
        hasAnomaly: true,
        anomalyType: 'DOUBLE_IN',
        timestamp: { gte: thirtyDaysAgo },
      },
      orderBy: { timestamp: 'asc' },
    });

    const hours: number[] = [];
    let totalInterval = 0;
    let intervalCount = 0;

    // Analyser les heures et intervalles
    for (let i = 1; i < doubleInRecords.length; i++) {
      const hour = doubleInRecords[i].timestamp.getHours();
      hours.push(hour);
      
      if (i > 0) {
        const interval = (doubleInRecords[i].timestamp.getTime() - doubleInRecords[i - 1].timestamp.getTime()) / (1000 * 60);
        totalInterval += interval;
        intervalCount++;
      }
    }

    return {
      count: doubleInRecords.length,
      averageInterval: intervalCount > 0 ? totalInterval / intervalCount : 0,
      hours: hours,
    };
  }

  /**
   * Détection améliorée de MISSING_IN avec toutes les améliorations
   * Implémente:
   * - 2.1 Vérification des Pointages Précédents (requalification MISSING_OUT jour N-1)
   * - 2.2 Gestion des Cas Légitimes (télétravail, mission externe → PRESENCE_EXTERNE)
   * - 2.3 Suggestion Automatique d'Heure d'Entrée
   * - 2.4 Détection de Patterns d'Oubli (analytics)
   * - 2.5 Arrivées Tardives avec OUT Direct
   */
  private async detectMissingInImproved(
    tenantId: string,
    employeeId: string,
    timestamp: Date,
    todayRecords: any[],
  ): Promise<{ hasAnomaly: boolean; type?: string; note?: string; suggestedCorrection?: any }> {
    // Récupérer les paramètres configurables
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
      select: {
        allowMissingInForRemoteWork: true,
        allowMissingInForMissions: true,
        enableMissingInPatternDetection: true,
        missingInPatternAlertThreshold: true,
      },
    });

    const allowRemoteWork = settings?.allowMissingInForRemoteWork !== false;
    const allowMissions = settings?.allowMissingInForMissions !== false;
    const enablePatternDetection = settings?.enableMissingInPatternDetection !== false;
    const patternAlertThreshold = settings?.missingInPatternAlertThreshold || 3;

    // Vérifier s'il y a un IN aujourd'hui
    const hasInToday = todayRecords.some(r => r.type === AttendanceType.IN);

    // Si IN existe, pas de MISSING_IN
    if (hasInToday) {
      return { hasAnomaly: false };
    }

    // 2.2 Gestion des Cas Légitimes - Vérifier télétravail, mission externe, pointage mobile/GPS
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        id: true,
        userId: true,
      },
    });

    // Vérifier si le pointage provient d'une application mobile (GPS)
    const isMobilePunch = todayRecords.some(r => r.method === 'MOBILE_GPS' || r.latitude !== null);

    // Vérifier si l'employé a un congé/mission pour aujourd'hui
    const startOfDay = new Date(timestamp);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(timestamp);
    endOfDay.setHours(23, 59, 59, 999);

    const leave = await this.prisma.leave.findFirst({
      where: {
        tenantId,
        employeeId,
        startDate: { lte: endOfDay },
        endDate: { gte: startOfDay },
        status: { in: ['APPROVED', 'MANAGER_APPROVED'] },
      },
    });

    // Si pointage mobile/GPS ou congé approuvé, considérer comme présence externe
    if (isMobilePunch || leave) {
      return {
        hasAnomaly: false, // Pas d'anomalie, présence externe légitime
        type: 'PRESENCE_EXTERNE',
        note: isMobilePunch 
          ? 'Pointage externe (mobile/GPS) détecté - présence externe légitime'
          : 'Congé approuvé pour cette journée - présence externe légitime',
      };
    }

    // 2.1 Vérification des Pointages Précédents - CORRECTION IMPORTANTE
    // Vérifier s'il y a un IN hier sans OUT correspondant
    const yesterday = new Date(timestamp);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const endOfYesterday = new Date(yesterday);
    endOfYesterday.setHours(23, 59, 59, 999);

    // Récupérer TOUS les pointages d'hier (IN et OUT) triés par timestamp
    const yesterdayAllRecords = await this.prisma.attendance.findMany({
      where: {
        tenantId,
        employeeId,
        timestamp: { gte: yesterday, lte: endOfYesterday },
        type: { in: [AttendanceType.IN, AttendanceType.OUT] },
      },
      orderBy: { timestamp: 'desc' },
    });

    // Vérifier si le DERNIER pointage d'hier est un IN sans OUT après lui
    const lastRecordYesterday = yesterdayAllRecords.length > 0 ? yesterdayAllRecords[0] : null;
    const hasUnmatchedInYesterday = lastRecordYesterday?.type === AttendanceType.IN;

    // Si le dernier pointage d'hier est un IN (sans OUT après), vérifier si c'est un shift de nuit
    if (hasUnmatchedInYesterday && lastRecordYesterday) {
      const lastInYesterday = lastRecordYesterday;

      console.log('🔍 [NIGHT SHIFT DETECTION] OUT sans IN détecté');
      console.log(`   IN d'hier: ${lastInYesterday.timestamp.toISOString()}`);
      console.log(`   OUT d'aujourd'hui: ${timestamp.toISOString()}`);

      // Analyser le pattern temporel pour détecter un shift de nuit
      // (IN le soir, OUT le matin du lendemain)
      const inTime = { hours: lastInYesterday.timestamp.getHours(), minutes: lastInYesterday.timestamp.getMinutes() };
      const outTime = { hours: timestamp.getHours(), minutes: timestamp.getMinutes() };

      console.log(`   Heures IN: ${inTime.hours}:${inTime.minutes.toString().padStart(2, '0')}`);
      console.log(`   Heures OUT: ${outTime.hours}:${outTime.minutes.toString().padStart(2, '0')}`);

      // Vérifier que le OUT est le lendemain (après minuit)
      const inDate = new Date(lastInYesterday.timestamp);
      inDate.setHours(0, 0, 0, 0);
      const outDate = new Date(timestamp);
      outDate.setHours(0, 0, 0, 0);
      const isNextDay = outDate.getTime() > inDate.getTime();

      // Vérifier que le temps entre IN et OUT est raisonnable (entre 6h et 14h pour un shift de nuit)
      const timeBetweenInAndOut = timestamp.getTime() - lastInYesterday.timestamp.getTime();
      const hoursBetween = timeBetweenInAndOut / (1000 * 60 * 60);
      const isReasonableTimeSpan = hoursBetween >= 6 && hoursBetween <= 14;

      console.log(`   Est le jour suivant: ${isNextDay}`);
      console.log(`   Heures entre IN et OUT: ${hoursBetween.toFixed(2)}h`);
      console.log(`   Durée raisonnable (6-14h): ${isReasonableTimeSpan}`);

      // Condition 1 : OUT le lendemain ET temps raisonnable
      if (isNextDay && isReasonableTimeSpan) {
        console.log('✅ Conditions de base remplies (jour suivant + durée raisonnable)');

        // IMPORTANT: Chercher le planning pour le jour d'entrée (hier), pas le jour de sortie (aujourd'hui)
        const schedule = await this.getScheduleWithFallback(tenantId, employeeId, lastInYesterday.timestamp);

        console.log(`   Planning trouvé pour le jour d'entrée: ${schedule ? 'OUI' : 'NON'}`);

        // Si un planning existe, vérifier si c'est effectivement un shift de nuit
        if (schedule?.shift) {
          const expectedStartTime = this.parseTimeString(
            schedule.customStartTime || schedule.shift.startTime
          );
          const expectedEndTime = this.parseTimeString(
            schedule.customEndTime || schedule.shift.endTime
          );

          console.log(`   Shift prévu: ${expectedStartTime.hours}:${expectedStartTime.minutes.toString().padStart(2, '0')} - ${expectedEndTime.hours}:${expectedEndTime.minutes.toString().padStart(2, '0')}`);

          // Vérifier si c'est un shift de nuit (commence le soir et finit le lendemain matin)
          const isNightShift = this.isNightShift(schedule.shift, expectedEndTime);

          console.log(`   Est un shift de nuit (planning): ${isNightShift}`);

          if (isNightShift) {
            console.log('✅ Shift de nuit confirmé par le planning → PAS d\'anomalie');
            return { hasAnomaly: false };
          }
        }

        // Même sans planning, si le pattern temporel correspond à un shift de nuit, accepter
        // Critère 1: IN après 17h ET OUT avant 14h
        const criterion1 = inTime.hours >= 17 && outTime.hours < 14;
        console.log(`   Critère 1 (IN ≥17h ET OUT <14h): ${criterion1}`);

        if (criterion1) {
          console.log('✅ Pattern de shift de nuit détecté (critère 1) → PAS d\'anomalie');
          return { hasAnomaly: false };
        }

        // Critère 2: IN après 20h ET OUT avant 12h
        const criterion2 = inTime.hours >= 20 && outTime.hours < 12;
        console.log(`   Critère 2 (IN ≥20h ET OUT <12h): ${criterion2}`);

        if (criterion2) {
          console.log('✅ Pattern de shift de nuit détecté (critère 2) → PAS d\'anomalie');
          return { hasAnomaly: false };
        }

        // Critère 3: Durée entre 8h-12h ET IN après 18h ET OUT avant 12h
        const criterion3 = hoursBetween >= 8 && hoursBetween <= 12 && inTime.hours >= 18 && outTime.hours < 12;
        console.log(`   Critère 3 (8h≤durée≤12h ET IN ≥18h ET OUT <12h): ${criterion3}`);

        if (criterion3) {
          console.log('✅ Pattern de shift de nuit détecté (critère 3) → PAS d\'anomalie');
          return { hasAnomaly: false };
        }

        console.log('❌ Aucun critère de shift de nuit rempli → Anomalie MISSING_OUT');
      } else {
        console.log('❌ Conditions de base non remplies');
      }

      // Si ce n'est pas un shift de nuit ou si les heures ne correspondent pas,
      // alors c'est effectivement un MISSING_OUT (jour N-1)
      console.log('⚠️ Création d\'une anomalie MISSING_OUT pour le jour précédent');

      return {
        hasAnomaly: true,
        type: 'MISSING_OUT', // Requalification : MISSING_OUT jour N-1
        note: `OUT détecté aujourd'hui sans IN aujourd'hui, mais un IN existe hier (${lastInYesterday.timestamp.toLocaleDateString('fr-FR')}) sans OUT. Voulez-vous clôturer la journée d'hier ?`,
        suggestedCorrection: {
          type: 'CLOSE_YESTERDAY_SESSION',
          previousInId: lastInYesterday.id,
          previousInTimestamp: lastInYesterday.timestamp.toISOString(),
          currentOutTimestamp: timestamp.toISOString(),
          confidence: 90,
          reason: 'OUT_TODAY_CLOSES_YESTERDAY_SESSION',
        },
      };
    }

    // 2.5 Arrivées Tardives avec OUT Direct - Analyser autres événements
    const otherEventsToday = todayRecords.filter(
      r => r.type !== AttendanceType.OUT && r.type !== AttendanceType.IN
    );

    // Si d'autres événements existent (BREAK_START, BREAK_END, MISSION_START, etc.), suggérer un IN rétroactif
    if (otherEventsToday.length > 0) {
      const firstEvent = otherEventsToday.sort((a, b) => 
        a.timestamp.getTime() - b.timestamp.getTime()
      )[0];

      // Suggérer un IN à l'heure du premier événement ou avant
      const suggestedInTime = new Date(firstEvent.timestamp);
      suggestedInTime.setMinutes(suggestedInTime.getMinutes() - 30); // 30 min avant le premier événement

      const suggestion = await this.generateMissingInTimeSuggestion(
        tenantId,
        employeeId,
        timestamp,
        suggestedInTime,
      );

      return {
        hasAnomaly: true,
        type: 'MISSING_IN',
        note: `Pointage de sortie sans entrée. Autres événements détectés aujourd'hui (${otherEventsToday.length}). Suggestion: créer un IN rétroactif.`,
        suggestedCorrection: {
          type: 'ADD_MISSING_IN_RETROACTIVE',
          suggestedInTime: suggestedInTime.toISOString(),
          confidence: 70,
          reason: 'OTHER_EVENTS_DETECTED',
          firstEventType: firstEvent.type,
          firstEventTime: firstEvent.timestamp.toISOString(),
          ...suggestion,
        },
      };
    }

    // Si aucun autre événement → MISSING_IN confirmé
    // 2.3 Suggestion Automatique d'Heure d'Entrée
    const suggestion = await this.generateMissingInTimeSuggestion(
      tenantId,
      employeeId,
      timestamp,
      null, // Pas d'indice d'événement
    );

    // 2.4 Détection de Patterns d'Oubli (analytics informatif)
    let patternNote = '';
    if (enablePatternDetection) {
      const patternInfo = await this.analyzeMissingInPattern(tenantId, employeeId);
      if (patternInfo.count >= patternAlertThreshold) {
        patternNote = ` ⚠️ Pattern d'oubli: ${patternInfo.count} MISSING_IN sur 30 jours.`;
      }
    }

        return {
          hasAnomaly: true,
          type: 'MISSING_IN',
      note: `Pointage de sortie sans entrée.${patternNote}`,
      suggestedCorrection: {
        type: 'ADD_MISSING_IN',
        ...suggestion,
      },
    };
  }

  /**
   * Génère une suggestion d'heure d'entrée pour MISSING_IN
   * Implémente 2.3 Suggestion Automatique d'Heure d'Entrée
   */
  private async generateMissingInTimeSuggestion(
    tenantId: string,
    employeeId: string,
    outTimestamp: Date,
    eventBasedTime: Date | null,
  ): Promise<any> {
    const suggestions = [];

    // Option 1: Heure prévue du planning
    const schedule = await this.getScheduleWithFallback(tenantId, employeeId, outTimestamp);
    if (schedule?.shift) {
      const expectedStartTime = this.parseTimeString(
        schedule.customStartTime || schedule.shift.startTime,
      );
      const suggestedTime = new Date(outTimestamp);
      suggestedTime.setHours(expectedStartTime.hours, expectedStartTime.minutes, 0, 0);

      suggestions.push({
        source: 'PLANNING',
        suggestedTime: suggestedTime.toISOString(),
        confidence: 90,
        description: `Heure prévue du shift: ${expectedStartTime.hours.toString().padStart(2, '0')}:${expectedStartTime.minutes.toString().padStart(2, '0')}`,
      });
    }

    // Option 2: Heure moyenne historique (30 derniers jours)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const historicalInRecords = await this.prisma.attendance.findMany({
      where: {
        tenantId,
        employeeId,
        type: AttendanceType.IN,
        timestamp: { gte: thirtyDaysAgo, lt: outTimestamp },
        hasAnomaly: false, // Exclure les anomalies pour avoir une moyenne fiable
      },
      orderBy: { timestamp: 'asc' },
    });

    if (historicalInRecords.length > 0) {
      // Calculer l'heure moyenne d'arrivée
      let totalMinutes = 0;
      historicalInRecords.forEach(record => {
        const recordTime = new Date(record.timestamp);
        totalMinutes += recordTime.getHours() * 60 + recordTime.getMinutes();
      });
      const avgMinutes = Math.round(totalMinutes / historicalInRecords.length);
      const avgHours = Math.floor(avgMinutes / 60);
      const avgMins = avgMinutes % 60;

      const suggestedTime = new Date(outTimestamp);
      suggestedTime.setHours(avgHours, avgMins, 0, 0);

      suggestions.push({
        source: 'HISTORICAL_AVERAGE',
        suggestedTime: suggestedTime.toISOString(),
        confidence: 75,
        description: `Heure moyenne d'arrivée (30 derniers jours): ${avgHours.toString().padStart(2, '0')}:${avgMins.toString().padStart(2, '0')}`,
        sampleSize: historicalInRecords.length,
      });
    }

    // Option 3: Heure basée sur événement (si fournie)
    if (eventBasedTime) {
      suggestions.push({
        source: 'EVENT_BASED',
        suggestedTime: eventBasedTime.toISOString(),
        confidence: 60,
        description: `Basé sur le premier événement détecté aujourd'hui`,
      });
    }

    // Retourner la suggestion avec le score le plus élevé
    const bestSuggestion = suggestions.sort((a, b) => b.confidence - a.confidence)[0] || {
      source: 'DEFAULT',
      suggestedTime: new Date(outTimestamp).setHours(8, 0, 0, 0), // Défaut: 08:00
      confidence: 50,
      description: 'Heure par défaut: 08:00',
    };

    return {
      suggestions: suggestions,
      recommended: bestSuggestion,
      outTimestamp: outTimestamp.toISOString(),
    };
  }

  /**
   * Détection améliorée de MISSING_OUT avec toutes les améliorations et règles métier
   * Implémente:
   * - 3.1 Détection basée sur fin de shift (pas date civile)
   * - 3.2 Gestion des Shifts de Nuit
   * - 3.3 Suggestion Automatique d'Heure de Sortie
   * - 3.4 Gestion des Cas Légitimes
   * - 3.5 Détection de Patterns d'Oubli (analytics)
   * - 3.7 Gestion des Pointages Multiples (sessions)
   * 
   * Règles métier strictes:
   * - Un IN ouvre une session
   * - Un OUT ferme une seule session
   * - Une session ne traverse jamais plusieurs shifts sans validation
   * - BREAK ≠ OUT
   * - Toute correction = audit log
   */
  private async detectMissingOutImproved(
    tenantId: string,
    employeeId: string,
    timestamp: Date,
    todayRecords: any[],
  ): Promise<{ hasAnomaly: boolean; type?: string; note?: string; suggestedCorrection?: any }> {
    // Récupérer les paramètres configurables
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
      select: {
        missingOutDetectionWindow: true,
        allowMissingOutForRemoteWork: true,
        allowMissingOutForMissions: true,
        enableMissingOutPatternDetection: true,
        missingOutPatternAlertThreshold: true,
      },
    });

    const detectionWindowHours = settings?.missingOutDetectionWindow || 12;
    const allowRemoteWork = settings?.allowMissingOutForRemoteWork !== false;
    const allowMissions = settings?.allowMissingOutForMissions !== false;
    const enablePatternDetection = settings?.enableMissingOutPatternDetection !== false;
    const patternAlertThreshold = settings?.missingOutPatternAlertThreshold || 3;

    // RÈGLE MÉTIER : Un IN ouvre une session
    // Récupérer tous les IN du jour (sessions ouvertes)
    const todayInRecords = todayRecords.filter(r => r.type === AttendanceType.IN);
    const todayOutRecords = todayRecords.filter(r => r.type === AttendanceType.OUT);

    // Si pas de IN aujourd'hui, pas de session ouverte → pas de MISSING_OUT
    if (todayInRecords.length === 0) {
      return { hasAnomaly: false };
    }

    // RÈGLE MÉTIER : Un OUT ferme une seule session
    // RÈGLE MÉTIER : BREAK ≠ OUT
    // Vérifier les sessions ouvertes (IN sans OUT correspondant)
    const openSessions: any[] = [];
    
    for (const inRecord of todayInRecords) {
      // Trouver le OUT suivant le plus proche (dans la fenêtre de détection)
      const detectionWindowEnd = new Date(inRecord.timestamp.getTime() + detectionWindowHours * 60 * 60 * 1000);
      
      const correspondingOut = await this.prisma.attendance.findFirst({
        where: {
          tenantId,
          employeeId,
          type: AttendanceType.OUT,
          timestamp: {
            gte: inRecord.timestamp,
            lte: detectionWindowEnd,
          },
        },
        orderBy: { timestamp: 'asc' },
      });

      // RÈGLE MÉTIER : BREAK ≠ OUT
      // Vérifier s'il y a des BREAK_START/BREAK_END entre IN et OUT (ou maintenant)
      const breakEvents = await this.prisma.attendance.findMany({
        where: {
          tenantId,
          employeeId,
          type: { in: [AttendanceType.BREAK_START, AttendanceType.BREAK_END] },
          timestamp: {
            gte: inRecord.timestamp,
            lte: correspondingOut?.timestamp || new Date(),
          },
        },
        orderBy: { timestamp: 'asc' },
      });

      // Si pas de OUT correspondant, c'est une session ouverte
      if (!correspondingOut) {
        openSessions.push({
          inRecord,
          breakEvents,
          hoursOpen: (new Date().getTime() - inRecord.timestamp.getTime()) / (1000 * 60 * 60),
        });
      }
    }

    // Si toutes les sessions sont fermées, pas de MISSING_OUT
    if (openSessions.length === 0) {
      return { hasAnomaly: false };
    }

    // RÈGLE MÉTIER : Une session ne traverse jamais plusieurs shifts sans validation
    // Vérifier si une session ouverte traverse plusieurs shifts
    for (const session of openSessions) {
      const inSchedule = await this.getScheduleWithFallback(tenantId, employeeId, session.inRecord.timestamp);
      
      if (inSchedule?.shift) {
        const expectedEndTime = this.parseTimeString(
          inSchedule.customEndTime || inSchedule.shift.endTime,
        );
        const expectedEnd = new Date(session.inRecord.timestamp);
        expectedEnd.setHours(expectedEndTime.hours, expectedEndTime.minutes, 0, 0);
        
        // Si shift de nuit, ajuster la date
        if (expectedEndTime.hours < expectedEndTime.hours || 
            (expectedEndTime.hours >= 20 && expectedEndTime.hours <= 23)) {
          expectedEnd.setDate(expectedEnd.getDate() + 1);
        }

        // Vérifier si on a dépassé la fin du shift de plus de X heures
        const hoursAfterShiftEnd = (new Date().getTime() - expectedEnd.getTime()) / (1000 * 60 * 60);
        
        if (hoursAfterShiftEnd > 2) { // Plus de 2h après la fin du shift
          // Session qui traverse plusieurs shifts sans validation
        return {
          hasAnomaly: true,
          type: 'MISSING_OUT',
            note: `Session ouverte depuis ${Math.round(session.hoursOpen)}h. La session traverse plusieurs shifts sans validation.`,
            suggestedCorrection: {
              type: 'CLOSE_SESSION_MULTI_SHIFT',
              inId: session.inRecord.id,
              inTimestamp: session.inRecord.timestamp.toISOString(),
              expectedEndTime: expectedEnd.toISOString(),
              confidence: 85,
              reason: 'SESSION_TRAVERSES_MULTIPLE_SHIFTS',
            },
          };
        }
      }
    }

    // 3.4 Gestion des Cas Légitimes - Vérifier télétravail, mission externe
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, userId: true },
    });

    // Vérifier si le pointage provient d'une application mobile (GPS)
    const isMobilePunch = todayRecords.some(r => r.method === 'MOBILE_GPS' || r.latitude !== null);

    // Vérifier si l'employé a un congé/mission pour aujourd'hui
    const startOfDay = new Date(timestamp);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(timestamp);
    endOfDay.setHours(23, 59, 59, 999);

    const leave = await this.prisma.leave.findFirst({
      where: {
        tenantId,
        employeeId,
        startDate: { lte: endOfDay },
        endDate: { gte: startOfDay },
        status: { in: ['APPROVED', 'MANAGER_APPROVED'] },
      },
    });

    // Si pointage mobile/GPS ou congé approuvé, considérer comme présence externe
    if (isMobilePunch || leave) {
      return {
        hasAnomaly: false, // Pas d'anomalie, présence externe légitime
        type: 'PRESENCE_EXTERNE',
        note: isMobilePunch 
          ? 'Pointage externe (mobile/GPS) détecté - présence externe légitime'
          : 'Congé approuvé pour cette journée - présence externe légitime',
      };
    }

    // 3.2 Gestion des Shifts de Nuit
    const lastOpenSession = openSessions[openSessions.length - 1];
    const sessionSchedule = await this.getScheduleWithFallback(tenantId, employeeId, lastOpenSession.inRecord.timestamp);
    
    if (sessionSchedule?.shift) {
      const expectedEndTime = this.parseTimeString(
        sessionSchedule.customEndTime || sessionSchedule.shift.endTime,
      );
      const expectedEnd = new Date(lastOpenSession.inRecord.timestamp);
      expectedEnd.setHours(expectedEndTime.hours, expectedEndTime.minutes, 0, 0);
      
      // Identifier si c'est un shift de nuit
      const isNightShift = this.isNightShift(sessionSchedule.shift, expectedEndTime);
      
      if (isNightShift) {
        // Pour shift de nuit, étendre la fenêtre jusqu'au lendemain midi
        const detectionDeadline = new Date(expectedEnd);
        detectionDeadline.setDate(detectionDeadline.getDate() + 1);
        detectionDeadline.setHours(12, 0, 0, 0); // Midi le lendemain
        
        if (new Date() < detectionDeadline) {
          // Trop tôt pour détecter MISSING_OUT (shift de nuit)
          return { hasAnomaly: false };
        }
      }
    }

    // 3.3 Suggestion Automatique d'Heure de Sortie
    const suggestion = await this.generateMissingOutTimeSuggestion(
      tenantId,
      employeeId,
      lastOpenSession.inRecord,
      lastOpenSession.breakEvents,
    );

    // 3.5 Détection de Patterns d'Oubli (analytics informatif)
    let patternNote = '';
    if (enablePatternDetection) {
      const patternInfo = await this.analyzeMissingOutPattern(tenantId, employeeId);
      if (patternInfo.count >= patternAlertThreshold) {
        patternNote = ` ⚠️ Pattern d'oubli: ${patternInfo.count} MISSING_OUT sur 30 jours.`;
      }
    }

    return {
      hasAnomaly: true,
      type: 'MISSING_OUT',
      note: `Session ouverte depuis ${Math.round(lastOpenSession.hoursOpen)}h sans sortie correspondante.${patternNote}`,
      suggestedCorrection: {
        type: 'ADD_MISSING_OUT',
        inId: lastOpenSession.inRecord.id,
        inTimestamp: lastOpenSession.inRecord.timestamp.toISOString(),
        ...suggestion,
      },
    };
  }

  /**
   * Extrait l'offset UTC d'un timezone (en heures)
   * Ex: "Africa/Casablanca" → 1 (UTC+1)
   */
  private getTimezoneOffset(timezone: string): number {
    // Mapping des timezones principaux
    const timezoneOffsets: Record<string, number> = {
      'Africa/Casablanca': 1,
      'Africa/Lagos': 1,
      'Europe/Paris': 1,
      'Europe/London': 0,
      'UTC': 0,
      'America/New_York': -5,
      // Ajoutez d'autres timezones selon les besoins
    };

    return timezoneOffsets[timezone] || 0;
  }

  /**
   * Vérifie si un shift est un shift de nuit
   */
  private isNightShift(shift: any, endTime: { hours: number; minutes: number }): boolean {
    const startTime = this.parseTimeString(shift.startTime);
    const startMinutes = startTime.hours * 60 + startTime.minutes;
    const endMinutes = endTime.hours * 60 + endTime.minutes;

    // Shift de nuit si commence après 20h ou finit avant 8h
    return startMinutes >= 20 * 60 || endMinutes <= 8 * 60;
  }

  /**
   * Génère une suggestion d'heure de sortie pour MISSING_OUT
   * Implémente 3.3 Suggestion Automatique d'Heure de Sortie
   */
  private async generateMissingOutTimeSuggestion(
    tenantId: string,
    employeeId: string,
    inRecord: any,
    breakEvents: any[],
  ): Promise<any> {
    const suggestions = [];

    // Option 1: Heure prévue du planning
    const schedule = await this.getScheduleWithFallback(tenantId, employeeId, inRecord.timestamp);
    if (schedule?.shift) {
      const expectedEndTime = this.parseTimeString(
        schedule.customEndTime || schedule.shift.endTime,
      );
      const suggestedTime = new Date(inRecord.timestamp);
      suggestedTime.setHours(expectedEndTime.hours, expectedEndTime.minutes, 0, 0);
      
      // Si shift de nuit, ajuster la date
      if (this.isNightShift(schedule.shift, expectedEndTime)) {
        suggestedTime.setDate(suggestedTime.getDate() + 1);
      }

      suggestions.push({
        source: 'PLANNING',
        suggestedTime: suggestedTime.toISOString(),
        confidence: 90,
        description: `Heure prévue du shift: ${expectedEndTime.hours.toString().padStart(2, '0')}:${expectedEndTime.minutes.toString().padStart(2, '0')}`,
      });
    }

    // Option 2: Heure moyenne historique (30 derniers jours)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const historicalOutRecords = await this.prisma.attendance.findMany({
      where: {
        tenantId,
        employeeId,
        type: AttendanceType.OUT,
        timestamp: { gte: thirtyDaysAgo, lt: inRecord.timestamp },
        hasAnomaly: false, // Exclure les anomalies pour avoir une moyenne fiable
      },
      orderBy: { timestamp: 'asc' },
    });

    if (historicalOutRecords.length > 0) {
      // Calculer l'heure moyenne de sortie
      let totalMinutes = 0;
      historicalOutRecords.forEach(record => {
        const recordTime = new Date(record.timestamp);
        totalMinutes += recordTime.getHours() * 60 + recordTime.getMinutes();
      });
      const avgMinutes = Math.round(totalMinutes / historicalOutRecords.length);
      const avgHours = Math.floor(avgMinutes / 60);
      const avgMins = avgMinutes % 60;

      const suggestedTime = new Date(inRecord.timestamp);
      suggestedTime.setHours(avgHours, avgMins, 0, 0);

      suggestions.push({
        source: 'HISTORICAL_AVERAGE',
        suggestedTime: suggestedTime.toISOString(),
        confidence: 75,
        description: `Heure moyenne de sortie (30 derniers jours): ${avgHours.toString().padStart(2, '0')}:${avgMins.toString().padStart(2, '0')}`,
        sampleSize: historicalOutRecords.length,
      });
    }

    // Option 3: Heure du dernier pointage (BREAK_END, etc.)
    if (breakEvents.length > 0) {
      const lastBreakEnd = breakEvents
        .filter(e => e.type === AttendanceType.BREAK_END)
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
      
      if (lastBreakEnd) {
        const suggestedTime = new Date(lastBreakEnd.timestamp);
        suggestedTime.setHours(suggestedTime.getHours() + 4); // 4h après la fin de pause (estimation)

        suggestions.push({
          source: 'LAST_EVENT',
          suggestedTime: suggestedTime.toISOString(),
          confidence: 60,
          description: `Basé sur le dernier pointage (BREAK_END)`,
        });
      }
    }

    // Option 4: Heure de fermeture du site (si disponible)
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: { site: true },
    });

    if (employee?.site) {
      // Par défaut, suggérer 18:00 comme heure de fermeture
      const suggestedTime = new Date(inRecord.timestamp);
      suggestedTime.setHours(18, 0, 0, 0);

      suggestions.push({
        source: 'SITE_CLOSING',
        suggestedTime: suggestedTime.toISOString(),
        confidence: 40,
        description: `Heure de fermeture du site (estimation)`,
      });
    }

    // Retourner la suggestion avec le score le plus élevé
    const bestSuggestion = suggestions.sort((a, b) => b.confidence - a.confidence)[0] || {
      source: 'DEFAULT',
      suggestedTime: new Date(inRecord.timestamp).setHours(17, 0, 0, 0), // Défaut: 17:00
      confidence: 50,
      description: 'Heure par défaut: 17:00',
    };

    return {
      suggestions: suggestions,
      recommended: bestSuggestion,
      inTimestamp: inRecord.timestamp.toISOString(),
    };
  }

  /**
   * Analyse les patterns de MISSING_OUT pour un employé (analytics informatif)
   * Implémente 3.5 Détection de Patterns d'Oubli
   */
  private async analyzeMissingOutPattern(
    tenantId: string,
    employeeId: string,
  ): Promise<{ count: number; daysOfWeek: number[]; hours: number[] }> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Récupérer tous les MISSING_OUT des 30 derniers jours
    const missingOutRecords = await this.prisma.attendance.findMany({
      where: {
        tenantId,
        employeeId,
        type: AttendanceType.IN,
        hasAnomaly: true,
        anomalyType: 'MISSING_OUT',
        timestamp: { gte: thirtyDaysAgo },
      },
      orderBy: { timestamp: 'asc' },
    });

    const daysOfWeek: number[] = [];
    const hours: number[] = [];

    // Analyser les jours de la semaine et heures
    missingOutRecords.forEach(record => {
      const date = new Date(record.timestamp);
      daysOfWeek.push(date.getDay()); // 0 = Dimanche, 1 = Lundi, etc.
      hours.push(date.getHours());
    });

    return {
      count: missingOutRecords.length,
      daysOfWeek: daysOfWeek,
      hours: hours,
    };
  }

  /**
   * Analyse les patterns de MISSING_IN pour un employé (analytics informatif)
   * Implémente 2.4 Détection de Patterns d'Oubli
   */
  private async analyzeMissingInPattern(
    tenantId: string,
    employeeId: string,
  ): Promise<{ count: number; daysOfWeek: number[]; hours: number[] }> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Récupérer tous les MISSING_IN des 30 derniers jours
    const missingInRecords = await this.prisma.attendance.findMany({
      where: {
        tenantId,
        employeeId,
        type: AttendanceType.OUT,
        hasAnomaly: true,
        anomalyType: 'MISSING_IN',
        timestamp: { gte: thirtyDaysAgo },
      },
      orderBy: { timestamp: 'asc' },
    });

    const daysOfWeek: number[] = [];
    const hours: number[] = [];

    // Analyser les jours de la semaine et heures
    missingInRecords.forEach(record => {
      const date = new Date(record.timestamp);
      daysOfWeek.push(date.getDay()); // 0 = Dimanche, 1 = Lundi, etc.
      hours.push(date.getHours());
    });

    return {
      count: missingInRecords.length,
      daysOfWeek: daysOfWeek,
      hours: hours,
    };
  }

  /**
   * Détecte les anomalies dans les pointages
   */
  private async detectAnomalies(
    tenantId: string,
    employeeId: string,
    timestamp: Date,
    type: AttendanceType,
  ): Promise<{ hasAnomaly: boolean; type?: string; note?: string }> {
    const startOfDay = new Date(timestamp);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(timestamp);
    endOfDay.setHours(23, 59, 59, 999);

    // Récupérer les pointages du jour
    const todayRecords = await this.prisma.attendance.findMany({
      where: {
        tenantId,
        employeeId,
        timestamp: { gte: startOfDay, lte: endOfDay },
      },
      orderBy: { timestamp: 'asc' },
    });

    // PRIORITÉ 1 : Vérifier si l'employé a un congé approuvé pour cette date
    const leave = await this.prisma.leave.findFirst({
      where: {
        tenantId,
        employeeId,
        startDate: { lte: timestamp },
        endDate: { gte: timestamp },
        status: { in: ['APPROVED', 'MANAGER_APPROVED', 'HR_APPROVED'] },
      },
      include: {
        leaveType: true,
      },
    });

    if (leave) {
      // L'employé est en congé - créer une anomalie LEAVE_CONFLICT
      const employee = await this.prisma.employee.findUnique({
        where: { id: employeeId },
        select: { firstName: true, lastName: true, matricule: true },
      });

      const employeeName = employee
        ? `${employee.firstName} ${employee.lastName} (${employee.matricule})`
        : `l'employé ${employeeId}`;

      console.log(`[detectAnomalies] ⚠️ Pointage pendant congé détecté: ${leave.leaveType.name} du ${leave.startDate.toLocaleDateString('fr-FR')} au ${leave.endDate.toLocaleDateString('fr-FR')}`);

      return {
        hasAnomaly: true,
        type: 'LEAVE_CONFLICT',
        note: `Pointage effectué pendant un congé approuvé (${leave.leaveType.name}) du ${leave.startDate.toLocaleDateString('fr-FR')} au ${leave.endDate.toLocaleDateString('fr-FR')}. ` +
              `${employeeName} ne devrait pas travailler pendant cette période. ` +
              `Veuillez vérifier avec l'employé et annuler soit le congé, soit le pointage.`,
      };
    }

    // Vérifier double entrée (avec améliorations)
    if (type === AttendanceType.IN) {
      const doubleInResult = await this.detectDoubleInImproved(
        tenantId,
        employeeId,
        timestamp,
        todayRecords,
      );
      if (doubleInResult.hasAnomaly) {
        return doubleInResult;
      }
    }

    // Vérifier sortie sans entrée (avec améliorations)
    if (type === AttendanceType.OUT) {
      const missingInResult = await this.detectMissingInImproved(
        tenantId,
        employeeId,
        timestamp,
        todayRecords,
      );
      if (missingInResult.hasAnomaly) {
        return missingInResult;
      }
    }

    // Vérifier entrée sans sortie (avec améliorations et règles métier)
    if (type === AttendanceType.IN) {
      const missingOutResult = await this.detectMissingOutImproved(
        tenantId,
        employeeId,
        timestamp,
        todayRecords,
      );
      if (missingOutResult.hasAnomaly) {
        return missingOutResult;
      }
    }

    // Détecter les jours fériés travaillés (anomalie informative)
    // Note: on garde cette info mais on continue les autres vérifications
    const holidayCheck = await this.detectHolidayWork(tenantId, employeeId, timestamp, type);

    // Vérifier retards (nécessite le planning de l'employé)
    if (type === AttendanceType.IN) {
      // Utiliser la fonction helper avec fallback vers currentShiftId
      const schedule = await this.getScheduleWithFallback(tenantId, employeeId, timestamp);

      // Vérifier le statut du planning (Cas D) - seulement si ce n'est pas un schedule virtuel
      if (schedule && schedule.id !== 'virtual' && schedule.status !== 'PUBLISHED') {
        // Planning existe mais non publié/annulé
        const leave = await this.prisma.leave.findFirst({
          where: {
            tenantId,
            employeeId,
            startDate: { lte: timestamp },
            endDate: { gte: timestamp },
            status: { in: ['APPROVED', 'MANAGER_APPROVED'] },
          },
        });

        if (!leave) {
          return {
            hasAnomaly: true,
            type: 'ABSENCE_TECHNICAL',
            note: `Absence technique : planning ${schedule.status.toLowerCase()}`,
          };
        }
      }

      // Utiliser le schedule (physique ou virtuel) pour la détection
      if (schedule?.shift && (schedule.id === 'virtual' || schedule.status === 'PUBLISHED')) {
        const expectedStartTime = this.parseTimeString(
          schedule.customStartTime || schedule.shift.startTime,
        );

        // Récupérer le timezone du tenant pour calculer correctement
        const tenant = await this.prisma.tenant.findUnique({
          where: { id: tenantId },
          select: { timezone: true },
        });

        // Extraire l'offset UTC du timezone (ex: "Africa/Casablanca" = UTC+1)
        // Pour simplifier, on parse si c'est au format "UTC+X" ou on utilise un mapping
        const timezoneOffset = this.getTimezoneOffset(tenant?.timezone || 'UTC');

        // Construire l'heure de début attendue en tenant compte du timezone
        // Le shift dit "14:00" en heure locale du tenant
        // Si tenant est UTC+1, alors 14:00 locale = 13:00 UTC
        const expectedStart = new Date(Date.UTC(
          timestamp.getUTCFullYear(),
          timestamp.getUTCMonth(),
          timestamp.getUTCDate(),
          expectedStartTime.hours - timezoneOffset,
          expectedStartTime.minutes,
          0,
          0
        ));

        const settings = await this.prisma.tenantSettings.findUnique({
          where: { tenantId },
          select: {
            lateToleranceEntry: true,
            absencePartialThreshold: true, // Nouveau paramètre pour Cas C
          },
        });

        const toleranceMinutes = settings?.lateToleranceEntry || 10;
        const absenceThreshold = settings?.absencePartialThreshold || 2; // Heures par défaut

        // Calculer le retard en heures
        const lateHours = (timestamp.getTime() - expectedStart.getTime()) / (1000 * 60 * 60);
        const lateMinutes = (timestamp.getTime() - expectedStart.getTime()) / (1000 * 60);

        // Cas C : Absence partielle si retard >= seuil configuré
        if (lateHours >= absenceThreshold) {
          return {
            hasAnomaly: true,
            type: 'ABSENCE_PARTIAL',
            note: `Absence partielle détectée : arrivée ${lateHours.toFixed(1)}h après l'heure prévue`,
          };
        }

        // Sinon, traitement normal du retard
        if (lateMinutes > toleranceMinutes) {
          return {
            hasAnomaly: true,
            type: 'LATE',
            note: `Retard de ${Math.round(lateMinutes)} minutes détecté`,
          };
        }
      } else if (!schedule) {
        // Pas de planning ET pas de currentShiftId - vérifier selon requireScheduleForAttendance
        const settings = await this.prisma.tenantSettings.findUnique({
          where: { tenantId },
          select: {
            workingDays: true,
            requireScheduleForAttendance: true,
          },
        });

        const dayOfWeek = timestamp.getDay(); // 0 = Dimanche, 1 = Lundi, etc.
        const workingDays = (settings?.workingDays as number[]) || [1, 2, 3, 4, 5, 6]; // Par défaut: Lun-Sam
        const normalizedDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;
        const isWorkingDay = workingDays.includes(normalizedDayOfWeek);

        // TOUJOURS créer une anomalie si pas de planning, shift, congé ou récupération
        // Distinguer entre weekend (WEEKEND_WORK_UNAUTHORIZED) et jour ouvrable (ABSENCE)
        if (true) {
          // Vérifier s'il y a un congé
          const leave = await this.prisma.leave.findFirst({
            where: {
              tenantId,
              employeeId,
              startDate: { lte: timestamp },
              endDate: { gte: timestamp },
              status: { in: ['APPROVED', 'MANAGER_APPROVED', 'HR_APPROVED'] },
            },
          });

          // Vérifier s'il y a une récupération
          const recoveryDay = await this.prisma.recoveryDay.findFirst({
            where: {
              tenantId,
              employeeId,
              startDate: { lte: timestamp },
              endDate: { gte: timestamp },
              status: { in: ['APPROVED', 'PENDING'] },
            },
          });

          if (!leave && !recoveryDay) {
            // Récupérer le nom de l'employé pour le message
            const employee = await this.prisma.employee.findUnique({
              where: { id: employeeId },
              select: { firstName: true, lastName: true, matricule: true },
            });

            const employeeName = employee
              ? `${employee.firstName} ${employee.lastName} (${employee.matricule})`
              : `l'employé ${employeeId}`;

            // Détermine le jour de la semaine en français
            const dayNames = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
            const dayName = dayNames[dayOfWeek];

            // Si c'est un weekend (jour non ouvrable), utiliser le type spécifique
            if (!isWorkingDay) {
              return {
                hasAnomaly: true,
                type: 'WEEKEND_WORK_UNAUTHORIZED',
                note: `Pointage effectué le ${timestamp.toLocaleDateString('fr-FR')} (weekend - ${dayName}) : ` +
                       `aucun planning publié et jour non ouvrable. ` +
                       `Veuillez créer un planning pour autoriser le travail en weekend ou annuler ce pointage.`,
              };
            }

            // UNPLANNED_PUNCH : Pointage effectué sans planning existant
            // (différent de ABSENCE qui signifie "pas de pointage alors qu'un planning existe")
            return {
              hasAnomaly: true,
              type: 'UNPLANNED_PUNCH',
              note: `Pointage non planifié pour ${employeeName} le ${timestamp.toLocaleDateString('fr-FR')} (jour ouvrable - ${dayName}) : ` +
                     `aucun planning publié, aucun shift par défaut assigné, et aucun congé/récupération approuvé. ` +
                     `Veuillez créer un planning ou assigner un shift par défaut.`,
            };
          }
        }
      }
    }

    // Vérifier départ anticipé
    if (type === AttendanceType.OUT) {
      // IMPORTANT: Trouver le IN correspondant pour utiliser le bon shift
      const todayRecordsForDetect = await this.prisma.attendance.findMany({
        where: {
          tenantId,
          employeeId,
          timestamp: {
            gte: new Date(Date.UTC(timestamp.getUTCFullYear(), timestamp.getUTCMonth(), timestamp.getUTCDate(), 0, 0, 0)),
            lte: new Date(Date.UTC(timestamp.getUTCFullYear(), timestamp.getUTCMonth(), timestamp.getUTCDate(), 23, 59, 59)),
          },
        },
        orderBy: { timestamp: 'asc' },
      });

      const sortedRecordsDetect = [...todayRecordsForDetect].sort((a, b) =>
        a.timestamp.getTime() - b.timestamp.getTime()
      );

      let inRecordDetect: typeof todayRecordsForDetect[0] | undefined;
      let outCountDetect = 0;

      for (let i = sortedRecordsDetect.length - 1; i >= 0; i--) {
        const record = sortedRecordsDetect[i];
        if (record.timestamp.getTime() > timestamp.getTime()) continue;
        if (record.type === AttendanceType.BREAK_START || record.type === AttendanceType.BREAK_END) continue;

        if (record.type === AttendanceType.OUT) {
          outCountDetect++;
        }

        if (record.type === AttendanceType.IN) {
          if (outCountDetect === 0) {
            inRecordDetect = record;
            break;
          } else {
            outCountDetect--;
          }
        }
      }

      // Utiliser le timestamp du IN correspondant pour trouver le bon shift!
      const schedule = inRecordDetect
        ? await this.getScheduleWithFallback(tenantId, employeeId, inRecordDetect.timestamp)
        : await this.getScheduleWithFallback(tenantId, employeeId, timestamp);

      // Utiliser le schedule (physique ou virtuel) pour la détection
      if (schedule?.shift && (schedule.id === 'virtual' || schedule.status === 'PUBLISHED')) {
        const expectedEndTime = this.parseTimeString(
          schedule.customEndTime || schedule.shift.endTime,
        );
        const expectedEnd = new Date(timestamp);
        expectedEnd.setHours(expectedEndTime.hours, expectedEndTime.minutes, 0, 0);

        // GESTION SHIFT DE NUIT : Si c'est un shift de nuit et que expectedEnd est dans le futur,
        // c'est que la fin devrait être la veille
        const isNight = this.isNightShift(schedule.shift, expectedEndTime);
        if (isNight && expectedEnd.getTime() > timestamp.getTime()) {
          const hoursDiff = (expectedEnd.getTime() - timestamp.getTime()) / (1000 * 60 * 60);
          // Si la différence est > 12h, c'est probablement qu'on doit regarder la veille
          if (hoursDiff > 12) {
            expectedEnd.setDate(expectedEnd.getDate() - 1);
          }
        }

        const settings = await this.prisma.tenantSettings.findUnique({
          where: { tenantId },
          select: { earlyToleranceExit: true },
        });

        const toleranceMinutes = settings?.earlyToleranceExit || 5;
        const earlyLeaveMinutes = (expectedEnd.getTime() - timestamp.getTime()) / (1000 * 60);

        if (earlyLeaveMinutes > toleranceMinutes) {
          return {
            hasAnomaly: true,
            type: 'EARLY_LEAVE',
            note: `Départ anticipé de ${Math.round(earlyLeaveMinutes)} minutes détecté`,
          };
        }
      } else if (!schedule) {
        // Pas de planning ET pas de currentShiftId pour le jour du OUT

        // IMPORTANT: Pour un OUT, vérifier d'abord si c'est un shift de nuit de la veille
        const previousDayDate = new Date(Date.UTC(
          timestamp.getFullYear(),
          timestamp.getMonth(),
          timestamp.getDate() - 1,
          0, 0, 0, 0
        ));

        const previousDaySchedule = await this.prisma.schedule.findFirst({
          where: {
            tenantId,
            employeeId,
            date: previousDayDate,
            status: 'PUBLISHED',
          },
          include: {
            shift: true,
          },
        });

        if (previousDaySchedule) {
          const expectedEndTime = this.parseTimeString(
            previousDaySchedule.customEndTime || previousDaySchedule.shift.endTime,
          );
          const isNightShift = this.isNightShift(previousDaySchedule.shift, expectedEndTime);

          if (isNightShift) {
            console.log(`[detectAnomalies OUT] ✅ Shift de nuit de la veille détecté → Pas d'anomalie pour ce OUT`);
            // C'est la sortie légitime d'un shift de nuit de la veille
            return { hasAnomaly: false };
          }
        }

        // Si ce n'est pas un shift de nuit, vérifier les congés/absences/weekend
        const settings = await this.prisma.tenantSettings.findUnique({
          where: { tenantId },
          select: {
            workingDays: true,
            requireScheduleForAttendance: true,
          },
        });

        const dayOfWeek = timestamp.getDay(); // 0 = Dimanche, 1 = Lundi, etc.
        const workingDays = (settings?.workingDays as number[]) || [1, 2, 3, 4, 5, 6]; // Par défaut: Lun-Sam
        const normalizedDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;
        const isWorkingDay = workingDays.includes(normalizedDayOfWeek);

        // TOUJOURS créer une anomalie si pas de planning, shift, congé ou récupération
        // Distinguer entre weekend (WEEKEND_WORK_UNAUTHORIZED) et jour ouvrable (ABSENCE)
        if (true) {
          // Vérifier s'il y a un congé
          const leave = await this.prisma.leave.findFirst({
            where: {
              tenantId,
              employeeId,
              startDate: { lte: timestamp },
              endDate: { gte: timestamp },
              status: { in: ['APPROVED', 'MANAGER_APPROVED', 'HR_APPROVED'] },
            },
          });

          // Vérifier s'il y a une récupération
          const recoveryDay = await this.prisma.recoveryDay.findFirst({
            where: {
              tenantId,
              employeeId,
              startDate: { lte: timestamp },
              endDate: { gte: timestamp },
              status: { in: ['APPROVED', 'PENDING'] },
            },
          });

          if (!leave && !recoveryDay) {
            // Récupérer le nom de l'employé pour le message
            const employee = await this.prisma.employee.findUnique({
              where: { id: employeeId },
              select: { firstName: true, lastName: true, matricule: true },
            });

            const employeeName = employee
              ? `${employee.firstName} ${employee.lastName} (${employee.matricule})`
              : `l'employé ${employeeId}`;

            // Détermine le jour de la semaine en français
            const dayNames = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
            const dayName = dayNames[dayOfWeek];

            // Si c'est un weekend (jour non ouvrable), utiliser le type spécifique
            if (!isWorkingDay) {
              return {
                hasAnomaly: true,
                type: 'WEEKEND_WORK_UNAUTHORIZED',
                note: `Pointage effectué le ${timestamp.toLocaleDateString('fr-FR')} (weekend - ${dayName}) : ` +
                       `aucun planning publié et jour non ouvrable. ` +
                       `Fin de shift commencé le weekend sans autorisation.`,
              };
            }

            // UNPLANNED_PUNCH : Pointage effectué sans planning existant
            // (différent de ABSENCE qui signifie "pas de pointage alors qu'un planning existe")
            return {
              hasAnomaly: true,
              type: 'UNPLANNED_PUNCH',
              note: `Pointage non planifié pour ${employeeName} le ${timestamp.toLocaleDateString('fr-FR')} (jour ouvrable - ${dayName}) : ` +
                     `aucun planning publié, aucun shift par défaut assigné, et aucun congé/récupération approuvé. ` +
                     `Veuillez créer un planning ou assigner un shift par défaut.`,
            };
          }
        }
      }
    }

    // Vérifier repos insuffisant entre shifts (INSUFFICIENT_REST)
    if (type === AttendanceType.IN) {
      // Récupérer le dernier pointage de sortie
      const lastOutRecord = await this.prisma.attendance.findFirst({
        where: {
          tenantId,
          employeeId,
          type: AttendanceType.OUT,
          timestamp: { lt: timestamp },
        },
        orderBy: { timestamp: 'desc' },
      });

      if (lastOutRecord) {
        // Récupérer tous les paramètres du tenant nécessaires en une seule requête
        const settings = await this.prisma.tenantSettings.findUnique({
          where: { tenantId },
          select: {
            enableInsufficientRestDetection: true,
            minimumRestHours: true,
            minimumRestHoursNightShift: true,
            nightShiftStart: true,
            nightShiftEnd: true,
          },
        });

        // Vérifier si la détection est activée
        if (settings?.enableInsufficientRestDetection !== false) {
          // Calculer le temps de repos entre la sortie précédente et l'entrée actuelle
          const restHours = (timestamp.getTime() - lastOutRecord.timestamp.getTime()) / (1000 * 60 * 60);

          // Vérifier si c'est un shift de nuit
          const schedule = await this.getScheduleWithFallback(tenantId, employeeId, timestamp);
          
          // Déterminer si c'est un shift de nuit (vérifier les heures du shift)
          let isNightShift = false;
          if (schedule?.shift) {
            const shiftStartTime = this.parseTimeString(
              schedule.customStartTime || schedule.shift.startTime
            );
            const nightStartTime = this.parseTimeString(settings?.nightShiftStart || '21:00');
            const nightEndTime = this.parseTimeString(settings?.nightShiftEnd || '06:00');
            
            // Vérifier si le shift commence pendant les heures de nuit
            const shiftStartMinutes = shiftStartTime.hours * 60 + shiftStartTime.minutes;
            const nightStartMinutes = nightStartTime.hours * 60 + nightStartTime.minutes;
            const nightEndMinutes = nightEndTime.hours * 60 + nightEndTime.minutes;
            
            // Shift de nuit si commence entre les heures de nuit définies
            if (nightStartMinutes > nightEndMinutes) {
              // Shift de nuit qui traverse minuit (ex: 21h-6h)
              isNightShift = shiftStartMinutes >= nightStartMinutes || shiftStartMinutes <= nightEndMinutes;
            } else {
              // Shift de nuit normal (ex: 22h-2h)
              isNightShift = shiftStartMinutes >= nightStartMinutes && shiftStartMinutes <= nightEndMinutes;
            }
          }

          // Repos minimum requis : configurable, avec option pour shift de nuit
          const minimumRestHours = isNightShift && settings?.minimumRestHoursNightShift
            ? Number(settings.minimumRestHoursNightShift)
            : Number(settings?.minimumRestHours || 11);

          if (restHours < minimumRestHours) {
            return {
              hasAnomaly: true,
              type: 'INSUFFICIENT_REST',
              note: `Repos insuffisant détecté : ${restHours.toFixed(2)}h de repos (minimum requis: ${minimumRestHours}h)`,
            };
          }
        }
      }
    }

    // Vérifier si le pointage est lié à une mission (MISSION_START ou MISSION_END)
    if (type === AttendanceType.MISSION_START || type === AttendanceType.MISSION_END) {
      // Les pointages de mission ne sont pas considérés comme des anomalies
      // mais peuvent être utilisés pour le contexte
      return { hasAnomaly: false };
    }

    // Si aucune anomalie bloquante n'a été détectée mais qu'un jour férié a été détecté,
    // retourner l'anomalie informative du jour férié
    if (holidayCheck.hasAnomaly) {
      return holidayCheck;
    }

    return { hasAnomaly: false };
  }

  /**
   * Approuve une correction de pointage
   */
  async approveCorrection(
    tenantId: string,
    id: string,
    approvedBy: string,
    approved: boolean,
    comment?: string,
  ) {
    const attendance = await this.prisma.attendance.findFirst({
      where: { id, tenantId },
      include: {
        employee: {
          select: {
            id: true,
            userId: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!attendance) {
      throw new NotFoundException(`Attendance record ${id} not found`);
    }

    if (!attendance.needsApproval) {
      throw new BadRequestException('Cette correction ne nécessite pas d\'approbation');
    }

    if (attendance.approvalStatus === 'APPROVED' || attendance.approvalStatus === 'REJECTED') {
      throw new BadRequestException('Cette correction a déjà été traitée');
    }

    const updatedAttendance = await this.prisma.attendance.update({
      where: { id },
      data: {
        isCorrected: approved,
        correctedAt: approved ? new Date() : null,
        needsApproval: false,
        approvalStatus: approved ? 'APPROVED' : 'REJECTED',
        approvedBy: approved ? approvedBy : null,
        approvedAt: approved ? new Date() : null,
        correctionNote: comment || attendance.correctionNote,
      },
      include: {
        employee: {
          select: {
            id: true,
            userId: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Notifier l'employé du résultat de l'approbation
    if (updatedAttendance.employee.userId) {
      await this.prisma.notification.create({
        data: {
          tenantId,
          employeeId: attendance.employeeId,
          type: NotificationType.ATTENDANCE_CORRECTED,
          title: approved
            ? 'Correction de pointage approuvée'
            : 'Correction de pointage rejetée',
          message: approved
            ? `Votre correction de pointage a été approuvée.`
            : `Votre correction de pointage a été rejetée.`,
          metadata: {
            attendanceId: attendance.id,
            approved,
            comment,
          },
        },
      });
    }

    return updatedAttendance;
  }

  /**
   * Calcule le taux de présence d'un employé
   */
  async getPresenceRate(
    tenantId: string,
    employeeId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    presenceRate: number;
    totalDays: number;
    presentDays: number;
    absentDays: number;
    leaveDays: number;
    recoveryDays: number;
  }> {
    // Récupérer les plannings dans la période
    const schedules = await this.prisma.schedule.findMany({
      where: {
        tenantId,
        employeeId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const totalDays = schedules.length;

    if (totalDays === 0) {
      return {
        presenceRate: 0,
        totalDays: 0,
        presentDays: 0,
        absentDays: 0,
        leaveDays: 0,
        recoveryDays: 0,
      };
    }

    // Récupérer les pointages d'entrée dans la période
    const attendanceEntries = await this.prisma.attendance.findMany({
      where: {
        tenantId,
        employeeId,
        type: AttendanceType.IN,
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        timestamp: true,
      },
    });

    // Compter les jours uniques avec pointage
    const presentDaysSet = new Set<string>();
    attendanceEntries.forEach((entry) => {
      const date = new Date(entry.timestamp);
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      presentDaysSet.add(dateKey);
    });

    const presentDays = presentDaysSet.size;

    // Récupérer les congés approuvés dans la période
    const leaves = await this.prisma.leave.findMany({
      where: {
        tenantId,
        employeeId,
        status: {
          in: ['APPROVED', 'MANAGER_APPROVED'],
        },
        OR: [
          {
            startDate: { lte: endDate },
            endDate: { gte: startDate },
          },
        ],
      },
    });

    // AJOUT: Récupérer les journées de récupération approuvées dans la période
    const recoveryDays = await this.prisma.recoveryDay.findMany({
      where: {
        tenantId,
        employeeId,
        status: {
          in: [RecoveryDayStatus.APPROVED, RecoveryDayStatus.USED],
        },
        OR: [
          {
            startDate: { lte: endDate },
            endDate: { gte: startDate },
          },
        ],
      },
    });

    // Calculer les jours de congé qui chevauchent avec les plannings
    let leaveDays = 0;
    schedules.forEach((schedule) => {
      const scheduleDate = new Date(schedule.date);
      const hasLeave = leaves.some(
        (leave) =>
          scheduleDate >= new Date(leave.startDate) &&
          scheduleDate <= new Date(leave.endDate),
      );
      if (hasLeave) {
        leaveDays++;
      }
    });

    // AJOUT: Calculer les jours de récupération qui chevauchent avec les plannings
    let recoveryDaysCount = 0;
    schedules.forEach((schedule) => {
      const scheduleDate = new Date(schedule.date);
      const hasRecovery = recoveryDays.some(
        (rd) =>
          scheduleDate >= new Date(rd.startDate) &&
          scheduleDate <= new Date(rd.endDate),
      );
      if (hasRecovery) {
        recoveryDaysCount++;
      }
    });

    // Jours absents = jours planifiés - jours présents - jours de congé - jours de récupération
    const absentDays = totalDays - presentDays - leaveDays - recoveryDaysCount;

    // Taux de présence = (jours présents + jours de récupération) / jours planifiés * 100
    const presenceRate = totalDays > 0 ? ((presentDays + recoveryDaysCount) / totalDays) * 100 : 0;

    return {
      presenceRate: Math.round(presenceRate * 100) / 100, // Arrondir à 2 décimales
      totalDays,
      presentDays: presentDays + recoveryDaysCount, // MODIFIÉ: inclure les récupérations
      absentDays,
      leaveDays,
      recoveryDays: recoveryDaysCount, // NOUVEAU
    };
  }

  /**
   * Calcule le taux de ponctualité d'un employé
   */
  async getPunctualityRate(
    tenantId: string,
    employeeId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    punctualityRate: number;
    totalEntries: number;
    onTimeEntries: number;
    lateEntries: number;
    averageLateMinutes: number;
  }> {
    // Récupérer les pointages d'entrée avec retards dans la période
    const attendanceEntries = await this.prisma.attendance.findMany({
      where: {
        tenantId,
        employeeId,
        type: AttendanceType.IN,
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        timestamp: true,
        lateMinutes: true,
        hasAnomaly: true,
        anomalyType: true,
      },
    });

    const totalEntries = attendanceEntries.length;

    if (totalEntries === 0) {
      return {
        punctualityRate: 0,
        totalEntries: 0,
        onTimeEntries: 0,
        lateEntries: 0,
        averageLateMinutes: 0,
      };
    }

    // Compter les entrées en retard
    const lateEntries = attendanceEntries.filter(
      (entry) => entry.lateMinutes && entry.lateMinutes > 0,
    ).length;

    const onTimeEntries = totalEntries - lateEntries;

    // Calculer la moyenne des minutes de retard
    const lateMinutesSum = attendanceEntries.reduce(
      (sum, entry) => sum + (entry.lateMinutes || 0),
      0,
    );
    const averageLateMinutes =
      lateEntries > 0 ? Math.round(lateMinutesSum / lateEntries) : 0;

    // Taux de ponctualité = (entrées à l'heure / total entrées) * 100
    const punctualityRate =
      totalEntries > 0 ? (onTimeEntries / totalEntries) * 100 : 0;

    return {
      punctualityRate: Math.round(punctualityRate * 100) / 100,
      totalEntries,
      onTimeEntries,
      lateEntries,
      averageLateMinutes,
    };
  }

  /**
   * Récupère les tendances (graphiques) pour une période
   */
  async getTrends(
    tenantId: string,
    employeeId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    dailyTrends: Array<{
      date: string;
      lateCount: number;
      absentCount: number;
      earlyLeaveCount: number;
      anomaliesCount: number;
    }>;
    weeklyTrends: Array<{
      week: string;
      lateCount: number;
      absentCount: number;
      earlyLeaveCount: number;
      anomaliesCount: number;
    }>;
  }> {
    // Récupérer tous les pointages avec anomalies dans la période
    const attendances = await this.prisma.attendance.findMany({
      where: {
        tenantId,
        employeeId,
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
        hasAnomaly: true,
      },
      select: {
        timestamp: true,
        anomalyType: true,
      },
    });

    // Grouper par jour
    const dailyMap = new Map<string, any>();
    const weeklyMap = new Map<string, any>();

    attendances.forEach((attendance) => {
      const date = new Date(attendance.timestamp);
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

      // Calculer la semaine (ISO week)
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay() + 1); // Lundi
      const weekKey = `${weekStart.getFullYear()}-W${String(Math.ceil((weekStart.getTime() - new Date(weekStart.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000))).padStart(2, '0')}`;

      // Initialiser les compteurs pour le jour
      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, {
          date: dateKey,
          lateCount: 0,
          absentCount: 0,
          earlyLeaveCount: 0,
          anomaliesCount: 0,
        });
      }

      // Initialiser les compteurs pour la semaine
      if (!weeklyMap.has(weekKey)) {
        weeklyMap.set(weekKey, {
          week: weekKey,
          lateCount: 0,
          absentCount: 0,
          earlyLeaveCount: 0,
          anomaliesCount: 0,
        });
      }

      const daily = dailyMap.get(dateKey);
      const weekly = weeklyMap.get(weekKey);

      daily.anomaliesCount++;
      weekly.anomaliesCount++;

      if (attendance.anomalyType === 'LATE') {
        daily.lateCount++;
        weekly.lateCount++;
      } else if (attendance.anomalyType === 'ABSENCE') {
        daily.absentCount++;
        weekly.absentCount++;
      } else if (attendance.anomalyType === 'EARLY_LEAVE') {
        daily.earlyLeaveCount++;
        weekly.earlyLeaveCount++;
      }
    });

    // Convertir en tableaux triés
    const dailyTrends = Array.from(dailyMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date),
    );
    const weeklyTrends = Array.from(weeklyMap.values()).sort((a, b) =>
      a.week.localeCompare(b.week),
    );

    return {
      dailyTrends,
      weeklyTrends,
    };
  }

  /**
   * Détecte les anomalies récurrentes pour un employé
   */
  async detectRecurringAnomalies(
    tenantId: string,
    employeeId: string,
    days: number = 30,
  ): Promise<Array<{
    type: string;
    count: number;
    lastOccurrence: Date;
    frequency: string;
  }>> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Récupérer toutes les anomalies dans la période
    const anomalies = await this.prisma.attendance.findMany({
      where: {
        tenantId,
        employeeId,
        hasAnomaly: true,
        timestamp: {
          gte: startDate,
        },
      },
      select: {
        anomalyType: true,
        timestamp: true,
      },
    });

    // Grouper par type d'anomalie
    const anomalyMap = new Map<string, { count: number; lastOccurrence: Date }>();

    anomalies.forEach((anomaly) => {
      if (!anomaly.anomalyType) return;

      if (!anomalyMap.has(anomaly.anomalyType)) {
        anomalyMap.set(anomaly.anomalyType, {
          count: 0,
          lastOccurrence: new Date(anomaly.timestamp),
        });
      }

      const entry = anomalyMap.get(anomaly.anomalyType)!;
      entry.count++;
      if (new Date(anomaly.timestamp) > entry.lastOccurrence) {
        entry.lastOccurrence = new Date(anomaly.timestamp);
      }
    });

    // Filtrer les anomalies récurrentes (au moins 3 occurrences)
    const recurring = Array.from(anomalyMap.entries())
      .filter(([_, data]) => data.count >= 3)
      .map(([type, data]) => {
        const frequency = data.count / days; // Occurrences par jour
        return {
          type,
          count: data.count,
          lastOccurrence: data.lastOccurrence,
          frequency: frequency > 0.5 ? 'Quotidienne' : frequency > 0.2 ? 'Hebdomadaire' : 'Mensuelle',
        };
      })
      .sort((a, b) => b.count - a.count);

    return recurring;
  }

  /**
   * Corrige plusieurs pointages en une seule opération
   */
  async bulkCorrectAttendance(
    tenantId: string,
    bulkDto: {
      attendances: Array<{
        attendanceId: string;
        correctedTimestamp?: string;
        correctionNote?: string;
      }>;
      generalNote: string;
      correctedBy: string;
      forceApproval?: boolean;
    },
  ) {
    const results = [];
    const errors = [];

    for (const item of bulkDto.attendances) {
      try {
        const attendance = await this.prisma.attendance.findFirst({
          where: { id: item.attendanceId, tenantId },
        });

        if (!attendance) {
          errors.push({
            attendanceId: item.attendanceId,
            error: 'Pointage non trouvé',
          });
          continue;
        }

        const correctionDto: CorrectAttendanceDto = {
          correctionNote: item.correctionNote || bulkDto.generalNote,
          correctedBy: bulkDto.correctedBy,
          correctedTimestamp: item.correctedTimestamp,
          forceApproval: bulkDto.forceApproval,
        };

        const corrected = await this.correctAttendance(
          tenantId,
          item.attendanceId,
          correctionDto,
        );

        results.push({
          attendanceId: item.attendanceId,
          success: true,
          data: corrected,
        });
      } catch (error: any) {
        errors.push({
          attendanceId: item.attendanceId,
          error: error.message || 'Erreur lors de la correction',
        });
      }
    }

    return {
      total: bulkDto.attendances.length,
      success: results.length,
      failed: errors.length,
      results,
      errors,
    };
  }

  /**
   * Exporte uniquement les anomalies dans un format spécifique
   */
  async exportAnomalies(
    tenantId: string,
    filters: {
      startDate?: string;
      endDate?: string;
      employeeId?: string;
      anomalyType?: string;
    },
    format: 'csv' | 'excel',
  ) {
    const where: any = {
      tenantId,
      hasAnomaly: true,
    };

    if (filters.employeeId) {
      where.employeeId = filters.employeeId;
    }

    if (filters.anomalyType) {
      where.anomalyType = filters.anomalyType;
    }

    if (filters.startDate || filters.endDate) {
      where.timestamp = {};
      if (filters.startDate) {
        where.timestamp.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        endDate.setHours(23, 59, 59, 999);
        where.timestamp.lte = endDate;
      }
    }

    const anomalies = await this.prisma.attendance.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            matricule: true,
            firstName: true,
            lastName: true,
            department: {
              select: {
                name: true,
              },
            },
            site: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: { timestamp: 'desc' },
    });

    // Convertir en format CSV ou Excel
    if (format === 'csv') {
      const csvRows = [
        [
          'Date',
          'Heure',
          'Employé',
          'Matricule',
          'Département',
          'Site',
          'Type d\'anomalie',
          'Note',
          'Statut correction',
          'Corrigé par',
          'Date correction',
        ].join(','),
      ];

      anomalies.forEach((anomaly) => {
        const date = new Date(anomaly.timestamp);
        csvRows.push(
          [
            date.toISOString().split('T')[0],
            date.toTimeString().split(' ')[0],
            `${anomaly.employee.firstName} ${anomaly.employee.lastName}`,
            anomaly.employee.matricule || '',
            anomaly.employee.department?.name || '',
            anomaly.employee.site?.name || '',
            anomaly.anomalyType || '',
            (anomaly.anomalyNote || '').replace(/,/g, ';'),
            anomaly.isCorrected ? 'Corrigé' : 'Non corrigé',
            anomaly.correctedBy || '',
            anomaly.correctedAt ? new Date(anomaly.correctedAt).toISOString().split('T')[0] : '',
          ].join(','),
        );
      });

      return csvRows.join('\n');
    } else {
      // Format Excel (JSON pour l'instant, à convertir en Excel avec une librairie)
      return anomalies.map((anomaly) => ({
        date: new Date(anomaly.timestamp).toISOString().split('T')[0],
        time: new Date(anomaly.timestamp).toTimeString().split(' ')[0],
        employee: `${anomaly.employee.firstName} ${anomaly.employee.lastName}`,
        matricule: anomaly.employee.matricule || '',
        department: anomaly.employee.department?.name || '',
        site: anomaly.employee.site?.name || '',
        anomalyType: anomaly.anomalyType || '',
        note: anomaly.anomalyNote || '',
        status: anomaly.isCorrected ? 'Corrigé' : 'Non corrigé',
        correctedBy: anomaly.correctedBy || '',
        correctedAt: anomaly.correctedAt ? new Date(anomaly.correctedAt).toISOString() : '',
      }));
    }
  }

  /**
   * Récupère un dashboard de synthèse des anomalies
   */
  async getAnomaliesDashboard(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    userId?: string,
    userPermissions?: string[],
  ) {
    const where: any = {
      tenantId,
      hasAnomaly: true,
      timestamp: {
        gte: startDate,
        lte: endDate,
      },
    };

    // Filtrer par manager si nécessaire (seulement si l'utilisateur n'a pas 'view_all')
    const hasViewAll = userPermissions?.includes('attendance.view_all');
    if (userId && !hasViewAll) {
      const managerLevel = await getManagerLevel(this.prisma, userId, tenantId);
      if (managerLevel.type !== null) {
        const managedEmployeeIds = await getManagedEmployeeIds(this.prisma, managerLevel, tenantId);
        if (managedEmployeeIds.length === 0) {
          return this.getEmptyDashboard();
        }
        where.employeeId = { in: managedEmployeeIds };
      }
    }

    // Statistiques globales
    const [
      totalAnomalies,
      correctedAnomalies,
      pendingAnomalies,
      byType,
      byEmployee,
      byDay,
    ] = await Promise.all([
      // Total anomalies
      this.prisma.attendance.count({ where }),

      // Anomalies corrigées
      this.prisma.attendance.count({
        where: { ...where, isCorrected: true },
      }),

      // Anomalies en attente
      this.prisma.attendance.count({
        where: { ...where, isCorrected: false },
      }),

      // Par type d'anomalie
      this.prisma.attendance.groupBy({
        by: ['anomalyType'],
        where,
        _count: { id: true },
      }),

      // Par employé (top 10)
      this.prisma.attendance.groupBy({
        by: ['employeeId'],
        where,
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),

      // Par jour (derniers 7 jours)
      this.prisma.attendance.groupBy({
        by: ['timestamp'],
        where: {
          ...where,
          timestamp: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            lte: endDate,
          },
        },
        _count: { id: true },
      }),
    ]);

    // Enrichir les données par employé
    const employeeIds = byEmployee.map((e) => e.employeeId);
    const employees = await this.prisma.employee.findMany({
      where: { id: { in: employeeIds } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        matricule: true,
      },
    });

    const byEmployeeEnriched = byEmployee.map((item) => {
      const employee = employees.find((e) => e.id === item.employeeId);
      return {
        employeeId: item.employeeId,
        employeeName: employee
          ? `${employee.firstName} ${employee.lastName}`
          : 'Inconnu',
        matricule: employee?.matricule || '',
        count: item._count.id,
      };
    });

    return {
      summary: {
        total: totalAnomalies,
        corrected: correctedAnomalies,
        pending: pendingAnomalies,
        correctionRate: totalAnomalies > 0 ? (correctedAnomalies / totalAnomalies) * 100 : 0,
      },
      byType: byType.map((item) => ({
        type: item.anomalyType || 'UNKNOWN',
        count: item._count.id,
      })),
      byEmployee: byEmployeeEnriched,
      byDay: byDay.map((item) => ({
        date: new Date(item.timestamp).toISOString().split('T')[0],
        count: item._count.id,
      })),
    };
  }

  /**
   * Retourne un dashboard vide
   */
  private getEmptyDashboard() {
    return {
      summary: {
        total: 0,
        corrected: 0,
        pending: 0,
        correctionRate: 0,
      },
      byType: [],
      byEmployee: [],
      byDay: [],
    };
  }

  /**
   * Priorise les anomalies selon leur type et criticité
   * Version améliorée avec scoring contextuel
   */
  getAnomalyPriority(anomalyType: string | null): number {
    const priorities: Record<string, number> = {
      INSUFFICIENT_REST: 10, // Critique (légal)
      ABSENCE: 9, // Très important
      ABSENCE_PARTIAL: 8, // Très important
      ABSENCE_TECHNICAL: 7, // Important
      MISSING_OUT: 8, // Important (impact calcul heures)
      MISSING_IN: 7, // Important (impact calcul heures)
      LATE: 6, // Moyen
      EARLY_LEAVE: 5, // Moyen
      DOUBLE_IN: 4, // Faible
      PRESENCE_EXTERNE: 0, // Pas une anomalie
    };

    return priorities[anomalyType || ''] || 1;
  }

  /**
   * Calcule un score de criticité complet pour une anomalie
   * Implémente 1. Système de Scoring et Priorisation
   * 
   * Critères :
   * - Impact métier (base)
   * - Fréquence (plus répétée = plus critique)
   * - Contexte (avec justification vs sans)
   * - Historique employé (historique propre vs nombreuses anomalies)
   */
  async calculateAnomalyScore(
    tenantId: string,
    employeeId: string,
    anomalyType: string | null,
    timestamp: Date,
    hasJustification?: boolean,
  ): Promise<number> {
    // Score de base selon l'impact métier
    let score = this.getAnomalyPriority(anomalyType || null);

    // Critère 1: Fréquence - Plus un type d'anomalie se répète, plus le score est élevé
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentAnomalies = await this.prisma.attendance.count({
      where: {
        tenantId,
        employeeId,
        hasAnomaly: true,
        anomalyType: anomalyType || null,
        timestamp: { gte: thirtyDaysAgo },
      },
    });

    // Bonus de fréquence : +0.5 par occurrence supplémentaire (max +5)
    const frequencyBonus = Math.min(recentAnomalies * 0.5, 5);
    score += frequencyBonus;

    // Critère 2: Contexte - Anomalie avec justification vs sans justification
    if (!hasJustification) {
      score += 1; // +1 si pas de justification
    }

    // Critère 3: Historique - Employé avec historique propre vs nombreuses anomalies
    const totalAnomalies = await this.prisma.attendance.count({
      where: {
        tenantId,
        employeeId,
        hasAnomaly: true,
        timestamp: { gte: thirtyDaysAgo },
      },
    });

    // Si beaucoup d'anomalies (>10), augmenter le score
    if (totalAnomalies > 10) {
      score += 2; // +2 si historique chargé
    } else if (totalAnomalies > 5) {
      score += 1; // +1 si historique modéré
    }

    return Math.min(score, 20); // Score max: 20
  }

  /**
   * Récupère l'historique des corrections pour un pointage
   * Implémente 2. Interface de Correction Unifiée - Historique
   */
  async getCorrectionHistory(tenantId: string, attendanceId: string) {
    const attendance = await this.prisma.attendance.findFirst({
      where: { id: attendanceId, tenantId },
      select: {
        id: true,
        createdAt: true,
        correctedBy: true,
        correctedAt: true,
        correctionNote: true,
        isCorrected: true,
        approvalStatus: true,
        approvedBy: true,
        approvedAt: true,
        timestamp: true,
        rawData: true,
      },
    });

    if (!attendance) {
      throw new NotFoundException('Attendance record not found');
    }

    const history = [];

    // Action 1: Création initiale
    history.push({
      action: 'CREATED',
      timestamp: attendance.createdAt,
      note: 'Pointage créé',
    });

    // Action 2: Correction (si corrigé)
    if (attendance.isCorrected && attendance.correctedAt) {
      const correctedBy = attendance.correctedBy
        ? await this.prisma.user.findUnique({
            where: { id: attendance.correctedBy },
            select: { firstName: true, lastName: true },
          })
        : null;

      history.push({
        action: 'CORRECTED',
        timestamp: attendance.correctedAt,
        correctedBy: attendance.correctedBy,
        correctedByName: correctedBy
          ? `${correctedBy.firstName} ${correctedBy.lastName}`
          : null,
        correctionNote: attendance.correctionNote,
      });
    }

    // Action 3: Approbation (si approuvé)
    if (attendance.approvalStatus && attendance.approvedAt) {
      const approvedBy = attendance.approvedBy
        ? await this.prisma.user.findUnique({
            where: { id: attendance.approvedBy },
            select: { firstName: true, lastName: true },
          })
        : null;

      history.push({
        action: 'APPROVED',
        timestamp: attendance.approvedAt,
        approvedBy: attendance.approvedBy,
        approvedByName: approvedBy
          ? `${approvedBy.firstName} ${approvedBy.lastName}`
          : null,
        approvalStatus: attendance.approvalStatus,
      });
    }

    return history.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }

  /**
   * Correction en masse de plusieurs anomalies (wrapper pour compatibilité)
   * Implémente 2. Interface de Correction Unifiée - Bulk Correction
   * Note: bulkCorrectAttendance existe déjà, cette méthode est un wrapper
   */
  async bulkCorrect(
    tenantId: string,
    corrections: Array<{
      attendanceId: string;
      correctedTimestamp?: string;
      correctionNote?: string;
    }>,
    generalNote: string,
    correctedBy: string,
    userId?: string,
    userPermissions?: string[],
  ) {
    // Utiliser la méthode existante bulkCorrectAttendance
    return this.bulkCorrectAttendance(tenantId, {
      attendances: corrections,
      generalNote,
      correctedBy,
    });
  }

  /**
   * Analytics des anomalies - Métriques complètes
   * Implémente 3. Analytics et Reporting
   */
  async getAnomaliesAnalytics(
    tenantId: string,
    startDate: string,
    endDate: string,
    filters?: {
      employeeId?: string;
      departmentId?: string;
      siteId?: string;
      anomalyType?: string;
    },
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const where: any = {
      tenantId,
      hasAnomaly: true,
      timestamp: { gte: start, lte: end },
    };

    if (filters?.employeeId) where.employeeId = filters.employeeId;
    if (filters?.departmentId) {
      where.employee = { departmentId: filters.departmentId };
    }
    if (filters?.siteId) where.siteId = filters.siteId;
    if (filters?.anomalyType) where.anomalyType = filters.anomalyType;

    // Métrique 1: Taux d'anomalies par type
    const byType = await this.prisma.attendance.groupBy({
      by: ['anomalyType'],
      where,
      _count: { id: true },
    });

    // Métrique 2: Taux d'anomalies par employé
    const byEmployee = await this.prisma.attendance.groupBy({
      by: ['employeeId'],
      where,
      _count: { id: true },
      _avg: { hoursWorked: true },
    });

    // Métrique 3: Taux d'anomalies par département
    const byDepartment = await this.prisma.attendance.groupBy({
      by: ['siteId'],
      where: {
        ...where,
        employee: filters?.departmentId ? { departmentId: filters.departmentId } : undefined,
      },
      _count: { id: true },
    });

    // Métrique 4: Temps moyen de résolution
    const correctedAnomalies = await this.prisma.attendance.findMany({
      where: {
        ...where,
        isCorrected: true,
        correctedAt: { not: null },
      },
      select: {
        createdAt: true,
        correctedAt: true,
      },
    });

    const avgResolutionTime = correctedAnomalies.length > 0
      ? correctedAnomalies.reduce((sum, a) => {
          const resolutionTime = a.correctedAt
            ? (a.correctedAt.getTime() - a.createdAt.getTime()) / (1000 * 60 * 60) // en heures
            : 0;
          return sum + resolutionTime;
        }, 0) / correctedAnomalies.length
      : 0;

    // Métrique 5: Tendances temporelles (par jour)
    const dailyTrends = await this.prisma.$queryRaw<Array<{
      date: Date;
      count: bigint;
    }>>`
      SELECT DATE(timestamp) as date, COUNT(*)::bigint as count
      FROM "Attendance"
      WHERE "tenantId" = ${tenantId}
        AND "hasAnomaly" = true
        AND "timestamp" >= ${start}
        AND "timestamp" <= ${end}
      GROUP BY DATE(timestamp)
      ORDER BY date ASC
    `;

    // Métrique 6: Patterns récurrents (jours de la semaine)
    const dayOfWeekPatterns = await this.prisma.$queryRaw<Array<{
      dayOfWeek: number;
      count: bigint;
    }>>`
      SELECT EXTRACT(DOW FROM timestamp)::int as "dayOfWeek", COUNT(*)::bigint as count
      FROM "Attendance"
      WHERE "tenantId" = ${tenantId}
        AND "hasAnomaly" = true
        AND "timestamp" >= ${start}
        AND "timestamp" <= ${end}
      GROUP BY EXTRACT(DOW FROM timestamp)
      ORDER BY "dayOfWeek" ASC
    `;

    return {
      summary: {
        total: await this.prisma.attendance.count({ where }),
        corrected: await this.prisma.attendance.count({
          where: { ...where, isCorrected: true },
        }),
        pending: await this.prisma.attendance.count({
          where: { ...where, isCorrected: false },
        }),
        avgResolutionTimeHours: Math.round(avgResolutionTime * 100) / 100,
      },
      byType: byType.map(item => ({
        type: item.anomalyType,
        count: item._count.id,
      })),
      byEmployee: await Promise.all(
        byEmployee.map(async item => {
          const employee = await this.prisma.employee.findUnique({
            where: { id: item.employeeId },
            select: { firstName: true, lastName: true, matricule: true },
          });
          return {
            employeeId: item.employeeId,
            employeeName: employee
              ? `${employee.firstName} ${employee.lastName}`
              : 'Unknown',
            matricule: employee?.matricule,
            count: item._count.id,
          };
        }),
      ),
      byDepartment: byDepartment.map(item => ({
        siteId: item.siteId,
        count: item._count.id,
      })),
      trends: dailyTrends.map(item => ({
        date: item.date,
        count: Number(item.count),
      })),
      dayOfWeekPatterns: dayOfWeekPatterns.map(item => ({
        dayOfWeek: item.dayOfWeek,
        dayName: ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'][
          item.dayOfWeek
        ],
        count: Number(item.count),
      })),
    };
  }

  /**
   * Génère un rapport mensuel des anomalies par département
   * Implémente 3. Analytics et Reporting - Rapports
   */
  async getMonthlyAnomaliesReport(
    tenantId: string,
    year: number,
    month: number,
  ) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59, 999);

    const anomalies = await this.prisma.attendance.findMany({
      where: {
        tenantId,
        hasAnomaly: true,
        timestamp: { gte: start, lte: end },
      },
      include: {
        employee: {
          include: {
            department: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // Grouper par département
    const byDepartment = anomalies.reduce((acc, anomaly) => {
      const deptId = anomaly.employee.department?.id || 'unknown';
      const deptName = anomaly.employee.department?.name || 'Non assigné';

      if (!acc[deptId]) {
        acc[deptId] = {
          departmentId: deptId,
          departmentName: deptName,
          total: 0,
          byType: {} as Record<string, number>,
          corrected: 0,
          pending: 0,
        };
      }

      acc[deptId].total++;
      acc[deptId].byType[anomaly.anomalyType || 'UNKNOWN'] =
        (acc[deptId].byType[anomaly.anomalyType || 'UNKNOWN'] || 0) + 1;

      if (anomaly.isCorrected) {
        acc[deptId].corrected++;
      } else {
        acc[deptId].pending++;
      }

      return acc;
    }, {} as Record<string, any>);

    return {
      period: { year, month },
      summary: {
        total: anomalies.length,
        corrected: anomalies.filter(a => a.isCorrected).length,
        pending: anomalies.filter(a => !a.isCorrected).length,
      },
      byDepartment: Object.values(byDepartment),
    };
  }

  /**
   * Détecte les employés avec taux d'anomalies élevé
   * Implémente 3. Analytics et Reporting - Alertes
   */
  async getHighAnomalyRateEmployees(
    tenantId: string,
    threshold: number = 5, // Nombre minimum d'anomalies
    days: number = 30,
  ) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const employees = await this.prisma.employee.findMany({
      where: { tenantId, isActive: true },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        matricule: true,
        department: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const results = await Promise.all(
      employees.map(async employee => {
        const anomalyCount = await this.prisma.attendance.count({
          where: {
            tenantId,
            employeeId: employee.id,
            hasAnomaly: true,
            timestamp: { gte: startDate },
          },
        });

        if (anomalyCount >= threshold) {
          return {
            employeeId: employee.id,
            employeeName: `${employee.firstName} ${employee.lastName}`,
            matricule: employee.matricule,
            department: employee.department?.name,
            anomalyCount,
            recommendation: this.generateRecommendation(anomalyCount),
          };
        }
        return null;
      }),
    );

    return results.filter(r => r !== null);
  }

  /**
   * Détecte si un pointage est effectué un jour férié
   * Retourne une alerte informative JOUR_FERIE_TRAVAILLE
   */
  private async detectHolidayWork(
    tenantId: string,
    employeeId: string,
    timestamp: Date,
    type: AttendanceType,
  ): Promise<{ hasAnomaly: boolean; type?: string; note?: string }> {
    // Vérifier si c'est un jour férié - CORRECTION: comparer uniquement la date
    const timestampDate = new Date(timestamp);
    const dateOnly = new Date(Date.UTC(
      timestampDate.getFullYear(),
      timestampDate.getMonth(),
      timestampDate.getDate(),
      0, 0, 0, 0
    ));

    console.log(`[detectHolidayWork] Checking ${type} at ${timestamp.toISOString()}, dateOnly: ${dateOnly.toISOString()}`);

    const holiday = await this.prisma.holiday.findFirst({
      where: {
        tenantId,
        date: dateOnly,
      },
    });

    console.log(`[detectHolidayWork] Holiday found: ${holiday ? `${holiday.name} (${holiday.date.toISOString()})` : 'NONE'}`);

    if (!holiday) {
      return { hasAnomaly: false };
    }

    // Récupérer les paramètres de majoration des jours fériés
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
      select: {
        holidayOvertimeEnabled: true,
        holidayOvertimeRate: true,
        holidayOvertimeAsNormalHours: true,
      },
    });

    const holidayOvertimeEnabled = settings?.holidayOvertimeEnabled !== false;

    // Si c'est un OUT et qu'il n'y a pas de planning pour ce jour,
    // vérifier s'il y a un IN la veille (shift de nuit)
    if (type === AttendanceType.OUT) {
      const previousDay = new Date(timestamp);
      previousDay.setDate(previousDay.getDate() - 1);
      previousDay.setHours(0, 0, 0, 0);
      const previousDayEnd = new Date(previousDay);
      previousDayEnd.setHours(23, 59, 59, 999);

      // Vérifier s'il y a un IN la veille
      const inRecord = await this.prisma.attendance.findFirst({
        where: {
          tenantId,
          employeeId,
          type: AttendanceType.IN,
          timestamp: {
            gte: previousDay,
            lte: previousDayEnd,
          },
        },
        orderBy: { timestamp: 'desc' },
      });

      if (inRecord) {
        // Vérifier s'il y a un planning pour la veille (shift de nuit)
        const previousDaySchedule = await this.prisma.schedule.findFirst({
          where: {
            tenantId,
            employeeId,
            date: {
              gte: previousDay,
              lte: previousDayEnd,
            },
            status: 'PUBLISHED',
          },
          include: {
            shift: true,
          },
        });

        if (previousDaySchedule) {
          const expectedEndTime = this.parseTimeString(
            previousDaySchedule.customEndTime || previousDaySchedule.shift.endTime,
          );
          const isNightShift = this.isNightShift(previousDaySchedule.shift, expectedEndTime);

          if (isNightShift) {
            // Calculer les heures travaillées sur le jour férié (de minuit au OUT)
            const midnightHolidayDate = new Date(holiday.date);
            midnightHolidayDate.setHours(0, 0, 0, 0);
            const hoursOnHoliday = (timestamp.getTime() - midnightHolidayDate.getTime()) / (1000 * 60 * 60);
            const hoursDisplay = Math.floor(hoursOnHoliday);
            const minutesDisplay = Math.round((hoursOnHoliday - hoursDisplay) * 60);

            // Message selon la configuration
            let note = `Shift de nuit traversant le jour férié "${holiday.name}" (${holiday.date.toLocaleDateString('fr-FR')}).`;

            if (holidayOvertimeEnabled) {
              note += ` De 00:00 à ${timestamp.getHours().toString().padStart(2, '0')}:${timestamp.getMinutes().toString().padStart(2, '0')} = ${hoursDisplay}h${minutesDisplay.toString().padStart(2, '0')} potentiellement majorées.`;
            }

            return {
              hasAnomaly: true,
              type: 'JOUR_FERIE_TRAVAILLE',
              note,
            };
          }
        }
      }
    }

    // Pointage normal un jour férié
    let note = `Pointage effectué le jour férié "${holiday.name}" (${holiday.date.toLocaleDateString('fr-FR')}).`;

    if (holidayOvertimeEnabled) {
      note += ` Les heures travaillées seront potentiellement majorées.`;
    }

    return {
      hasAnomaly: true,
      type: 'JOUR_FERIE_TRAVAILLE',
      note,
    };
  }

  /**
   * Génère une recommandation basée sur le nombre d'anomalies
   */
  private generateRecommendation(anomalyCount: number): string {
    if (anomalyCount >= 10) {
      return 'Formation urgente requise - Vérifier le badge et le processus de pointage';
    } else if (anomalyCount >= 5) {
      return 'Formation recommandée - Rappel des procédures de pointage';
    } else {
      return 'Surveillance recommandée - Vérifier les patterns récurrents';
    }
  }
}
