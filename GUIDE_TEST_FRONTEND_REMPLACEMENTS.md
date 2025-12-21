# Guide de Test Frontend - Système de Remplacement d'Employés

## 📋 Table des Matières

1. [Vue d'Ensemble](#vue-densemble)
2. [Prérequis](#prérequis)
3. [Écrans et Interfaces](#écrans-et-interfaces)
4. [Scénarios de Test Détaillés](#scénarios-de-test-détaillés)
5. [Tests des Avertissements Visuels](#tests-des-avertissements-visuels)
6. [Checklist Complète](#checklist-complète)

---

## 🎯 Vue d'Ensemble

Ce guide couvre les tests des interfaces utilisateur pour le système de remplacement d'employés. Les fonctionnalités incluent :
- **Création de demandes de remplacement** via une interface graphique
- **Visualisation des suggestions** de remplaçants avec scoring
- **Approbation/Rejet** des remplacements en attente
- **Historique et statistiques** des remplacements
- **Échange de plannings** entre deux employés
- **Affichage des avertissements** (non-bloquants)

---

## 🔧 Prérequis

### Données Nécessaires

Avant de commencer les tests, assurez-vous d'avoir :

1. **Au moins 3 employés actifs** :
   - Employé A : Avec un planning existant
   - Employé B : Disponible pour remplacer
   - Employé C : Pour tester les suggestions

2. **Au moins 2 shifts créés** :
   - Shift Matin (08:00 - 16:00)
   - Shift Soir (14:00 - 22:00)

3. **Au moins 1 planning existant** pour l'employé A

4. **Permissions appropriées** :
   - Connexion en tant que Manager ou RH Admin
   - Permissions : `schedule.view_all`, `schedule.create`, `schedule.approve`

---

## 🖥️ Écrans et Interfaces

### 1. Page "Plannings" (Shifts Planning)

**Localisation** : `/shifts-planning` ou `/schedules`

**Fonctionnalités Attendues** :
- Vue calendrier/semaine/mois des plannings
- Bouton/icône pour créer un remplacement sur un planning
- Indicateurs visuels pour les plannings remplacés
- Liste des remplacements en attente

---

### 2. Modal "Créer un Remplacement"

**Déclenchement** : 
- Clic sur un planning existant → "Remplacer"
- Menu contextuel sur un planning → "Demander un remplacement"

**Champs du Formulaire** :
- **Date** : (Pré-remplie, non modifiable) Date du planning à remplacer
- **Employé Original** : (Pré-rempli, non modifiable) Employé qui sera remplacé
- **Shift** : (Pré-rempli, non modifiable) Shift du planning original
- **Employé Remplaçant** : (Select recherche) Sélection de l'employé remplaçant
- **Raison** : (Textarea optionnel) Motif du remplacement
- **Lier à un congé** : (Select optionnel) Si le remplacement est lié à un congé

**Boutons** :
- "Voir les suggestions" : Ouvre la liste des suggestions
- "Créer la demande" : Crée la demande de remplacement
- "Annuler" : Ferme la modal

---

### 3. Modal "Suggestions de Remplaçants"

**Déclenchement** :
- Clic sur "Voir les suggestions" dans la modal de création
- Bouton dédié dans la page des remplacements

**Affichage** :
- Liste des candidats triés par score (décroissant)
- Pour chaque candidat :
  - Nom complet + Matricule
  - Score (badge coloré)
  - Raisons positives (puces)
  - Avertissements éventuels (badges jaunes/rouges)
  - Bouton "Sélectionner"

**Informations Visuelles** :
- Score affiché avec badge coloré (vert > 70, jaune 40-70, orange < 40)
- Icônes pour les raisons (✓ Même équipe, ✓ Même site, etc.)
- Badges d'avertissement (⚠️ Repos insuffisant, ⚠️ Heures dépassées)

---

### 4. Page "Remplacements" ou Section dans Plannings

**Localisation** : Section dédiée dans `/shifts-planning` ou page `/replacements`

**Vue Liste** :
- Tableau avec colonnes :
  - Date
  - Employé Original
  - Employé Remplaçant
  - Shift
  - Statut (Badge : PENDING/APPROVED/REJECTED)
  - Raison
  - Date de création
  - Actions (Approuver/Rejeter/Voir détails)

**Filtres** :
- Statut (Tous, En attente, Approuvés, Rejetés)
- Période (Date début, Date fin)
- Employé (Select recherche)

**Actions** :
- Bouton "Créer un remplacement"
- Bouton "Créer un échange"
- Export (optionnel)

---

### 5. Modal "Créer un Échange"

**Déclenchement** :
- Bouton "Échanger des plannings" dans la page des remplacements
- Menu contextuel sur deux plannings sélectionnés

**Champs du Formulaire** :
- **Date** : Date de l'échange
- **Employé A** : (Select recherche) Premier employé
- **Employé B** : (Select recherche) Deuxième employé
- **Raison** : (Textarea optionnel) Motif de l'échange

**Boutons** :
- "Créer la demande" : Crée la demande d'échange
- "Annuler" : Ferme la modal

---

### 6. Modal "Détails du Remplacement"

**Déclenchement** :
- Clic sur "Voir détails" dans la liste
- Clic sur un remplacement dans le calendrier

**Affichage** :
- Informations complètes du remplacement
- Planning original (carte)
- Planning remplaçant (si approuvé) (carte)
- Statut et dates d'approbation/rejet
- Historique des actions (optionnel)
- Boutons d'action (selon statut) :
  - Si PENDING : Approuver / Rejeter
  - Si APPROVED : Voir le planning créé
  - Si REJECTED : Réactiver (optionnel)

---

### 7. Page "Statistiques des Remplacements"

**Localisation** : Section dans la page Remplacements ou page dédiée

**Affichage** :
- Graphiques (si disponibles) :
  - Répartition par statut (Camembert)
  - Répartition par raison (Barres)
  - Évolution dans le temps (Courbe)
- Tableaux :
  - Top 10 des remplaçants
  - Top 10 des employés remplacés
- Filtres par période

---

## 🧪 Scénarios de Test Détaillés

### Scénario 1 : Créer un Remplacement (Flux Complet)

#### **Étape 1.1 : Accéder à la Modal de Création**

**Actions** :
1. Aller sur la page `/shifts-planning`
2. Sélectionner une semaine/mois contenant des plannings
3. Identifier un planning existant (ex: Employé A, 15/02/2025, Shift Matin)
4. Cliquer sur le planning (ou menu contextuel)
5. Cliquer sur "Remplacer" ou "Demander un remplacement"

**Résultat Attendu** :
- ✅ La modal "Créer un remplacement" s'ouvre
- ✅ Les champs "Date", "Employé Original", et "Shift" sont pré-remplis et non modifiables
- ✅ Le champ "Employé Remplaçant" est vide avec un select recherche

**Capture d'écran attendue** :
```
┌─────────────────────────────────────┐
│  Créer un Remplacement         [X]  │
├─────────────────────────────────────┤
│  Date : 15/02/2025         (lock)   │
│  Employé Original : Jean Dupont     │
│                   (lock)            │
│  Shift : Matin (08:00-16:00)(lock) │
│                                     │
│  Employé Remplaçant : [Rechercher...] │
│                                     │
│  Raison : [___________________]     │
│                                     │
│  [Voir les suggestions]             │
│  [Créer la demande] [Annuler]       │
└─────────────────────────────────────┘
```

---

#### **Étape 1.2 : Rechercher et Sélectionner un Remplaçant**

**Actions** :
1. Cliquer dans le champ "Employé Remplaçant"
2. Commencer à taper un nom (ex: "Marie")
3. Sélectionner "Marie Martin" dans la liste déroulante

**Résultat Attendu** :
- ✅ Une liste d'employés actifs s'affiche lors de la recherche
- ✅ La sélection est validée et affichée dans le champ
- ✅ Le bouton "Créer la demande" devient actif

---

#### **Étape 1.3 : Ajouter une Raison (Optionnel)**

**Actions** :
1. Remplir le champ "Raison" avec : "Congé maladie"
2. (Optionnel) Sélectionner un congé lié si disponible

**Résultat Attendu** :
- ✅ Le texte est accepté dans le champ texte

---

#### **Étape 1.4 : Soumettre le Formulaire**

**Actions** :
1. Cliquer sur "Créer la demande"

**Résultat Attendu** :
- ✅ Une notification de succès s'affiche : "Demande de remplacement créée"
- ✅ La modal se ferme
- ✅ La liste des remplacements se rafraîchit automatiquement
- ✅ Le remplacement apparaît avec le statut "PENDING" (En attente)
- ✅ Le planning original reste visible (pas encore remplacé)

**Vérifications** :
- Dans la liste des remplacements :
  - Date : 15/02/2025
  - Original : Jean Dupont
  - Remplaçant : Marie Martin
  - Statut : 🟡 En attente
  - Actions : ✓ Approuver | ✗ Rejeter

---

### Scénario 2 : Utiliser les Suggestions de Remplaçants

#### **Étape 2.1 : Ouvrir les Suggestions**

**Actions** :
1. Ouvrir la modal "Créer un remplacement"
2. Cliquer sur "Voir les suggestions"

**Résultat Attendu** :
- ✅ Une modal "Suggestions de Remplaçants" s'ouvre
- ✅ Une liste de candidats s'affiche, triée par score décroissant
- ✅ Chaque candidat affiche :
  - Nom complet + Matricule
  - Score avec badge coloré
  - Liste des raisons positives
  - Liste des avertissements (si applicable)

**Capture d'écran attendue** :
```
┌─────────────────────────────────────────────┐
│  Suggestions de Remplaçants            [X]  │
├─────────────────────────────────────────────┤
│  ┌─────────────────────────────────────┐   │
│  │ Marie Martin (EMP002)               │   │
│  │ Score: [85] (vert)                  │   │
│  │                                     │   │
│  │ ✓ Même équipe                       │   │
│  │ ✓ Même site                         │   │
│  │ ✓ Habitué à ce shift                │   │
│  │ ✓ Repos suffisant                   │   │
│  │                                     │   │
│  │ [Sélectionner]                      │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ Pierre Durand (EMP003)              │   │
│  │ Score: [45] (jaune)                 │   │
│  │                                     │   │
│  │ ✓ Même site                         │   │
│  │                                     │   │
│  │ ⚠️ Repos insuffisant: 9h (min: 11h)│   │
│  │ ⚠️ Dépassement 44h/semaine: 46h     │   │
│  │                                     │   │
│  │ [Sélectionner]                      │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

---

#### **Étape 2.2 : Sélectionner un Candidat depuis les Suggestions**

**Actions** :
1. Examiner la liste des suggestions
2. Cliquer sur "Sélectionner" pour le candidat le mieux noté (ex: Marie Martin)

**Résultat Attendu** :
- ✅ La modal des suggestions se ferme
- ✅ La modal de création revient au premier plan
- ✅ Le champ "Employé Remplaçant" est pré-rempli avec "Marie Martin"
- ✅ Le score et les raisons sont affichés (optionnel, dans un tooltip ou info-bulle)

---

### Scénario 3 : Approuver un Remplacement

#### **Étape 3.1 : Accéder à la Liste des Remplacements**

**Actions** :
1. Aller sur la page des remplacements (ou section dans `/shifts-planning`)
2. Filtrer par statut "En attente" (PENDING)

**Résultat Attendu** :
- ✅ La liste affiche uniquement les remplacements en attente
- ✅ Pour chaque remplacement :
  - Les informations de base sont visibles
  - Les boutons "Approuver" et "Rejeter" sont disponibles

---

#### **Étape 3.2 : Consulter les Détails avant Approbation**

**Actions** :
1. Cliquer sur "Voir détails" pour un remplacement en attente

**Résultat Attendu** :
- ✅ La modal "Détails du remplacement" s'ouvre
- ✅ Les informations complètes sont affichées :
  - Planning original avec employé, date, shift
  - Employé remplaçant proposé
  - Raison du remplacement
  - Date de création de la demande
- ✅ Des avertissements éventuels sont affichés (si repos insuffisant, etc.)

---

#### **Étape 3.3 : Approuver le Remplacement**

**Actions** :
1. Dans la modal de détails, cliquer sur "Approuver"
2. Confirmer dans la boîte de dialogue de confirmation (si présente)

**Résultat Attendu** :
- ✅ Une notification de succès s'affiche : "Remplacement approuvé"
- ✅ La modal se ferme
- ✅ La liste se rafraîchit
- ✅ Le statut du remplacement passe à "APPROVED" (Approuvé) avec badge vert
- ✅ Dans la vue planning :
  - Le planning original de l'employé A est grisé/barré (soft delete visuel)
  - Un nouveau planning apparaît pour l'employé B (remplaçant)
  - Un indicateur visuel montre le lien entre les deux plannings

**Vérifications Visuelles** :
- Badge de statut : 🟢 Approuvé
- Date d'approbation affichée
- Planning original : Style "remplacé" (grisé, icône de remplacement)
- Planning remplaçant : Style normal avec badge "Remplaçant"

---

### Scénario 4 : Rejeter un Remplacement

#### **Étape 4.1 : Rejeter depuis la Liste**

**Actions** :
1. Dans la liste des remplacements en attente
2. Cliquer sur "Rejeter" pour un remplacement
3. Confirmer dans la boîte de dialogue (si présente)

**Résultat Attendu** :
- ✅ Une notification s'affiche : "Remplacement rejeté"
- ✅ Le statut passe à "REJECTED" (Rejeté) avec badge rouge
- ✅ Le planning original reste inchangé (pas de soft delete)
- ✅ Aucun nouveau planning n'est créé

**Vérifications** :
- Badge de statut : 🔴 Rejeté
- Date de rejet affichée
- Planning original : Reste normal (pas de modification visuelle)

---

### Scénario 5 : Créer un Échange de Plannings

#### **Étape 5.1 : Ouvrir la Modal d'Échange**

**Actions** :
1. Aller sur la page des remplacements
2. Cliquer sur "Créer un échange" ou "Échanger des plannings"

**Résultat Attendu** :
- ✅ La modal "Créer un échange" s'ouvre avec le formulaire

---

#### **Étape 5.2 : Remplir le Formulaire d'Échange**

**Actions** :
1. Sélectionner une date : 15/02/2025
2. Sélectionner Employé A : Jean Dupont
3. Sélectionner Employé B : Marie Martin
4. Ajouter une raison : "Échange pour convenance personnelle"
5. Cliquer sur "Créer la demande"

**Résultat Attendu** :
- ✅ La validation vérifie que les deux employés ont des plannings à cette date
- ✅ Si validation OK : Notification "Demande d'échange créée"
- ✅ Si validation échoue : Message d'erreur approprié
- ✅ La modal se ferme
- ✅ La demande apparaît dans la liste avec le type "EXCHANGE"

---

#### **Étape 5.3 : Approuver l'Échange**

**Actions** :
1. Trouver l'échange dans la liste (statut PENDING, type EXCHANGE)
2. Cliquer sur "Approuver"

**Résultat Attendu** :
- ✅ Notification : "Échange approuvé"
- ✅ Dans la vue planning :
  - Le planning de Jean Dupont affiche maintenant le shift de Marie Martin
  - Le planning de Marie Martin affiche maintenant le shift de Jean Dupont
  - Des notes indiquent "Échangé avec [Nom]" sur les deux plannings

---

### Scénario 6 : Gérer les Erreurs et Validations

#### **Test 6.1 : Erreur - Planning Même Jour (Bloque)**

**Actions** :
1. Essayer de créer un remplacement
2. Sélectionner un employé remplaçant qui a déjà un planning le même jour

**Résultat Attendu** :
- ❌ Message d'erreur s'affiche : "L'employé remplaçant a déjà un planning le 15/02/2025"
- ❌ Le formulaire ne peut pas être soumis
- ❌ Le champ "Employé Remplaçant" est mis en surbrillance (rouge)

---

#### **Test 6.2 : Erreur - Employé Original Inactif (Bloque)**

**Actions** :
1. Essayer de créer un remplacement pour un employé inactif

**Résultat Attendu** :
- ❌ Message d'erreur : "L'employé original est inactif"
- ❌ La création est bloquée

---

#### **Test 6.3 : Erreur - Planning Original Non Trouvé (Bloque)**

**Actions** :
1. Essayer de créer un remplacement pour une date sans planning

**Résultat Attendu** :
- ❌ Message d'erreur : "Le planning original n'existe pas pour cette date"
- ❌ La création est bloquée

---

### Scénario 7 : Consulter l'Historique et les Statistiques

#### **Étape 7.1 : Accéder à l'Historique**

**Actions** :
1. Aller sur la page des remplacements
2. Cliquer sur "Historique" ou onglet "Historique"
3. Sélectionner une période (ex: Janvier 2025 - Février 2025)
4. Filtrer par employé si nécessaire

**Résultat Attendu** :
- ✅ Une liste chronologique des remplacements s'affiche
- ✅ Les remplacements sont triés par date (plus récent en premier)
- ✅ Pour chaque remplacement :
  - Date, employés, statut, raison
  - Lien vers les détails complets

---

#### **Étape 7.2 : Consulter les Statistiques**

**Actions** :
1. Aller sur la section "Statistiques" ou "Statistiques des Remplacements"
2. Sélectionner une période

**Résultat Attendu** :
- ✅ Des graphiques s'affichent (si disponibles) :
  - Répartition par statut (camembert)
  - Répartition par raison (barres)
- ✅ Des tableaux s'affichent :
  - Top 10 des remplaçants (avec nombre de remplacements)
  - Top 10 des employés remplacés (avec nombre de fois)

---

## ⚠️ Tests des Avertissements Visuels

### Test Avertissement 1 : Repos Insuffisant

**Prérequis** :
- Employé B a un planning le 14/02 qui finit à 23:00
- Créer un remplacement pour le 15/02 avec shift qui commence à 08:00

**Actions** :
1. Créer le remplacement avec ces données
2. Observer les avertissements affichés

**Résultat Attendu** :
- ✅ Le remplacement **EST CRÉÉ** (ne bloque pas)
- ⚠️ Un badge/alerte jaune s'affiche dans la modal de création : "⚠️ Période de repos insuffisante : 9h (minimum recommandé : 11h)"
- ⚠️ Dans la liste des suggestions, le candidat a un score réduit et des badges d'avertissement
- ⚠️ L'approbation reste possible (avertissement seulement)

**Affichage Visuel Attendu** :
```
┌─────────────────────────────────────┐
│  ⚠️ Avertissements                  │
│  • Repos insuffisant : 9h           │
│    (minimum recommandé : 11h)       │
│                                     │
│  ⚠️ Cette situation peut ne pas     │
│  respecter les règles légales de    │
│  repos, mais l'opération peut       │
│  continuer.                         │
│                                     │
│  [Créer quand même] [Annuler]       │
└─────────────────────────────────────┘
```

---

### Test Avertissement 2 : Heures Hebdomadaires Dépassées

**Prérequis** :
- Employé B a déjà plusieurs plannings dans la semaine (total > 44h)
- Créer un remplacement qui ajoute encore des heures

**Actions** :
1. Créer le remplacement
2. Observer les avertissements

**Résultat Attendu** :
- ✅ Le remplacement **EST CRÉÉ** (ne bloque pas)
- ⚠️ Badge d'avertissement : "⚠️ Dépassement des 44h/semaine : 46h (limite légale : 44h)"
- ⚠️ L'avertissement est visible dans la modal et dans les détails

---

### Test Avertissement 3 : Jours Consécutifs >= 6

**Prérequis** :
- Employé B a 5 jours consécutifs de travail
- Créer un remplacement qui ajoute un 6ème jour

**Actions** :
1. Créer le remplacement
2. Observer les avertissements

**Résultat Attendu** :
- ✅ Le remplacement **EST CRÉÉ** (ne bloque pas)
- ⚠️ Badge d'avertissement : "6 jours consécutifs de travail (recommandation : repos hebdomadaire)"

---

### Test Avertissement 4 : Shifts de Nuit Consécutifs >= 3

**Prérequis** :
- Employé B a 2 shifts de nuit consécutifs
- Créer un remplacement avec un 3ème shift de nuit

**Actions** :
1. Créer le remplacement
2. Observer les avertissements

**Résultat Attendu** :
- ✅ Le remplacement **EST CRÉÉ** (ne bloque pas)
- ⚠️ Badge d'avertissement : "3+ shifts de nuit consécutifs (recommandation médicale : maximum 3)"

---

## ✅ Checklist Complète

### Fonctionnalités de Base

#### Création de Remplacement
- [ ] Accéder à la modal de création depuis un planning
- [ ] Les champs sont pré-remplis correctement
- [ ] Recherche d'employé remplaçant fonctionne
- [ ] Sélection d'un remplaçant depuis la liste
- [ ] Ajout d'une raison (optionnel)
- [ ] Lien avec un congé (optionnel)
- [ ] Soumission du formulaire réussie
- [ ] Notification de succès affichée
- [ ] Le remplacement apparaît dans la liste avec statut PENDING

#### Suggestions de Remplaçants
- [ ] Bouton "Voir les suggestions" accessible
- [ ] La modal des suggestions s'ouvre
- [ ] Liste des candidats affichée et triée par score
- [ ] Scores affichés avec badges colorés
- [ ] Raisons positives affichées (✓)
- [ ] Avertissements affichés (⚠️)
- [ ] Sélection d'un candidat depuis les suggestions
- [ ] Le candidat est pré-rempli dans le formulaire

#### Approbation
- [ ] Liste des remplacements en attente accessible
- [ ] Détails d'un remplacement consultables
- [ ] Bouton "Approuver" fonctionnel
- [ ] Confirmation (si présente) fonctionnelle
- [ ] Notification de succès affichée
- [ ] Statut mis à jour à APPROVED
- [ ] Planning original marqué comme remplacé visuellement
- [ ] Nouveau planning créé pour le remplaçant
- [ ] Indicateur visuel du lien entre les plannings

#### Rejet
- [ ] Bouton "Rejeter" fonctionnel
- [ ] Confirmation (si présente) fonctionnelle
- [ ] Notification de succès affichée
- [ ] Statut mis à jour à REJECTED
- [ ] Planning original reste inchangé
- [ ] Aucun nouveau planning créé

#### Échange
- [ ] Modal de création d'échange accessible
- [ ] Formulaire d'échange fonctionnel
- [ ] Validation des deux plannings existants
- [ ] Création de la demande réussie
- [ ] Approbation de l'échange fonctionnelle
- [ ] Les shifts sont échangés visuellement

### Validations et Erreurs

- [ ] Erreur : Planning même jour (bloque) - Message affiché
- [ ] Erreur : Employé inactif (bloque) - Message affiché
- [ ] Erreur : Planning original non trouvé (bloque) - Message affiché
- [ ] Erreur : Remplacement déjà approuvé (bloque) - Message affiché
- [ ] Validation des champs obligatoires fonctionne

### Avertissements Non-Bloquants

- [ ] Repos insuffisant (< 11h) - Averti mais ne bloque pas
- [ ] Heures hebdomadaires > 44h - Averti mais ne bloque pas
- [ ] Heures hebdomadaires > 40h - Averti mais ne bloque pas
- [ ] Jours consécutifs >= 6 - Averti mais ne bloque pas
- [ ] Shifts de nuit >= 3 - Averti mais ne bloque pas
- [ ] Les avertissements sont visuellement distincts des erreurs
- [ ] Les avertissements permettent de continuer l'opération

### Interface et UX

- [ ] Design cohérent avec le reste de l'application
- [ ] Messages d'erreur clairs et compréhensibles
- [ ] Messages de succès informatifs
- [ ] Badges de statut avec couleurs appropriées :
  - 🟡 PENDING (jaune/orange)
  - 🟢 APPROVED (vert)
  - 🔴 REJECTED (rouge)
- [ ] Icônes appropriées (⚠️ pour avertissements, ✓ pour succès, etc.)
- [ ] Responsive design (si applicable)
- [ ] Accessibilité (navigation clavier, ARIA labels)

### Historique et Statistiques

- [ ] Accès à l'historique fonctionnel
- [ ] Filtres par période fonctionnels
- [ ] Filtres par employé fonctionnels
- [ ] Filtres par statut fonctionnels
- [ ] Statistiques affichées correctement
- [ ] Graphiques affichés (si disponibles)
- [ ] Tableaux des tops remplaçants/remplacés affichés

### Intégration avec Autres Modules

- [ ] Lien avec les congés (leaveId) fonctionnel
- [ ] Affichage correct dans la vue planning
- [ ] Synchronisation avec les plannings
- [ ] Notifications envoyées (vérifier côté backend)

---

## 📸 Points de Vérification Visuels

### Badges de Statut
- **PENDING** : Badge jaune/orange avec texte "En attente"
- **APPROVED** : Badge vert avec texte "Approuvé" + date d'approbation
- **REJECTED** : Badge rouge avec texte "Rejeté" + date de rejet

### Indicateurs Visuels dans le Planning
- **Planning remplacé** : 
  - Style grisé/barré
  - Icône de remplacement (ex: 🔄)
  - Tooltip au survol : "Remplacé par [Nom] le [Date]"
- **Planning remplaçant** :
  - Style normal avec badge "Remplaçant"
  - Tooltip au survol : "Remplace [Nom] le [Date]"

### Avertissements
- **Style** : Badge/alerte jaune avec icône ⚠️
- **Emplacement** : Modal de création, suggestions, détails
- **Message** : Clair, avec valeurs concrètes et recommandations

---

## 🔍 Cas de Test Avancés

### Test 1 : Remplacement avec Congé Lié

**Actions** :
1. Créer un congé pour un employé
2. Créer un remplacement en liant ce congé
3. Vérifier dans les détails que le lien est affiché

**Résultat Attendu** :
- ✅ Le congé est sélectionnable dans le formulaire
- ✅ Dans les détails, un lien vers le congé est affiché
- ✅ Les informations du congé sont accessibles

---

### Test 2 : Suggestions avec Filtres

**Actions** :
1. Ouvrir les suggestions
2. Appliquer des filtres (équipe, site, département)
3. Vérifier que la liste est filtrée

**Résultat Attendu** :
- ✅ Les filtres réduisent la liste des suggestions
- ✅ Les scores sont recalculés en fonction des filtres

---

### Test 3 : Bulk Actions (si disponible)

**Actions** :
1. Sélectionner plusieurs remplacements en attente
2. Approuver en masse

**Résultat Attendu** :
- ✅ Si disponible, les actions en masse fonctionnent
- ✅ Des notifications individuelles ou groupées sont affichées

---

## 📝 Notes Importantes

1. **Responsive Design** : Tester sur différentes tailles d'écran (desktop, tablette)
2. **Performance** : Vérifier que les listes longues sont paginées ou virtualisées
3. **Accessibilité** : Tester la navigation au clavier et les lecteurs d'écran
4. **Internationalisation** : Vérifier que les dates et messages sont dans la langue correcte
5. **Concurrence** : Tester ce qui se passe si deux utilisateurs approuvent le même remplacement en même temps

---

## 🚨 Points d'Attention

1. **Ne jamais bloquer** pour les avertissements (repos, heures) - seulement avertir
2. **Toujours bloquer** pour les contraintes techniques (planning même jour)
3. **Feedback visuel immédiat** lors des actions (boutons disabled, loaders)
4. **Messages d'erreur clairs** avec explications et actions possibles
5. **Synchronisation** : Vérifier que les plannings se mettent à jour en temps réel après approbation

---

Ce guide couvre tous les aspects du système de remplacement côté frontend. Utilisez-le comme référence pour tester chaque fonctionnalité de manière systématique.
