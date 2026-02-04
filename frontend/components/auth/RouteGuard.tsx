'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface RouteGuardProps {
  children: React.ReactNode;
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent mb-4"></div>
        <p className="text-text-secondary">Vérification de l'authentification...</p>
      </div>
    </div>
  );
}

function RouteGuardInner({ children }: RouteGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, isLoading } = useAuth();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const publicRoutes = ['/login', '/register', '/forgot-password', '/reset-password'];
    const isPublicRoute = publicRoutes.some(route => pathname?.startsWith(route));

    if (isLoading) {
      setIsAuthorized(false);
      return;
    }

    if (user && pathname === '/login') {
      const redirect = searchParams?.get('redirect');
      router.push(redirect && redirect !== '/login' ? redirect : '/dashboard');
      setIsAuthorized(false);
      return;
    }

    if (isPublicRoute) {
      setIsAuthorized(true);
      return;
    }

    if (user) {
      setIsAuthorized(true);
      return;
    }

    router.push(`/login?redirect=${encodeURIComponent(pathname || '/')}`);
    setIsAuthorized(false);
  }, [user, isLoading, pathname, router, searchParams]);

  if (isLoading || !isAuthorized) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
}

/**
 * RouteGuard - Composant de protection des routes côté client
 * Vérifie l'authentification et redirige vers /login si nécessaire
 */
export function RouteGuard({ children }: RouteGuardProps) {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <RouteGuardInner>{children}</RouteGuardInner>
    </Suspense>
  );
}
