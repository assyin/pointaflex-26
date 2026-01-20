# Analyse Complète de l'Interface Attendance (Pointages & Présences)

## 📋 Table des Matières
1. [Vue d'ensemble](#vue-densemble)
2. [Ce qui existe et fonctionne](#ce-qui-existe-et-fonctionne)
3. [Ce qui n'existe pas ou est incomplet](#ce-qui-nexiste-pas-ou-est-incomplet)
4. [Analyse de la logique de traitement des anomalies](#analyse-de-la-logique-de-traitement-des-anomalies)
5. [Recommandations et améliorations](#recommandations-et-améliorations)

---

## 🎯 Vue d'ensemble

L'interface `/attendance` permet la gestion des pointages et présences des employés avec un système de détection d'anomalies basique. L'analyse révèle une base fonctionnelle mais avec plusieurs fonctionnalités critiques manquantes, notamment pour le traitement des anomalies par les managers de département.

---

## ✅ Ce qui existe et fonctionne

### 1. **Interface Utilisateur (Frontend)**

#### 1.1 Affichage des Données
- ✅ **Tableau des pointages** : Affichage complet avec colonnes :
  - Employé (nom, prénom, matricule, avatar)
  - Type (IN, OUT, BREAK_START, BREAK_END) avec badges colorés
  - Date & Heure (format lisible)
  - Source (méthode de pointage : Empreinte, RFID, QR Code, etc.)
  - Terminal (nom ou ID du dispositif)
  - Statut (Valide/Anomalie avec badges)
- ✅ **Recherche** : Recherche en temps réel par nom, prénom ou matricule
- ✅ **Filtres de date** : Sélection de période avec boutons rapides (Aujourd'hui, Cette semaine)
- ✅ **Actualisation automatique** : Rafraîchissement toutes les 30 secondes avec indicateur visuel

#### 1.2 Statistiques
- ✅ **Cartes de statistiques** :
  - Total pointages (avec distinction filtré/total)
  - Entrées (compteur)
  - Sorties (compteur)
  - Anomalies (compteur avec nombre non résolues)
- ✅ **Calculs en temps réel** : Statistiques mises à jour selon les filtres appliqués

#### 1.3 Alertes
- ✅ **Alerte anomalies** : Affichage d'une alerte si des anomalies sont détectées
- ✅ **Badges visuels** : Indicateurs visuels pour les anomalies dans le tableau

#### 1.4 Export
- ✅ **Export CSV** : Export des données en format CSV
- ✅ **Export Excel** : Export des données en format Excel
- ✅ **Filtres appliqués** : Export respecte les filtres de date

### 2. **Backend (API)**

#### 2.1 Gestion des Données
- ✅ **CRUD complet** : Create, Read, Update, Delete
- ✅ **Filtrage avancé** : Par employé, site, date, type, anomalies
- ✅ **Gestion des permissions** : RBAC avec filtrage selon le rôle (view_all, view_own, view_team, view_department, view_site)
- ✅ **Gestion des managers** : Filtrage automatique selon la hiérarchie (Département, Site, Équipe)
- ✅ **Limite de performance** : Limite à 1000 enregistrements pour éviter les surcharges
- ⚠️ **Types de pointage** : Support des types BREAK_START et BREAK_END, mais pas de configuration pour les activer/désactiver

#### 2.2 Intégration Terminaux
- ✅ **Webhook** : Endpoint pour recevoir les pointages des terminaux biométriques
- ✅ **Push URL** : Support pour les terminaux ZKTeco et BioTime
- ✅ **Mapping automatique** : Conversion des formats terminaux vers le format interne
- ✅ **Gestion flexible des matricules** : Recherche flexible avec gestion des zéros à gauche

#### 2.3 Détection d'Anomalies Basique
- ✅ **Double entrée (DOUBLE_IN)** : Détection d'un deuxième pointage d'entrée dans la même journée
- ✅ **Sortie sans entrée (MISSING_IN)** : Détection d'un pointage de sortie sans entrée correspondante
- ✅ **Marquage automatique** : Les anomalies sont automatiquement marquées lors de la création

#### 2.4 Correction
- ✅ **Méthode de correction** : `correctAttendance` permet de corriger un pointage
- ✅ **Traçabilité** : Stockage de `correctedBy`, `correctedAt`, et `correctionNote`
- ✅ **Modification du timestamp** : Possibilité de corriger l'heure du pointage

#### 2.5 Rapports
- ✅ **Rapport quotidien** : `getDailyReport` fournit des statistiques pour une date donnée
- ✅ **Récupération des anomalies** : `getAnomalies` retourne toutes les anomalies non corrigées

---

## ❌ Ce qui n'existe pas ou est incomplet

### 1. **Interface de Traitement des Anomalies**

#### 1.1 Vue Dédiée Manquante
- ❌ **Pas de vue dédiée** : Aucune interface spécifique pour les managers pour traiter les anomalies
- ❌ **Pas de workflow** : Aucun workflow structuré pour le traitement des anomalies
- ❌ **Pas de liste filtrée** : Impossible de voir uniquement les anomalies nécessitant une action

#### 1.2 Actions de Correction
- ❌ **Pas de modal de correction** : Aucun formulaire dans l'interface pour corriger un pointage
- ❌ **Pas de bouton "Corriger"** : Aucun bouton visible dans le tableau pour corriger une anomalie
- ❌ **Pas de validation** : Aucune validation avant correction
- ❌ **Pas de prévisualisation** : Impossible de voir l'impact de la correction avant validation

#### 1.3 Filtrage des Anomalies
- ❌ **Pas de filtre par type d'anomalie** : Impossible de filtrer par DOUBLE_IN, MISSING_IN, LATE, etc.
- ❌ **Pas de filtre par statut** : Impossible de filtrer les anomalies corrigées vs non corrigées
- ❌ **Pas de tri par priorité** : Aucun système de priorité pour les anomalies

### 2. **Détection d'Anomalies Incomplète**

#### 2.1 Anomalies Non Détectées
- ❌ **Retards (LATE)** : Marqué comme TODO, non implémenté
  - Nécessite : Planning de l'employé, heure de début de shift
  - Impact : Impossible de détecter les retards automatiquement
- ❌ **Sorties manquantes (MISSING_OUT)** : Non détecté
  - Impact : Impossible de détecter si un employé n'a pas pointé sa sortie
- ❌ **Départs anticipés (EARLY_LEAVE)** : Non détecté
  - Impact : Impossible de détecter les départs avant l'heure prévue
- ❌ **Repos insuffisant (INSUFFICIENT_REST)** : Marqué comme TODO, non implémenté
  - Nécessite : Calcul du temps entre la sortie précédente et l'entrée actuelle
  - Impact : Risque légal (non-respect des périodes de repos obligatoires)
- ❌ **Absences (ABSENCE)** : Non détecté
  - Nécessite : Comparaison avec le planning prévu
  - Impact : Impossible de détecter automatiquement les absences non justifiées
- ❌ **Heures supplémentaires non déclarées (UNREPORTED_OVERTIME)** : Non détecté
  - Impact : Perte de traçabilité des heures supplémentaires

#### 2.2 Logique de Détection
- ❌ **Pas de vérification du planning** : La détection ne prend pas en compte le planning de l'employé
- ❌ **Pas de vérification des congés** : Ne vérifie pas si l'employé est en congé
- ❌ **Pas de vérification des missions** : Ne vérifie pas si l'employé est en mission
- ❌ **Pas de contexte** : La détection est basique et ne tient pas compte du contexte métier

### 3. **Gestion des Statuts**

#### 3.1 Statuts Définis mais Non Utilisés
- ❌ **PENDING_CORRECTION** : Défini dans le frontend mais absent du backend
- ❌ **VALID** : Défini dans le frontend mais non géré dans le backend
- ❌ **CORRECTED** : Utilisé via `isCorrected` mais pas comme statut explicite

#### 3.2 Workflow de Statut
- ❌ **Pas de workflow** : Aucun workflow défini pour les transitions de statut
- ❌ **Pas de validation** : Pas de validation des transitions de statut
- ❌ **Pas de notifications** : Aucune notification lors du changement de statut

### 4. **Permissions et Accès**

#### 4.1 Permissions Manquantes
- ❌ **attendance.view_anomalies** : Permission définie mais l'endpoint `getAnomalies` requiert `attendance.view_all`
- ❌ **Filtrage par département** : Les managers de département ne peuvent pas filtrer les anomalies de leur département uniquement
- ❌ **Accès limité** : Seuls les utilisateurs avec `attendance.view_all` peuvent voir les anomalies

#### 4.2 Gestion Hiérarchique
- ❌ **Pas de délégation** : Impossible de déléguer le traitement des anomalies
- ❌ **Pas de validation multi-niveaux** : Pas de workflow d'approbation pour les corrections importantes

### 5. **Calculs et Métriques**

#### 5.1 Calculs Manquants
- ❌ **Heures travaillées** : Champ `hoursWorked` défini dans le frontend mais non calculé
- ❌ **Minutes de retard** : Champ `lateMinutes` défini mais non calculé
- ❌ **Minutes de départ anticipé** : Champ `earlyLeaveMinutes` défini mais non calculé
- ❌ **Minutes d'heures sup** : Champ `overtimeMinutes` défini mais non calculé

#### 5.2 Statistiques Avancées
- ❌ **Taux de présence** : Pas de calcul du taux de présence par employé
- ❌ **Taux de ponctualité** : Pas de calcul du taux de ponctualité
- ❌ **Tendances** : Pas d'analyse des tendances (évolution des retards, absences, etc.)

### 6. **Notifications et Alertes**

#### 6.1 Notifications Manquantes
- ❌ **Notification de nouvelle anomalie** : Pas de notification pour les managers lors de la détection d'une anomalie
- ❌ **Notification de correction** : Pas de notification pour l'employé lors de la correction
- ❌ **Alertes proactives** : Pas d'alertes pour les anomalies récurrentes

### 7. **Validation et Règles Métier**

#### 7.1 Validations Manquantes
- ❌ **Validation des heures** : Pas de validation que les heures de correction sont cohérentes
- ❌ **Validation des permissions** : Pas de vérification que le manager peut corriger ce pointage
- ❌ **Validation temporelle** : Pas de vérification que la correction est dans une plage raisonnable

#### 7.2 Règles Métier
- ❌ **Tolérances** : Pas de gestion des tolérances (ex: 5 minutes de retard acceptées)
- ❌ **Exceptions** : Pas de gestion des exceptions (congés, missions, etc.)
- ❌ **Historique** : Pas de suivi de l'historique des corrections

### 8. **Configuration du Pointage des Repos (Pauses)**

#### 8.1 Fonctionnalité Manquante
- ❌ **Pas de configuration** : Aucune option pour activer/désactiver le pointage des repos (BREAK_START, BREAK_END)
- ❌ **Pointage obligatoire** : Le système accepte actuellement les pointages de repos sans possibilité de les désactiver
- ❌ **Pas de paramétrage** : Aucun paramètre dans `TenantSettings` pour contrôler cette fonctionnalité

#### 8.2 Impact Actuel
- ⚠️ **Flexibilité limitée** : Certaines entreprises ne nécessitent pas le pointage des pauses/repos
- ⚠️ **Données inutiles** : Les pointages de repos peuvent encombrer les données si non nécessaires
- ⚠️ **Complexité inutile** : Les employés doivent pointer les pauses même si ce n'est pas requis par l'entreprise

#### 8.3 Besoin Métier
- ✅ **Configuration par tenant** : Chaque entreprise doit pouvoir choisir si le pointage des repos est obligatoire ou optionnel
- ✅ **Activation/Désactivation** : Possibilité d'activer ou désactiver le pointage des repos via les paramètres
- ✅ **Impact sur les terminaux** : Les terminaux biométriques doivent respecter cette configuration
- ✅ **Impact sur la détection** : La détection d'anomalies doit tenir compte de cette configuration

#### 8.4 Scénarios d'Utilisation
- **Scénario 1** : Entreprise avec pointage de repos activé
  - Les employés doivent pointer BREAK_START et BREAK_END
  - Les anomalies de pause sont détectées (pause trop longue, pause non pointée, etc.)
  - Les heures de pause sont comptabilisées dans les calculs
  
- **Scénario 2** : Entreprise avec pointage de repos désactivé
  - Les employés ne pointent que IN et OUT
  - Les pointages BREAK_START et BREAK_END sont ignorés ou rejetés
  - Les calculs d'heures travaillées ne tiennent pas compte des pauses
  - Les terminaux ne proposent pas l'option de pointage de pause

---

## 🔄 Analyse de la Logique de Traitement des Anomalies

### 1. **Logique Actuelle**

#### 1.1 Détection d'Anomalies
```typescript
// Code actuel (simplifié)
private async detectAnomalies(...) {
  // 1. Récupérer les pointages du jour
  // 2. Vérifier DOUBLE_IN (double entrée)
  // 3. Vérifier MISSING_IN (sortie sans entrée)
  // 4. TODO: Vérifier retards
  // 5. TODO: Vérifier repos insuffisant
}
```

#### 1.2 Points Forts
- ✅ **Simplicité** : Logique claire et directe
- ✅ **Performance** : Détection rapide lors de la création
- ✅ **Marquage automatique** : Les anomalies sont automatiquement marquées

#### 1.3 Points Faibles
- ❌ **Détection limitée** : Seulement 2 types d'anomalies détectées
- ❌ **Pas de contexte** : Ne prend pas en compte le planning, les congés, les missions
- ❌ **Pas de priorisation** : Toutes les anomalies ont le même niveau de priorité
- ❌ **Pas de regroupement** : Les anomalies liées ne sont pas regroupées

### 2. **Workflow de Correction Actuel**

#### 2.1 Processus
```typescript
// Code actuel (simplifié)
async correctAttendance(tenantId, id, correctionDto) {
  // 1. Vérifier que le pointage existe
  // 2. Mettre à jour avec isCorrected = true
  // 3. Stocker correctedBy, correctedAt, correctionNote
  // 4. Optionnellement modifier le timestamp
}
```

#### 2.2 Points Forts
- ✅ **Simplicité** : Processus direct
- ✅ **Traçabilité** : Stockage de qui a corrigé et quand
- ✅ **Flexibilité** : Possibilité de modifier le timestamp

#### 2.3 Points Faibles
- ❌ **Pas de validation** : Aucune validation avant correction
- ❌ **Pas de workflow** : Pas de workflow d'approbation
- ❌ **Pas de notifications** : Pas de notification à l'employé
- ❌ **Pas de vérification** : Ne vérifie pas si la correction résout réellement l'anomalie
- ❌ **Pas de re-détection** : Après correction, ne re-détecte pas les nouvelles anomalies potentielles

### 3. **Accès et Permissions**

#### 3.1 Permissions Actuelles
- ✅ **attendance.correct** : Permission pour corriger
- ✅ **attendance.view_anomalies** : Permission pour voir les anomalies
- ❌ **Restriction d'accès** : L'endpoint `getAnomalies` requiert `attendance.view_all` au lieu de `attendance.view_anomalies`

#### 3.2 Filtrage par Manager
- ✅ **Filtrage automatique** : Les managers voient uniquement les pointages de leurs employés
- ❌ **Pas de filtre spécifique** : Impossible de filtrer uniquement les anomalies de leur département
- ❌ **Pas de vue dédiée** : Pas de vue "Mes anomalies à traiter"

### 4. **Scénarios Non Gérés**

#### 4.1 Correction Partielle
- ❌ **Impossible** : On ne peut corriger qu'un pointage à la fois
- ❌ **Pas de correction groupée** : Impossible de corriger plusieurs anomalies liées en une seule action

#### 4.2 Validation de Correction
- ❌ **Pas de validation** : Aucune validation que la correction est correcte
- ❌ **Pas de re-détection** : Après correction, ne vérifie pas si de nouvelles anomalies apparaissent

#### 4.3 Historique et Audit
- ❌ **Pas d'historique** : Pas de suivi de l'historique des corrections
- ❌ **Pas d'audit trail** : Pas de trace complète des modifications

### 5. **Intégration avec Autres Modules**

#### 5.1 Planning
- ❌ **Pas d'intégration** : La détection ne prend pas en compte le planning
- ❌ **Pas de vérification** : Ne vérifie pas si l'employé est censé être présent

#### 5.2 Congés
- ❌ **Pas d'intégration** : Ne vérifie pas si l'employé est en congé
- ❌ **Pas de validation** : Ne valide pas si un pointage est cohérent avec un congé

#### 5.3 Missions
- ❌ **Pas d'intégration** : Ne prend pas en compte les missions
- ❌ **Pas de contexte** : Ne sait pas si un pointage est lié à une mission

---

## 💡 Recommandations et Améliorations

### 1. **Priorité Critique**

#### 1.1 Interface de Traitement des Anomalies
- ✅ Créer une vue dédiée `/attendance/anomalies` pour les managers
- ✅ Ajouter un filtre "Anomalies uniquement" dans la vue principale
- ✅ Créer un modal de correction avec validation
- ✅ Ajouter des boutons d'action dans le tableau pour corriger

#### 1.2 Détection d'Anomalies Complète
- ✅ Implémenter la détection des retards (LATE)
- ✅ Implémenter la détection des sorties manquantes (MISSING_OUT)
- ✅ Implémenter la détection des départs anticipés (EARLY_LEAVE)
- ✅ Implémenter la détection des absences (ABSENCE)
- ✅ Implémenter la détection du repos insuffisant (INSUFFICIENT_REST)

#### 1.3 Permissions et Accès
- ✅ Corriger l'endpoint `getAnomalies` pour accepter `attendance.view_anomalies`
- ✅ Filtrer les anomalies par département pour les managers
- ✅ Créer une vue "Mes anomalies à traiter" pour les managers

### 2. **Priorité Haute**

#### 2.1 Workflow de Correction
- ✅ Ajouter validation avant correction
- ✅ Implémenter re-détection après correction
- ✅ Ajouter notifications à l'employé
- ✅ Créer un workflow d'approbation pour les corrections importantes

#### 2.2 Calculs et Métriques
- ✅ Implémenter le calcul des heures travaillées
- ✅ Implémenter le calcul des minutes de retard
- ✅ Implémenter le calcul des minutes de départ anticipé
- ✅ Implémenter le calcul des minutes d'heures sup

#### 2.3 Intégration avec Autres Modules
- ✅ Intégrer avec le module Planning pour la détection des retards
- ✅ Intégrer avec le module Congés pour valider les absences
- ✅ Intégrer avec le module Missions pour le contexte

### 3. **Priorité Moyenne**

#### 3.1 Statistiques Avancées
- ✅ Calculer le taux de présence par employé
- ✅ Calculer le taux de ponctualité
- ✅ Créer des graphiques de tendances

#### 3.2 Notifications
- ✅ Notifier les managers lors de nouvelles anomalies
- ✅ Notifier les employés lors de corrections
- ✅ Créer des alertes pour les anomalies récurrentes

#### 3.3 Validation et Règles Métier
- ✅ Implémenter les tolérances (ex: 5 minutes de retard acceptées)
- ✅ Gérer les exceptions (congés, missions, etc.)
- ✅ Créer un historique des corrections

### 4. **Priorité Basse**

#### 4.1 Fonctionnalités Avancées
- ✅ Correction groupée de plusieurs anomalies
- ✅ Export des anomalies
- ✅ Rapports d'anomalies par période
- ✅ Dashboard de synthèse des anomalies

#### 4.2 Améliorations UX
- ✅ Tri par priorité des anomalies
- ✅ Regroupement des anomalies liées
- ✅ Prévisualisation de l'impact des corrections
- ✅ Suggestions automatiques de corrections

### 5. **Configuration et Paramétrage**

#### 5.1 Configuration du Pointage des Repos
- ✅ Ajouter un paramètre `requireBreakPunch` dans `TenantSettings`
- ✅ Créer une interface de configuration dans les paramètres du tenant
- ✅ Implémenter la validation côté backend pour rejeter/accepter les pointages BREAK_START/BREAK_END selon la configuration
- ✅ Adapter la détection d'anomalies pour tenir compte de cette configuration
- ✅ Mettre à jour les terminaux pour respecter cette configuration
- ✅ Adapter les calculs d'heures travaillées selon la configuration

---

## 📊 Résumé Exécutif

### Points Forts
- ✅ Interface utilisateur claire et intuitive
- ✅ Détection automatique basique fonctionnelle
- ✅ Système de correction avec traçabilité
- ✅ Gestion des permissions et RBAC
- ✅ Intégration avec terminaux biométriques

### Points Faibles Critiques
- ❌ Détection d'anomalies très limitée (seulement 2 types)
- ❌ Pas d'interface dédiée pour le traitement des anomalies
- ❌ Pas de workflow structuré pour les managers
- ❌ Pas d'intégration avec Planning, Congés, Missions
- ❌ Calculs métier manquants (heures travaillées, retards, etc.)
- ❌ Pas de configuration pour activer/désactiver le pointage des repos (pauses)

### Impact Business
- **Critique** : Détection incomplète et interface de traitement manquante (bloque l'utilisation complète)
- **Important** : Intégration avec autres modules, calculs métier, configuration pointage repos (améliore la précision et la flexibilité)
- **Souhaitable** : Statistiques avancées, notifications (améliore l'expérience)

---

## 🎯 Conclusion

L'interface `/attendance` dispose d'une base solide avec une interface utilisateur bien conçue et une intégration fonctionnelle avec les terminaux biométriques. Cependant, le système de détection d'anomalies est très limité (seulement 2 types sur au moins 6 nécessaires), et il manque complètement une interface dédiée pour permettre aux managers de département de traiter efficacement les anomalies.

La logique de correction existe au niveau backend mais n'est pas accessible depuis l'interface utilisateur, ce qui rend le système inutilisable pour les managers qui doivent traiter les anomalies quotidiennement.

**Recommandation principale** : Prioriser l'implémentation d'une interface dédiée au traitement des anomalies et l'amélioration de la détection pour inclure au minimum les retards, sorties manquantes, et absences. L'intégration avec le module Planning est essentielle pour une détection précise des anomalies.

**Recommandation secondaire** : Ajouter la configuration pour activer/désactiver le pointage des repos (pauses) afin de permettre aux entreprises de choisir si elles nécessitent le pointage des pauses ou non. Cette fonctionnalité améliore la flexibilité du système et s'adapte aux différents besoins métier selon les secteurs d'activité.

---

## 📋 Annexes

### Annexe A : Types d'Anomalies à Détecter

| Type | Description | Priorité | Complexité |
|------|-------------|----------|------------|
| DOUBLE_IN | Double pointage d'entrée | ✅ Implémenté | Faible |
| MISSING_IN | Sortie sans entrée | ✅ Implémenté | Faible |
| MISSING_OUT | Entrée sans sortie | 🔴 Critique | Moyenne |
| LATE | Retard à l'entrée | 🔴 Critique | Moyenne |
| EARLY_LEAVE | Départ anticipé | 🟠 Important | Moyenne |
| ABSENCE | Absence non justifiée | 🔴 Critique | Élevée |
| INSUFFICIENT_REST | Repos insuffisant | 🟠 Important | Élevée |
| UNREPORTED_OVERTIME | Heures sup non déclarées | 🟡 Souhaitable | Élevée |

### Annexe B : Workflow Recommandé pour le Traitement des Anomalies

```
1. Détection automatique → Anomalie créée
2. Notification manager → Alerte dans l'interface
3. Manager examine → Vue dédiée / Filtre anomalies
4. Manager corrige → Modal de correction avec validation
5. Re-détection → Vérification que la correction résout l'anomalie
6. Notification employé → Information de la correction
7. Historique → Traçabilité complète
```

### Annexe C : Permissions Requises

| Action | Permission Actuelle | Permission Recommandée |
|--------|-------------------|----------------------|
| Voir anomalies | `attendance.view_all` | `attendance.view_anomalies` |
| Corriger | `attendance.correct` | ✅ Correct |
| Voir anomalies département | ❌ Non disponible | `attendance.view_department_anomalies` |
| Approuver correction | ❌ Non disponible | `attendance.approve_correction` |

### Annexe D : Configuration du Pointage des Repos

#### D.1 Paramètre Requis

**Dans `TenantSettings` :**
```prisma
requireBreakPunch Boolean @default(false) // Activer/désactiver le pointage des repos
```

#### D.2 Comportement selon la Configuration

| Configuration | Comportement |
|---------------|--------------|
| `requireBreakPunch = true` | Les pointages BREAK_START et BREAK_END sont acceptés et traités normalement. Les anomalies de pause sont détectées. |
| `requireBreakPunch = false` | Les pointages BREAK_START et BREAK_END sont rejetés ou ignorés. Les terminaux ne proposent pas cette option. |

#### D.3 Impact sur les Modules

| Module | Impact si Activé | Impact si Désactivé |
|--------|------------------|---------------------|
| **Détection d'anomalies** | Détecte les anomalies de pause (pause trop longue, pause non pointée, etc.) | Ignore les pointages de pause, ne détecte pas d'anomalies liées |
| **Calculs d'heures** | Soustrait les heures de pause des heures travaillées | Calcule uniquement entre IN et OUT |
| **Terminaux biométriques** | Proposent les options BREAK_START et BREAK_END | N'affichent que IN et OUT |
| **Statistiques** | Inclut les statistiques de pause | N'inclut pas les pauses |
| **Export** | Exporte les pointages de pause | N'exporte pas les pointages de pause |

#### D.4 Cas d'Usage Métier

**Entreprise A (Pointage repos activé) :**
- Secteur : Industrie, Production
- Besoin : Traçabilité complète des heures, y compris les pauses
- Configuration : `requireBreakPunch = true`
- Résultat : Les employés pointent entrée, début pause, fin pause, sortie

**Entreprise B (Pointage repos désactivé) :**
- Secteur : Bureautique, Services
- Besoin : Simplicité, pointage uniquement entrée/sortie
- Configuration : `requireBreakPunch = false`
- Résultat : Les employés pointent uniquement entrée et sortie, les pauses sont gérées automatiquement

#### D.5 Recommandations d'Implémentation

1. **Backend** :
   - Ajouter `requireBreakPunch` dans `TenantSettings`
   - Modifier `create` et `handleWebhook` pour valider selon la configuration
   - Adapter `detectAnomalies` pour tenir compte de la configuration
   - Modifier les calculs d'heures travaillées

2. **Frontend** :
   - Ajouter un toggle dans les paramètres du tenant
   - Adapter l'affichage pour masquer/afficher les colonnes de pause
   - Filtrer les pointages de pause dans les exports si désactivé

3. **Terminaux** :
   - Envoyer la configuration aux terminaux lors de la synchronisation
   - Adapter l'interface des terminaux selon la configuration
   - Rejeter les pointages de pause si désactivé

