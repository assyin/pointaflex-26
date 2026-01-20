# Solution : Problème shifts-planning - Manager voit tous les sites et départements

## Problème signalé
Dans l'interface **http://localhost:3001/shifts-planning**, le manager régional (emp0025@demo.local) voit tous les sites et départements au lieu de voir uniquement:
- Département: CIT
- Sites: CPT Rabat, CPT Marrakech

## Cause identifiée

La page shifts-planning utilise plusieurs hooks React Query qui **N'INCLUAIENT PAS** l'ID utilisateur dans leur `queryKey`, causant un partage de cache entre différents utilisateurs:

### Hooks problématiques
1. ❌ `useShifts()` → `queryKey: ['shifts']`
2. ❌ `useTeams()` → `queryKey: ['teams', filters]`
3. ❌ `useEmployees()` → `queryKey: ['employees', filters]`

Ces hooks chargeaient les données en cache d'un utilisateur précédent (ex: ADMIN) au lieu de récupérer les données filtrées du manager.

## Solution appliquée

### Fichiers modifiés

#### 1. `frontend/lib/hooks/useShifts.ts`
```typescript
// AVANT
export function useShifts() {
  return useQuery({
    queryKey: ['shifts'],
    queryFn: () => shiftsApi.getAll(),
    // ...
  });
}

// APRÈS
export function useShifts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['shifts', user?.id], // ✅ Include user ID
    queryFn: () => shiftsApi.getAll(),
    // ...
  });
}
```

#### 2. `frontend/lib/hooks/useTeams.ts`
```typescript
// AVANT
export function useTeams(filters?: any) {
  return useQuery({
    queryKey: ['teams', filters],
    queryFn: () => teamsApi.getAll(filters),
    // ...
  });
}

// APRÈS
export function useTeams(filters?: any) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['teams', user?.id, filters], // ✅ Include user ID
    queryFn: () => teamsApi.getAll(filters),
    // ...
  });
}
```

#### 3. `frontend/lib/hooks/useEmployees.ts`
```typescript
// AVANT
export function useEmployees(filters?: EmployeeFilters) {
  return useQuery({
    queryKey: ['employees', filters],
    queryFn: () => employeesApi.getAll(filters),
    // ...
  });
}

// APRÈS
export function useEmployees(filters?: EmployeeFilters) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['employees', user?.id, filters], // ✅ Include user ID
    queryFn: () => employeesApi.getAll(filters),
    // ...
  });
}
```

## Hooks déjà corrigés précédemment

Ces hooks utilisés dans shifts-planning étaient déjà corrigés:
- ✅ `useDepartments()` → `queryKey: ['departments', user?.id]`
- ✅ `useSites()` → `queryKey: ['sites', user?.id]`

## Instructions pour tester

### Option 1: Se reconnecter (RECOMMANDÉ)

1. **Se déconnecter** de l'application
2. **Se reconnecter** avec le compte manager:
   - Email: `emp0025@demo.local`
   - Mot de passe: `.b1a1L<E9Ms<`

Le cache sera automatiquement vidé grâce à `queryClient.clear()` lors de la connexion.

3. **Naviguer vers** http://localhost:3001/shifts-planning

### Option 2: Vider le cache manuellement

Si l'Option 1 ne suffit pas:

1. **Ouvrir DevTools** (F12)
2. **Console → Exécuter:**
   ```javascript
   localStorage.clear();
   window.location.reload();
   ```
3. **Se reconnecter**

## Résultat attendu dans shifts-planning

### ✅ Filtres "Site"
Le dropdown devrait afficher uniquement:
- CPT Rabat
- CPT Marrakech

**Ne devrait PAS afficher:**
- ~~Siège Social CASABLANCA~~

### ✅ Filtres "Équipe"
Uniquement les équipes du département CIT et des sites CPT Rabat/Marrakech

### ✅ Liste des plannings
Les plannings affichés dans les cartes devraient inclure uniquement les sites:
- CPT Rabat
- CPT Marrakech

## Vérification backend

Le backend filtre correctement les données selon le niveau du manager. Tests API confirmés:

```bash
# Test avec le token du manager emp0025@demo.local
GET /api/v1/sites → Retourne uniquement CPT Rabat et CPT Marrakech ✓
GET /api/v1/departments → Retourne uniquement CIT ✓
```

Le problème était uniquement côté frontend (cache React Query).

## Récapitulatif des corrections totales

### Tous les hooks React Query corrigés:
1. ✅ `useDepartments()` - frontend/lib/hooks/useDepartments.ts
2. ✅ `useDepartmentStats()` - frontend/lib/hooks/useDepartments.ts
3. ✅ `useSites()` - frontend/lib/hooks/useSites.ts
4. ✅ `useShifts()` - frontend/lib/hooks/useShifts.ts
5. ✅ `useTeams()` - frontend/lib/hooks/useTeams.ts
6. ✅ `useEmployees()` - frontend/lib/hooks/useEmployees.ts

### Invalidation automatique du cache:
- ✅ À la connexion - frontend/app/(auth)/login/page.tsx
- ✅ À la déconnexion - frontend/components/layout/header.tsx

## Impact sur les autres pages

Ces corrections affectent (positivement) toutes les pages qui utilisent ces hooks:
- ✅ Dashboard
- ✅ Employés
- ✅ Pointage (Attendance)
- ✅ **Shifts & Planning** ← Correction principale
- ✅ Congés (Leaves)
- ✅ Heures supplémentaires (Overtime)
- ✅ Rapports (Reports)
- ✅ Structure RH

Toutes ces pages bénéficient maintenant d'un cache isolé par utilisateur, éliminant les problèmes de données partagées entre utilisateurs.

## Note importante

Le problème ne se reproduira plus car:
1. Chaque utilisateur a maintenant son propre cache (queryKey inclut user?.id)
2. Le cache est vidé automatiquement à chaque connexion/déconnexion
3. Le backend filtre correctement les données selon le niveau du manager

Le manager `emp0025@demo.local` est assigné au département **CIT** sur les sites **CPT Rabat** et **CPT Marrakech**.
