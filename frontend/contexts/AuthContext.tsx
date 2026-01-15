'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, ReactNode } from 'react';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string; // Legacy role
  tenantId: string;
  roles?: string[]; // RBAC roles
  permissions?: string[]; // RBAC permissions
  avatar?: string; // Avatar image (base64)
}

interface AuthContextType {
  user: User | null;
  permissions: string[];
  roles: string[];
  isLoading: boolean;
  setUser: (user: User | null) => void;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Charger l'utilisateur depuis localStorage au démarrage
    if (typeof window !== 'undefined') {
      try {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const userData = JSON.parse(userStr);
          setUserState(userData);
        }
      } catch (error) {
        console.error('Error loading user from localStorage:', error);
      } finally {
        setIsLoading(false);
      }
    }
  }, []);

  const setUser = useCallback((newUser: User | null) => {
    setUserState(newUser);
    if (newUser && typeof window !== 'undefined') {
      localStorage.setItem('user', JSON.stringify(newUser));
    } else if (typeof window !== 'undefined') {
      localStorage.removeItem('user');
    }
  }, []);

  // Mémoriser les permissions et roles pour éviter les recalculs
  const permissions = useMemo(() => user?.permissions || [], [user?.permissions]);
  const roles = useMemo(() => user?.roles || [], [user?.roles]);

  // Mémoriser les fonctions de vérification des permissions
  const hasPermission = useCallback((permission: string): boolean => {
    if (!user) return false;
    // SUPER_ADMIN a tous les accès
    if (user.role === 'SUPER_ADMIN' || roles.includes('SUPER_ADMIN')) {
      return true;
    }
    return permissions.includes(permission);
  }, [user, roles, permissions]);

  const hasAnyPermission = useCallback((permissionList: string[]): boolean => {
    if (!user) return false;
    // SUPER_ADMIN a tous les accès
    if (user.role === 'SUPER_ADMIN' || roles.includes('SUPER_ADMIN')) {
      return true;
    }
    return permissionList.some((perm) => permissions.includes(perm));
  }, [user, roles, permissions]);

  const hasAllPermissions = useCallback((permissionList: string[]): boolean => {
    if (!user) return false;
    // SUPER_ADMIN a tous les accès
    if (user.role === 'SUPER_ADMIN' || roles.includes('SUPER_ADMIN')) {
      return true;
    }
    return permissionList.every((perm) => permissions.includes(perm));
  }, [user, roles, permissions]);

  const hasRole = useCallback((role: string): boolean => {
    if (!user) return false;
    return user.role === role || roles.includes(role);
  }, [user, roles]);

  const hasAnyRole = useCallback((roleList: string[]): boolean => {
    if (!user) return false;
    return roleList.some((role) => user.role === role || roles.includes(role));
  }, [user, roles]);

  // Mémoriser la valeur du contexte pour éviter les re-renders inutiles
  const contextValue = useMemo(() => ({
    user,
    permissions,
    roles,
    isLoading,
    setUser,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    hasAnyRole,
  }), [user, permissions, roles, isLoading, setUser, hasPermission, hasAnyPermission, hasAllPermissions, hasRole, hasAnyRole]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

