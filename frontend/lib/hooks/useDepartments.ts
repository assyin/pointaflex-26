import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { departmentsApi, type CreateDepartmentDto, type UpdateDepartmentDto, type DepartmentSettingsData } from '../api/departments';
import { toast } from 'sonner';
import { isAuthenticated } from '../utils/auth';
import { useAuth } from '../../contexts/AuthContext';

export function useDepartments() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['departments', user?.id], // Include user ID to prevent cache sharing
    queryFn: () => departmentsApi.getAll(),
    enabled: isAuthenticated(),
    staleTime: 300000, // 5 minutes (PERF FIX: données de référence rarement modifiées)
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 401) return false;
      return failureCount < 3;
    },
  });
}

export function useDepartment(id: string) {
  return useQuery({
    queryKey: ['departments', id],
    queryFn: () => departmentsApi.getById(id),
    enabled: !!id && isAuthenticated(),
  });
}

export function useCreateDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateDepartmentDto) => departmentsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['departments', 'stats'] });
      toast.success('Département créé avec succès');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la création du département');
    },
  });
}

export function useUpdateDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDepartmentDto }) =>
      departmentsApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['departments', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['departments', 'stats'] });
      toast.success('Département modifié avec succès');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la modification du département');
    },
  });
}

export function useDeleteDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => departmentsApi.delete(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.removeQueries({ queryKey: ['departments', id] });
      queryClient.invalidateQueries({ queryKey: ['departments', 'stats'] });
      toast.success('Département supprimé avec succès');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la suppression du département');
    },
  });
}

export function useDepartmentSettings(departmentId: string | null) {
  return useQuery({
    queryKey: ['departments', departmentId, 'settings'],
    queryFn: () => departmentsApi.getSettings(departmentId!),
    enabled: !!departmentId && isAuthenticated(),
  });
}

export function useUpdateDepartmentSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<DepartmentSettingsData> }) =>
      departmentsApi.updateSettings(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['departments', variables.id, 'settings'] });
      toast.success('Paramètres du département mis à jour');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la mise à jour des paramètres');
    },
  });
}

export function useDepartmentStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['departments', 'stats', user?.id], // Include user ID to prevent cache sharing
    queryFn: () => departmentsApi.getStats(),
    enabled: isAuthenticated(),
    staleTime: 30000, // 30 seconds
  });
}
