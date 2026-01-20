# 📋 SUIVI IMPLÉMENTATION DE PROJET CURSOR - PointageFlex

**Date de création** : 22 novembre 2025  
**Version** : 1.0.0  
**Statut** : En développement actif

---

## 📊 TABLE DES MATIÈRES

1. [Vue d'ensemble du projet](#1-vue-densemble-du-projet)
2. [Comparaison avec le cahier des charges](#2-comparaison-avec-le-cahier-des-charges)
3. [Analyse détaillée par page](#3-analyse-détaillée-par-page)
4. [Plan d'implémentation étape par étape](#4-plan-dimplémentation-étape-par-étape)
5. [Résumé des éléments manquants](#5-résumé-des-éléments-manq0uants)

---

## 1. VUE D'ENSEMBLE DU PROJET

### 1.1 État Actuel

**Backend** : ✅ Structure complète avec 13 modules NestJS  
**Frontend** : ✅ 12 pages dashboard créées  
**Base de données** : ✅ Schéma Prisma complet (20+ modèles)  
**Documentation** : ✅ Documentation technique exhaustive

### 1.2 Modules Backend Identifiés

| Module | Statut | Endpoints | Notes |
|--------|--------|-----------|-------|
| Auth | ✅ Implémenté | Login, Register, Refresh | JWT + Refresh tokens |
| Tenants | ✅ Implémenté | CRUD tenants, Settings | Multi-tenant isolation |
| Users | ✅ Implémenté | CRUD users, RBAC | 4 rôles supportés |
| Employees | ✅ Implémenté | CRUD, Import/Export Excel | 19/20 colonnes Excel |
| Attendance | ✅ Implémenté | Pointages, Webhooks, Anomalies | Détection automatique |
| Devices | ✅ Implémenté | CRUD terminaux | Statut en ligne/hors ligne |
| Shifts | ✅ Implémenté | CRUD shifts | Matin/soir/nuit |
| Teams | ✅ Implémenté | CRUD équipes | Rotations optionnelles |
| Schedules | ⚠️ Partiel | CRUD basique | Manque: bulk, week/month, alerts, replacements |
| Leaves | ✅ Implémenté | CRUD, Workflow | Manager → RH |
| Overtime | ✅ Implémenté | CRUD, Conversion | Heures sup → récupération |
| Reports | ⚠️ Partiel | Dashboard, Attendance | Manque: PDF/Excel exports, Payroll |
| Audit | ✅ Implémenté | Logs complets | Traçabilité |

### 1.3 Pages Frontend Identifiées

| Page | Route | Statut | Fonctionnalités |
|------|-------|--------|-----------------|
| Dashboard | `/dashboard` | ✅ Implémenté | KPIs, graphiques, stats |
| Employees | `/employees` | ✅ Implémenté | Liste, Import/Export Excel, CRUD |
| Attendance | `/attendance` | ✅ Implémenté | Liste, filtres, anomalies, export |
| Shifts Planning | `/shifts-planning` | ⚠️ Mock data | Planning visuel, remplacements (mock) |
| Leaves | `/leaves` | ✅ Implémenté | Liste, workflow, approbation |
| Overtime | `/overtime` | ✅ Implémenté | Liste, approbation, conversion |
| Reports | `/reports` | ⚠️ Partiel | Sélection type, aperçu (manque exports) |
| Teams | `/teams` | ⚠️ Mock data | Liste équipes, membres (mock) |
| Terminals | `/terminals` | ✅ Implémenté | Liste, statut, webhook config |
| Audit | `/audit` | ✅ Implémenté | Logs, filtres, recherche |
| Settings | `/settings` | ⚠️ UI seulement | Configuration (non connecté API) |
| Profile | `/profile` | ✅ Implémenté | Infos personnelles, sécurité, préférences |

---

## 2. COMPARAISON AVEC LE CAHIER DES CHARGES

### 2.1 Exigences Fonctionnelles - État d'Implémentation

| Exigence | Cahier des Charges | État Actuel | Statut |
|----------|-------------------|-------------|--------|
| **3.1 Multi-tenant** | Chaque entreprise = tenant, données isolées | ✅ Implémenté | ✅ **COMPLET** |
| **3.2 Gestion utilisateurs** | 4 types de profils, JWT + refresh | ✅ Implémenté | ✅ **COMPLET** |
| **3.3 Gestion employés** | Fiche complète, affectations | ✅ Implémenté | ✅ **COMPLET** |
| **3.4 Pointage biométrique** | 6 types (empreinte, badge, QR, visage, PIN, GPS) | ✅ Implémenté | ✅ **COMPLET** |
| **3.5 Gestion temps travail** | Calculs auto, anomalies, corrections | ✅ Implémenté | ✅ **COMPLET** |
| **3.6 Congés & absences** | Workflow Manager → RH, soldes | ✅ Implémenté | ✅ **COMPLET** |
| **3.7 Récupérations** | Conversion heures sup → récup | ✅ Implémenté | ✅ **COMPLET** |
| **3.8 Shifts & Plannings** | Matin/soir/nuit, rotations, planning visuel | ⚠️ Partiel | ⚠️ **EN COURS** |
| **3.9 Tableau de bord** | Indicateurs, filtres | ✅ Implémenté | ✅ **COMPLET** |
| **3.10 Rapports & exports** | PDF, Excel, paie | ⚠️ Partiel | ⚠️ **EN COURS** |

### 2.2 Points Clés du Cahier des Charges

#### ✅ Conformité Totale

1. **Multi-tenant** : Isolation complète par `tenantId` ✅
2. **Pointage biométrique** : 7 méthodes supportées ✅
3. **Alertes légales non bloquantes** : Architecture prête ⚠️ (manque implémentation frontend)
4. **Rotations optionnelles** : Champ `rotationEnabled` dans Team ✅
5. **Workflow congés** : Manager → RH implémenté ✅
6. **Import/Export Excel** : Fonctionnel pour employés ✅

#### ⚠️ Conformité Partielle

1. **Planning visuel** : 
   - ✅ Backend : CRUD schedules basique
   - ❌ Backend : Manque endpoints `week/:date`, `month/:date`, `alerts`, `replacements`
   - ⚠️ Frontend : Mock data, pas de connexion API réelle

2. **Rapports & exports** :
   - ✅ Backend : Endpoints dashboard, attendance report
   - ❌ Backend : Manque exports PDF/Excel, export paie
   - ⚠️ Frontend : UI prête mais exports non fonctionnels

3. **Alertes légales** :
   - ✅ Backend : Architecture prête (dans docs)
   - ❌ Backend : Service `alerts.service.ts` non implémenté
   - ❌ Frontend : Affichage alertes non implémenté

4. **Remplacements shifts** :
   - ✅ Backend : Modèle `ShiftReplacement` dans schema
   - ❌ Backend : Endpoints remplacements non implémentés
   - ⚠️ Frontend : UI mock, pas de connexion API

---

## 3. ANALYSE DÉTAILLÉE PAR PAGE

### 3.1 Page Dashboard (`/dashboard`)

#### ✅ Ce qui existe

- **Structure** : Page complète avec layout
- **KPIs** : 4 cartes (Taux présence, Retards, Pointages, Heures sup)
- **Graphiques** : Bar chart (retards/absences), Pie chart (shifts), Line chart (heures sup)
- **Stats rapides** : Employés actifs, Congés en cours, Anomalies
- **Filtres période** : Aujourd'hui, Semaine, Mois
- **Hooks API** : `useDashboardStats` connecté au backend

#### ⚠️ Ce qui manque

1. **Données réelles** : Graphiques utilisent des données mock
   - `weeklyAttendanceData` : Données hardcodées
   - `shiftDistribution` : Données hardcodées
   - `overtimeData` : Données hardcodées

2. **Filtres avancés** : 
   - Filtre par site (mentionné dans cahier des charges)
   - Filtre par service/département
   - Filtre par équipe

3. **Actualisation temps réel** :
   - Pas d'auto-refresh (comme page attendance)
   - Pas d'indicateur de dernière mise à jour

4. **Indicateurs manquants** :
   - Shifts du jour (mentionné dans cahier des charges)
   - Congés en cours (existe mais pourrait être plus détaillé)

#### 📋 Plan d'implémentation

**Étape 1** : Connecter graphiques aux données réelles
- Modifier `useDashboardStats` pour retourner données hebdomadaires
- Remplacer mock data par données API

**Étape 2** : Ajouter filtres avancés
- Ajouter sélecteurs Site, Département, Équipe
- Passer filtres à `useDashboardStats`

**Étape 3** : Actualisation temps réel
- Ajouter auto-refresh toutes les 30s
- Afficher indicateur dernière mise à jour

**Étape 4** : Enrichir KPIs
- Ajouter carte "Shifts du jour"
- Améliorer carte "Congés en cours" avec détails

---

### 3.2 Page Employees (`/employees`)

#### ✅ Ce qui existe

- **CRUD complet** : Création, lecture, suppression
- **Import Excel** : Modal fonctionnelle, import massif
- **Export Excel** : Export complet avec 20 colonnes
- **Recherche** : Par matricule, nom, prénom, email
- **Pagination** : 10/25/50/100 par page
- **Suppression en masse** : Bouton "Tout Supprimer" (Super Admin)
- **Affichage données** : 19/20 colonnes Excel affichées

#### ⚠️ Ce qui manque

1. **Modification employé** :
   - Pas de modal/modification inline
   - Bouton "Modifier" manquant dans la table

2. **Filtres avancés** :
   - Filtre par site
   - Filtre par département
   - Filtre par équipe
   - Filtre par statut (actif/inactif)

3. **Détails employé** :
   - Pas de page détail employé
   - Pas de vue complète fiche employé

4. **Gestion biométrie** :
   - Pas d'interface pour enregistrer empreinte/visage
   - Pas de visualisation données biométriques

5. **Affectations** :
   - Pas d'interface pour modifier site/département/équipe/shift
   - Pas de drag & drop pour réassigner

#### 📋 Plan d'implémentation

**Étape 1** : Ajouter modification employé
- Créer modal modification (similaire à création)
- Ajouter bouton "Modifier" dans table
- Connecter à `PATCH /api/v1/employees/:id`

**Étape 2** : Ajouter filtres avancés
- Ajouter sélecteurs Site, Département, Équipe, Statut
- Passer filtres à `useEmployees`

**Étape 3** : Créer page détail employé
- Route `/employees/:id`
- Afficher toutes les informations employé
- Historique pointages, congés, heures sup

**Étape 4** : Interface biométrie
- Modal pour enregistrer empreinte/visage
- Upload fichier ou saisie manuelle
- Visualisation données biométriques existantes

**Étape 5** : Gestion affectations
- Interface pour modifier site/département/équipe/shift
- Dropdowns avec liste des options disponibles

---

### 3.3 Page Attendance (`/attendance`)

#### ✅ Ce qui existe

- **Liste pointages** : Table complète avec filtres date
- **Actualisation auto** : Toutes les 30s
- **Détection anomalies** : Affichage alertes
- **Stats** : Total, Entrées, Sorties, Anomalies
- **Export** : CSV et Excel
- **Recherche** : Par nom, prénom, matricule
- **Filtres date** : Aujourd'hui, Cette semaine

#### ⚠️ Ce qui manque

1. **Correction pointages** :
   - Pas d'interface pour corriger un pointage
   - Pas de workflow correction (employé → manager → RH)

2. **Filtres avancés** :
   - Filtre par site
   - Filtre par terminal
   - Filtre par type (IN/OUT/BREAK)
   - Filtre par méthode (FINGERPRINT, RFID, etc.)
   - Filtre anomalies uniquement

3. **Détails pointage** :
   - Pas de modal détail pointage
   - Pas d'affichage données brutes (`rawData`)

4. **Import pointages** :
   - Pas d'interface import CSV/Excel pour pointages
   - Mentionné dans cahier des charges

5. **Pointage manuel** :
   - Pas de bouton "Pointage manuel"
   - Pas de modal pour créer pointage

#### 📋 Plan d'implémentation

**Étape 1** : Correction pointages
- Ajouter bouton "Corriger" dans table
- Créer modal correction avec formulaire
- Connecter à `PATCH /api/v1/attendance/:id/correct`
- Workflow : Employé demande → Manager valide → RH valide

**Étape 2** : Filtres avancés
- Ajouter sélecteurs Site, Terminal, Type, Méthode
- Checkbox "Anomalies uniquement"
- Passer filtres à `useAttendance`

**Étape 3** : Modal détail pointage
- Afficher toutes les infos (employé, timestamp, type, méthode, terminal, géolocalisation)
- Afficher données brutes JSON si disponibles
- Afficher historique corrections

**Étape 4** : Import pointages
- Créer modal import CSV/Excel
- Parser fichier et envoyer à `POST /api/v1/attendance/import`
- Rapport d'import avec succès/erreurs

**Étape 5** : Pointage manuel
- Ajouter bouton "Pointage manuel"
- Modal avec formulaire (employé, type, timestamp, méthode)
- Connecter à `POST /api/v1/attendance`

---

### 3.4 Page Shifts Planning (`/shifts-planning`)

#### ✅ Ce qui existe

- **Structure UI** : Layout complet avec planning visuel
- **Filtres** : Période, Équipe, Site, Shift, Recherche
- **Vues** : Aujourd'hui, Jour, Semaine, Mois (boutons)
- **Planning tableau** : Grille semaine avec shifts
- **Remplacements** : Section avec liste remplacements
- **Formulaire shift** : Panel droit pour créer/modifier shift
- **Légende** : Couleurs shifts, congés, absences

#### ❌ Ce qui manque (CRITIQUE)

1. **Données réelles** :
   - ❌ **Toutes les données sont mock** (`mockShiftData`, `mockReplacements`)
   - ❌ Pas de connexion API backend
   - ❌ Hooks API manquants (`useSchedules`, `useShifts`, etc.)

2. **Endpoints backend manquants** :
   - ❌ `GET /api/v1/schedules/week/:date` (planning semaine)
   - ❌ `GET /api/v1/schedules/month/:date` (planning mois)
   - ❌ `POST /api/v1/schedules/bulk` (création en masse)
   - ❌ `GET /api/v1/schedules/alerts` (alertes légales)
   - ❌ `POST /api/v1/schedules/replacements` (remplacements)
   - ❌ `PATCH /api/v1/schedules/replacements/:id/approve` (validation)

3. **Planning visuel réel** :
   - ❌ Pas de composant Gantt/Timeline fonctionnel
   - ❌ Tableau utilise données mock
   - ❌ Pas de drag & drop pour modifier shifts

4. **Alertes légales** :
   - ❌ Service `alerts.service.ts` non implémenté backend
   - ❌ Affichage alertes non implémenté frontend
   - ❌ Bannière alertes (mentionnée dans docs) absente

5. **Remplacements fonctionnels** :
   - ❌ Workflow remplacement non implémenté
   - ❌ Validation manager non fonctionnelle
   - ❌ Historique remplacements non implémenté

6. **Rotations** :
   - ❌ Application automatique rotations non implémentée
   - ❌ Interface activation/désactivation rotation non fonctionnelle

#### 📋 Plan d'implémentation

**Étape 1** : Implémenter endpoints backend manquants
- Créer `GET /api/v1/schedules/week/:date` dans `SchedulesController`
- Créer `GET /api/v1/schedules/month/:date`
- Créer `POST /api/v1/schedules/bulk`
- Créer service `AlertsService` avec méthode `generateAlerts()`
- Créer `GET /api/v1/schedules/alerts`
- Créer endpoints remplacements dans `SchedulesController`

**Étape 2** : Créer hooks API frontend
- Créer `useSchedules` avec méthodes `getWeek`, `getMonth`, `createBulk`
- Créer `useScheduleAlerts` pour récupérer alertes
- Créer `useReplacements` avec `create`, `approve`, `reject`

**Étape 3** : Connecter planning visuel à API
- Remplacer `mockShiftData` par données de `useSchedules.getWeek()`
- Afficher données réelles dans tableau
- Gérer chargement et erreurs

**Étape 4** : Implémenter alertes légales
- Créer composant `AlertBanner` pour afficher alertes
- Afficher alertes en haut de la page
- Badges WARNING/CRITICAL avec possibilité d'ignorer

**Étape 5** : Implémenter remplacements
- Créer modal demande remplacement
- Workflow : Employé demande → Manager valide → RH valide
- Afficher statut dans liste remplacements
- Historique remplacements

**Étape 6** : Implémenter rotations
- Logique application automatique rotations
- Interface activation/désactivation rotation
- Visualisation cycle rotation

**Étape 7** : Améliorer planning visuel
- Composant Gantt/Timeline (bibliothèque externe ou custom)
- Drag & drop pour modifier shifts
- Vue mois avec calendrier

---

### 3.5 Page Leaves (`/leaves`)

#### ✅ Ce qui existe

- **Liste congés** : Table complète avec workflow
- **Workflow** : Affichage statuts (PENDING, MANAGER_APPROVED, APPROVED)
- **Approbation** : Boutons Manager/RH pour approuver
- **Rejet** : Bouton rejeter avec raison
- **Stats** : Total, En attente, Approuvé Manager, Approuvés
- **Recherche** : Par nom, prénom, matricule
- **Filtres** : Par statut
- **Hooks API** : Connecté au backend

#### ⚠️ Ce qui manque

1. **Création demande** :
   - Modal `showCreateModal` déclarée mais non implémentée
   - Pas de formulaire création demande congé

2. **Soldes congés** :
   - Pas d'affichage soldes employé (acquis, pris, restant)
   - Mentionné dans cahier des charges

3. **Types de congés** :
   - Pas d'affichage types de congés disponibles
   - Pas de sélection type dans création

4. **Justificatifs** :
   - Pas d'upload document/justificatif
   - Champ `document` dans modèle mais pas d'interface

5. **Historique** :
   - Pas de vue historique complet employé
   - Pas de graphique évolution soldes

6. **Détails congé** :
   - Pas de modal détail avec toutes les infos
   - Pas d'affichage commentaires manager/RH

#### 📋 Plan d'implémentation

**Étape 1** : Modal création demande
- Créer formulaire complet (type, dates, raison)
- Upload document/justificatif
- Validation dates (pas de chevauchement)
- Connecter à `POST /api/v1/leaves`

**Étape 2** : Affichage soldes
- Créer composant `LeaveBalance` pour afficher soldes
- Afficher par type de congé (acquis, pris, restant)
- Connecter à `GET /api/v1/leaves/employee/:id/balance`

**Étape 3** : Types de congés
- Récupérer types depuis `GET /api/v1/leave-types`
- Afficher dans sélecteur création
- Afficher type dans table

**Étape 4** : Upload justificatifs
- Ajouter upload fichier dans modal création
- Afficher document dans détails congé
- Téléchargement document

**Étape 5** : Historique et graphiques
- Créer page `/leaves/employee/:id` avec historique
- Graphique évolution soldes sur 12 mois
- Liste historique complet

**Étape 6** : Modal détail congé
- Afficher toutes les infos (dates, type, raison, statut)
- Afficher commentaires manager/RH
- Afficher document si disponible
- Timeline workflow

---

### 3.6 Page Overtime (`/overtime`)

#### ✅ Ce qui existe

- **Liste heures sup** : Table complète
- **Approbation** : Boutons approuver/rejeter
- **Conversion récupération** : Bouton convertir
- **Stats** : Total heures, En attente, Approuvés, Demandes
- **Recherche** : Par nom, prénom, matricule
- **Filtres** : Par statut
- **Hooks API** : Connecté au backend

#### ⚠️ Ce qui manque

1. **Création demande** :
   - Bouton "Nouvelle demande" présent mais modal non implémentée
   - Pas de formulaire création heures sup

2. **Calcul automatique** :
   - Pas d'affichage calcul automatique depuis pointages
   - Pas de validation heures sup vs planning

3. **Détails heures sup** :
   - Pas de modal détail
   - Pas d'affichage taux (jour/nuit)
   - Pas d'affichage montant calculé

4. **Récupération** :
   - Pas d'affichage solde récupération employé
   - Pas de gestion utilisation récupération

5. **Graphiques** :
   - Pas de graphique évolution heures sup
   - Pas de répartition par type (jour/nuit)

#### 📋 Plan d'implémentation

**Étape 1** : Modal création demande
- Formulaire (date, heures, type jour/nuit, raison)
- Validation (pas de doublon, heures > 0)
- Connecter à `POST /api/v1/overtime`

**Étape 2** : Calcul automatique
- Afficher heures sup calculées automatiquement depuis pointages
- Comparaison avec planning prévu
- Validation automatique si conforme

**Étape 3** : Modal détail
- Afficher toutes les infos (date, heures, type, taux, montant)
- Afficher statut et approbateur
- Afficher conversion récupération si applicable

**Étape 4** : Gestion récupération
- Créer composant `RecoveryBalance` pour afficher solde
- Interface utilisation récupération
- Historique récupération

**Étape 5** : Graphiques
- Graphique évolution heures sup (ligne)
- Répartition par type (camembert)
- Comparaison équipes

---

### 3.7 Page Reports (`/reports`)

#### ✅ Ce qui existe

- **Sélection type rapport** : 4 types (Présence, Heures sup, Retards, Export paie)
- **Filtres période** : Date début, Date fin
- **Boutons export** : PDF, Excel, CSV
- **Aperçu rapport** : Stats summary (Total employés, Présences, Absences, Heures)
- **Historique rapports** : Liste rapports générés

#### ❌ Ce qui manque (CRITIQUE)

1. **Exports non fonctionnels** :
   - ❌ Boutons PDF/Excel/CSV ne génèrent pas de fichiers
   - ❌ Endpoints backend exports manquants :
     - `POST /api/v1/reports/export/pdf`
     - `POST /api/v1/reports/export/excel`
     - `GET /api/v1/reports/payroll`

2. **Rapports détaillés** :
   - ❌ Pas de tableau détaillé employés dans aperçu
   - ❌ Pas de données réelles (seulement stats summary)

3. **Export paie** :
   - ❌ Format spécifique paie non implémenté
   - ❌ Colonnes paie (matricule, heures, retards, absences) non formatées

4. **Rapports manquants** :
   - ❌ Rapport congés (mentionné dans cahier des charges)
   - ❌ Rapport récupérations
   - ❌ Rapport retards/absences détaillé

5. **Historique** :
   - ❌ Historique utilise données mock
   - ❌ Pas de téléchargement rapports précédents

#### 📋 Plan d'implémentation

**Étape 1** : Implémenter exports backend
- Créer service `ExportPdfService` avec PDFKit
- Créer service `ExportExcelService` avec XLSX
- Créer `POST /api/v1/reports/export/pdf`
- Créer `POST /api/v1/reports/export/excel`
- Créer `GET /api/v1/reports/payroll` (format Excel paie)

**Étape 2** : Connecter exports frontend
- Modifier `handleExport` pour appeler API
- Téléchargement fichier généré
- Gestion erreurs et chargement

**Étape 3** : Tableau détaillé rapports
- Afficher liste employés avec données dans aperçu
- Colonnes : Matricule, Nom, Heures travaillées, Retards, Absences, Heures sup
- Pagination si beaucoup d'employés

**Étape 4** : Export paie formaté
- Format Excel spécifique paie
- Colonnes : Matricule, Nom, Heures normales, Heures sup, Retards, Absences, Congés
- Prêt pour import SAGE/autres logiciels paie

**Étape 5** : Rapports supplémentaires
- Créer rapport congés (par type, par employé, par période)
- Créer rapport récupérations (solde, utilisé, restant)
- Créer rapport retards/absences détaillé

**Étape 6** : Historique fonctionnel
- Créer table `ReportHistory` dans BDD
- Sauvegarder chaque export généré
- Interface téléchargement rapports précédents

---

### 3.8 Page Teams (`/teams`)

#### ✅ Ce qui existe

- **Structure UI** : Layout complet avec liste équipes
- **Formulaire équipe** : Panel droit pour créer/modifier
- **Rotation** : Toggle activation rotation, cycle jours
- **Membres équipe** : Affichage membres avec cartes
- **Stats équipe** : Nombre membres, présence, répartition shifts

#### ❌ Ce qui manque (CRITIQUE)

1. **Données réelles** :
   - ❌ **Toutes les données sont mock** (`teams`, `teamMembers`)
   - ❌ Pas de connexion API backend
   - ❌ Hooks API manquants (`useTeams`)

2. **Fonctionnalités CRUD** :
   - ❌ Création équipe non fonctionnelle (formulaire non connecté)
   - ❌ Modification équipe non fonctionnelle
   - ❌ Suppression équipe non fonctionnelle

3. **Gestion membres** :
   - ❌ Assignation employés à équipe non fonctionnelle
   - ❌ Retrait employés non fonctionnel
   - ❌ Pas de drag & drop pour réordonner

4. **Rotations** :
   - ❌ Application automatique rotations non implémentée
   - ❌ Visualisation cycle rotation non fonctionnelle

5. **Responsable équipe** :
   - ❌ Sélection responsable non fonctionnelle
   - ❌ Pas de validation (responsable doit être employé)

#### 📋 Plan d'implémentation

**Étape 1** : Créer hooks API
- Créer `useTeams` avec `getAll`, `create`, `update`, `delete`
- Créer `useTeamMembers` avec `assign`, `remove`, `reorder`

**Étape 2** : Connecter CRUD équipes
- Connecter formulaire création à `POST /api/v1/teams`
- Connecter modification à `PATCH /api/v1/teams/:id`
- Connecter suppression à `DELETE /api/v1/teams/:id`

**Étape 3** : Gestion membres
- Créer modal assignation employés (multi-sélection)
- Connecter à `POST /api/v1/teams/:id/employees`
- Bouton retirer employé fonctionnel

**Étape 4** : Rotations
- Logique application automatique rotations
- Visualisation cycle rotation (graphique)
- Interface activation/désactivation

**Étape 5** : Responsable équipe
- Sélecteur responsable avec liste employés
- Validation (responsable doit être employé actif)
- Affichage responsable dans liste équipes

---

### 3.9 Page Terminals (`/terminals`)

#### ✅ Ce qui existe

- **Liste terminaux** : Table complète avec statut
- **Statut connexion** : En ligne, Hors ligne, Lente, Inactif
- **Création terminal** : Modal fonctionnelle
- **Configuration webhook** : Modal avec URL, headers, payload exemple
- **Test webhook** : Bouton tester webhook
- **Stats** : Total, Actifs, Hors ligne, Maintenance
- **Hooks API** : Connecté au backend

#### ⚠️ Ce qui manque

1. **Modification terminal** :
   - Pas de modal modification
   - Bouton "Modifier" manquant

2. **Synchronisation** :
   - Bouton "Sync" présent mais logique non claire
   - Pas d'explication ce que fait la sync

3. **Statistiques terminal** :
   - Pas de stats par terminal (nombre pointages, dernière activité)
   - Pas de graphique activité terminal

4. **Configuration avancée** :
   - Pas d'interface pour configurer API Key
   - Pas de gestion whitelist IP

5. **Historique** :
   - Pas d'historique connexions terminal
   - Pas de logs erreurs terminal

#### 📋 Plan d'implémentation

**Étape 1** : Modal modification
- Créer modal modification terminal
- Connecter à `PATCH /api/v1/devices/:id`
- Permettre modification nom, IP, type, site

**Étape 2** : Synchronisation
- Clarifier logique sync (récupération pointages depuis terminal)
- Afficher résultat sync (nombre pointages récupérés)
- Logs sync

**Étape 3** : Statistiques terminal
- Créer page détail terminal `/terminals/:id`
- Afficher stats (pointages, activité, erreurs)
- Graphique activité sur 7/30 jours

**Étape 4** : Configuration avancée
- Interface génération/regénération API Key
- Gestion whitelist IP
- Configuration timeouts

**Étape 5** : Historique et logs
- Historique connexions terminal
- Logs erreurs webhook
- Alertes terminal hors ligne > X minutes

---

### 3.10 Page Audit (`/audit`)

#### ✅ Ce qui existe

- **Liste logs** : Table complète avec filtres
- **Filtres** : Date, Action, Entité, Recherche
- **Stats** : Total actions, Créations, Modifications, Suppressions
- **Badges actions** : Couleurs par type action
- **Hooks API** : Connecté au backend

#### ⚠️ Ce qui manque

1. **Détails modifications** :
   - Bouton "Voir" présent mais modal non implémentée
   - Pas d'affichage `oldValues` / `newValues`

2. **Filtres avancés** :
   - Pas de filtre par utilisateur
   - Pas de filtre par IP
   - Pas de filtre par période personnalisée

3. **Export logs** :
   - Pas d'export logs en CSV/Excel
   - Mentionné dans cahier des charges

4. **Recherche avancée** :
   - Pas de recherche dans `oldValues` / `newValues`
   - Pas de recherche par ID entité

5. **Graphiques** :
   - Pas de graphique activité par jour
   - Pas de répartition actions par type

#### 📋 Plan d'implémentation

**Étape 1** : Modal détails
- Créer modal affichant `oldValues` / `newValues`
- Format JSON lisible (pretty print)
- Highlight changements

**Étape 2** : Filtres avancés
- Ajouter sélecteur utilisateur
- Ajouter filtre IP
- Ajouter sélecteur période personnalisée

**Étape 3** : Export logs
- Bouton export CSV/Excel
- Toutes les colonnes + oldValues/newValues
- Filtres appliqués à l'export

**Étape 4** : Recherche avancée
- Recherche dans oldValues/newValues
- Recherche par ID entité
- Recherche combinée

**Étape 5** : Graphiques
- Graphique activité par jour (ligne)
- Répartition actions par type (camembert)
- Top 10 utilisateurs les plus actifs

---

### 3.11 Page Settings (`/settings`)

#### ✅ Ce qui existe

- **Structure UI** : Layout complet avec sections
- **Informations entreprise** : Formulaire (nom, logo, coordonnées)
- **Paramètres régionaux** : Fuseau horaire, langue, jours travaillés
- **Politique horaire** : Tolérances, arrondi, règle nuit
- **Jours fériés** : Liste avec ajout/modification
- **Règles congés** : Workflow 2 niveaux, congés anticipés
- **Utilisateurs & rôles** : Liste utilisateurs
- **Intégrations** : Terminaux, badges, webhooks, imports

#### ❌ Ce qui manque (CRITIQUE)

1. **Connexion API** :
   - ❌ **Aucune connexion API backend**
   - ❌ Tous les formulaires utilisent `useState` local
   - ❌ Pas de sauvegarde réelle

2. **Endpoints backend** :
   - ❌ `GET /api/v1/tenants/:id/settings` (existe mais pas utilisé)
   - ❌ `PATCH /api/v1/tenants/:id/settings` (existe mais pas utilisé)
   - ❌ Endpoints jours fériés manquants
   - ❌ Endpoints utilisateurs manquants (liste, création)

3. **Fonctionnalités** :
   - ❌ Upload logo non fonctionnel
   - ❌ Sauvegarde paramètres non fonctionnelle
   - ❌ Gestion jours fériés non fonctionnelle
   - ❌ Gestion utilisateurs non fonctionnelle

4. **Validation** :
   - ❌ Pas de validation formulaires
   - ❌ Pas de messages erreur/succès

#### 📋 Plan d'implémentation

**Étape 1** : Créer hooks API
- Créer `useTenantSettings` avec `get`, `update`
- Créer `useHolidays` avec `getAll`, `create`, `update`, `delete`
- Créer `useUsers` (si pas déjà existant)

**Étape 2** : Connecter formulaires
- Connecter informations entreprise à `PATCH /api/v1/tenants/:id`
- Connecter paramètres régionaux à `PATCH /api/v1/tenants/:id/settings`
- Connecter politique horaire à `PATCH /api/v1/tenants/:id/settings`

**Étape 3** : Upload logo
- Créer endpoint `POST /api/v1/tenants/:id/logo` (upload fichier)
- Interface upload avec preview
- Validation format/taille fichier

**Étape 4** : Gestion jours fériés
- Créer endpoints backend `GET/POST/PATCH/DELETE /api/v1/holidays`
- Connecter liste jours fériés à API
- Modal création/modification jour férié

**Étape 5** : Gestion utilisateurs
- Connecter liste utilisateurs à `GET /api/v1/users`
- Modal création utilisateur
- Modal modification utilisateur

**Étape 6** : Validation et feedback
- Ajouter validation formulaires (Zod ou React Hook Form)
- Messages erreur/succès (toasts)
- Indicateur modifications non sauvegardées

---

### 3.12 Page Profile (`/profile`)

#### ✅ Ce qui existe

- **Informations personnelles** : Formulaire complet
- **Informations employé** : Affichage (lecture seule)
- **Préférences** : Langue, fuseau horaire, notifications
- **Sécurité** : Changement mot de passe, sessions actives
- **Statistiques** : Jours travaillés, heures, retards, heures sup, congés
- **Hooks API** : Connecté au backend

#### ⚠️ Ce qui manque

1. **Upload photo** :
   - Bouton "Changer la photo" présent mais non fonctionnel
   - Pas d'endpoint upload photo

2. **Téléchargement données** :
   - Bouton "Télécharger mes données" non fonctionnel
   - Pas d'endpoint export données RGPD

3. **Sessions** :
   - Affichage sessions présent mais pourrait être amélioré
   - Pas de déconnexion autres sessions

4. **Notifications** :
   - Toggles notifications présents mais sauvegarde non vérifiée
   - Pas de test notifications

#### 📋 Plan d'implémentation

**Étape 1** : Upload photo
- Créer endpoint `POST /api/v1/users/me/avatar` (upload fichier)
- Interface upload avec preview
- Validation format/taille

**Étape 2** : Export données RGPD
- Créer endpoint `GET /api/v1/users/me/export` (export JSON)
- Toutes les données utilisateur (profil, pointages, congés, etc.)
- Format JSON téléchargeable

**Étape 3** : Déconnexion sessions
- Bouton "Déconnecter autres sessions" fonctionnel
- Confirmation avant déconnexion
- Connecter à endpoint backend

**Étape 4** : Test notifications
- Bouton "Tester notification" pour chaque type
- Envoi notification test
- Vérification réception

---

## 4. PLAN D'IMPLÉMENTATION ÉTAPE PAR ÉTAPE

### Phase 1 : Corrections Critiques (Priorité HAUTE)

#### 1.1 Page Shifts Planning - Connexion API

**Objectif** : Remplacer mock data par données réelles

**Backend** :
1. Implémenter `GET /api/v1/schedules/week/:date` dans `SchedulesController`
   - Retourner planning semaine formaté
   - Inclure employés, shifts, congés, absences
2. Implémenter `GET /api/v1/schedules/month/:date`
   - Retourner planning mois formaté
3. Implémenter `POST /api/v1/schedules/bulk`
   - Création plannings en masse
   - Validation dates, employés, shifts
4. Créer service `AlertsService`
   - Méthode `generateAlerts(tenantId, dateRange)`
   - Détecter : heures hebdo > 44h, repos < 11h, travail nuit répétitif, effectif minimum
   - Retourner alertes (WARNING/CRITICAL) sans bloquer
5. Implémenter `GET /api/v1/schedules/alerts`
   - Retourner alertes légales pour période
6. Créer endpoints remplacements
   - `POST /api/v1/schedules/replacements` (demander remplacement)
   - `GET /api/v1/schedules/replacements` (liste remplacements)
   - `PATCH /api/v1/schedules/replacements/:id/approve` (valider)
   - `PATCH /api/v1/schedules/replacements/:id/reject` (rejeter)

**Frontend** :
1. Créer hooks API
   - `useSchedules` : `getWeek(date)`, `getMonth(date)`, `createBulk(data)`
   - `useScheduleAlerts` : `getAlerts(dateRange)`
   - `useReplacements` : `create(data)`, `approve(id)`, `reject(id)`
2. Remplacer mock data
   - Utiliser `useSchedules.getWeek()` au lieu de `mockShiftData`
   - Utiliser `useReplacements.getAll()` au lieu de `mockReplacements`
3. Créer composant `AlertBanner`
   - Afficher alertes en haut de page
   - Badges WARNING/CRITICAL
   - Bouton "Ignorer" pour chaque alerte
4. Connecter formulaire shift
   - Sauvegarde réelle avec `useSchedules.create()`
   - Validation avant envoi

**Durée estimée** : 3-4 jours

---

#### 1.2 Page Reports - Exports PDF/Excel

**Objectif** : Rendre les exports fonctionnels

**Backend** :
1. Installer dépendances
   - `pdfkit` pour PDF
   - `xlsx` déjà installé pour Excel
2. Créer service `ExportPdfService`
   - Méthode `generateAttendanceReport(data)`
   - Format professionnel avec logo, en-têtes, tableaux
3. Créer service `ExportExcelService`
   - Méthode `generateAttendanceReport(data)`
   - Multi-feuilles si nécessaire
4. Implémenter `POST /api/v1/reports/export/pdf`
   - Générer PDF et retourner fichier
5. Implémenter `POST /api/v1/reports/export/excel`
   - Générer Excel et retourner fichier
6. Implémenter `GET /api/v1/reports/payroll`
   - Format Excel spécifique paie
   - Colonnes : Matricule, Nom, Heures normales, Heures sup, Retards, Absences, Congés

**Frontend** :
1. Modifier `handleExport` dans `ReportsPage`
   - Appeler API au lieu de mock
   - Télécharger fichier retourné
   - Gestion erreurs
2. Afficher tableau détaillé dans aperçu
   - Liste employés avec données réelles
   - Colonnes : Matricule, Nom, Heures, Retards, Absences
3. Améliorer historique
   - Connecter à API (si endpoint existe)
   - Téléchargement rapports précédents

**Durée estimée** : 2-3 jours

---

#### 1.3 Page Teams - Connexion API

**Objectif** : Remplacer mock data par données réelles

**Backend** :
- Endpoints déjà implémentés (`GET/POST/PATCH/DELETE /api/v1/teams`)
- Vérifier endpoint `POST /api/v1/teams/:id/employees` (assignation membres)

**Frontend** :
1. Créer hooks API
   - `useTeams` : `getAll()`, `create(data)`, `update(id, data)`, `delete(id)`
   - `useTeamMembers` : `assign(teamId, employeeIds)`, `remove(teamId, employeeId)`
2. Remplacer mock data
   - Utiliser `useTeams.getAll()` au lieu de `teams` mock
   - Utiliser données réelles pour membres
3. Connecter formulaire
   - Sauvegarde création/modification
   - Validation avant envoi
4. Gestion membres
   - Modal assignation employés (multi-sélection)
   - Bouton retirer fonctionnel

**Durée estimée** : 2 jours

---

#### 1.4 Page Settings - Connexion API

**Objectif** : Rendre tous les formulaires fonctionnels

**Backend** :
1. Vérifier endpoints existants
   - `GET /api/v1/tenants/:id/settings`
   - `PATCH /api/v1/tenants/:id/settings`
2. Créer endpoints jours fériés
   - `GET /api/v1/holidays` (liste)
   - `POST /api/v1/holidays` (créer)
   - `PATCH /api/v1/holidays/:id` (modifier)
   - `DELETE /api/v1/holidays/:id` (supprimer)
3. Créer endpoint upload logo
   - `POST /api/v1/tenants/:id/logo` (upload fichier)
   - Validation format/taille

**Frontend** :
1. Créer hooks API
   - `useTenantSettings` : `get()`, `update(data)`
   - `useHolidays` : `getAll()`, `create(data)`, `update(id, data)`, `delete(id)`
2. Connecter formulaires
   - Informations entreprise → `PATCH /api/v1/tenants/:id`
   - Paramètres régionaux → `PATCH /api/v1/tenants/:id/settings`
   - Politique horaire → `PATCH /api/v1/tenants/:id/settings`
3. Upload logo
   - Interface upload avec preview
   - Validation format/taille
4. Gestion jours fériés
   - Liste connectée à API
   - Modal création/modification
5. Validation et feedback
   - Validation formulaires
   - Messages erreur/succès

**Durée estimée** : 3 jours

---

### Phase 2 : Améliorations Fonctionnelles (Priorité MOYENNE)

#### 2.1 Dashboard - Données Réelles

**Objectif** : Remplacer graphiques mock par données réelles

**Backend** :
- Endpoint `GET /api/v1/reports/dashboard` existe déjà
- Enrichir pour retourner données hebdomadaires

**Frontend** :
1. Modifier `useDashboardStats` pour retourner données hebdomadaires
2. Remplacer `weeklyAttendanceData` mock par données API
3. Remplacer `shiftDistribution` mock par données API
4. Remplacer `overtimeData` mock par données API
5. Ajouter filtres Site, Département, Équipe
6. Ajouter auto-refresh toutes les 30s

**Durée estimée** : 1-2 jours

---

#### 2.2 Employees - Fonctionnalités Manquantes

**Objectif** : Compléter CRUD et ajouter fonctionnalités

**Frontend** :
1. Modal modification employé
   - Formulaire pré-rempli
   - Connecter à `PATCH /api/v1/employees/:id`
2. Filtres avancés
   - Sélecteurs Site, Département, Équipe, Statut
3. Page détail employé
   - Route `/employees/:id`
   - Toutes les infos + historique
4. Interface biométrie
   - Modal enregistrement empreinte/visage
   - Upload ou saisie manuelle

**Durée estimée** : 2-3 jours

---

#### 2.3 Attendance - Fonctionnalités Manquantes

**Objectif** : Ajouter correction, import, pointage manuel

**Frontend** :
1. Correction pointages
   - Modal correction avec formulaire
   - Workflow : Employé demande → Manager valide → RH valide
2. Filtres avancés
   - Site, Terminal, Type, Méthode, Anomalies uniquement
3. Import pointages
   - Modal import CSV/Excel
   - Rapport import
4. Pointage manuel
   - Modal création pointage
   - Formulaire complet

**Durée estimée** : 2-3 jours

---

#### 2.4 Leaves - Fonctionnalités Manquantes

**Objectif** : Compléter création, soldes, justificatifs

**Frontend** :
1. Modal création demande
   - Formulaire complet (type, dates, raison)
   - Upload document
2. Affichage soldes
   - Composant `LeaveBalance`
   - Par type de congé
3. Types de congés
   - Récupérer depuis API
   - Afficher dans sélecteur
4. Historique et graphiques
   - Page historique employé
   - Graphique évolution soldes

**Durée estimée** : 2-3 jours

---

#### 2.5 Overtime - Fonctionnalités Manquantes

**Objectif** : Compléter création, récupération, graphiques

**Frontend** :
1. Modal création demande
   - Formulaire (date, heures, type, raison)
2. Gestion récupération
   - Composant `RecoveryBalance`
   - Interface utilisation
3. Graphiques
   - Évolution heures sup
   - Répartition par type

**Durée estimée** : 1-2 jours

---

### Phase 3 : Améliorations UX (Priorité BASSE)

#### 3.1 Améliorations Générales

- Drag & drop pour réassigner employés
- Recherche avancée multi-critères
- Export filtres appliqués
- Notifications temps réel (WebSockets)
- Mode sombre
- Responsive mobile amélioré

**Durée estimée** : 5-7 jours

---

## 5. RÉSUMÉ DES ÉLÉMENTS MANQUANTS

### 5.1 Backend - Endpoints Manquants

| Endpoint | Module | Priorité | Statut |
|----------|--------|----------|--------|
| `GET /api/v1/schedules/week/:date` | Schedules | 🔴 HAUTE | ❌ Manquant |
| `GET /api/v1/schedules/month/:date` | Schedules | 🔴 HAUTE | ❌ Manquant |
| `POST /api/v1/schedules/bulk` | Schedules | 🔴 HAUTE | ❌ Manquant |
| `GET /api/v1/schedules/alerts` | Schedules | 🔴 HAUTE | ❌ Manquant |
| `POST /api/v1/schedules/replacements` | Schedules | 🔴 HAUTE | ❌ Manquant |
| `PATCH /api/v1/schedules/replacements/:id/approve` | Schedules | 🔴 HAUTE | ❌ Manquant |
| `POST /api/v1/reports/export/pdf` | Reports | 🔴 HAUTE | ❌ Manquant |
| `POST /api/v1/reports/export/excel` | Reports | 🔴 HAUTE | ❌ Manquant |
| `GET /api/v1/reports/payroll` | Reports | 🔴 HAUTE | ❌ Manquant |
| `GET /api/v1/holidays` | Holidays | 🟡 MOYENNE | ❌ Manquant |
| `POST /api/v1/holidays` | Holidays | 🟡 MOYENNE | ❌ Manquant |
| `POST /api/v1/tenants/:id/logo` | Tenants | 🟡 MOYENNE | ❌ Manquant |
| `GET /api/v1/users/me/export` | Users | 🟢 BASSE | ❌ Manquant |

### 5.2 Backend - Services Manquants

| Service | Module | Priorité | Statut |
|---------|--------|----------|--------|
| `AlertsService` | Schedules | 🔴 HAUTE | ❌ Manquant |
| `ExportPdfService` | Reports | 🔴 HAUTE | ❌ Manquant |
| `ExportExcelService` | Reports | 🔴 HAUTE | ❌ Manquant (partiel) |
| `ReplacementsService` | Schedules | 🔴 HAUTE | ❌ Manquant |

### 5.3 Frontend - Hooks API Manquants

| Hook | Page | Priorité | Statut |
|------|------|----------|--------|
| `useSchedules` | Shifts Planning | 🔴 HAUTE | ❌ Manquant |
| `useScheduleAlerts` | Shifts Planning | 🔴 HAUTE | ❌ Manquant |
| `useReplacements` | Shifts Planning | 🔴 HAUTE | ❌ Manquant |
| `useTeams` | Teams | 🔴 HAUTE | ❌ Manquant |
| `useTeamMembers` | Teams | 🔴 HAUTE | ❌ Manquant |
| `useTenantSettings` | Settings | 🔴 HAUTE | ❌ Manquant |
| `useHolidays` | Settings | 🟡 MOYENNE | ❌ Manquant |
| `useExportReport` | Reports | 🔴 HAUTE | ⚠️ Existe mais non fonctionnel |

### 5.4 Frontend - Composants Manquants

| Composant | Page | Priorité | Statut |
|-----------|------|----------|--------|
| `AlertBanner` | Shifts Planning | 🔴 HAUTE | ❌ Manquant |
| `LeaveBalance` | Leaves | 🟡 MOYENNE | ❌ Manquant |
| `RecoveryBalance` | Overtime | 🟡 MOYENNE | ❌ Manquant |
| `GanttChart` | Shifts Planning | 🟢 BASSE | ❌ Manquant |
| `EmployeeDetail` | Employees | 🟡 MOYENNE | ❌ Manquant |

### 5.5 Frontend - Modals Manquantes

| Modal | Page | Priorité | Statut |
|-------|------|----------|--------|
| Création demande congé | Leaves | 🟡 MOYENNE | ⚠️ Déclarée mais vide |
| Création demande heures sup | Overtime | 🟡 MOYENNE | ⚠️ Déclarée mais vide |
| Modification employé | Employees | 🟡 MOYENNE | ❌ Manquant |
| Correction pointage | Attendance | 🟡 MOYENNE | ❌ Manquant |
| Import pointages | Attendance | 🟢 BASSE | ❌ Manquant |
| Pointage manuel | Attendance | 🟢 BASSE | ❌ Manquant |
| Détail pointage | Attendance | 🟢 BASSE | ❌ Manquant |
| Détail congé | Leaves | 🟢 BASSE | ❌ Manquant |
| Détail heures sup | Overtime | 🟢 BASSE | ❌ Manquant |
| Création jour férié | Settings | 🟡 MOYENNE | ❌ Manquant |

---

## 6. PRIORISATION RECOMMANDÉE

### 🔴 Priorité HAUTE (À faire en premier)

1. **Page Shifts Planning** - Connexion API (3-4 jours)
   - Endpoints backend manquants
   - Remplacement mock data
   - Alertes légales

2. **Page Reports** - Exports PDF/Excel (2-3 jours)
   - Services export backend
   - Connexion frontend

3. **Page Teams** - Connexion API (2 jours)
   - Remplacement mock data
   - CRUD fonctionnel

4. **Page Settings** - Connexion API (3 jours)
   - Tous les formulaires fonctionnels
   - Upload logo

**Total Phase 1** : ~10-12 jours

---

### 🟡 Priorité MOYENNE (À faire ensuite)

1. **Dashboard** - Données réelles (1-2 jours)
2. **Employees** - Fonctionnalités manquantes (2-3 jours)
3. **Attendance** - Fonctionnalités manquantes (2-3 jours)
4. **Leaves** - Fonctionnalités manquantes (2-3 jours)
5. **Overtime** - Fonctionnalités manquantes (1-2 jours)

**Total Phase 2** : ~8-13 jours

---

### 🟢 Priorité BASSE (Améliorations)

1. Améliorations UX générales
2. Graphiques avancés
3. Notifications temps réel
4. Mode sombre

**Total Phase 3** : ~5-7 jours

---

## 7. ESTIMATION TOTALE

| Phase | Durée Estimée | Priorité |
|-------|---------------|----------|
| Phase 1 - Corrections Critiques | 10-12 jours | 🔴 HAUTE |
| Phase 2 - Améliorations Fonctionnelles | 8-13 jours | 🟡 MOYENNE |
| Phase 3 - Améliorations UX | 5-7 jours | 🟢 BASSE |
| **TOTAL** | **23-32 jours** | |

---

## 8. NOTES IMPORTANTES

### 8.1 Conformité Cahier des Charges

✅ **Respecté** :
- Multi-tenant isolation
- Pointage biométrique (7 méthodes)
- Rotations optionnelles (100% facultatives)
- Workflow congés Manager → RH
- Alertes légales non bloquantes (architecture)

⚠️ **En cours** :
- Planning visuel (backend partiel, frontend mock)
- Rapports & exports (backend partiel, frontend non fonctionnel)

### 8.2 Points d'Attention

1. **Données mock** : Pages Shifts Planning et Teams utilisent uniquement des données mock
2. **Exports** : Boutons export présents mais non fonctionnels
3. **Settings** : Tous les formulaires non connectés à l'API
4. **Alertes légales** : Service backend non implémenté (seulement dans docs)

### 8.3 Recommandations

1. **Commencer par Phase 1** : Corrections critiques pour rendre le projet fonctionnel
2. **Tester chaque étape** : Valider chaque fonctionnalité avant de passer à la suivante
3. **Documenter** : Mettre à jour la documentation à chaque étape
4. **Prioriser UX** : Une fois fonctionnel, améliorer l'expérience utilisateur

---

**Fin du document de suivi**  
**Dernière mise à jour** : 22 novembre 2025  
**Prochaine révision** : Après implémentation Phase 1

