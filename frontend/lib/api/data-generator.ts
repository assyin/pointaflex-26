import { API_URL } from '../config';

export interface GenerateSingleDto {
  employeeId: string;
  date: string;
  scenario: 'normal' | 'late' | 'earlyLeave' | 'anomaly' | 'mission' | 'absence' | 'doubleIn' | 'missingOut' | 'longBreak';
  siteId?: string;
}

export interface GenerateBulkDto {
  startDate: string;
  endDate: string;
  employeeIds?: string[];
  distribution: {
    normal: number;
    late: number;
    earlyLeave: number;
    anomaly: number;
    mission: number;
    absence: number;
  };
  siteId?: string;
  excludeHolidays?: boolean;
  excludeWeekends?: boolean;
  generateOvertime?: boolean;
  overtimeThreshold?: number;
}

export interface CleanDataDto {
  deleteAll: boolean;
  afterDate?: string;
  employeeId?: string;
  siteId?: string;
}

export interface GenerationStats {
  totalGenerated: number;
  byType: Record<string, number>;
  byScenario: Record<string, number>;
  anomaliesDetected: number;
  holidaysIgnored?: number;
  weekendsIgnored?: number;
  leavesRespected?: number;
  overtimeGenerated?: number;
  startDate: string;
  endDate: string;
}

export class DataGeneratorAPI {
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

  static async generateSingle(dto: GenerateSingleDto) {
    return this.fetchWithAuth('/data-generator/attendance/single', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  static async generateBulk(dto: GenerateBulkDto) {
    return this.fetchWithAuth('/data-generator/attendance/bulk', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  static async cleanData(dto: CleanDataDto) {
    return this.fetchWithAuth('/data-generator/attendance/clean', {
      method: 'DELETE',
      body: JSON.stringify(dto),
    });
  }

  static async getStats(): Promise<GenerationStats> {
    return this.fetchWithAuth('/data-generator/stats');
  }
}
