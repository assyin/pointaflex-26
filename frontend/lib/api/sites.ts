import apiClient from './client';

export interface Site {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  address?: string;
  city?: string;
  phone?: string;
  workingDays?: string[];
  timezone?: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    employees: number;
    devices: number;
  };
}

export interface CreateSiteDto {
  code: string;
  name: string;
  address?: string;
  city?: string;
  phone?: string;
  workingDays?: string[];
  timezone?: string;
}

export interface UpdateSiteDto {
  code?: string;
  name?: string;
  address?: string;
  city?: string;
  phone?: string;
  workingDays?: string[];
  timezone?: string;
}

export const SitesAPI = {
  /**
   * Récupérer tous les sites
   */
  getAll: async (): Promise<{ data: Site[]; total: number }> => {
    const response = await apiClient.get('/sites');
    return response.data;
  },

  /**
   * Récupérer un site par ID
   */
  getById: async (id: string): Promise<Site> => {
    const response = await apiClient.get(`/sites/${id}`);
    return response.data;
  },

  /**
   * Créer un nouveau site
   */
  create: async (data: CreateSiteDto): Promise<Site> => {
    const response = await apiClient.post('/sites', data);
    return response.data;
  },

  /**
   * Mettre à jour un site
   */
  update: async (id: string, data: UpdateSiteDto): Promise<Site> => {
    const response = await apiClient.patch(`/sites/${id}`, data);
    return response.data;
  },

  /**
   * Supprimer un site
   */
  delete: async (id: string): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/sites/${id}`);
    return response.data;
  },
};
