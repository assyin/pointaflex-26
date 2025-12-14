import { API_URL } from '../config';

export interface UserCredentials {
  email: string;
  password: string;
  role: string;
  firstName?: string;
  lastName?: string;
}

export interface GenerationStats {
  totalEntities: number;
  entitiesByType: Record<string, number>;
  duration: number;
  errors: Array<{
    step: string;
    error: string;
    timestamp: Date;
  }>;
  warnings: Array<{
    step: string;
    warning: string;
    timestamp: Date;
  }>;
  steps: Array<{
    name: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
    duration?: number;
    entitiesGenerated?: number;
    error?: string;
  }>;
  createdUsers?: UserCredentials[];
}

export interface CleanupResult {
  deleted: Record<string, number>;
  total: number;
}

export class DataGeneratorAllAPI {
  private static async fetchWithAuth(url: string, options: RequestInit = {}) {
    const token = localStorage.getItem('accessToken');

    const response = await fetch(`${API_URL}${url}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
          localStorage.clear();
          window.location.href = '/login';
        }
        throw new Error('Unauthorized - Veuillez vous reconnecter');
      }
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Génère toutes les données selon la configuration
   */
  static async generateAll(config: any): Promise<GenerationStats> {
    return this.fetchWithAuth('/data-generator/all/generate', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  /**
   * Nettoie toutes les données générées
   */
  static async cleanupAll(): Promise<CleanupResult> {
    return this.fetchWithAuth('/data-generator/all/cleanup', {
      method: 'POST',
    });
  }
}

export const dataGeneratorAllAPI = DataGeneratorAllAPI;

