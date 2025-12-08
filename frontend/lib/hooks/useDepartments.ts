import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { departmentsApi, type CreateDepartmentDto, type UpdateDepartmentDto } from '../api/departments';
import { toast } from 'sonner';
import { isAuthenticated } from '../utils/auth';

export function useDepartments() {
  return useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentsApi.getAll(),
    enabled: isAuthenticated(),
    staleTime: 60000, // 1 minute
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

export function useDepartmentStats() {
  return useQuery({
    queryKey: ['departments', 'stats'],
    queryFn: () => departmentsApi.getStats(),
    enabled: isAuthenticated(),
    staleTime: 30000, // 30 seconds
  });
}
