import apiClient from './client';

export interface Leave {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  days: number;
  reason?: string;
  attachment?: string;
  document?: string;
  documentName?: string;
  documentSize?: number;
  documentMimeType?: string;
  documentUploadedBy?: string;
  documentUploadedAt?: string;
  documentUpdatedBy?: string;
  documentUpdatedAt?: string;
  status: 'PENDING' | 'MANAGER_APPROVED' | 'HR_APPROVED' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  managerApprovedBy?: string;
  managerApprovedAt?: string;
  managerComment?: string;
  hrApprovedBy?: string;
  hrApprovedAt?: string;
  hrComment?: string;
  rejectionReason?: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
  employee?: any;
  leaveType?: any;
}

export interface LeaveType {
  id: string;
  name: string;
  maxDays?: number;
  requiresDocument: boolean;
  color?: string;
  tenantId: string;
}

export interface CreateLeaveDto {
  employeeId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  reason?: string;
  attachment?: string;
}

export interface LeaveFilters {
  employeeId?: string;
  status?: string;
  leaveTypeId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export const leavesApi = {
  getAll: async (filters?: LeaveFilters) => {
    const response = await apiClient.get('/leaves', { params: filters });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiClient.get(`/leaves/${id}`);
    return response.data;
  },

  create: async (data: CreateLeaveDto) => {
    const response = await apiClient.post('/leaves', data);
    return response.data;
  },

  update: async (id: string, data: Partial<CreateLeaveDto>) => {
    const response = await apiClient.patch(`/leaves/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/leaves/${id}`);
    return response.data;
  },

  approve: async (id: string, level: 'manager' | 'hr') => {
    const status = level === 'manager' ? 'MANAGER_APPROVED' : 'APPROVED';
    const response = await apiClient.post(`/leaves/${id}/approve`, { status });
    return response.data;
  },

  reject: async (id: string, reason: string) => {
    const response = await apiClient.post(`/leaves/${id}/approve`, {
      status: 'REJECTED',
      comment: reason
    });
    return response.data;
  },

  getLeaveTypes: async () => {
    const response = await apiClient.get('/leave-types');
    return response.data;
  },

  createLeaveType: async (data: any) => {
    const response = await apiClient.post('/leave-types', data);
    return response.data;
  },

  updateLeaveType: async (id: string, data: any) => {
    const response = await apiClient.patch(`/leave-types/${id}`, data);
    return response.data;
  },

  deleteLeaveType: async (id: string) => {
    const response = await apiClient.delete(`/leave-types/${id}`);
    return response.data;
  },

  getBalance: async (employeeId: string) => {
    const response = await apiClient.get(`/leaves/balance/${employeeId}`);
    return response.data;
  },

  getWorkflowConfig: async (): Promise<{
    twoLevelWorkflow: boolean;
    leaveApprovalLevels: number;
    annualLeaveDays: number;
    anticipatedLeave: boolean;
    leaveIncludeSaturday: boolean;
  }> => {
    const response = await apiClient.get('/leaves/workflow-config');
    return response.data;
  },

  calculateWorkingDays: async (startDate: string, endDate: string, employeeId?: string): Promise<{
    workingDays: number;
    excludedWeekends: number;
    excludedHolidays: number;
    totalCalendarDays: number;
    includeSaturday: boolean;
    details: Array<{ date: string; isWorking: boolean; reason?: string }>;
    isPersonalizedSchedule?: boolean; // NOUVEAU: Indique si le calcul est basé sur un planning personnalisé
  }> => {
    const response = await apiClient.get('/leaves/calculate-working-days', {
      params: { startDate, endDate, employeeId }, // NOUVEAU: Passer employeeId
    });
    return response.data;
  },

  uploadDocument: async (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post(`/leaves/${id}/document`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  downloadDocument: async (id: string) => {
    const response = await apiClient.get(`/leaves/${id}/document`, {
      responseType: 'blob',
    });
    return response.data;
  },

  deleteDocument: async (id: string) => {
    const response = await apiClient.delete(`/leaves/${id}/document`);
    return response.data;
  },

  // ============================================
  // SOLDE DE CONGÉS
  // ============================================

  getQuickBalance: async (employeeId: string, year?: number): Promise<{
    quota: number;
    taken: number;
    pending: number;
    remaining: number;
    hasPersonalizedQuota: boolean;
  }> => {
    const response = await apiClient.get(`/leaves/balance/${employeeId}/quick`, {
      params: { year },
    });
    return response.data;
  },

  getEmployeeBalance: async (employeeId: string, year?: number): Promise<{
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
      approved: Array<{
        id: string;
        startDate: string;
        endDate: string;
        days: number;
        leaveType: string;
        status: string;
      }>;
      pending: Array<{
        id: string;
        startDate: string;
        endDate: string;
        days: number;
        leaveType: string;
        status: string;
      }>;
    };
  }> => {
    const response = await apiClient.get(`/leaves/balance/${employeeId}`, {
      params: { year },
    });
    return response.data;
  },

  getAllBalances: async (params?: {
    year?: number;
    siteId?: string;
    departmentId?: string;
    teamId?: string;
  }): Promise<Array<{
    employeeId: string;
    employeeName: string;
    matricule: string;
    year: number;
    quota: number;
    quotaSource: 'employee' | 'tenant';
    taken: number;
    pending: number;
    remaining: number;
  }>> => {
    const response = await apiClient.get('/leaves/balance/all', { params });
    return response.data;
  },

  updateEmployeeQuota: async (employeeId: string, quota: number | null): Promise<void> => {
    await apiClient.patch(`/leaves/balance/${employeeId}/quota`, { quota });
  },
};
