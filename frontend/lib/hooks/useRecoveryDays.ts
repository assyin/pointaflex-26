import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { recoveryDaysApi, type ConvertFlexibleDto, type ConvertSupplementaryDaysDto, type RecoveryDayFilters } from '../api/recovery-days';
import { toast } from 'sonner';

export function useRecoveryDays(filters?: RecoveryDayFilters) {
  return useQuery({
    queryKey: ['recovery-days', filters],
    queryFn: () => recoveryDaysApi.getAll(filters),
    staleTime: 30000,
  });
}

export function useRecoveryDay(id: string) {
  return useQuery({
    queryKey: ['recovery-days', id],
    queryFn: () => recoveryDaysApi.getById(id),
    enabled: !!id,
  });
}

export function useCumulativeBalance(employeeId: string) {
  return useQuery({
    queryKey: ['recovery-days', 'cumulative-balance', employeeId],
    queryFn: () => recoveryDaysApi.getCumulativeBalance(employeeId),
    enabled: !!employeeId,
    staleTime: 30000,
  });
}

export function useConvertFlexible() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ConvertFlexibleDto) => recoveryDaysApi.convertFlexible(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['recovery-days'] });
      queryClient.invalidateQueries({ queryKey: ['overtime'] });

      const summary = result.conversionSummary;
      toast.success(
        `Conversion réussie: ${summary.daysGranted} jour(s) de récupération créé(s) à partir de ${summary.totalHoursConverted.toFixed(1)}h`
      );
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Erreur lors de la conversion'
      );
    },
  });
}

export function useApproveRecoveryDay() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, comment }: { id: string; comment?: string }) =>
      recoveryDaysApi.approve(id, comment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recovery-days'] });
      toast.success('Jour de récupération approuvé');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de l\'approbation');
    },
  });
}

export function useCancelRecoveryDay() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => recoveryDaysApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recovery-days'] });
      queryClient.invalidateQueries({ queryKey: ['overtime'] });
      toast.success('Jour de récupération annulé, heures retournées au solde');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de l\'annulation');
    },
  });
}

export function useEmployeeRecoveryBalance(employeeId: string) {
  return useQuery({
    queryKey: ['recovery-days', 'balance', employeeId],
    queryFn: () => recoveryDaysApi.getEmployeeBalance(employeeId),
    enabled: !!employeeId,
    staleTime: 60000,
  });
}

// ============================================
// JOURS SUPPLÉMENTAIRES
// ============================================

export function useSupplementaryDaysCumulativeBalance(employeeId: string) {
  return useQuery({
    queryKey: ['recovery-days', 'supplementary-days-balance', employeeId],
    queryFn: () => recoveryDaysApi.getSupplementaryDaysCumulativeBalance(employeeId),
    enabled: !!employeeId,
    staleTime: 30000,
  });
}

export function useConvertSupplementaryDaysFlexible() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ConvertSupplementaryDaysDto) => recoveryDaysApi.convertSupplementaryDaysFlexible(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['recovery-days'] });
      queryClient.invalidateQueries({ queryKey: ['supplementary-days'] });

      const summary = result.conversionSummary;
      toast.success(
        `Conversion réussie: ${summary.daysGranted} jour(s) de récupération créé(s) à partir de ${summary.totalHoursConverted.toFixed(1)}h de jours supplémentaires`
      );
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Erreur lors de la conversion des jours supplémentaires'
      );
    },
  });
}
