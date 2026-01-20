# Solution : Siège Social CASABLANCA visible pour le Manager Régional

## Problème
Le manager régional (emp0025@demo.local) voit "Siège Social CASABLANCA" dans la liste des sites, alors qu'il devrait voir uniquement :
- CPT Rabat
- CPT Marrakech

## Cause
Le backend fonctionne correctement et filtre bien les sites. Le problème vient du **cache React Query** dans le navigateur qui contient encore les anciennes données avec la clé `['sites']` (avant notre correction qui ajoute l'ID utilisateur).

## Vérifications effectuées

### ✅ Backend
Test API `/api/v1/sites` avec le token du manager :
```
Sites retournés: 2
1. CPT Marrakech ✓
2. CPT Rabat ✓
```

**Résultat : Backend fonctionne correctement**

### ❌ Frontend
Le hook `useSites()` a été corrigé pour utiliser `queryKey: ['sites', user?.id]` au lieu de `['sites']`, mais le cache contient encore les anciennes données sous la clé `['sites']`.

## Solution

### Option 1: Vider le cache du navigateur (RECOMMANDÉ)

**Étape 1 : Vider le cache**
1. Ouvrir les DevTools (F12)
2. Aller dans l'onglet "Application" (ou "Storage" selon le navigateur)
3. Cliquer sur "Clear site data" / "Effacer les données du site"
4. Ou simplement : localStorage → Clic droit → Clear

**Étape 2 : Se déconnecter et reconnecter**
1. Se déconnecter de l'application
2. Fermer l'onglet
3. Rouvrir l'application et se reconnecter avec emp0025@demo.local

### Option 2: Forcer le rafraîchissement dans React Query

Si vous voulez rafraîchir sans vider le cache, dans la console du navigateur (F12), exécutez:

```javascript
// Invalider le cache des sites
window.localStorage.removeItem('sites');
// Recharger la page
window.location.reload();
```

## Vérification après correction

Après avoir vidé le cache, le manager régional devrait voir :

**✅ Départements visibles:**
- CIT uniquement

**✅ Sites visibles:**
- CPT Rabat
- CPT Marrakech

**❌ Sites qui ne devraient PAS être visibles:**
- Siège Social CASABLANCA

## Technique : Pourquoi ce problème s'est produit

1. **Avant la correction:**
   - `queryKey: ['sites']` → Tous les utilisateurs partagent le même cache
   - Un ADMIN se connecte → Voit 4 sites → Mis en cache sous `['sites']`
   - Le manager se connecte → Récupère le cache → Voit 4 sites ❌

2. **Après la correction:**
   - `queryKey: ['sites', user?.id]` → Chaque utilisateur a son propre cache
   - ADMIN : Cache sous `['sites', 'admin-id']` → Voit 4 sites
   - Manager : Cache sous `['sites', 'manager-id']` → Voit 2 sites ✓

3. **Problème transitoire:**
   - Les anciennes données sous `['sites']` restent en cache
   - Il faut les vider manuellement une fois

## Fichiers modifiés

- ✅ `backend/src/modules/departments/departments.service.ts` - Filtrage backend
- ✅ `backend/src/modules/sites/sites.service.ts` - Filtrage backend
- ✅ `backend/src/common/utils/manager-level.util.ts` - Détection manager level
- ✅ `frontend/lib/hooks/useDepartments.ts` - QueryKey avec user ID
- ✅ `frontend/lib/hooks/useSites.ts` - QueryKey avec user ID

## Prochaines connexions

À partir de maintenant, chaque utilisateur aura son propre cache et ne verra que ses propres données. Le problème ne se reproduira plus.
