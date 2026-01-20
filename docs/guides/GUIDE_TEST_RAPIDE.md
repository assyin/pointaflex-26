# Guide de Test Rapide - PointageFlex

**Version :** 1.0  
**Objectif :** Guide rapide pour exécuter les tests essentiels

---

## 🚀 DÉMARRAGE RAPIDE

### 1. Préparation (5 minutes)

```bash
# 1. Vérifier que les serveurs sont démarrés
# Backend : http://localhost:3000
# Frontend : http://localhost:3001

# 2. Créer les comptes de test (via interface ou SQL)
```

**Comptes à créer :**
- `admin@test.com` / `Test123!` (ADMIN_RH)
- `manager@test.com` / `Test123!` (MANAGER)
- `employee1@test.com` / `Test123!` (EMPLOYEE)

---

## 📋 CHECKLIST RAPIDE PAR MODULE

### ✅ Module 1 : Structure RH (15 min)

- [ ] Créer 1 site
- [ ] Créer 2 départements
- [ ] Créer 2 postes
- [ ] Créer 1 équipe

**Critère de succès :** Tous les éléments créés et visibles dans les listes

---

### ✅ Module 2 : Utilisateurs (10 min)

- [ ] Créer 1 utilisateur MANAGER
- [ ] Créer 1 utilisateur EMPLOYEE
- [ ] Vérifier les permissions

**Critère de succès :** Utilisateurs créés, permissions correctes

---

### ✅ Module 3 : Employés (20 min)

- [ ] Créer 3 employés avec affectations complètes
- [ ] Associer 1 employé à un utilisateur
- [ ] Rechercher un employé
- [ ] Exporter la liste en Excel

**Critère de succès :** Employés créés, recherche et export fonctionnels

---

### ✅ Module 4 : Pointages (20 min)

- [ ] Pointage manuel (entrée + sortie)
- [ ] Vérifier la détection d'anomalie (retard)
- [ ] Corriger un pointage
- [ ] Filtrer les pointages

**Critère de succès :** Pointages enregistrés, anomalies détectées, corrections fonctionnelles

---

### ✅ Module 5 : Congés (15 min)

- [ ] Demande de congé par employé
- [ ] Validation par manager
- [ ] Validation finale par RH
- [ ] Vérifier le solde

**Critère de succès :** Workflow complet fonctionnel, solde mis à jour

---

### ✅ Module 6 : Heures Supplémentaires (15 min)

- [ ] Demande d'heures sup
- [ ] Validation par manager
- [ ] Conversion en récupération

**Critère de succès :** Workflow complet fonctionnel

---

### ✅ Module 7 : Rapports (20 min)

- [ ] Générer un rapport de présence
- [ ] Exporter en PDF
- [ ] Exporter en Excel
- [ ] Vérifier l'historique

**Critère de succès :** Rapports générés, exports fonctionnels

---

### ✅ Module 8 : Audit (10 min)

- [ ] Consulter le journal d'audit
- [ ] Filtrer par action
- [ ] Voir les détails d'une modification

**Critère de succès :** Journal accessible, filtres fonctionnels

---

## 🎯 TEST CRITIQUE (30 minutes)

**Scénario complet minimal pour valider le système :**

1. **Connexion** (2 min)
   - Se connecter avec `admin@test.com`

2. **Structure** (5 min)
   - Créer 1 site, 1 département, 1 équipe

3. **Employé** (5 min)
   - Créer 1 employé complet
   - Associer à un utilisateur

4. **Pointage** (5 min)
   - Pointage manuel
   - Vérifier les calculs

5. **Congé** (5 min)
   - Demande → Validation → Approbation

6. **Rapport** (5 min)
   - Générer et exporter un rapport

7. **Vérification** (3 min)
   - Vérifier l'audit
   - Vérifier les données

**Total : 30 minutes pour un test complet minimal**

---

## 🔍 TESTS DE RÉGRESSION RAPIDES

### Test 1 : Connexion Multi-Rôles (5 min)

- [ ] Se connecter avec ADMIN_RH → Vérifier accès complet
- [ ] Se connecter avec MANAGER → Vérifier accès limité
- [ ] Se connecter avec EMPLOYEE → Vérifier accès restreint

### Test 2 : Filtres et Recherche (5 min)

- [ ] Tester la recherche dans Employés
- [ ] Tester les filtres dans Pointages
- [ ] Tester les filtres dans Congés

### Test 3 : Exports (5 min)

- [ ] Export Excel des Employés
- [ ] Export PDF d'un Rapport
- [ ] Export CSV des Pointages

---

## 📊 TEMPLATE DE RAPPORT RAPIDE

```
Date : ___________
Testeur : ___________

Module testé : ___________
Temps : ___________

✅ Réussi
❌ Échoué
⚠️ Partiel

Problèmes :
___________

Commentaires :
___________
```

---

## 🐛 BUGS CRITIQUES À VÉRIFIER

- [ ] Connexion fonctionne
- [ ] Pointages calculent correctement
- [ ] Anomalies détectées
- [ ] Workflow de validation fonctionne
- [ ] Exports génèrent des fichiers valides
- [ ] Permissions respectées

---

## 📝 NOTES IMPORTANTES

1. **Toujours tester avec différents rôles** pour vérifier les permissions
2. **Vérifier les calculs** (heures travaillées, soldes de congés)
3. **Tester les cas limites** (dates invalides, valeurs négatives)
4. **Vérifier les messages d'erreur** (doivent être clairs)
5. **Tester sur différents navigateurs** si possible

---

**Bon test ! 🚀**

