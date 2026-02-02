import apiClient from './client';

export interface Attendance {
  id: string;
  employeeId: string;
  type: 'ENTRY' | 'EXIT' | 'BREAK_START' | 'BREAK_END' | 'MISSION_START' | 'MISSION_END';
  timestamp: string;
  source: 'BIOMETRIC' | 'RFID' | 'FACIAL' | 'QR_CODE' | 'PIN' | 'MOBILE_GPS' | 'MANUAL' | 'IMPORT';
  deviceId?: string;
  latitude?: number;
  longitude?: number;
  status: 'VALID' | 'PENDING_CORRECTION' | 'CORRECTED';
  hasAnomaly?: boolean;
  anomalyType?: string;
  anomalyNote?: string;
  isCorrected?: boolean;
  correctedBy?: string;
  correctedAt?: string;
  correctionNote?: string;
  hoursWorked?: number;
  lateMinutes?: number;
  earlyLeaveMinutes?: number;
  overtimeMinutes?: number;
  needsApproval?: boolean;
  approvalStatus?: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  approvedBy?: string;
  approvedAt?: string;
  notes?: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
  employee?: any;
}

export interface CreateAttendanceDto {
  employeeId: string;
  type: 'IN' | 'OUT' | 'BREAK_START' | 'BREAK_END' | 'MISSION_START' | 'MISSION_END';
  timestamp: string;
  method: 'FINGERPRINT' | 'FACE_RECOGNITION' | 'RFID_BADGE' | 'QR_CODE' | 'PIN_CODE' | 'MOBILE_GPS' | 'MANUAL';
  siteId?: string;
  deviceId?: string;
  latitude?: number;
  longitude?: number;
  rawData?: any;
}

export interface AttendanceFilters {
  employeeId?: string;
  siteId?: string;
  startDate?: string;
  endDate?: string;
  hasAnomaly?: boolean;
  type?: string;
  source?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
  departmentId?: string;
  anomalyType?: string;
  shiftId?: string;
}

export const attendanceApi = {
  getAll: async (filters?: AttendanceFilters) => {
    const response = await apiClient.get('/attendance', { params: filters });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiClient.get(`/attendance/${id}`);
    return response.data;
  },

  getAnomalies: async (date?: string) => {
    const response = await apiClient.get('/attendance/anomalies', {
      params: date ? { date } : undefined,
    });
    return response.data;
  },

  create: async (data: CreateAttendanceDto) => {
    const response = await apiClient.post('/attendance', data);
    return response.data;
  },

  update: async (id: string, data: Partial<CreateAttendanceDto>) => {
    const response = await apiClient.patch(`/attendance/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/attendance/${id}`);
    return response.data;
  },

  correct: async (id: string, data: {
    correctionNote: string;
    correctedBy: string;
    correctedTimestamp?: string;
    forceApproval?: boolean;
  }) => {
    const response = await apiClient.patch(`/attendance/${id}/correct`, data);
    return response.data;
  },

  approveCorrection: async (id: string, data: { approved: boolean; comment?: string }) => {
    const response = await apiClient.patch(`/attendance/${id}/approve-correction`, data);
    return response.data;
  },

  getPresenceRate: async (employeeId: string, startDate?: string, endDate?: string) => {
    const response = await apiClient.get('/attendance/stats/presence-rate', {
      params: { employeeId, startDate, endDate },
    });
    return response.data;
  },

  getPunctualityRate: async (employeeId: string, startDate?: string, endDate?: string) => {
    const response = await apiClient.get('/attendance/stats/punctuality-rate', {
      params: { employeeId, startDate, endDate },
    });
    return response.data;
  },

  getTrends: async (employeeId: string, startDate?: string, endDate?: string) => {
    const response = await apiClient.get('/attendance/stats/trends', {
      params: { employeeId, startDate, endDate },
    });
    return response.data;
  },

  getRecurringAnomalies: async (employeeId: string, days?: number) => {
    const response = await apiClient.get('/attendance/stats/recurring-anomalies', {
      params: { employeeId, days },
    });
    return response.data;
  },

  getCorrectionHistory: async (id: string) => {
    const response = await apiClient.get(`/attendance/${id}/correction-history`);
    return response.data;
  },

  bulkCorrect: async (data: {
    attendances: Array<{
      attendanceId: string;
      correctedTimestamp?: string;
      correctionNote?: string;
    }>;
    generalNote: string;
    forceApproval?: boolean;
  }) => {
    const response = await apiClient.post('/attendance/bulk-correct', data);
    return response.data;
  },

  exportAnomalies: async (format: 'csv' | 'excel', filters?: {
    startDate?: string;
    endDate?: string;
    employeeId?: string;
    anomalyType?: string;
  }) => {
    const response = await apiClient.get(`/attendance/export/anomalies`, {
      params: { format, ...filters },
      responseType: format === 'csv' ? 'blob' : 'json',
    });
    return response.data;
  },

  getAnomaliesDashboard: async (startDate: string, endDate: string) => {
    const response = await apiClient.get('/attendance/dashboard/anomalies', {
      params: { startDate, endDate },
    });
    return response.data;
  },

  export: async (format: 'csv' | 'excel', filters?: AttendanceFilters) => {
    const response = await apiClient.get(`/attendance/export/${format}`, {
      params: filters,
      responseType: 'blob',
    });
    return response.data;
  },
};
