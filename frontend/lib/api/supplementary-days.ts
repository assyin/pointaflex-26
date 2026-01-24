import apiClient from './client';

export type SupplementaryDayType = 'WEEKEND_SATURDAY' | 'WEEKEND_SUNDAY' | 'HOLIDAY';
export type SupplementaryDayStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID' | 'RECOVERED';

export interface SupplementaryDay {
  id: string;
  employeeId: string;
  date: string;
  hours: number;
  approvedHours?: number;
  type: SupplementaryDayType;
  source: string;
  checkIn?: string;
  checkOut?: string;
  status: SupplementaryDayStatus;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  convertedToRecovery: boolean;
  convertedToRecoveryDays: boolean;
  notes?: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    matricule: string;
    site?: { id: string; name: string };
    department?: { id: string; name: string };
  };
}

export interface CreateSupplementaryDayDto {
  employeeId: string;
  date: string;
  hours: number;
  type: SupplementaryDayType;
  checkIn?: string;
  checkOut?: string;
  source?: string;
  notes?: string;
}

export interface SupplementaryDayFilters {
  employeeId?: string;
  status?: SupplementaryDayStatus;
  type?: SupplementaryDayType;
  startDate?: string;
  endDate?: string;
  siteId?: string;
  departmentId?: string;
  page?: number;
  limit?: number;
}

export const supplementaryDaysApi = {
  /**
   * Récupérer tous les jours supplémentaires
   */
  getAll: async (filters?: SupplementaryDayFilters) => {
    const response = await apiClient.get('/supplementary-days', { params: filters });
    return response.data;
  },

  /**
   * Récupérer un jour supplémentaire par ID
   */
  getById: async (id: string) => {
    const response = await apiClient.get(`/supplementary-days/${id}`);
    return response.data;
  },

  /**
   * Créer un jour supplémentaire
   */
  create: async (data: CreateSupplementaryDayDto) => {
    const response = await apiClient.post('/supplementary-days', data);
    return response.data;
  },

  /**
   * Approuver un jour supplémentaire
   */
  approve: async (id: string, approvedHours?: number) => {
    const response = await apiClient.post(`/supplementary-days/${id}/approve`, {
      status: 'APPROVED',
      ...(approvedHours !== undefined && { approvedHours }),
    });
    return response.data;
  },

  /**
   * Rejeter un jour supplémentaire
   */
  reject: async (id: string, reason: string) => {
    const response = await apiClient.post(`/supplementary-days/${id}/approve`, {
      status: 'REJECTED',
      rejectionReason: reason,
    });
    return response.data;
  },

  /**
   * Convertir en récupération
   */
  convertToRecovery: async (id: string) => {
    const response = await apiClient.post(`/supplementary-days/${id}/convert-to-recovery`);
    return response.data;
  },

  /**
   * Supprimer un jour supplémentaire
   */
  delete: async (id: string) => {
    const response = await apiClient.delete(`/supplementary-days/${id}`);
    return response.data;
  },

  /**
   * Statistiques du dashboard
   */
  getDashboardStats: async (filters?: {
    startDate?: string;
    endDate?: string;
    siteId?: string;
    departmentId?: string;
  }) => {
    const response = await apiClient.get('/supplementary-days/dashboard/stats', { params: filters });
    return response.data;
  },

  // ============================================
  // ACTIONS DE RECTIFICATION
  // ============================================

  /**
   * Annuler l'approbation (APPROVED → PENDING)
   */
  revokeApproval: async (id: string, reason?: string) => {
    const response = await apiClient.post(`/supplementary-days/${id}/revoke-approval`, { reason });
    return response.data;
  },

  /**
   * Annuler le rejet (REJECTED → PENDING)
   */
  revokeRejection: async (id: string, reason?: string) => {
    const response = await apiClient.post(`/supplementary-days/${id}/revoke-rejection`, { reason });
    return response.data;
  },
};
