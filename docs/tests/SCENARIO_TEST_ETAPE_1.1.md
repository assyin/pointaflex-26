# 📋 SCÉNARIO DE TEST - ÉTAPE 1.1 : Page Shifts Planning - Connexion API

**Date** : 22 novembre 2025  
**Version** : 1.0.0  
**Objectif** : Valider les endpoints backend et hooks API pour le planning des shifts

---

## 🔧 PRÉREQUIS

### 1. Préparation de l'environnement

```bash
# 1. Démarrer le backend
cd backend
npm install  # Si nécessaire
npm run start:dev

# 2. Vérifier que la base de données est accessible
npm run prisma:studio  # Optionnel, pour vérifier les données

# 3. Vérifier que le backend démarre sans erreurs
# Le serveur doit être accessible sur http://localhost:3000
```

### 2. Données de test nécessaires

Assurez-vous d'avoir dans votre base de données :

- ✅ **Au moins 1 Tenant** (entreprise)
- ✅ **Au moins 2-3 Employees** (employés)
- ✅ **Au moins 2-3 Shifts** (Matin, Soir, Nuit)
- ✅ **Au moins 1 Team** (équipe) - optionnel
- ✅ **Au moins 1 Site** (site) - optionnel
- ✅ **Token JWT valide** pour l'authentification

### 3. Outils de test

- **Postman** ou **Insomnia** ou **curl** (ligne de commande)
- **Swagger UI** (si activé) : `http://localhost:3000/api`
- **Navigateur** pour tester les endpoints via Swagger

---

## 📝 SCÉNARIOS DE TEST

### TEST 1 : GET /api/v1/schedules/week/:date

**Objectif** : Récupérer le planning d'une semaine

#### Étape 1.1 : Préparer la requête

```http
GET http://localhost:3000/api/v1/schedules/week/2025-01-15
Authorization: Bearer YOUR_JWT_TOKEN
```

#### Étape 1.2 : Test avec curl

```bash
curl -X GET "http://localhost:3000/api/v1/schedules/week/2025-01-15" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

#### Étape 1.3 : Résultat attendu

```json
{
  "weekStart": "2025-01-13T00:00:00.000Z",
  "weekEnd": "2025-01-19T23:59:59.999Z",
  "schedules": [
    {
      "id": "uuid",
      "date": "2025-01-15T00:00:00.000Z",
      "employee": {
        "id": "uuid",
        "firstName": "John",
        "lastName": "Doe",
        "matricule": "EMP001"
      },
      "shift": {
        "id": "uuid",
        "name": "Matin",
        "startTime": "08:00",
        "endTime": "16:00"
      }
    }
  ],
  "leaves": [],
  "replacements": []
}
```

#### Étape 1.4 : Tests avec filtres

```bash
# Avec filtre teamId
curl -X GET "http://localhost:3000/api/v1/schedules/week/2025-01-15?teamId=TEAM_UUID" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Avec filtre siteId
curl -X GET "http://localhost:3000/api/v1/schedules/week/2025-01-15?siteId=SITE_UUID" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### ✅ Critères de validation

- [ ] Status code : `200 OK`
- [ ] Réponse contient `weekStart` et `weekEnd`
- [ ] Réponse contient un tableau `schedules`
- [ ] Réponse contient un tableau `leaves`
- [ ] Réponse contient un tableau `replacements`
- [ ] Les dates de `weekStart` et `weekEnd` correspondent au lundi et dimanche de la semaine
- [ ] Les filtres `teamId` et `siteId` fonctionnent correctement

---

### TEST 2 : GET /api/v1/schedules/month/:date

**Objectif** : Récupérer le planning d'un mois

#### Étape 2.1 : Préparer la requête

```http
GET http://localhost:3000/api/v1/schedules/month/2025-01-15
Authorization: Bearer YOUR_JWT_TOKEN
```

#### Étape 2.2 : Test avec curl

```bash
curl -X GET "http://localhost:3000/api/v1/schedules/month/2025-01-15" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

#### Étape 2.3 : Résultat attendu

```json
{
  "monthStart": "2025-01-01T00:00:00.000Z",
  "monthEnd": "2025-01-31T23:59:59.999Z",
  "schedules": [...],
  "leaves": [...],
  "replacements": [...]
}
```

#### ✅ Critères de validation

- [ ] Status code : `200 OK`
- [ ] Réponse contient `monthStart` et `monthEnd`
- [ ] `monthStart` correspond au 1er jour du mois
- [ ] `monthEnd` correspond au dernier jour du mois
- [ ] Tous les schedules du mois sont inclus

---

### TEST 3 : POST /api/v1/schedules/bulk

**Objectif** : Créer plusieurs plannings en une seule requête

#### Étape 3.1 : Préparer les données

**Important** : Remplacer les UUIDs par des valeurs réelles de votre base de données

```json
{
  "schedules": [
    {
      "employeeId": "EMPLOYEE_UUID_1",
      "shiftId": "SHIFT_UUID_1",
      "date": "2025-01-20",
      "teamId": "TEAM_UUID_1",
      "customStartTime": "08:00",
      "customEndTime": "16:00",
      "notes": "Shift normal"
    },
    {
      "employeeId": "EMPLOYEE_UUID_2",
      "shiftId": "SHIFT_UUID_2",
      "date": "2025-01-21",
      "teamId": "TEAM_UUID_1",
      "notes": "Shift avec heures personnalisées"
    },
    {
      "employeeId": "EMPLOYEE_UUID_1",
      "shiftId": "SHIFT_UUID_3",
      "date": "2025-01-22"
    }
  ]
}
```

#### Étape 3.2 : Test avec curl

```bash
curl -X POST "http://localhost:3000/api/v1/schedules/bulk" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "schedules": [
      {
        "employeeId": "EMPLOYEE_UUID_1",
        "shiftId": "SHIFT_UUID_1",
        "date": "2025-01-20"
      },
      {
        "employeeId": "EMPLOYEE_UUID_2",
        "shiftId": "SHIFT_UUID_2",
        "date": "2025-01-21"
      }
    ]
  }'
```

#### Étape 3.3 : Résultat attendu (succès)

```json
{
  "count": 2,
  "message": "Successfully created 2 schedule(s)"
}
```

#### Étape 3.4 : Test d'erreur - Conflit

Créer un planning qui existe déjà :

```bash
# Créer un planning
curl -X POST "http://localhost:3000/api/v1/schedules" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": "EMPLOYEE_UUID_1",
    "shiftId": "SHIFT_UUID_1",
    "date": "2025-01-25"
  }'

# Essayer de créer le même planning en bulk
curl -X POST "http://localhost:3000/api/v1/schedules/bulk" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "schedules": [
      {
        "employeeId": "EMPLOYEE_UUID_1",
        "shiftId": "SHIFT_UUID_1",
        "date": "2025-01-25"
      }
    ]
  }'
```

**Résultat attendu** : Status `409 Conflict` avec message d'erreur

#### ✅ Critères de validation

- [ ] Status code : `200 OK` pour création réussie
- [ ] Réponse contient `count` et `message`
- [ ] Tous les plannings sont créés en base de données
- [ ] Erreur `409 Conflict` si planning existe déjà
- [ ] Erreur `404 Not Found` si employee/shift/team n'existe pas
- [ ] Validation des champs (date format, UUIDs valides)

---

### TEST 4 : GET /api/v1/schedules/alerts

**Objectif** : Récupérer les alertes légales pour une période

#### Étape 4.1 : Préparer les données de test

**Important** : Pour que les alertes soient générées, il faut créer des plannings qui violent les règles :

1. **Heures hebdomadaires > 44h** :
   - Créer plusieurs shifts pour le même employé dans la même semaine
   - Totaliser plus de 44h

2. **Repos < 11h** :
   - Créer deux shifts consécutifs pour le même employé
   - Avec moins de 11h entre la fin du premier et le début du second

3. **Travail de nuit répétitif** :
   - Créer plus de 3 shifts de nuit consécutifs pour le même employé

#### Étape 4.2 : Test avec curl

```bash
curl -X GET "http://localhost:3000/api/v1/schedules/alerts?startDate=2025-01-01&endDate=2025-01-31" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

#### Étape 4.3 : Résultat attendu

```json
[
  {
    "id": "weekly-hours-EMPLOYEE_UUID-2025-01-13",
    "type": "WARNING",
    "message": "Heures hebdomadaires dépassées: 45.5h (limite: 44h)",
    "employeeId": "EMPLOYEE_UUID",
    "employeeName": "John Doe",
    "date": "2025-01-13",
    "details": {
      "hours": 45.5,
      "limit": 44
    }
  },
  {
    "id": "rest-period-EMPLOYEE_UUID-SCHEDULE_1-SCHEDULE_2",
    "type": "WARNING",
    "message": "Période de repos insuffisante: 9.5h (minimum: 11h)",
    "employeeId": "EMPLOYEE_UUID",
    "employeeName": "John Doe",
    "date": "2025-01-15",
    "details": {
      "restHours": 9.5,
      "minimum": 11
    }
  }
]
```

#### ✅ Critères de validation

- [ ] Status code : `200 OK`
- [ ] Réponse est un tableau d'alertes
- [ ] Chaque alerte a `id`, `type`, `message`
- [ ] Les types sont `WARNING` ou `CRITICAL`
- [ ] Les alertes sont correctement détectées selon les règles
- [ ] Les alertes incluent les détails pertinents

---

### TEST 5 : POST /api/v1/schedules/replacements

**Objectif** : Créer une demande de remplacement

#### Étape 5.1 : Préparer les données

```json
{
  "date": "2025-01-20",
  "originalEmployeeId": "EMPLOYEE_UUID_1",
  "replacementEmployeeId": "EMPLOYEE_UUID_2",
  "shiftId": "SHIFT_UUID_1",
  "reason": "Congé maladie"
}
```

#### Étape 5.2 : Test avec curl

```bash
curl -X POST "http://localhost:3000/api/v1/schedules/replacements" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2025-01-20",
    "originalEmployeeId": "EMPLOYEE_UUID_1",
    "replacementEmployeeId": "EMPLOYEE_UUID_2",
    "shiftId": "SHIFT_UUID_1",
    "reason": "Congé maladie"
  }'
```

#### Étape 5.3 : Résultat attendu

```json
{
  "id": "REPLACEMENT_UUID",
  "date": "2025-01-20T00:00:00.000Z",
  "originalEmployeeId": "EMPLOYEE_UUID_1",
  "replacementEmployeeId": "EMPLOYEE_UUID_2",
  "shiftId": "SHIFT_UUID_1",
  "reason": "Congé maladie",
  "status": "PENDING",
  "originalEmployee": {
    "id": "EMPLOYEE_UUID_1",
    "firstName": "John",
    "lastName": "Doe"
  },
  "replacementEmployee": {
    "id": "EMPLOYEE_UUID_2",
    "firstName": "Jane",
    "lastName": "Smith"
  },
  "shift": {
    "id": "SHIFT_UUID_1",
    "name": "Matin"
  }
}
```

#### ✅ Critères de validation

- [ ] Status code : `201 Created`
- [ ] Réponse contient tous les champs du remplacement
- [ ] `status` est `PENDING` par défaut
- [ ] Les employés et le shift sont inclus dans la réponse
- [ ] Erreur `404` si employee/shift n'existe pas

---

### TEST 6 : GET /api/v1/schedules/replacements

**Objectif** : Récupérer la liste des remplacements

#### Étape 6.1 : Test sans filtres

```bash
curl -X GET "http://localhost:3000/api/v1/schedules/replacements" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Étape 6.2 : Test avec filtres

```bash
# Filtrer par statut
curl -X GET "http://localhost:3000/api/v1/schedules/replacements?status=PENDING" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Filtrer par période
curl -X GET "http://localhost:3000/api/v1/schedules/replacements?startDate=2025-01-01&endDate=2025-01-31" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Étape 6.3 : Résultat attendu

```json
[
  {
    "id": "REPLACEMENT_UUID",
    "date": "2025-01-20T00:00:00.000Z",
    "status": "PENDING",
    "originalEmployee": {...},
    "replacementEmployee": {...},
    "shift": {...}
  }
]
```

#### ✅ Critères de validation

- [ ] Status code : `200 OK`
- [ ] Réponse est un tableau de remplacements
- [ ] Les filtres `status`, `startDate`, `endDate` fonctionnent
- [ ] Les remplacements sont triés par date décroissante

---

### TEST 7 : PATCH /api/v1/schedules/replacements/:id/approve

**Objectif** : Approuver un remplacement

#### Étape 7.1 : Créer un remplacement d'abord

```bash
# Créer un remplacement
REPLACEMENT_ID=$(curl -X POST "http://localhost:3000/api/v1/schedules/replacements" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2025-01-20",
    "originalEmployeeId": "EMPLOYEE_UUID_1",
    "replacementEmployeeId": "EMPLOYEE_UUID_2",
    "shiftId": "SHIFT_UUID_1"
  }' | jq -r '.id')
```

#### Étape 7.2 : Approuver le remplacement

```bash
curl -X PATCH "http://localhost:3000/api/v1/schedules/replacements/${REPLACEMENT_ID}/approve" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

#### Étape 7.3 : Résultat attendu

```json
{
  "id": "REPLACEMENT_UUID",
  "status": "APPROVED",
  "approvedBy": "USER_UUID",
  "approvedAt": "2025-01-15T10:30:00.000Z",
  ...
}
```

#### ✅ Critères de validation

- [ ] Status code : `200 OK`
- [ ] `status` est `APPROVED`
- [ ] `approvedBy` contient l'ID de l'utilisateur
- [ ] `approvedAt` est défini
- [ ] Erreur `404` si remplacement n'existe pas

---

### TEST 8 : PATCH /api/v1/schedules/replacements/:id/reject

**Objectif** : Rejeter un remplacement

#### Étape 8.1 : Rejeter le remplacement

```bash
curl -X PATCH "http://localhost:3000/api/v1/schedules/replacements/${REPLACEMENT_ID}/reject" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

#### Étape 8.2 : Résultat attendu

```json
{
  "id": "REPLACEMENT_UUID",
  "status": "REJECTED",
  "approvedBy": "USER_UUID",
  "approvedAt": "2025-01-15T10:30:00.000Z",
  ...
}
```

#### ✅ Critères de validation

- [ ] Status code : `200 OK`
- [ ] `status` est `REJECTED`
- [ ] `approvedBy` et `approvedAt` sont définis

---

## 🔍 TESTS D'ERREURS

### TEST E1 : Authentification manquante

```bash
curl -X GET "http://localhost:3000/api/v1/schedules/week/2025-01-15"
```

**Résultat attendu** : `401 Unauthorized`

### TEST E2 : Date invalide

```bash
curl -X GET "http://localhost:3000/api/v1/schedules/week/invalid-date" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Résultat attendu** : `400 Bad Request` ou erreur de parsing

### TEST E3 : Employee/Shift/Team inexistant

```bash
curl -X POST "http://localhost:3000/api/v1/schedules/bulk" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "schedules": [
      {
        "employeeId": "00000000-0000-0000-0000-000000000000",
        "shiftId": "SHIFT_UUID_1",
        "date": "2025-01-20"
      }
    ]
  }'
```

**Résultat attendu** : `404 Not Found` avec message "One or more employees not found"

### TEST E4 : Bulk avec tableau vide

```bash
curl -X POST "http://localhost:3000/api/v1/schedules/bulk" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "schedules": []
  }'
```

**Résultat attendu** : `400 Bad Request` avec message "Schedules array cannot be empty"

---

## 📊 CHECKLIST DE VALIDATION COMPLÈTE

### Backend - Endpoints

- [ ] `GET /api/v1/schedules/week/:date` fonctionne
- [ ] `GET /api/v1/schedules/month/:date` fonctionne
- [ ] `POST /api/v1/schedules/bulk` fonctionne
- [ ] `GET /api/v1/schedules/alerts` fonctionne
- [ ] `POST /api/v1/schedules/replacements` fonctionne
- [ ] `GET /api/v1/schedules/replacements` fonctionne
- [ ] `PATCH /api/v1/schedules/replacements/:id/approve` fonctionne
- [ ] `PATCH /api/v1/schedules/replacements/:id/reject` fonctionne

### Backend - Service AlertsService

- [ ] Détection heures hebdomadaires > 44h
- [ ] Détection repos < 11h
- [ ] Détection travail de nuit répétitif
- [ ] Détection effectif minimum

### Backend - Validations

- [ ] Validation des UUIDs
- [ ] Validation des dates
- [ ] Validation des formats (HH:mm)
- [ ] Gestion des erreurs (404, 409, 400)

### Frontend - Hooks API

- [ ] `useWeekSchedule()` fonctionne
- [ ] `useMonthSchedule()` fonctionne
- [ ] `useScheduleAlerts()` fonctionne
- [ ] `useReplacements()` fonctionne
- [ ] `useCreateReplacement()` fonctionne
- [ ] `useApproveReplacement()` fonctionne
- [ ] `useRejectReplacement()` fonctionne

---

## 🚀 COMMANDES RAPIDES POUR TESTER

### Script de test complet (à adapter avec vos UUIDs)

```bash
#!/bin/bash

# Variables
BASE_URL="http://localhost:3000/api/v1"
TOKEN="YOUR_JWT_TOKEN"
DATE="2025-01-15"

echo "=== TEST 1: Week Schedule ==="
curl -X GET "${BASE_URL}/schedules/week/${DATE}" \
  -H "Authorization: Bearer ${TOKEN}" | jq

echo -e "\n=== TEST 2: Month Schedule ==="
curl -X GET "${BASE_URL}/schedules/month/${DATE}" \
  -H "Authorization: Bearer ${TOKEN}" | jq

echo -e "\n=== TEST 3: Alerts ==="
curl -X GET "${BASE_URL}/schedules/alerts?startDate=2025-01-01&endDate=2025-01-31" \
  -H "Authorization: Bearer ${TOKEN}" | jq

echo -e "\n=== TEST 4: Replacements ==="
curl -X GET "${BASE_URL}/schedules/replacements" \
  -H "Authorization: Bearer ${TOKEN}" | jq
```

---

## 📝 NOTES IMPORTANTES

1. **Remplacez les UUIDs** : Tous les exemples utilisent des placeholders (`EMPLOYEE_UUID_1`, etc.). Remplacez-les par des UUIDs réels de votre base de données.

2. **Token JWT** : Obtenez un token JWT valide en vous connectant via `/api/v1/auth/login`

3. **Dates** : Utilisez des dates dans le futur pour vos tests (ex: 2025-01-15)

4. **Base de données** : Assurez-vous que les données de test existent avant de lancer les tests

5. **Logs** : Vérifiez les logs du backend pour voir les erreurs éventuelles

---

## ✅ RÉSULTAT ATTENDU

Après avoir exécuté tous les tests, vous devriez avoir :

- ✅ Tous les endpoints répondent correctement
- ✅ Les données sont correctement formatées
- ✅ Les validations fonctionnent
- ✅ Les erreurs sont gérées proprement
- ✅ Les hooks frontend peuvent être utilisés (testés séparément)

**Une fois tous les tests validés, vous pouvez passer à l'étape suivante : remplacement des mock data dans le frontend.**

