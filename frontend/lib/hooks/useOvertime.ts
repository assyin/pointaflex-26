import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { overtimeApi, type Overtime, type OvertimeFilters, type CreateOvertimeDto } from '../api/overtime';
import { toast } from 'sonner';

export function useOvertimeRecords(filters?: OvertimeFilters) {
  return useQuery({
    queryKey: ['overtime', filters],
    queryFn: () => overtimeApi.getAll(filters),
    staleTime: 30000, // 30 seconds
  });
}

export function useOvertimeRecord(id: string) {
  return useQuery({
    queryKey: ['overtime', id],
    queryFn: () => overtimeApi.getById(id),
    enabled: !!id,
  });
}

export function useApproveOvertime() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, approvedHours }: { id: string; approvedHours?: number }) => 
      overtimeApi.approve(id, approvedHours),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['overtime'] });
      toast.success('Heures supplémentaires approuvées avec succès');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de l\'approbation');
    },
  });
}

export function useRejectOvertime() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      overtimeApi.reject(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['overtime'] });
      toast.success('Heures supplémentaires rejetées');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors du rejet');
    },
  });
}

export function useConvertToRecovery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => overtimeApi.convertToRecovery(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['overtime'] });
      toast.success('Heures converties en récupération avec succès');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la conversion');
    },
  });
}

export function useOvertimeSummary(employeeId: string) {
  return useQuery({
    queryKey: ['overtime', 'summary', employeeId],
    queryFn: () => overtimeApi.getBalance(employeeId),
    enabled: !!employeeId,
    staleTime: 60000, // 1 minute
  });
}

export function useCreateOvertime() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateOvertimeDto) => overtimeApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['overtime'] });
      toast.success('Demande d\'heures supplémentaires créée avec succès');
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Erreur lors de la création de la demande'
      );
    },
  });
}

export function useUpdateOvertime() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateOvertimeDto> }) =>
      overtimeApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['overtime'] });
      queryClient.invalidateQueries({ queryKey: ['overtime', variables.id] });
      toast.success('Demande d\'heures supplémentaires modifiée avec succès');
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Erreur lors de la modification de la demande'
      );
    },
  });
}

export function useDeleteOvertime() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => overtimeApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['overtime'] });
      toast.success('Demande d\'heures supplémentaires supprimée avec succès');
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Erreur lors de la suppression de la demande'
      );
    },
  });
}

export function useOvertimeDashboardStats(filters?: {
  startDate?: string;
  endDate?: string;
  siteId?: string;
  departmentId?: string;
}) {
  return useQuery({
    queryKey: ['overtime', 'dashboard', filters],
    queryFn: () => overtimeApi.getDashboardStats(filters),
    staleTime: 60000, // 1 minute
  });
}

// ============================================
// ACTIONS DE RECTIFICATION
// ============================================

/**
 * Annuler l'approbation (APPROVED → PENDING)
 */
export function useRevokeApproval() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      overtimeApi.revokeApproval(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['overtime'] });
      queryClient.invalidateQueries({ queryKey: ['recovery-days'] });
      toast.success('Approbation annulée - La demande est de nouveau en attente');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de l\'annulation de l\'approbation');
    },
  });
}

/**
 * Annuler le rejet (REJECTED → PENDING)
 */
export function useRevokeRejection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      overtimeApi.revokeRejection(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['overtime'] });
      toast.success('Rejet annulé - La demande est de nouveau en attente');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de l\'annulation du rejet');
    },
  });
}

/**
 * Modifier les heures approuvées
 */
export function useUpdateApprovedHours() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, approvedHours, reason }: { id: string; approvedHours: number; reason?: string }) =>
      overtimeApi.updateApprovedHours(id, approvedHours, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['overtime'] });
      queryClient.invalidateQueries({ queryKey: ['recovery-days'] });
      toast.success('Heures approuvées modifiées avec succès');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la modification des heures');
    },
  });
}

/**
 * Récupérer les informations de récupération liées à un overtime
 */
export function useRecoveryInfo(overtimeId: string | null) {
  return useQuery({
    queryKey: ['overtime', 'recovery-info', overtimeId],
    queryFn: () => overtimeApi.getRecoveryInfo(overtimeId!),
    enabled: !!overtimeId,
    staleTime: 0, // Toujours refetch pour avoir les données à jour
  });
}

/**
 * Annuler la conversion en récupération (RECOVERED → APPROVED)
 */
export function useCancelConversion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      overtimeApi.cancelConversion(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['overtime'] });
      queryClient.invalidateQueries({ queryKey: ['recovery-days'] });
      toast.success('Conversion annulée - Les heures sont de nouveau disponibles');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de l\'annulation de la conversion');
    },
  });
}
