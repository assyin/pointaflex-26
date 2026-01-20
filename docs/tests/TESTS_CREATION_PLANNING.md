# Tests de la Fonctionnalité de Création de Planning

**Date :** 2025-01-XX  
**Version :** 1.0

---

## 📋 Scénarios de Test

### ✅ Test 1 : Création d'un planning simple (jour unique)

**Prérequis :**
- Employé actif existant
- Shift actif existant
- Permissions `schedule.create`

**Actions :**
1. Ouvrir le formulaire de création de planning
2. Sélectionner un employé
3. Sélectionner un shift
4. Choisir "Jour unique"
5. Sélectionner une date de début
6. Cliquer sur "Créer"

**Résultats attendus :**
- ✅ Planning créé avec succès
- ✅ Message de succès : "1 planning(s) créé(s) avec succès"
- ✅ Prévisualisation affiche "1 jour(s) seront créé(s)"
- ✅ Modal se ferme après création
- ✅ Le planning apparaît dans la liste

---

### ✅ Test 2 : Création d'un planning par intervalle

**Actions :**
1. Ouvrir le formulaire de création
2. Sélectionner un employé
3. Sélectionner un shift
4. Choisir "Intervalle"
5. Sélectionner date de début : 2025-01-15
6. Sélectionner date de fin : 2025-01-20
7. Cliquer sur "Créer"

**Résultats attendus :**
- ✅ 6 plannings créés (15, 16, 17, 18, 19, 20)
- ✅ Message : "6 planning(s) créé(s) avec succès"
- ✅ Prévisualisation affiche "6 jour(s) seront créé(s)"
- ✅ Liste des dates affichée dans la prévisualisation

---

### ✅ Test 3 : Validation - Heures personnalisées invalides

**Actions :**
1. Ouvrir le formulaire
2. Remplir les champs obligatoires
3. Heure de début : 18:00
4. Heure de fin : 08:00 (inférieure à début)
5. Cliquer sur "Créer"

**Résultats attendus :**
- ❌ Erreur affichée : "L'heure de fin doit être supérieure à l'heure de début"
- ❌ Avertissement visuel rouge sous les champs d'heures
- ❌ Le formulaire ne se soumet pas
- ✅ Message d'erreur contextuel affiché

---

### ✅ Test 4 : Validation - Intervalle trop grand

**Actions :**
1. Ouvrir le formulaire
2. Choisir "Intervalle"
3. Date de début : 2025-01-01
4. Date de fin : 2026-01-01 (366 jours)
5. Cliquer sur "Créer"

**Résultats attendus :**
- ❌ Erreur frontend : "L'intervalle ne peut pas dépasser 365 jours"
- ❌ Avertissement visuel sous le champ date de fin
- ❌ Le formulaire ne se soumet pas

---

### ✅ Test 5 : Validation - Date de fin < Date de début

**Actions :**
1. Ouvrir le formulaire
2. Choisir "Intervalle"
3. Date de début : 2025-01-20
4. Date de fin : 2025-01-15
5. Cliquer sur "Créer"

**Résultats attendus :**
- ❌ Erreur : "La date de fin doit être supérieure ou égale à la date de début"
- ❌ Le champ date de fin a `min={dateDebut}` donc impossible de sélectionner une date antérieure
- ❌ Si erreur backend, message contextuel affiché

---

### ✅ Test 6 : Validation - Employé inactif

**Prérequis :**
- Créer un employé inactif (`isActive: false`)

**Actions :**
1. Ouvrir le formulaire
2. Sélectionner l'employé inactif
3. Remplir les autres champs
4. Cliquer sur "Créer"

**Résultats attendus :**
- ❌ Erreur backend : "L'employé [Nom] ([Matricule]) n'est pas actif. Impossible de créer un planning pour un employé inactif."
- ❌ Message d'erreur contextuel avec nom et matricule
- ❌ Le planning n'est pas créé

---

### ✅ Test 7 : Validation - Employé n'appartient pas à l'équipe

**Prérequis :**
- Employé A dans Équipe 1
- Équipe 2 existe

**Actions :**
1. Ouvrir le formulaire
2. Sélectionner Employé A
3. Sélectionner Équipe 2
4. Remplir les autres champs
5. Cliquer sur "Créer"

**Résultats attendus :**
- ❌ Erreur : "L'employé [Nom] ([Matricule]) n'appartient pas à l'équipe sélectionnée. Veuillez sélectionner l'équipe correcte ou laisser ce champ vide."
- ❌ Message contextuel avec suggestion
- ❌ Le planning n'est pas créé

---

### ✅ Test 8 : Gestion des conflits - Dates partiellement existantes

**Prérequis :**
- Planning existant pour l'employé le 2025-01-15
- Planning existant pour l'employé le 2025-01-17

**Actions :**
1. Ouvrir le formulaire
2. Sélectionner l'employé
3. Choisir "Intervalle"
4. Date de début : 2025-01-15
5. Date de fin : 2025-01-20
6. Cliquer sur "Créer"

**Résultats attendus :**
- ✅ 4 plannings créés (16, 18, 19, 20)
- ✅ 2 plannings ignorés (15, 17)
- ✅ Message : "4 planning(s) créé(s) avec succès. 2 date(s) ignorée(s) car déjà planifiée(s)."
- ✅ Les dates en conflit sont retournées dans la réponse

---

### ✅ Test 9 : Gestion des conflits - Toutes les dates existent

**Prérequis :**
- Plannings existants pour toutes les dates de la période

**Actions :**
1. Ouvrir le formulaire
2. Sélectionner l'employé
3. Choisir "Intervalle"
4. Date de début : 2025-01-15
5. Date de fin : 2025-01-20
6. Cliquer sur "Créer"

**Résultats attendus :**
- ❌ Erreur : "Tous les plannings pour la période du 15/01/2025 au 20/01/2025 existent déjà pour l'employé [Nom]. Veuillez choisir une autre période ou modifier les plannings existants."
- ❌ Message contextuel avec dates formatées et nom de l'employé
- ❌ Aucun planning créé

---

### ✅ Test 10 : Heures personnalisées valides

**Actions :**
1. Ouvrir le formulaire
2. Remplir les champs obligatoires
3. Heure de début : 08:30
4. Heure de fin : 16:30
5. Cliquer sur "Créer"

**Résultats attendus :**
- ✅ Affichage de la durée : "Durée : 8h" sous les champs
- ✅ Planning créé avec les heures personnalisées
- ✅ Les heures personnalisées sont sauvegardées

---

### ✅ Test 11 : Prévisualisation - Affichage correct

**Actions :**
1. Ouvrir le formulaire
2. Sélectionner un employé
3. Sélectionner un shift
4. Choisir "Intervalle"
5. Date de début : 2025-01-15
6. Date de fin : 2025-01-20

**Résultats attendus :**
- ✅ Prévisualisation apparaît automatiquement
- ✅ Affiche "6 jour(s) seront créé(s)"
- ✅ Liste des 6 dates avec format DD/MM/YYYY
- ✅ Nom du shift affiché à côté de chaque date
- ✅ Si heures personnalisées : affichage des heures

---

### ✅ Test 12 : Prévisualisation - Grande plage (>10 jours)

**Actions :**
1. Ouvrir le formulaire
2. Choisir "Intervalle"
3. Date de début : 2025-01-01
4. Date de fin : 2025-01-31 (31 jours)

**Résultats attendus :**
- ✅ Prévisualisation affiche "31 jour(s) seront créé(s)"
- ✅ Affiche "01/01/2025 au 31/01/2025" au lieu de la liste complète
- ✅ Pas de liste détaillée (trop long)

---

### ✅ Test 13 : Messages d'erreur contextuels

**Scénarios à tester :**
1. Employé introuvable → Message avec ID
2. Shift introuvable → Message avec ID
3. Équipe introuvable → Message avec ID
4. Erreur réseau → Message avec suggestion de réessayer

**Résultats attendus :**
- ✅ Tous les messages sont en français
- ✅ Messages contextuels avec informations pertinentes
- ✅ Suggestions de correction quand applicable

---

### ✅ Test 14 : Réinitialisation des erreurs

**Actions :**
1. Créer une erreur de validation (ex: heures invalides)
2. Corriger l'erreur en modifiant les champs
3. Observer l'affichage des erreurs

**Résultats attendus :**
- ✅ Les erreurs disparaissent automatiquement lors de la correction
- ✅ Validation en temps réel
- ✅ Pas d'erreurs persistantes après correction

---

### ✅ Test 15 : Performance - Grande plage de dates

**Actions :**
1. Créer un planning pour 365 jours (maximum autorisé)
2. Observer le temps de traitement

**Résultats attendus :**
- ✅ Création réussie
- ✅ Temps de traitement < 3 secondes
- ✅ Message de succès avec le bon nombre de plannings créés

---

## 🔍 Checklist de Validation

### Backend
- [x] Validation des heures personnalisées
- [x] Vérification `isActive` pour employé
- [x] Validation cohérence employé/équipe
- [x] Messages d'erreur contextuels
- [x] Retour des dates en conflit
- [x] Formatage des dates dans les messages

### Frontend
- [x] Validation en temps réel
- [x] Prévisualisation avant création
- [x] Affichage des erreurs de validation
- [x] Aide contextuelle
- [x] Feedback visuel (durée, compteur de jours)
- [x] Messages d'erreur traduits

### UX
- [x] Interface claire et intuitive
- [x] Feedback immédiat sur les erreurs
- [x] Prévisualisation informative
- [x] Messages d'aide contextuels
- [x] Gestion élégante des conflits

---

## 📊 Résultats des Tests

### Tests Automatisés (à créer)
```bash
# Tests unitaires backend
npm run test schedules.service.spec.ts

# Tests d'intégration
npm run test:e2e schedules
```

### Tests Manuels
Exécuter chaque scénario ci-dessus et vérifier les résultats attendus.

---

## 🐛 Bugs Connus

Aucun bug connu à ce jour.

---

## 📝 Notes

- Les validations frontend sont exécutées avant la soumission
- Les validations backend sont la source de vérité
- Les messages d'erreur sont toujours en français
- La prévisualisation se met à jour automatiquement lors de la modification des champs

---

**Document généré le :** 2025-01-XX

