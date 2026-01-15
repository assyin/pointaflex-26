import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { devicesApi, type AttendanceDevice, type CreateDeviceDto, type UpdateIPWhitelistDto, type AuditLogFilters } from '../api/devices';
import { toast } from 'sonner';

// Basic CRUD hooks
export function useDevices(filters?: any) {
  return useQuery({
    queryKey: ['devices', filters],
    queryFn: () => devicesApi.getAll(filters),
    staleTime: 30000,
  });
}

export function useDevice(id: string) {
  return useQuery({
    queryKey: ['devices', id],
    queryFn: () => devicesApi.getById(id),
    enabled: !!id,
  });
}

export function useDeviceStats() {
  return useQuery({
    queryKey: ['devices', 'stats'],
    queryFn: () => devicesApi.getStats(),
    staleTime: 60000,
    refetchInterval: 60000,
  });
}

export function useCreateDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateDeviceDto) => devicesApi.create(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      queryClient.invalidateQueries({ queryKey: ['devices', 'stats'] });
      if (result.generatedApiKey) {
        toast.success('Terminal créé avec une nouvelle clé API');
      } else {
        toast.success('Terminal créé avec succès');
      }
      return result;
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la création du terminal');
    },
  });
}

export function useUpdateDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateDeviceDto> }) =>
      devicesApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      queryClient.invalidateQueries({ queryKey: ['devices', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['devices', 'stats'] });
      toast.success('Terminal modifié avec succès');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la modification du terminal');
    },
  });
}

export function useDeleteDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => devicesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      queryClient.invalidateQueries({ queryKey: ['devices', 'stats'] });
      toast.success('Terminal supprimé avec succès');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la suppression du terminal');
    },
  });
}

export function useSyncDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => devicesApi.sync(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      queryClient.invalidateQueries({ queryKey: ['devices', id] });
      toast.success('Synchronisation réussie');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la synchronisation');
    },
  });
}

// Activation/Deactivation hooks
export function useActivateDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => devicesApi.activate(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      queryClient.invalidateQueries({ queryKey: ['devices', id] });
      queryClient.invalidateQueries({ queryKey: ['devices', 'stats'] });
      toast.success('Terminal activé');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de l\'activation');
    },
  });
}

export function useDeactivateDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => devicesApi.deactivate(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      queryClient.invalidateQueries({ queryKey: ['devices', id] });
      queryClient.invalidateQueries({ queryKey: ['devices', 'stats'] });
      toast.success('Terminal désactivé');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la désactivation');
    },
  });
}

// API Key Management hooks
export function useGenerateApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => devicesApi.generateApiKey(id),
    onSuccess: (result, id) => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      queryClient.invalidateQueries({ queryKey: ['devices', id] });
      queryClient.invalidateQueries({ queryKey: ['devices', 'audit-logs'] });
      toast.success('Clé API générée - Copiez-la maintenant, elle ne sera plus affichée!');
      return result;
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la génération de la clé API');
    },
  });
}

export function useRotateApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => devicesApi.rotateApiKey(id),
    onSuccess: (result, id) => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      queryClient.invalidateQueries({ queryKey: ['devices', id] });
      queryClient.invalidateQueries({ queryKey: ['devices', 'audit-logs'] });
      toast.success('Clé API renouvelée - Copiez-la maintenant, elle ne sera plus affichée!');
      return result;
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors du renouvellement de la clé API');
    },
  });
}

export function useRevokeApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => devicesApi.revokeApiKey(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      queryClient.invalidateQueries({ queryKey: ['devices', id] });
      queryClient.invalidateQueries({ queryKey: ['devices', 'audit-logs'] });
      toast.success('Clé API révoquée');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la révocation de la clé API');
    },
  });
}

// IP Whitelist hook
export function useUpdateIPWhitelist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateIPWhitelistDto }) =>
      devicesApi.updateIPWhitelist(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      queryClient.invalidateQueries({ queryKey: ['devices', id] });
      queryClient.invalidateQueries({ queryKey: ['devices', 'audit-logs'] });
      toast.success('Liste blanche IP mise à jour');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la mise à jour de la liste blanche IP');
    },
  });
}

// Connection Status hook
export function useDeviceConnectionStatus(id: string) {
  return useQuery({
    queryKey: ['devices', id, 'connection-status'],
    queryFn: () => devicesApi.getConnectionStatus(id),
    enabled: !!id,
    staleTime: 30000,
    refetchInterval: 30000,
  });
}

// Audit Logs hooks
export function useDeviceAuditLogs(filters?: AuditLogFilters) {
  return useQuery({
    queryKey: ['devices', 'audit-logs', filters],
    queryFn: () => devicesApi.getAuditLogs(filters),
    staleTime: 30000,
  });
}

export function useDeviceSpecificAuditLogs(id: string, filters?: AuditLogFilters) {
  return useQuery({
    queryKey: ['devices', id, 'audit-logs', filters],
    queryFn: () => devicesApi.getDeviceAuditLogs(id, filters),
    enabled: !!id,
    staleTime: 30000,
  });
}
