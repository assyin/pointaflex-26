import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TenantsAPI, UpdateTenantSettingsDto } from '../api/tenants';
import { toast } from 'sonner';

export function useTenantSettings(tenantId: string) {
  return useQuery({
    queryKey: ['tenant-settings', tenantId],
    queryFn: () => TenantsAPI.getSettings(tenantId),
    enabled: !!tenantId,
    staleTime: 300000, // 5 minutes
  });
}

export function useUpdateTenantSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tenantId, data }: { tenantId: string; data: UpdateTenantSettingsDto }) =>
      TenantsAPI.updateSettings(tenantId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tenant-settings', variables.tenantId] });
      toast.success('Paramètres mis à jour avec succès');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la mise à jour des paramètres');
    },
  });
}
