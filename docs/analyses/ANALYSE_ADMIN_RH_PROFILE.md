# 📊 Analyse du Profil ADMIN_RH - Permissions et Interfaces

## 🎯 Objectif
Vérifier et analyser les permissions et interfaces accessibles pour le profil ADMIN_RH (Administrateur RH), de la même manière que pour EMPLOYEE et MANAGER.

---

## 📋 Permissions du Rôle ADMIN_RH

D'après `backend/scripts/init-rbac.ts`, le rôle ADMIN_RH a les permissions suivantes :

### ✅ Permissions Assignées

```typescript
ADMIN_RH: [
  // Employés - Gestion complète
  'employee.view_all',
  'employee.create',
  'employee.update',
  'employee.delete',
  'employee.import',
  'employee.export',
  'employee.manage_biometric',
  
  // Pointages - Gestion complète
  'attendance.view_all',
  'attendance.create',
  'attendance.edit',
  'attendance.correct',
  'attendance.delete',
  'attendance.import',
  'attendance.export',
  'attendance.view_anomalies',
  
  // Plannings - Gestion complète
  'schedule.view_all',
  'schedule.create',
  'schedule.update',
  'schedule.delete',
  'schedule.manage_team',
  'schedule.approve_replacement',
  
  // Shifts - Gestion complète
  'shift.view_all',
  'shift.create',
  'shift.update',
  'shift.delete',
  
  // Congés - Gestion complète
  'leave.view_all',
  'leave.approve',
  'leave.reject',
  'leave.manage_types',
  
  // Heures supplémentaires
  'overtime.view_all',
  'overtime.approve',
  'recovery.view',
  
  // Rapports - Accès complet
  'reports.view_all',
  'reports.view_attendance',
  'reports.view_leaves',
  'reports.view_overtime',
  'reports.export',
  'reports.view_payroll',
  
  // Utilisateurs & Rôles - Gestion complète
  'user.view_all',
  'user.create',
  'user.update',
  'user.delete',
  'user.view_roles',
  'user.assign_roles',
  'user.remove_roles',
  'role.view_all',
  'role.create',
  'role.update',
  'role.delete',
  
  // Paramètres Tenant - Gestion complète
  'tenant.view_settings',
  'tenant.update_settings',
  'tenant.manage_sites',
  'tenant.manage_departments',
  'tenant.manage_positions',
  'tenant.manage_teams',
  'tenant.manage_holidays',
  'tenant.manage_devices',
  
  // Audit
  'audit.view_all',
]
```

### ❌ Permissions NON Assignées (Intentionnel ou Problème ?)

- `employee.view_own` - Ne peut pas voir ses propres informations (problème potentiel)
- `attendance.view_own` - Ne peut pas voir ses propres pointages (problème potentiel)
- `schedule.view_own` - Ne peut pas voir son propre planning (problème potentiel)
- `leave.view_own` - Ne peut pas voir ses propres congés (problème potentiel)
- `leave.create` - Ne peut pas créer de demandes de congés pour lui-même (problème potentiel)
- `leave.update` - Ne peut pas modifier ses propres demandes de congés (problème potentiel)
- `overtime.view_own` - Ne peut pas voir ses propres heures sup (problème potentiel)

**Note** : ADMIN_RH a `view_all` pour la plupart des ressources, donc il peut techniquement voir ses propres données via `view_all`. Cependant, il serait plus cohérent d'avoir aussi `view_own` pour la clarté et la cohérence avec les autres rôles.

---

## 🔍 Analyse des Interfaces Frontend

### ✅ Pages Accessibles (selon les permissions)

#### 1. **Dashboard** (`/dashboard`)
- **Permission requise** : Aucune (page publique)
- **Statut** : ✅ Accessible
- **Actions disponibles** : Voir toutes les statistiques

#### 2. **Employés** (`/employees`)
- **Permission requise** : `employee.view_all` OU `employee.view_own` OU `employee.view_team`
- **Permission ADMIN_RH** : ✅ `employee.view_all`
- **Statut** : ✅ Accessible
- **Actions disponibles** :
  - ✅ Voir tous les employés
  - ✅ Créer un employé (`employee.create`)
  - ✅ Modifier un employé (`employee.update`)
  - ✅ Supprimer un employé (`employee.delete`)
  - ✅ Importer/Exporter (`employee.import`, `employee.export`)

#### 3. **Pointages** (`/attendance`)
- **Permission requise** : `attendance.view_all` OU `attendance.view_own` OU `attendance.view_team`
- **Permission ADMIN_RH** : ✅ `attendance.view_all`
- **Statut** : ✅ Accessible
- **Actions disponibles** :
  - ✅ Voir tous les pointages
  - ✅ Créer/Modifier/Corriger/Supprimer des pointages
  - ✅ Voir les anomalies (`attendance.view_anomalies`)
  - ✅ Exporter (`attendance.export`)

#### 4. **Shifts & Planning** (`/shifts-planning`)
- **Permission requise** : `schedule.view_all` OU `schedule.view_own` OU `schedule.view_team`
- **Permission ADMIN_RH** : ✅ `schedule.view_all`
- **Statut** : ✅ Accessible
- **Actions disponibles** :
  - ✅ Voir tous les plannings
  - ✅ Créer/Modifier/Supprimer des plannings
  - ✅ Gérer les équipes (`schedule.manage_team`)
  - ✅ Approuver les remplacements (`schedule.approve_replacement`)

#### 5. **Congés** (`/leaves`)
- **Permission requise** : `leave.view_all` OU `leave.view_own` OU `leave.view_team`
- **Permission ADMIN_RH** : ✅ `leave.view_all`
- **Statut** : ✅ Accessible
- **Actions disponibles** :
  - ✅ Voir tous les congés
  - ✅ Approuver/Refuser les congés (`leave.approve`, `leave.reject`)
  - ✅ Gérer les types de congés (`leave.manage_types`)
  - ❌ Créer une demande pour lui-même (`leave.create` - NON assigné)
  - ❌ Modifier ses propres demandes (`leave.update` - NON assigné)

#### 6. **Heures Supplémentaires** (`/overtime`)
- **Permission requise** : `overtime.view_all` OU `overtime.view_own`
- **Permission ADMIN_RH** : ✅ `overtime.view_all`
- **Statut** : ✅ Accessible
- **Actions disponibles** :
  - ✅ Voir toutes les heures sup
  - ✅ Approuver des heures sup (`overtime.approve`)

#### 7. **Rapports** (`/reports`)
- **Permission requise** : `reports.view_all` OU `reports.view_attendance` OU `reports.view_leaves` OU `reports.view_overtime`
- **Permission ADMIN_RH** : ✅ `reports.view_all`
- **Statut** : ✅ Accessible
- **Actions disponibles** :
  - ✅ Voir tous les rapports
  - ✅ Exporter des rapports (`reports.export`)
  - ✅ Voir les exports paie (`reports.view_payroll`)

#### 8. **RBAC** (`/rbac`)
- **Permission requise** : `role.view_all`
- **Permission ADMIN_RH** : ✅ `role.view_all`
- **Statut** : ✅ Accessible
- **Actions disponibles** :
  - ✅ Voir tous les rôles
  - ✅ Créer/Modifier/Supprimer des rôles (`role.create`, `role.update`, `role.delete`)
  - ✅ Gérer les permissions des rôles

#### 9. **Paramètres** (`/settings`)
- **Permission requise** : `tenant.view_settings` OU `tenant.update_settings`
- **Permission ADMIN_RH** : ✅ `tenant.view_settings`, `tenant.update_settings`
- **Statut** : ✅ Accessible
- **Actions disponibles** :
  - ✅ Voir les paramètres
  - ✅ Modifier les paramètres
  - ✅ Gérer les sites (`tenant.manage_sites`)
  - ✅ Gérer les jours fériés (`tenant.manage_holidays`)

#### 10. **Structure RH** (`/structure-rh`)
- **Permission requise** : `tenant.manage_departments` OU `tenant.manage_positions`
- **Permission ADMIN_RH** : ✅ `tenant.manage_departments`, `tenant.manage_positions`
- **Statut** : ✅ Accessible
- **Actions disponibles** :
  - ✅ Gérer les départements
  - ✅ Gérer les fonctions/postes

#### 11. **Équipes** (`/teams`)
- **Permission requise** : `tenant.manage_teams` OU `employee.view_team`
- **Permission ADMIN_RH** : ✅ `tenant.manage_teams`
- **Statut** : ✅ Accessible
- **Actions disponibles** :
  - ✅ Gérer les équipes

#### 12. **Terminaux** (`/terminals`)
- **Permission requise** : `tenant.manage_devices`
- **Permission ADMIN_RH** : ✅ `tenant.manage_devices`
- **Statut** : ✅ Accessible
- **Actions disponibles** :
  - ✅ Gérer les terminaux biométriques

#### 13. **Audit** (`/audit`)
- **Permission requise** : `audit.view_all`
- **Permission ADMIN_RH** : ✅ `audit.view_all`
- **Statut** : ✅ Accessible
- **Actions disponibles** :
  - ✅ Voir tous les logs d'audit

#### 14. **Profil** (`/profile`)
- **Permission requise** : Aucune (page publique)
- **Statut** : ✅ Accessible
- **Actions disponibles** :
  - ✅ Modifier son profil (nom, prénom, téléphone, email)
  - ✅ Changer son mot de passe
  - ✅ Gérer ses préférences
  - ✅ Voir ses statistiques

### ❌ Pages NON Accessibles

Aucune page n'est inaccessible pour ADMIN_RH (sauf peut-être des pages spécifiques SUPER_ADMIN).

---

## 🔐 Restrictions Spécifiques au ADMIN_RH

### 1. **Modification du Profil**

D'après `backend/src/modules/users/users.service.ts` :

```typescript
// Email : seulement ADMIN_RH et SUPER_ADMIN peuvent modifier
if (dto.email !== undefined) {
  if (currentUserRole !== LegacyRole.ADMIN_RH && currentUserRole !== LegacyRole.SUPER_ADMIN) {
    throw new ConflictException('Seuls les administrateurs RH peuvent modifier l\'email');
  }
  updateData.email = dto.email;
}
```

**Réponse** : ✅ ADMIN_RH peut modifier son nom/prénom/email/téléphone (pas de restriction).

### 2. **Gestion des Utilisateurs**

ADMIN_RH peut :
- ✅ Créer des utilisateurs (`user.create`)
- ✅ Modifier des utilisateurs (`user.update`)
- ✅ Supprimer des utilisateurs (`user.delete`)
- ✅ Assigner/Retirer des rôles (`user.assign_roles`, `user.remove_roles`)

### 3. **Gestion des Rôles**

ADMIN_RH peut :
- ✅ Créer des rôles personnalisés (`role.create`)
- ✅ Modifier des rôles (`role.update`)
- ✅ Supprimer des rôles (`role.delete`)
- ✅ Gérer les permissions des rôles

### 4. **Gestion des Congés**

ADMIN_RH peut :
- ✅ Voir tous les congés
- ✅ Approuver/Refuser les congés
- ✅ Gérer les types de congés
- ❌ Créer des demandes de congés pour lui-même (`leave.create` non assigné)
- ❌ Modifier ses propres demandes (`leave.update` non assigné)

**⚠️ PROBLÈME IDENTIFIÉ** : ADMIN_RH ne peut pas créer de demandes de congés pour lui-même car `leave.create` n'est pas assigné. Il devrait avoir `leave.view_own`, `leave.create`, et `leave.update` pour gérer ses propres congés.

---

## 🎨 Analyse du Menu Sidebar

D'après `frontend/components/layout/sidebar.tsx`, le menu devrait être filtré selon les permissions.

### Menu Items et Permissions Requises

1. **Dashboard** - Aucune permission requise ✅
2. **Employés** - `employee.view_all` OU `employee.view_own` OU `employee.view_team` ✅
3. **Pointages** - `attendance.view_all` OU `attendance.view_own` OU `attendance.view_team` ✅
4. **Shifts & Planning** - `schedule.view_all` OU `schedule.view_own` OU `schedule.view_team` ✅
5. **Alertes de Conformité** - `attendance.view_anomalies` ✅
6. **Équipes** - `employee.view_team` OU `tenant.manage_teams` ✅
7. **Structure RH** - `tenant.manage_departments` OU `tenant.manage_positions` OU `tenant.manage_teams` ✅
8. **Congés** - `leave.view_all` OU `leave.view_own` OU `leave.view_team` ✅
9. **Heures Sup** - `overtime.view_all` OU `overtime.view_own` ✅
10. **Terminaux** - `tenant.manage_devices` ✅
11. **Rapports** - `reports.view_all` OU `reports.view_attendance` OU `reports.view_leaves` OU `reports.view_overtime` ✅
12. **Audit** - `audit.view_all` ✅
13. **RBAC** - `role.view_all` ✅
14. **Paramètres** - `tenant.view_settings` OU `tenant.update_settings` ✅
15. **Profil** - Aucune permission requise ✅

**Résultat** : ✅ Tous les items du menu sont accessibles pour ADMIN_RH.

---

## ⚠️ Problèmes Identifiés

### 1. **ADMIN_RH ne peut pas créer de demandes de congés pour lui-même**

**Problème** : ADMIN_RH a `leave.view_all`, `leave.approve`, `leave.reject`, `leave.manage_types`, mais pas `leave.view_own`, `leave.create`, ni `leave.update`.

**Impact** : Un ADMIN_RH ne peut pas demander de congés pour lui-même.

**Solution** : Ajouter `leave.view_own`, `leave.create`, et `leave.update` aux permissions du ADMIN_RH.

### 2. **Permissions `view_own` manquantes pour cohérence**

**Problème** : ADMIN_RH a `view_all` pour la plupart des ressources, mais pas `view_own`. Bien que `view_all` permette techniquement de voir ses propres données, il serait plus cohérent d'avoir aussi `view_own` pour :
- La clarté du code
- La cohérence avec les autres rôles
- La possibilité de filtrer spécifiquement ses propres données

**Impact** : Faible, mais manque de cohérence.

**Solution** : Ajouter `employee.view_own`, `attendance.view_own`, `schedule.view_own`, `overtime.view_own` aux permissions du ADMIN_RH.

### 3. **Vérification des actions protégées**

**Problème** : Certaines actions dans les pages pourraient ne pas être protégées par `PermissionGate`.

**Impact** : Des boutons pourraient être visibles même sans les bonnes permissions.

**Solution** : Vérifier et protéger toutes les actions avec `PermissionGate`.

---

## ✅ Recommandations

### 1. **Ajouter des permissions manquantes au ADMIN_RH**

```typescript
ADMIN_RH: [
  // ... permissions existantes ...
  'employee.view_own',              // Voir ses propres informations (cohérence)
  'attendance.view_own',            // Voir ses propres pointages (cohérence)
  'schedule.view_own',              // Voir son propre planning (cohérence)
  'leave.view_own',                 // Voir ses propres congés
  'leave.create',                   // Créer des demandes de congés
  'leave.update',                   // Modifier ses propres demandes de congés
  'overtime.view_own',              // Voir ses propres heures sup (cohérence)
]
```

### 2. **Vérifier les actions protégées**

- S'assurer que tous les boutons "Créer", "Modifier", "Supprimer" sont protégés par `PermissionGate`
- Vérifier que les exports sont protégés
- Vérifier que les imports sont protégés

### 3. **Vérifier les restrictions backend**

- Vérifier que ADMIN_RH peut modifier son propre profil sans restrictions
- Vérifier que ADMIN_RH peut créer/modifier/supprimer des utilisateurs
- Vérifier que ADMIN_RH peut gérer les rôles et permissions

---

## 📝 Checklist de Vérification

### Backend
- [ ] Vérifier que les permissions du ADMIN_RH sont correctes dans `init-rbac.ts`
- [ ] Vérifier que ADMIN_RH peut modifier son profil sans restrictions
- [ ] Vérifier que ADMIN_RH peut gérer les utilisateurs et rôles
- [ ] Vérifier que ADMIN_RH peut créer des demandes de congés pour lui-même

### Frontend
- [ ] Vérifier que toutes les pages sont protégées par `ProtectedRoute`
- [ ] Vérifier que les actions sont protégées par `PermissionGate`
- [ ] Vérifier que le menu sidebar filtre correctement selon les permissions
- [ ] Vérifier que ADMIN_RH peut créer des demandes de congés pour lui-même
- [ ] Vérifier que ADMIN_RH peut voir ses propres données

---

## 📊 Comparaison ADMIN_RH vs MANAGER vs EMPLOYEE

| Fonctionnalité | EMPLOYEE | MANAGER | ADMIN_RH |
|----------------|----------|---------|----------|
| Voir ses propres données | ✅ | ✅ | ⚠️ (via view_all) |
| Voir les données de son équipe | ❌ | ✅ | ✅ (via view_all) |
| Voir toutes les données | ❌ | ❌ | ✅ |
| Créer des employés | ❌ | ❌ | ✅ |
| Modifier des employés | ❌ | ❌ | ✅ |
| Supprimer des employés | ❌ | ❌ | ✅ |
| Créer des demandes de congés | ✅ | ✅ | ❌ (à corriger) |
| Approuver des congés | ❌ | ✅ | ✅ |
| Gérer les rôles | ❌ | ❌ | ✅ |
| Modifier les paramètres tenant | ❌ | ❌ | ✅ |
| Modifier nom/prénom | ❌ | ✅ | ✅ |
| Modifier email | ❌ | ❌ | ✅ |

---

**Date de création** : 2025-12-11
**Version** : 1.0

