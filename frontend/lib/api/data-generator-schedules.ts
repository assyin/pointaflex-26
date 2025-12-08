import { API_URL } from '../config';

export interface GenerateSchedulesDto {
  startDate: string;
  endDate: string;
  employeeIds?: string[];
  shiftIds?: string[];
  excludeWeekends?: boolean;
  excludeHolidays?: boolean;
  workDaysPercentage?: number;
  shiftDistribution?: Record<string, number>;
  onlyWorkdays?: boolean;
}

export interface SchedulesStats {
  totalSchedules: number;
  byShift: Array<{
    shiftId: string;
    shiftName: string;
    shiftCode: string;
    count: number;
  }>;
  employeesWithSchedules: number;
  averageSchedulesPerEmployee: number;
}

export class DataGeneratorSchedulesAPI {
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
        throw new Error('Unauthorized');
      }
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  static async generateSchedules(dto: GenerateSchedulesDto) {
    return this.fetchWithAuth('/data-generator/schedules/generate', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  static async getStats(): Promise<SchedulesStats> {
    return this.fetchWithAuth('/data-generator/schedules/stats');
  }

  static async cleanSchedules(startDate?: string, endDate?: string) {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    return this.fetchWithAuth(`/data-generator/schedules/clean${params.toString() ? '?' + params.toString() : ''}`, {
      method: 'DELETE',
    });
  }
}

