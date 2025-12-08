import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { positionsApi, type CreatePositionDto, type UpdatePositionDto } from '../api/positions';
import { toast } from 'sonner';
import { isAuthenticated } from '../utils/auth';

export function usePositions(category?: string) {
  return useQuery({
    queryKey: ['positions', category],
    queryFn: () => positionsApi.getAll(category),
    enabled: isAuthenticated(),
    staleTime: 60000, // 1 minute
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 401) return false;
      return failureCount < 3;
    },
  });
}

export function usePosition(id: string) {
  return useQuery({
    queryKey: ['positions', id],
    queryFn: () => positionsApi.getById(id),
    enabled: !!id && isAuthenticated(),
  });
}

export function useCreatePosition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePositionDto) => positionsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['positions'] });
      queryClient.invalidateQueries({ queryKey: ['positions', 'stats'] });
      queryClient.invalidateQueries({ queryKey: ['positions', 'categories'] });
      toast.success('Fonction créée avec succès');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la création de la fonction');
    },
  });
}

export function useUpdatePosition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePositionDto }) =>
      positionsApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['positions'] });
      queryClient.invalidateQueries({ queryKey: ['positions', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['positions', 'stats'] });
      queryClient.invalidateQueries({ queryKey: ['positions', 'categories'] });
      toast.success('Fonction modifiée avec succès');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la modification de la fonction');
    },
  });
}

export function useDeletePosition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => positionsApi.delete(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['positions'] });
      queryClient.removeQueries({ queryKey: ['positions', id] });
      queryClient.invalidateQueries({ queryKey: ['positions', 'stats'] });
      queryClient.invalidateQueries({ queryKey: ['positions', 'categories'] });
      toast.success('Fonction supprimée avec succès');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la suppression de la fonction');
    },
  });
}

export function usePositionStats() {
  return useQuery({
    queryKey: ['positions', 'stats'],
    queryFn: () => positionsApi.getStats(),
    enabled: isAuthenticated(),
    staleTime: 30000, // 30 seconds
  });
}

export function usePositionCategories() {
  return useQuery({
    queryKey: ['positions', 'categories'],
    queryFn: () => positionsApi.getCategories(),
    enabled: isAuthenticated(),
    staleTime: 300000, // 5 minutes
  });
}
