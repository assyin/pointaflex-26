# Exemples de Données de Test - Système de Remplacement

Ce document fournit des exemples de données JSON pour tester le système de remplacement.

---

## 📋 Structure de Base

### Tenant ID
```json
{
  "tenantId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Token d'Authentification
```
Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 👥 Employés de Test

### Employé Original (À Remplacer)
```json
{
  "id": "11111111-1111-1111-1111-111111111111",
  "firstName": "Jean",
  "lastName": "Dupont",
  "matricule": "EMP001",
  "tenantId": "550e8400-e29b-41d4-a716-446655440000",
  "isActive": true,
  "teamId": "aaaa1111-1111-1111-1111-111111111111",
  "siteId": "bbbb1111-1111-1111-1111-111111111111"
}
```

### Employé Remplaçant Idéal (Même Équipe)
```json
{
  "id": "22222222-2222-2222-2222-222222222222",
  "firstName": "Marie",
  "lastName": "Martin",
  "matricule": "EMP002",
  "tenantId": "550e8400-e29b-41d4-a716-446655440000",
  "isActive": true,
  "teamId": "aaaa1111-1111-1111-1111-111111111111",
  "siteId": "bbbb1111-1111-1111-1111-111111111111",
  "currentShiftId": "shift-jour-id"
}
```

### Employé Remplaçant Différente Équipe
```json
{
  "id": "33333333-3333-3333-3333-333333333333",
  "firstName": "Pierre",
  "lastName": "Bernard",
  "matricule": "EMP003",
  "tenantId": "550e8400-e29b-41d4-a716-446655440000",
  "isActive": true,
  "teamId": "cccc1111-1111-1111-1111-111111111111",
  "siteId": "bbbb1111-1111-1111-1111-111111111111"
}
```

### Employé avec Planning le Même Jour (Pour Test de Conflit)
```json
{
  "id": "44444444-4444-4444-4444-444444444444",
  "firstName": "Sophie",
  "lastName": "Lemaire",
  "matricule": "EMP004",
  "tenantId": "550e8400-e29b-41d4-a716-446655440000",
  "isActive": true,
  "teamId": "aaaa1111-1111-1111-1111-111111111111"
}
```

---

## ⏰ Shifts de Test

### Shift Jour (8h-17h)
```json
{
  "id": "shift-jour-001",
  "name": "Jour Standard",
  "startTime": "08:00",
  "endTime": "17:00",
  "breakDuration": 60,
  "isNightShift": false,
  "tenantId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Shift Nuit (22h-06h)
```json
{
  "id": "shift-nuit-001",
  "name": "Nuit Standard",
  "startTime": "22:00",
  "endTime": "06:00",
  "breakDuration": 60,
  "isNightShift": true,
  "tenantId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Shift Après-Midi (14h-22h)
```json
{
  "id": "shift-apresmidi-001",
  "name": "Après-Midi",
  "startTime": "14:00",
  "endTime": "22:00",
  "breakDuration": 60,
  "isNightShift": false,
  "tenantId": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

## 📅 Plannings de Test

### Planning Original (À Remplacer)
```json
{
  "id": "schedule-original-001",
  "employeeId": "11111111-1111-1111-1111-111111111111",
  "date": "2024-01-15",
  "shiftId": "shift-jour-001",
  "tenantId": "550e8400-e29b-41d4-a716-446655440000",
  "isReplaced": false,
  "replacedAt": null,
  "replacedById": null
}
```

### Planning Remplaçant (Conflit - Pour Test)
```json
{
  "id": "schedule-conflit-001",
  "employeeId": "44444444-4444-4444-4444-444444444444",
  "date": "2024-01-15",
  "shiftId": "shift-jour-001",
  "tenantId": "550e8400-e29b-41d4-a716-446655440000",
  "isReplaced": false
}
```

### Planning Veille (Pour Test Repos Insuffisant)
```json
{
  "id": "schedule-veille-001",
  "employeeId": "22222222-2222-2222-2222-222222222222",
  "date": "2024-01-14",
  "shiftId": "shift-apresmidi-001",
  "customEndTime": "22:00",
  "tenantId": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

## 📝 Requêtes de Test

### 1. Créer un Remplacement Standard

```http
POST /schedules/replacements
Authorization: Bearer {token}
Content-Type: application/json

{
  "date": "2024-01-15",
  "originalEmployeeId": "11111111-1111-1111-1111-111111111111",
  "replacementEmployeeId": "22222222-2222-2222-2222-222222222222",
  "shiftId": "shift-jour-001",
  "reason": "Congé maladie de l'employé original"
}
```

**Réponse Attendue (201 Created) :**
```json
{
  "id": "replacement-001",
  "date": "2024-01-15T00:00:00.000Z",
  "status": "PENDING",
  "type": "REPLACEMENT",
  "reason": "Congé maladie de l'employé original",
  "originalEmployeeId": "11111111-1111-1111-1111-111111111111",
  "replacementEmployeeId": "22222222-2222-2222-2222-222222222222",
  "shiftId": "shift-jour-001",
  "originalScheduleId": "schedule-original-001",
  "originalEmployee": {
    "id": "11111111-1111-1111-1111-111111111111",
    "firstName": "Jean",
    "lastName": "Dupont"
  },
  "replacementEmployee": {
    "id": "22222222-2222-2222-2222-222222222222",
    "firstName": "Marie",
    "lastName": "Martin"
  },
  "originalSchedule": {
    "id": "schedule-original-001",
    "date": "2024-01-15T00:00:00.000Z",
    "shift": {
      "id": "shift-jour-001",
      "name": "Jour Standard"
    }
  },
  "leave": null
}
```

---

### 2. Créer un Remplacement avec Lien vers Congé

```http
POST /schedules/replacements
Authorization: Bearer {token}
Content-Type: application/json

{
  "date": "2024-01-15",
  "originalEmployeeId": "11111111-1111-1111-1111-111111111111",
  "replacementEmployeeId": "22222222-2222-2222-2222-222222222222",
  "shiftId": "shift-jour-001",
  "reason": "Congé annuel",
  "leaveId": "leave-001"
}
```

---

### 3. Obtenir des Suggestions de Remplaçants

```http
GET /schedules/replacements/suggestions?originalEmployeeId=11111111-1111-1111-1111-111111111111&date=2024-01-15&shiftId=shift-jour-001
Authorization: Bearer {token}
```

**Réponse Attendue (200 OK) :**
```json
{
  "suggestions": [
    {
      "employee": {
        "id": "22222222-2222-2222-2222-222222222222",
        "firstName": "Marie",
        "lastName": "Martin",
        "matricule": "EMP002",
        "team": "Équipe A",
        "site": "Site Principal"
      },
      "score": 85,
      "reasons": [
        "Même équipe",
        "Même site",
        "Habitué à ce shift",
        "Repos suffisant",
        "Disponible la veille"
      ],
      "warnings": [],
      "isEligible": true
    },
    {
      "employee": {
        "id": "33333333-3333-3333-3333-333333333333",
        "firstName": "Pierre",
        "lastName": "Bernard",
        "matricule": "EMP003",
        "team": "Équipe B",
        "site": "Site Principal"
      },
      "score": 55,
      "reasons": [
        "Même site",
        "Disponible la veille"
      ],
      "warnings": [],
      "isEligible": true
    }
  ],
  "totalCandidates": 2
}
```

---

### 4. Suggestions avec Warnings (Repos Insuffisant)

**Contexte :** Employé avec planning finissant à 22:00 la veille, remplacement commençant à 08:00 le lendemain (< 11h de repos)

**Réponse Attendue :**
```json
{
  "suggestions": [
    {
      "employee": {
        "id": "22222222-2222-2222-2222-222222222222",
        "firstName": "Marie",
        "lastName": "Martin"
      },
      "score": 70,
      "reasons": [
        "Même équipe",
        "Même site"
      ],
      "warnings": [
        "⚠️ Repos insuffisant avec le jour précédent: 9.5h (minimum recommandé: 11h)"
      ],
      "isEligible": true
    }
  ]
}
```

---

### 5. Approuver un Remplacement

```http
PATCH /schedules/replacements/replacement-001/approve
Authorization: Bearer {token}
```

**Réponse Attendue (200 OK) :**
```json
{
  "id": "replacement-001",
  "status": "APPROVED",
  "approvedBy": "user-approver-id",
  "approvedAt": "2024-01-10T10:30:00.000Z",
  "originalScheduleId": "schedule-original-001",
  "replacementScheduleId": "schedule-replacement-001",
  "originalSchedule": {
    "id": "schedule-original-001",
    "isReplaced": true,
    "replacedAt": "2024-01-10T10:30:00.000Z",
    "replacedById": "replacement-001"
  },
  "replacementSchedule": {
    "id": "schedule-replacement-001",
    "employeeId": "22222222-2222-2222-2222-222222222222",
    "date": "2024-01-15T00:00:00.000Z",
    "shiftId": "shift-jour-001"
  }
}
```

---

### 6. Rejeter un Remplacement

```http
PATCH /schedules/replacements/replacement-001/reject
Authorization: Bearer {token}
```

**Réponse Attendue (200 OK) :**
```json
{
  "id": "replacement-001",
  "status": "REJECTED",
  "originalSchedule": {
    "id": "schedule-original-001",
    "isReplaced": false
  },
  "replacementSchedule": null
}
```

---

### 7. Créer un Échange de Plannings

```http
POST /schedules/replacements/exchange
Authorization: Bearer {token}
Content-Type: application/json

{
  "date": "2024-01-15",
  "employeeAId": "11111111-1111-1111-1111-111111111111",
  "employeeBId": "22222222-2222-2222-2222-222222222222",
  "reason": "Échange de plannings mutuellement convenu entre les deux employés"
}
```

**Réponse Attendue (201 Created) :**
```json
{
  "id": "exchange-001",
  "date": "2024-01-15T00:00:00.000Z",
  "status": "PENDING",
  "type": "EXCHANGE",
  "reason": "Échange de plannings mutuellement convenu entre les deux employés",
  "originalEmployeeId": "11111111-1111-1111-1111-111111111111",
  "replacementEmployeeId": "22222222-2222-2222-2222-222222222222",
  "originalSchedule": {
    "id": "schedule-original-001",
    "employeeId": "11111111-1111-1111-1111-111111111111",
    "shiftId": "shift-jour-001"
  }
}
```

---

### 8. Approuver un Échange

```http
PATCH /schedules/replacements/exchange/exchange-001/approve
Authorization: Bearer {token}
```

**Vérification Post-Approbation :**

Vérifier que les shifts sont bien échangés :
```http
GET /schedules?employeeId=11111111-1111-1111-1111-111111111111&date=2024-01-15
GET /schedules?employeeId=22222222-2222-2222-2222-222222222222&date=2024-01-15
```

---

### 9. Lister les Remplacements

```http
GET /schedules/replacements?status=PENDING
Authorization: Bearer {token}
```

**Réponse Attendue (200 OK) :**
```json
[
  {
    "id": "replacement-001",
    "status": "PENDING",
    "date": "2024-01-15T00:00:00.000Z",
    "originalEmployee": {
      "firstName": "Jean",
      "lastName": "Dupont"
    },
    "replacementEmployee": {
      "firstName": "Marie",
      "lastName": "Martin"
    },
    "originalSchedule": {
      "id": "schedule-original-001",
      "date": "2024-01-15T00:00:00.000Z"
    }
  }
]
```

---

### 10. Obtenir l'Historique

```http
GET /schedules/replacements/history?startDate=2024-01-01&endDate=2024-01-31&employeeId=11111111-1111-1111-1111-111111111111
Authorization: Bearer {token}
```

**Réponse Attendue (200 OK) :**
```json
[
  {
    "id": "replacement-001",
    "status": "APPROVED",
    "date": "2024-01-15T00:00:00.000Z",
    "originalEmployee": {
      "firstName": "Jean",
      "lastName": "Dupont"
    },
    "replacementEmployee": {
      "firstName": "Marie",
      "lastName": "Martin"
    },
    "originalSchedule": {
      "id": "schedule-original-001"
    },
    "replacementSchedule": {
      "id": "schedule-replacement-001"
    }
  }
]
```

---

### 11. Obtenir les Statistiques

```http
GET /schedules/replacements/stats?startDate=2024-01-01&endDate=2024-01-31
Authorization: Bearer {token}
```

**Réponse Attendue (200 OK) :**
```json
{
  "total": 15,
  "byStatus": [
    {
      "status": "APPROVED",
      "count": 10
    },
    {
      "status": "PENDING",
      "count": 3
    },
    {
      "status": "REJECTED",
      "count": 2
    }
  ],
  "byReason": [
    {
      "reason": "Congé maladie",
      "count": 5
    },
    {
      "reason": "Congé annuel",
      "count": 4
    }
  ],
  "topReplacers": [
    {
      "employeeId": "22222222-2222-2222-2222-222222222222",
      "employeeName": "Marie Martin",
      "count": 8
    }
  ],
  "topReplaced": [
    {
      "employeeId": "11111111-1111-1111-1111-111111111111",
      "employeeName": "Jean Dupont",
      "count": 5
    }
  ]
}
```

---

## ❌ Cas d'Erreur

### 1. Planning Même Jour (Conflit - 409 Conflict)

```http
POST /schedules/replacements
Authorization: Bearer {token}
Content-Type: application/json

{
  "date": "2024-01-15",
  "originalEmployeeId": "11111111-1111-1111-1111-111111111111",
  "replacementEmployeeId": "44444444-4444-4444-4444-444444444444",
  "shiftId": "shift-jour-001",
  "reason": "Test conflit"
}
```

**Réponse Attendue (409 Conflict) :**
```json
{
  "statusCode": 409,
  "message": "L'employé remplaçant a déjà un planning le 2024-01-15",
  "error": "Conflict"
}
```

---

### 2. Employé Original Sans Planning (400 Bad Request)

```http
POST /schedules/replacements
Authorization: Bearer {token}
Content-Type: application/json

{
  "date": "2024-01-15",
  "originalEmployeeId": "99999999-9999-9999-9999-999999999999",
  "replacementEmployeeId": "22222222-2222-2222-2222-222222222222",
  "shiftId": "shift-jour-001",
  "reason": "Test sans planning"
}
```

**Réponse Attendue (400 Bad Request) :**
```json
{
  "statusCode": 400,
  "message": "L'employé original n'a pas de planning à cette date",
  "error": "Bad Request"
}
```

---

### 3. Employé Inactif (400 Bad Request)

```http
POST /schedules/replacements
Authorization: Bearer {token}
Content-Type: application/json

{
  "date": "2024-01-15",
  "originalEmployeeId": "11111111-1111-1111-1111-111111111111",
  "replacementEmployeeId": "inactive-employee-id",
  "shiftId": "shift-jour-001",
  "reason": "Test employé inactif"
}
```

**Réponse Attendue (400 Bad Request) :**
```json
{
  "statusCode": 400,
  "message": "L'employé remplaçant n'est pas actif",
  "error": "Bad Request"
}
```

---

### 4. Approuver un Remplacement Déjà Approuvé (400 Bad Request)

```http
PATCH /schedules/replacements/replacement-001/approve
Authorization: Bearer {token}
```

**Réponse Attendue (400 Bad Request) :**
```json
{
  "statusCode": 400,
  "message": "Ce remplacement n'est plus en attente",
  "error": "Bad Request"
}
```

---

## 📋 Checklist de Préparation des Tests

Avant de commencer les tests, assurez-vous d'avoir :

- [ ] Au moins 4 employés actifs (original, remplaçant idéal, remplaçant différent, avec conflit)
- [ ] Au moins 2-3 shifts différents (jour, nuit, après-midi)
- [ ] Planning original pour la date de test
- [ ] Planning de conflit (même jour, autre employé) pour tester le blocage
- [ ] Planning veille pour tester repos insuffisant
- [ ] Token d'authentification valide avec les permissions nécessaires
- [ ] Tenant ID correct

---

**Note :** Remplacez tous les UUIDs et IDs par ceux de votre environnement de test réel.
