# Guide de Test - Création de Planning

**Version :** 1.0  
**Date :** 2025-01-XX

---

## 🚀 Démarrage Rapide

### 1. Redémarrer les Serveurs

```bash
# Backend
cd backend
npm run start:dev

# Frontend (dans un autre terminal)
cd frontend
npm run dev
```

### 2. Accéder à l'Interface

1. Se connecter avec un compte ayant la permission `schedule.create`
2. Naviguer vers `/shifts-planning`
3. Cliquer sur "Créer un planning"

---

## ✅ Tests à Effectuer

### Test 1 : Validation Heures Personnalisées

**Objectif :** Vérifier que la validation empêche la création avec des heures invalides

**Étapes :**
1. Ouvrir le formulaire de création
2. Remplir : Employé, Shift, Date
3. Heure de début : `18:00`
4. Heure de fin : `08:00`
5. Cliquer sur "Créer"

**Résultat attendu :**
- ❌ Erreur affichée : "L'heure de fin doit être supérieure à l'heure de début"
- ❌ Avertissement rouge sous les champs
- ❌ Le formulaire ne se soumet pas

**✅ Test réussi si :** L'erreur est affichée et le planning n'est pas créé

---

### Test 2 : Prévisualisation

**Objectif :** Vérifier que la prévisualisation s'affiche correctement

**Étapes :**
1. Ouvrir le formulaire
2. Sélectionner un employé
3. Sélectionner un shift
4. Choisir "Intervalle"
5. Date début : `2025-01-15`
6. Date fin : `2025-01-20`

**Résultat attendu :**
- ✅ Prévisualisation apparaît automatiquement
- ✅ Affiche "6 jour(s) seront créé(s)"
- ✅ Liste des 6 dates avec format DD/MM/YYYY
- ✅ Nom du shift affiché à côté de chaque date

**✅ Test réussi si :** La prévisualisation est correcte et à jour

---

### Test 3 : Validation Intervalle

**Objectif :** Vérifier que les intervalles > 365 jours sont rejetés

**Étapes :**
1. Ouvrir le formulaire
2. Choisir "Intervalle"
3. Date début : `2025-01-01`
4. Date fin : `2026-01-01` (366 jours)
5. Cliquer sur "Créer"

**Résultat attendu :**
- ❌ Erreur : "L'intervalle ne peut pas dépasser 365 jours"
- ❌ Avertissement sous le champ date de fin

**✅ Test réussi si :** L'erreur est affichée avant la soumission

---

### Test 4 : Création Simple

**Objectif :** Vérifier la création d'un planning simple

**Étapes :**
1. Ouvrir le formulaire
2. Sélectionner un employé actif
3. Sélectionner un shift
4. Choisir "Jour unique"
5. Sélectionner une date
6. Cliquer sur "Créer"

**Résultat attendu :**
- ✅ Message : "1 planning(s) créé(s) avec succès"
- ✅ Modal se ferme
- ✅ Le planning apparaît dans la liste

**✅ Test réussi si :** Le planning est créé et visible

---

### Test 5 : Gestion des Conflits

**Objectif :** Vérifier la gestion des plannings existants

**Prérequis :** Créer un planning pour un employé le 2025-01-15

**Étapes :**
1. Ouvrir le formulaire
2. Sélectionner le même employé
3. Choisir "Intervalle"
4. Date début : `2025-01-15`
5. Date fin : `2025-01-20`
6. Cliquer sur "Créer"

**Résultat attendu :**
- ✅ 5 plannings créés (16, 17, 18, 19, 20)
- ✅ 1 planning ignoré (15)
- ✅ Message : "5 planning(s) créé(s) avec succès. 1 date(s) ignorée(s) car déjà planifiée(s)."

**✅ Test réussi si :** Création partielle réussie avec message informatif

---

### Test 6 : Employé Inactif

**Objectif :** Vérifier que les employés inactifs sont rejetés

**Prérequis :** Créer un employé avec `isActive: false`

**Étapes :**
1. Ouvrir le formulaire
2. Sélectionner l'employé inactif
3. Remplir les autres champs
4. Cliquer sur "Créer"

**Résultat attendu :**
- ❌ Erreur : "L'employé [Nom] ([Matricule]) n'est pas actif..."
- ❌ Le planning n'est pas créé

**✅ Test réussi si :** L'erreur est affichée avec le nom de l'employé

---

### Test 7 : Cohérence Employé/Équipe

**Objectif :** Vérifier la validation de cohérence

**Prérequis :** Employé A dans Équipe 1, Équipe 2 existe

**Étapes :**
1. Ouvrir le formulaire
2. Sélectionner Employé A
3. Sélectionner Équipe 2
4. Remplir les autres champs
5. Cliquer sur "Créer"

**Résultat attendu :**
- ❌ Erreur : "L'employé [Nom] n'appartient pas à l'équipe sélectionnée..."
- ❌ Suggestion : "Veuillez sélectionner l'équipe correcte ou laisser ce champ vide"

**✅ Test réussi si :** L'erreur est contextuelle avec suggestion

---

## 🔍 Vérifications Techniques

### Backend
```bash
# Vérifier que le serveur démarre sans erreurs
cd backend
npm run start:dev

# Vérifier les logs lors de la création
# Les messages doivent être en français et contextuels
```

### Frontend
```bash
# Vérifier que le frontend compile sans erreurs
cd frontend
npm run build

# Vérifier la console du navigateur
# Aucune erreur JavaScript ne doit apparaître
```

---

## 📊 Checklist de Validation

### Fonctionnalités
- [ ] Création planning jour unique fonctionne
- [ ] Création planning par intervalle fonctionne
- [ ] Prévisualisation s'affiche correctement
- [ ] Validation heures personnalisées fonctionne
- [ ] Validation intervalle fonctionne
- [ ] Gestion des conflits fonctionne
- [ ] Messages d'erreur sont contextuels
- [ ] Messages de succès sont informatifs

### UX
- [ ] Interface est intuitive
- [ ] Feedback visuel est clair
- [ ] Aide contextuelle est utile
- [ ] Prévisualisation est informative
- [ ] Erreurs sont compréhensibles

### Performance
- [ ] Création est rapide (< 2 secondes)
- [ ] Prévisualisation est instantanée
- [ ] Pas de lag lors de la saisie

---

## 🐛 Problèmes Connus

Aucun problème connu à ce jour.

---

## 📝 Notes

- Tous les messages sont en français
- Les validations frontend sont exécutées avant la soumission
- Les validations backend sont la source de vérité
- La prévisualisation se met à jour automatiquement

---

**Document généré le :** 2025-01-XX

