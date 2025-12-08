import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { HolidaysAPI, CreateHolidayDto, UpdateHolidayDto } from '../api/holidays';
import { toast } from 'sonner';

export function useHolidays(year?: number) {
  return useQuery({
    queryKey: ['holidays', year],
    queryFn: () => HolidaysAPI.getAll(year),
    staleTime: 60000, // 1 minute
  });
}

export function useHoliday(id: string) {
  return useQuery({
    queryKey: ['holidays', id],
    queryFn: () => HolidaysAPI.getById(id),
    enabled: !!id,
  });
}

export function useCreateHoliday() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateHolidayDto) => HolidaysAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      toast.success('Jour férié créé avec succès');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la création du jour férié');
    },
  });
}

export function useUpdateHoliday() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateHolidayDto }) =>
      HolidaysAPI.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      queryClient.invalidateQueries({ queryKey: ['holidays', variables.id] });
      toast.success('Jour férié modifié avec succès');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la modification du jour férié');
    },
  });
}

export function useDeleteHoliday() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => HolidaysAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      toast.success('Jour férié supprimé avec succès');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la suppression du jour férié');
    },
  });
}

export function useImportHolidays() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => HolidaysAPI.importFromFile(file),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      toast.success(result.message);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de l\'import des jours fériés');
    },
  });
}
