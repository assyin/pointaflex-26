# Problème : Manager Régional voit tous les départements et sites

## Contexte
Un utilisateur avec le rôle "Manager Régional" assigné au site "CPT RABAT" (département "CPT") peut voir **tous les départements et sites** dans toutes les interfaces (Dashboard, Pointage, Planning, Congés, Heures sup, Rapports, etc.) au lieu de voir uniquement son département et site assignés.

**Compte de test :**
- Email: `emp0025@demo.local`
- Mot de passe: `.b1a1L<E9Ms<`
- Rôle: Manager Régional
- Assignation: Site "CPT RABAT", Département "CPT"

## Problème observé
Le manager régional voit :
- ❌ Tous les départements (CPT, RABAT, CASABLANCA, etc.)
- ❌ Tous les sites (RABAT, CASABLANCA, etc.)

Au lieu de voir uniquement :
- ✅ Département "CPT"
- ✅ Site "RABAT"

## Architecture du système

### Hiérarchie des managers
Le système supporte 3 niveaux de managers :
1. **Manager de Département** (`DEPARTMENT`) : Gère un département sur tous les sites
2. **Manager Régional** (`SITE`) : Gère un département dans un ou plusieurs sites spécifiques
3. **Manager d'Équipe** (`TEAM`) : Gère une équipe

### Tables de base de données
- `SiteManager` : Table de liaison entre un employé (manager) et un site avec un département
  - `managerId` : ID de l'employé manager
  - `siteId` : ID du site géré
  - `departmentId` : ID du département géré dans ce site
  - `tenantId` : ID du tenant

### Fonctions utilitaires
- `getManagerLevel(prisma, userId, tenantId)` : Détermine le niveau hiérarchique d'un manager
  - Retourne `{ type: 'SITE', siteIds: [...], departmentId: '...' }` pour un manager régional
- `getManagedEmployeeIds(prisma, managerLevel, tenantId)` : Retourne les IDs des employés gérés

## Fichiers concernés

### Backend
1. **`backend/src/modules/departments/departments.service.ts`**
   - Méthode `findAll(tenantId, userId?, userPermissions?)`
   - Méthode `getStats(tenantId, userId?, userPermissions?)`

2. **`backend/src/modules/sites/sites.service.ts`**
   - Méthode `findAll(tenantId, userId?, userPermissions?)`

3. **`backend/src/modules/departments/departments.controller.ts`**
   - Endpoint `GET /departments` : Passe `user?.userId` et `user?.permissions` au service
   - Endpoint `GET /departments/stats` : Passe `user?.userId` et `user?.permissions` au service

4. **`backend/src/modules/sites/sites.controller.ts`**
   - Endpoint `GET /sites` : Passe `user?.userId` et `user?.permissions` au service

5. **`backend/src/common/utils/manager-level.util.ts`**
   - Fonction `getManagerLevel()` : Détecte le niveau hiérarchique
   - Fonction `getManagedEmployeeIds()` : Retourne les employés gérés

### Frontend
1. **`frontend/lib/api/departments.ts`**
   - `departmentsApi.getAll()` : Appel API sans filtres (les filtres sont gérés côté backend)

2. **`frontend/lib/hooks/useDepartments.ts`**
   - `useDepartments()` : Hook React Query qui appelle `departmentsApi.getAll()`

3. **`frontend/lib/hooks/useSites.ts`**
   - `useSites()` : Hook React Query qui appelle `sitesApi.getAll()`

## Corrections déjà tentées

### Correction 1 : Filtrage basé sur manager level
**Fichiers modifiés :**
- `backend/src/modules/departments/departments.service.ts`
- `backend/src/modules/sites/sites.service.ts`
- `backend/src/modules/departments/departments.controller.ts`
- `backend/src/modules/sites/sites.controller.ts`

**Changements :**
- Ajout de `userId` et `userPermissions` dans les méthodes `findAll()` et `getStats()`
- Utilisation de `getManagerLevel()` pour détecter le niveau du manager
- Filtrage des départements/sites selon le niveau hiérarchique

**Résultat :** ❌ Le problème persiste

### Correction 2 : Vérification du manager level même avec `view_all`
**Fichiers modifiés :**
- `backend/src/modules/departments/departments.service.ts`
- `backend/src/modules/sites/sites.service.ts`

**Changements :**
- Modification de la logique pour **toujours** vérifier le manager level, même si l'utilisateur a la permission `department.view_all` ou `site.view_all`
- Un manager régional ne doit voir que son département/site assigné, même avec `view_all`

**Code modifié :**
```typescript
// AVANT (ne filtrait pas si view_all)
if (userId && !hasViewAll) {
  const managerLevel = await getManagerLevel(...);
  // filtrage...
}

// APRÈS (filtre toujours si manager)
if (userId) {
  const managerLevel = await getManagerLevel(...);
  if (managerLevel.type === 'SITE') {
    // filtrage...
  }
}
```

**Résultat :** ⚠️ À tester (changements acceptés mais problème peut persister)

## Hypothèses sur la cause

### Hypothèse 1 : Permissions `view_all` bypass le filtrage
**Statut :** ✅ Corrigé dans la correction 2

### Hypothèse 2 : `getManagerLevel()` ne détecte pas correctement le manager
**Vérification nécessaire :**
- Vérifier si l'employé lié à `emp0025@demo.local` a bien des entrées dans `SiteManager`
- Vérifier si `getManagerLevel()` retourne bien `{ type: 'SITE', siteIds: [...], departmentId: '...' }`

### Hypothèse 3 : Cache côté frontend
**Vérification nécessaire :**
- Les hooks React Query peuvent mettre en cache les résultats
- Vérifier si `queryKey` dans `useDepartments()` et `useSites()` inclut `userId` et `permissions`

### Hypothèse 4 : Autres services ne filtrent pas
**Services concernés :**
- `attendance.service.ts` : Filtre par `getManagedEmployeeIds()` ✅
- `leaves.service.ts` : Filtre par `getManagedEmployeeIds()` ✅
- `overtime.service.ts` : Filtre par `getManagedEmployeeIds()` ✅
- `schedules.service.ts` : Filtre par `getManagedEmployeeIds()` ✅
- `employees.service.ts` : Filtre par `getManagerLevel()` ✅
- `reports.service.ts` : Utilise `getManagerLevel()` pour le dashboard ✅

**Note :** Ces services filtrent correctement, mais ils filtrent par **employés gérés**, pas par départements/sites directement.

## Points à vérifier

### 1. Vérifier la table `SiteManager`
```sql
SELECT * FROM "SiteManager" 
WHERE "managerId" = (SELECT id FROM "Employee" WHERE "userId" = (SELECT id FROM "User" WHERE email = 'emp0025@demo.local'));
```

### 2. Vérifier le retour de `getManagerLevel()`
Ajouter des logs dans `departments.service.ts` :
```typescript
const managerLevel = await getManagerLevel(this.prisma, userId, tenantId);
console.log('Manager Level:', JSON.stringify(managerLevel, null, 2));
```

### 3. Vérifier les permissions de l'utilisateur
```typescript
console.log('User Permissions:', userPermissions);
console.log('Has view_all:', userPermissions?.includes('department.view_all'));
```

### 4. Vérifier le cache React Query
Dans `frontend/lib/hooks/useDepartments.ts` :
```typescript
queryKey: ['departments', user?.id, user?.permissions], // Inclure userId et permissions dans la clé
```

## Solution proposée

### Option 1 : Vérifier que `getManagerLevel()` fonctionne correctement
- Ajouter des logs pour voir ce qui est retourné
- Vérifier que la table `SiteManager` contient bien les données

### Option 2 : Invalider le cache React Query
- Modifier les `queryKey` pour inclure `userId` et `permissions`
- Forcer un refetch après connexion

### Option 3 : Vérifier les autres interfaces
- Le problème peut venir d'autres endroits qui chargent les départements/sites sans filtrage
- Vérifier tous les composants qui utilisent `useDepartments()` et `useSites()`

## Commandes de test

### Backend
```bash
# Vérifier les logs du backend lors de la connexion
# Chercher les logs de getManagerLevel() et findAll()
```

### Frontend
```bash
# Ouvrir la console du navigateur
# Vérifier les appels API vers /departments et /sites
# Vérifier les réponses retournées
```

## Fichiers à examiner en priorité

1. **`backend/src/modules/departments/departments.service.ts`** (lignes 34-94)
2. **`backend/src/modules/sites/sites.service.ts`** (lignes 171-211)
3. **`backend/src/common/utils/manager-level.util.ts`** (lignes 64-83)
4. **`frontend/lib/hooks/useDepartments.ts`** (vérifier le cache)
5. **`frontend/lib/hooks/useSites.ts`** (vérifier le cache)

## Notes importantes

- Le backend utilise `@CurrentUser()` pour extraire `userId` et `permissions` depuis le token JWT
- Les permissions sont chargées depuis `UserTenantRole` → `Role` → `Permission`
- Un manager régional peut gérer plusieurs sites du même département
- La contrainte métier : un manager régional ne peut gérer qu'un seul département

