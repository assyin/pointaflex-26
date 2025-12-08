import { API_URL } from '../config';

export interface GenerateShiftsDto {
  createDefaultShifts?: boolean;
  distribution?: { [shiftId: string]: number };
  createSchedules?: boolean;
  scheduleStartDate?: string;
  scheduleEndDate?: string;
}

export interface ShiftsStats {
  totalShifts: number;
  totalEmployees: number;
  employeesWithShift: number;
  employeesWithoutShift: number;
  shifts: Array<{
    id: string;
    name: string;
    code: string;
    startTime: string;
    endTime: string;
    employeesCount: number;
    schedulesCount: number;
  }>;
}

export class DataGeneratorShiftsAPI {
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

  static async generateShifts(dto: GenerateShiftsDto) {
    return this.fetchWithAuth('/data-generator/shifts/generate', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  static async getStats(): Promise<ShiftsStats> {
    return this.fetchWithAuth('/data-generator/shifts/stats');
  }
}

