# API Endpoints - PointageFlex v1

Base URL: `/api/v1`

## Authentication

### POST /auth/login
Connexion utilisateur

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "ADMIN_RH"
  }
}
```

### POST /auth/refresh
Rafraîchir le token

**Request:**
```json
{
  "refreshToken": "eyJhbGc..."
}
```

### POST /auth/logout
Déconnexion

### POST /auth/forgot-password
Mot de passe oublié

**Request:**
```json
{
  "email": "user@example.com"
}
```

### POST /auth/reset-password
Réinitialiser mot de passe

**Request:**
```json
{
  "token": "reset-token",
  "password": "newPassword123"
}
```

---

## Tenants (Super Admin only)

### POST /tenants
Créer un nouveau tenant

**Request:**
```json
{
  "companyName": "Entreprise ABC",
  "slug": "abc-corp",
  "email": "contact@abc.com",
  "phone": "+212600000000",
  "address": "123 Rue Example, Casablanca",
  "country": "MA",
  "timezone": "Africa/Casablanca"
}
```

### GET /tenants
Liste des tenants (paginée)

**Query params:**
- `page` (default: 1)
- `limit` (default: 20)
- `search` (optionnel)

**Response:**
```json
{
  "data": [...],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

### GET /tenants/:id
Détails d'un tenant

### PATCH /tenants/:id
Modifier un tenant

### DELETE /tenants/:id
Supprimer un tenant (soft delete)

### GET /tenants/:id/settings
Paramètres du tenant

### PATCH /tenants/:id/settings
Modifier les paramètres

**Request:**
```json
{
  "workDaysPerWeek": 6,
  "maxWeeklyHours": 44,
  "lateToleranceMinutes": 15,
  "breakDuration": 60,
  "alertWeeklyHoursExceeded": true,
  "alertInsufficientRest": true,
  "annualLeaveDays": 18,
  "overtimeRate": 1.25,
  "nightShiftRate": 1.5
}
```

---

## Users

### POST /users
Créer un utilisateur

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+212600000000",
  "role": "MANAGER"
}
```

### GET /users
Liste des utilisateurs (paginée)

**Query params:**
- `page`, `limit`
- `role` (filter)
- `search`
- `isActive`

### GET /users/:id
Détails utilisateur

### PATCH /users/:id
Modifier utilisateur

### DELETE /users/:id
Désactiver utilisateur

### GET /users/me
Profil utilisateur connecté

### PATCH /users/me
Modifier son profil

### POST /users/invite
Inviter un utilisateur

**Request:**
```json
{
  "email": "newuser@example.com",
  "role": "EMPLOYEE"
}
```

---

## Employees

### POST /employees
Créer un employé

**Request:**
```json
{
  "matricule": "EMP001",
  "firstName": "Ahmed",
  "lastName": "Bennani",
  "email": "ahmed@example.com",
  "phone": "+212600000000",
  "dateOfBirth": "1990-01-15",
  "position": "Développeur",
  "hireDate": "2024-01-01",
  "contractType": "CDI",
  "siteId": "site-uuid",
  "departmentId": "dept-uuid",
  "teamId": "team-uuid",
  "currentShiftId": "shift-uuid"
}
```

### GET /employees
Liste des employés (paginée)

**Query params:**
- `page`, `limit`
- `siteId`, `departmentId`, `teamId`
- `search`
- `isActive`

### GET /employees/:id
Détails employé

### PATCH /employees/:id
Modifier employé

### DELETE /employees/:id
Désactiver employé

### POST /employees/:id/biometric
Enregistrer données biométriques

**Request:**
```json
{
  "type": "FINGERPRINT", // FINGERPRINT, FACE, RFID, QR, PIN
  "data": "base64-encoded-data"
}
```

### GET /employees/:id/attendance-summary
Résumé présence employé

**Query params:**
- `startDate`, `endDate`

---

## Sites

### POST /sites
Créer un site

**Request:**
```json
{
  "name": "Siège Casablanca",
  "address": "123 Rue Example",
  "city": "Casablanca",
  "latitude": 33.5731,
  "longitude": -7.5898
}
```

### GET /sites
Liste des sites

### PATCH /sites/:id
Modifier site

---

## Departments

### POST /departments
Créer un département

**Request:**
```json
{
  "name": "Développement",
  "code": "DEV"
}
```

### GET /departments
Liste des départements

---

## Attendance (Pointages)

### POST /attendance
Pointage manuel

**Request:**
```json
{
  "employeeId": "employee-uuid",
  "type": "IN", // IN, OUT, BREAK
  "method": "MANUAL",
  "timestamp": "2024-01-15T08:00:00Z",
  "siteId": "site-uuid",
  "latitude": 33.5731,
  "longitude": -7.5898
}
```

### POST /webhooks/attendance
Webhook pour terminaux biométriques

**Headers:**
- `X-Device-ID`: ID du terminal
- `X-API-Key`: Clé API du terminal

**Request:**
```json
{
  "employeeId": "employee-uuid",
  "type": "IN",
  "method": "FINGERPRINT",
  "timestamp": "2024-01-15T08:00:00Z",
  "rawData": {...}
}
```

### POST /attendance/import
Import CSV/Excel

**Request:**
Multipart form-data avec fichier

### GET /attendance
Liste des pointages (paginée)

**Query params:**
- `page`, `limit`
- `employeeId`
- `startDate`, `endDate`
- `siteId`
- `hasAnomaly`

### GET /attendance/:id
Détails pointage

### PATCH /attendance/:id/correct
Corriger un pointage

**Request:**
```json
{
  "timestamp": "2024-01-15T08:05:00Z",
  "type": "IN",
  "note": "Erreur de pointage"
}
```

### GET /attendance/employee/:employeeId
Pointages d'un employé

**Query params:**
- `startDate`, `endDate`

### GET /attendance/anomalies
Liste des anomalies

**Query params:**
- `page`, `limit`
- `anomalyType`
- `startDate`, `endDate`

---

## Devices (Terminaux)

### POST /devices
Enregistrer un terminal

**Request:**
```json
{
  "name": "Terminal Entrée",
  "deviceId": "DEVICE-001",
  "deviceType": "FINGERPRINT",
  "siteId": "site-uuid",
  "ipAddress": "192.168.1.100"
}
```

### GET /devices
Liste des terminaux

### PATCH /devices/:id
Modifier terminal

### DELETE /devices/:id
Désactiver terminal

---

## Shifts

### POST /shifts
Créer un shift

**Request:**
```json
{
  "name": "Matin",
  "code": "M",
  "startTime": "08:00",
  "endTime": "16:00",
  "breakDuration": 60,
  "isNightShift": false,
  "color": "#3B82F6"
}
```

### GET /shifts
Liste des shifts

### PATCH /shifts/:id
Modifier shift

### DELETE /shifts/:id
Supprimer shift

---

## Teams

### POST /teams
Créer une équipe

**Request:**
```json
{
  "name": "Équipe A",
  "code": "A",
  "description": "Équipe du matin",
  "managerId": "employee-uuid",
  "rotationEnabled": true,
  "rotationCycleDays": 7
}
```

### GET /teams
Liste des équipes

### PATCH /teams/:id
Modifier équipe

### POST /teams/:id/employees
Assigner employés à une équipe

**Request:**
```json
{
  "employeeIds": ["uuid1", "uuid2", "uuid3"]
}
```

---

## Schedules (Plannings)

### POST /schedules
Créer un planning

**Request:**
```json
{
  "employeeId": "employee-uuid",
  "shiftId": "shift-uuid",
  "date": "2024-01-15",
  "customStartTime": "08:30", // optionnel
  "customEndTime": "16:30"    // optionnel
}
```

### POST /schedules/bulk
Créer plusieurs plannings

**Request:**
```json
{
  "employeeIds": ["uuid1", "uuid2"],
  "shiftId": "shift-uuid",
  "startDate": "2024-01-15",
  "endDate": "2024-01-21"
}
```

### GET /schedules
Liste des plannings (paginée)

**Query params:**
- `page`, `limit`
- `employeeId`
- `teamId`
- `date`
- `startDate`, `endDate`

### GET /schedules/employee/:employeeId
Planning d'un employé

**Query params:**
- `startDate`, `endDate`

### GET /schedules/week/:date
Planning de la semaine

**Query params:**
- `teamId` (optionnel)
- `siteId` (optionnel)

### GET /schedules/month/:date
Planning du mois

**Response:**
```json
{
  "month": "2024-01",
  "schedules": [
    {
      "date": "2024-01-15",
      "employees": [
        {
          "employeeId": "uuid",
          "firstName": "Ahmed",
          "lastName": "Bennani",
          "shift": {
            "name": "Matin",
            "startTime": "08:00",
            "endTime": "16:00"
          }
        }
      ]
    }
  ]
}
```

### GET /schedules/alerts
Alertes légales (non bloquantes)

**Response:**
```json
{
  "alerts": [
    {
      "type": "WEEKLY_HOURS_EXCEEDED",
      "employeeId": "uuid",
      "employeeName": "Ahmed Bennani",
      "message": "Heures hebdomadaires dépassent 44h (48h)",
      "severity": "WARNING",
      "week": "2024-W03"
    },
    {
      "type": "INSUFFICIENT_REST",
      "employeeId": "uuid",
      "message": "Repos insuffisant entre shifts",
      "severity": "WARNING"
    }
  ]
}
```

---

## Replacements (Remplacements)

### POST /schedules/replacements
Demander un remplacement

**Request:**
```json
{
  "date": "2024-01-15",
  "originalEmployeeId": "uuid1",
  "replacementEmployeeId": "uuid2",
  "shiftId": "shift-uuid",
  "reason": "Congé maladie"
}
```

### GET /schedules/replacements
Liste des remplacements

**Query params:**
- `status` (PENDING, APPROVED, REJECTED)
- `date`

### PATCH /schedules/replacements/:id/approve
Approuver remplacement

**Request:**
```json
{
  "approvedBy": "manager-uuid"
}
```

### PATCH /schedules/replacements/:id/reject
Rejeter remplacement

---

## Leaves (Congés)

### POST /leaves
Demander un congé

**Request:**
```json
{
  "employeeId": "employee-uuid",
  "leaveTypeId": "leave-type-uuid",
  "startDate": "2024-01-15",
  "endDate": "2024-01-20",
  "reason": "Vacances",
  "document": "url-to-document" // optionnel
}
```

### GET /leaves
Liste des congés (paginée)

**Query params:**
- `page`, `limit`
- `employeeId`
- `status`
- `startDate`, `endDate`

### GET /leaves/:id
Détails congé

### PATCH /leaves/:id/approve
Approuver congé (Manager ou RH)

**Request:**
```json
{
  "comment": "Approuvé",
  "approverRole": "MANAGER" // MANAGER ou HR
}
```

### PATCH /leaves/:id/reject
Rejeter congé

**Request:**
```json
{
  "comment": "Période non disponible"
}
```

### GET /leaves/employee/:employeeId
Congés d'un employé

### GET /leaves/employee/:employeeId/balance
Solde congés

**Response:**
```json
{
  "employeeId": "uuid",
  "leaveTypes": [
    {
      "leaveTypeId": "uuid",
      "name": "Congé Payé",
      "acquired": 18,
      "taken": 5,
      "pending": 2,
      "remaining": 11
    }
  ]
}
```

---

## Leave Types

### POST /leave-types
Créer un type de congé

**Request:**
```json
{
  "name": "Congé Payé",
  "code": "CP",
  "isPaid": true,
  "requiresDocument": false,
  "maxDaysPerYear": 18
}
```

### GET /leave-types
Liste des types de congés

---

## Overtime (Heures Supplémentaires)

### GET /overtime
Liste des heures sup (paginée)

**Query params:**
- `page`, `limit`
- `employeeId`
- `status`
- `startDate`, `endDate`

### GET /overtime/employee/:employeeId
Heures sup d'un employé

### PATCH /overtime/:id/approve
Approuver heures sup

### POST /overtime/:id/convert-to-recovery
Convertir en récupération

**Request:**
```json
{
  "hours": 8
}
```

---

## Recovery (Récupération)

### GET /recovery/employee/:employeeId
Solde récupération employé

**Response:**
```json
{
  "employeeId": "uuid",
  "totalHours": 16,
  "usedHours": 4,
  "remainingHours": 12,
  "details": [
    {
      "id": "uuid",
      "hours": 8,
      "source": "OVERTIME",
      "remainingHours": 6,
      "expiryDate": "2024-12-31"
    }
  ]
}
```

---

## Reports (Rapports)

### GET /reports/attendance
Rapport de présence

**Query params:**
- `startDate`, `endDate`
- `employeeId`, `teamId`, `siteId`
- `format` (json, pdf, excel)

**Response (json):**
```json
{
  "period": {
    "startDate": "2024-01-01",
    "endDate": "2024-01-31"
  },
  "summary": {
    "totalEmployees": 50,
    "totalPresent": 1200,
    "totalAbsent": 50,
    "totalLate": 30
  },
  "employees": [...]
}
```

### GET /reports/leaves
Rapport congés

### GET /reports/overtime
Rapport heures supplémentaires

### GET /reports/dashboard
Tableau de bord temps réel

**Response:**
```json
{
  "today": {
    "date": "2024-01-15",
    "present": 45,
    "absent": 5,
    "late": 3,
    "onLeave": 2
  },
  "currentShifts": [
    {
      "shift": "Matin",
      "employees": 20,
      "present": 18
    }
  ],
  "recentActivity": [...]
}
```

### POST /reports/export/pdf
Exporter rapport en PDF

**Request:**
```json
{
  "reportType": "ATTENDANCE",
  "startDate": "2024-01-01",
  "endDate": "2024-01-31",
  "filters": {
    "employeeId": "uuid"
  }
}
```

**Response:**
Fichier PDF téléchargeable

### POST /reports/export/excel
Exporter rapport en Excel

### GET /reports/payroll
Export données paie

**Query params:**
- `month` (2024-01)

**Response (Excel):**
Fichier Excel avec :
- Matricule
- Nom
- Heures travaillées
- Heures sup
- Retards
- Absences
- Prêt pour import logiciel paie

---

## Audit

### GET /audit
Liste des logs d'audit (paginée)

**Query params:**
- `page`, `limit`
- `userId`
- `action` (CREATE, UPDATE, DELETE, LOGIN)
- `entity` (ATTENDANCE, LEAVE, etc.)
- `startDate`, `endDate`

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "createdAt": "2024-01-15T10:30:00Z",
      "userId": "user-uuid",
      "userName": "John Doe",
      "action": "UPDATE",
      "entity": "ATTENDANCE",
      "entityId": "attendance-uuid",
      "oldValues": {...},
      "newValues": {...},
      "ipAddress": "192.168.1.100"
    }
  ],
  "meta": {...}
}
```

### GET /audit/entity/:entity/:entityId
Historique d'une entité

---

## Notifications

### GET /notifications
Liste des notifications

**Query params:**
- `isRead` (true/false)
- `page`, `limit`

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "type": "SHIFT_CHANGE",
      "title": "Changement de shift",
      "message": "Votre shift du 15/01 a été modifié",
      "isRead": false,
      "createdAt": "2024-01-15T08:00:00Z"
    }
  ]
}
```

### PATCH /notifications/:id/read
Marquer comme lu

### PATCH /notifications/read-all
Marquer tout comme lu

---

## Holidays (Jours Fériés)

### POST /holidays
Créer jour férié

**Request:**
```json
{
  "name": "Aid Al Fitr",
  "date": "2024-04-10",
  "isRecurring": true
}
```

### GET /holidays
Liste des jours fériés

**Query params:**
- `year`

---

## Pagination Standard

Toutes les listes retournent :

```json
{
  "data": [...],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

## Error Responses

Format standard d'erreur :

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Email invalide"
    }
  ]
}
```

Codes d'erreur :
- `400` : Bad Request (validation)
- `401` : Unauthorized
- `403` : Forbidden (permissions)
- `404` : Not Found
- `409` : Conflict (doublon, etc.)
- `500` : Internal Server Error
