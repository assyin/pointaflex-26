import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  terminalMatriculeMappingApi,
  type ExpiringMatriculeMapping,
} from '../api/terminal-matricule-mapping';
import { toast } from 'sonner';
import { isAuthenticated } from '../utils/auth';

export function useExpiringMatricules() {
  return useQuery({
    queryKey: ['terminal-matricule-mapping', 'expiring'],
    queryFn: () => terminalMatriculeMappingApi.getExpiringMatricules(),
    enabled: isAuthenticated(),
    staleTime: 60000, // 1 minute
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 401) return false;
      return failureCount < 3;
    },
  });
}

export function useAllTemporaryMatricules() {
  return useQuery({
    queryKey: ['terminal-matricule-mapping', 'all'],
    queryFn: () => terminalMatriculeMappingApi.getAllTemporaryMatricules(),
    enabled: isAuthenticated(),
    staleTime: 60000, // 1 minute
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 401) return false;
      return failureCount < 3;
    },
  });
}

export function useMigrateMatricule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      employeeId,
      officialMatricule,
    }: {
      employeeId: string;
      officialMatricule: string;
    }) =>
      terminalMatriculeMappingApi.migrateToOfficialMatricule(
        employeeId,
        officialMatricule,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['terminal-matricule-mapping'],
      });
      queryClient.invalidateQueries({
        queryKey: ['employees'],
      });
      toast.success('Matricule migré avec succès');
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message ||
        'Erreur lors de la migration du matricule';
      toast.error(message);
    },
  });
}

export function useEmployeeMappings(employeeId: string) {
  return useQuery({
    queryKey: ['terminal-matricule-mapping', 'employee', employeeId],
    queryFn: () => terminalMatriculeMappingApi.getEmployeeMappings(employeeId),
    enabled: isAuthenticated() && !!employeeId,
    staleTime: 60000, // 1 minute
  });
}

export function useMappingHistory(filters?: {
  employeeId?: string;
  terminalMatricule?: string;
  officialMatricule?: string;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['terminal-matricule-mapping', 'history', filters],
    queryFn: () => terminalMatriculeMappingApi.getMappingHistory(filters),
    enabled: isAuthenticated(),
    staleTime: 30000, // 30 secondes
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 401) return false;
      return failureCount < 3;
    },
  });
}

