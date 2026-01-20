# Guide d'utilisation du système RBAC Frontend

Ce document explique comment utiliser le système de contrôle d'accès basé sur les rôles (RBAC) dans le frontend de PointageFlex.

## Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Composants disponibles](#composants-disponibles)
3. [Protection des pages](#protection-des-pages)
4. [Protection des actions UI](#protection-des-actions-ui)
5. [Vérification des permissions dans le code](#vérification-des-permissions-dans-le-code)
6. [Mapping menu → permissions](#mapping-menu--permissions)
7. [Exemples pratiques](#exemples-pratiques)

## Vue d'ensemble

Le système RBAC frontend utilise :
- **AuthContext** : Contexte React qui gère les permissions de l'utilisateur connecté
- **PermissionGate** : Composant pour masquer/afficher conditionnellement des éléments UI
- **ProtectedRoute** : Composant pour protéger les pages entières
- **Utilitaires** : Fonctions helper pour vérifier les permissions dans le code

## Composants disponibles

### 1. AuthContext

Le contexte `AuthContext` est automatiquement fourni à toute l'application via `AuthProvider` dans le layout principal.

```tsx
import { useAuth } from '@/contexts/AuthContext';

function MyComponent() {
  const { 
    user,           // Utilisateur actuel
    permissions,    // Liste des permissions
    roles,          // Liste des rôles RBAC
    hasPermission,  // Vérifie une permission
    hasAnyPermission, // Vérifie au moins une permission
    hasAllPermissions, // Vérifie toutes les permissions
    hasRole,        // Vérifie un rôle
    hasAnyRole      // Vérifie au moins un rôle
  } = useAuth();
  
  // Utilisation...
}
```

### 2. PermissionGate

Composant pour conditionner l'affichage d'éléments UI selon les permissions.

```tsx
import { PermissionGate } from '@/components/auth/PermissionGate';

// Exemple 1 : Permission unique
<PermissionGate permission="employee.create">
  <Button>Créer un employé</Button>
</PermissionGate>

// Exemple 2 : Plusieurs permissions (au moins une requise)
<PermissionGate permissions={['employee.view_all', 'employee.view_team']}>
  <Button>Voir les employés</Button>
</PermissionGate>

// Exemple 3 : Toutes les permissions requises
<PermissionGate 
  permissions={['employee.view', 'employee.update']} 
  requireAll
>
  <Button>Modifier</Button>
</PermissionGate>

// Exemple 4 : Avec fallback
<PermissionGate 
  permission="employee.delete"
  fallback={<span className="text-gray-400">Accès refusé</span>}
  showFallback
>
  <Button>Supprimer</Button>
</PermissionGate>
```

### 3. ProtectedRoute

Composant pour protéger les pages entières.

```tsx
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

export default function EmployeesPage() {
  return (
    <ProtectedRoute permission="employee.view_all">
      <DashboardLayout>
        {/* Contenu de la page */}
      </DashboardLayout>
    </ProtectedRoute>
  );
}
```

## Protection des pages

Pour protéger une page, enveloppez son contenu avec `ProtectedRoute` :

```tsx
'use client';

import { ProtectedRoute } from '@/components/auth/PermissionGate';
import { DashboardLayout } from '@/components/layout/dashboard-layout';

export default function MyPage() {
  return (
    <ProtectedRoute 
      permission="employee.view_all"
      // ou permissions={['permission1', 'permission2']}
      // ou requireAll={true} pour exiger toutes les permissions
    >
      <DashboardLayout title="Ma Page">
        {/* Contenu */}
      </DashboardLayout>
    </ProtectedRoute>
  );
}
```

Si l'utilisateur n'a pas la permission requise, il sera automatiquement redirigé vers `/403`.

## Protection des actions UI

Utilisez `PermissionGate` pour protéger les boutons, formulaires, et autres actions :

```tsx
import { PermissionGate } from '@/components/auth/PermissionGate';

function EmployeesList() {
  return (
    <div>
      <PermissionGate permission="employee.create">
        <Button onClick={handleCreate}>Créer un employé</Button>
      </PermissionGate>
      
      <PermissionGate permission="employee.delete">
        <Button onClick={handleDelete} variant="danger">
          Supprimer
        </Button>
      </PermissionGate>
      
      <PermissionGate permissions={['employee.export', 'employee.view_all']}>
        <Button onClick={handleExport}>Exporter</Button>
      </PermissionGate>
    </div>
  );
}
```

## Vérification des permissions dans le code

Utilisez le hook `useAuth` pour vérifier les permissions dans votre logique :

```tsx
import { useAuth } from '@/contexts/AuthContext';

function MyComponent() {
  const { hasPermission, hasAnyPermission } = useAuth();
  
  const handleAction = () => {
    if (hasPermission('employee.create')) {
      // Faire quelque chose
    }
  };
  
  // Ou avec plusieurs permissions
  if (hasAnyPermission(['employee.view_all', 'employee.view_team'])) {
    // Afficher quelque chose
  }
}
```

Vous pouvez aussi utiliser les utilitaires directement :

```tsx
import { hasPermission, hasAnyPermission } from '@/lib/utils/auth';

if (hasPermission('employee.create')) {
  // Faire quelque chose
}
```

## Mapping menu → permissions

Le sidebar filtre automatiquement les items de menu selon les permissions. Voici le mapping actuel :

| Menu | Permissions Requises |
|------|----------------------|
| Tableau de bord | Public (tous) |
| Employés | `employee.view_all` ou `employee.view_own` ou `employee.view_team` |
| Pointages | `attendance.view_all` ou `attendance.view_own` ou `attendance.view_team` |
| Shifts & Planning | `schedule.view_all` ou `schedule.view_own` ou `schedule.view_team` |
| Alertes de Conformité | `attendance.view_anomalies` |
| Équipes | `employee.view_team` |
| Structure RH | `tenant.manage_departments` ou `tenant.manage_positions` ou `tenant.manage_teams` |
| Congés & Absences | `leave.view_all` ou `leave.view_own` ou `leave.view_team` |
| Heures supplémentaires | `overtime.view_all` ou `overtime.view_own` |
| Terminaux | `tenant.manage_devices` |
| Rapports | `reports.view_all` ou `reports.view_attendance` ou `reports.view_leaves` ou `reports.view_overtime` |
| Audit | `audit.view_all` |
| Gestion des accès | `role.view_all` |
| Paramètres | `tenant.view_settings` ou `tenant.update_settings` |
| Profil | Public (tous) |

## Exemples pratiques

### Exemple 1 : Page avec actions protégées

```tsx
'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';

export default function EmployeesPage() {
  return (
    <ProtectedRoute permissions={['employee.view_all', 'employee.view_own']}>
      <DashboardLayout title="Employés">
        <div className="space-y-4">
          <div className="flex justify-end">
            <PermissionGate permission="employee.create">
              <Button>Créer un employé</Button>
            </PermissionGate>
          </div>
          
          {/* Liste des employés */}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
```

### Exemple 2 : Tableau avec actions conditionnelles

```tsx
function EmployeeTable({ employees }) {
  const { hasPermission } = useAuth();
  
  return (
    <table>
      <tbody>
        {employees.map(employee => (
          <tr key={employee.id}>
            <td>{employee.name}</td>
            <td>
              <div className="flex gap-2">
                <PermissionGate permission="employee.update">
                  <Button size="sm" onClick={() => edit(employee.id)}>
                    Modifier
                  </Button>
                </PermissionGate>
                
                <PermissionGate permission="employee.delete">
                  <Button 
                    size="sm" 
                    variant="danger"
                    onClick={() => delete(employee.id)}
                  >
                    Supprimer
                  </Button>
                </PermissionGate>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

### Exemple 3 : Formulaire avec champs conditionnels

```tsx
function EmployeeForm() {
  const { hasPermission } = useAuth();
  
  return (
    <form>
      <input name="firstName" />
      <input name="lastName" />
      
      <PermissionGate permission="employee.update_salary">
        <input name="salary" type="number" />
      </PermissionGate>
      
      <PermissionGate permission="employee.update_role">
        <select name="role">
          {/* Options */}
        </select>
      </PermissionGate>
    </form>
  );
}
```

## Notes importantes

1. **SUPER_ADMIN** : Les utilisateurs avec le rôle `SUPER_ADMIN` ont automatiquement accès à toutes les permissions.

2. **Performance** : Les permissions sont chargées une fois au login et stockées dans le contexte React. Pas besoin de refaire des appels API.

3. **Sécurité** : La protection frontend est une **couche de sécurité UX**. La sécurité réelle doit toujours être implémentée côté backend. Le backend vérifie les permissions à chaque requête API.

4. **Mise à jour des permissions** : Si les permissions d'un utilisateur changent, il doit se reconnecter pour que les nouvelles permissions soient prises en compte.

5. **Page 403** : Si un utilisateur tente d'accéder à une page protégée sans les permissions, il est redirigé vers `/403`.

## Dépannage

### Les permissions ne sont pas chargées

Vérifiez que :
- L'utilisateur est bien connecté
- Le backend retourne les permissions dans la réponse de login
- Le `AuthProvider` est bien enveloppé dans le layout principal

### Les éléments ne s'affichent pas

Vérifiez que :
- La permission utilisée existe dans la base de données
- L'utilisateur a bien cette permission assignée à son rôle
- Le code de permission est exact (sensible à la casse)

### Redirection infinie

Si vous êtes redirigé en boucle vers `/403`, vérifiez que :
- La page n'exige pas une permission que l'utilisateur n'a pas
- Le `ProtectedRoute` est correctement configuré

## Support

Pour toute question ou problème, consultez la documentation backend RBAC dans `docs/RBAC_MULTI_TENANT.md`.

