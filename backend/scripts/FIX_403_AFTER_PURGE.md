# 🔧 Fix 403 Forbidden après Purge de la Base de Données

## ❌ Problème

Après avoir purgé la base de données, vous obtenez une erreur **403 Forbidden** lors de l'accès aux pages :

```
GET http://localhost:3000/api/v1/employees 403 (Forbidden)
```

## 🔍 Cause

Après la purge, **tous les rôles et permissions ont été supprimés**. Le système RBAC (Role-Based Access Control) n'est plus initialisé, donc :

- ❌ Les permissions n'existent plus (`employee.view_all`, `employee.view_own`, etc.)
- ❌ Les rôles n'existent plus (`ADMIN_RH`, `MANAGER`, `EMPLOYEE`)
- ❌ Les utilisateurs n'ont plus de rôles assignés
- ❌ Le guard `PermissionsGuard` bloque toutes les requêtes

## ✅ Solution

### Étape 1 : Réinitialiser le système RBAC

Exécutez le script d'initialisation RBAC :

```bash
cd backend
npm run init:rbac
```

Ou directement :
```bash
cd backend
npx ts-node scripts/init-rbac.ts
```

**Ce que fait ce script :**
- ✅ Crée toutes les permissions métier (60+ permissions)
- ✅ Crée le rôle SUPER_ADMIN (système)
- ✅ Crée les rôles par défaut pour chaque tenant (ADMIN_RH, MANAGER, EMPLOYEE)
- ✅ Assigne les permissions aux rôles

**Durée estimée :** 1-2 minutes

### Étape 2 : Réassigner automatiquement les rôles aux utilisateurs

Si vous avez utilisé `--keep-tenant`, vos utilisateurs existent toujours mais n'ont plus de rôles RBAC assignés. Utilisez le script automatique :

```bash
cd backend
npm run reassign:roles
```

**Ce que fait ce script :**
- ✅ Trouve tous les utilisateurs actifs
- ✅ Vérifie leur rôle legacy (ADMIN_RH, MANAGER, EMPLOYEE, SUPER_ADMIN)
- ✅ Trouve le rôle RBAC correspondant dans leur tenant
- ✅ Crée automatiquement les UserTenantRole manquants
- ✅ Gère les cas spéciaux (SUPER_ADMIN, utilisateurs sans rôle, etc.)
- ✅ Affiche un résumé détaillé

**Note :** Si un utilisateur n'a pas de rôle legacy, le script lui assigne automatiquement le rôle `EMPLOYEE` par défaut.

#### Alternative : Via Prisma Studio (si vous préférez le faire manuellement)

```bash
cd backend
npx prisma studio
```

1. Ouvrez la table `UserTenantRole`
2. Vérifiez si votre utilisateur a un rôle assigné
3. Si non, créez une nouvelle entrée :
   - `userId` : ID de votre utilisateur
   - `tenantId` : ID de votre tenant
   - `roleId` : ID du rôle ADMIN_RH (ou autre)

### Étape 3 : Redémarrer le serveur backend

```bash
cd backend
npm run start:dev
```

### Étape 4 : Se reconnecter

1. Déconnectez-vous de l'application
2. Reconnectez-vous avec vos identifiants
3. Le token JWT sera régénéré avec les nouvelles permissions

---

## 🔄 Workflow Complet après Purge

Si vous voulez repartir à zéro complètement :

```bash
# 1. Purger la base (en gardant tenants/utilisateurs)
cd backend
npm run purge:db:keep-tenant

# 2. Réinitialiser le RBAC
npm run init:rbac

# 3. Réassigner automatiquement les rôles aux utilisateurs
npm run reassign:roles

# 4. Redémarrer le serveur
npm run start:dev
```

**C'est tout !** Les utilisateurs peuvent maintenant se reconnecter avec leurs identifiants existants.

---

## 🐛 Dépannage

### Erreur : "Permission not found"

Le script `init-rbac.ts` n'a pas été exécuté. Exécutez-le :

```bash
npm run init:rbac
```

### Erreur : "User has no roles"

Votre utilisateur n'a pas de rôle assigné. Assignez-lui un rôle via Prisma Studio ou créez un script.

### Erreur : "Tenant not found"

Si vous avez fait une purge complète (sans `--keep-tenant`), vous devez d'abord créer un tenant :

```bash
npx ts-node scripts/init-tenant-and-user.ts
```

Puis exécutez `init-rbac.ts`.

---

## 📝 Permissions Requises pour les Employés

Pour accéder à la page des employés, vous avez besoin d'une de ces permissions :

- `employee.view_all` - Voir tous les employés (ADMIN_RH, MANAGER)
- `employee.view_own` - Voir ses propres informations (EMPLOYEE)
- `employee.view_team` - Voir les employés de son équipe (MANAGER)
- `employee.view_department` - Voir les employés de son département (MANAGER)
- `employee.view_site` - Voir les employés de son site (MANAGER)

Ces permissions sont automatiquement créées et assignées par le script `init-rbac.ts`.

---

**Créé le :** 2025-01-09

