import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeesApi, type Employee, type CreateEmployeeDto, type UpdateEmployeeDto, type EmployeeFilters } from '../api/employees';
import { toast } from 'sonner';
import { isAuthenticated } from '../utils/auth';
import { useAuth } from '../../contexts/AuthContext';

export function useEmployees(filters?: EmployeeFilters) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['employees', user?.id, filters], // Include user ID to prevent cache sharing
    queryFn: () => employeesApi.getAll(filters),
    enabled: isAuthenticated(),
    staleTime: 30000, // 30 seconds
    retry: (failureCount, error: any) => {
      // Ne pas retry si c'est une erreur 401
      if (error?.response?.status === 401) return false;
      return failureCount < 3;
    },
  });
}

export function useEmployee(id: string) {
  return useQuery({
    queryKey: ['employees', id],
    queryFn: () => employeesApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateEmployeeDto) => employeesApi.create(data),
    onSuccess: (newEmployee) => {
      // Invalider toutes les requêtes d'employés pour forcer le refetch
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      
      // Forcer le refetch immédiat de toutes les requêtes d'employés
      queryClient.refetchQueries({ queryKey: ['employees'] });
      
      toast.success('Employé créé avec succès');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la création de l\'employé');
    },
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateEmployeeDto }) =>
      employeesApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employees', variables.id] });
      toast.success('Employé modifié avec succès');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la modification de l\'employé');
    },
  });
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => employeesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Employé supprimé avec succès');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la suppression de l\'employé');
    },
  });
}

export function useDeleteAllEmployees() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => employeesApi.deleteAll(),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success(`${data.data.count} employé(s) supprimé(s) avec succès`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la suppression des employés');
    },
  });
}

export function useCreateUserAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, userEmail }: { id: string; userEmail?: string }) =>
      employeesApi.createUserAccount(id, userEmail ? { userEmail } : undefined),
    onSuccess: (data, variables) => {
      // Invalider toutes les requêtes d'employés
      queryClient.invalidateQueries({ queryKey: ['employees'] });

      // Forcer le refetch immédiat pour mettre à jour l'UI
      queryClient.refetchQueries({ queryKey: ['employees'] });

      // Afficher les credentials si générés
      if ((data as any).generatedCredentials) {
        const creds = (data as any).generatedCredentials;
        toast.success(
          `Compte créé avec succès !\nEmail: ${creds.email}\nMot de passe: ${creds.password}`,
          { duration: 10000 }
        );
        // Copier les credentials dans le presse-papier si possible
        if (navigator.clipboard) {
          navigator.clipboard.writeText(`Email: ${creds.email}\nMot de passe: ${creds.password}`);
        }
      } else {
        toast.success('Compte créé avec succès');
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la création du compte');
    },
  });
}

export function useGetCredentials() {
  return useMutation({
    mutationFn: (id: string) => employeesApi.getCredentials(id),
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la récupération des identifiants');
    },
  });
}

export function useDeleteUserAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => employeesApi.deleteUserAccount(id),
    onSuccess: () => {
      // Invalider toutes les requêtes d'employés
      queryClient.invalidateQueries({ queryKey: ['employees'] });

      // Forcer le refetch immédiat pour mettre à jour l'UI
      queryClient.refetchQueries({ queryKey: ['employees'] });

      toast.success('Compte d\'accès supprimé avec succès');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la suppression du compte d\'accès');
    },
  });
}
