# 🚀 Implémentation - Hiérarchie des Managers

## ✅ État d'Avancement

### Phase 1 : Structure de Données ✅

1. ✅ **Ajout de `managerId` au modèle `Site`** dans Prisma schema
   - Relation avec `Employee` via `@relation("SiteManager")`
   - Index ajouté sur `managerId`

2. ✅ **Ajout de la relation `managedSites` dans `Employee`**
   - Permet de récupérer tous les sites gérés par un manager

3. ✅ **Mise à jour des DTOs**
   - `CreateSiteDto` : Ajout de `managerId` (optionnel, UUID)
   - `UpdateSiteDto` : Hérite automatiquement de `CreateSiteDto`

4. ✅ **Mise à jour de `SitesService`**
   - Validation du manager lors de la création/modification
   - Inclusion du manager dans les réponses (`findAll`, `findOne`, `create`, `update`)

### Phase 2 : Utilitaires ✅

5. ✅ **Création de `manager-level.util.ts`**
   - Fonction `getManagerLevel()` : Détecte automatiquement le niveau hiérarchique
     - Priorité 1 : Manager de Département
     - Priorité 2 : Manager de Site
     - Priorité 3 : Manager d'Équipe
   - Fonction `getManagedEmployeeIds()` : Récupère les IDs des employés gérés

### Phase 3 : Permissions RBAC ✅

6. ✅ **Ajout des nouvelles permissions**
   - `employee.view_department` : Voir les employés de son département
   - `employee.view_site` : Voir les employés de son site
   - `attendance.view_department` : Voir les pointages de son département
   - `attendance.view_site` : Voir les pointages de son site
   - `schedule.view_department` : Voir le planning de son département
   - `schedule.view_site` : Voir le planning de son site
   - `leave.view_department` : Voir les congés de son département
   - `leave.view_site` : Voir les congés de son site
   - `overtime.view_department` : Voir les heures sup de son département
   - `overtime.view_site` : Voir les heures sup de son site

7. ✅ **Assignation des permissions aux rôles**
   - `MANAGER` : Toutes les nouvelles permissions ajoutées
   - `ADMIN_RH` : Toutes les nouvelles permissions ajoutées
   - `SUPER_ADMIN` : Toutes les permissions (déjà en place)

### Phase 4 : Logique de Filtrage ✅

8. ✅ **Adaptation de `EmployeesService.findAll()`**
   - Détection automatique du niveau hiérarchique
   - Filtrage automatique selon le niveau :
     - Manager de Département → `where.departmentId = managerLevel.departmentId`
     - Manager de Site → `where.siteId = managerLevel.siteId`
     - Manager d'Équipe → `where.teamId = managerLevel.teamId`

9. ✅ **Adaptation de `AttendanceService.findAll()`**
   - Détection automatique du niveau hiérarchique
   - Filtrage par IDs d'employés gérés selon le niveau

10. ✅ **Adaptation de `SchedulesService.findAll()`**
    - Détection automatique du niveau hiérarchique
    - Filtrage par IDs d'employés gérés selon le niveau

11. ✅ **Adaptation de `LeavesService.findAll()`**
    - Détection automatique du niveau hiérarchique
    - Filtrage par IDs d'employés gérés selon le niveau

12. ✅ **Adaptation de `OvertimeService.findAll()`**
    - Détection automatique du niveau hiérarchique
    - Filtrage par IDs d'employés gérés selon le niveau

### Phase 5 : Dashboards Adaptatifs ✅

13. ✅ **Création des dashboards**
    - `getDepartmentDashboardStats()` : Dashboard pour Manager de Département
      - Statistiques de tous les employés du département (tous sites confondus)
      - Liste des sites du département
      - Graphiques et métriques agrégées
    - `getSiteDashboardStats()` : Dashboard pour Manager Régional
      - Statistiques de tous les employés du site (tous départements confondus)
      - Liste des départements présents sur le site
      - Graphiques et métriques agrégées
    - Adaptation de `getTeamDashboardStats()` : Dashboard pour Manager d'Équipe (existant)
    - Router dans `getDashboardStats()` avec détection automatique du niveau

### Phase 6 : Migration Base de Données (À Faire)

11. ⏳ **Migration Prisma**
    - Créer la migration pour ajouter `managerId` au modèle `Site`
    - Exécuter `npx prisma migrate dev --name add_site_manager_id`

---

## 📋 Prochaines Étapes

### Immédiat
1. ✅ Terminer l'adaptation de `EmployeesService` (fait)
2. ✅ Adapter `AttendanceService.findAll()` (fait)
3. ✅ Adapter `SchedulesService.findAll()` (fait)
4. ✅ Adapter `LeavesService.findAll()` (fait)
5. ✅ Adapter `OvertimeService.findAll()` (fait)

### Court Terme
6. ✅ Créer les dashboards adaptatifs dans `ReportsService` (fait)
7. ⏳ Créer et exécuter la migration Prisma
8. ⏳ Tester avec des données réelles

### Moyen Terme
9. ⏳ Mettre à jour le frontend pour afficher le manager dans les sites
10. ⏳ Adapter les interfaces de gestion des sites pour assigner un manager
11. ⏳ Tester les permissions et le filtrage automatique

---

## 🔍 Points d'Attention

### 1. Un Site peut avoir des employés de plusieurs départements
- ✅ Géré : Un manager de site voit tous les employés du site, tous départements confondus
- ✅ Géré : Un manager de département voit tous les employés du département, tous sites confondus

### 2. Un Site n'a qu'un seul manager
- ✅ Géré : `managerId` est un champ unique (pas un tableau)
- ⚠️ **Limitation** : Un site ne peut avoir qu'un seul manager régional
- 💡 **Solution future** : Si besoin, créer une table de liaison `SiteManager` pour plusieurs managers

### 3. Manager de Direction peut gérer sans Manager Régional
- ✅ Géré : Si un site n'a pas de `managerId`, le Manager de Direction gère directement
- ✅ Géré : La logique de filtrage fonctionne même sans manager régional

---

## 📝 Notes Techniques

### Structure de la Hiérarchie

```
Tenant
├── Department (CIT, Caisse, Fleet, Technique, IT, Inspection, ...)
│   └── Manager de Direction (gère tous les sites du département)
│       └── Site (Casablanca, Rabat, Tanger, ...)
│           ├── Manager Régional (optionnel - gère tous les départements du site)
│           └── Employees (peuvent être de différents départements)
│               └── Team
│                   └── Manager d'Équipe (gère uniquement son équipe)
```

### Logique de Filtrage

```typescript
// Priorité de filtrage
if (managerLevel.type === 'DEPARTMENT') {
  // Manager de Direction : Tous les employés du département, tous sites confondus
  where.departmentId = managerLevel.departmentId;
} else if (managerLevel.type === 'SITE') {
  // Manager Régional : Tous les employés du site, tous départements confondus
  where.siteId = managerLevel.siteId;
} else if (managerLevel.type === 'TEAM') {
  // Manager d'Équipe : Tous les employés de l'équipe
  where.teamId = managerLevel.teamId;
}
```

---

**Date de création** : 2025-12-12
**Dernière mise à jour** : 2025-12-12
**Statut** : ✅ **IMPLÉMENTATION COMPLÈTE** (sauf migration Prisma)

## 🎉 Résumé Final

### ✅ Tous les Services Adaptés

Tous les services ont été adaptés pour supporter la hiérarchie des managers :
- ✅ `EmployeesService.findAll()` : Filtrage par département/site/équipe
- ✅ `AttendanceService.findAll()` : Filtrage par département/site/équipe
- ✅ `SchedulesService.findAll()` : Filtrage par département/site/équipe
- ✅ `LeavesService.findAll()` : Filtrage par département/site/équipe
- ✅ `OvertimeService.findAll()` : Filtrage par département/site/équipe

### ✅ Dashboards Créés

- ✅ `getDepartmentDashboardStats()` : Dashboard Manager de Direction
  - Affiche les statistiques de tous les sites du département
  - Liste des sites avec nombre d'employés
  - Graphiques et métriques agrégées
  
- ✅ `getSiteDashboardStats()` : Dashboard Manager Régional
  - Affiche les statistiques de tous les départements du site
  - Liste des départements avec nombre d'employés
  - Graphiques et métriques agrégées

### ⚠️ Action Requise

**Migration Prisma** : Il reste à créer et exécuter la migration pour ajouter `managerId` au modèle `Site` :

```bash
cd backend
npx prisma migrate dev --name add_site_manager_id
```

Cette migration ajoutera la colonne `managerId` à la table `Site` dans la base de données.

