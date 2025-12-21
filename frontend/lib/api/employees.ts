import apiClient from './client';

export interface Employee {
  id: string;
  matricule: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  photo?: string;
  dateOfBirth?: string;
  hireDate: string;
  position?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE' | 'TERMINATED';
  tenantId: string;
  userId?: string;
  departmentId?: string;
  siteId?: string;
  shiftId?: string;
  teamId?: string;
  createdAt: string;
  updatedAt: string;
  user?: any;
  department?: any;
  site?: any;
  shift?: any;
  team?: any;
}

export interface CreateEmployeeDto {
  matricule: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  photo?: string;
  dateOfBirth?: string;
  civilite?: string;
  address?: string;
  hireDate: string;
  position?: string;
  positionId?: string;
  departmentId?: string;
  siteId?: string;
  currentShiftId?: string;
  shiftId?: string; // Alias pour compatibilité
  teamId?: string;
}

export interface UpdateEmployeeDto extends Partial<CreateEmployeeDto> {
  status?: 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE' | 'TERMINATED';
  isActive?: boolean; // Statut actif/inactif
}

export interface EmployeeFilters {
  search?: string;
  status?: string; // Pour compatibilité frontend
  isActive?: boolean; // Correspond au backend
  departmentId?: string;
  siteId?: string;
  teamId?: string;
  page?: number;
  limit?: number;
}

export const employeesApi = {
  getAll: async (filters?: EmployeeFilters) => {
    // Préparer les paramètres pour l'API
    const params: any = {};
    
    if (filters?.search) params.search = filters.search;
    if (filters?.siteId) params.siteId = filters.siteId;
    if (filters?.departmentId) params.departmentId = filters.departmentId;
    if (filters?.teamId) params.teamId = filters.teamId;
    
    // Le backend attend isActive comme string 'true' ou 'false'
    if (filters?.isActive !== undefined) {
      params.isActive = filters.isActive.toString();
    }
    
    const response = await apiClient.get('/employees', { params });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiClient.get(`/employees/${id}`);
    return response.data;
  },

  create: async (data: CreateEmployeeDto) => {
    const response = await apiClient.post('/employees', data);
    return response.data;
  },

  update: async (id: string, data: UpdateEmployeeDto) => {
    const response = await apiClient.patch(`/employees/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/employees/${id}`);
    return response.data;
  },

  deleteAll: async () => {
    const response = await apiClient.delete('/employees/all');
    return response.data;
  },

  bulkAssignToSite: async (siteId: string, employeeIds?: string[]) => {
    const response = await apiClient.post('/employees/bulk-assign-site', {
      siteId,
      employeeIds,
    });
    return response.data;
  },

  createUserAccount: async (id: string, data?: { userEmail?: string }) => {
    const response = await apiClient.post(`/employees/${id}/create-account`, data || {});
    return response.data;
  },

  getCredentials: async (id: string) => {
    const response = await apiClient.get(`/employees/${id}/credentials`);
    return response.data;
  },

  deleteUserAccount: async (id: string) => {
    const response = await apiClient.delete(`/employees/${id}/user-account`);
    return response.data;
  },
};
