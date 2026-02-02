/**
 * Vérifie si l'utilisateur est authentifié et si le token est valide
 */
export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  
  const token = localStorage.getItem('accessToken');
  if (!token) return false;

  // Vérifier si le token JWT est expiré (basique)
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const exp = payload.exp * 1000; // Convertir en millisecondes
    const now = Date.now();
    
    // Si le token est expiré, retourner false
    // NOTE: Ne PAS supprimer le token ici — le mécanisme de refresh token
    // dans client.ts s'en charge automatiquement via le response interceptor
    if (exp < now) {
      return false;
    }
    
    return true;
  } catch (error) {
    // Si le token n'est pas un JWT valide, retourner false
    return false;
  }
}

/**
 * Récupère les informations de l'utilisateur depuis localStorage
 */
export function getCurrentUser(): { role: string; [key: string]: any } | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    return JSON.parse(userStr);
  } catch (error) {
    console.error('Error parsing user from localStorage:', error);
    return null;
  }
}

/**
 * Vérifie si l'utilisateur a un rôle spécifique
 */
export function hasRole(role: string | string[]): boolean {
  const user = getCurrentUser();
  if (!user || !user.role) return false;
  
  if (Array.isArray(role)) {
    return role.includes(user.role);
  }
  
  return user.role === role;
}

/**
 * Vérifie si l'utilisateur peut supprimer des plannings
 * Seuls ADMIN_RH et MANAGER peuvent supprimer des plannings
 */
export function canDeleteSchedule(): boolean {
  return hasRole(['ADMIN_RH', 'MANAGER']);
}

/**
 * Vérifie si l'utilisateur est un administrateur RH
 */
export function isAdminRH(): boolean {
  return hasRole('ADMIN_RH');
}

/**
 * Vérifie si l'utilisateur est un manager
 */
export function isManager(): boolean {
  return hasRole('MANAGER');
}

/**
 * Vérifie si l'utilisateur est un super administrateur
 */
export function isSuperAdmin(): boolean {
  return hasRole('SUPER_ADMIN');
}

/**
 * Récupère les permissions de l'utilisateur depuis localStorage
 */
export function getUserPermissions(): string[] {
  const user = getCurrentUser();
  if (!user || !user.permissions) return [];
  return Array.isArray(user.permissions) ? user.permissions : [];
}

/**
 * Récupère les rôles RBAC de l'utilisateur depuis localStorage
 */
export function getUserRoles(): string[] {
  const user = getCurrentUser();
  if (!user) return [];
  const roles: string[] = [];
  if (user.role) roles.push(user.role); // Legacy role
  if (user.roles && Array.isArray(user.roles)) {
    roles.push(...user.roles);
  }
  return Array.from(new Set(roles)); // Remove duplicates
}

/**
 * Vérifie si l'utilisateur a une permission spécifique (RBAC)
 */
export function hasPermission(permission: string): boolean {
  const user = getCurrentUser();
  if (!user) return false;
  
  // SUPER_ADMIN a tous les accès
  if (user.role === 'SUPER_ADMIN' || (user.roles && user.roles.includes('SUPER_ADMIN'))) {
    return true;
  }
  
  const permissions = getUserPermissions();
  return permissions.includes(permission);
}

/**
 * Vérifie si l'utilisateur a au moins une des permissions spécifiées (RBAC)
 */
export function hasAnyPermission(permissions: string[]): boolean {
  const user = getCurrentUser();
  if (!user) return false;
  
  // SUPER_ADMIN a tous les accès
  if (user.role === 'SUPER_ADMIN' || (user.roles && user.roles.includes('SUPER_ADMIN'))) {
    return true;
  }
  
  const userPermissions = getUserPermissions();
  return permissions.some((perm) => userPermissions.includes(perm));
}

/**
 * Vérifie si l'utilisateur a toutes les permissions spécifiées (RBAC)
 */
export function hasAllPermissions(permissions: string[]): boolean {
  const user = getCurrentUser();
  if (!user) return false;
  
  // SUPER_ADMIN a tous les accès
  if (user.role === 'SUPER_ADMIN' || (user.roles && user.roles.includes('SUPER_ADMIN'))) {
    return true;
  }
  
  const userPermissions = getUserPermissions();
  return permissions.every((perm) => userPermissions.includes(perm));
}

