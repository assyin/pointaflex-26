import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { shiftsApi, type CreateShiftDto } from '../api/shifts';
import { toast } from 'sonner';
import { translateErrorMessage } from '../utils/errorMessages';
import { isAuthenticated } from '../utils/auth';
import { useAuth } from '../../contexts/AuthContext';

export function useShifts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['shifts', user?.id], // Include user ID to prevent cache sharing
    queryFn: () => shiftsApi.getAll(),
    enabled: isAuthenticated(),
    staleTime: 60000, // 1 minute
    retry: (failureCount, error: any) => {
      // Ne pas retry si c'est une erreur 401
      if (error?.response?.status === 401) return false;
      return failureCount < 3;
    },
  });
}

export function useShift(id: string) {
  return useQuery({
    queryKey: ['shifts', id],
    queryFn: () => shiftsApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateShift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateShiftDto) => shiftsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      queryClient.refetchQueries({ queryKey: ['shifts'] });
      toast.success('Shift créé avec succès');
    },
    onError: (error: any) => {
      const errorMessage = translateErrorMessage(error);
      toast.error(errorMessage, {
        description: 'Veuillez vérifier les informations du shift et réessayer.',
        duration: 5000,
      });
    },
  });
}

export function useUpdateShift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateShiftDto> }) =>
      shiftsApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      queryClient.invalidateQueries({ queryKey: ['shifts', variables.id] });
      toast.success('Shift modifié avec succès');
    },
    onError: (error: any) => {
      const errorMessage = translateErrorMessage(error);
      toast.error(errorMessage, {
        description: 'Impossible de modifier le shift.',
        duration: 5000,
      });
    },
  });
}

export function useDeleteShift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => shiftsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      queryClient.refetchQueries({ queryKey: ['shifts'] });
      toast.success('Shift supprimé avec succès');
    },
    onError: (error: any) => {
      const errorMessage = translateErrorMessage(error);
      toast.error(errorMessage, {
        description: 'Impossible de supprimer le shift.',
        duration: 5000,
      });
    },
  });
}
