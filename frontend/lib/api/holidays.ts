import apiClient from './client';

export enum HolidayType {
  NATIONAL = 'NATIONAL',
  COMPANY = 'COMPANY',
  RELIGIOUS = 'RELIGIOUS',
}

export interface Holiday {
  id: string;
  tenantId: string;
  name: string;
  date: string;
  type: HolidayType;
  isRecurring: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateHolidayDto {
  name: string;
  date: string;
  type: HolidayType;
  isRecurring?: boolean;
}

export interface UpdateHolidayDto {
  name?: string;
  date?: string;
  type?: HolidayType;
  isRecurring?: boolean;
}

export interface ImportHolidaysResult {
  statusCode: number;
  message: string;
  data: {
    success: number;
    skipped: number;
    errors: string[];
    total: number;
  };
}

export const HolidaysAPI = {
  /**
   * Récupérer tous les jours fériés
   */
  getAll: async (year?: number): Promise<{ data: Holiday[]; total: number }> => {
    const params = year ? { year: year.toString() } : {};
    const response = await apiClient.get('/holidays', { params });
    return response.data;
  },

  /**
   * Récupérer un jour férié par ID
   */
  getById: async (id: string): Promise<Holiday> => {
    const response = await apiClient.get(`/holidays/${id}`);
    return response.data;
  },

  /**
   * Créer un nouveau jour férié
   */
  create: async (data: CreateHolidayDto): Promise<Holiday> => {
    const response = await apiClient.post('/holidays', data);
    return response.data;
  },

  /**
   * Mettre à jour un jour férié
   */
  update: async (id: string, data: UpdateHolidayDto): Promise<Holiday> => {
    const response = await apiClient.patch(`/holidays/${id}`, data);
    return response.data;
  },

  /**
   * Supprimer un jour férié
   */
  delete: async (id: string): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/holidays/${id}`);
    return response.data;
  },

  /**
   * Importer des jours fériés depuis un fichier CSV/Excel
   */
  importFromFile: async (file: File): Promise<ImportHolidaysResult> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post('/holidays/import-csv', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};
