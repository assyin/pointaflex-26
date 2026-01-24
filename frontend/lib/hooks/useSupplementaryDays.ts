import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supplementaryDaysApi, SupplementaryDayFilters } from '../api/supplementary-days';
import { toast } from 'sonner';

/**
 * Récupérer les jours supplémentaires avec filtres
 */
export function useSupplementaryDays(filters?: SupplementaryDayFilters) {
  return useQuery({
    queryKey: ['supplementary-days', filters],
    queryFn: () => supplementaryDaysApi.getAll(filters),
  });
}

/**
 * Récupérer un jour supplémentaire par ID
 */
export function useSupplementaryDay(id: string | null) {
  return useQuery({
    queryKey: ['supplementary-days', id],
    queryFn: () => supplementaryDaysApi.getById(id!),
    enabled: !!id,
  });
}

/**
 * Statistiques du dashboard
 */
export function useSupplementaryDaysDashboardStats(filters?: {
  startDate?: string;
  endDate?: string;
  siteId?: string;
  departmentId?: string;
}) {
  return useQuery({
    queryKey: ['supplementary-days', 'dashboard', filters],
    queryFn: () => supplementaryDaysApi.getDashboardStats(filters),
  });
}

/**
 * Créer un jour supplémentaire
 */
export function useCreateSupplementaryDay() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: supplementaryDaysApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplementary-days'] });
      toast.success('Jour supplémentaire créé avec succès');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la création');
    },
  });
}

/**
 * Approuver un jour supplémentaire
 */
export function useApproveSupplementaryDay() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, approvedHours }: { id: string; approvedHours?: number }) =>
      supplementaryDaysApi.approve(id, approvedHours),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplementary-days'] });
      toast.success('Jour supplémentaire approuvé');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de l\'approbation');
    },
  });
}

/**
 * Rejeter un jour supplémentaire
 */
export function useRejectSupplementaryDay() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      supplementaryDaysApi.reject(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplementary-days'] });
      toast.success('Jour supplémentaire rejeté');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors du rejet');
    },
  });
}

/**
 * Convertir en récupération
 */
export function useConvertSupplementaryDayToRecovery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => supplementaryDaysApi.convertToRecovery(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplementary-days'] });
      queryClient.invalidateQueries({ queryKey: ['recovery-days'] });
      toast.success('Converti en récupération avec succès');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la conversion');
    },
  });
}

/**
 * Supprimer un jour supplémentaire
 */
export function useDeleteSupplementaryDay() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => supplementaryDaysApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplementary-days'] });
      toast.success('Jour supplémentaire supprimé');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la suppression');
    },
  });
}

/**
 * Annuler l'approbation (APPROVED → PENDING)
 */
export function useRevokeSupplementaryDayApproval() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      supplementaryDaysApi.revokeApproval(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplementary-days'] });
      toast.success('Approbation annulée - Le jour est de nouveau en attente');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de l\'annulation');
    },
  });
}

/**
 * Annuler le rejet (REJECTED → PENDING)
 */
export function useRevokeSupplementaryDayRejection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      supplementaryDaysApi.revokeRejection(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplementary-days'] });
      toast.success('Rejet annulé - Le jour est de nouveau en attente');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de l\'annulation');
    },
  });
}
