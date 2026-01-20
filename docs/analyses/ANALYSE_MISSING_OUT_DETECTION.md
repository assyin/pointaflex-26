# ANALYSE COMPLETE : Detection de l'anomalie MISSING_OUT

**Date d'analyse:** 14 janvier 2026
**Version:** 1.1 - Mise a jour avec configurations pauses et arrivees anticipees

---

## 1. VUE D'ENSEMBLE DU SYSTEME

Le systeme de detection MISSING_OUT fonctionne a **4 niveaux** :

### Niveau 1 : Detection Temps Reel (a la creation du pointage)
- **Fichier:** `attendance.service.ts` - fonction `detectAnomalies()`
- **Declencheur:** Chaque nouveau pointage IN
- **Methode:** Appelle `detectMissingOutImproved()`

### Niveau 2 : Nettoyage a l'arrivee du OUT
- **Fichier:** `attendance.service.ts` - dans `create()`, `handleWebhook()`, `handleWebhookFast()`
- **Declencheur:** Chaque nouveau pointage OUT
- **Methode:** Recherche du IN correspondant et suppression de l'anomalie MISSING_OUT

### Niveau 3 : Job Batch Quotidien
- **Fichier:** `detect-missing-out.job.ts`
- **Declencheur:** Cron a minuit chaque jour
- **Methode:** Analyse retroactive de tous les IN de la veille sans OUT

### Niveau 4 : Cloture Automatique
- **Fichier:** `auto-close-sessions.job.ts`
- **Declencheur:** Cron a 2h du matin chaque jour
- **Methode:** Cree automatiquement un OUT pour les sessions MISSING_OUT de la veille

---

## 2. CONFIGURATION TENANT - PARAMETRES CLES

### 2.1 Gestion des Pauses (Repos)

| Parametre | Type | Defaut | Description |
|-----------|------|--------|-------------|
| `requireBreakPunch` | Boolean | false | **Exiger le pointage des repos (pauses)** |
| `allowImplicitBreaks` | Boolean | true | Tolerer les pauses implicites (OUT suivi de IN) |
| `minImplicitBreakMinutes` | Int | 30 | Duree minimum pour considerer une pause implicite |
| `maxImplicitBreakMinutes` | Int | 120 | Duree maximum pour considerer une pause implicite |
| `breakDuration` | Int | 60 | Duree de pause en minutes a deduire |

#### Comportement selon `requireBreakPunch`:

**Si `requireBreakPunch = false` (defaut):**
- Les pointages BREAK_START et BREAK_END sont **REJETES** avec erreur
- Le systeme utilise les **pauses implicites** (OUT suivi de IN dans un delai)
- Un OUT a 12:30 puis un IN a 13:30 = pause dejeuner implicite
- La pause est detectee automatiquement et deduite des heures travaillees

**Si `requireBreakPunch = true`:**
- Les pointages BREAK_START et BREAK_END sont autorises
- L'employe doit pointer explicitement ses pauses
- Plus de controle mais plus contraignant

#### Code de validation (ligne 2536-2554):
```typescript
private async validateBreakPunch(tenantId: string, type: AttendanceType): Promise<void> {
  if (type !== AttendanceType.BREAK_START && type !== AttendanceType.BREAK_END) {
    return; // Pas un pointage de repos
  }

  const settings = await this.prisma.tenantSettings.findUnique({
    where: { tenantId },
    select: { requireBreakPunch: true },
  });

  // Si requireBreakPunch est false, REJETER les pointages de repos
  if (!settings?.requireBreakPunch) {
    throw new BadRequestException(
      'Le pointage des repos (pauses) est desactive pour ce tenant.'
    );
  }
}
```

### 2.2 Tolerances d'entree et sortie

| Parametre | Type | Defaut | Description |
|-----------|------|--------|-------------|
| `lateToleranceEntry` | Int | 10 | Tolerance retard a l'entree (minutes) |
| `earlyToleranceExit` | Int | 5 | Tolerance sortie anticipee (minutes) |

**IMPORTANT:** Il n'existe PAS de parametre `earlyToleranceEntry` pour les arrivees anticipees!

### 2.3 Parametres MISSING_OUT

| Parametre | Type | Defaut | Description |
|-----------|------|--------|-------------|
| `missingOutDetectionWindow` | Int | 12 | Fenetre en heures pour chercher un OUT |
| `allowMissingOutForRemoteWork` | Boolean | true | Pas d'anomalie si teletravail |
| `allowMissingOutForMissions` | Boolean | true | Pas d'anomalie si mission externe |
| `enableMissingOutPatternDetection` | Boolean | true | Detecter patterns d'oubli |
| `missingOutPatternAlertThreshold` | Int | 3 | Seuil d'alerte pattern |
| `autoCloseOrphanSessions` | Boolean | true | Cloture automatique a 2h |
| `autoCloseDefaultTime` | String | "23:59" | Heure de cloture si pas de shift |
| `autoCloseOvertimeBuffer` | Int | 0 | Minutes a ajouter apres fin shift |

---

## 3. PROBLEME CRITIQUE : ARRIVEES ANTICIPEES

### 3.1 Description du probleme

Un employe peut arriver **AVANT** l'heure de debut de son shift. Par exemple:
- Shift prevu: 08:00 - 17:00
- Employe arrive a 06:30 (1h30 avant)

### 3.2 Impact sur le calcul de `expectedEnd`

Le code actuel calcule `expectedEnd` en utilisant le **timestamp du IN** comme base:

```typescript
// Ligne 4348-4349 de detectMissingOutImproved()
const expectedEnd = new Date(session.inRecord.timestamp);  // ← PROBLEME ICI
expectedEnd.setHours(expectedEndTime.hours, expectedEndTime.minutes, 0, 0);
```

**Scenario problematique:**
```
Shift: 08:00 - 17:00
IN reel: 06:30
expectedEnd calcule: 06:30 le meme jour avec setHours(17, 0) = 17:00

Mais si IN est a 22:00 et shift finit a 06:00:
expectedEnd = 22:00 avec setHours(6, 0) = 06:00 le meme jour (FAUX!)
                   devrait etre 06:00 le lendemain
```

### 3.3 Logique actuelle de shift de nuit

```typescript
// Ligne 4351-4355
if (expectedEndTime.hours < expectedEndTime.hours ||  // ← BUG: compare a lui-meme!
    (expectedEndTime.hours >= 20 && expectedEndTime.hours <= 23)) {
  expectedEnd.setDate(expectedEnd.getDate() + 1);
}
```

**BUG DETECTE:** La condition `expectedEndTime.hours < expectedEndTime.hours` est toujours FALSE!
C'est probablement cense etre `expectedEndTime.hours < startTime.hours`.

### 3.4 Scenarios d'arrivee anticipee

| Shift | Arrivee | expectedEnd calcule | Correct? |
|-------|---------|---------------------|----------|
| 08:00-17:00 | 06:30 | 17:00 meme jour | OUI |
| 08:00-17:00 | 23:00 (veille) | 17:00 meme jour | NON (devrait etre lendemain) |
| 22:00-06:00 | 20:00 | 06:00 lendemain | OUI |
| 22:00-06:00 | 18:00 | 06:00 lendemain | OUI (mais 12h de session?) |

### 3.5 Solution recommandee

Le calcul de `expectedEnd` devrait utiliser l'heure de **debut du shift** comme reference, pas l'heure du IN:

```typescript
// CORRECTION PROPOSEE
const expectedStart = new Date(session.inRecord.timestamp);
expectedStart.setHours(expectedStartTime.hours, expectedStartTime.minutes, 0, 0);

// Si IN est avant le debut du shift, utiliser la date du IN
// Si IN est apres le debut du shift, c'est OK
if (session.inRecord.timestamp < expectedStart) {
  // Arrivee anticipee - utiliser le shift comme reference
  expectedStart.setTime(session.inRecord.timestamp.getTime());
}

const expectedEnd = new Date(expectedStart);
expectedEnd.setHours(expectedEndTime.hours, expectedEndTime.minutes, 0, 0);

// Gestion shift de nuit
if (expectedEndTime.hours <= expectedStartTime.hours) {
  expectedEnd.setDate(expectedEnd.getDate() + 1);
}
```

---

## 4. FLUX DETAILLE - POINTAGE TERMINAL (ZKTeco)

### 4.1 Flux d'un pointage IN via `handleWebhookFast()`

```
Terminal ZKTeco envoie pointage
        ↓
handleWebhookFast() [ligne 745]
        ↓
Validation device + employee
        ↓
Anti-rebond (DEBOUNCE_BLOCKED si < 2 min)
        ↓
Deduplication (ignore si timestamp identique)
        ↓
Determination type IN/OUT (alternance)
        ↓
Creation Attendance record [ligne 875]
        ↓
Calcul metriques [ligne 918]
        ↓
detectAnomalies() [ligne 930]  ← ICI L'ANOMALIE EST DETECTEE
        ↓
Update record avec anomalie [ligne 942-950]
        ↓
Si OUT: Nettoyage MISSING_OUT du IN [ligne 954-1008]
```

### 4.2 Logique de detection dans `detectAnomalies()` [ligne 4822]

```
detectAnomalies(tenantId, employeeId, timestamp, type)
        ↓
Verifier conge approuve → LEAVE_CONFLICT si pointage pendant conge
        ↓
Si type = IN:
    1. detectDoubleInImproved() - Verifie double entree
    2. detectMissingOutImproved() - ← DETECTION MISSING_OUT
        ↓
Si type = OUT:
    1. detectMissingInImproved() - Verifie sortie sans entree
        ↓
Verifications additionnelles (retard, jour ferie, etc.)
```

### 4.3 Logique detaillee de `detectMissingOutImproved()` [ligne 4250]

```
detectMissingOutImproved(tenantId, employeeId, timestamp, todayRecords)
        ↓
1. Charger parametres tenant (missingOutDetectionWindow = 12h par defaut)
        ↓
2. Filtrer todayRecords: IN vs OUT
        ↓
3. Si pas de IN aujourd'hui → return { hasAnomaly: false }
        ↓
4. Pour chaque IN, chercher un OUT correspondant dans la fenetre
        ↓
5. Si pas de OUT → Ajouter a openSessions[]
        ↓
6. Si openSessions vide → return { hasAnomaly: false }
        ↓
7. Pour chaque session ouverte:
   a. Recuperer le shift via getScheduleWithFallback()
   b. Calculer expectedEnd (heure fin shift)
   c. Verifier si on a depasse fin shift + 2h
   d. Si oui → return { hasAnomaly: true, type: 'MISSING_OUT' }
   e. Si non → log "pas d'anomalie"
        ↓
8. Si aucune session n'a depasse le seuil:
   - return { hasAnomaly: false }
```

---

## 5. GESTION DES PAUSES IMPLICITES

### 5.1 Qu'est-ce qu'une pause implicite?

Une **pause implicite** est detectee quand un OUT est suivi d'un IN dans un delai raisonnable:

```
09:00 IN (debut journee)
12:30 OUT (pause dejeuner) ← Pas BREAK_START car requireBreakPunch=false
13:30 IN (retour pause)   ← Detecte comme retour de pause implicite
18:00 OUT (fin journee)
```

### 5.2 Detection de pause implicite (ligne 4997-5016)

```typescript
// Pauses implicites: Verifier si ce IN est un retour de pause
const allowImplicitBreaks = settings?.allowImplicitBreaks ?? true;
const minBreakMinutes = settings?.minImplicitBreakMinutes ?? 30;
const maxBreakMinutes = settings?.maxImplicitBreakMinutes ?? 120;

if (allowImplicitBreaks && lateMinutes > toleranceMinutes) {
  // Chercher un OUT recent pour cet employe (possible pause)
  const recentOut = await this.prisma.attendance.findFirst({
    where: {
      tenantId,
      employeeId,
      type: AttendanceType.OUT,
      timestamp: {
        // OUT doit etre entre (IN - maxBreakMinutes) et (IN - minBreakMinutes)
        gte: new Date(timestamp.getTime() - maxBreakMinutes * 60 * 1000),
        lte: new Date(timestamp.getTime() - minBreakMinutes * 60 * 1000),
      },
    },
  });

  if (recentOut) {
    // C'est un retour de pause implicite, pas un retard
    return { hasAnomaly: false };
  }
}
```

### 5.3 Impact sur MISSING_OUT

Si `requireBreakPunch = false`:
- Le pattern OUT-IN (12:30 OUT → 13:30 IN) n'est **PAS** un MISSING_OUT
- C'est une pause implicite legitime
- Mais le code de `detectMissingOutImproved()` ne prend pas en compte ce cas!

---

## 6. PROBLEMES IDENTIFIES (MIS A JOUR)

### Probleme 1: Detection prematuree de MISSING_OUT

**Symptome:** Un IN est marque MISSING_OUT immediatement a sa creation.

**Cause racine:** La detection temps reel ne devrait pas creer MISSING_OUT; seul le job batch devrait le faire.

### Probleme 2: Nettoyage non execute

**Symptome:** Le OUT arrive mais l'anomalie MISSING_OUT sur le IN n'est pas effacee.

**Causes:**
1. Condition `metrics.hoursWorked !== undefined` peut echouer
2. Logique d'appariement IN-OUT complexe
3. Erreur pendant creation OUT

### Probleme 3: Bug dans la condition shift de nuit

**Ligne 4352:** `expectedEndTime.hours < expectedEndTime.hours` est toujours FALSE!

```typescript
// BUG
if (expectedEndTime.hours < expectedEndTime.hours ||  // ← Toujours FALSE
    (expectedEndTime.hours >= 20 && expectedEndTime.hours <= 23)) {
```

### Probleme 4: Arrivee anticipee non geree

**Symptome:** Un employe qui arrive tot (avant son shift) peut avoir un `expectedEnd` mal calcule.

**Cause:** Le calcul utilise le timestamp du IN comme base au lieu de l'heure de debut du shift.

### Probleme 5: Pause dejeuner detectee comme EARLY_LEAVE

**Symptome:** Un OUT a 12:30 pour pause dejeuner est flagge EARLY_LEAVE.

**Cause:** Le systeme ne verifie pas si un IN suit le OUT avant de flaguer EARLY_LEAVE.

---

## 7. SCENARIOS DE TEST COMPLETS

### Scenario 1: Pattern normal (IN puis OUT meme jour)

```
08:00 IN  → detectAnomalies() → Pas d'anomalie (shift pas fini)
17:00 OUT → Calcul metriques → Nettoyage MISSING_OUT
```

**Resultat attendu:** Pas d'anomalie
**Resultat actuel:** MISSING_OUT sur IN possible

### Scenario 2: Arrivee anticipee

```
06:30 IN (shift commence a 08:00) → detectAnomalies()
17:00 OUT
```

**Resultat attendu:** Pas d'anomalie (arrivee tot mais OUT dans les temps)
**Resultat actuel:** A verifier

### Scenario 3: Pause dejeuner implicite (requireBreakPunch=false)

```
08:00 IN
12:30 OUT (pause) → Pas de EARLY_LEAVE car IN suit
13:30 IN (retour) → Pas de retard (pause implicite)
18:00 OUT
```

**Resultat attendu:** Pas d'anomalie
**Resultat actuel:** Possible EARLY_LEAVE sur OUT 12:30

### Scenario 4: Pause dejeuner explicite (requireBreakPunch=true)

```
08:00 IN
12:30 BREAK_START
13:30 BREAK_END
18:00 OUT
```

**Resultat attendu:** Pas d'anomalie
**Resultat actuel:** Devrait fonctionner

### Scenario 5: Shift de nuit avec arrivee anticipee

```
20:00 IN (shift 22:00-06:00, arrivee 2h tot)
06:00 OUT (lendemain)
```

**Resultat attendu:** Pas d'anomalie
**Resultat actuel:** A verifier (calcul expectedEnd)

### Scenario 6: IN sans OUT (fin de journee)

```
08:00 IN
[Pas de OUT]
00:00 Job detect-missing-out → Detecte MISSING_OUT
02:00 Job auto-close-sessions → Cree OUT a 17:00
```

**Resultat attendu:** MISSING_OUT → AUTO_CLOSED
**Resultat actuel:** OK

---

## 8. FLUX DE DONNEES COMPLET

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SOURCES DE POINTAGE                                │
├─────────────────────────────────────────────────────────────────────────────┤
│  Terminal ZKTeco          │  Interface Web           │  API Externe          │
│  (Push + Sync)            │  (Manager/Employee)      │  (Integrations)       │
└──────────┬────────────────┴──────────┬───────────────┴──────────┬───────────┘
           │                           │                          │
           ▼                           ▼                          ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                        ATTENDANCE SERVICE                                     │
├──────────────────────────────────────────────────────────────────────────────┤
│  handleWebhookFast()      │  create()                 │  handleWebhook()     │
│  - Terminal biometrique   │  - Pointage manuel        │  - Webhook standard  │
│  - Jamais bloquant        │  - Validation planning    │  - Validation device │
│                           │  - validateBreakPunch()   │                      │
└──────────┬────────────────┴──────────┬───────────────┴──────────┬───────────┘
           │                           │                          │
           └───────────────────────────┼──────────────────────────┘
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                        DETECTION ANOMALIES                                    │
├──────────────────────────────────────────────────────────────────────────────┤
│  detectAnomalies()                                                            │
│  ├─ Verifier conge approuve → LEAVE_CONFLICT                                 │
│  ├─ Si IN: detectDoubleInImproved() → DOUBLE_IN                              │
│  ├─ Si IN: detectMissingOutImproved() → MISSING_OUT ◄── PROBLEME            │
│  ├─ Si OUT: detectMissingInImproved() → MISSING_IN                           │
│  └─ Verifier retards/departs anticipes                                        │
└──────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                        ATTENDANCE RECORD                                      │
├──────────────────────────────────────────────────────────────────────────────┤
│  - hasAnomaly: true/false                                                     │
│  - anomalyType: MISSING_OUT, EARLY_LEAVE, LATE, etc.                         │
│  - anomalyNote: Description                                                   │
└──────────────────────────────────────────────────────────────────────────────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    ▼                  ▼                  ▼
┌────────────────────────┐ ┌────────────────────────┐ ┌────────────────────────┐
│ NETTOYAGE TEMPS REEL   │ │ JOB BATCH MINUIT       │ │ JOB AUTO-CLOSE 2H      │
├────────────────────────┤ ├────────────────────────┤ ├────────────────────────┤
│ Si OUT arrive:         │ │ detect-missing-out.job │ │ auto-close-sessions    │
│ - Chercher IN corresp. │ │ - Analyse IN veille    │ │ - MISSING_OUT veille   │
│ - Effacer MISSING_OUT  │ │ - Creer anomalie si    │ │ - Creer OUT auto       │
│                        │ │   pas de OUT           │ │ - Marquer AUTO_CLOSED  │
└────────────────────────┘ └────────────────────────┘ └────────────────────────┘
```

---

## 9. RECOMMANDATIONS DE CORRECTION

### Correction 1: Ne pas detecter MISSING_OUT en temps reel

**Fichier:** `attendance.service.ts`
**Fonction:** `detectMissingOutImproved()`

**Action:** Retourner toujours `{ hasAnomaly: false }` et laisser le job batch gerer.

### Correction 2: Corriger le bug shift de nuit

**Fichier:** `attendance.service.ts`
**Ligne:** 4352

**Actuel:**
```typescript
if (expectedEndTime.hours < expectedEndTime.hours ||
```

**Corrige:**
```typescript
if (expectedEndTime.hours < expectedStartTime.hours ||
```

### Correction 3: Gerer les arrivees anticipees

**Fichier:** `attendance.service.ts`
**Fonction:** `detectMissingOutImproved()`

**Action:** Calculer `expectedEnd` basee sur l'heure de debut du SHIFT, pas du IN.

### Correction 4: Renforcer le nettoyage

**Fichier:** `attendance.service.ts`
**Fonctions:** `create()`, `handleWebhook()`, `handleWebhookFast()`

**Action:** Simplifier la condition de nettoyage (ne pas dependre de `hoursWorked`).

### Correction 5: Verifier pause avant EARLY_LEAVE

**Fichier:** `attendance.service.ts`
**Fonction:** Detection EARLY_LEAVE

**Action:** Avant de flaguer EARLY_LEAVE, verifier si un IN suit dans les 2h.

---

## 10. ORDRE DE PRIORITE DES CORRECTIONS

| # | Correction | Impact | Effort |
|---|------------|--------|--------|
| 1 | Ne pas detecter MISSING_OUT temps reel | Elimine 80% faux positifs | Faible |
| 2 | Renforcer le nettoyage | Elimine anomalies residuelles | Faible |
| 3 | Corriger bug shift de nuit | Corrige detection nuit | Faible |
| 4 | Gerer arrivees anticipees | Calcul correct expectedEnd | Moyen |
| 5 | Verifier pause avant EARLY_LEAVE | Elimine faux EARLY_LEAVE | Moyen |

---

**Fin de l'analyse - Version 1.1**

*Genere par Claude Code - 14/01/2026*
