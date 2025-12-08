import { API_URL } from '../config';

export interface GenerateHolidaysDto {
  generateMoroccoHolidays?: boolean;
  startYear?: number;
  endYear?: number;
  customHolidays?: Array<{
    name: string;
    date: string;
    isRecurring?: boolean;
  }>;
}

export interface HolidaysStats {
  totalHolidays: number;
  recurring: number;
  nonRecurring: number;
  byYear: { [year: string]: number };
  holidays: Array<{
    id: string;
    name: string;
    date: string;
    isRecurring: boolean;
  }>;
}

export class DataGeneratorHolidaysAPI {
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
        // Token invalide ou expiré
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

  static async generateHolidays(dto: GenerateHolidaysDto) {
    return this.fetchWithAuth('/data-generator/holidays/generate', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  static async getStats(): Promise<HolidaysStats> {
    return this.fetchWithAuth('/data-generator/holidays/stats');
  }

  static async cleanHolidays() {
    return this.fetchWithAuth('/data-generator/holidays/clean', {
      method: 'DELETE',
    });
  }
}

