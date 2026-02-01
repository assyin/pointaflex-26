import apiClient from './client';

export interface Schedule {
  id: string;
  employeeId: string;
  shiftId: string;
  date: string;
  tenantId: string;
  status?: 'PUBLISHED' | 'DRAFT' | 'CANCELLED' | 'SUSPENDED_BY_LEAVE';
  suspendedByLeaveId?: string;
  suspendedAt?: string;
  customStartTime?: string;
  customEndTime?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  employee?: any;
  shift?: any;
  suspendedByLeave?: any; // Leave relation
  isReplaced?: boolean;
  replacedAt?: string;
  replacedById?: string;
}

export interface CreateScheduleDto {
  employeeId: string;
  shiftId: string;
  dateDebut: string;
  dateFin?: string;
  teamId?: string;
  customStartTime?: string;
  customEndTime?: string;
  notes?: string;
}

export interface ScheduleFilters {
  employeeId?: string;
  teamId?: string;
  startDate?: string;
  endDate?: string;
}

export interface Replacement {
  id: string;
  date: string;
  originalEmployeeId: string;
  replacementEmployeeId: string;
  shiftId: string;
  reason?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedBy?: string;
  approvedAt?: string;
  originalEmployee?: any;
  replacementEmployee?: any;
  shift?: any;
}

export interface LegalAlert {
  id: string;
  type: 'WARNING' | 'CRITICAL';
  message: string;
  employeeId?: string;
  employeeName?: string;
  date?: string;
  details?: any;
}

export interface WeekScheduleResponse {
  weekStart: string;
  weekEnd: string;
  schedules: Schedule[];
  leaves: any[];
  replacements: Replacement[];
}

export interface MonthScheduleResponse {
  monthStart: string;
  monthEnd: string;
  schedules: Schedule[];
  leaves: any[];
  replacements: Replacement[];
}

export interface RotationPreviewResponse {
  preview: Array<{
    employeeId: string;
    matricule: string;
    employeeName: string;
    startDate: string;
    schedule: Array<{
      date: string;
      dayOfWeek: string;
      isWorkDay: boolean;
    }>;
    totalWorkDays: number;
    totalRestDays: number;
  }>;
  totalSchedulesToCreate: number;
}

export interface RotationGenerateResponse {
  success: number;
  skipped: number;
  failed: number;
  details: Array<{
    employeeId: string;
    matricule: string;
    employeeName: string;
    created: number;
    skipped: number;
    errors: string[];
  }>;
}

export const schedulesApi = {
  getAll: async (filters?: ScheduleFilters) => {
    const response = await apiClient.get('/schedules', { params: filters });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiClient.get(`/schedules/${id}`);
    return response.data;
  },

  getWeek: async (date: string, filters?: { teamId?: string; siteId?: string }) => {
    const response = await apiClient.get(`/schedules/week/${date}`, { params: filters });
    return response.data as WeekScheduleResponse;
  },

  getMonth: async (date: string, filters?: { teamId?: string; siteId?: string }) => {
    const response = await apiClient.get(`/schedules/month/${date}`, { params: filters });
    return response.data as MonthScheduleResponse;
  },

  getByDateRange: async (startDate: string, endDate: string, filters?: { teamId?: string; siteId?: string; shiftId?: string }) => {
    const response = await apiClient.get('/schedules', {
      params: {
        startDate,
        endDate,
        limit: 10000, // Limite très élevée pour récupérer tous les plannings de la période
        page: 1,
        ...filters,
      },
    });
    return response.data;
  },

  create: async (data: CreateScheduleDto) => {
    // Log pour debug (à retirer en production)
    if (process.env.NODE_ENV === 'development') {
      console.log('Creating schedule with data:', JSON.stringify(data, null, 2));
    }
    const response = await apiClient.post('/schedules', data);
    return response.data;
  },

  bulkCreate: async (schedules: CreateScheduleDto[]) => {
    const response = await apiClient.post('/schedules/bulk', { schedules });
    return response.data;
  },

  update: async (id: string, data: Partial<CreateScheduleDto>) => {
    const response = await apiClient.patch(`/schedules/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/schedules/${id}`);
    return response.data;
  },

  deleteBulk: async (ids: string[]) => {
    const response = await apiClient.delete('/schedules/bulk', { data: { ids } });
    return response.data;
  },

  getAlerts: async (startDate: string, endDate: string) => {
    const response = await apiClient.get('/schedules/alerts', {
      params: { startDate, endDate },
    });
    return response.data as LegalAlert[];
  },

  // Replacements
  createReplacement: async (data: {
    date: string;
    originalEmployeeId: string;
    replacementEmployeeId: string;
    shiftId: string;
    reason?: string;
  }) => {
    const response = await apiClient.post('/schedules/replacements', data);
    return response.data;
  },

  getReplacements: async (filters?: {
    status?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const response = await apiClient.get('/schedules/replacements', { params: filters });
    return response.data as Replacement[];
  },

  approveReplacement: async (id: string) => {
    const response = await apiClient.patch(`/schedules/replacements/${id}/approve`);
    return response.data;
  },

  rejectReplacement: async (id: string) => {
    const response = await apiClient.patch(`/schedules/replacements/${id}/reject`);
    return response.data;
  },

  getReplacementSuggestions: async (
    originalEmployeeId: string,
    date: string,
    shiftId: string,
    filters?: { teamId?: string; siteId?: string; departmentId?: string; maxSuggestions?: number }
  ) => {
    const response = await apiClient.get('/schedules/replacements/suggestions', {
      params: {
        originalEmployeeId,
        date,
        shiftId,
        ...filters,
      },
    });
    return response.data;
  },

  importExcel: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/schedules/import/excel', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getImportTemplate: async () => {
    const response = await apiClient.get('/schedules/import/template', {
      responseType: 'blob',
    });
    return response.data;
  },

  // Weekly Calendar Import
  importWeeklyCalendar: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/schedules/import/weekly-calendar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getWeeklyCalendarTemplate: async () => {
    const response = await apiClient.get('/schedules/import/weekly-calendar/template', {
      responseType: 'blob',
    });
    return response.data;
  },

  // Rotation Planning
  previewRotationPlanning: async (data: {
    workDays: number;
    restDays: number;
    endDate: string;
    employees: Array<{ employeeId: string; startDate: string }>;
  }) => {
    const response = await apiClient.post('/schedules/rotation/preview', data);
    return response.data as RotationPreviewResponse;
  },

  generateRotationPlanning: async (data: {
    workDays: number;
    restDays: number;
    shiftId: string;
    endDate: string;
    employees: Array<{ employeeId: string; startDate: string }>;
    overwriteExisting?: boolean;
    respectLeaves?: boolean;
    respectRecoveryDays?: boolean;
  }) => {
    const response = await apiClient.post('/schedules/rotation/generate', data);
    return response.data;
  },
};
