import apiClient from './client';

export interface Team {
  id: string;
  name: string;
  code: string;
  description?: string;
  rotationEnabled: boolean;
  rotationCycleDays?: number;
  tenantId: string;
  managerId?: string;
  createdAt: string;
  updatedAt: string;
  manager?: {
    id: string;
    firstName: string;
    lastName: string;
    matricule: string;
  };
  employees?: any[];
  _count?: {
    employees: number;
    schedules: number;
  };
}

export interface CreateTeamDto {
  name: string;
  code: string;
  description?: string;
  rotationEnabled: boolean;
  rotationCycleDays?: number;
  managerId?: string;
}

export const teamsApi = {
  getAll: async (filters?: any) => {
    const response = await apiClient.get('/teams', { params: filters });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiClient.get(`/teams/${id}`);
    return response.data;
  },

  create: async (data: CreateTeamDto) => {
    const response = await apiClient.post('/teams', data);
    return response.data;
  },

  update: async (id: string, data: Partial<CreateTeamDto>) => {
    const response = await apiClient.patch(`/teams/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/teams/${id}`);
    return response.data;
  },

  addMember: async (teamId: string, employeeId: string) => {
    const response = await apiClient.post(`/teams/${teamId}/members`, { employeeId });
    return response.data;
  },

  removeMember: async (teamId: string, employeeId: string) => {
    const response = await apiClient.delete(`/teams/${teamId}/members/${employeeId}`);
    return response.data;
  },

  addMembersBulk: async (teamId: string, employeeIds: string[]) => {
    const response = await apiClient.post(`/teams/${teamId}/members/bulk`, { employeeIds });
    return response.data;
  },

  removeMembersBulk: async (teamId: string, employeeIds: string[]) => {
    const response = await apiClient.delete(`/teams/${teamId}/members/bulk`, { data: { employeeIds } });
    return response.data;
  },

  getStats: async (teamId: string) => {
    const response = await apiClient.get(`/teams/${teamId}/stats`);
    return response.data;
  },
};
