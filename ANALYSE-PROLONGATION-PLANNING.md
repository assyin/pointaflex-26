# Analyse : Prolongation des Plannings Rotatifs

## 1. Etat Actuel

### Plannings existants (Janvier 2026)

| Shift | Employes planifies | Type de planning |
|---|---|---|
| **SHIFT 4-2 GAB** | 20 employes (rotation) | Rotatif : 4j travail / 2j repos, cycle 6j |
| CIT Matin | 1 (compte test YASSINE TEST) | Manuel / ponctuel |
| Nuit | 1 (compte test YASSINE TEST) | Manuel / ponctuel |

**Couverture** : Du 01/01/2026 au 31/01/2026 uniquement.
**Aucun planning pour fevrier** — c'est le probleme actuel.

### Employes SANS planning (shift par defaut seulement)

| Shift par defaut | Nb employes sans planning |
|---|---|
| CIT Matin (07:00-16:00) | 62 |
| Matin (08:00-17:00) | 52 |
| Soir (17:00-02:00) | 25 |
| Nuit (23:00-07:00) | 11 |
| GAB MATIN (07:30-16:30) | 9 |
| Apres-midi (14:00-23:00) | 5 |

**Total : 165 employes** ont un `currentShiftId` mais aucun enregistrement `Schedule` (hors compte test).
**186 employes** au total dans le tenant, **185** avec un `currentShiftId` assigne.

### Departements

| Departement | Nb employes |
|---|---|
| CP | 64 |
| TF | 62 |
| GAB | 29 |
| SECURITE | 22 |
| TECHNIQUE | 3 |
| FLEET | 2 |
| IT | 2 |
| MENAGE | 2 |

---

## 2. Systeme de Generation Existant

### Ce qui existe deja dans le backend

| Fonctionnalite | Endpoint | Etat |
|---|---|---|
| Creation simple/plage | `POST /schedules` | OK |
| Creation en masse | `POST /schedules/bulk` | OK |
| Import Excel standard | `POST /schedules/import/excel` | OK |
| Import calendrier hebdo | `POST /schedules/import/weekly-calendar` | OK |
| Rotation planning (preview) | `POST /schedules/rotation/preview` | OK |
| Rotation planning (generate) | `POST /schedules/rotation/generate` | OK |
| **Prolongation planning** | **N'existe pas** | **A creer** |

### Logique de rotation actuelle (`generateRotationPlanning`)

```
Input: {
  workDays: 4,          // jours travailles
  restDays: 2,          // jours repos
  shiftId: "xxx",       // shift unique
  endDate: "2026-01-31",
  employees: [
    { employeeId: "aaa", startDate: "2026-01-01" },
    { employeeId: "bbb", startDate: "2026-01-03" },  // decalage
  ]
}

Algorithme:
  cycleLength = workDays + restDays (= 6)
  Pour chaque employe:
    dayInCycle = 0
    Pour chaque jour de startDate a endDate:
      si dayInCycle < workDays → TRAVAIL
      sinon → REPOS
      dayInCycle = (dayInCycle + 1) % cycleLength
```

**Limitation** : une fois genere, il n'y a aucun moyen de savoir quel etait le cycle original (workDays, restDays, startDate de chaque employe) pour prolonger.

---

## 3. Proposition : Feature "Prolongation de Planning"

### 3.1 Perimetre : uniquement les employes en rotation

**Principe fondamental** :
- **Employes en rotation** (ex: SHIFT 4-2 GAB) → On genere des plannings dans `Schedule` car leur cycle travail/repos est specifique et independant du calendrier.
- **Employes avec shift fixe** (CIT Matin, Matin, Soir, etc.) → **Pas besoin de planning**. Le `currentShiftId` + les jours ouvrables du tenant suffisent. Le backend utilise deja le shift par defaut quand aucun schedule n'existe.

Cela simplifie la feature : la prolongation ne concerne que les employes qui ont un planning rotatif existant.

### 3.2 Trois modes de prolongation

#### Mode A : Prolonger par Departement
```
POST /schedules/extend
{
  mode: "department",
  departmentId: "xxx",
  fromDate: "2026-02-01",
  toDate: "2026-02-28",
  options: {
    respectLeaves: true,
    respectRecoveryDays: true
  }
}
```

**Logique** :
1. Recuperer les employes du departement qui ont un planning rotatif existant
2. Detecter le pattern de rotation de chaque employe (voir 3.4)
3. Prolonger le cycle sur la nouvelle plage

#### Mode B : Prolonger par liste d'employes
```
POST /schedules/extend
{
  mode: "employees",
  employeeIds: ["aaa", "bbb", "ccc"],
  fromDate: "2026-02-01",
  toDate: "2026-02-28",
  options: { ... }
}
```

#### Mode C : Prolonger un employe unique
```
POST /schedules/extend
{
  mode: "employee",
  employeeId: "aaa",
  fromDate: "2026-02-01",
  toDate: "2026-02-28",
  options: { ... }
}
```

### 3.3 Mode "Tous" (prolongation globale des rotations)
```
POST /schedules/extend
{
  mode: "all",
  fromDate: "2026-02-01",
  toDate: "2026-02-28",
  options: { ... }
}
```

Ne traite que les employes qui ont des schedules existants avec un pattern rotatif detecte.

---

### 3.4 Preview avant generation

Comme pour la rotation, fournir un endpoint de preview :

```
POST /schedules/extend/preview
```

Retourne uniquement les employes en rotation detectee :
```json
{
  "summary": {
    "totalRotationEmployees": 20,
    "groups": [
      { "phase": 0, "count": 12 },
      { "phase": 1, "count": 4 },
      { "phase": 2, "count": 3 },
      { "phase": 3, "count": 1 }
    ],
    "withLeaveExclusions": 1,
    "totalSchedulesToCreate": 380
  },
  "employees": [
    {
      "employeeId": "aaa",
      "matricule": "01019",
      "nom": "Mounir SMIRI",
      "detectedPattern": {
        "workDays": 4,
        "restDays": 2,
        "shiftName": "SHIFT 4-2 GAB",
        "phase": 0,
        "lastScheduleDate": "2026-01-31"
      },
      "scheduleDates": ["2026-02-02", "2026-02-03", "2026-02-04", "2026-02-05", ...],
      "excludedDates": []
    }
  ]
}
```

---

### 3.5 Algorithme de detection de pattern

C'est le coeur de la feature. Pour chaque employe :

```
function detectPattern(employeeId, tenantId):

  // 1. Recuperer les 30 derniers jours de schedules
  schedules = getSchedules(employeeId, last30Days)

  // 2. Si aucun schedule → pas de pattern rotatif, cet employe est ignore
  //    (il utilise son currentShiftId + jours ouvrables du tenant)
  if (schedules.length == 0):
    return null  // pas de prolongation necessaire

  // 3. Detecter si c'est une rotation
  // Convertir les dates en bitmap (1=travail, 0=repos)
  // Chercher un cycle repetitif de longueur 3 a 14
  for cycleLength in [3..14]:
    workDays = detectCycleWorkDays(bitmap, cycleLength)
    restDays = cycleLength - workDays
    if isConsistentCycle(bitmap, workDays, restDays):
      // Calculer l'offset de phase (ou en est l'employe dans son cycle)
      phaseOffset = calculatePhase(lastScheduleDate, workDays, restDays)
      return {
        type: "rotation",
        shiftId: schedules[0].shiftId,
        workDays: workDays,
        restDays: restDays,
        phaseOffset: phaseOffset,
        lastDate: max(schedules.date)
      }

  // 4. Sinon, pattern non reconnu → ignorer (employe utilise currentShiftId)
  return null
```

### 3.6 Algorithme de prolongation

```
function extendSchedule(pattern, fromDate, toDate, options):

  schedulesToCreate = []

  if (pattern.type == "rotation"):
    // Continuer le cycle la ou il s'est arrete
    cycleLength = pattern.workDays + pattern.restDays
    // Calculer la position dans le cycle au fromDate
    daysSinceLastDate = diffDays(pattern.lastDate, fromDate)
    dayInCycle = (pattern.phaseOffset + daysSinceLastDate) % cycleLength

    for each day from fromDate to toDate:
      isWorkDay = (dayInCycle < pattern.workDays)
      if isWorkDay:
        if options.respectLeaves and hasApprovedLeave(day): skip
        if options.respectRecoveryDays and hasRecoveryDay(day): skip
        schedulesToCreate.push({ date: day, shiftId: pattern.shiftId })
      dayInCycle = (dayInCycle + 1) % cycleLength

  return schedulesToCreate
```

---

## 4. Cas specifique : SHIFT 4-2 GAB

### Donnees reelles de janvier

**21 employes** ont des plannings (dont 1 compte test YASSINE TEST avec 2 jours ponctuels hors rotation).
**20 employes** sont en rotation SHIFT 4-2 GAB.

**186 employes au total** dans le tenant, dont **185 avec un `currentShiftId`** assigne.

### Pattern reel detecte : cycle 6 jours (4 travail + 2 repos)

Les gaps entre blocs de travail sont toujours de **3 jours** (2 repos + 1er jour suivant), ce qui confirme un cycle de 6 jours : 4 jours ON, 2 jours OFF.

### 4 groupes avec decalages differents

| Groupe | Debut cycle | Employes | Matricules |
|---|---|---|---|
| **Groupe A** | 01/01 (phase 0) | 12 | 01019, 01040, 01128, 01176, 01283, 02050, 02092, 02140, 02276, 02477, 02693, 02730 |
| **Groupe B** | 02/01 (phase 1) | 4 | 01158, 01858, 02262, 02919 |
| **Groupe C** | 03/01 (phase 2) | 3 | 01007, 01859, 02466 |
| **Groupe D** | 04/01 (phase 3) | 1 | 02857 |

Cela cree un decalage entre les groupes pour assurer une couverture continue :
```
         01 02 03 04 05 06 07 08 09 10 11 12 13 ...
Groupe A: W  W  W  W  .  .  W  W  W  W  .  .  W  ...
Groupe B: .  W  W  W  W  .  .  W  W  W  W  .  .  ...
Groupe C: .  .  W  W  W  W  .  .  W  W  W  W  .  ...
Groupe D: .  .  .  W  W  W  W  .  .  W  W  W  W  ...
Presents: 12 16 19 20  8  4 13 16 19 20  8  4 13 ...
```
(W = Travail, . = Repos)

Note : 01283 (Groupe A) a 20 jours au lieu de 21 — probablement un conge approuve qui a suspendu un jour.

### Prolongation attendue pour fevrier

Pour chaque groupe, calculer ou il en est dans le cycle au 01/02/2026 :
- **Groupe A** : dernier jour = 31/01 (jour 4 du cycle = repos). Reprend le 01/02 (repos) puis travail 02-05/02
- **Groupe B** : dernier jour = 29/01. Reprend selon sa phase
- **Groupe C** : dernier jour = 30/01. Reprend selon sa phase
- **Groupe D** : dernier jour = 31/01. Reprend selon sa phase

Le cycle continue automatiquement jusqu'au 28/02/2026.

---

## 5. Plan d'implementation

### Backend (NestJS)

#### Etape 1 : DTO
Creer `extend-schedule.dto.ts` :
- `mode`: "all" | "department" | "employees" | "employee"
- `departmentId?`: string (si mode=department)
- `employeeIds?`: string[] (si mode=employees)
- `employeeId?`: string (si mode=employee)
- `fromDate`: string (YYYY-MM-DD)
- `toDate`: string (YYYY-MM-DD)
- `options.respectLeaves`: boolean (default true)
- `options.respectRecoveryDays`: boolean (default true)
- `options.overwriteExisting`: boolean (default false)

#### Etape 2 : Service
Dans `schedules.service.ts`, ajouter :
- `detectEmployeePattern(tenantId, employeeId)` — detection automatique du pattern
- `extendSchedules(tenantId, dto)` — generation des nouveaux schedules
- `previewExtendSchedules(tenantId, dto)` — preview sans creation

#### Etape 3 : Controller
Dans `schedules.controller.ts`, ajouter :
- `POST /schedules/extend/preview` — preview
- `POST /schedules/extend` — generation

#### Etape 4 : Frontend
Ajouter un bouton/modal dans la page Shifts Planning :
- Selection du mode (departement, employes, tous)
- Selection de la plage de dates
- Preview avec tableau recapitulatif
- Confirmation et generation

### Priorites

| Priorite | Tache | Complexite |
|---|---|---|
| **P0** | Detection du pattern rotation (analyse cycle 4-2 avec phase) | Moyenne |
| **P0** | Prolongation mode "all" (tous les rotatifs) | Faible |
| **P1** | Prolongation par departement | Faible |
| **P1** | Prolongation par liste d'employes / employe unique | Faible |
| **P1** | Preview endpoint | Moyenne |
| **P2** | Interface frontend (bouton + modal dans Shifts Planning) | Moyenne |
| **P2** | Respect conges approuves lors de la prolongation | Faible |

---

## 6. Besoin immediat

Pour debloquer la situation du 02/02/2026, il y a deux options rapides :

### Option A : Utiliser l'API rotation existante
Appeler `POST /schedules/rotation/generate` 4 fois (une par groupe/phase) avec les bons `startDate` par employe pour fevrier. Fonctionnel mais manuel.

### Option B : Implementer la feature de prolongation (recommande)
Ajouter l'endpoint `POST /schedules/extend` qui detecte automatiquement le pattern et prolonge. Resout le probleme pour tous les mois a venir.

### Option C : Script de prolongation temporaire
Un script Node.js qui lit les patterns de janvier et appelle l'API rotation pour generer fevrier. Solution de transition rapide.
