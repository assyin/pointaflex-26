import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attendanceApi, type Attendance, type CreateAttendanceDto, type AttendanceFilters } from '../api/attendance';
import { toast } from 'sonner';

// Fetch attendance records with filters
export function useAttendance(filters?: AttendanceFilters) {
  return useQuery({
    queryKey: ['attendance', filters],
    queryFn: () => attendanceApi.getAll(filters),
    staleTime: 60000, // 60 seconds
    refetchInterval: 60000, // Auto-refresh every 60 seconds (optimisé pour réduire la charge serveur)
    refetchIntervalInBackground: false, // Don't refresh when tab is not active
  });
}

// Fetch single attendance record
export function useAttendanceDetail(id: string) {
  return useQuery({
    queryKey: ['attendance', id],
    queryFn: () => attendanceApi.getById(id),
    enabled: !!id,
  });
}

// Fetch anomalies
export function useAttendanceAnomalies(date?: string) {
  return useQuery({
    queryKey: ['attendance', 'anomalies', date],
    queryFn: () => attendanceApi.getAnomalies(date),
    staleTime: 30000, // 30 seconds
    retry: false, // Don't retry on error
    enabled: !!date, // Only fetch if date is provided
  });
}

// Create new attendance record
export function useCreateAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAttendanceDto) => attendanceApi.create(data),
    onSuccess: () => {
      // Invalider toutes les requêtes d'attendance
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['attendance', 'anomalies'] });
      
      // Forcer le refetch immédiat de toutes les requêtes d'attendance
      queryClient.refetchQueries({ queryKey: ['attendance'] });
      
      toast.success('Pointage créé avec succès');
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Erreur lors de la création du pointage'
      );
    },
  });
}

// Update attendance record
export function useUpdateAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateAttendanceDto> }) =>
      attendanceApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['attendance', variables.id] });
      
      // Forcer le refetch immédiat
      queryClient.refetchQueries({ queryKey: ['attendance'] });
      
      toast.success('Pointage modifié avec succès');
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Erreur lors de la modification du pointage'
      );
    },
  });
}

// Correct attendance record (for anomalies)
export function useCorrectAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: {
        correctionNote: string;
        correctedBy: string;
        correctedTimestamp?: string;
        forceApproval?: boolean;
      };
    }) => attendanceApi.correct(id, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['attendance', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['attendance', 'anomalies'] });
      
      // Forcer le refetch immédiat
      queryClient.refetchQueries({ queryKey: ['attendance'] });
      
      if (data.needsApproval) {
        toast.info('Correction soumise, approbation requise');
      } else {
        toast.success('Pointage corrigé avec succès');
      }
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Erreur lors de la correction du pointage'
      );
    },
  });
}

// Approve attendance correction
export function useApproveAttendanceCorrection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      approved,
      comment,
    }: {
      id: string;
      approved: boolean;
      comment?: string;
    }) => attendanceApi.approveCorrection(id, { approved, comment }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['attendance', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['attendance', 'anomalies'] });
      
      // Forcer le refetch immédiat
      queryClient.refetchQueries({ queryKey: ['attendance'] });
      
      toast.success(
        variables.approved
          ? 'Correction approuvée avec succès'
          : 'Correction rejetée'
      );
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Erreur lors de l\'approbation de la correction'
      );
    },
  });
}

// Delete attendance record
export function useDeleteAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => attendanceApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      
      // Forcer le refetch immédiat
      queryClient.refetchQueries({ queryKey: ['attendance'] });
      
      toast.success('Pointage supprimé avec succès');
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Erreur lors de la suppression du pointage'
      );
    },
  });
}

// Get presence rate
export function usePresenceRate(employeeId: string, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['attendance', 'presence-rate', employeeId, startDate, endDate],
    queryFn: () => attendanceApi.getPresenceRate(employeeId, startDate, endDate),
    enabled: !!employeeId,
  });
}

// Get punctuality rate
export function usePunctualityRate(employeeId: string, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['attendance', 'punctuality-rate', employeeId, startDate, endDate],
    queryFn: () => attendanceApi.getPunctualityRate(employeeId, startDate, endDate),
    enabled: !!employeeId,
  });
}

// Get trends
export function useAttendanceTrends(employeeId: string, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['attendance', 'trends', employeeId, startDate, endDate],
    queryFn: () => attendanceApi.getTrends(employeeId, startDate, endDate),
    enabled: !!employeeId,
  });
}

// Get recurring anomalies
export function useRecurringAnomalies(employeeId: string, days?: number) {
  return useQuery({
    queryKey: ['attendance', 'recurring-anomalies', employeeId, days],
    queryFn: () => attendanceApi.getRecurringAnomalies(employeeId, days),
    enabled: !!employeeId,
  });
}

// Get correction history
export function useCorrectionHistory(attendanceId: string) {
  return useQuery({
    queryKey: ['attendance', 'correction-history', attendanceId],
    queryFn: () => attendanceApi.getCorrectionHistory(attendanceId),
    enabled: !!attendanceId,
  });
}

// Bulk correct attendance records
export function useBulkCorrectAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      attendances: Array<{
        attendanceId: string;
        correctedTimestamp?: string;
        correctionNote?: string;
      }>;
      generalNote: string;
      forceApproval?: boolean;
    }) => attendanceApi.bulkCorrect(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['attendance', 'anomalies'] });
      
      // Forcer le refetch immédiat
      queryClient.refetchQueries({ queryKey: ['attendance'] });
      
      toast.success('Corrections groupées effectuées avec succès');
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Erreur lors de la correction groupée'
      );
    },
  });
}

// Export anomalies only
export function useExportAnomalies() {
  return useMutation({
    mutationFn: async ({
      format,
      filters,
    }: {
      format: 'csv' | 'excel';
      filters?: {
        startDate?: string;
        endDate?: string;
        employeeId?: string;
        anomalyType?: string;
      };
    }) => {
      const data = await attendanceApi.exportAnomalies(format, filters);
      
      if (format === 'csv') {
        const blob = new Blob([data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `anomalies_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        // Pour Excel, on pourrait utiliser une librairie comme xlsx
        toast.info('Export Excel à implémenter avec une librairie dédiée');
      }

      return data;
    },
    onSuccess: (_, variables) => {
      toast.success(`Export ${variables.format.toUpperCase()} des anomalies effectué`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors de l\'export des anomalies');
    },
  });
}

// Get anomalies dashboard
export function useAnomaliesDashboard(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['attendance', 'dashboard', 'anomalies', startDate, endDate],
    queryFn: () => attendanceApi.getAnomaliesDashboard(startDate, endDate),
    enabled: !!startDate && !!endDate,
  });
}

// Export attendance data (CSV/Excel)
export function useExportAttendance() {
  return useMutation({
    mutationFn: async ({
      format,
      filters,
    }: {
      format: 'csv' | 'excel';
      filters?: AttendanceFilters;
    }) => {
      const blob = await attendanceApi.export(format, filters);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `attendance_${new Date().toISOString().split('T')[0]}.${format === 'csv' ? 'csv' : 'xlsx'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      return blob;
    },
    onSuccess: (_, variables) => {
      toast.success(`Fichier ${variables.format.toUpperCase()} exporté avec succès`);
    },
    onError: (error: any) => {
      toast.error(
        error.message || 'Erreur lors de l\'export des données'
      );
    },
  });
}
