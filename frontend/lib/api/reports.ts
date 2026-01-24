import apiClient from './client';

export interface ReportFilters {
  startDate: string;
  endDate: string;
  employeeId?: string;
  departmentId?: string;
  siteId?: string;
  teamId?: string;
  status?: string;
  type?: string;
  format?: 'PDF' | 'EXCEL' | 'CSV';
  columns?: string;
  template?: string;
  includeSummary?: boolean;
  includeCharts?: boolean;
}

export type DashboardScope = 'personal' | 'team' | 'tenant' | 'platform';

export const reportsApi = {
  getDashboardStats: async (filters?: { 
    startDate?: string; 
    endDate?: string;
    scope?: DashboardScope;
  }) => {
    const response = await apiClient.get('/reports/dashboard', { params: filters });
    return response.data;
  },

  getAttendanceReport: async (filters: ReportFilters) => {
    const response = await apiClient.get('/reports/attendance', { 
      params: {
        startDate: filters.startDate,
        endDate: filters.endDate,
        employeeId: filters.employeeId,
        departmentId: filters.departmentId,
        siteId: filters.siteId,
        teamId: filters.teamId,
      }
    });
    return response.data;
  },

  getAbsencesReport: async (filters: ReportFilters) => {
    const response = await apiClient.get('/reports/absences', { 
      params: {
        startDate: filters.startDate,
        endDate: filters.endDate,
        employeeId: filters.employeeId,
        departmentId: filters.departmentId,
        siteId: filters.siteId,
        teamId: filters.teamId,
      }
    });
    return response.data;
  },

  getOvertimeReport: async (filters: ReportFilters) => {
    const response = await apiClient.get('/reports/overtime', {
      params: {
        startDate: filters.startDate,
        endDate: filters.endDate,
        employeeId: filters.employeeId,
        departmentId: filters.departmentId,
        siteId: filters.siteId,
        teamId: filters.teamId,
        status: filters.status,
        type: filters.type,
      }
    });
    return response.data;
  },

  getSupplementaryDaysReport: async (filters: ReportFilters) => {
    const response = await apiClient.get('/reports/supplementary-days', {
      params: {
        startDate: filters.startDate,
        endDate: filters.endDate,
        employeeId: filters.employeeId,
        departmentId: filters.departmentId,
        siteId: filters.siteId,
        teamId: filters.teamId,
        status: filters.status,
        type: filters.type,
      }
    });
    return response.data;
  },

  getPlanningReport: async (filters: ReportFilters) => {
    const response = await apiClient.get('/reports/planning', {
      params: {
        startDate: filters.startDate,
        endDate: filters.endDate,
        employeeId: filters.employeeId,
        departmentId: filters.departmentId,
        siteId: filters.siteId,
        teamId: filters.teamId,
      }
    });
    return response.data;
  },

  getRecoveryDaysReport: async (filters: ReportFilters) => {
    const response = await apiClient.get('/recovery-days', {
      params: {
        startDate: filters.startDate,
        endDate: filters.endDate,
        employeeId: filters.employeeId,
        status: filters.status,
      }
    });
    // Transform data to match report format
    const data = Array.isArray(response.data) ? response.data : (response.data?.data || []);

    // Calculate summary statistics
    const totalDays = data.reduce((sum: number, r: any) => sum + (parseFloat(r.days) || 0), 0);
    const byStatus = data.reduce((acc: Record<string, number>, r: any) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    }, {});

    return {
      data,
      summary: {
        total: data.length,
        totalDays,
        byStatus,
        pendingCount: byStatus['PENDING'] || 0,
        approvedCount: byStatus['APPROVED'] || 0,
        usedCount: byStatus['USED'] || 0,
        cancelledCount: byStatus['CANCELLED'] || 0,
        period: {
          startDate: filters.startDate,
          endDate: filters.endDate,
        },
      },
    };
  },

  getPayrollReport: async (filters: ReportFilters) => {
    const response = await apiClient.get('/reports/payroll', { 
      params: {
        startDate: filters.startDate,
        endDate: filters.endDate,
        employeeId: filters.employeeId,
        departmentId: filters.departmentId,
        siteId: filters.siteId,
        teamId: filters.teamId,
      }
    });
    return response.data;
  },

  exportReport: async (reportType: string, filters: ReportFilters) => {
    const response = await apiClient.post(`/reports/${reportType}/export`, {
      format: filters.format,
      startDate: filters.startDate,
      endDate: filters.endDate,
      employeeId: filters.employeeId,
      departmentId: filters.departmentId,
      siteId: filters.siteId,
      teamId: filters.teamId,
      columns: filters.columns,
      template: filters.template,
      includeSummary: filters.includeSummary,
      includeCharts: filters.includeCharts,
    }, {
      responseType: 'blob',
    });
    return response.data;
  },

  getReportHistory: async () => {
    const response = await apiClient.get('/reports/history');
    return response.data;
  },

  downloadReportFromHistory: async (reportId: string) => {
    const response = await apiClient.get(`/reports/history/${reportId}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },

  getStatsByDepartment: async (filters?: {
    startDate?: string;
    endDate?: string;
  }) => {
    const response = await apiClient.get('/reports/dashboard', {
      params: {
        ...filters,
        scope: 'department',
      },
    });
    return response.data;
  },

  getStatsBySite: async (filters?: {
    startDate?: string;
    endDate?: string;
  }) => {
    const response = await apiClient.get('/reports/dashboard', {
      params: {
        ...filters,
        scope: 'site',
      },
    });
    return response.data;
  },
};
