# 📊 Analyse du Profil MANAGER - Permissions et Interfaces

## 🎯 Objectif
Vérifier et analyser les permissions et interfaces accessibles pour le profil MANAGER, de la même manière que pour EMPLOYEE.

---

## 📋 Permissions du Rôle MANAGER

D'après `backend/scripts/init-rbac.ts`, le rôle MANAGER a les permissions suivantes :

### ✅ Permissions Assignées

```typescript
MANAGER: [
  // Employés
  'employee.view_team',              // Voir les employés de son équipe
  
  // Pointages
  'attendance.view_team',             // Voir les pointages de son équipe
  'attendance.view_anomalies',        // Voir les anomalies de pointage
  'attendance.correct',               // Corriger un pointage
  
  // Plannings
  'schedule.view_team',               // Voir le planning de son équipe
  'schedule.manage_team',             // Gérer le planning de son équipe
  'schedule.approve_replacement',     // Approuver un remplacement
  
  // Congés
  'leave.view_team',                  // Voir les congés de son équipe
  'leave.approve',                    // Approuver un congé
  'leave.reject',                     // Refuser un congé
  
  // Heures supplémentaires
  'overtime.view_all',                // Voir toutes les heures sup
  'overtime.approve',                 // Approuver des heures sup
  
  // Rapports
  'reports.view_attendance',          // Voir les rapports de présence
  'reports.view_leaves',              // Voir les rapports de congés
  'reports.view_overtime',            // Voir les rapports d'heures sup
  'reports.export',                   // Exporter des rapports
]
```

### ❌ Permissions NON Assignées (Intentionnel)

- `employee.create` - Ne peut pas créer d'employés
- `employee.update` - Ne peut pas modifier les employés (sauf via plannings)
- `employee.delete` - Ne peut pas supprimer d'employés
- `attendance.create` - Ne peut pas créer de pointages manuellement
- `attendance.edit` - Ne peut pas modifier les pointages (seulement corriger)
- `attendance.delete` - Ne peut pas supprimer les pointages
- `schedule.create` - Ne peut pas créer de plannings (seulement gérer son équipe)
- `schedule.update` - Ne peut pas modifier les plannings (seulement gérer son équipe)
- `schedule.delete` - Ne peut pas supprimer les plannings
- `leave.create` - Ne peut pas créer de demandes de congés (pour lui-même, oui via `leave.view_own`)
- `leave.update` - Ne peut pas modifier les demandes de congés
- `leave.manage_types` - Ne peut pas gérer les types de congés
- `user.*` - Ne peut pas gérer les utilisateurs
- `role.*` - Ne peut pas gérer les rôles
- `tenant.*` - Ne peut pas modifier les paramètres du tenant
- `audit.*` - Ne peut pas voir les logs d'audit

---

## 🔍 Analyse des Interfaces Frontend

### ✅ Pages Accessibles (selon les permissions)

#### 1. **Dashboard** (`/dashboard`)
- **Permission requise** : Aucune (page publique pour utilisateurs connectés)
- **Statut** : ✅ Accessible
- **Actions disponibles** : Voir les statistiques générales

#### 2. **Pointages** (`/attendance`)
- **Permission requise** : `attendance.view_all` OU `attendance.view_own` OU `attendance.view_team`
- **Permission MANAGER** : ✅ `attendance.view_team`
- **Statut** : ✅ Accessible
- **Actions disponibles** :
  - ✅ Voir les pointages de son équipe
  - ✅ Voir les anomalies (`attendance.view_anomalies`)
  - ✅ Corriger un pointage (`attendance.correct`)
  - ❌ Exporter (nécessite `attendance.export` - NON assigné)
  - ❌ Créer/Modifier/Supprimer des pointages

#### 3. **Congés** (`/leaves`)
- **Permission requise** : `leave.view_all` OU `leave.view_own` OU `leave.view_team`
- **Permission MANAGER** : ✅ `leave.view_team`
- **Statut** : ✅ Accessible
- **Actions disponibles** :
  - ✅ Voir les congés de son équipe
  - ✅ Approuver un congé (`leave.approve`)
  - ✅ Refuser un congé (`leave.reject`)
  - ❌ Créer une demande (pour lui-même, oui via `leave.view_own` - mais pas assigné)
  - ❌ Gérer les types de congés (`leave.manage_types`)

#### 4. **Heures Supplémentaires** (`/overtime`)
- **Permission requise** : `overtime.view_all` OU `overtime.view_own`
- **Permission MANAGER** : ✅ `overtime.view_all`
- **Statut** : ✅ Accessible
- **Actions disponibles** :
  - ✅ Voir toutes les heures sup
  - ✅ Approuver des heures sup (`overtime.approve`)
  - ❌ Exporter (nécessite `overtime.export` - NON assigné)

#### 5. **Rapports** (`/reports`)
- **Permission requise** : `reports.view_all` OU `reports.view_attendance` OU `reports.view_leaves` OU `reports.view_overtime`
- **Permission MANAGER** : ✅ `reports.view_attendance`, `reports.view_leaves`, `reports.view_overtime`
- **Statut** : ✅ Accessible
- **Actions disponibles** :
  - ✅ Voir les rapports de présence
  - ✅ Voir les rapports de congés
  - ✅ Voir les rapports d'heures sup
  - ✅ Exporter des rapports (`reports.export`)

#### 6. **Plannings** (`/shifts-planning`)
- **Permission requise** : Non vérifié dans le code
- **Permission MANAGER** : ✅ `schedule.view_team`, `schedule.manage_team`
- **Statut** : ⚠️ À vérifier
- **Actions disponibles** :
  - ✅ Voir le planning de son équipe
  - ✅ Gérer le planning de son équipe
  - ✅ Approuver un remplacement (`schedule.approve_replacement`)

#### 7. **Profil** (`/profile`)
- **Permission requise** : Aucune (page publique)
- **Statut** : ✅ Accessible
- **Actions disponibles** :
  - ✅ Modifier son profil (nom, prénom, téléphone)
  - ✅ Changer son mot de passe
  - ✅ Gérer ses préférences
  - ✅ Voir ses statistiques

#### 8. **Employés** (`/employees`)
- **Permission requise** : `employee.view_all` OU `employee.view_own` OU `employee.view_team`
- **Permission MANAGER** : ✅ `employee.view_team`
- **Statut** : ✅ Accessible
- **Actions disponibles** :
  - ✅ Voir les employés de son équipe
  - ❌ Créer un employé (`employee.create`)
  - ❌ Modifier un employé (`employee.update`)
  - ❌ Supprimer un employé (`employee.delete`)
  - ❌ Importer/Exporter (`employee.import`, `employee.export`)

### ❌ Pages NON Accessibles

#### 1. **RBAC** (`/rbac`)
- **Permission requise** : `role.view_all`
- **Permission MANAGER** : ❌ Non assigné
- **Statut** : ❌ Non accessible

#### 2. **Paramètres** (`/settings`)
- **Permission requise** : `tenant.view_settings` OU `tenant.update_settings`
- **Permission MANAGER** : ❌ Non assigné
- **Statut** : ❌ Non accessible

#### 3. **Audit** (`/audit`)
- **Permission requise** : `audit.view_all`
- **Permission MANAGER** : ❌ Non assigné
- **Statut** : ❌ Non accessible

#### 4. **Terminaux** (`/terminals`)
- **Permission requise** : Non vérifié dans le code
- **Permission MANAGER** : ❌ `tenant.manage_devices` non assigné
- **Statut** : ⚠️ À vérifier

#### 5. **Structure RH** (`/structure-rh`)
- **Permission requise** : Non vérifié dans le code
- **Permission MANAGER** : ❌ `tenant.manage_departments`, `tenant.manage_positions` non assignés
- **Statut** : ⚠️ À vérifier

#### 6. **Équipes** (`/teams`)
- **Permission requise** : Non vérifié dans le code
- **Permission MANAGER** : ❌ `tenant.manage_teams` non assigné
- **Statut** : ⚠️ À vérifier

---

## 🔐 Restrictions Spécifiques au MANAGER

### 1. **Modification du Profil**

D'après `backend/src/modules/users/users.service.ts` :

```typescript
// EMPLOYEE ne peut pas modifier firstName/lastName
if (user.role === LegacyRole.EMPLOYEE && user.id === id) {
  if (dto.firstName !== undefined || dto.lastName !== undefined) {
    throw new ConflictException('Les employés ne peuvent pas modifier leur nom ou prénom.');
  }
}
```

**Question** : Le MANAGER peut-il modifier son nom/prénom ?

**Réponse** : ✅ OUI, car la restriction ne s'applique qu'aux EMPLOYEE.

### 2. **Gestion des Employés**

Le MANAGER peut :
- ✅ Voir les employés de son équipe (`employee.view_team`)
- ❌ Créer des employés
- ❌ Modifier des employés
- ❌ Supprimer des employés

### 3. **Gestion des Pointages**

Le MANAGER peut :
- ✅ Voir les pointages de son équipe
- ✅ Corriger un pointage (`attendance.correct`)
- ❌ Créer des pointages manuellement
- ❌ Supprimer des pointages

### 4. **Gestion des Congés**

Le MANAGER peut :
- ✅ Voir les congés de son équipe
- ✅ Approuver/Refuser les congés de son équipe
- ❌ Créer des demandes de congés pour lui-même (permission `leave.create` non assignée)
- ❌ Gérer les types de congés

**⚠️ PROBLÈME IDENTIFIÉ** : Le MANAGER ne peut pas créer de demandes de congés pour lui-même car `leave.create` n'est pas assigné. Il devrait avoir `leave.view_own` et `leave.create` pour gérer ses propres congés.

---

## 🎨 Analyse du Menu Sidebar

D'après `frontend/components/layout/sidebar.tsx`, le menu devrait être filtré selon les permissions.

### Menu Items et Permissions Requises

1. **Dashboard** - Aucune permission requise
2. **Pointages** - `attendance.view_all` OU `attendance.view_own` OU `attendance.view_team` ✅
3. **Congés** - `leave.view_all` OU `leave.view_own` OU `leave.view_team` ✅
4. **Heures Sup** - `overtime.view_all` OU `overtime.view_own` ✅
5. **Rapports** - `reports.view_all` OU `reports.view_attendance` OU `reports.view_leaves` OU `reports.view_overtime` ✅
6. **Plannings** - `schedule.view_all` OU `schedule.view_own` OU `schedule.view_team` ✅
7. **Employés** - `employee.view_all` OU `employee.view_own` OU `employee.view_team` ✅
8. **RBAC** - `role.view_all` ❌
9. **Paramètres** - `tenant.view_settings` OU `tenant.update_settings` ❌
10. **Audit** - `audit.view_all` ❌

---

## ⚠️ Problèmes Identifiés

### 1. **MANAGER ne peut pas créer de demandes de congés pour lui-même**

**Problème** : Le MANAGER a `leave.view_team`, `leave.approve`, `leave.reject`, mais pas `leave.view_own` ni `leave.create`.

**Impact** : Un MANAGER ne peut pas demander de congés pour lui-même.

**Solution** : Ajouter `leave.view_own` et `leave.create` aux permissions du MANAGER.

### 2. **MANAGER ne peut pas voir ses propres pointages**

**Problème** : Le MANAGER a `attendance.view_team` mais pas `attendance.view_own`.

**Impact** : Un MANAGER ne peut pas voir ses propres pointages (seulement ceux de son équipe).

**Solution** : Ajouter `attendance.view_own` aux permissions du MANAGER.

### 3. **MANAGER ne peut pas voir son propre planning**

**Problème** : Le MANAGER a `schedule.view_team` mais pas `schedule.view_own`.

**Impact** : Un MANAGER ne peut pas voir son propre planning (seulement celui de son équipe).

**Solution** : Ajouter `schedule.view_own` aux permissions du MANAGER.

### 4. **Pages non protégées par permissions**

**Problème** : Certaines pages ne sont pas protégées par `ProtectedRoute` :
- `/shifts-planning` - Plannings
- `/teams` - Équipes
- `/structure-rh` - Structure RH
- `/terminals` - Terminaux

**Impact** : Ces pages pourraient être accessibles même sans les bonnes permissions.

**Solution** : Ajouter `ProtectedRoute` avec les permissions appropriées.

---

## ✅ Recommandations

### 1. **Ajouter des permissions manquantes au MANAGER**

```typescript
MANAGER: [
  // ... permissions existantes ...
  'employee.view_own',              // Voir ses propres informations
  'attendance.view_own',            // Voir ses propres pointages
  'schedule.view_own',               // Voir son propre planning
  'leave.view_own',                  // Voir ses propres congés
  'leave.create',                    // Créer des demandes de congés
  'leave.update',                    // Modifier ses propres demandes de congés
  'overtime.view_own',               // Voir ses propres heures sup
]
```

### 2. **Protéger les pages manquantes**

- `/shifts-planning` : `ProtectedRoute` avec `schedule.view_all` OU `schedule.view_own` OU `schedule.view_team`
- `/teams` : `ProtectedRoute` avec `tenant.manage_teams` OU `employee.view_team`
- `/structure-rh` : `ProtectedRoute` avec `tenant.manage_departments` OU `tenant.manage_positions`
- `/terminals` : `ProtectedRoute` avec `tenant.manage_devices`

### 3. **Vérifier les actions dans les pages**

- S'assurer que les boutons "Créer", "Modifier", "Supprimer" sont protégés par `PermissionGate`
- Vérifier que les exports sont protégés

---

## 📝 Checklist de Vérification

### Backend
- [ ] Vérifier que les permissions du MANAGER sont correctes dans `init-rbac.ts`
- [ ] Vérifier que le MANAGER peut modifier son nom/prénom (pas de restriction)
- [ ] Vérifier que le MANAGER peut voir ses propres données

### Frontend
- [ ] Vérifier que toutes les pages sont protégées par `ProtectedRoute`
- [ ] Vérifier que les actions sont protégées par `PermissionGate`
- [ ] Vérifier que le menu sidebar filtre correctement selon les permissions
- [ ] Vérifier que le MANAGER peut créer des demandes de congés pour lui-même
- [ ] Vérifier que le MANAGER peut voir ses propres pointages
- [ ] Vérifier que le MANAGER peut voir son propre planning

---

**Date de création** : 2025-12-11
**Version** : 1.0

