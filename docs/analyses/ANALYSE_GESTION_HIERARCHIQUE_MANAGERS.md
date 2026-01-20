# Analyse de la Gestion Hiérarchique des Managers

**Date:** 2025-12-12
**Analysé par:** Claude Code
**Contexte:** Vérification du travail de Cursor sur la gestion hiérarchique des managers

---

## 📋 Résumé Exécutif

### Besoin Exprimé

1. **Manager de Direction (Département):**
   - Gère tous les sites et tous les employés de son département
   - Exemple: Directeur département "Transport de fonds (CIT)" à Casablanca
   - Supervise tous les sites du département (Casablanca, Rabat, Marrakech, etc.)

2. **Manager Régional (Site):**
   - Gère uniquement les employés de son site
   - Lié à UN SEUL département (contrainte importante)
   - Exemple: Manager du site de Rabat pour le département CIT
   - Ne peut PAS voir les autres sites

3. **Hiérarchie:**
   ```
   Direction (CASABLANCA)
   └─ Département CIT (Manager de Direction)
      ├─ Site Casablanca (Manager Régional CIT)
      ├─ Site Rabat (Manager Régional CIT)
      ├─ Site Marrakech (Manager Régional CIT)
      └─ Site Fès (Manager Régional CIT)
   ```

### Score de l'Implémentation

**7/10** - Bonne architecture mais avec des problèmes critiques

---

## ✅ Points Positifs

### 1. Architecture Bien Conçue

**Scopes Dashboard:**
- `personal` (EMPLOYEE)
- `team` (Manager d'équipe)
- `department` (Manager de Direction) ✅ NOUVEAU
- `site` (Manager Régional) ✅ NOUVEAU
- `tenant` (ADMIN_RH)
- `platform` (SUPER_ADMIN)

**Fonctions Utilitaires:**
- `getManagerLevel()` - Détecte le niveau hiérarchique
- `getManagedEmployeeIds()` - Récupère les IDs des employés gérés

**Permissions RBAC:**
- `employee.view_department` - Voir employés du département
- `employee.view_site` - Voir employés du site
- Mêmes permissions pour attendance, schedule, leave, overtime

### 2. Dashboards Implémentés

**Dashboard Département:**
```typescript
async getDepartmentDashboardStats(userId, tenantId, query) {
  // Récupère tous les employés du département (tous sites confondus)
  // Statistiques agrégées par département
  // Liste des sites du département avec nombre d'employés
}
```

**Dashboard Site:**
```typescript
async getSiteDashboardStats(userId, tenantId, query) {
  // Récupère tous les employés du site (tous départements confondus)
  // Statistiques agrégées par site
  // Liste des départements présents sur le site
}
```

### 3. Détection Automatique du Niveau

Le système détecte automatiquement le niveau du manager et route vers le bon dashboard.

```typescript
if (!scope && userId && tenantId) {
  const managerLevel = await getManagerLevel(this.prisma, userId, tenantId);
  if (managerLevel.type === 'DEPARTMENT') {
    scope = DashboardScope.DEPARTMENT;
  } else if (managerLevel.type === 'SITE') {
    scope = DashboardScope.SITE;
  }
}
```

---

## ❌ Problèmes Critiques Identifiés

### 1. CRITIQUE: Schema Prisma Incomplet

**Problème:**
Le modèle `Department` a un champ `managerId` SANS relation vers Employee.

**Schema actuel:**
```prisma
model Department {
  id          String     @id @default(uuid())
  // ...
  managerId   String?    // ❌ PAS de relation définie
  employees   Employee[]
}
```

**Employee actuel:**
```prisma
model Employee {
  // ...
  managedTeams  Team[]   @relation("TeamManager")  ✅
  managedSites  Site[]   @relation("SiteManager")  ✅
  // ❌ MANQUE: managedDepartments Department[] @relation("DepartmentManager")
}
```

**Impact:**
- Impossible de récupérer `employee.managedDepartments`
- La relation est unidirectionnelle (cassée)
- Erreur Prisma potentielle lors de l'utilisation

### 2. CRITIQUE: Base de Données Désynchronisée

**Problème:**
Le schema Prisma a été modifié mais `prisma db push` n'a PAS été exécuté.

**Vérification DB:**
```sql
\d "Site"
-- ❌ Colonne 'managerId' N'EXISTE PAS dans la table Site
```

```sql
\d "Department"
-- ✅ Colonne 'managerId' existe
-- ❌ MAIS pas de contrainte FK vers Employee
```

**Impact:**
- La relation Site.manager ne fonctionne pas
- Les queries utilisant `site.manager` échoueront
- Les dashboards site ne fonctionneront pas

### 3. MAJEUR: Logique de Détection Incorrecte

**Problème:**
`getManagerLevel()` vérifie si l'employé est DANS le département/site qu'il manage.

**Code actuel:**
```typescript
// Récupérer l'employé lié à l'utilisateur
const employee = await prisma.employee.findFirst({
  where: { userId, tenantId },
  include: {
    department: { select: { id: true, managerId: true } },
    site: { select: { id: true, managerId: true } },
    team: { select: { id: true, managerId: true } },
  },
});

// ❌ Vérifie si l'employé est dans un département ET que ce département a managerId = employee.id
if (employee.department?.managerId === employee.id) {
  return { type: 'DEPARTMENT', departmentId: employee.department.id };
}
```

**Problème:**
- Un Manager de Direction peut ne PAS être assigné au département qu'il manage
- Exemple: Directeur CIT peut être dans un département "Direction Générale"
- Il ne sera jamais détecté comme manager de département

**Ce qu'il faut:**
- Chercher TOUS les départements dont `managerId === employee.id`
- Chercher TOUS les sites dont `managerId === employee.id`
- Pas seulement celui où l'employé est assigné

### 4. MAJEUR: Contrainte "Manager Régional = 1 département" Non Appliquée

**Besoin:**
> Chaque Manager Régional lié à une seul departement ne peut pas etre dans plusieur departement

**Problème:**
- Aucune contrainte dans le schema Prisma
- Aucune validation dans le code
- Un employé pourrait théoriquement être manager de plusieurs sites dans différents départements

**Ce qu'il faut:**
- Validation lors de l'assignation d'un manager à un site
- Vérifier que le manager n'est pas déjà manager d'un site dans un autre département
- Ou: Ajouter un champ `departmentId` dans Site pour lier explicitement

### 5. MINEUR: Permissions RBAC Trop Larges

**Problème:**
Les permissions `view_department` et `view_site` sont assignées à TOUS les MANAGER.

**Permission actuelle:**
```typescript
MANAGER: [
  'employee.view_department',  // ❌ Tous les managers ont cette permission
  'employee.view_site',         // ❌ Tous les managers ont cette permission
  // ...
]
```

**Impact:**
- Un Manager d'équipe peut techniquement accéder au scope département/site
- Même s'il n'est pas manager de département/site
- Le `validateScopeAccess()` bloque, mais les permissions sont trop permissives

**Ce qu'il faut:**
- Permissions assignées dynamiquement selon le niveau réel du manager
- Ou: Permissions plus granulaires (view_own_department, view_own_site)

---

## 🔧 Corrections Nécessaires

### Correction 1: Compléter le Schema Prisma

**Fichier:** `backend/prisma/schema.prisma`

```prisma
model Department {
  id          String     @id @default(uuid())
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
  tenantId    String
  name        String
  code        String?
  description String?
  managerId   String?    // ID du manager du département
  manager     Employee?  @relation("DepartmentManager", fields: [managerId], references: [id])  // ✅ AJOUTER
  tenant      Tenant     @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  employees   Employee[]

  @@index([tenantId])
  @@index([managerId])  // ✅ AJOUTER
}

model Employee {
  // ... champs existants ...

  managedTeams        Team[]        @relation("TeamManager")
  managedSites        Site[]        @relation("SiteManager")
  managedDepartments  Department[]  @relation("DepartmentManager")  // ✅ AJOUTER

  @@unique([tenantId, matricule])
  @@index([tenantId])
  @@index([siteId])
  @@index([departmentId])
  @@index([teamId])
  @@index([positionId])
}
```

### Correction 2: Corriger `getManagerLevel()`

**Fichier:** `backend/src/common/utils/manager-level.util.ts`

**Logique actuelle:**
```typescript
// ❌ Cherche dans le département de l'employé
if (employee.department?.managerId === employee.id) {
  return { type: 'DEPARTMENT', departmentId: employee.department.id };
}
```

**Nouvelle logique:**
```typescript
// ✅ Chercher TOUS les départements managés par cet employé
const managedDepartments = await prisma.department.findMany({
  where: {
    managerId: employee.id,
    tenantId,
  },
  select: { id: true },
});

if (managedDepartments.length > 0) {
  return {
    type: 'DEPARTMENT',
    departmentId: managedDepartments[0].id,  // Premier département trouvé
  };
}

// ✅ Chercher TOUS les sites managés par cet employé
const managedSites = await prisma.site.findMany({
  where: {
    managerId: employee.id,
    tenantId,
  },
  select: { id: true, departmentId: true },  // departmentId si on l'ajoute
});

if (managedSites.length > 0) {
  return {
    type: 'SITE',
    siteId: managedSites[0].id,
  };
}
```

### Correction 3: Ajouter Validation Contrainte Manager Régional

**Option A: Validation dans SitesService**

```typescript
async assignManager(siteId: string, managerId: string, tenantId: string) {
  // Récupérer le site avec son département
  const site = await this.prisma.site.findUnique({
    where: { id: siteId },
    include: {
      employees: {
        where: { id: managerId },
        select: { departmentId: true },
      },
    },
  });

  if (!site) {
    throw new NotFoundException('Site not found');
  }

  // Récupérer le manager
  const manager = await this.prisma.employee.findUnique({
    where: { id: managerId },
    select: { id: true, departmentId: true },
  });

  if (!manager) {
    throw new NotFoundException('Manager not found');
  }

  // Vérifier si le manager gère déjà un site dans un AUTRE département
  const otherManagedSites = await this.prisma.site.findMany({
    where: {
      managerId,
      tenantId,
      id: { not: siteId },  // Exclure le site actuel
    },
    include: {
      employees: {
        where: { departmentId: { not: manager.departmentId } },
        select: { departmentId: true },
      },
    },
  });

  if (otherManagedSites.length > 0) {
    throw new ForbiddenException(
      'Ce manager gère déjà un site dans un autre département. Un manager régional ne peut gérer qu\'un seul département.'
    );
  }

  // Assigner le manager
  await this.prisma.site.update({
    where: { id: siteId },
    data: { managerId },
  });
}
```

**Option B: Ajouter un champ departmentId dans Site (Recommandé)**

```prisma
model Site {
  id           String             @id @default(uuid())
  // ... autres champs ...
  managerId    String?            // ID du manager régional du site
  departmentId String?            // ✅ AJOUTER: Département principal du site
  manager      Employee?          @relation("SiteManager", fields: [managerId], references: [id])
  department   Department?        @relation("SiteDepartment", fields: [departmentId], references: [id])  // ✅ AJOUTER
  // ...

  @@index([managerId])
  @@index([departmentId])  // ✅ AJOUTER
}
```

Puis validation:
```typescript
// Vérifier que le manager ne gère pas un site dans un autre département
const otherManagedSites = await this.prisma.site.findMany({
  where: {
    managerId,
    departmentId: { not: site.departmentId },
  },
});

if (otherManagedSites.length > 0) {
  throw new ForbiddenException(
    'Ce manager gère déjà un site dans le département ' + otherManagedSites[0].department.name +
    '. Un manager régional ne peut gérer qu\'un seul département.'
  );
}
```

### Correction 4: Pousser les Changements vers la DB

```bash
cd /home/assyin/PointaFlex/backend

# Vérifier les changements
npx prisma format

# Pousser vers la DB
npx prisma db push

# Regénérer le client Prisma
npx prisma generate
```

---

## 📊 Matrice de Visibilité

| Profil                  | Personal | Team | Department | Site   | Tenant | Platform |
|------------------------|----------|------|------------|--------|--------|----------|
| EMPLOYEE               | ✅       | ❌   | ❌         | ❌     | ❌     | ❌       |
| Manager d'Équipe       | ✅       | ✅   | ❌         | ❌     | ❌     | ❌       |
| Manager Régional (Site)| ✅       | ✅   | ❌         | ✅     | ❌     | ❌       |
| Manager de Direction   | ✅       | ✅   | ✅         | ❌     | ❌     | ❌       |
| ADMIN_RH               | ✅       | ✅   | ✅         | ✅     | ✅     | ❌       |
| SUPER_ADMIN            | ✅       | ✅   | ✅         | ✅     | ✅     | ✅       |

**Note:** Manager de Direction voit tous les sites de son département, mais via le scope DEPARTMENT, pas SITE.

---

## 🎯 Exemple Concret

### Département CIT (Transport de Fonds)

**Manager de Direction:**
- Nom: Ahmed Bennani
- Département: CIT (Transport de fonds)
- Basé à: Casablanca
- Gère: TOUS les sites CIT (Casa, Rabat, Marrakech, Fès, Tanger)

**Détection:**
```typescript
const managerLevel = await getManagerLevel(prisma, ahmed.userId, tenantId);
// Retourne: { type: 'DEPARTMENT', departmentId: 'cit-dept-id' }
```

**Dashboard:**
```typescript
GET /api/v1/reports/dashboard?scope=department
// Retourne:
{
  scope: 'department',
  department: {
    id: 'cit-dept-id',
    name: 'Transport de fonds (CIT)',
    code: 'CIT'
  },
  sites: [
    { name: 'Casablanca', employeeCount: 45 },
    { name: 'Rabat', employeeCount: 32 },
    { name: 'Marrakech', employeeCount: 28 },
    { name: 'Fès', employeeCount: 25 },
    { name: 'Tanger', employeeCount: 20 }
  ],
  employees: {
    total: 150,  // Total de tous les sites
    activeToday: 142
  },
  // ... autres statistiques agrégées
}
```

### Site de Rabat (CIT)

**Manager Régional:**
- Nom: Fatima Zahra
- Département: CIT
- Site: Rabat
- Gère: Uniquement les employés du site de Rabat

**Contrainte:**
- Ne peut PAS être manager d'un site dans un autre département (ex: Fleet à Rabat)

**Détection:**
```typescript
const managerLevel = await getManagerLevel(prisma, fatima.userId, tenantId);
// Retourne: { type: 'SITE', siteId: 'rabat-site-id' }
```

**Dashboard:**
```typescript
GET /api/v1/reports/dashboard?scope=site
// Retourne:
{
  scope: 'site',
  site: {
    id: 'rabat-site-id',
    name: 'Rabat',
    code: 'RAB',
    city: 'Rabat'
  },
  departments: [
    { name: 'CIT', employeeCount: 32 }
    // Seulement les départements présents sur ce site
  ],
  employees: {
    total: 32,  // Uniquement site de Rabat
    activeToday: 30
  },
  // ... autres statistiques du site uniquement
}
```

---

## 📝 Liste des Corrections à Appliquer

### Priorité CRITIQUE

- [ ] **1. Corriger le schema Prisma**
  - Ajouter relation `Department.manager`
  - Ajouter relation inverse `Employee.managedDepartments`
  - Ajouter index `Department.managerId`

- [ ] **2. Exécuter `npx prisma db push`**
  - Ajouter colonne `Site.managerId` dans la DB
  - Ajouter contraintes FK pour les relations
  - Regénérer le client Prisma

- [ ] **3. Corriger `getManagerLevel()`**
  - Chercher TOUS les départements managés (pas seulement celui de l'employé)
  - Chercher TOUS les sites managés (pas seulement celui de l'employé)

### Priorité HAUTE

- [ ] **4. Ajouter validation contrainte Manager Régional**
  - Option A: Validation dans le code
  - Option B: Ajouter `Site.departmentId` (Recommandé)

- [ ] **5. Tester la détection automatique**
  - Créer un Manager de Direction
  - Créer un Manager Régional
  - Vérifier que le bon dashboard s'affiche

### Priorité MOYENNE

- [ ] **6. Affiner les permissions RBAC**
  - Permissions dynamiques selon le niveau
  - Ou permissions plus granulaires

- [ ] **7. Documenter la hiérarchie**
  - Guide utilisateur pour les managers
  - Schémas de la structure hiérarchique

---

## ✅ Ce Qui Fonctionne Déjà

1. ✅ Architecture des scopes (DEPARTMENT, SITE ajoutés)
2. ✅ DTOs et enums corrects
3. ✅ Dashboards département et site implémentés
4. ✅ Fonction `getManagedEmployeeIds()` correcte
5. ✅ Filtrage automatique dans les services (employees, attendance, etc.)
6. ✅ Validation de scope dans `validateScopeAccess()`
7. ✅ Détection automatique du scope si non fourni

---

## 🚀 Prochaines Étapes

1. **Appliquer les corrections critiques**
   - Corriger le schema Prisma
   - Pousser vers la DB
   - Corriger `getManagerLevel()`

2. **Tester l'implémentation**
   - Créer des managers de test
   - Tester les dashboards
   - Vérifier le filtrage

3. **Ajouter la contrainte Manager Régional**
   - Décider entre Option A et Option B
   - Implémenter la validation

4. **Documentation**
   - Guide utilisateur
   - Guide d'administration

---

## 💡 Recommandations

### Recommandation 1: Ajouter `Site.departmentId`

**Avantage:**
- Lien explicite entre site et département principal
- Facilite les requêtes et les validations
- Cohérent avec la logique métier

**Impact:**
- Changement du schema Prisma
- Migration de données si sites existants
- Validation lors de l'assignation d'employés

### Recommandation 2: Permissions RBAC Dynamiques

**Problème actuel:**
Tous les MANAGER ont `view_department` et `view_site`, même s'ils ne sont pas managers de département/site.

**Solution:**
- Charger les permissions selon le niveau réel
- Dans `jwt.strategy.ts`, détecter le niveau et ajouter des permissions spécifiques
- Exemple: Si `DEPARTMENT`, ajouter `view_own_department`

### Recommandation 3: Interface d'Administration

**Besoin:**
- Interface pour assigner les managers
- Validation en temps réel de la contrainte
- Liste des managers avec leur niveau

---

**Date d'analyse:** 2025-12-12
**Analysé par:** Claude Code (Sonnet 4.5)
**Score final:** 7/10 (Bonne architecture, corrections critiques nécessaires)
**Temps estimé pour corrections:** 2-3 heures
