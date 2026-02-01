import apiClient from './client';

export interface Department {
  id: string;
  name: string;
  code?: string;
  description?: string;
  managerId?: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    employees: number;
  };
  employees?: Array<{
    id: string;
    firstName: string;
    lastName: string;
    matricule: string;
    email?: string;
    position?: string;
  }>;
  manager?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface Site {
  id: string;
  code: string;
  name: string;
  address?: string;
  city?: string;
  phone?: string;
  workingDays?: string[];
  timezone?: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    employees: number;
    devices: number;
  };
}

export interface DepartmentStats {
  totalDepartments: number;
  totalEmployees: number;
  employeesWithoutDepartment: number;
  departments: Array<{
    id: string;
    name: string;
    code?: string;
    employeeCount: number;
    percentage: string;
  }>;
}

export interface DepartmentSettingsData {
  wrongTypeDetectionEnabled: boolean | null;
  wrongTypeAutoCorrect: boolean | null;
  wrongTypeShiftMarginMinutes: number | null;
}

export interface DepartmentSettingsResponse {
  departmentId: string;
  departmentName: string;
  settings: DepartmentSettingsData;
  tenantDefaults: {
    enableWrongTypeDetection: boolean;
    wrongTypeAutoCorrect: boolean;
    wrongTypeShiftMarginMinutes: number;
  };
}

export interface CreateDepartmentDto {
  name: string;
  code?: string;
  description?: string;
  managerId?: string;
}

export interface UpdateDepartmentDto {
  name?: string;
  code?: string;
  description?: string;
  managerId?: string;
}

export const departmentsApi = {
  getAll: async () => {
    const response = await apiClient.get<Department[]>('/departments');
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiClient.get<Department>(`/departments/${id}`);
    return response.data;
  },

  create: async (data: CreateDepartmentDto) => {
    const response = await apiClient.post<Department>('/departments', data);
    return response.data;
  },

  update: async (id: string, data: UpdateDepartmentDto) => {
    const response = await apiClient.patch<Department>(`/departments/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/departments/${id}`);
    return response.data;
  },

  getStats: async () => {
    const response = await apiClient.get<DepartmentStats>('/departments/stats');
    return response.data;
  },

  getSettings: async (id: string): Promise<DepartmentSettingsResponse> => {
    const response = await apiClient.get(`/departments/${id}/settings`);
    return response.data;
  },

  updateSettings: async (id: string, data: Partial<DepartmentSettingsData>) => {
    const response = await apiClient.patch(`/departments/${id}/settings`, data);
    return response.data;
  },
};

export const sitesApi = {
  getAll: async () => {
    const response = await apiClient.get('/sites');
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiClient.get(`/sites/${id}`);
    return response.data;
  },

  create: async (data: {
    code: string;
    name: string;
    address?: string;
    city?: string;
    phone?: string;
    workingDays?: string[];
    timezone?: string;
  }) => {
    const response = await apiClient.post('/sites', data);
    return response.data;
  },

  update: async (id: string, data: {
    code?: string;
    name?: string;
    address?: string;
    city?: string;
    phone?: string;
    workingDays?: string[];
    timezone?: string;
  }) => {
    const response = await apiClient.patch(`/sites/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/sites/${id}`);
    return response.data;
  },
};
