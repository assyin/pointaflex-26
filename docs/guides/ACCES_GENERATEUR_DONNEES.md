# 🔧 Accès au Générateur de Données

## 📍 Localisation

Le générateur de données est accessible via l'interface frontend et les API backend.

---

## 🌐 Accès Frontend (Interface Web)

### URL Principale

**URL du Générateur Principal** :
```
http://localhost:3001/admin/data-generator
```
ou
```
http://172.17.112.163:3001/admin/data-generator
```

### Pages Disponibles

1. **Générateur Principal** (`/admin/data-generator`)
   - Génération de pointages (attendance)
   - Génération de shifts
   - Génération de jours fériés (holidays)
   - Génération de congés (leaves)
   - Génération de plannings (schedules)

2. **Générateur de Shifts** (`/admin/data-generator-shifts`)
   - Génération et assignation de shifts aux employés

3. **Générateur de Jours Fériés** (`/admin/data-generator-holidays`)
   - Génération de jours fériés (Maroc, personnalisés)

4. **Générateur de Congés** (`/admin/data-generator-leaves`)
   - Génération de demandes de congés

---

## 🔐 Permissions Requises

### Backend (API)
- **Pointages** : `ADMIN_RH` ou `SUPER_ADMIN`
- **Shifts** : `ADMIN_RH` ou `SUPER_ADMIN`
- **Jours Fériés** : `ADMIN_RH` ou `SUPER_ADMIN`
- **Congés** : `ADMIN_RH` ou `SUPER_ADMIN`
- **Plannings** : `ADMIN_RH` ou `SUPER_ADMIN`
- **Statistiques** : `ADMIN_RH`, `SUPER_ADMIN` ou `MANAGER`

### Frontend
- La page `/admin/data-generator` n'est **pas protégée par `ProtectedRoute`** actuellement
- ⚠️ **Recommandation** : Ajouter une protection avec permission `tenant.manage_devices` ou créer une permission spécifique

---

## 🔗 Endpoints API Backend

### Base URL
```
http://localhost:3000/api/v1
```
ou
```
http://172.17.112.163:3000/api/v1
```

### 1. Pointages (Attendance)

#### Générer un pointage pour une journée
```http
POST /api/v1/data-generator/attendance/single
Authorization: Bearer {token}
Content-Type: application/json

{
  "employeeId": "uuid-employee",
  "date": "2025-01-15",
  "scenario": "normal",
  "siteId": "uuid-site" // optionnel
}
```

**Scénarios disponibles** :
- `normal` - Journée normale avec IN, BREAK_START, BREAK_END, OUT
- `late` - Retard d'arrivée (15-60 min)
- `earlyLeave` - Départ anticipé
- `mission` - Mission externe
- `doubleIn` - Double pointage d'entrée (anomalie)
- `missingOut` - Oubli de sortie (anomalie)
- `longBreak` - Pause trop longue (anomalie)
- `absence` - Absence complète (aucun pointage)

#### Génération en masse
```http
POST /api/v1/data-generator/attendance/bulk
Authorization: Bearer {token}
Content-Type: application/json

{
  "startDate": "2025-01-01",
  "endDate": "2025-01-31",
  "employeeIds": ["uuid1", "uuid2"], // optionnel, tous si vide
  "distribution": {
    "normal": 70,
    "late": 15,
    "earlyLeave": 5,
    "anomaly": 5,
    "mission": 3,
    "absence": 2
  },
  "siteId": "uuid-site" // optionnel
}
```

#### Supprimer les données générées
```http
DELETE /api/v1/data-generator/attendance/clean
Authorization: Bearer {token}
Content-Type: application/json

{
  "deleteAll": true,
  "startDate": "2025-01-01", // optionnel
  "endDate": "2025-01-31"    // optionnel
}
```

#### Statistiques
```http
GET /api/v1/data-generator/stats
Authorization: Bearer {token}
```

---

### 2. Shifts

#### Générer des shifts
```http
POST /api/v1/data-generator/shifts/generate
Authorization: Bearer {token}
Content-Type: application/json

{
  "createDefaultShifts": true,
  "assignToEmployees": true,
  "distribution": {
    "shift1-uuid": 40,
    "shift2-uuid": 40,
    "shift3-uuid": 20
  }
}
```

#### Statistiques des shifts
```http
GET /api/v1/data-generator/shifts/stats
Authorization: Bearer {token}
```

---

### 3. Jours Fériés (Holidays)

#### Générer des jours fériés
```http
POST /api/v1/data-generator/holidays/generate
Authorization: Bearer {token}
Content-Type: application/json

{
  "generateMoroccoHolidays": true,
  "startYear": 2025,
  "endYear": 2026
}
```

#### Supprimer les jours fériés générés
```http
DELETE /api/v1/data-generator/holidays/clean
Authorization: Bearer {token}
```

#### Statistiques des jours fériés
```http
GET /api/v1/data-generator/holidays/stats
Authorization: Bearer {token}
```

---

### 4. Congés (Leaves)

#### Générer des congés
```http
POST /api/v1/data-generator/leaves/generate
Authorization: Bearer {token}
Content-Type: application/json

{
  "percentage": 80,              // % d'employés à qui générer des congés
  "averageDaysPerEmployee": 5,   // Nombre moyen de jours par employé
  "startDate": "2025-01-01",
  "endDate": "2025-12-31",
  "autoApprove": false            // Approuver automatiquement les congés
}
```

#### Supprimer les congés générés
```http
DELETE /api/v1/data-generator/leaves/clean
Authorization: Bearer {token}
```

#### Statistiques des congés
```http
GET /api/v1/data-generator/leaves/stats
Authorization: Bearer {token}
```

---

### 5. Plannings (Schedules)

#### Générer des plannings
```http
POST /api/v1/data-generator/schedules/generate
Authorization: Bearer {token}
Content-Type: application/json

{
  "startDate": "2025-01-01",
  "endDate": "2025-01-31",
  "employeeIds": [],              // optionnel, tous si vide
  "teamIds": [],                  // optionnel
  "shiftIds": [],                 // optionnel
  "coverage": 85,                 // % de jours couverts
  "includeWeekends": false,
  "includeHolidays": false
}
```

#### Supprimer les plannings générés
```http
DELETE /api/v1/data-generator/schedules/clean
Authorization: Bearer {token}
```

#### Statistiques des plannings
```http
GET /api/v1/data-generator/schedules/stats
Authorization: Bearer {token}
```

---

## 📋 Fonctionnalités Disponibles

### Générateur Principal (`/admin/data-generator`)

1. **Génération Rapide de Pointages**
   - Génération pour les X derniers jours
   - Distribution configurable (normal, retards, anomalies, etc.)
   - Exclusion des weekends et jours fériés
   - Génération optionnelle d'heures supplémentaires

2. **Génération Personnalisée**
   - Sélection de période personnalisée
   - Sélection d'employés spécifiques
   - Distribution personnalisée des scénarios

3. **Nettoyage des Données**
   - Suppression de toutes les données générées
   - Suppression par période

4. **Statistiques**
   - Nombre de pointages générés
   - Répartition par scénario
   - Nombre d'anomalies détectées

5. **Génération de Shifts**
   - Création de shifts par défaut
   - Assignation aux employés selon distribution

6. **Génération de Jours Fériés**
   - Génération automatique des jours fériés marocains
   - Génération pour une période donnée

7. **Génération de Congés**
   - Génération de demandes de congés
   - Distribution aléatoire parmi les employés
   - Option d'approbation automatique

8. **Génération de Plannings**
   - Génération de plannings pour une période
   - Assignation de shifts aux employés
   - Gestion de la couverture (%)

---

## ⚠️ Note Importante

**La page `/admin/data-generator` n'est actuellement pas visible dans le sidebar.**

Pour y accéder, vous devez :
1. **Accéder directement via l'URL** : `http://localhost:3001/admin/data-generator`
2. **Ou ajouter un lien dans le sidebar** (recommandé)

---

## 🔧 Ajout au Sidebar (Recommandé)

Pour rendre le générateur accessible depuis le sidebar, ajoutez ceci dans `frontend/components/layout/sidebar.tsx` :

```typescript
import { Database } from 'lucide-react'; // Ajouter l'import

// Dans le tableau menuItems, ajouter :
{
  label: 'Générateur de données',
  href: '/admin/data-generator',
  icon: Database,
  permissions: ['tenant.manage_devices'], // Ou créer une permission spécifique
},
```

---

## 📚 Documentation Complémentaire

- **Documentation complète du module** : `backend/src/modules/data-generator/README.md`
- **Script de test** : `backend/scripts/test-data-generator.sh`

---

**Date de création** : 2025-12-12

