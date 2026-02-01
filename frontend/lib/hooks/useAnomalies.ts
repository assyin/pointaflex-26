import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  anomaliesApi,
  type AnomaliesFilters,
  type CorrectionPayload,
  type BulkCorrectionPayload,
} from '../api/anomalies';

// Query keys
const ANOMALIES_KEYS = {
  all: ['anomalies'] as const,
  dashboard: (startDate: string, endDate: string) =>
    [...ANOMALIES_KEYS.all, 'dashboard', startDate, endDate] as const,
  list: (filters?: AnomaliesFilters) =>
    [...ANOMALIES_KEYS.all, 'list', filters] as const,
  highRate: (threshold?: number, days?: number) =>
    [...ANOMALIES_KEYS.all, 'high-rate', threshold, days] as const,
  analytics: (
    startDate: string,
    endDate: string,
    filters?: Record<string, string | undefined>
  ) => [...ANOMALIES_KEYS.all, 'analytics', startDate, endDate, filters] as const,
  monthlyReport: (year: number, month: number) =>
    [...ANOMALIES_KEYS.all, 'monthly-report', year, month] as const,
};

/**
 * Hook pour récupérer le dashboard des anomalies
 * Inclut: summary, byType, byEmployee, byDay
 */
export function useAnomaliesDashboard(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ANOMALIES_KEYS.dashboard(startDate, endDate),
    queryFn: () => anomaliesApi.getDashboard(startDate, endDate),
    enabled: !!startDate && !!endDate,
    staleTime: 30000, // 30 secondes
    refetchInterval: 60000, // Rafraîchir chaque minute
    refetchIntervalInBackground: false,
  });
}

/**
 * Hook pour récupérer la liste des anomalies avec filtres et pagination
 */
export function useAnomaliesList(filters?: AnomaliesFilters) {
  return useQuery({
    queryKey: ANOMALIES_KEYS.list(filters),
    queryFn: () => anomaliesApi.getList(filters),
    staleTime: 30000,
    placeholderData: (previousData) => previousData, // Garde les données précédentes pendant le chargement
  });
}

/**
 * Hook pour récupérer les employés avec taux d'anomalies élevé
 */
export function useHighAnomalyRateEmployees(threshold?: number, days?: number) {
  return useQuery({
    queryKey: ANOMALIES_KEYS.highRate(threshold, days),
    queryFn: () => anomaliesApi.getHighAnomalyRateEmployees(threshold, days),
    staleTime: 60000, // 1 minute
    refetchInterval: 300000, // Rafraîchir toutes les 5 minutes
    refetchIntervalInBackground: false,
  });
}

/**
 * Hook pour récupérer les analytics détaillées des anomalies
 */
export function useAnomaliesAnalytics(
  startDate: string,
  endDate: string,
  filters?: {
    employeeId?: string;
    departmentId?: string;
    siteId?: string;
    anomalyType?: string;
  }
) {
  return useQuery({
    queryKey: ANOMALIES_KEYS.analytics(startDate, endDate, filters),
    queryFn: () => anomaliesApi.getAnalytics(startDate, endDate, filters),
    enabled: !!startDate && !!endDate,
    staleTime: 60000,
  });
}

/**
 * Hook pour récupérer le rapport mensuel par département
 */
export function useMonthlyAnomaliesReport(year: number, month: number) {
  return useQuery({
    queryKey: ANOMALIES_KEYS.monthlyReport(year, month),
    queryFn: () => anomaliesApi.getMonthlyReport(year, month),
    enabled: !!year && !!month,
    staleTime: 300000, // 5 minutes
  });
}

/**
 * Hook pour corriger une anomalie
 */
export function useCorrectAnomaly() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CorrectionPayload }) =>
      anomaliesApi.correct(id, payload),
    onSuccess: (data: any) => {
      // Invalider toutes les requêtes d'anomalies
      queryClient.invalidateQueries({ queryKey: ANOMALIES_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });

      if (data?.needsApproval) {
        toast.info('Correction soumise, en attente d\'approbation');
      } else {
        toast.success('Anomalie corrigée avec succès');
      }
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Erreur lors de la correction de l\'anomalie'
      );
    },
  });
}

/**
 * Hook pour inverser le type d'un pointage (IN→OUT ou OUT→IN)
 */
export function useInvertType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) =>
      anomaliesApi.invertType(id, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ANOMALIES_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast.success('Type inversé avec succès');
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Erreur lors de l\'inversion du type'
      );
    },
  });
}

export function useCreateMissing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, suggestedTimestamp, note }: { id: string; suggestedTimestamp?: string; note?: string }) =>
      anomaliesApi.createMissing(id, suggestedTimestamp, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ANOMALIES_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast.success('Pointage manquant créé avec succès');
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Erreur lors de la création du pointage manquant'
      );
    },
  });
}

/**
 * Hook pour corriger plusieurs anomalies en masse
 */
export function useBulkCorrectAnomalies() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: BulkCorrectionPayload) => anomaliesApi.bulkCorrect(payload),
    onSuccess: (data) => {
      // Invalider toutes les requêtes d'anomalies
      queryClient.invalidateQueries({ queryKey: ANOMALIES_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });

      toast.success(`${data.correctedCount || data.length || 'Plusieurs'} anomalies corrigées avec succès`);
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Erreur lors de la correction en masse'
      );
    },
  });
}

/**
 * Hook pour exporter les anomalies
 */
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
      const blob = await anomaliesApi.export(format, filters);

      // Télécharger le fichier
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `anomalies_${new Date().toISOString().split('T')[0]}.${format === 'csv' ? 'csv' : 'xlsx'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      return blob;
    },
    onSuccess: (_, variables) => {
      toast.success(`Export ${variables.format.toUpperCase()} téléchargé avec succès`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors de l\'export des anomalies');
    },
  });
}

/**
 * Hook combiné pour le dashboard complet
 * Récupère dashboard + alertes en parallèle
 */
export function useAnomaliesDashboardFull(
  startDate: string,
  endDate: string,
  alertThreshold?: number,
  alertDays?: number
) {
  const dashboard = useAnomaliesDashboard(startDate, endDate);
  const highRateEmployees = useHighAnomalyRateEmployees(alertThreshold, alertDays);

  return {
    dashboard: dashboard.data,
    highRateEmployees: highRateEmployees.data || [],
    isLoading: dashboard.isLoading || highRateEmployees.isLoading,
    isError: dashboard.isError || highRateEmployees.isError,
    error: dashboard.error || highRateEmployees.error,
    refetch: () => {
      dashboard.refetch();
      highRateEmployees.refetch();
    },
  };
}
