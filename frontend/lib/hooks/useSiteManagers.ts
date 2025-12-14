import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { siteManagersApi, type CreateSiteManagerDto, type UpdateSiteManagerDto } from '../api/site-managers';
import { toast } from 'sonner';
import { isAuthenticated } from '../utils/auth';

export function useSiteManagers(filters?: { siteId?: string; departmentId?: string }) {
  return useQuery({
    queryKey: ['site-managers', filters],
    queryFn: () => siteManagersApi.getAll(filters),
    enabled: isAuthenticated(),
    staleTime: 60000, // 1 minute
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 401) return false;
      return failureCount < 3;
    },
  });
}

export function useSiteManager(id: string) {
  return useQuery({
    queryKey: ['site-managers', id],
    queryFn: () => siteManagersApi.getById(id),
    enabled: !!id && isAuthenticated(),
  });
}

export function useSiteManagersBySite(siteId: string) {
  return useQuery({
    queryKey: ['site-managers', 'by-site', siteId],
    queryFn: () => siteManagersApi.getBySite(siteId),
    enabled: !!siteId && isAuthenticated(),
  });
}

export function useSiteManagersByManager(managerId: string) {
  return useQuery({
    queryKey: ['site-managers', 'by-manager', managerId],
    queryFn: () => siteManagersApi.getByManager(managerId),
    enabled: !!managerId && isAuthenticated(),
  });
}

export function useCreateSiteManager() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSiteManagerDto) => siteManagersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-managers'] });
      toast.success('Manager régional créé avec succès');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la création du manager régional');
    },
  });
}

export function useUpdateSiteManager() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSiteManagerDto }) =>
      siteManagersApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['site-managers'] });
      queryClient.invalidateQueries({ queryKey: ['site-managers', variables.id] });
      toast.success('Manager régional modifié avec succès');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la modification du manager régional');
    },
  });
}

export function useDeleteSiteManager() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => siteManagersApi.delete(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['site-managers'] });
      queryClient.removeQueries({ queryKey: ['site-managers', id] });
      toast.success('Manager régional supprimé avec succès');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la suppression du manager régional');
    },
  });
}
