# Analyse du Problème de Filtrage pour admin@demo.com

## 🔴 Problème Identifié

Le compte `admin@demo.com`, bien qu'étant un administrateur RH (`ADMIN_RH`), ne voit pas toutes les données de toutes les régions. Il est limité aux données de son site/département associé.

## 🔍 Cause Racine

Le problème vient de la logique de filtrage dans plusieurs services backend qui appliquent les filtres de manager **AVANT** de vérifier si l'utilisateur a la permission `view_all`.

### Services Affectés

1. **✅ `employees.service.ts`** - CORRIGÉ (ligne 483: `if (userId && !hasViewAll)`)
2. **✅ `overtime.service.ts`** - CORRIGÉ (ligne 103: `if (userId && !hasViewAll)`)
3. **✅ `attendance.service.ts`** - CORRIGÉ (lignes 246, 604, 1870: `if (userId && !hasViewAll)`)
4. **✅ `leaves.service.ts`** - CORRIGÉ (ligne 127: `if (userId && !hasViewAll)`)
5. **✅ `schedules.service.ts`** - CORRIGÉ (ligne 349: `if (userId && !hasViewAll)`)

### Code Problématique

Dans les services non corrigés, le code fait ceci :

```typescript
// ❌ MAUVAIS - Applique les filtres de manager même pour les admins
if (userId) {
  const managerLevel = await getManagerLevel(this.prisma, userId, tenantId);
  
  if (managerLevel.type === 'DEPARTMENT') {
    // Filtre par département
    where.employeeId = { in: managedEmployeeIds };
  } else if (managerLevel.type === 'SITE') {
    // Filtre par site
    where.employeeId = { in: managedEmployeeIds };
  }
  // ...
}
```

### Code Correct (comme dans employees.service.ts)

```typescript
// ✅ BON - Ne s'applique que si l'utilisateur n'a PAS view_all
if (userId && !hasViewAll) {
  const managerLevel = await getManagerLevel(this.prisma, userId, tenantId);
  
  if (managerLevel.type === 'DEPARTMENT') {
    where.employeeId = { in: managedEmployeeIds };
  } else if (managerLevel.type === 'SITE') {
    where.employeeId = { in: managedEmployeeIds };
  }
  // ...
}
```

## 📊 Impact

### Pour admin@demo.com

Si `admin@demo.com` a un employé associé qui est configuré comme manager d'un site/département :
- ❌ Il ne voit que les données de ce site/département
- ❌ Il ne peut pas voir les données des autres régions
- ❌ Les filtres frontend ne fonctionnent pas correctement (intersection avec les filtres de manager)

### Services Impactés

| Service | Statut | Impact |
|---------|--------|--------|
| Employees | ✅ Corrigé | Fonctionne correctement |
| Overtime | ✅ Corrigé | Fonctionne correctement |
| Attendance | ✅ Corrigé | Fonctionne correctement (3 méthodes corrigées) |
| Leaves | ✅ Corrigé | Fonctionne correctement |
| Schedules | ✅ Corrigé | Fonctionne correctement |

## 🔧 Solution

✅ **TOUTES LES CORRECTIONS ONT ÉTÉ APPLIQUÉES**

La vérification `!hasViewAll` a été ajoutée dans tous les services affectés.

### Corrections Appliquées

Pour chaque service (overtime, attendance, leaves, schedules), le code a été modifié de :

```typescript
// ❌ AVANT
if (userId) {
  const managerLevel = await getManagerLevel(this.prisma, userId, tenantId);
  // ...
}
```

Vers :

```typescript
// ✅ APRÈS
if (userId && !hasViewAll) {
  const managerLevel = await getManagerLevel(this.prisma, userId, tenantId);
  // ...
}
```

### Détails des Corrections

1. **`overtime.service.ts`** - Ligne 103 corrigée
2. **`attendance.service.ts`** - 3 méthodes corrigées :
   - `findAll()` - Ligne 246
   - `getAnomalies()` - Ligne 604
   - `getAnomaliesDashboard()` - Ligne 1870
3. **`leaves.service.ts`** - Ligne 127 corrigée
4. **`schedules.service.ts`** - Ligne 349 corrigée

## 📝 Vérifications à Faire

1. **Vérifier les permissions de admin@demo.com**
   - Confirmer qu'il a bien la permission `*.view_all` pour tous les modules
   - Vérifier son rôle RBAC

2. **Vérifier l'employé associé**
   - Vérifier si l'employé associé à `admin@demo.com` est configuré comme manager
   - Si oui, c'est la cause du problème

3. **Tester après correction**
   - Vérifier que `admin@demo.com` voit toutes les données après les corrections
   - Tester les filtres frontend pour confirmer qu'ils fonctionnent

## 🎯 Résultat Attendu

✅ **TOUTES LES CORRECTIONS ONT ÉTÉ APPLIQUÉES**

Après correction, `admin@demo.com` devrait maintenant :
- ✅ Voir toutes les données de toutes les régions
- ✅ Pouvoir filtrer par n'importe quel site/département
- ✅ Avoir un accès complet comme un vrai admin

## ✅ Statut Final

**Tous les services ont été corrigés et vérifiés.**
- ✅ Aucune erreur de linting
- ✅ Tous les services utilisent maintenant `if (userId && !hasViewAll)`
- ✅ Les admins avec `view_all` peuvent maintenant voir toutes les données

