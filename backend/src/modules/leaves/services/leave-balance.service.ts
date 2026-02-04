import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { LeaveStatus } from '@prisma/client';

export interface LeaveBalanceResult {
  employeeId: string;
  employeeName: string;
  matricule: string;
  year: number;
  quota: number;
  quotaSource: 'employee' | 'tenant';
  taken: number;
  pending: number;
  remaining: number;
  details: {
    approved: LeaveDetail[];
    pending: LeaveDetail[];
  };
}

export interface LeaveDetail {
  id: string;
  startDate: Date;
  endDate: Date;
  days: number;
  leaveType: string;
  status: string;
}

@Injectable()
export class LeaveBalanceService {
  constructor(private prisma: PrismaService) {}

  /**
   * Récupère le quota de congés pour un employé
   * Priorité : Employee.leaveQuota > TenantSettings.annualLeaveDays > 18 (défaut)
   */
  async getQuota(tenantId: string, employeeId: string): Promise<{ quota: number; source: 'employee' | 'tenant' }> {
    // Vérifier si l'employé a un quota personnalisé
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, tenantId },
      select: { leaveQuota: true },
    });

    if (employee?.leaveQuota !== null && employee?.leaveQuota !== undefined) {
      return { quota: employee.leaveQuota, source: 'employee' };
    }

    // Sinon, utiliser le quota du tenant
    const tenantSettings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
      select: { annualLeaveDays: true },
    });

    return {
      quota: tenantSettings?.annualLeaveDays ?? 18,
      source: 'tenant',
    };
  }

  /**
   * Calcule le solde de congés pour un employé sur une année donnée
   */
  async calculateBalance(
    tenantId: string,
    employeeId: string,
    year?: number,
  ): Promise<LeaveBalanceResult> {
    const currentYear = year || new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59);

    // Récupérer l'employé
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, tenantId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        matricule: true,
        leaveQuota: true,
      },
    });

    if (!employee) {
      throw new Error(`Employee ${employeeId} not found`);
    }

    // Récupérer le quota
    const { quota, source } = await this.getQuota(tenantId, employeeId);

    // Récupérer les congés approuvés pour l'année
    const approvedLeaves = await this.prisma.leave.findMany({
      where: {
        tenantId,
        employeeId,
        status: LeaveStatus.APPROVED,
        startDate: { lte: endOfYear },
        endDate: { gte: startOfYear },
      },
      include: {
        leaveType: { select: { name: true } },
      },
      orderBy: { startDate: 'asc' },
    });

    // Récupérer les congés en attente pour l'année
    const pendingLeaves = await this.prisma.leave.findMany({
      where: {
        tenantId,
        employeeId,
        status: { in: [LeaveStatus.PENDING, LeaveStatus.MANAGER_APPROVED] },
        startDate: { lte: endOfYear },
        endDate: { gte: startOfYear },
      },
      include: {
        leaveType: { select: { name: true } },
      },
      orderBy: { startDate: 'asc' },
    });

    // Calculer les jours pris (approuvés)
    const taken = approvedLeaves.reduce((sum, leave) => sum + (Number(leave.days) || 0), 0);

    // Calculer les jours en attente
    const pending = pendingLeaves.reduce((sum, leave) => sum + (Number(leave.days) || 0), 0);

    // Calculer le solde restant
    const remaining = quota - taken;

    return {
      employeeId: employee.id,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      matricule: employee.matricule,
      year: currentYear,
      quota,
      quotaSource: source,
      taken,
      pending,
      remaining,
      details: {
        approved: approvedLeaves.map((leave) => ({
          id: leave.id,
          startDate: leave.startDate,
          endDate: leave.endDate,
          days: Number(leave.days) || 0,
          leaveType: leave.leaveType?.name || 'Non spécifié',
          status: leave.status,
        })),
        pending: pendingLeaves.map((leave) => ({
          id: leave.id,
          startDate: leave.startDate,
          endDate: leave.endDate,
          days: Number(leave.days) || 0,
          leaveType: leave.leaveType?.name || 'Non spécifié',
          status: leave.status,
        })),
      },
    };
  }

  /**
   * Récupère le solde de congés pour tous les employés d'un tenant
   * Utile pour le rapport "Solde de congés"
   * OPTIMISÉ: Requêtes batch au lieu de requêtes individuelles
   */
  async getAllBalances(
    tenantId: string,
    year?: number,
    filters?: {
      siteId?: string;
      departmentId?: string;
      teamId?: string;
    },
  ): Promise<Omit<LeaveBalanceResult, 'details'>[]> {
    const currentYear = year || new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59);

    // Construire le filtre pour les employés
    const whereClause: any = {
      tenantId,
      isActive: true,
    };

    if (filters?.siteId) {
      whereClause.siteId = filters.siteId;
    }
    if (filters?.departmentId) {
      whereClause.departmentId = filters.departmentId;
    }
    if (filters?.teamId) {
      whereClause.teamId = filters.teamId;
    }

    // Récupérer le quota par défaut du tenant
    const tenantSettings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
      select: { annualLeaveDays: true },
    });
    const defaultQuota = tenantSettings?.annualLeaveDays ?? 18;

    // Récupérer tous les employés actifs avec leurs congés en une seule requête
    const employees = await this.prisma.employee.findMany({
      where: whereClause,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        matricule: true,
        leaveQuota: true,
        leaves: {
          where: {
            startDate: { lte: endOfYear },
            endDate: { gte: startOfYear },
            status: { in: [LeaveStatus.APPROVED, LeaveStatus.HR_APPROVED, LeaveStatus.PENDING, LeaveStatus.MANAGER_APPROVED] },
          },
          select: {
            days: true,
            status: true,
          },
        },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });

    // Calculer les soldes
    const balances = employees.map((emp) => {
      const quota = emp.leaveQuota ?? defaultQuota;
      const quotaSource: 'employee' | 'tenant' = emp.leaveQuota !== null ? 'employee' : 'tenant';

      // Calculer les jours pris (approuvés)
      const taken = emp.leaves
        .filter((l) => l.status === LeaveStatus.APPROVED || l.status === LeaveStatus.HR_APPROVED)
        .reduce((sum, l) => sum + (Number(l.days) || 0), 0);

      // Calculer les jours en attente
      const pending = emp.leaves
        .filter((l) => l.status === LeaveStatus.PENDING || l.status === LeaveStatus.MANAGER_APPROVED)
        .reduce((sum, l) => sum + (Number(l.days) || 0), 0);

      // Calculer le solde restant
      const remaining = quota - taken;

      return {
        employeeId: emp.id,
        employeeName: `${emp.firstName} ${emp.lastName}`,
        matricule: emp.matricule,
        year: currentYear,
        quota,
        quotaSource,
        taken,
        pending,
        remaining,
      };
    });

    return balances;
  }

  /**
   * Vérifie si un employé a suffisamment de solde pour un congé
   */
  async checkSufficientBalance(
    tenantId: string,
    employeeId: string,
    requestedDays: number,
    year?: number,
  ): Promise<{ sufficient: boolean; remaining: number; requested: number }> {
    const balance = await this.calculateBalance(tenantId, employeeId, year);

    return {
      sufficient: balance.remaining >= requestedDays,
      remaining: balance.remaining,
      requested: requestedDays,
    };
  }

  /**
   * Met à jour le quota personnalisé d'un employé
   */
  async updateEmployeeQuota(
    tenantId: string,
    employeeId: string,
    quota: number | null,
  ): Promise<void> {
    await this.prisma.employee.update({
      where: { id: employeeId },
      data: { leaveQuota: quota },
    });
  }

  /**
   * Récupère un résumé rapide du solde (pour l'affichage dans le modal)
   */
  async getQuickBalance(
    tenantId: string,
    employeeId: string,
    year?: number,
  ): Promise<{
    quota: number;
    taken: number;
    pending: number;
    remaining: number;
    hasPersonalizedQuota: boolean;
  }> {
    const balance = await this.calculateBalance(tenantId, employeeId, year);

    return {
      quota: balance.quota,
      taken: balance.taken,
      pending: balance.pending,
      remaining: balance.remaining,
      hasPersonalizedQuota: balance.quotaSource === 'employee',
    };
  }
}
