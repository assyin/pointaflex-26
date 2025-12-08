import { api } from './client';

export interface Position {
  id: string;
  createdAt: string;
  updatedAt: string;
  tenantId: string;
  name: string;
  code?: string;
  category?: string;
  description?: string;
  _count?: {
    employees: number;
  };
  employees?: Array<{
    id: string;
    firstName: string;
    lastName: string;
    matricule: string;
    email?: string;
    department?: {
      id: string;
      name: string;
    };
  }>;
}

export interface CreatePositionDto {
  name: string;
  code?: string;
  category?: string;
  description?: string;
}

export interface UpdatePositionDto {
  name?: string;
  code?: string;
  category?: string;
  description?: string;
}

export interface PositionStats {
  totalPositions: number;
  totalEmployees: number;
  employeesWithoutPosition: number;
  categories: Array<{
    category: string;
    count: number;
    employeeCount: number;
  }>;
  positions: Array<{
    id: string;
    name: string;
    code: string;
    category?: string;
    employeeCount: number;
    percentage: string;
  }>;
}

export const positionsApi = {
  getAll: async (category?: string) => {
    const params = category ? { category } : {};
    const response = await api.get<Position[]>('/positions', { params });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get<Position>(`/positions/${id}`);
    return response.data;
  },

  create: async (data: CreatePositionDto) => {
    const response = await api.post<Position>('/positions', data);
    return response.data;
  },

  update: async (id: string, data: UpdatePositionDto) => {
    const response = await api.patch<Position>(`/positions/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete(`/positions/${id}`);
    return response.data;
  },

  getStats: async () => {
    const response = await api.get<PositionStats>('/positions/stats');
    return response.data;
  },

  getCategories: async () => {
    const response = await api.get<string[]>('/positions/categories');
    return response.data;
  },
};
