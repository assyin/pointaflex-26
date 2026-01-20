# 📋 SCÉNARIO DE TEST - ÉTAPE 1.1 FRONTEND : Page Shifts Planning

**Date** : 22 novembre 2025  
**Version** : 1.0.0  
**Objectif** : Valider l'intégration frontend avec les données réelles de l'API

---

## 🔧 PRÉREQUIS

### 1. Préparation de l'environnement

```bash
# 1. Démarrer le backend (si pas déjà fait)
cd backend
npm run start:dev

# 2. Démarrer le frontend
cd frontend
npm install  # Si nécessaire
npm run dev

# 3. Vérifier que les deux serveurs sont accessibles
# Backend : http://localhost:3000
# Frontend : http://localhost:3001 (ou port configuré)
```

### 2. Données de test nécessaires

Assurez-vous d'avoir dans votre base de données :

- ✅ **Au moins 2-3 Employees** (employés)
- ✅ **Au moins 2-3 Shifts** (Matin, Soir, Nuit)
- ✅ **Au moins 1 Team** (équipe) - optionnel
- ✅ **Au moins 1 Site** (site) - optionnel
- ✅ **Quelques Schedules** (plannings) pour la semaine en cours
- ✅ **Compte utilisateur** avec token JWT valide

### 3. Créer des données de test

Si vous n'avez pas encore de données, créez-en via l'interface ou directement en base :

```sql
-- Exemple : Créer un planning pour la semaine
-- Remplacez les UUIDs par vos vrais IDs
INSERT INTO "Schedule" (id, "tenantId", "employeeId", "shiftId", date, "createdAt", "updatedAt")
VALUES 
  (gen_random_uuid(), 'YOUR_TENANT_ID', 'EMPLOYEE_UUID_1', 'SHIFT_UUID_1', '2025-01-20', NOW(), NOW()),
  (gen_random_uuid(), 'YOUR_TENANT_ID', 'EMPLOYEE_UUID_1', 'SHIFT_UUID_1', '2025-01-21', NOW(), NOW()),
  (gen_random_uuid(), 'YOUR_TENANT_ID', 'EMPLOYEE_UUID_2', 'SHIFT_UUID_2', '2025-01-20', NOW(), NOW());
```

---

## 📝 SCÉNARIOS DE TEST

### TEST 1 : Affichage du planning hebdomadaire

**Objectif** : Vérifier que le planning s'affiche correctement avec les données réelles

#### Étape 1.1 : Accéder à la page

1. Ouvrir le navigateur
2. Se connecter à l'application
3. Naviguer vers `/shifts-planning`

#### Étape 1.2 : Vérifier l'affichage

**Résultat attendu** :
- ✅ La page se charge sans erreur
- ✅ Le tableau de planning s'affiche
- ✅ Les en-têtes de colonnes montrent les jours de la semaine (Lun, Mar, Mer, etc.)
- ✅ Les employés sont listés dans la première colonne
- ✅ Les shifts sont affichés dans les cellules correspondantes

#### Étape 1.3 : Vérifier les données

**Résultat attendu** :
- ✅ Les noms des employés sont corrects
- ✅ Les informations employé (département, shift, site) s'affichent
- ✅ Les heures de début et fin des shifts sont affichées
- ✅ Les types de shifts (matin/soir/nuit) ont les bonnes couleurs

#### ✅ Critères de validation

- [ ] Page se charge sans erreur console
- [ ] Planning affiche les données de la semaine en cours
- [ ] Les shifts sont correctement positionnés par jour
- [ ] Les couleurs des badges correspondent aux types de shifts

---

### TEST 2 : Filtres et recherche

**Objectif** : Vérifier que les filtres fonctionnent correctement

#### Étape 2.1 : Test du filtre par date

1. Cliquer sur le champ "Date"
2. Sélectionner une date différente (ex: semaine suivante)
3. Observer le changement du planning

**Résultat attendu** :
- ✅ Le planning se met à jour avec la nouvelle semaine
- ✅ Les en-têtes de colonnes changent pour refléter la nouvelle semaine
- ✅ Les données affichées correspondent à la semaine sélectionnée

#### Étape 2.2 : Test du filtre par équipe

1. Sélectionner une équipe dans le dropdown "Équipe"
2. Observer le changement du planning

**Résultat attendu** :
- ✅ Seuls les employés de l'équipe sélectionnée sont affichés
- ✅ Le planning se met à jour automatiquement

#### Étape 2.3 : Test de la recherche

1. Saisir un nom d'employé dans le champ de recherche
2. Observer les résultats filtrés

**Résultat attendu** :
- ✅ Seuls les employés correspondant à la recherche sont affichés
- ✅ La recherche fonctionne en temps réel
- ✅ La recherche est insensible à la casse

#### ✅ Critères de validation

- [ ] Filtre par date fonctionne
- [ ] Filtre par équipe fonctionne
- [ ] Recherche par nom fonctionne
- [ ] Les filtres peuvent être combinés

---

### TEST 3 : Affichage des alertes légales

**Objectif** : Vérifier que les alertes légales s'affichent correctement

#### Étape 3.1 : Créer des données qui génèrent des alertes

**Important** : Pour que les alertes apparaissent, il faut créer des plannings qui violent les règles :

1. **Heures hebdomadaires > 44h** :
   - Créer plusieurs shifts pour le même employé dans la même semaine
   - Totaliser plus de 44h

2. **Repos < 11h** :
   - Créer deux shifts consécutifs pour le même employé
   - Avec moins de 11h entre la fin du premier et le début du second

#### Étape 3.2 : Vérifier l'affichage des alertes

**Résultat attendu** :
- ✅ Les alertes s'affichent en haut de la page
- ✅ Les alertes critiques sont en rouge
- ✅ Les alertes d'avertissement sont en jaune
- ✅ Chaque alerte affiche le message et l'employé concerné

#### Étape 3.3 : Test de la fonctionnalité "Ignorer"

1. Cliquer sur le bouton "X" d'une alerte
2. Observer que l'alerte disparaît

**Résultat attendu** :
- ✅ L'alerte disparaît de l'affichage
- ✅ L'alerte reste ignorée lors du rechargement de la page (si stockée)

#### ✅ Critères de validation

- [ ] Les alertes s'affichent correctement
- [ ] Les types d'alertes (CRITICAL/WARNING) sont différenciés visuellement
- [ ] Le bouton "Ignorer" fonctionne
- [ ] Les alertes sont mises à jour automatiquement

---

### TEST 4 : Affichage des remplacements

**Objectif** : Vérifier que les remplacements s'affichent correctement

#### Étape 4.1 : Vérifier l'onglet "En attente"

1. Cliquer sur l'onglet "En attente"
2. Observer la liste des remplacements

**Résultat attendu** :
- ✅ Seuls les remplacements avec statut "PENDING" sont affichés
- ✅ Chaque remplacement affiche :
  - Les noms des deux employés
  - La date du remplacement
  - Le shift concerné
  - La raison (si fournie)
  - Le statut avec badge

#### Étape 4.2 : Vérifier l'onglet "Historique"

1. Cliquer sur l'onglet "Historique"
2. Observer la liste des remplacements

**Résultat attendu** :
- ✅ Tous les remplacements (approuvés/rejetés) sont affichés
- ✅ Les remplacements sont triés par date décroissante

#### Étape 4.3 : Test de l'approbation

1. Trouver un remplacement avec statut "PENDING"
2. Cliquer sur le bouton "Valider"
3. Observer le changement de statut

**Résultat attendu** :
- ✅ Le remplacement passe au statut "APPROVED"
- ✅ Un message de succès s'affiche
- ✅ Le remplacement disparaît de l'onglet "En attente"
- ✅ Le remplacement apparaît dans l'onglet "Historique"

#### Étape 4.4 : Test du rejet

1. Trouver un remplacement avec statut "PENDING"
2. Cliquer sur le bouton "Rejeter"
3. Observer le changement de statut

**Résultat attendu** :
- ✅ Le remplacement passe au statut "REJECTED"
- ✅ Un message de succès s'affiche
- ✅ Le remplacement disparaît de l'onglet "En attente"
- ✅ Le remplacement apparaît dans l'onglet "Historique"

#### ✅ Critères de validation

- [ ] Les remplacements s'affichent correctement
- [ ] Les onglets "En attente" et "Historique" fonctionnent
- [ ] L'approbation fonctionne
- [ ] Le rejet fonctionne
- [ ] Les badges de statut sont corrects

---

### TEST 5 : Création d'un nouveau shift

**Objectif** : Vérifier que la création d'un shift fonctionne

#### Étape 5.1 : Ouvrir le formulaire

1. Cliquer sur le bouton "Nouveau shift"
2. Vérifier que le panneau de formulaire s'affiche à droite

**Résultat attendu** :
- ✅ Le panneau de formulaire s'affiche
- ✅ Tous les champs sont présents

#### Étape 5.2 : Remplir le formulaire

1. Remplir les champs :
   - **Employé** : ID d'un employé existant
   - **Shift** : Sélectionner un shift dans la liste
   - **Date** : Sélectionner une date
   - **Heure début** (optionnel) : Ex: 08:00
   - **Heure fin** (optionnel) : Ex: 16:00
   - **Équipe** (optionnel) : Sélectionner une équipe
   - **Notes** (optionnel) : Ajouter des notes

2. Cliquer sur "Enregistrer"

**Résultat attendu** :
- ✅ Un message de succès s'affiche
- ✅ Le planning se met à jour automatiquement
- ✅ Le nouveau shift apparaît dans le tableau
- ✅ Le formulaire se réinitialise

#### Étape 5.3 : Test de validation

1. Essayer de créer un shift sans remplir les champs obligatoires
2. Observer le comportement

**Résultat attendu** :
- ✅ Le bouton "Enregistrer" est désactivé si les champs obligatoires sont vides
- ✅ Un message d'erreur s'affiche si la création échoue

#### ✅ Critères de validation

- [ ] Le formulaire s'affiche correctement
- [ ] La création de shift fonctionne
- [ ] La validation des champs fonctionne
- [ ] Le planning se met à jour après création
- [ ] Les messages d'erreur/succès s'affichent

---

### TEST 6 : Gestion des états de chargement

**Objectif** : Vérifier que les états de chargement sont gérés correctement

#### Étape 6.1 : Test du chargement initial

1. Recharger la page
2. Observer l'affichage pendant le chargement

**Résultat attendu** :
- ✅ Un indicateur de chargement s'affiche (spinner)
- ✅ Le tableau n'affiche pas de données pendant le chargement
- ✅ Aucune erreur ne s'affiche

#### Étape 6.2 : Test du chargement lors du changement de filtre

1. Changer la date ou l'équipe
2. Observer l'affichage pendant le chargement

**Résultat attendu** :
- ✅ Un indicateur de chargement s'affiche
- ✅ Les données se mettent à jour une fois le chargement terminé

#### ✅ Critères de validation

- [ ] Les indicateurs de chargement s'affichent
- [ ] Aucune erreur pendant le chargement
- [ ] Les données s'affichent correctement après le chargement

---

### TEST 7 : Gestion des erreurs

**Objectif** : Vérifier que les erreurs sont gérées correctement

#### Étape 7.1 : Test avec backend arrêté

1. Arrêter le backend
2. Recharger la page
3. Observer l'affichage

**Résultat attendu** :
- ✅ Un message d'erreur s'affiche
- ✅ L'interface reste utilisable (pas de crash)
- ✅ L'erreur est claire et compréhensible

#### Étape 7.2 : Test avec données invalides

1. Essayer de créer un shift avec un ID d'employé invalide
2. Observer le comportement

**Résultat attendu** :
- ✅ Un message d'erreur s'affiche
- ✅ Le message indique clairement le problème
- ✅ Le formulaire reste accessible

#### ✅ Critères de validation

- [ ] Les erreurs sont affichées clairement
- [ ] L'application ne crash pas en cas d'erreur
- [ ] Les messages d'erreur sont compréhensibles

---

### TEST 8 : Responsive et accessibilité

**Objectif** : Vérifier que l'interface est responsive

#### Étape 8.1 : Test sur mobile

1. Ouvrir la page sur un appareil mobile ou réduire la fenêtre
2. Observer l'affichage

**Résultat attendu** :
- ✅ Le tableau est scrollable horizontalement
- ✅ Les éléments restent accessibles
- ✅ Le panneau de formulaire s'adapte

#### Étape 8.2 : Test de navigation au clavier

1. Naviguer dans la page uniquement avec le clavier (Tab, Enter)
2. Vérifier que tous les éléments sont accessibles

**Résultat attendu** :
- ✅ Tous les boutons sont accessibles au clavier
- ✅ Les formulaires sont navigables au clavier
- ✅ Les focus sont visibles

#### ✅ Critères de validation

- [ ] L'interface est responsive
- [ ] La navigation au clavier fonctionne
- [ ] Les éléments sont accessibles

---

## 🔍 TESTS DE RÉGRESSION

### TEST R1 : Vérifier que les autres pages fonctionnent toujours

1. Naviguer vers d'autres pages (Dashboard, Employees, etc.)
2. Vérifier qu'elles fonctionnent correctement

**Résultat attendu** :
- ✅ Les autres pages ne sont pas affectées
- ✅ Aucune erreur dans la console

### TEST R2 : Vérifier la performance

1. Créer plusieurs plannings (10-20)
2. Observer le temps de chargement

**Résultat attendu** :
- ✅ Le chargement reste rapide (< 2 secondes)
- ✅ L'interface reste réactive

---

## 📊 CHECKLIST DE VALIDATION COMPLÈTE

### Affichage

- [ ] Planning hebdomadaire s'affiche correctement
- [ ] Les shifts sont correctement positionnés
- [ ] Les couleurs correspondent aux types de shifts
- [ ] Les informations employé sont correctes

### Fonctionnalités

- [ ] Filtres fonctionnent (date, équipe)
- [ ] Recherche fonctionne
- [ ] Alertes légales s'affichent
- [ ] Remplacements s'affichent
- [ ] Création de shift fonctionne
- [ ] Approbation/rejet de remplacement fonctionne

### États et erreurs

- [ ] États de chargement s'affichent
- [ ] Erreurs sont gérées correctement
- [ ] Messages d'erreur/succès s'affichent

### UX/UI

- [ ] Interface responsive
- [ ] Navigation au clavier fonctionne
- [ ] Performance acceptable

---

## 🚀 COMMANDES RAPIDES POUR TESTER

### Démarrer l'environnement complet

```bash
# Terminal 1 - Backend
cd backend
npm run start:dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### Vérifier les logs

```bash
# Backend logs
# Vérifier dans le terminal du backend

# Frontend logs
# Ouvrir la console du navigateur (F12)
```

---

## 📝 NOTES IMPORTANTES

1. **Données de test** : Assurez-vous d'avoir des données réelles en base avant de tester
2. **Token JWT** : Vérifiez que vous êtes bien connecté avec un token valide
3. **Console du navigateur** : Surveillez les erreurs dans la console (F12)
4. **Network tab** : Vérifiez les requêtes API dans l'onglet Network du navigateur

---

## ✅ RÉSULTAT ATTENDU

Après avoir exécuté tous les tests, vous devriez avoir :

- ✅ Le planning s'affiche avec les données réelles
- ✅ Les filtres et la recherche fonctionnent
- ✅ Les alertes légales s'affichent
- ✅ Les remplacements s'affichent et peuvent être approuvés/rejetés
- ✅ La création de shift fonctionne
- ✅ Les états de chargement et erreurs sont gérés
- ✅ L'interface est responsive et accessible

**Une fois tous les tests validés, l'étape 1.1 est complète !**

