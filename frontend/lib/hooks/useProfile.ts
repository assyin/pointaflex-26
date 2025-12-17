import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { profileApi, type UpdateProfileDto, type ChangePasswordDto, type UserPreferences } from '../api/profile';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: () => profileApi.getProfile(),
    staleTime: 30000, // 30 seconds
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { user, setUser } = useAuth();

  return useMutation({
    mutationFn: (data: UpdateProfileDto) => profileApi.updateProfile(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      // Mettre à jour l'utilisateur dans le contexte si l'avatar a changé
      if (user && data?.avatar !== undefined) {
        setUser({ ...user, avatar: data.avatar });
      }
      toast.success('Profil mis à jour avec succès');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la mise à jour du profil');
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (data: ChangePasswordDto) => profileApi.changePassword(data),
    onSuccess: () => {
      toast.success('Mot de passe modifié avec succès');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors du changement de mot de passe');
    },
  });
}

export function usePreferences() {
  return useQuery({
    queryKey: ['preferences'],
    queryFn: () => profileApi.getPreferences(),
    staleTime: 60000, // 1 minute
  });
}

export function useUpdatePreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<UserPreferences>) => profileApi.updatePreferences(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preferences'] });
      toast.success('Préférences mises à jour avec succès');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la mise à jour des préférences');
    },
  });
}

export function useSessions() {
  return useQuery({
    queryKey: ['sessions'],
    queryFn: () => profileApi.getSessions(),
    staleTime: 60000, // 1 minute
  });
}

export function useRevokeSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: string) => profileApi.revokeSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      toast.success('Session révoquée avec succès');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la révocation de la session');
    },
  });
}

export function useProfileStats() {
  return useQuery({
    queryKey: ['profile-stats'],
    queryFn: () => profileApi.getStats(),
    staleTime: 300000, // 5 minutes
  });
}

export function useExportUserData() {
  return useMutation({
    mutationFn: () => profileApi.exportData(),
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `mes-donnees-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Données téléchargées avec succès');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erreur lors de l\'export');
    },
  });
}

export function useUploadAvatar() {
  const queryClient = useQueryClient();
  const { user, setUser } = useAuth();

  return useMutation({
    mutationFn: (file: File) => profileApi.uploadAvatar(file),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      // Mettre à jour l'avatar dans le contexte utilisateur
      if (user && data?.avatar !== undefined) {
        setUser({ ...user, avatar: data.avatar });
      }
      toast.success('Photo de profil mise à jour avec succès');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erreur lors de l\'upload de la photo');
    },
  });
}

export function useRemoveAvatar() {
  const queryClient = useQueryClient();
  const { user, setUser } = useAuth();

  return useMutation({
    mutationFn: () => profileApi.removeAvatar(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      // Mettre à jour l'avatar dans le contexte utilisateur
      if (user) {
        setUser({ ...user, avatar: data?.avatar || undefined });
      }
      toast.success('Photo de profil supprimée avec succès');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erreur lors de la suppression de la photo');
    },
  });
}
