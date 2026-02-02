import axios from 'axios';
import { isAuthenticated } from '../utils/auth';

// Déterminer l'URL de l'API automatiquement
const getApiUrl = () => {
  // Si défini dans les variables d'environnement, l'utiliser
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  
  // Sinon, détecter automatiquement selon l'environnement
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;

    // Si on accède via IP WSL (172.17.x.x), utiliser cette IP pour l'API
    if (hostname.startsWith('172.17.')) {
      return `http://${hostname}:3000/api/v1`;
    }

    // Si on accède via localhost, utiliser localhost
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:3000/api/v1';
    }

    // Par défaut, utiliser l'IP WSL la plus courante
    return 'http://172.17.112.163:3000/api/v1';
  }
  
  // Par défaut pour SSR - utiliser l'IP WSL
  return 'http://172.17.112.163:3000/api/v1';
};

// Obtenir l'URL de l'API
let apiBaseURL = getApiUrl();

// Si on est côté client et que l'URL est encore localhost, forcer la détection
if (typeof window !== 'undefined') {
  const currentHostname = window.location.hostname;
  if (apiBaseURL.includes('localhost') && currentHostname.startsWith('172.17.')) {
    apiBaseURL = `http://${currentHostname}:3000/api/v1`;
  }
}

// Créer l'instance axios avec un interceptor pour mettre à jour l'URL si nécessaire
const apiClient = axios.create({
  baseURL: apiBaseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor pour ajouter le token et corriger l'URL si nécessaire
apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      // Corriger l'URL si on accède via IP WSL mais que l'URL de base est localhost
      const currentHostname = window.location.hostname;
      if (currentHostname.startsWith('172.17.') && config.baseURL?.includes('localhost')) {
        config.baseURL = `http://${currentHostname}:3000/api/v1`;
      }

      // Vérifier si le token est valide avant d'envoyer la requête
      const isAuthRoute = config.url?.includes('/auth/login') ||
                          config.url?.includes('/auth/register') ||
                          config.url?.includes('/auth/refresh');

      const authStatus = isAuthenticated();
      const hasRefreshToken = !!localStorage.getItem('refreshToken');

      if (!authStatus && !isAuthRoute && !hasRefreshToken) {
        // Bloquer seulement s'il n'y a pas de refresh token disponible
        // Si un refresh token existe, laisser la requête partir et le response interceptor
        // gèrera le 401 en faisant un refresh automatique
        const silentError: any = Object.create(null);
        silentError.name = '';
        silentError.message = '';
        silentError.stack = '';
        silentError.toString = () => '';
        silentError.config = config;
        silentError.response = { status: 401, statusText: 'Unauthorized', data: {} };
        silentError.isAxiosError = false;
        return Promise.reject(silentError);
      }

      const token = localStorage.getItem('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;

        // Extraire le tenantId directement du JWT pour éviter les désynchronisations avec localStorage
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          if (payload.tenantId) {
            config.headers['X-Tenant-ID'] = payload.tenantId;
            // Synchroniser le localStorage si différent
            const storedTenantId = localStorage.getItem('tenantId');
            if (storedTenantId !== payload.tenantId) {
              localStorage.setItem('tenantId', payload.tenantId);
            }
          }
        } catch (e) {
          // Si on ne peut pas décoder le JWT, utiliser le localStorage comme fallback
          const tenantId = localStorage.getItem('tenantId');
          if (tenantId) {
            config.headers['X-Tenant-ID'] = tenantId;
          }
        }
      } else {
        // Pas de token, utiliser le localStorage comme fallback
        const tenantId = localStorage.getItem('tenantId');
        if (tenantId) {
          config.headers['X-Tenant-ID'] = tenantId;
        }
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Variable globale pour éviter les refresh multiples simultanés
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (error?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

// Response interceptor pour gérer les erreurs et refresh token
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Gérer les erreurs 401
    if (error.response?.status === 401) {
      // Si on est sur une route d'authentification (login/register), retourner l'erreur telle quelle
      const isAuthRoute = originalRequest.url?.includes('/auth/login') ||
                          originalRequest.url?.includes('/auth/register') ||
                          originalRequest.url?.includes('/auth/refresh');

      if (isAuthRoute) {
        // Retourner l'erreur sans la masquer pour que le formulaire de login puisse l'afficher
        return Promise.reject(error);
      }

      // Supprimer l'erreur de la console en créant une erreur silencieuse pour les autres routes
      const silentError: any = Object.create(null);
      silentError.name = '';
      silentError.message = '';
      silentError.stack = '';
      silentError.toString = () => '';
      silentError.response = undefined;
      silentError.config = undefined;
      silentError.request = undefined;
      silentError.isAxiosError = false;

      // Si la requête a déjà été retentée ou si on est sur la page de login, rejeter silencieusement
      if (originalRequest._retry || (typeof window !== 'undefined' && window.location.pathname.includes('/login'))) {
        // Ne pas afficher l'erreur dans la console
        return Promise.reject(silentError);
      }

      if (!originalRequest._retry) {
      // Si on est déjà en train de refresh, ajouter à la queue
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (token) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return apiClient(originalRequest);
            } else {
              return Promise.reject(silentError);
            }
          })
          .catch(() => {
            return Promise.reject(silentError);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      // Vérifier si on a un token
      const accessToken = localStorage.getItem('accessToken');
      const refreshToken = localStorage.getItem('refreshToken');

      // Si pas de token du tout, rediriger vers login
      if (!accessToken && !refreshToken) {
        isRefreshing = false;
        processQueue(new Error('No tokens available'));
        if (typeof window !== 'undefined') {
          // Ne rediriger que si on n'est pas déjà sur la page de login
          if (!window.location.pathname.includes('/login')) {
            localStorage.clear();
            window.location.href = '/login';
          }
        }
        return Promise.reject(silentError);
      }

      // Essayer de refresh le token
      if (refreshToken) {
        try {
          // Utiliser getApiUrl() pour obtenir l'URL correcte
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || getApiUrl();
          const response = await axios.post(
            `${apiUrl}/auth/refresh`,
            { refreshToken },
            {
              // Ne pas utiliser l'intercepteur pour cette requête
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );

          const { accessToken: newAccessToken } = response.data;
          if (newAccessToken) {
            localStorage.setItem('accessToken', newAccessToken);

            // Retry la requête originale
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            isRefreshing = false;
            processQueue(null, newAccessToken);
            return apiClient(originalRequest);
          } else {
            throw new Error('No access token in refresh response');
          }
        } catch (refreshError) {
          // Refresh failed, redirect to login
          isRefreshing = false;
          processQueue(refreshError);
          if (typeof window !== 'undefined') {
            // Ne rediriger que si on n'est pas déjà sur la page de login
            if (!window.location.pathname.includes('/login')) {
              localStorage.clear();
              window.location.href = '/login';
            }
          }
          // Rejeter silencieusement
          return Promise.reject(silentError);
        }
      } else {
        // Pas de refresh token, rediriger vers login
        isRefreshing = false;
        processQueue(new Error('No refresh token available'));
        if (typeof window !== 'undefined') {
          // Ne rediriger que si on n'est pas déjà sur la page de login
          if (!window.location.pathname.includes('/login')) {
            localStorage.clear();
            window.location.href = '/login';
          }
        }
        return Promise.reject(silentError);
      }
      }
    }

    // Pour les autres erreurs, rejeter normalement
    return Promise.reject(error);
  }
);

export default apiClient;
