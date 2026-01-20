# Solution Complète : Problème Manager Régional

## Problèmes résolus

### 1. ✅ Manager voit tous les départements
**Cause**: Cache React Query partagé entre utilisateurs (queryKey sans user ID)
**Solution**: Ajout de `user?.id` dans les `queryKey` de `useDepartments()` et `useDepartmentStats()`

### 2. ✅ Manager voit tous les sites (incluant Siège Social CASABLANCA)
**Cause**: Cache React Query partagé entre utilisateurs (queryKey sans user ID)
**Solution**: Ajout de `user?.id` dans la `queryKey` de `useSites()`

## Modifications apportées

### Backend (déjà fonctionnel)
Aucune modification nécessaire - le filtrage backend fonctionnait correctement.

✅ Tests API confirmés:
- `/api/v1/departments` → Retourne uniquement CIT
- `/api/v1/sites` → Retourne uniquement CPT Rabat et CPT Marrakech

### Frontend

#### 1. Hooks React Query
**Fichiers modifiés:**
- `frontend/lib/hooks/useDepartments.ts`
- `frontend/lib/hooks/useSites.ts`

**Changements:**
```typescript
// AVANT
queryKey: ['departments']
queryKey: ['sites']

// APRÈS
queryKey: ['departments', user?.id]
queryKey: ['sites', user?.id]
```

#### 2. Invalidation automatique du cache

**Fichier modifié:** `frontend/app/(auth)/login/page.tsx`
```typescript
// Ajout lors de la connexion
queryClient.clear(); // Vide tout le cache React Query
```

**Fichier modifié:** `frontend/components/layout/header.tsx`
```typescript
// Ajout lors de la déconnexion
queryClient.clear(); // Vide tout le cache React Query
```

## Instructions pour tester

### Option 1: Test immédiat (RECOMMANDÉ)

1. **Se déconnecter de l'application**
2. **Se reconnecter avec le compte manager:**
   - Email: `emp0025@demo.local`
   - Mot de passe: `.b1a1L<E9Ms<`

Le cache sera automatiquement vidé lors de la connexion grâce à `queryClient.clear()`.

### Option 2: Test manuel (si Option 1 ne fonctionne pas)

1. **Ouvrir DevTools** (F12)
2. **Aller dans Application → Storage**
3. **Cliquer sur "Clear site data"**
4. **Recharger la page** (Ctrl+R ou F5)
5. **Se reconnecter**

## Résultat attendu

### ✅ Départements visibles
- **CIT** uniquement

### ✅ Sites visibles
- **CPT Rabat**
- **CPT Marrakech**

### ❌ Ce qui ne devrait PAS être visible
- ~~Siège Social CASABLANCA~~
- ~~Autres départements (CPT, DIRECTION, etc.)~~
- ~~Autres sites~~

## Vérification dans les interfaces

Le manager régional devrait voir les données filtrées dans:
- ✅ Dashboard
- ✅ Pointage (Attendance)
- ✅ Planning (Shifts & Planning)
- ✅ Congés (Leaves)
- ✅ Heures supplémentaires (Overtime)
- ✅ Rapports (Reports)
- ✅ Employés (Employees)
- ✅ Structure RH (Départements, Sites)

## Explication technique

### Avant la correction
```
┌─────────────────────────────────────────┐
│ React Query Cache                       │
├─────────────────────────────────────────┤
│ ['departments'] → 11 départements       │ ← Cache partagé!
│ ['sites'] → 4 sites                     │ ← Cache partagé!
└─────────────────────────────────────────┘
         ↓ utilisé par ↓
   ADMIN et MANAGER (même cache!)
```

**Problème:** Quand un ADMIN se connecte, il met en cache tous les départements/sites. Quand le MANAGER se connecte après, il récupère le cache de l'ADMIN.

### Après la correction
```
┌─────────────────────────────────────────┐
│ React Query Cache                       │
├─────────────────────────────────────────┤
│ ['departments', 'admin-id'] → 11 depts  │ ← Cache ADMIN
│ ['departments', 'manager-id'] → 1 dept  │ ← Cache MANAGER
│ ['sites', 'admin-id'] → 4 sites         │ ← Cache ADMIN
│ ['sites', 'manager-id'] → 2 sites       │ ← Cache MANAGER
└─────────────────────────────────────────┘
```

**Solution:** Chaque utilisateur a son propre cache, séparé par son ID.

## Prochaines connexions

À partir de maintenant:
- ✅ Chaque utilisateur a son propre cache (queryKey inclut user?.id)
- ✅ Le cache est automatiquement vidé à la connexion/déconnexion
- ✅ Le problème ne se reproduira plus

## Note importante

Le manager `emp0025@demo.local` est assigné au département **CIT** (pas CPT).
Les sites "CPT Rabat" et "CPT Marrakech" appartiennent au département **CIT**.

Cette confusion vient des noms de sites qui commencent par "CPT" mais qui appartiennent au département "CIT".

## Scripts de test créés

Deux scripts ont été créés pour vérifier le bon fonctionnement:

1. `backend/scripts/test-departments-api.ts` - Test API départements
2. `backend/scripts/test-sites-api.ts` - Test API sites

Exécution:
```bash
cd backend
npx ts-node scripts/test-departments-api.ts
npx ts-node scripts/test-sites-api.ts
```

Les deux tests passent avec succès ✓
