import apiClient from './client';

export interface Shift {
  id: string;
  name: string;
  type: 'MORNING' | 'AFTERNOON' | 'NIGHT' | 'CUSTOM';
  startTime: string;
  endTime: string;
  breakStartTime?: string; // Heure de début de pause (ex: "12:00")
  breakDuration?: number;
  color?: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateShiftDto {
  name: string;
  code: string;
  startTime: string;
  endTime: string;
  breakStartTime?: string; // Heure de début de pause (ex: "12:00")
  breakDuration?: number;
  isNightShift?: boolean;
  color?: string;
}

export const shiftsApi = {
  getAll: async () => {
    const response = await apiClient.get('/shifts');
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiClient.get(`/shifts/${id}`);
    return response.data;
  },

  create: async (data: CreateShiftDto) => {
    const response = await apiClient.post('/shifts', data);
    return response.data;
  },

  update: async (id: string, data: Partial<CreateShiftDto>) => {
    const response = await apiClient.patch(`/shifts/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/shifts/${id}`);
    return response.data;
  },
};
