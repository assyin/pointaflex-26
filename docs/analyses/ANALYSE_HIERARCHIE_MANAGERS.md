# 📊 Analyse Approfondie - Hiérarchie des Managers

## 🎯 Objectif

Analyser la structure actuelle du système et vérifier si elle peut supporter la hiérarchie des managers à deux niveaux :
1. **Manager de Direction (Département)** : Gère tous les sites d'un département
2. **Manager Régional (Site)** : Gère uniquement les employés de son site

---

## 📋 Exemple Concret Fourni

### Structure Organisationnelle

**Département** : Transport de fonds (CIT)
- **Direction** : Casablanca
  - **Manager de Direction** : Gère tous les sites du département CIT
  - **Sites** :
    - Site Casablanca (Région Casablanca)
      - **Manager Régional** : Gère uniquement les employés du site Casablanca
    - Site Rabat (Région Rabat)
      - **Manager Régional** : Gère uniquement les employés du site Rabat
    - Site Tanger (Région Tanger)
      - **Manager Régional** : Gère uniquement les employés du site Tanger

### Règles d'Accès

#### Manager de Direction (Département)
- ✅ Peut voir **tous les employés** du département CIT
- ✅ Peut voir les employés de **tous les sites** (Casablanca, Rabat, Tanger)
- ✅ Peut voir **toutes les données** du département (pointages, congés, heures sup, etc.)
- ✅ Peut gérer les approbations pour **tous les sites** du département
- ❌ Ne peut **pas** voir les employés d'autres départements

#### Manager Régional (Site)
- ✅ Peut voir **uniquement les employés** de son site
- ✅ Peut voir les données de **son site uniquement**
- ✅ Peut gérer les approbations pour **son site uniquement**
- ❌ Ne peut **pas** voir les employés d'autres sites
- ❌ Ne peut **pas** voir les données d'autres sites

---

## 🔍 Analyse de la Structure Actuelle

### 1. Modèle de Données (Prisma Schema)

#### ✅ Ce qui Existe

**Employee** :
```prisma
model Employee {
  siteId        String?  // Lien vers le site
  departmentId  String?  // Lien vers le département
  teamId        String?  // Lien vers l'équipe
  // ...
}
```

**Department** :
```prisma
model Department {
  managerId     String?  // ID du manager du département ✅
  employees     Employee[]
  // ...
}
```

**Site** :
```prisma
model Site {
  // ❌ PAS de managerId
  employees     Employee[]
  // ...
}
```

**Team** :
```prisma
model Team {
  managerId     String?  // ID du manager de l'équipe ✅
  employees     Employee[]
  // ...
}
```

#### ❌ Ce qui Manque

1. **Site n'a pas de `managerId`** :
   - Impossible d'assigner un manager directement à un site
   - Pas de relation directe entre Site et Manager

2. **Pas de distinction entre types de managers** :
   - Pas de champ pour distinguer "Manager de Direction" vs "Manager Régional"
   - Pas de logique pour déterminer le niveau hiérarchique

3. **Pas de relation Site ↔ Department** :
   - Un site peut appartenir à plusieurs départements ? (non défini)
   - Un département peut avoir plusieurs sites ? (oui, mais pas de relation explicite)

---

### 2. Permissions RBAC Actuelles

#### Permissions MANAGER Actuelles

D'après `init-rbac.ts`, le rôle MANAGER a :
- `employee.view_team` : Voir les employés de son équipe
- `employee.view_own` : Voir ses propres informations
- `attendance.view_team` : Voir les pointages de son équipe
- `attendance.view_own` : Voir ses propres pointages
- `schedule.view_team` : Voir le planning de son équipe
- `schedule.view_own` : Voir son propre planning
- `leave.view_team` : Voir les congés de son équipe
- `leave.view_own` : Voir ses propres congés
- `leave.approve` : Approuver les congés
- `overtime.view_team` : Voir les heures sup de son équipe
- `overtime.view_own` : Voir ses propres heures sup
- `overtime.approve` : Approuver les heures sup
- `reports.view_attendance` : Voir les rapports de présence
- `reports.view_leaves` : Voir les rapports de congés
- `reports.view_overtime` : Voir les rapports d'heures sup
- `reports.export` : Exporter des rapports

#### ❌ Permissions Manquantes

- ❌ `employee.view_department` : Voir les employés de son département
- ❌ `employee.view_site` : Voir les employés de son site
- ❌ `attendance.view_department` : Voir les pointages de son département
- ❌ `attendance.view_site` : Voir les pointages de son site
- ❌ `schedule.view_department` : Voir le planning de son département
- ❌ `schedule.view_site` : Voir le planning de son site
- ❌ `leave.view_department` : Voir les congés de son département
- ❌ `leave.view_site` : Voir les congés de son site

---

### 3. Logique de Filtrage Actuelle

#### EmployeesService.findAll()

**Logique actuelle** :
```typescript
// Filtrer par employé si l'utilisateur n'a que la permission 'employee.view_own'
if (!hasViewAll && hasViewOwn && userId) {
  where.id = employee.id; // Uniquement ses propres données
}

// Filtres manuels (passés en paramètres)
if (filters?.siteId) where.siteId = filters.siteId;
if (filters?.departmentId) where.departmentId = filters.departmentId;
if (filters?.teamId) where.teamId = filters.teamId;
```

**Problème** :
- ❌ Pas de logique automatique pour filtrer par département si manager de département
- ❌ Pas de logique automatique pour filtrer par site si manager de site
- ❌ Le filtrage dépend uniquement des permissions `view_all`, `view_own`, `view_team`
- ❌ Pas de détection automatique du niveau hiérarchique du manager

#### AttendanceService.findAll()

**Logique actuelle** :
```typescript
if (!hasViewAll && hasViewTeam && userId) {
  // Filtrer par l'équipe de l'utilisateur
  const employee = await this.prisma.employee.findFirst({
    where: { userId, tenantId },
    select: { teamId: true },
  });
  
  if (employee?.teamId) {
    const teamMembers = await this.prisma.employee.findMany({
      where: { teamId: employee.teamId, tenantId },
      select: { id: true },
    });
    
    where.employeeId = { in: teamMembers.map(m => m.id) };
  }
}
```

**Problème** :
- ❌ Filtre uniquement par équipe (`teamId`)
- ❌ Ne filtre pas par département ou site
- ❌ Ne détecte pas si le manager est un "Manager de Direction" ou "Manager Régional"

#### ReportsService.getTeamDashboardStats()

**Logique actuelle** :
```typescript
// Récupérer l'employé et son équipe
const user = await this.prisma.user.findUnique({
  include: {
    employee: {
      include: {
        team: {
          include: {
            employees: { where: { isActive: true } },
          },
        },
      },
    },
  },
});

if (!user || !user.employee || !user.employee.team) {
  throw new ForbiddenException('User is not linked to an employee with a team');
}

const teamEmployeeIds = team.employees.map(e => e.id);
// Statistiques basées uniquement sur l'équipe
```

**Problème** :
- ❌ Suppose que le manager gère une équipe
- ❌ Ne gère pas le cas d'un manager de département (plusieurs équipes)
- ❌ Ne gère pas le cas d'un manager de site (plusieurs équipes d'un site)

---

## ⚠️ Problèmes Identifiés

### 1. Structure de Données

#### Problème 1 : Site n'a pas de managerId
- **Impact** : Impossible d'assigner un manager directement à un site
- **Solution nécessaire** : Ajouter `managerId` au modèle `Site`

#### Problème 2 : Pas de distinction entre types de managers
- **Impact** : Impossible de savoir si un manager est "Manager de Direction" ou "Manager Régional"
- **Solution nécessaire** : 
  - Option A : Ajouter un champ `managerType` dans `Employee` ou `User`
  - Option B : Détecter automatiquement selon les relations (Department.managerId vs Site.managerId)
  - Option C : Créer un modèle `ManagerAssignment` pour gérer les assignations

#### Problème 3 : Pas de relation explicite Site ↔ Department
- **Impact** : Un site peut avoir des employés de plusieurs départements ? (ambiguïté)
- **Solution nécessaire** : Clarifier la relation ou ajouter une contrainte

### 2. Permissions RBAC

#### Problème 4 : Permissions insuffisantes
- **Impact** : Pas de permissions spécifiques pour gérer par département ou site
- **Solution nécessaire** : Ajouter des permissions :
  - `employee.view_department`
  - `employee.view_site`
  - `attendance.view_department`
  - `attendance.view_site`
  - `schedule.view_department`
  - `schedule.view_site`
  - `leave.view_department`
  - `leave.view_site`
  - `overtime.view_department`
  - `overtime.view_site`

### 3. Logique de Filtrage

#### Problème 5 : Filtrage uniquement par équipe
- **Impact** : Les managers ne peuvent voir que leur équipe, pas leur département ou site
- **Solution nécessaire** : Implémenter une logique de filtrage automatique selon le niveau hiérarchique :
  - Si manager de département → filtrer par `departmentId`
  - Si manager de site → filtrer par `siteId`
  - Si manager d'équipe → filtrer par `teamId` (existant)

#### Problème 6 : Pas de détection automatique du niveau
- **Impact** : Le système ne sait pas automatiquement quel niveau de manager est l'utilisateur
- **Solution nécessaire** : Créer une fonction utilitaire pour détecter le niveau :
  ```typescript
  async getManagerLevel(userId: string, tenantId: string): Promise<{
    type: 'DEPARTMENT' | 'SITE' | 'TEAM' | null;
    departmentId?: string;
    siteId?: string;
    teamId?: string;
  }>
  ```

### 4. Dashboard et Rapports

#### Problème 7 : Dashboard équipe uniquement
- **Impact** : Le dashboard manager ne gère que les équipes, pas les départements ou sites
- **Solution nécessaire** : Adapter `getTeamDashboardStats` pour gérer :
  - Dashboard département (tous les sites du département)
  - Dashboard site (tous les employés du site)
  - Dashboard équipe (existant)

---

## ✅ Ce qui Fonctionne Déjà

1. ✅ **Structure de base** : Employee a `departmentId` et `siteId`
2. ✅ **Department a managerId** : Permet d'assigner un manager à un département
3. ✅ **Team a managerId** : Permet d'assigner un manager à une équipe
4. ✅ **Filtrage par équipe** : La logique `view_team` fonctionne pour les équipes
5. ✅ **Permissions RBAC** : Le système de permissions est en place
6. ✅ **Filtres manuels** : Les endpoints acceptent `siteId` et `departmentId` en paramètres

---

## 🎯 Solutions Proposées

### Solution 1 : Ajouter managerId au Site

**Modification Prisma** :
```prisma
model Site {
  // ...
  managerId     String?
  manager       Employee?  @relation("SiteManager", fields: [managerId], references: [id])
  // ...
}

model Employee {
  // ...
  managedSites  Site[]      @relation("SiteManager")
  // ...
}
```

**Avantages** :
- ✅ Permet d'assigner un manager directement à un site
- ✅ Relation claire et directe
- ✅ Facile à implémenter

**Inconvénients** :
- ⚠️ Un site ne peut avoir qu'un seul manager
- ⚠️ Un manager ne peut gérer qu'un seul site (sauf si on permet plusieurs sites)

### Solution 2 : Détection Automatique du Niveau Manager

**Fonction utilitaire** :
```typescript
async getManagerLevel(userId: string, tenantId: string) {
  const employee = await this.prisma.employee.findFirst({
    where: { userId, tenantId },
    include: {
      department: { select: { id: true, managerId: true } },
      site: { select: { id: true } },
      team: { select: { id: true, managerId: true } },
    },
  });

  if (!employee) return null;

  // Vérifier si manager de département
  if (employee.department?.managerId === employee.id) {
    return {
      type: 'DEPARTMENT',
      departmentId: employee.department.id,
    };
  }

  // Vérifier si manager de site (après ajout de managerId au Site)
  if (employee.site?.managerId === employee.id) {
    return {
      type: 'SITE',
      siteId: employee.site.id,
    };
  }

  // Vérifier si manager d'équipe
  if (employee.team?.managerId === employee.id) {
    return {
      type: 'TEAM',
      teamId: employee.team.id,
    };
  }

  return null;
}
```

### Solution 3 : Logique de Filtrage Automatique

**Modification des services** :
```typescript
// Dans EmployeesService.findAll()
const managerLevel = await this.getManagerLevel(userId, tenantId);

if (managerLevel?.type === 'DEPARTMENT') {
  where.departmentId = managerLevel.departmentId;
} else if (managerLevel?.type === 'SITE') {
  where.siteId = managerLevel.siteId;
} else if (managerLevel?.type === 'TEAM') {
  where.teamId = managerLevel.teamId;
}
```

### Solution 4 : Nouvelles Permissions

**Ajouter dans init-rbac.ts** :
```typescript
// Permissions - Employés
{ code: 'employee.view_department', name: 'Voir les employés de son département', category: 'employees' },
{ code: 'employee.view_site', name: 'Voir les employés de son site', category: 'employees' },

// Permissions - Pointages
{ code: 'attendance.view_department', name: 'Voir les pointages de son département', category: 'attendance' },
{ code: 'attendance.view_site', name: 'Voir les pointages de son site', category: 'attendance' },

// Permissions - Plannings
{ code: 'schedule.view_department', name: 'Voir le planning de son département', category: 'schedules' },
{ code: 'schedule.view_site', name: 'Voir le planning de son site', category: 'schedules' },

// Permissions - Congés
{ code: 'leave.view_department', name: 'Voir les congés de son département', category: 'leaves' },
{ code: 'leave.view_site', name: 'Voir les congés de son site', category: 'leaves' },

// Permissions - Heures sup
{ code: 'overtime.view_department', name: 'Voir les heures sup de son département', category: 'overtime' },
{ code: 'overtime.view_site', name: 'Voir les heures sup de son site', category: 'overtime' },
```

**Assigner aux rôles** :
```typescript
MANAGER: [
  // ... permissions existantes ...
  // Nouvelles permissions hiérarchiques
  'employee.view_department',
  'employee.view_site',
  'attendance.view_department',
  'attendance.view_site',
  'schedule.view_department',
  'schedule.view_site',
  'leave.view_department',
  'leave.view_site',
  'overtime.view_department',
  'overtime.view_site',
]
```

### Solution 5 : Dashboard Adaptatif

**Modification ReportsService** :
```typescript
async getManagerDashboardStats(userId: string, tenantId: string, query: DashboardStatsQueryDto) {
  const managerLevel = await this.getManagerLevel(userId, tenantId);

  if (managerLevel?.type === 'DEPARTMENT') {
    return this.getDepartmentDashboardStats(userId, tenantId, managerLevel.departmentId, query);
  } else if (managerLevel?.type === 'SITE') {
    return this.getSiteDashboardStats(userId, tenantId, managerLevel.siteId, query);
  } else if (managerLevel?.type === 'TEAM') {
    return this.getTeamDashboardStats(userId, tenantId, query);
  }

  throw new ForbiddenException('User is not a manager');
}
```

---

## 📊 Matrice de Compatibilité

| Fonctionnalité | État Actuel | Support Hiérarchie | Action Requise |
|----------------|-------------|-------------------|----------------|
| **Structure Données** |
| Employee.departmentId | ✅ Existe | ✅ Compatible | Aucune |
| Employee.siteId | ✅ Existe | ✅ Compatible | Aucune |
| Department.managerId | ✅ Existe | ✅ Compatible | Aucune |
| Site.managerId | ❌ Manquant | ❌ **Nécessaire** | **Ajouter** |
| **Permissions** |
| employee.view_team | ✅ Existe | ⚠️ Partiel | Ajouter view_department, view_site |
| attendance.view_team | ✅ Existe | ⚠️ Partiel | Ajouter view_department, view_site |
| schedule.view_team | ✅ Existe | ⚠️ Partiel | Ajouter view_department, view_site |
| leave.view_team | ✅ Existe | ⚠️ Partiel | Ajouter view_department, view_site |
| **Logique Filtrage** |
| Filtrage par équipe | ✅ Existe | ⚠️ Partiel | Ajouter filtrage département/site |
| Détection niveau manager | ❌ Manquant | ❌ **Nécessaire** | **Créer fonction** |
| **Dashboard** |
| Dashboard équipe | ✅ Existe | ⚠️ Partiel | Adapter pour département/site |
| Dashboard département | ❌ Manquant | ❌ **Nécessaire** | **Créer** |
| Dashboard site | ❌ Manquant | ❌ **Nécessaire** | **Créer** |

---

## 🎯 Conclusion

### ✅ Ce qui Fonctionne

1. **Structure de base** : La structure de données permet de lier les employés aux départements et sites
2. **Manager de département** : Le champ `Department.managerId` existe et permet d'assigner un manager
3. **Filtrage manuel** : Les endpoints acceptent `siteId` et `departmentId` en paramètres
4. **Permissions RBAC** : Le système de permissions est en place et extensible

### ❌ Ce qui Manque

1. **Site.managerId** : Impossible d'assigner un manager directement à un site
2. **Permissions spécifiques** : Pas de permissions pour `view_department` ou `view_site`
3. **Détection automatique** : Pas de logique pour détecter le niveau hiérarchique du manager
4. **Filtrage automatique** : Le filtrage se fait uniquement par équipe, pas par département ou site
5. **Dashboard adaptatif** : Le dashboard manager ne gère que les équipes

### ✅ Faisabilité

**OUI, le système peut supporter cette hiérarchie** avec les modifications suivantes :

1. ✅ **Ajouter `managerId` au modèle `Site`** (migration Prisma)
2. ✅ **Créer une fonction `getManagerLevel()`** pour détecter le niveau
3. ✅ **Ajouter les nouvelles permissions** (`view_department`, `view_site`)
4. ✅ **Adapter la logique de filtrage** dans tous les services
5. ✅ **Créer les dashboards département et site**

### 📝 Recommandations

1. **Approche Progressive** :
   - Phase 1 : Ajouter `managerId` au Site
   - Phase 2 : Créer la fonction de détection du niveau
   - Phase 3 : Ajouter les nouvelles permissions
   - Phase 4 : Adapter la logique de filtrage
   - Phase 5 : Créer les dashboards adaptatifs

2. **Compatibilité Ascendante** :
   - Maintenir le support des équipes (existant)
   - Ajouter le support département et site (nouveau)
   - Permettre à un manager d'avoir plusieurs niveaux (ex: manager d'équipe ET de site)

3. **Flexibilité** :
   - Un manager peut être assigné à un département OU un site OU une équipe
   - Un manager de département peut aussi être manager d'un site (cas particulier)
   - Un manager de site peut aussi être manager d'une équipe (cas particulier)

---

**Date de création** : 2025-12-11
**Version** : 1.0

