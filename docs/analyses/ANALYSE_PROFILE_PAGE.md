# Analyse détaillée de l'interface Profile

## 📋 Vue d'ensemble

### État actuel
L'interface `/profile` existe mais présente plusieurs problèmes :
- Design non professionnel (couleurs hardcodées, styles inline)
- Pas d'intégration avec le système RBAC
- Structure non modulaire
- Manque de cohérence avec le reste de l'application
- Pas d'utilisation de `DashboardLayout`
- Pas de protection par permissions

### Objectifs de la refonte
1. **Design professionnel** : Interface moderne et cohérente avec le reste de l'application
2. **RBAC intégré** : Affichage conditionnel selon les rôles et permissions
3. **Modularité** : Composants réutilisables et maintenables
4. **UX optimisée** : Navigation claire, feedback utilisateur, validation
5. **Responsive** : Adaptation mobile/tablette/desktop

---

## 🔍 Analyse de l'interface actuelle

### Structure actuelle

#### 1. **Header** (lignes 228-267)
- ✅ Titre et description présents
- ❌ Bouton "Télécharger mes données" non fonctionnel
- ❌ Avatar utilisateur hardcodé
- ❌ Pas d'intégration avec le contexte Auth
- ❌ Styles inline au lieu de classes Tailwind cohérentes

#### 2. **Colonne gauche - Informations personnelles** (lignes 273-405)
- ✅ Formulaire de base présent
- ❌ Pas de validation côté client
- ❌ Email non modifiable (correct) mais pas d'indication claire
- ❌ Rôle affiché mais pas les rôles RBAC
- ❌ Photo de profil non fonctionnelle
- ❌ Pas de gestion d'erreurs visuelles

#### 3. **Informations employé** (lignes 407-492)
- ✅ Affichage des données employé
- ❌ Tous les champs en lecture seule (correct) mais pas d'indication
- ❌ Pas de distinction visuelle entre modifiable/non modifiable
- ❌ Pas de lien vers la fiche employé complète
- ❌ Pas de gestion du cas "pas d'employé associé"

#### 4. **Préférences & Notifications** (lignes 494-670)
- ✅ Configuration des notifications
- ❌ Pas de sauvegarde automatique
- ❌ Pas de feedback visuel lors de la modification
- ❌ Pas de gestion des erreurs
- ❌ Timezone limité à 2 options

#### 5. **Colonne droite - Sécurité** (lignes 695-879)
- ✅ Changement de mot de passe
- ✅ Gestion des sessions
- ❌ Force du mot de passe trop simple
- ❌ Pas de validation en temps réel
- ❌ Sessions non fonctionnelles (endpoints manquants)

#### 6. **Statistiques personnelles** (lignes 881-942)
- ✅ Affichage des stats
- ❌ Données hardcodées (stats non réelles)
- ❌ Pas de graphiques
- ❌ Pas de période sélectionnable

---

## 🔐 Analyse des droits selon les rôles RBAC

### Permissions nécessaires

#### **Tous les utilisateurs** (EMPLOYEE, MANAGER, ADMIN_RH, SUPER_ADMIN)
- ✅ `user.view_own` - Voir son propre profil (implicite)
- ✅ `user.update_own` - Modifier son propre profil (implicite)
- ✅ Accès à la page `/profile` (public pour utilisateurs authentifiés)

#### **Actions selon les rôles**

| Action | EMPLOYEE | MANAGER | ADMIN_RH | SUPER_ADMIN |
|--------|----------|---------|----------|-------------|
| **Voir son profil** | ✅ | ✅ | ✅ | ✅ |
| **Modifier nom/prénom/téléphone** | ✅ | ✅ | ✅ | ✅ |
| **Changer mot de passe** | ✅ | ✅ | ✅ | ✅ |
| **Modifier email** | ❌ | ❌ | ⚠️ (avec validation) | ✅ |
| **Voir informations employé** | ✅ (si lié) | ✅ (si lié) | ✅ (si lié) | ✅ |
| **Modifier informations employé** | ❌ | ❌ | ✅ | ✅ |
| **Voir statistiques personnelles** | ✅ | ✅ | ✅ | ✅ |
| **Voir statistiques équipe** | ❌ | ✅ | ✅ | ✅ |
| **Gérer sessions** | ✅ (ses sessions) | ✅ (ses sessions) | ✅ (ses sessions) | ✅ (toutes) |
| **Voir rôles RBAC** | ✅ (ses rôles) | ✅ (ses rôles) | ✅ (ses rôles) | ✅ (tous) |
| **Modifier rôles RBAC** | ❌ | ❌ | ⚠️ (autres utilisateurs) | ✅ |
| **Télécharger données RGPD** | ✅ | ✅ | ✅ | ✅ |
| **Voir historique des modifications** | ❌ | ❌ | ⚠️ (si permission audit) | ✅ |

### Permissions spécifiques à implémenter

1. **`user.view_own`** - Implicite (tous peuvent voir leur profil)
2. **`user.update_own`** - Implicite (tous peuvent modifier leur profil)
3. **`user.update_email`** - Seulement ADMIN_RH et SUPER_ADMIN
4. **`employee.view_own`** - Voir ses infos employé
5. **`employee.update`** - Modifier infos employé (seulement ADMIN_RH/SUPER_ADMIN)
6. **`user.view_sessions`** - Voir ses sessions
7. **`user.manage_sessions`** - Gérer toutes les sessions (SUPER_ADMIN)
8. **`user.view_stats_team`** - Voir stats équipe (MANAGER+)
9. **`audit.view_own`** - Voir son historique (optionnel)

---

## 🎨 Structure proposée pour la nouvelle interface

### Layout général

```
┌─────────────────────────────────────────────────────────┐
│  Header (DashboardLayout)                               │
│  - Titre: "Mon Profil"                                  │
│  - Breadcrumb: Dashboard > Profil                       │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  Tabs Navigation                                        │
│  [Informations] [Sécurité] [Préférences] [Statistiques]│
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  Content Area (selon l'onglet actif)                   │
└─────────────────────────────────────────────────────────┘
```

### Onglet 1 : Informations personnelles

#### Section 1 : Photo de profil
- Avatar avec upload
- Indicateur de progression
- Validation format/taille
- Prévisualisation

#### Section 2 : Identité
- Prénom (modifiable)
- Nom (modifiable)
- Email (lecture seule sauf ADMIN_RH/SUPER_ADMIN)
- Téléphone (modifiable)
- Badge de vérification email

#### Section 3 : Rôles et permissions
- Liste des rôles RBAC actuels
- Badges colorés par rôle
- Liste des permissions (expandable)
- Indication "Lecture seule" si pas de permission de modification

#### Section 4 : Informations employé (si lié)
- Card séparée avec badge "Synchronisé RH"
- Matricule, Poste, Département, Site, Équipe, Shift, Date embauche
- Bouton "Voir fiche complète" (si permission `employee.view_own`)
- Indication "Modifiable uniquement par la RH"

### Onglet 2 : Sécurité

#### Section 1 : Mot de passe
- Formulaire de changement
- Validation en temps réel
- Indicateur de force (amélioré)
- Exigences affichées
- Confirmation requise

#### Section 2 : Sessions actives
- Liste des sessions avec détails
- Badge "Session actuelle"
- Bouton "Révoquer" pour chaque session
- Bouton "Révoquer toutes les autres sessions"
- Indicateur de sécurité (connexions suspectes)

#### Section 3 : Authentification à deux facteurs (futur)
- Placeholder pour 2FA
- Toggle activé/désactivé
- QR code pour configuration

### Onglet 3 : Préférences

#### Section 1 : Langue et région
- Sélecteur de langue (FR/EN/AR)
- Sélecteur de fuseau horaire (liste complète)
- Format de date
- Format d'heure

#### Section 2 : Notifications
- Toggle par type de notification
- Groupes : Email, Push, SMS
- Catégories : Congés, Planning, Alertes, Rapports
- Prévisualisation des préférences

#### Section 3 : Interface
- Thème (clair/sombre) - futur
- Densité d'affichage
- Animations on/off

### Onglet 4 : Statistiques

#### Section 1 : Vue d'ensemble (tous)
- Jours travaillés (mois en cours)
- Heures totales
- Retards
- Heures supplémentaires
- Congés pris

#### Section 2 : Graphiques (tous)
- Graphique d'évolution mensuelle
- Graphique de répartition (heures normales/HS)
- Graphique de présence (calendrier)

#### Section 3 : Statistiques équipe (MANAGER+)
- Si permission `user.view_stats_team` ou `reports.view_attendance`
- Stats de l'équipe
- Comparaison avec la moyenne

#### Section 4 : Export (tous)
- Bouton "Télécharger mes données (RGPD)"
- Format JSON/CSV
- Historique des exports

---

## 🛠️ Composants à créer

### Composants principaux
1. **`ProfileHeader`** - Header avec avatar et actions
2. **`ProfileTabs`** - Navigation par onglets
3. **`PersonalInfoTab`** - Onglet informations personnelles
4. **`SecurityTab`** - Onglet sécurité
5. **`PreferencesTab`** - Onglet préférences
6. **`StatisticsTab`** - Onglet statistiques

### Composants réutilisables
1. **`AvatarUpload`** - Upload et prévisualisation avatar
2. **`PasswordStrengthIndicator`** - Indicateur de force mot de passe
3. **`SessionCard`** - Carte de session active
4. **`RoleBadge`** - Badge de rôle RBAC
5. **`PermissionList`** - Liste des permissions (expandable)
6. **`EmployeeInfoCard`** - Card informations employé
7. **`StatsCard`** - Card de statistique
8. **`NotificationToggle`** - Toggle de notification avec description

---

## 📱 Responsive Design

### Desktop (> 1024px)
- Layout 2 colonnes (70/30)
- Tabs horizontaux
- Cards côte à côte

### Tablette (768px - 1024px)
- Layout 1 colonne
- Tabs horizontaux
- Cards empilées

### Mobile (< 768px)
- Layout 1 colonne
- Tabs en accordéon ou scroll horizontal
- Cards pleine largeur
- Formulaire optimisé mobile

---

## 🔒 Protection par permissions

### Vérifications à implémenter

```typescript
// Exemples de vérifications
const { hasPermission, hasRole } = useAuth();

// Modifier email
{hasPermission('user.update_email') && (
  <EditableEmailField />
)}

// Voir stats équipe
{hasPermission('user.view_stats_team') && (
  <TeamStatsSection />
)}

// Modifier infos employé
{hasPermission('employee.update') && (
  <EditableEmployeeInfo />
)}

// Voir tous les rôles
{hasRole('SUPER_ADMIN') && (
  <AllRolesSection />
)}
```

---

## 🎯 Améliorations UX

### 1. Feedback utilisateur
- ✅ Toasts pour succès/erreur
- ✅ Indicateurs de chargement
- ✅ Messages de validation en temps réel
- ✅ Confirmations pour actions critiques

### 2. Validation
- ✅ Validation côté client
- ✅ Messages d'erreur clairs
- ✅ Indicateurs visuels (champs valides/invalides)
- ✅ Prévention de soumission invalide

### 3. Performance
- ✅ Lazy loading des onglets
- ✅ Cache des données (React Query)
- ✅ Optimistic updates
- ✅ Debounce sur les champs de recherche

### 4. Accessibilité
- ✅ Labels ARIA
- ✅ Navigation au clavier
- ✅ Contraste suffisant
- ✅ Focus visible

---

## 📊 Données nécessaires

### Endpoints backend requis

#### ✅ Endpoints existants
1. **GET `/users/me`** ✅
   - Retourne : user (id, email, firstName, lastName, phone, avatar, role, isActive, lastLoginAt)
   - ⚠️ **Problème** : Ne retourne pas `employee`, `roles`, `permissions`
   - **Action requise** : Modifier pour inclure les relations employee, userTenantRoles avec roles et permissions

2. **PATCH `/users/me`** ✅
   - Permet : firstName, lastName, phone, avatar
   - ⚠️ **Limitation** : Email non modifiable (correct pour sécurité)
   - **Action requise** : Ajouter validation et gestion d'erreurs

#### ❌ Endpoints manquants à créer
3. **POST `/users/me/change-password`** ❌
   - **Action requise** : Créer l'endpoint
   - Permet : changement de mot de passe avec validation

4. **GET `/users/me/preferences`** ❌
   - **Action requise** : Créer l'endpoint + table UserPreferences (ou utiliser JSON dans User)
   - Retourne : language, timezone, notifications, dateFormat, etc.

5. **PATCH `/users/me/preferences`** ❌
   - **Action requise** : Créer l'endpoint
   - Permet : mise à jour préférences

6. **GET `/users/me/sessions`** ❌
   - **Action requise** : Créer l'endpoint + table UserSession (ou utiliser JWT blacklist)
   - Retourne : liste des sessions actives avec device, browser, OS, location, IP, lastActive

7. **DELETE `/users/me/sessions/:id`** ❌
   - **Action requise** : Créer l'endpoint
   - Permet : révoquer une session spécifique

8. **POST `/users/me/sessions/revoke-all`** ❌
   - **Action requise** : Créer l'endpoint
   - Permet : révoquer toutes les autres sessions (sauf la session actuelle)

9. **GET `/users/me/stats`** ❌
   - **Action requise** : Créer l'endpoint
   - Retourne : statistiques personnelles (jours travaillés, heures, retards, HS, congés)
   - **Logique** : Calculer depuis les données Attendance, Leave, Overtime

10. **GET `/users/me/export`** ❌
    - **Action requise** : Créer l'endpoint
    - Permet : télécharger données RGPD (JSON/CSV)
    - **Contenu** : Toutes les données utilisateur + historique + logs

11. **PATCH `/users/me/email`** ❌ (optionnel, seulement ADMIN_RH/SUPER_ADMIN)
    - **Action requise** : Créer l'endpoint avec validation email
    - Permet : changement d'email avec confirmation

12. **GET `/users/me/roles`** ❌ (ou inclure dans GET /users/me)
    - **Action requise** : Modifier GET /users/me pour inclure
    - Retourne : Liste des rôles RBAC avec permissions

---

## 🚀 Plan d'implémentation

### Phase 1 : Structure de base
1. Créer le layout avec DashboardLayout
2. Implémenter la navigation par onglets
3. Créer les composants de base

### Phase 2 : Onglet Informations
1. Formulaire informations personnelles
2. Section rôles et permissions
3. Section informations employé
4. Upload avatar

### Phase 3 : Onglet Sécurité
1. Changement de mot de passe
2. Gestion des sessions
3. Validation et feedback

### Phase 4 : Onglet Préférences
1. Configuration langue/timezone
2. Gestion des notifications
3. Sauvegarde automatique

### Phase 5 : Onglet Statistiques
1. Stats personnelles
2. Graphiques
3. Stats équipe (si permission)
4. Export RGPD

### Phase 6 : Polish
1. Responsive design
2. Accessibilité
3. Tests
4. Documentation

---

## ✅ Checklist de validation

### Fonctionnalités
- [ ] Affichage correct des informations utilisateur
- [ ] Modification des champs autorisés
- [ ] Changement de mot de passe fonctionnel
- [ ] Gestion des sessions
- [ ] Configuration des préférences
- [ ] Affichage des statistiques
- [ ] Protection par permissions RBAC
- [ ] Upload d'avatar

### Design
- [ ] Cohérence avec le reste de l'application
- [ ] Responsive (mobile/tablette/desktop)
- [ ] Accessible (ARIA, clavier)
- [ ] Performance optimale

### Sécurité
- [ ] Validation côté client et serveur
- [ ] Protection CSRF
- [ ] Gestion des erreurs
- [ ] Logs d'audit (optionnel)

---

## 📝 Notes importantes

1. **Email** : Ne pas permettre la modification sauf pour ADMIN_RH/SUPER_ADMIN (sécurité)
2. **Informations employé** : Lecture seule sauf pour ADMIN_RH/SUPER_ADMIN
3. **Sessions** : Tous peuvent voir leurs sessions, SUPER_ADMIN peut voir toutes
4. **Statistiques** : Tous voient leurs stats, MANAGER+ voient stats équipe
5. **RGPD** : Tous peuvent télécharger leurs données
6. **Avatar** : Tous peuvent modifier leur avatar (limite de taille/format)

---

## 🎨 Design System

### Couleurs
- Utiliser les couleurs du thème (primary, success, warning, danger)
- Éviter les couleurs hardcodées

### Typographie
- Utiliser les classes de texte du design system
- Hiérarchie claire (h1, h2, h3, body, small)

### Espacements
- Utiliser les espacements cohérents (space-y-4, gap-4, etc.)
- Padding/margin uniformes

### Composants UI
- Utiliser les composants existants (Button, Input, Card, Badge, etc.)
- Créer de nouveaux composants si nécessaire mais réutilisables

---

## 🔄 Prochaines étapes

### Phase 0 : Backend (prioritaire)
1. **Modifier GET `/users/me`** pour inclure :
   - Relation `employee` avec toutes les infos
   - Relation `userTenantRoles` avec `role` et `permissions`
   - Liste des rôles RBAC actuels
   - Liste des permissions dérivées

2. **Créer les endpoints manquants** :
   - POST `/users/me/change-password`
   - GET/PATCH `/users/me/preferences`
   - GET/DELETE `/users/me/sessions`
   - GET `/users/me/stats`
   - GET `/users/me/export`

3. **Créer les tables nécessaires** (si besoin) :
   - `UserPreferences` (ou JSON dans User)
   - `UserSession` (ou utiliser JWT blacklist)

### Phase 1 : Frontend
1. **Valider cette analyse** avec l'utilisateur
2. **Créer les composants** un par un
3. **Intégrer le RBAC** progressivement
4. **Tester** avec différents rôles
5. **Optimiser** la performance et l'UX

---

**Date de l'analyse** : 2025-01-XX
**Version** : 1.0
**Auteur** : AI Assistant

