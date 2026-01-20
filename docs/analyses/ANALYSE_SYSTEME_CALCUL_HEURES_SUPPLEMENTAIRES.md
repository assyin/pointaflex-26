# 📊 Analyse Complète : Système de Calcul des Heures Supplémentaires

## 📋 Résumé Exécutif

Cette analyse examine en détail le système actuel de calcul des heures supplémentaires dans PointaFlex, identifie les points forts, les limitations, et propose des améliorations, notamment l'ajout d'un système d'éligibilité par employé.

**⚠️ CORRECTION CRITIQUE IDENTIFIÉE :**
Le calcul actuel ne déduit **pas la pause réelle** des heures travaillées. La pause doit être calculée depuis les pointages BREAK_START/BREAK_END et déduite des heures travaillées brutes (OUT - IN). Cette correction est **prioritaire** et doit être faite avant toute autre amélioration.

---

## 1. 🔍 État Actuel du Système

### 1.1 Où le Calcul est Effectué

Le calcul des heures supplémentaires se fait à **deux niveaux** :

#### **Niveau 1 : Calcul en Temps Réel (Attendance Service)**
**Fichier :** `backend/src/modules/attendance/attendance.service.ts`
**Méthode :** `calculateMetrics()` (lignes 1000-1159)

**Quand :** Lors de la création d'un pointage **OUT**

**Logique à implémenter :**
```typescript
// 1. Récupérer le IN du jour
const inRecord = todayRecords.find(r => r.type === AttendanceType.IN);

// 2. Calculer les heures travaillées (brutes)
const workedMinutesRaw = (timestamp.getTime() - inRecord.timestamp.getTime()) / (1000 * 60);

// 3. Récupérer la configuration du tenant
const settings = await this.prisma.tenantSettings.findUnique({
  where: { tenantId },
  select: { 
    requireBreakPunch: true,  // Pointage repos activé/désactivé
    breakDuration: true,      // Durée de pause configurée (en minutes)
  },
});

// 4. Calculer la pause réelle selon la configuration
let actualBreakMinutes = 0;

if (settings?.requireBreakPunch === true) {
  // CAS 1 : Pointage repos ACTIVÉ → Utiliser les pointages BREAK_START/BREAK_END réels
  const breakEvents = todayRecords.filter(r => 
    r.type === AttendanceType.BREAK_START || r.type === AttendanceType.BREAK_END
  );
  
  // Trier par timestamp
  breakEvents.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  
  // Parcourir les paires BREAK_START/BREAK_END
  for (let i = 0; i < breakEvents.length; i += 2) {
    if (breakEvents[i].type === AttendanceType.BREAK_START && breakEvents[i + 1]?.type === AttendanceType.BREAK_END) {
      const breakDuration = (breakEvents[i + 1].timestamp.getTime() - breakEvents[i].timestamp.getTime()) / (1000 * 60);
      actualBreakMinutes += breakDuration;
    }
  }
} else {
  // CAS 2 : Pointage repos DÉSACTIVÉ → Utiliser la durée configurée dans TenantSettings
  // La pause est automatiquement déduite selon la durée configurée
  actualBreakMinutes = settings?.breakDuration || 60; // Défaut: 60 minutes
}

// 5. Déduire la pause des heures travaillées
const workedMinutes = workedMinutesRaw - actualBreakMinutes;

// 6. Récupérer le schedule (planning) de l'employé
const schedule = await this.getScheduleWithFallback(tenantId, employeeId, timestamp);

// 7. Calculer les heures prévues du shift
const expectedStartTime = parseTimeString(schedule.customStartTime || schedule.shift.startTime);
const expectedEndTime = parseTimeString(schedule.customEndTime || schedule.shift.endTime);

// 8. Calculer la durée prévue (en minutes)
let plannedMinutes = (endMinutes - startMinutes);
if (plannedMinutes < 0) plannedMinutes += 24 * 60; // Shift de nuit

// 9. Déduire la pause prévue des heures prévues
// La pause prévue utilise aussi TenantSettings.breakDuration (priorité sur shift.breakDuration)
const plannedBreakMinutes = settings?.breakDuration || schedule.shift.breakDuration || 60;
plannedMinutes -= plannedBreakMinutes;

// 10. Calculer les heures supplémentaires
// Heures travaillées netes (déduites de la pause réelle) - Heures prévues netes (déduites de la pause prévue)
const overtimeMinutes = workedMinutes - plannedMinutes;

// 7. Si > 0, arrondir selon la configuration
if (overtimeMinutes > 0) {
  const roundingMinutes = settings?.overtimeRounding || 15;
  const overtimeHours = overtimeMinutes / 60;
  const roundedHours = roundOvertimeHours(overtimeHours, roundingMinutes);
  metrics.overtimeMinutes = Math.round(roundedHours * 60);
}
```

**Stockage :** Les heures supplémentaires sont stockées dans `Attendance.overtimeMinutes` (en minutes)

**Limitation actuelle :** 
- ✅ Calcul correct
- ❌ **Pas de vérification d'éligibilité de l'employé**
- ❌ **Pas de création automatique d'enregistrement Overtime**

---

#### **Niveau 2 : Calcul pour Génération de Données (Data Generator)**
**Fichier :** `backend/src/modules/data-generator/data-generator.service.ts`
**Méthode :** `calculateAndCreateOvertime()` (lignes 483-578)

**Quand :** Lors de la génération de données de test

**Logique :**
- Similaire au niveau 1
- **Création automatique d'un enregistrement `Overtime`** si seuil dépassé
- Utilise `overtimeThreshold` (défaut: 30 minutes)

**Limitation :** 
- ❌ Uniquement pour génération de données
- ❌ Pas utilisé en production pour création automatique

---

### 1.2 Modèle de Données

#### **Model Attendance**
```prisma
model Attendance {
  // ...
  overtimeMinutes Int? // Minutes d'heures supplémentaires calculées
  hoursWorked     Decimal? // Heures travaillées totales
  // ...
}
```

**Observation :**
- `overtimeMinutes` est calculé mais **pas automatiquement converti en enregistrement Overtime**
- C'est juste une **métrique** stockée dans le pointage

---

#### **Model Overtime**
```prisma
model Overtime {
  id                String         @id
  tenantId          String
  employeeId        String
  date              DateTime       @db.Date
  hours             Decimal        // Heures calculées
  approvedHours     Decimal?       // Heures approuvées par manager
  type              OvertimeType   @default(STANDARD) // STANDARD, NIGHT, HOLIDAY, EMERGENCY
  isNightShift      Boolean        @default(false)
  rate              Decimal        @default(1.25) // Taux de majoration
  status            OvertimeStatus  @default(PENDING) // PENDING, APPROVED, REJECTED, PAID, RECOVERED
  convertedToRecovery Boolean      @default(false)
  recoveryId        String?
  approvedBy        String?
  approvedAt        DateTime?
  rejectionReason   String?
  notes             String?
  // ...
}
```

**Observation :**
- Les enregistrements `Overtime` sont créés **manuellement** par les managers
- **Pas de création automatique** depuis les pointages

---

#### **Model Employee**
```prisma
model Employee {
  // ...
  // ❌ PAS DE CHAMP pour éligibilité heures supplémentaires
  // ...
}
```

**Observation critique :**
- **Aucun champ** pour définir si un employé est éligible aux heures sup
- Tous les employés sont traités de la même manière

---

### 1.3 Configuration Tenant (TenantSettings)

```prisma
model TenantSettings {
  overtimeRate       Decimal @default(1.25)  // Taux de majoration standard
  nightShiftRate     Decimal @default(1.50)  // Taux de majoration shift de nuit
  overtimeRounding   Int    @default(15)     // Arrondi en minutes (15, 30, 60)
  breakDuration      Int    @default(60)      // Durée de pause en minutes (utilisée pour calcul heures sup)
  requireBreakPunch  Boolean @default(false) // Activer/désactiver le pointage des repos (pauses)
  // ...
}
```

**Paramètres clés pour le calcul des heures supplémentaires :**

1. **`breakDuration`** (Int, défaut: 60 minutes)
   - Durée de la pause utilisée dans le calcul
   - Utilisée pour :
     - Calculer la pause prévue (heures prévues = shift durée - breakDuration)
     - Calculer la pause réelle si `requireBreakPunch = false`

2. **`requireBreakPunch`** (Boolean, défaut: false)
   - **`true`** : Les employés doivent pointer BREAK_START/BREAK_END
     - La pause réelle = somme des durées (BREAK_END - BREAK_START)
   - **`false`** : Les employés ne pointent pas les pauses
     - La pause réelle = `breakDuration` (durée configurée)
     - Pas de pointages BREAK_START/BREAK_END nécessaires

**Observation :**
- Configuration **globale** pour tous les employés
- **Pas de configuration par employé** pour éligibilité
- La durée de pause est centralisée dans `TenantSettings.breakDuration` (priorité sur `Shift.breakDuration`)

---

## 2. 📐 Logique de Calcul Actuelle

### 2.1 Formule de Calcul

```
Heures Supplémentaires = Heures Travaillées Netes - Heures Prévisées du Shift

Où :
- Heures Travaillées Brutes = (OUT.timestamp - IN.timestamp) en heures
- Pause Réelle = Calculée selon requireBreakPunch :
  * SI requireBreakPunch = true  → Somme des durées (BREAK_END - BREAK_START) depuis les pointages
  * SI requireBreakPunch = false → TenantSettings.breakDuration (durée configurée)
- Heures Travaillées Netes = Heures Travaillées Brutes - Pause Réelle
- Heures Prévisées = (shift.endTime - shift.startTime) - TenantSettings.breakDuration (pause prévue)
```

**Important :** 
- La **pause réelle** dépend de `requireBreakPunch` :
  - **Activé** (`true`) : Utilise les pointages BREAK_START/BREAK_END réels
  - **Désactivé** (`false`) : Utilise `TenantSettings.breakDuration` automatiquement
- La **pause prévue** utilise toujours `TenantSettings.breakDuration` (priorité sur `Shift.breakDuration`)
- Les deux pauses sont déduites séparément : pause réelle des heures travaillées, pause prévue des heures prévues
- **Centralisation** : La durée de pause est gérée dans `TenantSettings.breakDuration` pour cohérence

### 2.2 Exemple Concret

#### **Exemple 1 : Pointage repos ACTIVÉ (`requireBreakPunch = true`)**

**Configuration Tenant :**
- `requireBreakPunch = true`
- `breakDuration = 60` minutes (1h)

**Scénario :**
- Shift prévu : 08:00 - 17:00 (9h)
- Pause prévue : 1h (depuis `TenantSettings.breakDuration`)
- **Heures prévues = 8h** (9h - 1h)

**Pointages réels :**
- IN : 08:00
- BREAK_START : 12:00
- BREAK_END : 13:00
- OUT : 18:30

**Calcul :**

1. **Heures travaillées brutes :**
   - 08:00 → 18:30 = 10.5h (630 minutes)

2. **Pause réelle :** (Pointage repos activé → utiliser pointages réels)
   - BREAK_START (12:00) → BREAK_END (13:00) = 1h (60 minutes)

3. **Heures travaillées netes :**
   - 630 minutes - 60 minutes = 570 minutes = **9.5h**

4. **Heures prévues :**
   - (17:00 - 08:00) - 60 min pause = 9h - 1h = **8h** (480 minutes)

5. **Heures supplémentaires :**
   - 570 minutes - 480 minutes = 90 minutes = **1.5h**

**Arrondi (15 min) :**
- 1.5h = 90 minutes
- Arrondi à 15 min près = 90 minutes (pas d'arrondi nécessaire)
- **Résultat : 1.5h d'heures sup**

---

#### **Exemple 2 : Pointage repos DÉSACTIVÉ (`requireBreakPunch = false`)**

**Configuration Tenant :**
- `requireBreakPunch = false`
- `breakDuration = 60` minutes (1h)

**Scénario :**
- Shift prévu : 08:00 - 17:00 (9h)
- Pause prévue : 1h (depuis `TenantSettings.breakDuration`)
- **Heures prévues = 8h** (9h - 1h)

**Pointages réels :**
- IN : 08:00
- OUT : 18:30
- **Pas de pointages BREAK_START/BREAK_END** (pointage repos désactivé)

**Calcul :**

1. **Heures travaillées brutes :**
   - 08:00 → 18:30 = 10.5h (630 minutes)

2. **Pause réelle :** (Pointage repos désactivé → utiliser durée configurée)
   - `TenantSettings.breakDuration = 60` minutes (1h)
   - **Pause réelle = 60 minutes** (automatique, pas de pointage nécessaire)

3. **Heures travaillées netes :**
   - 630 minutes - 60 minutes = 570 minutes = **9.5h**

4. **Heures prévues :**
   - (17:00 - 08:00) - 60 min pause = 9h - 1h = **8h** (480 minutes)

5. **Heures supplémentaires :**
   - 570 minutes - 480 minutes = 90 minutes = **1.5h**

**Résultat : 1.5h d'heures sup**

**Note :** Même sans pointages BREAK_START/BREAK_END, la pause est automatiquement déduite selon la durée configurée.

---

#### **Exemple 3 : Pause réelle différente de la pause prévue (Pointage repos activé)**

**Configuration Tenant :**
- `requireBreakPunch = true`
- `breakDuration = 60` minutes (1h)

**Scénario :**
- Shift prévu : 08:00 - 17:00 (9h)
- Pause prévue : 1h
- **Heures prévues = 8h**

**Pointages réels :**
- IN : 08:00
- BREAK_START : 12:00
- BREAK_END : 12:30 (pause de 30 min seulement - employé a pris une pause courte)
- OUT : 18:00

**Calcul :**

1. **Heures travaillées brutes :**
   - 08:00 → 18:00 = 10h (600 minutes)

2. **Pause réelle :** (Pointage repos activé → utiliser pointages réels)
   - BREAK_START (12:00) → BREAK_END (12:30) = 30 minutes

3. **Heures travaillées netes :**
   - 600 minutes - 30 minutes = 570 minutes = **9.5h**

4. **Heures prévues :**
   - (17:00 - 08:00) - 60 min pause = 9h - 1h = **8h** (480 minutes)

5. **Heures supplémentaires :**
   - 570 minutes - 480 minutes = 90 minutes = **1.5h**

**Note :** L'employé a pris une pause plus courte (30 min au lieu de 1h), donc il a travaillé 30 min de plus, ce qui se reflète dans les heures sup.

---

### 2.3 Gestion des Shifts de Nuit

**Shift de nuit :** 22:00 - 06:00 (jour suivant)

**Calcul :**
```typescript
let plannedMinutes = endMinutes - startMinutes;
if (plannedMinutes < 0) {
  plannedMinutes += 24 * 60; // Ajouter 24 heures
}
```

**Exemple :**
- Shift : 22:00 - 06:00
- Pause prévue : 1h
- Calcul : (6*60) - (22*60) = -960 minutes
- Correction : -960 + 1440 = 480 minutes = 8h
- Moins pause prévue : 8h - 1h = **7h prévues**

**Configuration Tenant :**
- `requireBreakPunch = true` (ou `false`, même résultat si pause = 1h)
- `breakDuration = 60` minutes (1h)

**Pointages réels :**
- IN : 22:00
- BREAK_START : 02:00 (si `requireBreakPunch = true`)
- BREAK_END : 03:00 (si `requireBreakPunch = true`)
- OUT : 07:00

**Calcul :**

1. **Heures travaillées brutes :**
   - 22:00 → 07:00 (jour suivant) = 9h (540 minutes)

2. **Pause réelle :**
   - Si `requireBreakPunch = true` : BREAK_START (02:00) → BREAK_END (03:00) = 1h (60 minutes)
   - Si `requireBreakPunch = false` : `TenantSettings.breakDuration = 60` minutes

3. **Heures travaillées netes :**
   - 540 minutes - 60 minutes = 480 minutes = **8h**

4. **Heures prévues :**
   - (06:00 - 22:00) = 8h brutes
   - Moins pause : 8h - 1h = **7h** (420 minutes)

5. **Heures supplémentaires :**
   - 480 minutes - 420 minutes = 60 minutes = **1h**

---

### 2.4 Points Forts du Système Actuel

✅ **Calcul précis** : Prend en compte les heures réelles vs prévues
✅ **Flexibilité pointage repos** : Supporte deux modes selon `requireBreakPunch`
✅ **Centralisation configuration** : Durée de pause dans `TenantSettings.breakDuration`
✅ **Gestion shifts de nuit** : Gère correctement les shifts qui traversent minuit
✅ **Arrondi configurable** : Permet d'arrondir selon les besoins (15/30/60 min)
✅ **Support customStartTime/customEndTime** : Permet d'override les heures du shift
✅ **Stockage dans Attendance** : Métrique disponible immédiatement

**Note importante :** 
- Si `requireBreakPunch = true` : La pause réelle est calculée depuis les pointages BREAK_START/BREAK_END
- Si `requireBreakPunch = false` : La pause réelle = `TenantSettings.breakDuration` (automatique)
- La pause prévue utilise toujours `TenantSettings.breakDuration` (priorité sur `Shift.breakDuration`)

---

### 2.5 Limitations Identifiées

❌ **Pas de création automatique d'Overtime**
- Les heures sup sont calculées mais **pas converties en enregistrement Overtime**
- Les managers doivent créer manuellement les demandes

❌ **Pas de vérification d'éligibilité**
- Tous les employés sont traités de la même manière
- Pas de distinction entre employés éligibles/non éligibles

❌ **Pas de déduction de la pause réelle dans le code actuel**
- ⚠️ **IMPORTANT** : Le code actuel ne déduit pas la pause réelle des heures travaillées
- Il calcule : `workedMinutes = OUT - IN` (sans déduire les pauses)
- Il faut corriger pour :
  - Si `requireBreakPunch = true` : `workedMinutes = (OUT - IN) - pause réelle (BREAK_START/BREAK_END)`
  - Si `requireBreakPunch = false` : `workedMinutes = (OUT - IN) - TenantSettings.breakDuration`
- **Correction nécessaire avant implémentation de l'éligibilité**

❌ **Pas d'utilisation de TenantSettings.breakDuration**
- Le code actuel utilise `schedule.shift.breakDuration` pour la pause prévue
- Il faut utiliser `TenantSettings.breakDuration` en priorité (fallback sur shift si non défini)
- **Centralisation nécessaire** : La durée de pause doit être gérée dans TenantSettings

❌ **Pas de seuil minimum configurable**
- Le calcul se fait même pour 1 minute supplémentaire
- Pas de seuil (ex: minimum 30 min pour compter) # le seuil doit etre ajouter & gérée au TenantSettings

❌ **Pas de gestion des cas spéciaux**
- Jours fériés (taux différent)
- Heures d'urgence (taux différent)
- Ces types existent dans le modèle mais ne sont pas automatiquement détectés

❌ **Pas de job batch pour création automatique**
- Pas de processus automatique qui crée les Overtime depuis les Attendance

---

## 3. 🎯 Besoin : Éligibilité par Employé

### 3.1 Cas d'Usage

**Scénario 1 : Employé Non Éligible**
- Employé en contrat à temps partiel
- Employé stagiaire
- Employé en période d'essai
- **Besoin :** Ne pas calculer/créer d'heures sup pour ces employés

**Scénario 2 : Employé Éligible avec Restrictions**
- Employé éligible mais avec plafond mensuel
- Employé éligible seulement certains jours
- **Besoin :** Calculer mais avec restrictions

**Scénario 3 : Employé Totalement Éligible**
- Employé CDI standard
- **Besoin :** Calcul normal sans restriction

---

### 3.2 Options de Design

#### **Option A : Champ Boolean Simple**
```prisma
model Employee {
  isEligibleForOvertime Boolean @default(true)
}
```

**Avantages :**
- Simple
- Rapide à implémenter

**Inconvénients :**
- Pas de flexibilité (tout ou rien)
- Pas de gestion de plafonds

---

#### **Option B : Champ avec Restrictions**
```prisma
model Employee {
  isEligibleForOvertime     Boolean  @default(true)
  overtimeEligibilityType   String?  // "FULL", "LIMITED", "NONE"
  maxOvertimeHoursPerMonth   Decimal? // Plafond mensuel
  maxOvertimeHoursPerWeek    Decimal? // Plafond hebdomadaire
  overtimeEligibilityStartDate DateTime? // Date de début d'éligibilité
  overtimeEligibilityEndDate   DateTime? // Date de fin d'éligibilité
}
```

**Avantages :**
- Flexible
- Gère les cas complexes
- Permet restrictions temporelles

**Inconvénients :**
- Plus complexe
- Nécessite plus de logique

---

#### **Option C : Table Séparée (Configuration Avancée)**
```prisma
model EmployeeOvertimeEligibility {
  id                    String   @id
  employeeId            String
  isEligible            Boolean  @default(true)
  eligibilityType       String   // "FULL", "LIMITED", "NONE"
  maxHoursPerMonth      Decimal?
  maxHoursPerWeek       Decimal?
  maxHoursPerDay        Decimal?
  allowedDaysOfWeek     Int[]    // [1,2,3,4,5] = Lun-Ven
  startDate             DateTime?
  endDate               DateTime?
  notes                 String?
  // ...
}
```

**Avantages :**
- Très flexible
- Historique des changements
- Gestion fine des règles

**Inconvénients :**
- Complexité élevée
- Overkill pour la plupart des cas

---

### 3.3 Recommandation

**Recommandation : Option B (Champ avec Restrictions)**

**Justification :**
- Équilibre entre simplicité et flexibilité
- Couvre 90% des cas d'usage
- Facile à étendre si besoin

**Champs proposés :**
```prisma
model Employee {
  // ...
  isEligibleForOvertime     Boolean   @default(true) // Éligibilité de base
  overtimeEligibilityType   String?   // "FULL", "LIMITED", "NONE" (optionnel, dérivé de isEligibleForOvertime)
  maxOvertimeHoursPerMonth  Decimal?  // Plafond mensuel (optionnel)
  maxOvertimeHoursPerWeek   Decimal?  // Plafond hebdomadaire (optionnel)
  overtimeEligibilityNotes  String?   // Notes/justification
  // ...
}
```

---

## 4. 🔧 Impact sur le Système Actuel

### 4.1 Modifications Nécessaires

#### **4.1.1 Schéma Prisma**
- ✅ Ajouter les champs d'éligibilité dans `Employee`
- ✅ Migration nécessaire

#### **4.1.2 Attendance Service (`calculateMetrics`)**
- ✅ Vérifier l'éligibilité avant de calculer
- ✅ Si non éligible : `overtimeMinutes = 0` ou `null`
- ✅ Logique : 
  ```typescript
  if (!employee.isEligibleForOvertime) {
    metrics.overtimeMinutes = 0; // ou null
    return metrics;
  }
  // Sinon, calcul normal
  ```

#### **4.1.3 Overtime Service**
- ✅ Vérifier l'éligibilité avant création
- ✅ Rejeter automatiquement si non éligible
- ✅ Vérifier les plafonds si `LIMITED`

#### **4.1.4 Job Batch (Futur)**
- ✅ Si création automatique d'Overtime depuis Attendance
- ✅ Filtrer les employés non éligibles
- ✅ Respecter les plafonds

---

### 4.2 Points d'Attention

⚠️ **Rétrocompatibilité**
- Les employés existants doivent avoir `isEligibleForOvertime = true` par défaut
- Les heures sup déjà calculées ne doivent pas être modifiées

⚠️ **Migration des Données**
- Script de migration pour définir l'éligibilité selon critères (contrat, position, etc.)

⚠️ **Interface Utilisateur**
- Ajouter champ dans le formulaire de création/édition d'employé
- Afficher l'éligibilité dans la fiche employé
- Avertir si tentative de créer Overtime pour employé non éligible

---

## 5. 📊 Scénarios de Calcul avec Éligibilité

### 5.1 Scénario 1 : Employé Non Éligible

**Configuration :**
```typescript
employee.isEligibleForOvertime = false
```

**Pointages :**
- IN : 08:00
- OUT : 18:30 (2.5h sup)

**Résultat :**
- `overtimeMinutes = 0` (pas de calcul)
- Pas de création d'Overtime possible
- Message : "Cet employé n'est pas éligible aux heures supplémentaires"

---

### 5.2 Scénario 2 : Employé avec Plafond Mensuel

**Configuration :**
```typescript
employee.isEligibleForOvertime = true
employee.maxOvertimeHoursPerMonth = 10 // 10h max/mois
```

**Situation :**
- Déjà 8h d'heures sup ce mois
- Nouvelle journée : 2.5h sup calculées

**Résultat :**
- Calcul : 2.5h
- Plafond restant : 10 - 8 = 2h
- **Heures sup acceptées : 2h** (plafond respecté)
- **Heures sup rejetées : 0.5h** (dépassement)
- Notification au manager : "Plafond mensuel atteint (2h acceptées, 0.5h rejetées)"

---

### 5.3 Scénario 3 : Employé Totalement Éligible

**Configuration :**
```typescript
employee.isEligibleForOvertime = true
employee.maxOvertimeHoursPerMonth = null // Pas de plafond
```

**Résultat :**
- Calcul normal
- Pas de restriction

---

## 6. 🎯 Recommandations d'Implémentation

### 6.0 Phase 0 : Correction du Calcul de la Pause Réelle (Priorité CRITIQUE)

**Objectif :** Corriger le calcul pour déduire la pause réelle des heures travaillées selon la configuration

**Problème actuel :**
- Le code calcule `workedMinutes = OUT - IN` sans déduire les pauses
- Il faut calculer la pause réelle selon `requireBreakPunch`
- Il faut utiliser `TenantSettings.breakDuration` au lieu de `Shift.breakDuration`

**Implémentation :**
1. Modifier `calculateMetrics()` dans `AttendanceService`
2. Récupérer `TenantSettings.requireBreakPunch` et `TenantSettings.breakDuration`
3. **Si `requireBreakPunch = true`** :
   - Récupérer les pointages BREAK_START/BREAK_END du jour
   - Calculer la somme des durées de pause réelles
   - Déduire la pause réelle des heures travaillées brutes
4. **Si `requireBreakPunch = false`** :
   - Utiliser `TenantSettings.breakDuration` comme pause réelle
   - Déduire automatiquement cette durée des heures travaillées brutes
5. **Pour la pause prévue** :
   - Utiliser `TenantSettings.breakDuration` (priorité sur `Shift.breakDuration`)
   - Déduire des heures prévues
6. Tests unitaires avec différents scénarios :
   - `requireBreakPunch = true` avec pointages BREAK_START/BREAK_END
   - `requireBreakPunch = true` sans pointages (pause réelle = 0)
   - `requireBreakPunch = false` (pause automatique)
   - Pause réelle différente de pause prévue
   - Shifts de nuit

**Durée estimée :** 1-2 jours

**⚠️ IMPORTANT :** Cette correction doit être faite **AVANT** l'implémentation de l'éligibilité, car elle affecte la base du calcul.

---

### 6.1 Phase 1 : Éligibilité de Base (Priorité Haute)

**Objectif :** Permettre de définir si un employé est éligible ou non

**Implémentation :**
1. Ajouter `isEligibleForOvertime Boolean @default(true)` dans `Employee`
2. Modifier `calculateMetrics()` pour vérifier l'éligibilité
3. Modifier `OvertimeService.create()` pour rejeter si non éligible
4. Ajouter champ dans l'interface employé

**Durée estimée :** 1-2 jours

---

### 6.2 Phase 2 : Plafonds (Priorité Moyenne)

**Objectif :** Permettre de définir des plafonds mensuels/hebdomadaires

**Implémentation :**
1. Ajouter `maxOvertimeHoursPerMonth` et `maxOvertimeHoursPerWeek` dans `Employee`
2. Créer méthode `checkOvertimeLimits()` dans `OvertimeService`
3. Vérifier les plafonds avant création/approbation
4. Afficher alertes si plafond atteint

**Durée estimée :** 2-3 jours

---

### 6.3 Phase 3 : Création Automatique (Priorité Moyenne)

**Objectif :** Créer automatiquement les Overtime depuis les Attendance

**Implémentation :**
1. Créer job batch quotidien
2. Analyser les Attendance avec `overtimeMinutes > 0`
3. Créer Overtime si seuil minimum atteint (ex: 30 min)
4. Respecter l'éligibilité et les plafonds

**Durée estimée :** 3-4 jours

---

### 6.4 Phase 4 : Gestion Avancée (Priorité Faible)

**Objectif :** Restrictions temporelles, jours spécifiques, etc.

**Implémentation :**
1. Ajouter champs supplémentaires si besoin
2. Logique de validation avancée
3. Interface de configuration

**Durée estimée :** 4-5 jours

---

## 7. 📋 Règles Métier à Implémenter

### 7.0 Règle 0 : Calcul de la Pause Réelle (CRITIQUE)
```
1. Récupérer TenantSettings.requireBreakPunch et TenantSettings.breakDuration

2. SI requireBreakPunch = true :
   a. Récupérer tous les pointages BREAK_START et BREAK_END du jour
   b. Trier par timestamp croissant
   c. Pour chaque paire (BREAK_START, BREAK_END) :
      - Calculer durée = BREAK_END.timestamp - BREAK_START.timestamp
      - Ajouter à la pause réelle totale
   d. Si BREAK_START sans BREAK_END correspondant :
      - Option A : Ignorer (pause non terminée)
      - Option B : Utiliser l'heure actuelle ou OUT comme fin de pause
   e. pause réelle = somme des durées calculées

3. SI requireBreakPunch = false :
   a. pause réelle = TenantSettings.breakDuration (durée configurée)
   b. Pas besoin de pointages BREAK_START/BREAK_END

4. Heures travaillées netes = (OUT - IN) - pause réelle
```

**Cas spéciaux :**
- `requireBreakPunch = true` + pas de pointage de pause → pause réelle = 0 (employé n'a pas pris de pause)
- `requireBreakPunch = false` → pause réelle = `TenantSettings.breakDuration` (automatique)
- Plusieurs pauses dans la journée → somme de toutes les pauses (si pointage activé)
- BREAK_START sans BREAK_END → traiter selon la politique (ignorer ou utiliser OUT)
- **Pause prévue** : Utilise toujours `TenantSettings.breakDuration` (priorité sur `Shift.breakDuration`)

### 7.1 Règle 1 : Éligibilité de Base
```
SI employee.isEligibleForOvertime = false
  ALORS overtimeMinutes = 0 (pas de calcul)
  ET création Overtime interdite
```

### 7.2 Règle 2 : Plafond Mensuel
```
SI employee.maxOvertimeHoursPerMonth existe
  ALORS vérifier cumul mensuel
  SI cumul + nouvelles heures > plafond
    ALORS accepter seulement jusqu'au plafond
    ET rejeter le surplus
```

### 7.3 Règle 3 : Plafond Hebdomadaire
```
SI employee.maxOvertimeHoursPerWeek existe
  ALORS vérifier cumul hebdomadaire
  SI cumul + nouvelles heures > plafond
    ALORS accepter seulement jusqu'au plafond
    ET rejeter le surplus
```

### 7.4 Règle 4 : Seuil Minimum (Recommandé)
```
SI overtimeMinutes < seuilMinimum (ex: 30 min)
  ALORS ne pas créer d'Overtime automatiquement
  (mais garder la métrique dans Attendance)
```

---

## 8. 🔍 Points d'Attention Techniques

### 8.1 Performance

**Impact :**
- Vérification d'éligibilité = 1 requête DB supplémentaire
- Vérification plafonds = agrégation sur Overtime

**Optimisation :**
- Cache l'éligibilité de l'employé
- Index sur `Overtime.employeeId` et `Overtime.date` pour plafonds

---

### 8.2 Cohérence des Données

**Problème potentiel :**
- Si éligibilité changée, que faire des Overtime déjà créés ?

**Solution :**
- Les Overtime existants restent inchangés
- Seulement les nouveaux calculs sont affectés
- Historique préservé

---

### 8.3 Interface Utilisateur

**Champs à ajouter :**
- Checkbox "Éligible aux heures supplémentaires"
- Champs "Plafond mensuel" et "Plafond hebdomadaire" (optionnels)
- Affichage du cumul actuel dans la fiche employé

**Messages d'alerte :**
- "Cet employé n'est pas éligible aux heures supplémentaires"
- "Plafond mensuel atteint : X heures acceptées, Y heures rejetées"

---

## 9. 📊 Métriques et Reporting

### 9.1 Métriques à Ajouter

**Par employé :**
- Cumul heures sup ce mois (avec/without plafond)
- Cumul heures sup cette semaine
- Nombre de jours avec heures sup
- Taux d'utilisation du plafond (si applicable)

**Global :**
- Nombre d'employés éligibles vs non éligibles
- Répartition heures sup par catégorie d'éligibilité
- Taux de respect des plafonds

---

## 10. ✅ Checklist d'Implémentation

### Phase 0 : Correction Calcul Pause Réelle (CRITIQUE)
- [ ] Modifier `calculateMetrics()` pour récupérer `TenantSettings.requireBreakPunch` et `TenantSettings.breakDuration`
- [ ] Implémenter logique conditionnelle selon `requireBreakPunch` :
  - [ ] Si `true` : Récupérer BREAK_START/BREAK_END et calculer pause réelle
  - [ ] Si `false` : Utiliser `TenantSettings.breakDuration` comme pause réelle
- [ ] Utiliser `TenantSettings.breakDuration` pour la pause prévue (priorité sur `Shift.breakDuration`)
- [ ] Déduire la pause réelle des heures travaillées brutes
- [ ] Gérer le cas où il n'y a pas de pointage de pause (si `requireBreakPunch = true`)
- [ ] Gérer le cas de plusieurs pauses dans la journée
- [ ] Gérer BREAK_START sans BREAK_END correspondant
- [ ] Tests unitaires :
  - [ ] `requireBreakPunch = true` avec pointages
  - [ ] `requireBreakPunch = true` sans pointages
  - [ ] `requireBreakPunch = false` (pause automatique)
  - [ ] Pause réelle différente de pause prévue
  - [ ] Shifts de nuit

### Phase 1 : Éligibilité de Base
- [ ] Ajouter `isEligibleForOvertime` dans `Employee` (Prisma)
- [ ] Migration Prisma
- [ ] Modifier `calculateMetrics()` pour vérifier éligibilité
- [ ] Modifier `OvertimeService.create()` pour valider éligibilité
- [ ] Ajouter champ dans formulaire employé (frontend)
- [ ] Afficher éligibilité dans fiche employé
- [ ] Tests unitaires

### Phase 2 : Plafonds
- [ ] Ajouter `maxOvertimeHoursPerMonth` et `maxOvertimeHoursPerWeek`
- [ ] Créer méthode `checkOvertimeLimits()`
- [ ] Intégrer vérification dans création/approbation
- [ ] Ajouter alertes UI
- [ ] Tests unitaires

### Phase 3 : Création Automatique
- [ ] Créer job batch quotidien
- [ ] Logique de création depuis Attendance
- [ ] Respect éligibilité et plafonds
- [ ] Tests end-to-end

---

## 11. 🎯 Conclusion

### Points Forts Actuels
✅ Calcul précis et fiable
✅ Gestion correcte des shifts de nuit
✅ Arrondi configurable
✅ Support des heures personnalisées

### Améliorations Nécessaires
🔧 **Éligibilité par employé** (priorité haute)
🔧 **Plafonds mensuels/hebdomadaires** (priorité moyenne)
🔧 **Création automatique d'Overtime** (priorité moyenne)
🔧 **Seuil minimum configurable** (priorité basse)

### Impact Business
- **Contrôle accru** : Gestion fine de qui peut avoir des heures sup
- **Conformité** : Respect des contrats et réglementations
- **Automatisation** : Réduction du travail manuel des managers
- **Transparence** : Visibilité sur les plafonds et restrictions

---

**Date d'analyse :** 2025-01-XX
**Version :** 1.0
**Statut :** 📋 Analyse complète - Prêt pour implémentation

