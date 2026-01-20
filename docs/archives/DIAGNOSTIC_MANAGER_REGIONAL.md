# Diagnostic : Manager Régional - Interface incomplète

## Problème identifié

Le compte manager régional (`temp002@test.local`) n'a pas accès à l'interface complète malgré que tous les droits soient assignés.

## Cause principale

La **sidebar** (menu de navigation) ne vérifiait pas les permissions `view_site` et `view_department` qui sont nécessaires pour les managers régionaux et les managers de département.

### Permissions manquantes dans la vérification de la sidebar

Les menus suivants ne vérifiaient que `view_all`, `view_own`, et `view_team`, mais **pas** `view_site` et `view_department` :

1. **Employés** - Nécessite aussi `employee.view_site` et `employee.view_department`
2. **Pointages** - Nécessite aussi `attendance.view_site` et `attendance.view_department`
3. **Shifts & Planning** - Nécessite aussi `schedule.view_site` et `schedule.view_department`
4. **Congés & Absences** - Nécessite aussi `leave.view_site` et `leave.view_department`
5. **Heures supplémentaires** - Nécessite aussi `overtime.view_site` et `overtime.view_department`

## Solution appliquée

✅ **Correction de la sidebar** : Ajout des permissions `view_site` et `view_department` dans les vérifications de chaque menu.

## Vérifications à faire

### 1. Vérifier que le rôle MANAGER a bien les permissions

Le rôle MANAGER doit avoir ces permissions (défini dans `backend/scripts/init-rbac.ts`) :
- `employee.view_site`
- `employee.view_department`
- `attendance.view_site`
- `attendance.view_department`
- `schedule.view_site`
- `schedule.view_department`
- `leave.view_site`
- `leave.view_department`
- `overtime.view_site`
- `overtime.view_department`

### 2. Vérifier que l'utilisateur a bien le rôle MANAGER assigné

Vérifier dans la base de données que :
- L'utilisateur `temp002@test.local` a un enregistrement dans `UserTenantRole`
- Le rôle assigné est `MANAGER`
- Le champ `isActive` est `true`

### 3. Vérifier que l'utilisateur est bien un manager régional

Vérifier dans la base de données que :
- L'employé lié à `temp002@test.local` a des enregistrements dans `SiteManager`
- Ces enregistrements ont `isActive = true`

### 4. Reconnecter l'utilisateur

⚠️ **IMPORTANT** : Après toute modification des permissions ou rôles, l'utilisateur doit **se déconnecter et se reconnecter** pour que le JWT soit régénéré avec les nouvelles permissions.

## Test de validation

1. Se connecter avec `temp002@test.local`
2. Vérifier que les menus suivants sont visibles :
   - ✅ Tableau de bord
   - ✅ Employés
   - ✅ Pointages
   - ✅ Shifts & Planning
   - ✅ Alertes de Conformité
   - ✅ Équipes
   - ✅ Congés & Absences
   - ✅ Heures supplémentaires
   - ✅ Rapports
   - ✅ Profil

3. Vérifier que les menus suivants sont **masqués** (normal pour un MANAGER) :
   - ❌ Structure RH (nécessite `tenant.manage_*`)
   - ❌ Terminaux (nécessite `tenant.manage_devices`)
   - ❌ Audit (nécessite `audit.view_all`)
   - ❌ Gestion des accès (nécessite `role.view_all`)
   - ❌ Paramètres (nécessite `tenant.view_settings`)

## Si le problème persiste

1. **Vérifier les permissions dans le JWT** :
   - Ouvrir les DevTools (F12)
   - Aller dans l'onglet "Application" > "Local Storage"
   - Vérifier la clé `user` et regarder le tableau `permissions`
   - Vérifier que `employee.view_site`, `attendance.view_site`, etc. sont présents

2. **Vérifier les rôles dans le JWT** :
   - Dans le même objet `user`, vérifier que `roles` contient `["MANAGER"]`

3. **Vérifier dans la base de données** :
   ```sql
   -- Vérifier les rôles de l'utilisateur
   SELECT u.email, r.code, utr."isActive"
   FROM "User" u
   JOIN "UserTenantRole" utr ON utr."userId" = u.id
   JOIN "Role" r ON r.id = utr."roleId"
   WHERE u.email = 'temp002@test.local';
   
   -- Vérifier les permissions du rôle MANAGER
   SELECT p.code
   FROM "Role" r
   JOIN "RolePermission" rp ON rp."roleId" = r.id
   JOIN "Permission" p ON p.id = rp."permissionId"
   WHERE r.code = 'MANAGER' AND p."isActive" = true
   ORDER BY p.code;
   ```

4. **Si les permissions ne sont pas dans le JWT** :
   - Se déconnecter complètement
   - Se reconnecter
   - Vérifier à nouveau le JWT

## Fichiers modifiés

- `frontend/components/layout/sidebar.tsx` : Ajout des permissions `view_site` et `view_department` dans les vérifications

