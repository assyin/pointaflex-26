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
  hireDate: string;
  position?: string;
  departmentId?: string;
  siteId?: string;
  shiftId?: string;
  teamId?: string;
}

export interface UpdateEmployeeDto extends Partial<CreateEmployeeDto> {
  status?: 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE' | 'TERMINATED';
}

export interface EmployeeFilters {
  search?: string;
  status?: string;
  departmentId?: string;
  siteId?: string;
  teamId?: string;
  page?: number;
  limit?: number;
}

export const employeesApi = {
  getAll: async (filters?: EmployeeFilters) => {
    const response = await apiClient.get('/employees', { params: filters });
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
};
