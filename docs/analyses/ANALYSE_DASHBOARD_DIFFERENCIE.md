# 📊 Analyse Professionnelle - Dashboard Différencié par Profil

## 🎯 Objectif

Analyser l'interface Dashboard actuelle et proposer une structure différenciée selon les profils utilisateurs (EMPLOYEE, MANAGER, ADMIN_RH, SUPER_ADMIN). Chaque profil doit voir uniquement les informations pertinentes à son rôle et ses permissions.

---

## 📋 État Actuel du Dashboard

### Contenu Actuel (Identique pour Tous)

Le Dashboard actuel affiche pour **TOUS** les profils :

1. **Filtres Avancés** :
   - Période (Aujourd'hui, Semaine, Mois, Trimestre)
   - Département (Tous)
   - Site (Tous)
   - Équipe (Toutes)
   - Export PDF/Excel/Email

2. **Onglets** :
   - **Vue d'ensemble** : KPIs, graphiques, statistiques globales
   - **Présences** : Graphiques de tendances, statistiques détaillées
   - **Performance** : Top performers, performance par département
   - **Alertes** : Anomalies, approbations en attente
   - **Temps Réel** : Activité en temps réel (derniers pointages)

3. **KPIs Principaux** :
   - Taux de présence global
   - Retards (7 jours)
   - Total pointages
   - Heures supplémentaires
   - Employés actifs
   - Congés en cours
   - Anomalies détectées

4. **Graphiques** :
   - Bar Chart : Retards & Absences (7 jours)
   - Pie Chart : Répartition des Shifts
   - Line Chart : Évolution des heures sup (4 semaines)
   - Area Chart : Tendance quotidienne des présences
   - Radar Chart : Performance par département

5. **Widgets** :
   - Top Performers (ponctualité)
   - Performance par département
   - Activité en temps réel
   - Alertes et approbations

### ❌ Problèmes Identifiés

1. **Pas de différenciation** : Tous les profils voient exactement la même interface
2. **Données inappropriées** : Un employé voit les statistiques de tous les employés
3. **Filtres inutiles** : Un employé n'a pas besoin de filtrer par département/site/équipe
4. **Onglets non pertinents** : Un employé n'a pas besoin de voir "Performance" ou "Alertes" globales
5. **Permissions non respectées** : Les données affichées ne respectent pas les permissions RBAC
6. **Performance** : Chargement de données inutiles pour certains profils

---

## 🎯 Dashboard Différencié par Profil

### 1. 📱 EMPLOYEE (Employé)

#### Objectif
L'employé doit voir **uniquement ses propres données** : ses pointages, ses congés, ses heures sup, son planning.

#### Contenu Proposé

**Onglet 1 : Mon Tableau de Bord**
- **KPIs Personnels** :
  - Mes heures travaillées (aujourd'hui, cette semaine, ce mois)
  - Mes retards (ce mois)
  - Mes heures supplémentaires (ce mois)
  - Mes congés restants (solde)
  - Mon taux de ponctualité (ce mois)

- **Widgets** :
  - Mon planning de la semaine (calendrier)
  - Mes derniers pointages (5 derniers)
  - Mes demandes de congés en attente
  - Mes heures sup en attente d'approbation

- **Graphiques** :
  - Mes heures travaillées par jour (7 derniers jours)
  - Mes heures travaillées par semaine (4 dernières semaines)
  - Mon historique de ponctualité (courbe)

**Onglet 2 : Mes Pointages**
- Liste de mes pointages (filtrable par période)
- Graphique de mes heures travaillées
- Détection d'anomalies sur mes pointages uniquement

**Onglet 3 : Mes Congés**
- Solde de congés disponible
- Historique de mes congés
- Demandes en attente
- Graphique de consommation de congés

**Onglet 4 : Mon Planning**
- Planning de la semaine en cours
- Planning du mois en cours
- Shifts assignés

#### Filtres
- Période uniquement (Aujourd'hui, Semaine, Mois)
- Pas de filtres département/site/équipe

#### Permissions Requises
- `attendance.view_own`
- `schedule.view_own`
- `leave.view_own`
- `overtime.view_own`

#### Données Backend
- Endpoint : `GET /users/me/stats` (existe déjà)
- Endpoint : `GET /attendance?employeeId=me`
- Endpoint : `GET /leaves?employeeId=me`
- Endpoint : `GET /schedules?employeeId=me`

---

### 2. 👔 MANAGER (Manager)

#### Objectif
Le manager doit voir les données de **son équipe** : statistiques de l'équipe, pointages de l'équipe, congés de l'équipe, performance de l'équipe.

#### Contenu Proposé

**Onglet 1 : Vue d'Ensemble Équipe**
- **KPIs Équipe** :
  - Taux de présence de l'équipe (aujourd'hui, cette semaine)
  - Retards de l'équipe (7 jours)
  - Employés présents aujourd'hui / Total équipe
  - Congés en cours dans l'équipe
  - Heures sup de l'équipe (ce mois)
  - Demandes en attente d'approbation (congés + heures sup)

- **Widgets** :
  - Top performers de l'équipe (ponctualité)
  - Employés absents aujourd'hui
  - Planning de l'équipe (semaine en cours)
  - Alertes de l'équipe (anomalies, retards répétés)

- **Graphiques** :
  - Présences de l'équipe par jour (7 jours)
  - Retards & Absences de l'équipe (7 jours)
  - Heures travaillées par employé (top 5)
  - Performance de l'équipe vs objectifs

**Onglet 2 : Présences Équipe**
- Liste des pointages de l'équipe (filtrable)
- Graphiques de tendances
- Détection d'anomalies dans l'équipe

**Onglet 3 : Performance Équipe**
- Classement de ponctualité
- Performance individuelle
- Comparaison avec autres équipes (si autorisé)

**Onglet 4 : Approbations**
- Demandes de congés en attente (équipe)
- Demandes d'heures sup en attente (équipe)
- Actions rapides (Approuver/Rejeter)

**Onglet 5 : Planning Équipe**
- Planning de l'équipe (semaine/mois)
- Gestion des remplacements
- Shifts de l'équipe

#### Filtres
- Période (Aujourd'hui, Semaine, Mois, Trimestre)
- Employé de l'équipe (si équipe > 1)
- Pas de filtres département/site (sauf si manager multi-équipes)

#### Permissions Requises
- `attendance.view_team`
- `attendance.view_own` (pour ses propres données)
- `schedule.view_team`
- `schedule.view_own`
- `leave.view_team`
- `leave.view_own`
- `leave.approve`
- `overtime.view_team`
- `overtime.view_own`
- `overtime.approve`
- `employee.view_team`

#### Données Backend
- Endpoint : `GET /reports/dashboard?scope=team` (à créer)
- Endpoint : `GET /attendance?teamId=current`
- Endpoint : `GET /leaves?teamId=current&status=pending`
- Endpoint : `GET /schedules?teamId=current`

---

### 3. 🏢 ADMIN_RH (Administrateur RH)

#### Objectif
L'admin RH doit voir **toutes les données du tenant** : statistiques globales, tous les employés, tous les départements, tous les sites, gestion complète.

#### Contenu Proposé (Proche de l'actuel, mais amélioré)

**Onglet 1 : Vue d'Ensemble Globale**
- **KPIs Globaux** :
  - Taux de présence global (tenant)
  - Retards (7 jours, 30 jours)
  - Total pointages (période)
  - Heures supplémentaires (période)
  - Employés actifs / Total
  - Congés en cours
  - Anomalies détectées
  - Demandes en attente d'approbation

- **Widgets** :
  - Top performers (tenant)
  - Départements les plus performants
  - Sites avec le plus d'anomalies
  - Alertes critiques
  - Activité en temps réel

- **Graphiques** :
  - Retards & Absences par jour (7 jours)
  - Répartition des Shifts
  - Évolution des heures sup (4 semaines)
  - Performance par département (radar)
  - Tendance quotidienne des présences

**Onglet 2 : Présences**
- Liste de tous les pointages (filtrable)
- Graphiques de tendances
- Détection d'anomalies globales
- Export des données

**Onglet 3 : Performance**
- Top performers (tenant)
- Performance par département
- Performance par site
- Performance par équipe
- Comparaisons et tendances

**Onglet 4 : Alertes & Approbations**
- Toutes les anomalies détectées
- Demandes de congés en attente (toutes)
- Demandes d'heures sup en attente (toutes)
- Actions rapides

**Onglet 5 : Temps Réel**
- Activité en temps réel (tous les pointages)
- Pointages récents
- Alertes en direct

#### Filtres
- Période (Aujourd'hui, Semaine, Mois, Trimestre)
- Département (Tous)
- Site (Tous)
- Équipe (Toutes)
- Employé (Tous)
- Export PDF/Excel/Email

#### Permissions Requises
- `attendance.view_all`
- `attendance.view_own`
- `schedule.view_all`
- `schedule.view_own`
- `leave.view_all`
- `leave.view_own`
- `leave.approve`
- `overtime.view_all`
- `overtime.view_own`
- `overtime.approve`
- `employee.view_all`
- `employee.view_own`
- `reports.view_all`
- `reports.export`

#### Données Backend
- Endpoint : `GET /reports/dashboard?scope=tenant` (existe déjà)
- Endpoint : `GET /attendance` (tous)
- Endpoint : `GET /leaves?status=pending` (toutes)
- Endpoint : `GET /schedules` (tous)

---

### 4. 👑 SUPER_ADMIN (Super Administrateur)

#### Objectif
Le SUPER_ADMIN doit voir **toutes les données de la plateforme** : statistiques multi-tenants, gestion des tenants, vue globale.

#### Contenu Proposé

**Onglet 1 : Vue d'Ensemble Plateforme**
- **KPIs Plateforme** :
  - Nombre total de tenants
  - Nombre total d'employés (tous tenants)
  - Taux de présence moyen (tous tenants)
  - Retards totaux (plateforme)
  - Heures sup totales (plateforme)
  - Anomalies détectées (plateforme)

- **Widgets** :
  - Tenants les plus actifs
  - Tenants avec le plus d'anomalies
  - Top performers (plateforme)
  - Alertes critiques (multi-tenants)
  - Activité en temps réel (plateforme)

- **Graphiques** :
  - Répartition des employés par tenant
  - Taux de présence par tenant
  - Évolution des pointages (plateforme)
  - Performance par tenant
  - Statistiques d'utilisation de la plateforme

**Onglet 2 : Gestion des Tenants**
- Liste des tenants
- Statistiques par tenant
- Actions de gestion (modifier, désactiver, etc.)

**Onglet 3 : Présences Plateforme**
- Vue globale des pointages (tous tenants)
- Filtres par tenant
- Graphiques agrégés

**Onglet 4 : Performance Plateforme**
- Comparaison entre tenants
- Top performers (plateforme)
- Performance globale

**Onglet 5 : Alertes & Monitoring**
- Toutes les alertes (multi-tenants)
- Monitoring système
- Logs d'audit

#### Filtres
- Période (Aujourd'hui, Semaine, Mois, Trimestre, Année)
- Tenant (Tous)
- Département (Tous)
- Site (Tous)
- Export PDF/Excel/Email

#### Permissions Requises
- **TOUTES** les permissions
- Accès multi-tenants
- Gestion des tenants

#### Données Backend
- Endpoint : `GET /reports/dashboard?scope=platform` (à créer)
- Endpoint : `GET /tenants/stats` (à créer)
- Endpoint : `GET /attendance?tenantId=all` (tous tenants)

---

## 📊 Tableau Comparatif des Dashboards

| Fonctionnalité | EMPLOYEE | MANAGER | ADMIN_RH | SUPER_ADMIN |
|----------------|----------|---------|----------|-------------|
| **Portée des données** | Personnelles | Équipe | Tenant | Plateforme |
| **KPIs** | Personnels (5-6) | Équipe (6-8) | Globaux (8-10) | Plateforme (10+) |
| **Graphiques** | Personnels (2-3) | Équipe (3-4) | Globaux (5-6) | Multi-tenants (6+) |
| **Onglets** | 4 onglets | 5 onglets | 5 onglets | 5 onglets |
| **Filtres** | Période uniquement | Période + Employé | Tous les filtres | Tous + Tenant |
| **Approbations** | Ses demandes | Équipe | Toutes | Toutes |
| **Export** | ❌ | ❌ | ✅ | ✅ |
| **Temps réel** | Ses pointages | Équipe | Tous | Tous |
| **Performance** | Sa performance | Équipe | Tenant | Plateforme |

---

## 🔧 Implémentation Technique

### 1. Backend - Endpoints à Créer/Modifier

#### Endpoint Dashboard par Scope
```typescript
GET /reports/dashboard?scope={personal|team|tenant|platform}
```

**Scopes** :
- `personal` : Données personnelles (EMPLOYEE)
- `team` : Données de l'équipe (MANAGER)
- `tenant` : Données du tenant (ADMIN_RH)
- `platform` : Données de la plateforme (SUPER_ADMIN)

#### Endpoint Stats Personnelles
```typescript
GET /users/me/stats
```
✅ Existe déjà

#### Endpoint Stats Équipe
```typescript
GET /teams/:teamId/stats
```
❌ À créer

#### Endpoint Stats Plateforme
```typescript
GET /platform/stats
```
❌ À créer (SUPER_ADMIN uniquement)

### 2. Frontend - Composants à Créer

#### Composants par Profil
- `EmployeeDashboard.tsx`
- `ManagerDashboard.tsx`
- `AdminRHDashboard.tsx`
- `SuperAdminDashboard.tsx`

#### Composant Principal
```typescript
DashboardPage.tsx
  ├── useAuth() → détecte le profil
  ├── EmployeeDashboard (si EMPLOYEE)
  ├── ManagerDashboard (si MANAGER)
  ├── AdminRHDashboard (si ADMIN_RH)
  └── SuperAdminDashboard (si SUPER_ADMIN)
```

#### Hooks Personnalisés
- `useEmployeeDashboardStats()`
- `useManagerDashboardStats()`
- `useAdminRHDashboardStats()`
- `useSuperAdminDashboardStats()`

### 3. Protection des Données

#### Backend
- Vérifier les permissions dans chaque endpoint
- Filtrer les données selon le scope (personal/team/tenant/platform)
- Utiliser `PermissionsGuard` et `@RequirePermissions`

#### Frontend
- Utiliser `ProtectedRoute` pour protéger les pages
- Utiliser `PermissionGate` pour masquer les widgets non autorisés
- Vérifier les permissions avant d'afficher les données

---

## ✅ Avantages de cette Approche

1. **Sécurité** : Chaque profil voit uniquement ce qu'il a le droit de voir
2. **Performance** : Chargement uniquement des données nécessaires
3. **UX** : Interface adaptée à chaque rôle
4. **Maintenabilité** : Code modulaire et réutilisable
5. **Scalabilité** : Facile d'ajouter de nouveaux profils
6. **Cohérence** : Respect des permissions RBAC

---

## 📝 Checklist d'Implémentation

### Backend
- [ ] Créer endpoint `GET /reports/dashboard?scope=team`
- [ ] Créer endpoint `GET /reports/dashboard?scope=platform`
- [ ] Créer endpoint `GET /teams/:teamId/stats`
- [ ] Créer endpoint `GET /platform/stats`
- [ ] Modifier `GET /reports/dashboard` pour supporter le scope
- [ ] Ajouter protection par permissions dans tous les endpoints
- [ ] Filtrer les données selon le scope

### Frontend
- [ ] Créer `EmployeeDashboard.tsx`
- [ ] Créer `ManagerDashboard.tsx`
- [ ] Créer `AdminRHDashboard.tsx`
- [ ] Créer `SuperAdminDashboard.tsx`
- [ ] Modifier `DashboardPage.tsx` pour router selon le profil
- [ ] Créer hooks personnalisés pour chaque profil
- [ ] Ajouter `ProtectedRoute` et `PermissionGate`
- [ ] Tester chaque profil

---

## 🎯 Recommandations Finales

1. **Implémentation Progressive** : Commencer par EMPLOYEE (le plus simple), puis MANAGER, puis ADMIN_RH, puis SUPER_ADMIN
2. **Réutilisabilité** : Créer des composants réutilisables (KPICard, ChartCard, etc.)
3. **Performance** : Utiliser React Query pour le cache et la mise en cache
4. **Tests** : Tester chaque profil avec des données réelles
5. **Documentation** : Documenter les endpoints et les composants

---

**Date de création** : 2025-12-11
**Version** : 1.0

