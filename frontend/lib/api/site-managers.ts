import apiClient from './client';

export interface SiteManager {
  id: string;
  tenantId: string;
  siteId: string;
  managerId: string;
  departmentId: string;
  createdAt: string;
  updatedAt: string;
  site?: {
    id: string;
    name: string;
    code?: string;
    city?: string;
  };
  department?: {
    id: string;
    name: string;
    code?: string;
  };
  manager?: {
    id: string;
    firstName: string;
    lastName: string;
    matricule: string;
    email?: string;
    phone?: string;
  };
}

export interface CreateSiteManagerDto {
  siteId: string;
  managerId: string;
  departmentId: string;
}

export interface UpdateSiteManagerDto {
  managerId?: string;
}

export const siteManagersApi = {
  /**
   * Récupérer tous les managers régionaux
   */
  getAll: async (filters?: { siteId?: string; departmentId?: string }): Promise<SiteManager[]> => {
    const params = new URLSearchParams();
    if (filters?.siteId) params.append('siteId', filters.siteId);
    if (filters?.departmentId) params.append('departmentId', filters.departmentId);
    
    const queryString = params.toString();
    const url = queryString ? `/site-managers?${queryString}` : '/site-managers';
    
    const response = await apiClient.get<SiteManager[]>(url);
    return response.data;
  },

  /**
   * Récupérer un manager régional par ID
   */
  getById: async (id: string): Promise<SiteManager> => {
    const response = await apiClient.get<SiteManager>(`/site-managers/${id}`);
    return response.data;
  },

  /**
   * Récupérer les managers régionaux d'un site
   */
  getBySite: async (siteId: string): Promise<SiteManager[]> => {
    const response = await apiClient.get<SiteManager[]>(`/site-managers/by-site/${siteId}`);
    return response.data;
  },

  /**
   * Récupérer les sites gérés par un manager
   */
  getByManager: async (managerId: string): Promise<SiteManager[]> => {
    const response = await apiClient.get<SiteManager[]>(`/site-managers/by-manager/${managerId}`);
    return response.data;
  },

  /**
   * Créer un nouveau manager régional
   */
  create: async (data: CreateSiteManagerDto): Promise<SiteManager> => {
    const response = await apiClient.post<SiteManager>('/site-managers', data);
    return response.data;
  },

  /**
   * Mettre à jour un manager régional
   */
  update: async (id: string, data: UpdateSiteManagerDto): Promise<SiteManager> => {
    const response = await apiClient.patch<SiteManager>(`/site-managers/${id}`, data);
    return response.data;
  },

  /**
   * Supprimer un manager régional
   */
  delete: async (id: string): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/site-managers/${id}`);
    return response.data;
  },
};
