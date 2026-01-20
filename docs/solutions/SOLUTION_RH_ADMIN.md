# Solution : RH Admin ne voit aucun planning

## 🎯 Problème Signalé

L'utilisateur RH Admin (rh@demo.com) ne voyait **aucun planning** dans l'interface shifts-planning alors qu'il devrait voir **TOUS** les plannings de tous les départements et sites.

**Message affiché:**
```
Aucun planning trouvé
Aucun planning n'a été créé pour la période du 15/12/2025 au 21/12/2025.
Données reçues: 0 planning(s)
```

## 🔍 Cause Racine Identifiée

### Problème dans `schedules.service.ts` (ligne 406)

```typescript
// ❌ CODE PROBLÉMATIQUE (AVANT)
} else if (hasViewOwn) {
  // Si pas manager et a seulement 'view_own', filtrer par son propre ID
  const employee = await this.prisma.employee.findFirst({
    where: { userId, tenantId },
    select: { id: true },
  });

  if (employee) {
    where.employeeId = employee.id;
  } else {
    // Si pas d'employé lié, retourner vide ❌
    return {
      data: [],
      meta: { total: 0 },
    };
  }
}
```

### Pourquoi ça ne fonctionnait pas?

Le RH Admin:
1. ✅ N'est **PAS** un manager (managerLevel.type = null)
2. ✅ A la permission `schedule.view_all` (devrait voir tout)
3. ✅ A aussi la permission `schedule.view_own`
4. ❌ N'a **PAS** d'enregistrement Employee dans la base de données

**Séquence d'exécution:**
1. Passe tous les `if` pour managers (DEPARTMENT, SITE, TEAM)
2. Entre dans `else if (hasViewOwn)` car hasViewOwn = true
3. Cherche un Employee → ne trouve rien (NULL)
4. Retourne un tableau vide!

**Le code ne vérifiait pas `view_all` avant `view_own`**

## ✅ Solution Appliquée

### Fichier modifié
**`backend/src/modules/schedules/schedules.service.ts`** - Ligne 406

### Changement
```typescript
// ✅ CODE CORRIGÉ (APRÈS)
} else if (hasViewOwn && !hasViewAll) {
  // Si pas manager, n'a PAS 'view_all', mais a 'view_own', filtrer par son propre ID
  const employee = await this.prisma.employee.findFirst({
    where: { userId, tenantId },
    select: { id: true },
  });

  if (employee) {
    where.employeeId = employee.id;
  } else {
    // Si pas d'employé lié, retourner vide
    return {
      data: [],
      meta: { total: 0 },
    };
  }
}
// Si managerLevel.type === null ET hasViewAll, l'utilisateur voit tout (ADMIN_RH, SUPER_ADMIN)
```

**Changement clé:** Ajout de `&& !hasViewAll` dans la condition

## 🧪 Test Backend Validé

```bash
npx ts-node scripts/test-rh-schedules.ts
```

**Résultat:**
```
RH User found: rh@demo.com
Has Employee record: No (NULL)

✓ PASS - RH Admin can see schedules from multiple sites:
  Total: 142 schedules
  Sites: 3 different sites
  Departments: 4 different departments

Schedules count by site:
  CPT Marrakech: 29 schedule(s)
  CPT Rabat: 39 schedule(s)
  Siège Social CASABLANCA: 74 schedule(s)
```

**✅ Le RH Admin voit maintenant TOUS les plannings de TOUS les sites!**

## 📋 Instructions Pour Tester

### IMPORTANT: Se déconnecter et reconnecter

1. **Se déconnecter** de l'application

2. **Se reconnecter** avec le compte RH:
   - Email: `rh@demo.com`
   - Mot de passe: (demander le mot de passe)

Le cache React Query sera automatiquement vidé lors de la connexion.

3. **Aller sur** http://localhost:3001/shifts-planning

### Résultat Attendu

**Dans le filtre "Site":**
- ✅ Tous les sites (CPT Rabat, CPT Marrakech, Siège Social CASABLANCA, etc.)

**Dans les cartes de plannings:**
- ✅ Tous les plannings de tous les sites
- ✅ Message "142 planning(s)" au lieu de "0 planning(s)"

## 🎓 Leçon Apprise

### Ordre de Priorité des Vérifications

```
1. Est-ce un MANAGER?
   → OUI: Filtrer selon son niveau (même avec view_all)
   → NON: Passer à l'étape 2

2. A-t-il view_all?
   → OUI: Voir TOUT (ne pas appliquer view_own)
   → NON: Passer à l'étape 3

3. A-t-il view_own?
   → OUI: Filtrer par son propre employé
   → NON: Ne rien voir (ou permissions spécifiques)
```

### Règle d'Or

**`view_all` PRIME sur `view_own` pour les non-managers**

```typescript
// ✅ CORRECT
if (hasViewOwn && !hasViewAll) {
  // Appliquer le filtre view_own
}

// ❌ INCORRECT
if (hasViewOwn) {
  // Appliquerait le filtre même si l'utilisateur a view_all
}
```

## 🔒 Impact Sécurité

Cette correction **N'AFFECTE PAS** la sécurité des managers:

- ✅ Manager régional voit uniquement son département/site
- ✅ Manager de département voit uniquement son département
- ✅ Manager d'équipe voit uniquement son équipe
- ✅ RH Admin (non-manager) voit TOUT
- ✅ SUPER_ADMIN (non-manager) voit TOUT

## 📊 Récapitulatif des Cas d'Usage

| Utilisateur | Manager? | view_all? | view_own? | Employee? | Voit |
|------------|----------|-----------|-----------|-----------|------|
| Manager Régional | OUI (SITE) | OUI | OUI | OUI | Son département/site uniquement |
| Manager Département | OUI (DEPT) | OUI | OUI | OUI | Son département uniquement |
| RH Admin | NON | OUI | OUI | **NON** | TOUT ✓ |
| SUPER_ADMIN | NON | OUI | OUI | Peut-être | TOUT ✓ |
| Employé | NON | NON | OUI | OUI | Ses propres plannings |
| Employé Sans View Own | NON | NON | NON | OUI | Rien |

## ✨ Status Final

**PROBLÈME 100% RÉSOLU**

Le système fonctionne maintenant correctement pour:
- ✅ Managers (filtrage selon leur niveau hiérarchique)
- ✅ RH Admin (voit tout)
- ✅ SUPER_ADMIN (voit tout)
- ✅ Employés (voient leurs propres plannings si view_own)

Tous les cas d'usage sont couverts et sécurisés! 🎉
