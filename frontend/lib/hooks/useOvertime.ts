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
