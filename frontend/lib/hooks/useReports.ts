import { useQuery, useMutation } from '@tanstack/react-query';
import { reportsApi, type ReportFilters } from '../api/reports';
import { toast } from 'sonner';

// Fetch dashboard stats
export function useDashboardStats(filters?: { startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: ['dashboardStats', filters],
    queryFn: () => reportsApi.getDashboardStats(filters),
    staleTime: 60000, // 1 minute
  });
}

// Fetch attendance report
export function useAttendanceReport(filters: ReportFilters) {
  return useQuery({
    queryKey: ['attendanceReport', filters],
    queryFn: () => reportsApi.getAttendanceReport(filters),
    enabled: !!filters.startDate && !!filters.endDate,
  });
}

// Fetch absences report
export function useAbsencesReport(filters: ReportFilters) {
  return useQuery({
    queryKey: ['absencesReport', filters],
    queryFn: () => reportsApi.getAbsencesReport(filters),
    enabled: !!filters.startDate && !!filters.endDate,
  });
}

// Fetch overtime report
export function useOvertimeReport(filters: ReportFilters) {
  return useQuery({
    queryKey: ['overtimeReport', filters],
    queryFn: () => reportsApi.getOvertimeReport(filters),
    enabled: !!filters.startDate && !!filters.endDate,
  });
}

// Fetch planning report
export function usePlanningReport(filters: ReportFilters) {
  return useQuery({
    queryKey: ['planningReport', filters],
    queryFn: () => reportsApi.getPlanningReport(filters),
    enabled: !!filters.startDate && !!filters.endDate,
  });
}

// Fetch payroll report
export function usePayrollReport(filters: ReportFilters) {
  return useQuery({
    queryKey: ['payrollReport', filters],
    queryFn: () => reportsApi.getPayrollReport(filters),
    enabled: !!filters.startDate && !!filters.endDate,
  });
}

// Fetch report history
export function useReportHistory() {
  return useQuery({
    queryKey: ['reportHistory'],
    queryFn: () => reportsApi.getReportHistory(),
    staleTime: 30000, // 30 seconds
  });
}

// Export report
export function useExportReport() {
  return useMutation({
    mutationFn: async ({
      reportType,
      filters,
      onProgress,
    }: {
      reportType: string;
      filters: ReportFilters;
      onProgress?: (progress: number) => void;
    }) => {
      // Simuler la progression (dans un vrai cas, utiliser axios avec onUploadProgress/onDownloadProgress)
      if (onProgress) {
        onProgress(10);
        await new Promise(resolve => setTimeout(resolve, 200));
        onProgress(30);
        await new Promise(resolve => setTimeout(resolve, 200));
        onProgress(60);
        await new Promise(resolve => setTimeout(resolve, 200));
        onProgress(90);
      }

      const blob = await reportsApi.exportReport(reportType, filters);

      if (onProgress) {
        onProgress(100);
      }

      // Determine file extension based on format
      const extension = filters.format === 'PDF' ? 'pdf' : filters.format === 'EXCEL' ? 'xlsx' : 'csv';

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `report_${reportType}_${new Date().toISOString().split('T')[0]}.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      return blob;
    },
    onSuccess: (_, variables) => {
      toast.success(`Rapport ${variables.reportType} exporté avec succès`);
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Erreur lors de l\'export du rapport'
      );
    },
  });
}
