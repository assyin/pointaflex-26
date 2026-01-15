'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface RouteGuardProps {
  children: React.ReactNode;
}

/**
 * RouteGuard - Composant de protection des routes côté client
 * Vérifie l'authentification et redirige vers /login si nécessaire
 */
export function RouteGuard({ children }: RouteGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading } = useAuth();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    // Routes publiques qui ne nécessitent pas d'authentification
    const publicRoutes = ['/login', '/register', '/forgot-password', '/reset-password'];
    const isPublicRoute = publicRoutes.some(route => pathname?.startsWith(route));

    // Attendre que le loading soit terminé
    if (isLoading) {
      setIsAuthorized(false);
      return;
    }

    // Si utilisateur connecté essaie d'accéder à /login, rediriger vers dashboard
    if (user && pathname === '/login') {
      router.push('/dashboard');
      setIsAuthorized(false);
      return;
    }

    // Si utilisateur connecté essaie d'accéder à d'autres routes publiques, autoriser
    if (user && isPublicRoute) {
      setIsAuthorized(true);
      return;
    }

    // Si pas d'utilisateur et sur une route publique, autoriser l'accès
    if (!user && isPublicRoute) {
      setIsAuthorized(true);
      return;
    }

    // Si pas d'utilisateur et pas sur une route publique, rediriger vers login
    if (!user && !isPublicRoute) {
      router.push(`/login?redirect=${pathname}`);
      setIsAuthorized(false);
      return;
    }

    // Utilisateur authentifié sur route protégée, autoriser l'accès
    setIsAuthorized(true);
  }, [user, isLoading, pathname, router]);

  // Afficher un loader pendant la vérification
  if (isLoading || !isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent mb-4"></div>
          <p className="text-text-secondary">Vérification de l'authentification...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
