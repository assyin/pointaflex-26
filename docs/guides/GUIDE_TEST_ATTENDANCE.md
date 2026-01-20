# Guide de Test - Interface Attendance

## 📋 **Étapes de Préparation**

### 1. **Migration de la Base de Données**

```bash
cd backend
npx prisma migrate dev --name add_attendance_improvements
npx prisma generate
```

### 2. **Vérification des Dépendances**

Assurez-vous que toutes les dépendances sont installées :

```bash
# Backend
cd backend
npm install

# Frontend
cd frontend
npm install
```

### 3. **Démarrage des Serveurs**

```bash
# Terminal 1 - Backend
cd backend
npm run start:dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

---

## 🧪 **Scénarios de Test**

### **Test 1 : Détection d'Anomalies**

#### 1.1 Test DOUBLE_IN
1. Créer un pointage d'entrée pour un employé
2. Créer un deuxième pointage d'entrée le même jour
3. **Résultat attendu** : Anomalie `DOUBLE_IN` détectée

#### 1.2 Test MISSING_IN
1. Créer un pointage de sortie sans pointage d'entrée préalable
2. **Résultat attendu** : Anomalie `MISSING_IN` détectée

#### 1.3 Test MISSING_OUT
1. Créer un pointage d'entrée
2. Créer un deuxième pointage d'entrée le même jour (sans sortie entre les deux)
3. **Résultat attendu** : Anomalie `MISSING_OUT` détectée

#### 1.4 Test LATE
1. Créer un planning pour un employé avec un shift (ex: 08:00-17:00)
2. Créer un pointage d'entrée après l'heure prévue (ex: 08:15)
3. **Résultat attendu** : Anomalie `LATE` détectée avec minutes de retard

#### 1.5 Test EARLY_LEAVE
1. Créer un planning pour un employé avec un shift (ex: 08:00-17:00)
2. Créer un pointage de sortie avant l'heure prévue (ex: 16:45)
3. **Résultat attendu** : Anomalie `EARLY_LEAVE` détectée

#### 1.6 Test ABSENCE
1. Créer un planning pour un employé un jour ouvrable
2. Ne pas créer de pointage ce jour-là
3. Vérifier qu'il n'y a pas de congé approuvé
4. **Résultat attendu** : Anomalie `ABSENCE` détectée

#### 1.7 Test INSUFFICIENT_REST
1. Créer un pointage de sortie à 22:00
2. Créer un pointage d'entrée le lendemain à 08:00 (10h de repos)
3. **Résultat attendu** : Anomalie `INSUFFICIENT_REST` détectée (minimum 11h requis)

---

### **Test 2 : Correction d'Anomalies**

#### 2.1 Correction Simple
1. Aller sur `/attendance`
2. Filtrer les anomalies
3. Cliquer sur "Corriger" pour une anomalie
4. Remplir le formulaire de correction
5. **Résultat attendu** : Pointage corrigé, anomalie résolue

#### 2.2 Correction Nécessitant Approbation
1. Corriger une anomalie de type `ABSENCE` ou `INSUFFICIENT_REST`
2. Ou corriger avec un changement de timestamp > 2 heures
3. **Résultat attendu** : Statut `PENDING_APPROVAL`, notification aux managers

#### 2.3 Approbation de Correction
1. En tant que manager, aller sur `/attendance`
2. Voir les corrections en attente d'approbation
3. Cliquer sur "Approuver"
4. **Résultat attendu** : Correction approuvée, notification à l'employé

#### 2.4 Correction Groupée
1. Sélectionner plusieurs anomalies
2. Utiliser l'API `POST /attendance/bulk-correct`
3. **Résultat attendu** : Toutes les anomalies corrigées en une seule opération

---

### **Test 3 : Notifications**

#### 3.1 Notification Manager - Nouvelle Anomalie
1. Créer un pointage avec anomalie
2. **Résultat attendu** : Notification créée pour le manager du département/site

#### 3.2 Notification Employé - Correction Approuvée
1. Corriger un pointage (sans approbation requise)
2. **Résultat attendu** : Notification créée pour l'employé

#### 3.3 Notification Manager - Approbation Requise
1. Corriger un pointage nécessitant approbation
2. **Résultat attendu** : Notification créée pour les managers

---

### **Test 4 : Statistiques Avancées**

#### 4.1 Taux de Présence
1. Appeler `GET /attendance/stats/presence-rate?employeeId=XXX&startDate=2025-01-01&endDate=2025-01-31`
2. **Résultat attendu** : Taux de présence calculé avec détails

#### 4.2 Taux de Ponctualité
1. Appeler `GET /attendance/stats/punctuality-rate?employeeId=XXX&startDate=2025-01-01&endDate=2025-01-31`
2. **Résultat attendu** : Taux de ponctualité avec moyenne des retards

#### 4.3 Tendances
1. Appeler `GET /attendance/stats/trends?employeeId=XXX&startDate=2025-01-01&endDate=2025-01-31`
2. **Résultat attendu** : Données pour graphiques (quotidiennes et hebdomadaires)

#### 4.4 Anomalies Récurrentes
1. Créer plusieurs anomalies du même type pour un employé
2. Appeler `GET /attendance/stats/recurring-anomalies?employeeId=XXX&days=30`
3. **Résultat attendu** : Liste des anomalies récurrentes avec fréquence

---

### **Test 5 : Dashboard et Exports**

#### 5.1 Dashboard des Anomalies
1. Appeler `GET /attendance/dashboard/anomalies?startDate=2025-01-01&endDate=2025-01-31`
2. **Résultat attendu** : Statistiques complètes (par type, par employé, par jour)

#### 5.2 Export Anomalies CSV
1. Appeler `GET /attendance/export/anomalies?format=csv&startDate=2025-01-01&endDate=2025-01-31`
2. **Résultat attendu** : Fichier CSV téléchargé avec uniquement les anomalies

#### 5.3 Tri par Priorité
1. Aller sur `/attendance` et filtrer les anomalies
2. **Résultat attendu** : Anomalies triées par priorité (INSUFFICIENT_REST en premier, etc.)

---

### **Test 6 : Configuration Pointage Repos**

#### 6.1 Désactiver Pointage Repos
1. Aller sur `/settings`
2. Désactiver "Activer le pointage des repos (pauses)"
3. Essayer de créer un pointage `BREAK_START`
4. **Résultat attendu** : Erreur, pointage rejeté

#### 6.2 Activer Pointage Repos
1. Activer "Activer le pointage des repos (pauses)"
2. Créer un pointage `BREAK_START` puis `BREAK_END`
3. **Résultat attendu** : Pointages acceptés et traités

---

### **Test 7 : Historique des Corrections**

#### 7.1 Voir Historique
1. Corriger un pointage
2. Appeler `GET /attendance/:id/correction-history`
3. **Résultat attendu** : Historique complet avec toutes les actions

---

## 🔍 **Vérifications à Effectuer**

### **Backend**
- [ ] Toutes les migrations Prisma appliquées
- [ ] Serveur démarre sans erreur
- [ ] Endpoints accessibles via Swagger (`http://localhost:3000/api/docs`)
- [ ] Logs sans erreurs critiques

### **Frontend**
- [ ] Application démarre sans erreur
- [ ] Page `/attendance` accessible
- [ ] Filtres fonctionnent
- [ ] Modal de correction s'ouvre
- [ ] Statistiques s'affichent

### **Base de Données**
- [ ] Table `Attendance` contient les nouveaux champs
- [ ] Enum `NotificationType` contient les nouveaux types
- [ ] Index créés sur `hasAnomaly` et `needsApproval`

---

## 🐛 **Dépannage**

### **Erreur : Migration échoue**
```bash
# Vérifier l'état de la base
npx prisma migrate status

# Réinitialiser si nécessaire (ATTENTION : supprime les données)
npx prisma migrate reset
```

### **Erreur : Types TypeScript**
```bash
# Régénérer les types Prisma
npx prisma generate
```

### **Erreur : Endpoint non trouvé**
- Vérifier que le serveur backend est démarré
- Vérifier les routes dans `attendance.controller.ts`
- Vérifier les permissions dans les guards

### **Erreur : Notifications non créées**
- Vérifier que l'employé a un `userId` lié
- Vérifier que les managers ont des `userId` liés
- Vérifier les logs du serveur pour les erreurs

---

## 📊 **Données de Test Recommandées**

### **Créer des Employés de Test**
- Employé avec planning régulier
- Employé avec retards fréquents
- Employé avec absences
- Manager de département
- Manager régional

### **Créer des Pointages de Test**
- Pointages normaux (IN/OUT)
- Pointages avec retards
- Pointages avec anomalies
- Pointages sur plusieurs jours

### **Créer des Plannings de Test**
- Planning avec shift normal (08:00-17:00)
- Planning avec shift de nuit
- Planning sur plusieurs jours

---

## ✅ **Checklist de Validation**

- [ ] Toutes les anomalies sont détectées correctement
- [ ] Les corrections fonctionnent (simple et avec approbation)
- [ ] Les notifications sont créées et visibles
- [ ] Les statistiques sont calculées correctement
- [ ] Le dashboard affiche les bonnes données
- [ ] Les exports fonctionnent (CSV et anomalies)
- [ ] La configuration pointage repos fonctionne
- [ ] L'historique des corrections est complet
- [ ] Le tri par priorité fonctionne
- [ ] La correction groupée fonctionne

---

## 🎯 **Prochaines Étapes Après Tests**

1. **Corriger les bugs identifiés**
2. **Optimiser les performances** si nécessaire
3. **Ajouter des tests unitaires** pour les fonctions critiques
4. **Documenter les APIs** (Swagger déjà en place)
5. **Former les utilisateurs** sur les nouvelles fonctionnalités

---

## 📞 **Support**

En cas de problème :
1. Vérifier les logs du serveur backend
2. Vérifier la console du navigateur (F12)
3. Vérifier les erreurs dans la base de données
4. Consulter la documentation Swagger pour les endpoints

