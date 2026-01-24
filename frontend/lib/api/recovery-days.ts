import apiClient from './client';

export interface RecoveryDay {
  id: string;
  employeeId: string;
  startDate: string;
  endDate: string;
  days: number;
  sourceHours: number;
  conversionRate: number;
  status: 'PENDING' | 'APPROVED' | 'USED' | 'CANCELLED';
  notes?: string;
  approvedBy?: string;
  approvedAt?: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    matricule: string;
  };
  overtimeSources?: Array<{
    id: string;
    overtimeId: string;
    hoursUsed: number;
    overtime?: {
      id: string;
      date: string;
      hours: number;
      approvedHours: number;
    };
  }>;
}

export interface CumulativeBalance {
  employeeId: string;
  cumulativeHours: number;
  dailyWorkingHours: number;
  conversionRate: number;
  possibleDays: number;
  overtimeDetails: Array<{
    id: string;
    date: string;
    approvedHours: number;
    convertedToRecovery: number;
    convertedToRecoveryDays: number;
    availableHours: number;
  }>;
}

export interface ConvertFlexibleDto {
  employeeId: string;
  overtimeIds: string[];
  startDate: string;
  endDate: string;
  days: number;
  autoApprove?: boolean;
  allowPastDate?: boolean;
  notes?: string;
}

export interface ConvertFlexibleResponse extends RecoveryDay {
  conversionSummary: {
    selectedOvertimeCount: number;
    totalHoursConverted: number;
    daysGranted: number;
    autoApproved: boolean;
    isRegularization: boolean;
  };
}

// Jours Supplémentaires
export interface SupplementaryDaysCumulativeBalance {
  employeeId: string;
  cumulativeHours: number;
  possibleRecoveryDays: number;
  dailyWorkingHours: number;
  conversionRate: number;
  supplementaryDayDetails: Array<{
    id: string;
    date: string;
    type: string;
    approvedHours: number;
    convertedHours: number;
    availableHours: number;
  }>;
}

export interface ConvertSupplementaryDaysDto {
  employeeId: string;
  supplementaryDayIds: string[];
  startDate: string;
  endDate: string;
  days: number;
  autoApprove?: boolean;
  allowPastDate?: boolean;
  notes?: string;
}

export interface RecoveryDayFilters {
  employeeId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export const recoveryDaysApi = {
  getAll: async (filters?: RecoveryDayFilters) => {
    const response = await apiClient.get('/recovery-days', { params: filters });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiClient.get(`/recovery-days/${id}`);
    return response.data;
  },

  getCumulativeBalance: async (employeeId: string): Promise<CumulativeBalance> => {
    const response = await apiClient.get(`/recovery-days/cumulative-balance/${employeeId}`);
    return response.data;
  },

  convertFlexible: async (data: ConvertFlexibleDto): Promise<ConvertFlexibleResponse> => {
    const response = await apiClient.post('/recovery-days/convert-flexible', data);
    return response.data;
  },

  approve: async (id: string, comment?: string) => {
    const response = await apiClient.post(`/recovery-days/${id}/approve`, { comment });
    return response.data;
  },

  cancel: async (id: string) => {
    const response = await apiClient.post(`/recovery-days/${id}/cancel`);
    return response.data;
  },

  getEmployeeBalance: async (employeeId: string) => {
    const response = await apiClient.get(`/recovery-days/employee/${employeeId}/balance`);
    return response.data;
  },

  // Jours Supplémentaires
  getSupplementaryDaysCumulativeBalance: async (employeeId: string): Promise<SupplementaryDaysCumulativeBalance> => {
    const response = await apiClient.get(`/recovery-days/supplementary-days-balance/${employeeId}`);
    return response.data;
  },

  convertSupplementaryDaysFlexible: async (data: ConvertSupplementaryDaysDto): Promise<ConvertFlexibleResponse> => {
    const response = await apiClient.post('/recovery-days/convert-from-supplementary-days', data);
    return response.data;
  },
};
