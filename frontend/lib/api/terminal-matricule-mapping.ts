import apiClient from './client';

export interface TerminalMatriculeMapping {
  id: string;
  tenantId: string;
  employeeId: string;
  terminalMatricule: string;
  officialMatricule: string;
  deviceId?: string;
  isActive: boolean;
  assignedAt: string;
  createdAt: string;
  updatedAt: string;
  employee?: {
    id: string;
    matricule: string;
    firstName: string;
    lastName: string;
    email?: string;
    hireDate: string;
  };
  daysSinceAssignment?: number;
}

export interface ExpiringMatriculeMapping extends TerminalMatriculeMapping {
  daysSinceAssignment: number;
}

export const terminalMatriculeMappingApi = {
  /**
   * Récupérer les employés avec matricule temporaire expiré ou expirant
   */
  getExpiringMatricules: async (): Promise<ExpiringMatriculeMapping[]> => {
    const response = await apiClient.get('/terminal-matricule-mapping/expiring');
    return response.data;
  },

  /**
   * Récupérer TOUS les employés avec matricule temporaire (même non expirés)
   */
  getAllTemporaryMatricules: async (): Promise<ExpiringMatriculeMapping[]> => {
    const response = await apiClient.get('/terminal-matricule-mapping/all');
    return response.data;
  },

  /**
   * Migrer un employé vers un matricule officiel
   */
  migrateToOfficialMatricule: async (
    employeeId: string,
    officialMatricule: string,
  ) => {
    const response = await apiClient.patch(
      `/terminal-matricule-mapping/migrate/${employeeId}`,
      { officialMatricule },
    );
    return response.data;
  },

  /**
   * Récupérer les mappings d'un employé
   */
  getEmployeeMappings: async (
    employeeId: string,
  ): Promise<TerminalMatriculeMapping[]> => {
    const response = await apiClient.get(
      `/terminal-matricule-mapping/employee/${employeeId}`,
    );
    return response.data;
  },

  /**
   * Récupérer l'historique complet des mappings avec filtres et pagination
   */
  getMappingHistory: async (filters?: {
    employeeId?: string;
    terminalMatricule?: string;
    officialMatricule?: string;
    startDate?: string;
    endDate?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{
    data: ExpiringMatriculeMapping[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> => {
    const params = new URLSearchParams();
    if (filters?.employeeId) params.append('employeeId', filters.employeeId);
    if (filters?.terminalMatricule)
      params.append('terminalMatricule', filters.terminalMatricule);
    if (filters?.officialMatricule)
      params.append('officialMatricule', filters.officialMatricule);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.isActive !== undefined)
      params.append('isActive', String(filters.isActive));
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.limit) params.append('limit', String(filters.limit));

    const response = await apiClient.get(
      `/terminal-matricule-mapping/history?${params.toString()}`,
    );
    return response.data;
  },
};

