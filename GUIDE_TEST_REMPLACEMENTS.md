# Guide de Test - Système de Remplacement d'Employés

## 📋 Table des Matières

1. [Vue d'Ensemble](#vue-densemble)
2. [Prérequis](#prérequis)
3. [Interfaces/Endpoints Disponibles](#interfaces-endpoints-disponibles)
4. [Données de Test](#données-de-test)
5. [Scénarios de Test](#scénarios-de-test)
6. [Tests des Avertissements Non-Bloquants](#tests-des-avertissements-non-bloquants)
7. [Checklist de Test](#checklist-de-test)

---

## 🎯 Vue d'Ensemble

Le système de remplacement permet de :
- **Remplacer** un employé absent par un autre employé disponible
- **Échanger** des plannings entre deux employés
- **Obtenir des suggestions intelligentes** de remplaçants avec scoring
- **Consulter l'historique** et les statistiques des remplacements
- **Recevoir des avertissements** sans bloquer les opérations (repos insuffisant, heures dépassées)

---

## 🔧 Prérequis

### 1. Environnement
- Base de données initialisée avec migrations appliquées
- Serveur backend démarré
- Token d'authentification valide avec permissions appropriées

### 2. Permissions Requises
- `schedule.create` : Créer des remplacements/échanges
- `schedule.request_replacement` : Demander des remplacements
- `schedule.approve` : Approuver/rejeter des remplacements
- `schedule.view_all` : Voir tous les remplacements
- `schedule.view_own` : Voir ses propres remplacements

### 3. Outils de Test
- **Postman / Insomnia** : Pour tester les API REST
- **Swagger UI** : Documentation interactive (`/api/docs`)
- **cURL** : Pour tests en ligne de commande
- **Base de données** : Pour vérifier les données directement

---

## 🔌 Interfaces/Endpoints Disponibles

### Endpoints de Remplacement

| Méthode | Endpoint | Description | Permissions |
|---------|----------|-------------|-------------|
| `POST` | `/schedules/replacements` | Créer une demande de remplacement | `schedule.create`, `schedule.request_replacement` |
| `GET` | `/schedules/replacements` | Lister tous les remplacements | `schedule.view_all`, `schedule.view_own` |
| `PATCH` | `/schedules/replacements/:id/approve` | Approuver un remplacement | `schedule.approve` |
| `PATCH` | `/schedules/replacements/:id/reject` | Rejeter un remplacement | `schedule.approve` |
| `GET` | `/schedules/replacements/suggestions` | Obtenir des suggestions de remplaçants | `schedule.view_all`, `schedule.view_own` |
| `GET` | `/schedules/replacements/history` | Historique des remplacements | `schedule.view_all`, `schedule.view_own` |
| `GET` | `/schedules/replacements/stats` | Statistiques des remplacements | `schedule.view_all` |

### Endpoints d'Échange (Exchange)

| Méthode | Endpoint | Description | Permissions |
|---------|----------|-------------|-------------|
| `POST` | `/schedules/replacements/exchange` | Créer une demande d'échange | `schedule.create`, `schedule.request_replacement` |
| `PATCH` | `/schedules/replacements/exchange/:id/approve` | Approuver un échange | `schedule.approve` |

---

## 📊 Données de Test

### Structure de Données Nécessaires

```sql
-- Exemple de données de test minimales

-- 1. Employés (au moins 3)
INSERT INTO "Employee" (id, tenantId, firstName, lastName, matricule, isActive, teamId, siteId, departmentId)
VALUES 
  ('emp-001', 'tenant-1', 'Jean', 'Dupont', 'EMP001', true, 'team-1', 'site-1', 'dept-1'),
  ('emp-002', 'tenant-1', 'Marie', 'Martin', 'EMP002', true, 'team-1', 'site-1', 'dept-1'),
  ('emp-003', 'tenant-1', 'Pierre', 'Durand', 'EMP003', true, 'team-2', 'site-1', 'dept-1');

-- 2. Shifts (au moins 2)
INSERT INTO "Shift" (id, tenantId, code, name, startTime, endTime, breakDuration, isNightShift)
VALUES 
  ('shift-matin', 'tenant-1', 'M', 'Matin', '08:00', '16:00', 60, false),
  ('shift-soir', 'tenant-1', 'S', 'Soir', '14:00', '22:00', 60, false),
  ('shift-nuit', 'tenant-1', 'N', 'Nuit', '22:00', '06:00', 60, true);

-- 3. Plannings initiaux (pour les tests)
INSERT INTO "Schedule" (id, tenantId, employeeId, date, shiftId, isReplaced)
VALUES 
  ('schedule-001', 'tenant-1', 'emp-001', '2025-02-15', 'shift-matin', false),
  ('schedule-002', 'tenant-1', 'emp-002', '2025-02-15', 'shift-soir', false),
  ('schedule-003', 'tenant-1', 'emp-001', '2025-02-14', 'shift-soir', false); -- Pour test repos insuffisant

-- 4. Congé optionnel (pour tester le lien avec leaveId)
INSERT INTO "Leave" (id, tenantId, employeeId, startDate, endDate, status, leaveTypeId)
VALUES 
  ('leave-001', 'tenant-1', 'emp-001', '2025-02-15', '2025-02-15', 'APPROVED', 'leave-type-1');
```

### Variables de Test (à adapter selon vos données)

```json
{
  "tenantId": "tenant-1",
  "originalEmployeeId": "emp-001",
  "replacementEmployeeId": "emp-002",
  "shiftId": "shift-matin",
  "date": "2025-02-15",
  "reason": "Congé maladie",
  "leaveId": "leave-001"
}
```

---

## 🧪 Scénarios de Test

### 1. Créer une Demande de Remplacement

#### 1.1. Scénario de Succès (Cas Normal)

**Endpoint**: `POST /schedules/replacements`

**Requête**:
```json
{
  "date": "2025-02-15",
  "originalEmployeeId": "emp-001",
  "replacementEmployeeId": "emp-002",
  "shiftId": "shift-matin",
  "reason": "Congé maladie",
  "leaveId": "leave-001"
}
```

**Headers**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Réponse Attendue (201)**:
```json
{
  "id": "replacement-001",
  "tenantId": "tenant-1",
  "date": "2025-02-15T00:00:00.000Z",
  "originalEmployeeId": "emp-001",
  "replacementEmployeeId": "emp-002",
  "shiftId": "shift-matin",
  "status": "PENDING",
  "reason": "Congé maladie",
  "leaveId": "leave-001",
  "createdAt": "2025-02-10T10:00:00.000Z",
  "originalSchedule": {
    "id": "schedule-001",
    "employeeId": "emp-001",
    "date": "2025-02-15",
    "shiftId": "shift-matin"
  },
  "originalEmployee": {
    "id": "emp-001",
    "firstName": "Jean",
    "lastName": "Dupont"
  },
  "replacementEmployee": {
    "id": "emp-002",
    "firstName": "Marie",
    "lastName": "Martin"
  }
}
```

**Vérifications**:
- ✅ Le remplacement est créé avec le status `PENDING`
- ✅ Le planning original est lié via `originalScheduleId`
- ✅ Les notifications sont envoyées (vérifier les logs)
- ✅ Le champ `isReplaced` du planning original reste `false` (pas encore approuvé)

---

#### 1.2. Scénario d'Erreur : Employé Original Inactif

**Requête**:
```json
{
  "date": "2025-02-15",
  "originalEmployeeId": "emp-inactive", // Employé inactif
  "replacementEmployeeId": "emp-002",
  "shiftId": "shift-matin",
  "reason": "Test"
}
```

**Réponse Attendue (400)**:
```json
{
  "statusCode": 400,
  "message": "L'employé original est inactif ou n'appartient pas au tenant"
}
```

---

#### 1.3. Scénario d'Erreur : Planning Original Non Trouvé

**Requête**:
```json
{
  "date": "2025-02-20", // Date sans planning
  "originalEmployeeId": "emp-001",
  "replacementEmployeeId": "emp-002",
  "shiftId": "shift-matin",
  "reason": "Test"
}
```

**Réponse Attendue (404)**:
```json
{
  "statusCode": 404,
  "message": "Le planning original n'existe pas pour cette date"
}
```

---

#### 1.4. Scénario d'Erreur : Planning Déjà Remplacé

**Prérequis**: Créer et approuver un remplacement pour le même planning

**Requête**:
```json
{
  "date": "2025-02-15", // Même date qu'un planning déjà remplacé
  "originalEmployeeId": "emp-001",
  "replacementEmployeeId": "emp-002",
  "shiftId": "shift-matin",
  "reason": "Test"
}
```

**Réponse Attendue (400)**:
```json
{
  "statusCode": 400,
  "message": "Ce planning a déjà été remplacé"
}
```

---

#### 1.5. Scénario d'Erreur : Conflit de Planning (Même Jour)

**Requête**:
```json
{
  "date": "2025-02-15",
  "originalEmployeeId": "emp-001",
  "replacementEmployeeId": "emp-002", // Qui a déjà un planning le 15/02
  "shiftId": "shift-matin",
  "reason": "Test"
}
```

**Réponse Attendue (409 Conflict)**:
```json
{
  "statusCode": 409,
  "message": "L'employé remplaçant a déjà un planning le 2025-02-15"
}
```

---

#### 1.6. Scénario avec Avertissements (Non-Bloquant)

**Setup**: Employé avec repos < 11h ou heures > 44h

**Requête**:
```json
{
  "date": "2025-02-15",
  "originalEmployeeId": "emp-001",
  "replacementEmployeeId": "emp-002", // Qui a fini un shift à 23:00 le 14/02
  "shiftId": "shift-matin", // Qui commence à 08:00 le 15/02 (repos < 11h)
  "reason": "Test avec repos insuffisant"
}
```

**Réponse Attendue (201 avec warnings dans les logs)**:
```json
{
  "id": "replacement-002",
  "status": "PENDING",
  // ... autres champs
}
```

**Vérifications**:
- ✅ Le remplacement est créé (ne bloque pas)
- ✅ Les warnings sont loggés dans la console : `"Avertissements de repos pour remplacement: ['⚠️ Période de repos insuffisante avec le jour précédent: 9h (minimum recommandé: 11h)']"`
- ✅ Le planning original n'est pas modifié (encore en attente d'approbation)

---

### 2. Obtenir des Suggestions de Remplaçants

#### 2.1. Scénario de Succès

**Endpoint**: `GET /schedules/replacements/suggestions`

**Requête**:
```
GET /schedules/replacements/suggestions?originalEmployeeId=emp-001&date=2025-02-15&shiftId=shift-matin&maxSuggestions=10
```

**Headers**:
```
Authorization: Bearer <token>
```

**Réponse Attendue (200)**:
```json
{
  "originalEmployee": {
    "id": "emp-001",
    "firstName": "Jean",
    "lastName": "Dupont"
  },
  "totalCandidates": 5,
  "suggestions": [
    {
      "employee": {
        "id": "emp-002",
        "firstName": "Marie",
        "lastName": "Martin",
        "matricule": "EMP002",
        "team": "Équipe 1",
        "site": "Site Principal"
      },
      "score": 85,
      "reasons": [
        "Même équipe",
        "Même site",
        "Habitué à ce shift",
        "Repos suffisant",
        "Disponible le lendemain"
      ],
      "warnings": [],
      "isEligible": true
    },
    {
      "employee": {
        "id": "emp-003",
        "firstName": "Pierre",
        "lastName": "Durand"
      },
      "score": 45,
      "reasons": [
        "Même site"
      ],
      "warnings": [
        "⚠️ Repos insuffisant avec le jour précédent: 9h (minimum recommandé: 11h)",
        "⚠️ Dépassement des 44h/semaine: 46h (limite légale: 44h)"
      ],
      "isEligible": true
    }
  ]
}
```

**Vérifications**:
- ✅ Les suggestions sont triées par score décroissant
- ✅ Les candidats avec planning le même jour sont exclus
- ✅ Les warnings sont présents mais n'excluent pas les candidats
- ✅ Le score reflète les critères (équipe, site, repos, etc.)

---

#### 2.2. Scénario avec Filtres

**Requête**:
```
GET /schedules/replacements/suggestions?originalEmployeeId=emp-001&date=2025-02-15&shiftId=shift-matin&teamId=team-1&siteId=site-1
```

**Vérifications**:
- ✅ Seuls les candidats de la même équipe/site sont retournés
- ✅ Le score est ajusté en fonction des filtres

---

### 3. Lister Tous les Remplacements

#### 3.1. Scénario de Succès

**Endpoint**: `GET /schedules/replacements`

**Requête**:
```
GET /schedules/replacements?status=PENDING&startDate=2025-02-01&endDate=2025-02-28
```

**Réponse Attendue (200)**:
```json
[
  {
    "id": "replacement-001",
    "date": "2025-02-15T00:00:00.000Z",
    "status": "PENDING",
    "reason": "Congé maladie",
    "originalEmployee": {
      "id": "emp-001",
      "firstName": "Jean",
      "lastName": "Dupont"
    },
    "replacementEmployee": {
      "id": "emp-002",
      "firstName": "Marie",
      "lastName": "Martin"
    },
    "originalSchedule": {
      "id": "schedule-001",
      "date": "2025-02-15"
    },
    "replacementSchedule": null,
    "leave": {
      "id": "leave-001",
      "startDate": "2025-02-15",
      "endDate": "2025-02-15"
    }
  }
]
```

**Vérifications**:
- ✅ Les remplacements sont filtrés par status et dates
- ✅ Les relations (originalSchedule, replacementSchedule, leave) sont incluses
- ✅ Les remplacements approuvés ont un `replacementSchedule` non null

---

### 4. Approuver un Remplacement

#### 4.1. Scénario de Succès

**Endpoint**: `PATCH /schedules/replacements/:id/approve`

**Requête**:
```
PATCH /schedules/replacements/replacement-001/approve
```

**Headers**:
```
Authorization: Bearer <token>
```

**Réponse Attendue (200)**:
```json
{
  "id": "replacement-001",
  "status": "APPROVED",
  "approvedBy": "user-manager-001",
  "approvedAt": "2025-02-10T11:00:00.000Z",
  "originalSchedule": {
    "id": "schedule-001",
    "isReplaced": true,
    "replacedAt": "2025-02-10T11:00:00.000Z",
    "replacedById": "user-manager-001"
  },
  "replacementSchedule": {
    "id": "schedule-new-001",
    "employeeId": "emp-002",
    "date": "2025-02-15",
    "shiftId": "shift-matin",
    "isReplaced": false
  },
  "originalEmployee": {
    "id": "emp-001",
    "firstName": "Jean",
    "lastName": "Dupont"
  },
  "replacementEmployee": {
    "id": "emp-002",
    "firstName": "Marie",
    "lastName": "Martin"
  }
}
```

**Vérifications en Base de Données**:
```sql
-- 1. Le planning original est marqué comme remplacé (soft delete)
SELECT id, isReplaced, replacedAt, replacedById 
FROM "Schedule" 
WHERE id = 'schedule-001';
-- Résultat attendu: isReplaced = true, replacedAt et replacedById remplis

-- 2. Un nouveau planning est créé pour l'employé remplaçant
SELECT id, employeeId, date, shiftId, isReplaced 
FROM "Schedule" 
WHERE id = 'schedule-new-001';
-- Résultat attendu: employeeId = 'emp-002', date = '2025-02-15', isReplaced = false

-- 3. Le remplacement est approuvé
SELECT id, status, approvedBy, approvedAt, replacementScheduleId 
FROM "ShiftReplacement" 
WHERE id = 'replacement-001';
-- Résultat attendu: status = 'APPROVED', approvedBy et approvedAt remplis, replacementScheduleId = 'schedule-new-001'
```

**Vérifications Fonctionnelles**:
- ✅ Le planning original a `isReplaced = true` (soft delete)
- ✅ Un nouveau planning est créé pour l'employé remplaçant
- ✅ Le remplacement a le status `APPROVED`
- ✅ Les notifications sont envoyées (vérifier les logs)
- ✅ Transaction atomique (tout ou rien)

---

#### 4.2. Scénario d'Erreur : Remplacement Déjà Approuvé

**Requête**:
```
PATCH /schedules/replacements/replacement-001/approve
```

**Réponse Attendue (400)**:
```json
{
  "statusCode": 400,
  "message": "Ce remplacement a déjà été approuvé ou rejeté"
}
```

---

#### 4.3. Scénario avec Avertissements (Non-Bloquant)

**Setup**: Approuver un remplacement avec repos insuffisant (après création avec warnings)

**Vérifications**:
- ✅ Le remplacement est approuvé malgré les warnings
- ✅ Les warnings sont loggés mais n'empêchent pas l'approbation
- ✅ Le nouveau planning est créé normalement

---

### 5. Rejeter un Remplacement

#### 5.1. Scénario de Succès

**Endpoint**: `PATCH /schedules/replacements/:id/reject`

**Requête**:
```
PATCH /schedules/replacements/replacement-001/reject
```

**Réponse Attendue (200)**:
```json
{
  "id": "replacement-001",
  "status": "REJECTED",
  "rejectedBy": "user-manager-001",
  "rejectedAt": "2025-02-10T11:30:00.000Z",
  "originalSchedule": {
    "id": "schedule-001",
    "isReplaced": false
  },
  "replacementSchedule": null
}
```

**Vérifications**:
- ✅ Le status est `REJECTED`
- ✅ Le planning original reste inchangé (`isReplaced = false`)
- ✅ Aucun nouveau planning n'est créé
- ✅ Le remplacement peut être consulté dans l'historique

---

### 6. Créer un Échange (Exchange)

#### 6.1. Scénario de Succès

**Endpoint**: `POST /schedules/replacements/exchange`

**Requête**:
```json
{
  "date": "2025-02-15",
  "employeeAId": "emp-001",
  "employeeBId": "emp-002",
  "reason": "Échange pour convenance personnelle"
}
```

**Réponse Attendue (201)**:
```json
{
  "id": "exchange-001",
  "tenantId": "tenant-1",
  "date": "2025-02-15T00:00:00.000Z",
  "originalEmployeeId": "emp-001",
  "replacementEmployeeId": "emp-002",
  "status": "PENDING",
  "type": "EXCHANGE",
  "reason": "Échange pour convenance personnelle",
  "originalSchedule": {
    "id": "schedule-001",
    "employeeId": "emp-001",
    "shiftId": "shift-matin"
  }
}
```

**Vérifications**:
- ✅ L'échange est créé avec le type `EXCHANGE`
- ✅ Les deux plannings existent pour la date donnée
- ✅ Le status est `PENDING`

---

### 7. Approuver un Échange

#### 7.1. Scénario de Succès

**Endpoint**: `PATCH /schedules/replacements/exchange/:id/approve`

**Requête**:
```
PATCH /schedules/replacements/exchange/exchange-001/approve
```

**Réponse Attendue (200)**:
```json
{
  "id": "exchange-001",
  "status": "APPROVED",
  "approvedBy": "user-manager-001",
  "approvedAt": "2025-02-10T12:00:00.000Z"
}
```

**Vérifications en Base de Données**:
```sql
-- 1. Le planning de l'employé A a maintenant le shift de l'employé B
SELECT id, employeeId, shiftId, notes 
FROM "Schedule" 
WHERE id = 'schedule-001';
-- Résultat attendu: shiftId = shift de l'employé B, notes contient "Échangé avec..."

-- 2. Le planning de l'employé B a maintenant le shift de l'employé A
SELECT id, employeeId, shiftId, notes 
FROM "Schedule" 
WHERE id = 'schedule-002';
-- Résultat attendu: shiftId = shift de l'employé A, notes contient "Échangé avec..."
```

**Vérifications Fonctionnelles**:
- ✅ Les shifts sont échangés entre les deux plannings
- ✅ Les notes contiennent les informations d'échange
- ✅ Transaction atomique (les deux plannings sont mis à jour ensemble)

---

### 8. Consulter l'Historique

#### 8.1. Scénario de Succès

**Endpoint**: `GET /schedules/replacements/history`

**Requête**:
```
GET /schedules/replacements/history?employeeId=emp-001&startDate=2025-01-01&endDate=2025-02-28&status=APPROVED
```

**Réponse Attendue (200)**:
```json
[
  {
    "id": "replacement-001",
    "date": "2025-02-15T00:00:00.000Z",
    "status": "APPROVED",
    "type": "REPLACEMENT",
    "originalEmployee": {
      "firstName": "Jean",
      "lastName": "Dupont"
    },
    "replacementEmployee": {
      "firstName": "Marie",
      "lastName": "Martin"
    },
    "approvedAt": "2025-02-10T11:00:00.000Z"
  }
]
```

**Vérifications**:
- ✅ Les remplacements sont filtrés par employé, dates, et status
- ✅ L'historique inclut les remplacements et échanges

---

### 9. Consulter les Statistiques

#### 9.1. Scénario de Succès

**Endpoint**: `GET /schedules/replacements/stats`

**Requête**:
```
GET /schedules/replacements/stats?startDate=2025-01-01&endDate=2025-02-28
```

**Réponse Attendue (200)**:
```json
{
  "total": 25,
  "byStatus": [
    { "status": "APPROVED", "count": 18 },
    { "status": "PENDING", "count": 5 },
    { "status": "REJECTED", "count": 2 }
  ],
  "byReason": [
    { "reason": "Congé maladie", "count": 12 },
    { "reason": "Congé", "count": 8 },
    { "reason": "Urgence personnelle", "count": 5 }
  ],
  "topReplacers": [
    {
      "employeeId": "emp-002",
      "employeeName": "Marie Martin",
      "count": 10
    }
  ],
  "topReplaced": [
    {
      "employeeId": "emp-001",
      "employeeName": "Jean Dupont",
      "count": 5
    }
  ]
}
```

**Vérifications**:
- ✅ Les statistiques sont calculées correctement
- ✅ Les tops remplaçants/remplacés sont triés par nombre décroissant

---

## ⚠️ Tests des Avertissements Non-Bloquants

Le système **ne bloque jamais** pour les règles suivantes, mais **avertit seulement** :

### Test 1 : Repos Insuffisant (< 11h)

**Setup**:
1. Créer un planning pour `emp-002` le 14/02 avec shift qui finit à 23:00
2. Créer un remplacement pour le 15/02 avec shift qui commence à 08:00

**Requête**:
```json
{
  "date": "2025-02-15",
  "originalEmployeeId": "emp-001",
  "replacementEmployeeId": "emp-002",
  "shiftId": "shift-matin",
  "reason": "Test repos insuffisant"
}
```

**Vérifications**:
- ✅ Le remplacement est créé avec succès (201)
- ✅ Les logs contiennent : `"⚠️ Période de repos insuffisante avec le jour précédent: 9h (minimum recommandé: 11h)"`
- ✅ Le remplacement peut être approuvé malgré l'avertissement

---

### Test 2 : Heures Hebdomadaires > 44h

**Setup**:
1. Créer plusieurs plannings pour `emp-002` dans la même semaine (total > 44h)
2. Créer un remplacement qui ajoute encore des heures

**Vérifications**:
- ✅ Le remplacement est créé avec succès
- ✅ Les logs contiennent : `"⚠️ Dépassement des 44h/semaine: 46h (limite légale: 44h)"`
- ✅ Le remplacement peut être approuvé

---

### Test 3 : Jours Consécutifs >= 6

**Setup**:
1. Créer des plannings consécutifs pour `emp-002` (6+ jours)
2. Créer un remplacement qui ajoute un 7ème jour

**Vérifications**:
- ✅ Le remplacement est créé avec succès
- ✅ Les logs contiennent : `"6 jours consécutifs de travail (recommandation: repos hebdomadaire)"`
- ✅ Le remplacement peut être approuvé

---

### Test 4 : Shifts de Nuit Consécutifs >= 3

**Setup**:
1. Créer 2 shifts de nuit consécutifs pour `emp-002`
2. Créer un remplacement avec un 3ème shift de nuit

**Vérifications**:
- ✅ Le remplacement est créé avec succès
- ✅ Les logs contiennent : `"3+ shifts de nuit consécutifs (recommandation médicale: maximum 3)"`
- ✅ Le remplacement peut être approuvé

---

## ✅ Checklist de Test

### Fonctionnalités de Base

- [ ] Créer un remplacement avec succès
- [ ] Créer un remplacement avec erreurs (employé inactif, planning inexistant, etc.)
- [ ] Créer un remplacement avec avertissements (ne bloque pas)
- [ ] Lister les remplacements avec filtres
- [ ] Approuver un remplacement (vérifier soft delete et création nouveau planning)
- [ ] Rejeter un remplacement (vérifier que rien n'est modifié)
- [ ] Obtenir des suggestions de remplaçants
- [ ] Créer un échange
- [ ] Approuver un échange (vérifier swap des shifts)
- [ ] Consulter l'historique
- [ ] Consulter les statistiques

### Validations et Sécurité

- [ ] Vérifier les permissions (essayer sans permissions)
- [ ] Vérifier la validation des données (UUID invalides, dates invalides)
- [ ] Vérifier les contraintes de base (planning même jour bloque)
- [ ] Vérifier la transactionnalité (approbation atomique)

### Avertissements Non-Bloquants

- [ ] Repos insuffisant (< 11h) → Avertit mais ne bloque pas
- [ ] Heures > 44h → Avertit mais ne bloque pas
- [ ] Jours consécutifs >= 6 → Avertit mais ne bloque pas
- [ ] Shifts de nuit >= 3 → Avertit mais ne bloque pas

### Intégration et Données

- [ ] Vérifier les relations avec Leave (leaveId)
- [ ] Vérifier le soft delete (isReplaced, replacedAt)
- [ ] Vérifier les notifications (logs)
- [ ] Vérifier la traçabilité (approvedBy, approvedAt)

---

## 📝 Notes Importantes

1. **Token d'Authentification** : Toutes les requêtes nécessitent un token Bearer valide
2. **Tenant ID** : Le tenantId est extrait automatiquement du token utilisateur
3. **Format de Date** : Utiliser le format ISO 8601 (YYYY-MM-DD)
4. **Transactions** : Les approbations utilisent des transactions Prisma (atomicité garantie)
5. **Soft Delete** : Les plannings remplacés ne sont pas supprimés, mais marqués `isReplaced = true`
6. **Avertissements** : Le système avertit mais ne bloque jamais (sauf contraintes techniques)

---

## 🔍 Commandes Utiles

### Vérifier les Remplacements en Base

```sql
SELECT 
  sr.id,
  sr.status,
  sr.date,
  sr.reason,
  oe.firstName || ' ' || oe.lastName AS original_employee,
  re.firstName || ' ' || re.lastName AS replacement_employee,
  os.isReplaced AS original_schedule_replaced,
  rs.id AS replacement_schedule_id
FROM "ShiftReplacement" sr
LEFT JOIN "Employee" oe ON sr."originalEmployeeId" = oe.id
LEFT JOIN "Employee" re ON sr."replacementEmployeeId" = re.id
LEFT JOIN "Schedule" os ON sr."originalScheduleId" = os.id
LEFT JOIN "Schedule" rs ON sr."replacementScheduleId" = rs.id
WHERE sr."tenantId" = 'tenant-1'
ORDER BY sr."createdAt" DESC;
```

### Vérifier les Plannings Remplacés

```sql
SELECT 
  id,
  "employeeId",
  date,
  "isReplaced",
  "replacedAt",
  "replacedById"
FROM "Schedule"
WHERE "isReplaced" = true
  AND "tenantId" = 'tenant-1'
ORDER BY "replacedAt" DESC;
```

---

## 📚 Ressources

- **Swagger UI** : `http://localhost:3000/api/docs` (si configuré)
- **Documentation des DTOs** : Voir les fichiers dans `backend/src/modules/schedules/dto/`
- **Documentation d'implémentation** : `IMPLEMENTATION_REMPLACEMENTS.md`
- **Analyse du système** : `ANALYSE_REMPLACEMENT_EMPLOYES.md`
