# 🧪 Étapes pour Commencer les Tests - Interface Attendance

## ✅ **IMPLÉMENTATION 100% COMPLÈTE**

Toutes les fonctionnalités (Critique, Haute, Moyenne, Basse) sont maintenant implémentées !

---

## 📋 **ÉTAPE 1 : Préparation de l'Environnement**

### 1.1 Migration de la Base de Données

```bash
# Aller dans le dossier backend
cd backend

# Appliquer les migrations
npx prisma migrate dev --name add_attendance_improvements

# Régénérer les types Prisma
npx prisma generate
```

**Vérification** : Vérifiez que la migration s'est bien passée sans erreur.

### 1.2 Vérification des Dépendances

```bash
# Backend
cd backend
npm install

# Frontend
cd frontend
npm install
```

### 1.3 Vérification de la Configuration

Vérifiez que le fichier `.env` du backend contient :
```env
DATABASE_URL="votre_url_de_base_de_données"
JWT_SECRET="votre_secret_jwt"
```

---

## 🚀 **ÉTAPE 2 : Démarrage des Serveurs**

### 2.1 Terminal 1 - Backend

```bash
cd backend
npm run start:dev
```

**Vérification** : Le serveur doit démarrer sur `http://localhost:3000`
- Swagger disponible sur : `http://localhost:3000/api/docs`
- Vérifiez qu'il n'y a pas d'erreurs dans les logs

### 2.2 Terminal 2 - Frontend

```bash
cd frontend
npm run dev
```

**Vérification** : L'application doit démarrer sur `http://localhost:3001`
- Vérifiez qu'il n'y a pas d'erreurs dans la console du navigateur

---

## 🧪 **ÉTAPE 3 : Tests de Base**

### 3.1 Test de Connexion

1. Ouvrir `http://localhost:3001`
2. Se connecter avec un compte utilisateur
3. **Résultat attendu** : Connexion réussie, redirection vers le dashboard

### 3.2 Test d'Accès à la Page Attendance

1. Naviguer vers `/attendance`
2. **Résultat attendu** : Page s'affiche avec le tableau des pointages

### 3.3 Test des Filtres

1. Utiliser le filtre de date (Aujourd'hui, Cette semaine)
2. Utiliser la recherche par nom/matricule
3. Cocher "Filtrer les anomalies"
4. **Résultat attendu** : Les filtres fonctionnent correctement

---

## 🔍 **ÉTAPE 4 : Tests des Fonctionnalités Critiques**

### 4.1 Test de Détection d'Anomalies

#### Test DOUBLE_IN
```bash
# Via Swagger ou Postman
POST http://localhost:3000/api/v1/attendance
{
  "employeeId": "id_employe",
  "type": "IN",
  "timestamp": "2025-01-17T08:00:00Z",
  "source": "MANUAL"
}

# Puis créer un deuxième pointage IN le même jour
POST http://localhost:3000/api/v1/attendance
{
  "employeeId": "id_employe",
  "type": "IN",
  "timestamp": "2025-01-17T09:00:00Z",
  "source": "MANUAL"
}
```

**Résultat attendu** : Le deuxième pointage doit avoir `hasAnomaly: true` et `anomalyType: "DOUBLE_IN"`

#### Test LATE
1. Créer un planning pour un employé (shift 08:00-17:00)
2. Créer un pointage IN à 08:15
3. **Résultat attendu** : Anomalie `LATE` détectée avec `lateMinutes: 15`

### 4.2 Test de Correction

1. Aller sur `/attendance`
2. Filtrer les anomalies
3. Cliquer sur "Corriger" pour une anomalie
4. Remplir le formulaire :
   - Date & Heure corrigée
   - Note de correction
5. Cliquer sur "Corriger"
6. **Résultat attendu** : 
   - Pointage corrigé
   - Badge "Corrigé" affiché
   - Notification créée pour l'employé (si pas d'approbation requise)

### 4.3 Test d'Approbation

1. Corriger une anomalie de type `ABSENCE` (nécessite approbation)
2. **Résultat attendu** : 
   - Statut `PENDING_APPROVAL`
   - Badge "En attente d'approbation"
   - Notification aux managers
3. En tant que manager, cliquer sur "Approuver"
4. **Résultat attendu** :
   - Statut `APPROVED`
   - Notification à l'employé

---

## 📊 **ÉTAPE 5 : Tests des Statistiques**

### 5.1 Test Taux de Présence

```bash
GET http://localhost:3000/api/v1/attendance/stats/presence-rate?employeeId=XXX&startDate=2025-01-01&endDate=2025-01-31
```

**Résultat attendu** :
```json
{
  "presenceRate": 85.5,
  "totalDays": 20,
  "presentDays": 17,
  "absentDays": 2,
  "leaveDays": 1
}
```

### 5.2 Test Taux de Ponctualité

```bash
GET http://localhost:3000/api/v1/attendance/stats/punctuality-rate?employeeId=XXX&startDate=2025-01-01&endDate=2025-01-31
```

**Résultat attendu** :
```json
{
  "punctualityRate": 90.0,
  "totalEntries": 20,
  "onTimeEntries": 18,
  "lateEntries": 2,
  "averageLateMinutes": 15
}
```

### 5.3 Test Tendances

```bash
GET http://localhost:3000/api/v1/attendance/stats/trends?employeeId=XXX&startDate=2025-01-01&endDate=2025-01-31
```

**Résultat attendu** : Données pour graphiques (quotidiennes et hebdomadaires)

---

## 🎯 **ÉTAPE 6 : Tests des Fonctionnalités Avancées**

### 6.1 Test Correction Groupée

```bash
POST http://localhost:3000/api/v1/attendance/bulk-correct
{
  "attendances": [
    {
      "attendanceId": "id1",
      "correctionNote": "Correction 1"
    },
    {
      "attendanceId": "id2",
      "correctionNote": "Correction 2"
    }
  ],
  "generalNote": "Correction groupée",
  "correctedBy": "user_id"
}
```

**Résultat attendu** : Tous les pointages corrigés en une seule opération

### 6.2 Test Export Anomalies

```bash
GET http://localhost:3000/api/v1/attendance/export/anomalies?format=csv&startDate=2025-01-01&endDate=2025-01-31
```

**Résultat attendu** : Fichier CSV téléchargé avec uniquement les anomalies

### 6.3 Test Dashboard Anomalies

```bash
GET http://localhost:3000/api/v1/attendance/dashboard/anomalies?startDate=2025-01-01&endDate=2025-01-31
```

**Résultat attendu** : Statistiques complètes (par type, par employé, par jour)

### 6.4 Test Anomalies Récurrentes

```bash
GET http://localhost:3000/api/v1/attendance/stats/recurring-anomalies?employeeId=XXX&days=30
```

**Résultat attendu** : Liste des anomalies récurrentes (≥3 occurrences)

---

## 🔧 **ÉTAPE 7 : Tests de Configuration**

### 7.1 Test Pointage Repos

1. Aller sur `/settings`
2. Désactiver "Activer le pointage des repos (pauses)"
3. Essayer de créer un pointage `BREAK_START`
4. **Résultat attendu** : Erreur 400, pointage rejeté

5. Activer "Activer le pointage des repos (pauses)"
6. Créer un pointage `BREAK_START` puis `BREAK_END`
7. **Résultat attendu** : Pointages acceptés

---

## ✅ **ÉTAPE 8 : Checklist de Validation**

### Backend
- [ ] Serveur démarre sans erreur
- [ ] Toutes les migrations appliquées
- [ ] Swagger accessible (`http://localhost:3000/api/docs`)
- [ ] Endpoints répondent correctement
- [ ] Logs sans erreurs critiques

### Frontend
- [ ] Application démarre sans erreur
- [ ] Page `/attendance` accessible
- [ ] Filtres fonctionnent
- [ ] Modal de correction s'ouvre
- [ ] Statistiques s'affichent
- [ ] Pas d'erreurs dans la console (F12)

### Base de Données
- [ ] Table `Attendance` contient les nouveaux champs :
  - `hoursWorked`
  - `lateMinutes`
  - `earlyLeaveMinutes`
  - `overtimeMinutes`
  - `needsApproval`
  - `approvalStatus`
  - `approvedBy`
  - `approvedAt`
- [ ] Enum `NotificationType` contient :
  - `ATTENDANCE_ANOMALY`
  - `ATTENDANCE_CORRECTED`
  - `ATTENDANCE_APPROVAL_REQUIRED`
- [ ] Index créés sur `hasAnomaly` et `needsApproval`

### Fonctionnalités
- [ ] Détection de toutes les anomalies (7 types)
- [ ] Correction simple fonctionne
- [ ] Correction avec approbation fonctionne
- [ ] Notifications créées correctement
- [ ] Statistiques calculées correctement
- [ ] Export anomalies fonctionne
- [ ] Dashboard affiche les bonnes données
- [ ] Tri par priorité fonctionne
- [ ] Correction groupée fonctionne

---

## 🐛 **Dépannage Rapide**

### Erreur : Migration échoue
```bash
# Vérifier l'état
npx prisma migrate status

# Si nécessaire, réinitialiser (ATTENTION : supprime les données)
npx prisma migrate reset
```

### Erreur : Types TypeScript
```bash
npx prisma generate
```

### Erreur : Endpoint non trouvé
- Vérifier que le serveur backend est démarré
- Vérifier les routes dans `attendance.controller.ts`
- Vérifier les permissions dans les guards

### Erreur : Notifications non créées
- Vérifier que l'employé a un `userId` lié
- Vérifier que les managers ont des `userId` liés
- Vérifier les logs du serveur

---

## 📝 **Données de Test Recommandées**

### Créer des Employés
- Employé avec planning régulier (08:00-17:00)
- Employé avec retards fréquents
- Employé avec absences
- Manager de département
- Manager régional

### Créer des Plannings
- Planning avec shift normal
- Planning avec shift de nuit
- Planning sur plusieurs jours

### Créer des Pointages
- Pointages normaux (IN/OUT)
- Pointages avec retards
- Pointages avec anomalies
- Pointages sur plusieurs jours

---

## 🎯 **Ordre Recommandé des Tests**

1. **Tests de base** (connexion, accès pages)
2. **Tests de détection** (créer des anomalies)
3. **Tests de correction** (corriger des anomalies)
4. **Tests d'approbation** (workflow complet)
5. **Tests de statistiques** (vérifier les calculs)
6. **Tests avancés** (correction groupée, exports)
7. **Tests de configuration** (pointage repos)

---

## 📞 **Support**

En cas de problème :
1. Vérifier les logs du serveur backend
2. Vérifier la console du navigateur (F12)
3. Vérifier les erreurs dans la base de données
4. Consulter la documentation Swagger (`http://localhost:3000/api/docs`)

---

## 🎉 **Résumé**

Toutes les fonctionnalités sont implémentées et prêtes pour les tests !

**Fichiers importants** :
- `GUIDE_TEST_ATTENDANCE.md` : Guide détaillé des tests
- `RESUME_FINAL_IMPLEMENTATION_ATTENDANCE.md` : Résumé de l'implémentation
- `ETAPES_TEST_ATTENDANCE.md` : Ce document (étapes rapides)

**Bon test ! 🚀**

