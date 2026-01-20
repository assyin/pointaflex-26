# Analyse Complète du Système de Pointage et Détection d'Anomalies

## 📋 Table des Matières
1. [Vue d'ensemble](#vue-densemble)
2. [Types de Pointages](#types-de-pointages)
3. [Cas Normaux de Pointage](#cas-normaux-de-pointage)
4. [Détection et Gestion des Anomalies](#détection-et-gestion-des-anomalies)
5. [Calcul des Métriques](#calcul-des-métriques)
6. [Workflow de Correction](#workflow-de-correction)
7. [Notifications](#notifications)
8. [Corrections et Implémentations Nécessaires](#corrections-et-implémentations-nécessaires)
   - [Section 1 : Absence](#section-1--absence-priorité-haute)
   - [Section 2 : Autres Types d'Anomalies](#section-2--autres-types-danomalies-à-venir)

---

## 🎯 Vue d'ensemble

Le système de pointage de PointaFlex détecte automatiquement les anomalies lors de la création de chaque pointage. La détection se fait en temps réel via la fonction `detectAnomalies()` qui est appelée à chaque création de pointage.

**Point d'entrée** : `backend/src/modules/attendance/attendance.service.ts` → `create()`

**Flux de traitement** :
1. Validation de l'employé
2. Validation de la configuration (pauses)
3. **Détection des anomalies** ← Point clé
4. **Calcul des métriques** (heures travaillées, retards, etc.)
5. Création du pointage avec les flags d'anomalie
6. Notification des managers si anomalie détectée

---

## 📝 Types de Pointages

### Enum `AttendanceType`
- **IN** : Pointage d'entrée
- **OUT** : Pointage de sortie
- **BREAK_START** : Début de pause
- **BREAK_END** : Fin de pause
- **MISSION_START** : Début de mission (externe)
- **MISSION_END** : Fin de mission (externe)

### Méthodes de Pointage (`DeviceType`)
- BIOMETRIC / FINGERPRINT : Empreinte digitale
- FACIAL / FACE_RECOGNITION : Reconnaissance faciale
- RFID / RFID_BADGE : Badge RFID
- QR_CODE : QR Code
- PIN / PIN_CODE : Code PIN
- MOBILE_GPS : Application mobile avec géolocalisation
- MANUAL : Saisie manuelle
- IMPORT : Import de données

---

## ✅ Cas Normaux de Pointage

### 1. **Pointage Normal Complet (Journée Standard)**

**Scénario** :
- Entrée (IN) à l'heure prévue ou dans la tolérance
- Sortie (OUT) à l'heure prévue ou dans la tolérance
- Pas de pause ou pauses correctement pointées

**Conditions** :
- Planning existe pour la date (`Schedule` avec `Shift`)
- Heure d'entrée ≤ heure prévue + tolérance (`lateToleranceEntry`, défaut: 10 min)
- Heure de sortie ≥ heure prévue - tolérance (`earlyToleranceExit`, défaut: 5 min)
- Pas de double pointage IN
- Pas de pointage OUT sans IN précédent

**Résultat** :
- `hasAnomaly = false`
- `hoursWorked` calculé (OUT - IN)
- `lateMinutes = 0` ou `null`
- `earlyLeaveMinutes = 0` ou `null`
- `overtimeMinutes` calculé si heures > heures prévues

---

### 2. **Pointage avec Pauses**

**Scénario** :
- IN → BREAK_START → BREAK_END → OUT

**Validation** :
- La configuration des pauses doit être activée (`validateBreakPunch()`)
- Les pauses doivent être pointées dans l'ordre
- La durée de pause est soustraite du calcul des heures travaillées

**Résultat** :
- Pointage normal si toutes les conditions sont respectées
- Les heures travaillées = (OUT - IN) - durée des pauses

---

### 3. **Pointage Mission (Externe)**

**Scénario** :
- MISSION_START → MISSION_END

**Caractéristiques** :
- Ne génère pas d'anomalies automatiquement
- Utilisé pour le contexte métier
- Peut être combiné avec des pointages normaux

---

## 🚨 Détection et Gestion des Anomalies

### Mécanisme de Détection

La fonction `detectAnomalies()` est appelée **à chaque création de pointage** et vérifie plusieurs conditions dans l'ordre :

```typescript
detectAnomalies(tenantId, employeeId, timestamp, type)
```

**Période analysée** : Journée complète (00:00:00 à 23:59:59 du jour du pointage)

**Données récupérées** :
- Tous les pointages de l'employé pour la journée
- Le planning (`Schedule`) de l'employé pour la date
- Le shift associé (`Shift`) avec heures de début/fin
- Les paramètres du tenant (`TenantSettings`) : tolérances, jours ouvrables
- Les congés approuvés (`Leave`) pour la date

---

### 🔴 Type 1 : DOUBLE_IN (Double Entrée)

**Quand est détecté** :
- Lors d'un pointage **IN** (entrée)
- Si un pointage **IN** existe déjà pour la même journée

**Logique** :
```typescript
if (type === AttendanceType.IN) {
  const hasIn = todayRecords.some(r => r.type === AttendanceType.IN);
  if (hasIn) {
    return { hasAnomaly: true, type: 'DOUBLE_IN', note: 'Double pointage d\'entrée détecté' };
  }
}
```

**Exemple** :
- 08:00 → IN ✅
- 08:30 → IN ❌ **DOUBLE_IN**

**Gestion** :
- Le pointage est créé avec `hasAnomaly = true`
- Notification envoyée aux managers
- Peut être corrigé manuellement

---

### 🔴 Type 2 : MISSING_IN (Sortie sans Entrée)

**Quand est détecté** :
- Lors d'un pointage **OUT** (sortie)
- Si aucun pointage **IN** n'existe pour la journée

**Logique** :
```typescript
if (type === AttendanceType.OUT) {
  const hasIn = todayRecords.some(r => r.type === AttendanceType.IN);
  if (!hasIn) {
    return { hasAnomaly: true, type: 'MISSING_IN', note: 'Pointage de sortie sans entrée' };
  }
}
```

**Exemple** :
- 17:00 → OUT ❌ **MISSING_IN** (pas d'IN avant)

**Gestion** :
- Pointage créé avec anomalie
- Notification managers
- Correction possible avec note explicative

---

### 🔴 Type 3 : MISSING_OUT (Entrée sans Sortie)

**Quand est détecté** :
- Lors d'un pointage **IN** (entrée)
- Si le nombre de pointages IN > nombre de pointages OUT pour la journée

**Logique** :
```typescript
if (type === AttendanceType.IN) {
  const inRecords = todayRecords.filter(r => r.type === AttendanceType.IN);
  const outRecords = todayRecords.filter(r => r.type === AttendanceType.OUT);
  if (inRecords.length > outRecords.length) {
    return { hasAnomaly: true, type: 'MISSING_OUT', note: 'Entrée détectée sans sortie correspondante' };
  }
}
```

**Exemple** :
- 08:00 → IN ✅
- 08:30 → IN ❌ **MISSING_OUT** (première entrée n'a pas de sortie)

**Note** : Cette anomalie est détectée lors du **deuxième IN**, pas à la fin de journée. Pour détecter une absence de sortie en fin de journée, il faudrait un job batch.

**Gestion** :
- Pointage créé avec anomalie
- Notification managers
- Correction possible

---

### 🟡 Type 4 : LATE (Retard)

**Quand est détecté** :
- Lors d'un pointage **IN** (entrée)
- Si l'heure d'entrée > heure prévue + tolérance

**Conditions préalables** :
- Un planning (`Schedule`) doit exister pour la date
- Un shift avec heure de début doit être défini

**Logique** :
```typescript
if (type === AttendanceType.IN) {
  const schedule = await getSchedule(); // Avec shift
  if (schedule?.shift) {
    const expectedStartTime = parseTimeString(schedule.customStartTime || schedule.shift.startTime);
    const expectedStart = new Date(timestamp);
    expectedStart.setHours(expectedStartTime.hours, expectedStartTime.minutes, 0, 0);
    
    const toleranceMinutes = settings?.lateToleranceEntry || 10; // Défaut: 10 minutes
    const lateMinutes = (timestamp.getTime() - expectedStart.getTime()) / (1000 * 60);
    
    if (lateMinutes > toleranceMinutes) {
      return { hasAnomaly: true, type: 'LATE', note: `Retard de ${Math.round(lateMinutes)} minutes détecté` };
    }
  }
}
```

**Exemple** :
- Planning : 08:00 - 17:00
- Tolérance : 10 minutes
- Pointage IN à 08:15 → ✅ Normal (dans la tolérance)
- Pointage IN à 08:11 → ❌ **LATE** (11 > 10)

**Paramètres configurables** :
- `lateToleranceEntry` : Tolérance en minutes (défaut: 10)
- Heure prévue : `schedule.customStartTime` ou `schedule.shift.startTime`

**Gestion** :
- Pointage créé avec `lateMinutes` calculé
- Notification managers
- Correction possible si justifié

---

### 🟡 Type 5 : EARLY_LEAVE (Départ Anticipé)

**Quand est détecté** :
- Lors d'un pointage **OUT** (sortie)
- Si l'heure de sortie < heure prévue - tolérance

**Conditions préalables** :
- Un planning (`Schedule`) doit exister pour la date
- Un shift avec heure de fin doit être défini

**Logique** :
```typescript
if (type === AttendanceType.OUT) {
  const schedule = await getSchedule(); // Avec shift
  if (schedule?.shift) {
    const expectedEndTime = parseTimeString(schedule.customEndTime || schedule.shift.endTime);
    const expectedEnd = new Date(timestamp);
    expectedEnd.setHours(expectedEndTime.hours, expectedEndTime.minutes, 0, 0);
    
    const toleranceMinutes = settings?.earlyToleranceExit || 5; // Défaut: 5 minutes
    const earlyLeaveMinutes = (expectedEnd.getTime() - timestamp.getTime()) / (1000 * 60);
    
    if (earlyLeaveMinutes > toleranceMinutes) {
      return { hasAnomaly: true, type: 'EARLY_LEAVE', note: `Départ anticipé de ${Math.round(earlyLeaveMinutes)} minutes détecté` };
    }
  }
}
```

**Exemple** :
- Planning : 08:00 - 17:00
- Tolérance : 5 minutes
- Pointage OUT à 16:55 → ✅ Normal (dans la tolérance)
- Pointage OUT à 16:54 → ❌ **EARLY_LEAVE** (6 > 5)

**Paramètres configurables** :
- `earlyToleranceExit` : Tolérance en minutes (défaut: 5)
- Heure prévue : `schedule.customEndTime` ou `schedule.shift.endTime`

**Gestion** :
- Pointage créé avec `earlyLeaveMinutes` calculé
- Notification managers
- Correction possible si justifié

---

### 🔴 Type 6 : ABSENCE (Absence)

L'absence peut être détectée dans **plusieurs contextes** selon les standards RH professionnels. Le système actuel ne couvre qu'un seul cas (Cas A). Voici l'analyse complète :

---

#### ✅ **Cas A – Absence détectée lors d'un pointage IN** (IMPLÉMENTÉ)

**Quand est détecté** :
- Lors d'un pointage **IN** (entrée)
- Si **PAS de planning** pour la date
- ET si c'est un **jour ouvrable**
- ET si **PAS de congé approuvé** pour cette date

**Logique actuelle** :
```typescript
if (type === AttendanceType.IN) {
  const schedule = await getSchedule();
  
  if (!schedule) {
    // Pas de planning - vérifier si jour ouvrable
    const settings = await getTenantSettings();
    const dayOfWeek = timestamp.getDay();
    const workingDays = settings?.workingDays || [1, 2, 3, 4, 5, 6];
    
    if (workingDays.includes(dayOfWeek === 0 ? 7 : dayOfWeek)) {
      const leave = await getApprovedLeave();
      
      if (!leave) {
        return { hasAnomaly: true, type: 'ABSENCE', note: 'Absence détectée : pointage sans planning ni congé approuvé' };
      }
    }
  }
}
```

**Exemple** :
- Lundi (jour ouvrable)
- Pas de planning créé pour l'employé
- Pas de congé approuvé
- Pointage IN à 10:00 → ❌ **ABSENCE** (présence non autorisée)

**Interprétation métier** :
L'employé n'était pas censé travailler, mais s'est présenté sans autorisation → anomalie RH.

**Statut** : ✅ **IMPLÉMENTÉ**

---

#### ❌ **Cas B – Absence sans aucun pointage** (NON IMPLÉMENTÉ)

**Le cas le plus courant en gestion RH**

**Conditions** :
- ✅ Jour ouvrable
- ✅ Planning existant pour la date
- ❌ Aucun pointage IN de la journée
- ❌ Aucun congé approuvé

**Résultat attendu** :
- ❌ **ABSENCE** (absence complète)

**Exemple** :
- Planning : 08:00 – 17:00
- Aucun badgeage de la journée
- Pas de congé approuvé
- → **ABSENCE** détectée

**Détection requise** :
- **Job batch quotidien** qui analyse les jours sans pointage
- Exécution : Fin de journée ou début de journée suivante
- Création d'un enregistrement d'absence si conditions remplies

**Statut** : ❌ **À IMPLÉMENTER**

---

#### ❌ **Cas C – Absence partielle** (NON IMPLÉMENTÉ)

**Conditions** :
- ✅ Planning existant
- ✅ Pointage IN tardif extrême (après seuil configurable)
- ❌ Pas de justification

**Résultat attendu** :
- Soit **ABSENCE_PARTIAL** (absence matin)
- Soit **ABSENCE** (absence journée complète selon règles)

**Exemple** :
- Planning : 08:00
- Seuil absence partielle : 2 heures (configurable)
- Pointage IN à 14:00 (6h de retard)
- → **ABSENCE_PARTIAL** ou **ABSENCE** selon règles

**Logique requise** :
```typescript
if (type === AttendanceType.IN && schedule?.shift) {
  const expectedStartTime = parseTimeString(schedule.shift.startTime);
  const lateHours = (timestamp.getTime() - expectedStart.getTime()) / (1000 * 60 * 60);
  
  const absenceThreshold = settings?.absencePartialThreshold || 2; // Heures
  
  if (lateHours >= absenceThreshold) {
    // Absence partielle ou totale selon règles
    return { hasAnomaly: true, type: 'ABSENCE_PARTIAL', note: `Absence partielle : arrivée ${lateHours.toFixed(1)}h après l'heure prévue` };
  }
}
```

**Statut** : ❌ **À IMPLÉMENTER**

---

#### ❌ **Cas D – Planning supprimé / non validé** (NON IMPLÉMENTÉ)

**Conditions** :
- ✅ Jour ouvrable
- ❌ Planning non publié / supprimé / non validé
- ❌ Pas de congé approuvé
- Aucun pointage ou pointage isolé

**Résultat attendu** :
- ❌ **ABSENCE_TECHNICAL** ou **ABSENCE**

**Exemple** :
- Planning créé mais non publié
- Employé se présente et pointe
- → **ABSENCE_TECHNICAL** (problème de synchronisation)

**Cas fréquent** dans les systèmes mal synchronisés entre :
- Système de planning
- Système de pointage
- Système de congés

**Statut** : ❌ **À IMPLÉMENTER**

---

#### ❌ **Cas E – Pointage invalide (erreur technique)** (NON IMPLÉMENTÉ)

**Conditions** :
- ✅ Planning existant
- ❌ Tentative de pointage rejetée (badge non reconnu, device off, erreur réseau)
- ❌ Aucun pointage valide enregistré
- ❌ Pas de congé approuvé

**Résultat attendu** :
- ❌ **ABSENCE** (à régulariser manuellement)

**Exemple** :
- Employé tente de pointer mais badge non reconnu
- Device hors service
- Aucun pointage enregistré
- → **ABSENCE** à corriger manuellement

**Détection requise** :
- Logs d'erreurs de pointage
- Tentatives de pointage échouées
- Reconnaissance automatique des erreurs techniques

**Statut** : ❌ **À IMPLÉMENTER**

---

#### 📊 **Résumé des Cas d'Absence**

| Cas | Description | Statut | Priorité |
|-----|------------|--------|----------|
| **A** | Pointage IN sans planning | ✅ Implémenté | - |
| **B** | Absence complète (pas de pointage) | ❌ À implémenter | 🔴 Haute |
| **C** | Absence partielle (arrivée très tardive) | ❌ À implémenter | 🟡 Moyenne |
| **D** | Planning supprimé/non validé | ❌ À implémenter | 🟡 Moyenne |
| **E** | Pointage invalide (erreur technique) | ❌ À implémenter | 🟡 Faible |

---

### 🔴 Type 7 : INSUFFICIENT_REST (Repos Insuffisant)

**Quand est détecté** :
- Lors d'un pointage **IN** (entrée)
- Si le temps de repos entre la dernière sortie et cette entrée < minimum requis

**Logique** :
```typescript
if (type === AttendanceType.IN) {
  const lastOutRecord = await getLastOutRecord(); // Dernier OUT avant ce IN
  
  if (lastOutRecord) {
    const restHours = (timestamp.getTime() - lastOutRecord.timestamp.getTime()) / (1000 * 60 * 60);
    
    // Vérifier si shift de nuit
    const schedule = await getSchedule();
    const isNightShift = schedule?.shift?.isNightShift || false;
    
    // Repos minimum : 11h pour shift normal, 12h pour shift de nuit
    const minimumRestHours = isNightShift ? 12 : 11;
    
    if (restHours < minimumRestHours) {
      return { hasAnomaly: true, type: 'INSUFFICIENT_REST', note: `Repos insuffisant : ${restHours.toFixed(2)}h (minimum: ${minimumRestHours}h)` };
    }
  }
}
```

**Exemple** :
- Sortie hier : 17:00
- Entrée aujourd'hui : 06:00
- Repos : 13 heures → ✅ Normal
- Entrée aujourd'hui : 05:00
- Repos : 12 heures → ✅ Normal (shift normal)
- Entrée aujourd'hui : 04:00
- Repos : 11 heures → ❌ **INSUFFICIENT_REST** (shift normal, minimum 11h)

**Règles** :
- **Shift normal** : Minimum 11 heures de repos
- **Shift de nuit** : Minimum 12 heures de repos

**Gestion** :
- Pointage créé avec anomalie
- Notification managers
- Correction possible avec justification
- Peut nécessiter approbation selon les règles

---

## 📊 Calcul des Métriques

La fonction `calculateMetrics()` est appelée **à chaque création de pointage** pour calculer :

### 1. **Heures Travaillées (`hoursWorked`)**

**Quand calculé** : Lors d'un pointage **OUT**

**Formule** :
```typescript
if (type === AttendanceType.OUT) {
  const inRecord = todayRecords.find(r => r.type === AttendanceType.IN);
  if (inRecord) {
    const hoursWorked = (timestamp.getTime() - inRecord.timestamp.getTime()) / (1000 * 60 * 60);
    metrics.hoursWorked = Math.max(0, hoursWorked);
  }
}
```

**Exemple** :
- IN : 08:00
- OUT : 17:00
- `hoursWorked = 9.0` heures

**Note** : Les pauses ne sont pas soustraites dans ce calcul initial. Elles sont gérées séparément.

---

### 2. **Minutes de Retard (`lateMinutes`)**

**Quand calculé** : Lors d'un pointage **IN**

**Formule** :
```typescript
if (type === AttendanceType.IN) {
  const schedule = await getSchedule();
  if (schedule?.shift) {
    const expectedStartTime = parseTimeString(schedule.customStartTime || schedule.shift.startTime);
    const expectedStart = new Date(timestamp);
    expectedStart.setHours(expectedStartTime.hours, expectedStartTime.minutes, 0, 0);
    
    const toleranceMinutes = settings?.lateToleranceEntry || 10;
    const lateMinutes = Math.max(0, (timestamp.getTime() - expectedStart.getTime()) / (1000 * 60) - toleranceMinutes);
    
    if (lateMinutes > 0) {
      metrics.lateMinutes = Math.round(lateMinutes);
    }
  }
}
```

**Exemple** :
- Heure prévue : 08:00
- Tolérance : 10 minutes
- Pointage IN : 08:15
- `lateMinutes = 5` (15 - 10)

**Note** : Si le retard est dans la tolérance, `lateMinutes = 0` ou `null`.

---

### 3. **Minutes de Départ Anticipé (`earlyLeaveMinutes`)**

**Quand calculé** : Lors d'un pointage **OUT**

**Formule** :
```typescript
if (type === AttendanceType.OUT) {
  const schedule = await getSchedule();
  if (schedule?.shift) {
    const expectedEndTime = parseTimeString(schedule.customEndTime || schedule.shift.endTime);
    const expectedEnd = new Date(timestamp);
    expectedEnd.setHours(expectedEndTime.hours, expectedEndTime.minutes, 0, 0);
    
    const toleranceMinutes = settings?.earlyToleranceExit || 5;
    const earlyLeaveMinutes = Math.max(0, (expectedEnd.getTime() - timestamp.getTime()) / (1000 * 60) - toleranceMinutes);
    
    if (earlyLeaveMinutes > 0) {
      metrics.earlyLeaveMinutes = Math.round(earlyLeaveMinutes);
    }
  }
}
```

**Exemple** :
- Heure prévue : 17:00
- Tolérance : 5 minutes
- Pointage OUT : 16:50
- `earlyLeaveMinutes = 5` (10 - 5)

**Note** : Si le départ est dans la tolérance, `earlyLeaveMinutes = 0` ou `null`.

---

### 4. **Minutes d'Heures Supplémentaires (`overtimeMinutes`)**

**Quand calculé** : Lors d'un pointage **OUT**

**Formule** :
```typescript
if (type === AttendanceType.OUT) {
  const inRecord = todayRecords.find(r => r.type === AttendanceType.IN);
  if (inRecord) {
    const schedule = await getSchedule();
    if (schedule?.shift) {
      // Heures travaillées
      const workedMinutes = (timestamp.getTime() - inRecord.timestamp.getTime()) / (1000 * 60);
      
      // Heures prévues du shift
      const expectedStartTime = parseTimeString(schedule.customStartTime || schedule.shift.startTime);
      const expectedEndTime = parseTimeString(schedule.customEndTime || schedule.shift.endTime);
      
      const startMinutes = expectedStartTime.hours * 60 + expectedStartTime.minutes;
      const endMinutes = expectedEndTime.hours * 60 + expectedEndTime.minutes;
      
      let plannedMinutes = endMinutes - startMinutes;
      // Gérer shift de nuit (ex: 22h-6h)
      if (plannedMinutes < 0) {
        plannedMinutes += 24 * 60;
      }
      
      // Soustraire la pause
      plannedMinutes -= schedule.shift.breakDuration || 60;
      
      // Heures supplémentaires
      const overtimeMinutes = workedMinutes - plannedMinutes;
      
      if (overtimeMinutes > 0) {
        // Arrondi selon les settings
        const roundingMinutes = settings?.overtimeRounding || 15;
        const overtimeHours = overtimeMinutes / 60;
        const roundedHours = roundOvertimeHours(overtimeHours, roundingMinutes);
        metrics.overtimeMinutes = Math.round(roundedHours * 60);
      }
    }
  }
}
```

**Exemple** :
- Planning : 08:00 - 17:00 (9h - 1h pause = 8h prévues)
- Pointage : IN 08:00, OUT 18:00 (10h travaillées)
- `overtimeMinutes = 120` (2 heures)

**Arrondi** :
- Paramètre `overtimeRounding` (défaut: 15 minutes)
- Exemple : 1h 47min → arrondi à 2h (si rounding = 15min)

---

## 🔧 Workflow de Correction

### 1. **Détection d'Anomalie**

Lorsqu'une anomalie est détectée :
1. Le pointage est créé avec `hasAnomaly = true`
2. `anomalyType` et `anomalyNote` sont remplis
3. Les managers sont notifiés automatiquement

### 2. **Correction par Manager**

**Endpoint** : `PATCH /attendance/:id/correct`

**Données requises** :
- `correctionNote` : Note explicative (obligatoire)
- `correctedTimestamp` : Nouvelle date/heure (optionnel)
- `correctedBy` : ID du manager qui corrige

**Logique** :
```typescript
async correct(tenantId: string, id: string, correctDto: CorrectAttendanceDto, correctedBy: string) {
  // Vérifier permissions
  // Mettre à jour le pointage
  // Si correction > 2h ou type ABSENCE/INSUFFICIENT_REST → nécessite approbation
  // Notifier l'employé
}
```

**Approbation requise si** :
- Correction de plus de 2 heures
- Type d'anomalie : `ABSENCE` ou `INSUFFICIENT_REST`

### 3. **Approbation de Correction**

**Endpoint** : `PATCH /attendance/:id/approve-correction`

**Statuts** :
- `PENDING_APPROVAL` : En attente
- `APPROVED` : Approuvé
- `REJECTED` : Rejeté

**Workflow** :
1. Manager corrige → `needsApproval = true`, `approvalStatus = PENDING_APPROVAL`
2. Notification envoyée aux managers supérieurs
3. Manager supérieur approuve/rejette
4. Notification envoyée à l'employé

---

## 🔔 Notifications

### Types de Notifications

1. **ATTENDANCE_ANOMALY**
   - **Quand** : Détection d'une anomalie
   - **Destinataires** : Managers (département + site)
   - **Contenu** : Type d'anomalie, employé, date

2. **ATTENDANCE_CORRECTED**
   - **Quand** : Correction approuvée
   - **Destinataires** : Employé concerné
   - **Contenu** : Date de correction, note

3. **ATTENDANCE_APPROVAL_REQUIRED**
   - **Quand** : Correction nécessite approbation
   - **Destinataires** : Managers supérieurs
   - **Contenu** : Détails de la correction

### Hiérarchie des Notifications

**Managers notifiés** :
1. Manager du département (`employee.department.managerId`)
2. Managers régionaux du site (`employee.site.siteManagers`)

---

## 📌 Résumé des Cas d'Anomalies

| Type | Détecté lors de | Condition | Priorité |
|------|----------------|-----------|----------|
| **DOUBLE_IN** | Pointage IN | IN existe déjà pour la journée | 🔴 Haute |
| **MISSING_IN** | Pointage OUT | Pas d'IN pour la journée | 🔴 Haute |
| **MISSING_OUT** | Pointage IN | Nombre IN > Nombre OUT | 🔴 Haute |
| **LATE** | Pointage IN | Heure > prévue + tolérance | 🟡 Moyenne |
| **EARLY_LEAVE** | Pointage OUT | Heure < prévue - tolérance | 🟡 Moyenne |
| **ABSENCE** | Pointage IN | Pas de planning + jour ouvrable + pas de congé | 🔴 Haute |
| **INSUFFICIENT_REST** | Pointage IN | Repos < 11h (normal) ou 12h (nuit) | 🔴 Haute |

---

## ⚙️ Paramètres Configurables

### TenantSettings

- `lateToleranceEntry` : Tolérance retard entrée (défaut: 10 min)
- `earlyToleranceExit` : Tolérance départ anticipé (défaut: 5 min)
- `overtimeRounding` : Arrondi heures sup (défaut: 15 min)
- `workingDays` : Jours ouvrables (défaut: [1,2,3,4,5,6] = Lun-Sam)
- `alertInsufficientRest` : Alerte repos insuffisant (booléen)

---

## 🔍 Points d'Attention

### Limitations Actuelles

1. **Détection d'absence complète** : 
   - Actuellement détectée lors d'un pointage IN sans planning
   - Pour détecter une absence totale (pas de pointage), il faudrait un job batch

2. **MISSING_OUT en fin de journée** :
   - Détecté lors d'un deuxième IN
   - Pas de détection automatique si un IN reste sans OUT en fin de journée

3. **Calcul des heures travaillées** :
   - Les pauses ne sont pas automatiquement soustraites dans `hoursWorked`
   - Elles sont gérées via `breakDuration` dans le calcul des heures sup

### Améliorations Possibles

1. Job batch quotidien pour détecter :
   - Absences complètes (pas de pointage)
   - MISSING_OUT en fin de journée
   - Anomalies rétroactives

2. Détection de patterns suspects :
   - Pointages répétés aux mêmes heures
   - Pointages trop réguliers (suspects)
   - Pointages en dehors des heures normales

3. Intégration avec système de paie :
   - Export automatique des heures travaillées
   - Calcul des heures sup pour paie

---

## 🔧 Corrections et Implémentations Nécessaires

### 🎯 Section 1 : Absence (Priorité Haute)

#### 1.1. **Cas B – Absence complète sans pointage** (🔴 Priorité Haute)

**Problème actuel** :
- Le système ne détecte pas les absences quand il n'y a **aucun pointage**
- Détection uniquement lors d'un pointage IN sans planning

**Solution à implémenter** :

**A. Créer un Job Batch Quotidien**

**Fichier** : `backend/src/modules/attendance/jobs/detect-absences.job.ts`

```typescript
@Injectable()
export class DetectAbsencesJob {
  constructor(
    private prisma: PrismaService,
    private attendanceService: AttendanceService,
  ) {}

  @Cron('0 1 * * *') // Exécution à 1h du matin chaque jour
  async detectAbsences() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    const endOfYesterday = new Date(yesterday);
    endOfYesterday.setHours(23, 59, 59, 999);

    // Récupérer tous les tenants actifs
    const tenants = await this.prisma.tenant.findMany({
      where: { isActive: true },
    });

    for (const tenant of tenants) {
      await this.detectAbsencesForTenant(tenant.id, yesterday, endOfYesterday);
    }
  }

  private async detectAbsencesForTenant(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ) {
    // Récupérer les plannings de la veille
    const schedules = await this.prisma.schedule.findMany({
      where: {
        tenantId,
        date: { gte: startDate, lte: endDate },
      },
      include: {
        employee: true,
        shift: true,
      },
    });

    for (const schedule of schedules) {
      // Vérifier s'il y a un pointage IN pour cette date
      const hasAttendance = await this.prisma.attendance.findFirst({
        where: {
          tenantId,
          employeeId: schedule.employeeId,
          type: AttendanceType.IN,
          timestamp: { gte: startDate, lte: endDate },
        },
      });

      if (!hasAttendance) {
        // Vérifier si c'est un jour ouvrable
        const settings = await this.prisma.tenantSettings.findUnique({
          where: { tenantId },
          select: { workingDays: true },
        });

        const dayOfWeek = schedule.date.getDay();
        const workingDays = (settings?.workingDays as number[]) || [1, 2, 3, 4, 5, 6];
        
        if (workingDays.includes(dayOfWeek === 0 ? 7 : dayOfWeek)) {
          // Vérifier s'il y a un congé approuvé
          const leave = await this.prisma.leave.findFirst({
            where: {
              tenantId,
              employeeId: schedule.employeeId,
              startDate: { lte: schedule.date },
              endDate: { gte: schedule.date },
              status: { in: ['APPROVED', 'MANAGER_APPROVED'] },
            },
          });

          if (!leave) {
            // Créer un enregistrement d'absence
            await this.createAbsenceRecord(tenantId, schedule);
          }
        }
      }
    }
  }

  private async createAbsenceRecord(tenantId: string, schedule: any) {
    // Option 1 : Créer un pointage d'absence virtuel
    await this.prisma.attendance.create({
      data: {
        tenantId,
        employeeId: schedule.employeeId,
        timestamp: new Date(schedule.date.setHours(8, 0, 0, 0)), // Heure prévue
        type: AttendanceType.IN,
        method: DeviceType.MANUAL,
        hasAnomaly: true,
        anomalyType: 'ABSENCE',
        anomalyNote: 'Absence complète détectée : aucun pointage enregistré',
        isGenerated: true,
        generatedBy: 'ABSENCE_DETECTION_JOB',
      },
    });

    // Option 2 : Créer un modèle d'absence séparé (recommandé)
    // await this.prisma.absence.create({ ... });
  }
}
```

**B. Enregistrer le Job dans le Module**

**Fichier** : `backend/src/modules/attendance/attendance.module.ts`

```typescript
import { DetectAbsencesJob } from './jobs/detect-absences.job';

@Module({
  providers: [
    AttendanceService,
    DetectAbsencesJob, // Ajouter le job
  ],
})
export class AttendanceModule {}
```

**C. Configuration Cron**

- **Fréquence recommandée** : Tous les jours à 1h du matin
- **Alternative** : Toutes les heures pour détection plus rapide
- **Paramètre configurable** : `absenceDetectionTime` dans `TenantSettings`

---

#### 1.2. **Cas C – Absence partielle** (🟡 Priorité Moyenne)

**Problème actuel** :
- Le système détecte seulement un **LATE** même si le retard est extrême
- Pas de distinction entre retard et absence partielle

**Solution à implémenter** :

**A. Ajouter un seuil d'absence partielle**

**Fichier** : `backend/prisma/schema.prisma`

```prisma
model TenantSettings {
  // ... autres champs
  absencePartialThreshold Int? @default(2) // Heures de retard pour considérer absence partielle
}
```

**B. Modifier la détection dans `detectAnomalies()`**

**Fichier** : `backend/src/modules/attendance/attendance.service.ts`

```typescript
// Dans la section de détection LATE
if (type === AttendanceType.IN && schedule?.shift) {
  const expectedStartTime = this.parseTimeString(
    schedule.customStartTime || schedule.shift.startTime,
  );
  const expectedStart = new Date(timestamp);
  expectedStart.setHours(expectedStartTime.hours, expectedStartTime.minutes, 0, 0);

  const settings = await this.prisma.tenantSettings.findUnique({
    where: { tenantId },
    select: { 
      lateToleranceEntry: true,
      absencePartialThreshold: true, // Nouveau paramètre
    },
  });

  const toleranceMinutes = settings?.lateToleranceEntry || 10;
  const lateHours = (timestamp.getTime() - expectedStart.getTime()) / (1000 * 60 * 60);
  const absenceThreshold = settings?.absencePartialThreshold || 2; // Heures

  // Si retard > seuil d'absence partielle
  if (lateHours >= absenceThreshold) {
    return {
      hasAnomaly: true,
      type: 'ABSENCE_PARTIAL',
      note: `Absence partielle détectée : arrivée ${lateHours.toFixed(1)}h après l'heure prévue`,
    };
  }

  // Sinon, traitement normal du retard
  const lateMinutes = (timestamp.getTime() - expectedStart.getTime()) / (1000 * 60);
  if (lateMinutes > toleranceMinutes) {
    return {
      hasAnomaly: true,
      type: 'LATE',
      note: `Retard de ${Math.round(lateMinutes)} minutes détecté`,
    };
  }
}
```

**C. Ajouter le type d'anomalie dans le frontend**

**Fichier** : `frontend/app/(dashboard)/attendance/page.tsx`

```typescript
const getAnomalyTypeBadge = (type?: string) => {
  const anomalyLabels: Record<string, { label: string; color: string }> = {
    // ... autres types
    ABSENCE_PARTIAL: { label: 'Absence partielle', color: 'bg-orange-100 text-orange-800' },
  };
  // ...
};
```

---

#### 1.3. **Cas D – Planning supprimé/non validé** (🟡 Priorité Moyenne)

**Problème actuel** :
- Pas de distinction entre "pas de planning" et "planning non validé"

**Solution à implémenter** :

**A. Ajouter un statut au Schedule**

**Fichier** : `backend/prisma/schema.prisma`

```prisma
model Schedule {
  // ... autres champs
  status String @default("PUBLISHED") // PUBLISHED, DRAFT, CANCELLED
  publishedAt DateTime?
  cancelledAt DateTime?
}
```

**B. Modifier la détection**

```typescript
if (type === AttendanceType.IN) {
  const schedule = await this.prisma.schedule.findFirst({
    where: {
      tenantId,
      employeeId,
      date: { gte: startOfDay, lte: endOfDay },
    },
    include: { shift: true },
  });

  // Si planning existe mais non publié/annulé
  if (schedule && schedule.status !== 'PUBLISHED') {
    const leave = await this.prisma.leave.findFirst({ /* ... */ });
    
    if (!leave) {
      return {
        hasAnomaly: true,
        type: 'ABSENCE_TECHNICAL',
        note: `Absence technique : planning ${schedule.status.toLowerCase()}`,
      };
    }
  }
  
  // Si pas de planning (logique existante)
  if (!schedule) {
    // ... logique Cas A
  }
}
```

---

#### 1.4. **Cas E – Pointage invalide (erreur technique)** (🟡 Priorité Faible)

**Problème actuel** :
- Pas de suivi des tentatives de pointage échouées

**Solution à implémenter** :

**A. Créer un modèle de logs de pointage**

**Fichier** : `backend/prisma/schema.prisma`

```prisma
model AttendanceAttempt {
  id          String   @id @default(uuid())
  createdAt   DateTime @default(now())
  tenantId    String
  employeeId  String
  deviceId    String?
  timestamp   DateTime
  type        AttendanceType
  method      DeviceType
  status      String   // SUCCESS, FAILED, REJECTED
  errorCode   String?  // BADGE_NOT_RECOGNIZED, DEVICE_OFF, NETWORK_ERROR, etc.
  errorMessage String?
  rawData     Json?
  
  tenant      Tenant   @relation(fields: [tenantId], references: [id])
  employee    Employee @relation(fields: [employeeId], references: [id])
  
  @@index([tenantId, employeeId, timestamp])
  @@index([status])
}
```

**B. Logger toutes les tentatives**

```typescript
async create(tenantId: string, createAttendanceDto: CreateAttendanceDto) {
  try {
    // ... logique existante
    const attendance = await this.prisma.attendance.create({ /* ... */ });
    
    // Logger succès
    await this.prisma.attendanceAttempt.create({
      data: {
        tenantId,
        employeeId: createAttendanceDto.employeeId,
        timestamp: new Date(createAttendanceDto.timestamp),
        type: createAttendanceDto.type,
        method: createAttendanceDto.method,
        status: 'SUCCESS',
      },
    });
    
    return attendance;
  } catch (error) {
    // Logger échec
    await this.prisma.attendanceAttempt.create({
      data: {
        tenantId,
        employeeId: createAttendanceDto.employeeId,
        timestamp: new Date(),
        type: createAttendanceDto.type,
        method: createAttendanceDto.method,
        status: 'FAILED',
        errorCode: error.code,
        errorMessage: error.message,
      },
    });
    throw error;
  }
}
```

**C. Job pour détecter absences dues aux erreurs**

```typescript
// Dans DetectAbsencesJob
private async detectTechnicalAbsences(tenantId: string, date: Date) {
  // Récupérer les tentatives échouées sans pointage réussi
  const failedAttempts = await this.prisma.attendanceAttempt.findMany({
    where: {
      tenantId,
      timestamp: { gte: startOfDay, lte: endOfDay },
      status: 'FAILED',
    },
    include: { employee: true },
  });

  for (const attempt of failedAttempts) {
    // Vérifier si un pointage réussi existe pour cet employé ce jour
    const hasSuccess = await this.prisma.attendance.findFirst({
      where: {
        tenantId,
        employeeId: attempt.employeeId,
        timestamp: { gte: startOfDay, lte: endOfDay },
      },
    });

    if (!hasSuccess) {
      // Créer absence technique
      await this.createAbsenceRecord(tenantId, {
        employeeId: attempt.employeeId,
        date,
        reason: 'Tentative de pointage échouée',
      });
    }
  }
}
```

---

### 📋 Checklist d'Implémentation - Absence

- [ ] **Cas B** : Job batch quotidien pour détection absence complète
  - [ ] Créer `DetectAbsencesJob`
  - [ ] Configurer Cron (1h du matin)
  - [ ] Tester sur données réelles
  - [ ] Ajouter paramètre `absenceDetectionTime` dans settings

- [ ] **Cas C** : Détection absence partielle
  - [ ] Ajouter `absencePartialThreshold` dans `TenantSettings`
  - [ ] Modifier `detectAnomalies()` pour distinguer LATE et ABSENCE_PARTIAL
  - [ ] Mettre à jour frontend pour afficher ABSENCE_PARTIAL
  - [ ] Tester avec différents seuils

- [ ] **Cas D** : Gestion planning non validé
  - [ ] Ajouter `status` au modèle `Schedule`
  - [ ] Modifier détection pour vérifier statut
  - [ ] Créer workflow de publication planning
  - [ ] Tester cas DRAFT et CANCELLED

- [ ] **Cas E** : Suivi erreurs techniques
  - [ ] Créer modèle `AttendanceAttempt`
  - [ ] Logger toutes les tentatives (succès/échec)
  - [ ] Job pour détecter absences dues aux erreurs
  - [ ] Interface pour visualiser les tentatives échouées

---

### 🎯 Section 2 : Autres Types d'Anomalies (À venir)

**Note** : Après finalisation de l'implémentation des cas d'absence, nous passerons à l'analyse et aux corrections des autres types d'anomalies :

- **DOUBLE_IN** : Améliorations possibles
- **MISSING_IN** : Détection et gestion
- **MISSING_OUT** : Détection en fin de journée
- **LATE** : Affinements et règles métier
- **EARLY_LEAVE** : Affinements et règles métier
- **INSUFFICIENT_REST** : Gestion des exceptions

**Statut** : ⏳ En attente de finalisation Section 1 (Absence)

---

## 📚 Références Techniques

**Fichiers principaux** :
- `backend/src/modules/attendance/attendance.service.ts` : Logique métier
- `backend/prisma/schema.prisma` : Modèle de données
- `frontend/app/(dashboard)/attendance/page.tsx` : Interface utilisateur

**Fonctions clés** :
- `detectAnomalies()` : Détection des anomalies
- `calculateMetrics()` : Calcul des métriques
- `notifyManagersOfAnomaly()` : Notifications managers
- `correct()` : Correction de pointage
- `approveCorrection()` : Approbation de correction
- `detectAbsences()` : Détection absences complètes (à créer - Section 1)

---

**Date d'analyse** : 2025-01-XX
**Version du système** : PointaFlex v1.0
**Dernière mise à jour** : Ajout des cas d'absence manquants (B, C, D, E) et plan d'implémentation complet

