import apiClient from './client';

// Types
export interface AnomalySummary {
  total: number;
  corrected: number;
  pending: number;
  correctionRate: number;
}

export interface AnomalyByType {
  type: string;
  count: number;
}

export interface AnomalyByEmployee {
  employeeId: string;
  employeeName: string;
  matricule: string;
  count: number;
}

export interface AnomalyByDay {
  date: string;
  count: number;
}

export interface AnomaliesDashboard {
  summary: AnomalySummary;
  byType: AnomalyByType[];
  byEmployee: AnomalyByEmployee[];
  byDay: AnomalyByDay[];
}

export interface HighAnomalyEmployee {
  employeeId: string;
  employeeName: string;
  matricule: string;
  department: string;
  anomalyCount: number;
  recommendation: string;
}

export interface AnomalyRecord {
  id: string;
  employeeId: string;
  type: 'ENTRY' | 'EXIT';
  timestamp: string;
  hasAnomaly: boolean;
  anomalyType: AnomalyType;
  anomalyNote?: string;
  isCorrected: boolean;
  correctedBy?: string;
  correctedAt?: string;
  correctionNote?: string;
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    matricule?: string;
    department?: {
      id: string;
      name: string;
    };
    site?: {
      id: string;
      name: string;
    };
  };
  schedule?: {
    id: string;
    shift?: {
      name: string;
      startTime: string;
      endTime: string;
    };
  };
}

export type AnomalyType =
  | 'LATE'
  | 'ABSENCE'
  | 'ABSENCE_PARTIAL'
  | 'MISSING_IN'
  | 'MISSING_OUT'
  | 'EARLY_LEAVE'
  | 'DOUBLE_IN'
  | 'DOUBLE_OUT'
  | 'JOUR_FERIE_TRAVAILLE'
  | 'INSUFFICIENT_REST'
  | 'UNPLANNED_PUNCH'
  | 'DEBOUNCE_BLOCKED'
  | 'PENDING_VALIDATION'
  | 'REJECTED_PUNCH';

// Types d'anomalies informatives (pas d'action requise)
export const INFORMATIVE_ANOMALY_TYPES: AnomalyType[] = ['DEBOUNCE_BLOCKED'];

export interface AnomaliesFilters {
  startDate?: string;
  endDate?: string;
  employeeId?: string;
  departmentId?: string;
  siteId?: string;
  anomalyType?: AnomalyType;
  isCorrected?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedAnomalies {
  data: AnomalyRecord[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Codes de motifs prédéfinis pour les corrections
 * Organisés par catégorie et cohérents avec les types d'anomalies
 */
export type CorrectionReasonCode =
  // Problèmes techniques
  | 'FORGOT_BADGE'
  | 'DEVICE_FAILURE'
  | 'SYSTEM_ERROR'
  | 'BADGE_MULTIPLE_PASS'
  // Déplacements/réunions
  | 'EXTERNAL_MEETING'
  | 'MISSION'
  | 'TELEWORK'
  // Retards
  | 'TRAFFIC'
  | 'PUBLIC_TRANSPORT'
  // Absences/départs
  | 'MEDICAL_APPOINTMENT'
  | 'SICK_LEAVE'
  | 'FAMILY_EMERGENCY'
  | 'PERSONAL_REASON'
  | 'AUTHORIZED_ABSENCE'
  // Planning
  | 'SCHEDULE_ERROR'
  | 'SHIFT_SWAP'
  | 'EXTRA_SHIFT'
  | 'PLANNED_OVERTIME'
  | 'EMERGENCY_WORK'
  // Généraux
  | 'MANAGER_AUTH'
  | 'OTHER';

export interface CorrectionPayload {
  correctionNote: string;
  correctedTimestamp?: string;
  reasonCode?: CorrectionReasonCode;
}

export interface BulkCorrectionPayload {
  attendances: Array<{
    attendanceId: string;
    correctedTimestamp?: string;
    correctionNote?: string;
  }>;
  generalNote: string;
  forceApproval?: boolean;
}

// Couleurs par type d'anomalie
export const ANOMALY_COLORS: Record<AnomalyType, string> = {
  LATE: '#FFC107',
  ABSENCE: '#DC3545',
  ABSENCE_PARTIAL: '#FD7E14',
  MISSING_IN: '#6F42C1',
  MISSING_OUT: '#0052CC',
  EARLY_LEAVE: '#E83E8C',
  DOUBLE_IN: '#6C757D',
  DOUBLE_OUT: '#6C757D',
  JOUR_FERIE_TRAVAILLE: '#17A2B8',
  INSUFFICIENT_REST: '#DC3545',
  UNPLANNED_PUNCH: '#20C997',
  DEBOUNCE_BLOCKED: '#6B7280', // Gris - informatif
  PENDING_VALIDATION: '#8B5CF6', // Violet - validation requise
  REJECTED_PUNCH: '#EF4444', // Rouge - pointage rejeté
};

// Labels français par type d'anomalie
export const ANOMALY_LABELS: Record<AnomalyType, string> = {
  LATE: 'Retard',
  ABSENCE: 'Absence',
  ABSENCE_PARTIAL: 'Absence partielle',
  MISSING_IN: 'Entrée manquante',
  MISSING_OUT: 'Sortie manquante',
  EARLY_LEAVE: 'Départ anticipé',
  DOUBLE_IN: 'Double entrée',
  DOUBLE_OUT: 'Double sortie',
  JOUR_FERIE_TRAVAILLE: 'Jour férié travaillé',
  INSUFFICIENT_REST: 'Repos insuffisant',
  UNPLANNED_PUNCH: 'Pointage non planifié',
  DEBOUNCE_BLOCKED: 'Anti-rebond',
  PENDING_VALIDATION: 'Validation requise',
  REJECTED_PUNCH: 'Pointage rejeté',
};

// API Client
export const anomaliesApi = {
  /**
   * Get anomalies dashboard summary with charts data
   */
  getDashboard: async (startDate: string, endDate: string): Promise<AnomaliesDashboard> => {
    const response = await apiClient.get('/attendance/dashboard/anomalies', {
      params: { startDate, endDate },
    });
    return response.data;
  },

  /**
   * Get list of anomalies with filters and pagination
   */
  getList: async (filters?: AnomaliesFilters): Promise<PaginatedAnomalies> => {
    const response = await apiClient.get('/attendance/anomalies', {
      params: filters,
    });
    return response.data;
  },

  /**
   * Get employees with high anomaly rate (alerts)
   */
  getHighAnomalyRateEmployees: async (
    threshold?: number,
    days?: number
  ): Promise<HighAnomalyEmployee[]> => {
    const response = await apiClient.get('/attendance/alerts/high-anomaly-rate', {
      params: { threshold, days },
    });
    return response.data;
  },

  /**
   * Get comprehensive anomalies analytics
   */
  getAnalytics: async (
    startDate: string,
    endDate: string,
    filters?: {
      employeeId?: string;
      departmentId?: string;
      siteId?: string;
      anomalyType?: string;
    }
  ) => {
    const response = await apiClient.get('/attendance/analytics/anomalies', {
      params: { startDate, endDate, ...filters },
    });
    return response.data;
  },

  /**
   * Correct a single anomaly
   */
  correct: async (id: string, payload: CorrectionPayload): Promise<AnomalyRecord> => {
    const response = await apiClient.patch(`/attendance/${id}/correct`, payload);
    return response.data;
  },

  /**
   * Bulk correct multiple anomalies
   */
  bulkCorrect: async (payload: BulkCorrectionPayload) => {
    const response = await apiClient.post('/attendance/bulk-correct', payload);
    return response.data;
  },

  /**
   * Export anomalies to CSV or Excel
   */
  export: async (
    format: 'csv' | 'excel',
    filters?: {
      startDate?: string;
      endDate?: string;
      employeeId?: string;
      anomalyType?: string;
    }
  ): Promise<Blob> => {
    const response = await apiClient.get('/attendance/export/anomalies', {
      params: { format, ...filters },
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * Get monthly anomalies report by department
   */
  getMonthlyReport: async (year: number, month: number) => {
    const response = await apiClient.get('/attendance/reports/monthly-anomalies', {
      params: { year, month },
    });
    return response.data;
  },
};
