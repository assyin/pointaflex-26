'use client';

import React, { useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { isAuthenticated } from '@/lib/utils/auth';
import { isTokenRefreshing } from '@/lib/api/client';

interface ProtectedRouteProps {
  children: ReactNode;
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  redirectTo?: string;
}

/**
 * Composant pour protéger les routes selon les permissions
 * Redirige vers /403 ou la route spécifiée si l'utilisateur n'a pas les permissions
 * 
 * @example
 * // Protéger une page avec une permission
 * <ProtectedRoute permission="employee.view_all">
 *   <EmployeesPage />
 * </ProtectedRoute>
 * 
 * @example
 * // Protéger avec plusieurs permissions (au moins une requise)
 * <ProtectedRoute permissions={['employee.view_all', 'employee.view_team']}>
 *   <EmployeesPage />
 * </ProtectedRoute>
 */
export function ProtectedRoute({
  children,
  permission,
  permissions,
  requireAll = false,
  redirectTo = '/403',
}: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { hasPermission, hasAnyPermission, hasAllPermissions, isLoading } = useAuth();

  useEffect(() => {
    // Attendre que le contexte soit chargé
    if (isLoading) return;

    // Vérifier l'authentification — ne pas rediriger si un refresh token est en cours
    if (!isAuthenticated() && !isTokenRefreshing()) {
      router.push(`/login?redirect=${encodeURIComponent(pathname || '/')}`);
      return;
    }

    // Vérifier les permissions
    let hasAccess = false;

    if (permission) {
      hasAccess = hasPermission(permission);
    } else if (permissions && permissions.length > 0) {
      if (requireAll) {
        hasAccess = hasAllPermissions(permissions);
      } else {
        hasAccess = hasAnyPermission(permissions);
      }
    } else {
      // Si aucune permission n'est spécifiée, autoriser l'accès
      hasAccess = true;
    }

    if (!hasAccess) {
      router.push(redirectTo);
    }
  }, [router, hasPermission, hasAnyPermission, hasAllPermissions, permission, permissions, requireAll, redirectTo, isLoading]);

  // Afficher un loader pendant le chargement
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-text-secondary">Chargement...</p>
        </div>
      </div>
    );
  }

  // Vérifier les permissions avant de rendre
  let hasAccess = false;

  if (permission) {
    hasAccess = hasPermission(permission);
  } else if (permissions && permissions.length > 0) {
    if (requireAll) {
      hasAccess = hasAllPermissions(permissions);
    } else {
      hasAccess = hasAnyPermission(permissions);
    }
  } else {
    hasAccess = true;
  }

  if (!hasAccess) {
    return null; // Le useEffect redirigera
  }

  return <>{children}</>;
}

