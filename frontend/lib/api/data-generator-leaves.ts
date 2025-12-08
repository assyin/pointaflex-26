import { API_URL } from '../config';

export interface GenerateLeavesDto {
  percentage?: number;
  averageDaysPerEmployee?: number;
  leaveTypeIds?: string[];
  startDate: string;
  endDate: string;
  autoApprove?: boolean;
}

export interface LeavesStats {
  totalLeaveTypes: number;
  totalLeaves: number;
  totalDays: number;
  byStatus: { [status: string]: number };
  leaveTypes: Array<{
    id: string;
    name: string;
    code: string;
    isPaid: boolean;
    leavesCount: number;
  }>;
}

export class DataGeneratorLeavesAPI {
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

  static async generateLeaves(dto: GenerateLeavesDto) {
    return this.fetchWithAuth('/data-generator/leaves/generate', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  static async getStats(): Promise<LeavesStats> {
    return this.fetchWithAuth('/data-generator/leaves/stats');
  }
}

