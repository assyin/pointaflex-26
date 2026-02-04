# Analyse Complète : Jours Supplémentaires (SupplementaryDay)

> Document généré le 03/02/2026
> PointageFlex - Module Heures Supplémentaires

---

## 1. Vue d'ensemble

Les **Jours Supplémentaires** représentent le travail effectué en dehors du planning normal, spécifiquement :
- **Samedis** (WEEKEND_SATURDAY)
- **Dimanches** (WEEKEND_SUNDAY)
- **Jours Fériés** (HOLIDAY)

Ce module est distinct des **Heures Supplémentaires (Overtime)** qui concernent le dépassement des heures de travail sur un jour ouvrable.

---

## 2. Architecture du Module

### 2.1 Fichiers Principaux

```
backend/src/modules/supplementary-days/
├── supplementary-days.module.ts          # Module NestJS
├── supplementary-days.controller.ts      # Endpoints API
├── supplementary-days.service.ts         # Logique métier
├── jobs/
│   └── detect-supplementary-days.job.ts  # Job batch de consolidation
└── dto/
    ├── create-supplementary-day.dto.ts   # DTO création
    └── approve-supplementary-day.dto.ts  # DTO approbation
```

### 2.2 Modèle de Données (Prisma)

```prisma
model SupplementaryDay {
  id              String                 @id @default(uuid())
  createdAt       DateTime               @default(now())
  updatedAt       DateTime               @updatedAt
  tenantId        String
  employeeId      String

  date            DateTime               @db.Date
  hours           Decimal                // Heures travaillées
  approvedHours   Decimal?               // Heures approuvées

  type            SupplementaryDayType   // WEEKEND_SATURDAY, WEEKEND_SUNDAY, HOLIDAY
  source          String                 // AUTO_DETECTED, MANUAL

  // Informations de pointage
  checkIn         DateTime?
  checkOut        DateTime?
  attendanceId    String?                // Lien vers le pointage OUT

  // Workflow d'approbation
  status          OvertimeStatus         // PENDING, APPROVED, REJECTED, RECOVERED
  approvedBy      String?
  approvedAt      DateTime?
  rejectionReason String?

  // Conversion en récupération
  convertedToRecovery          Boolean   @default(false)
  convertedToRecoveryDays      Boolean   @default(false)
  convertedHoursToRecoveryDays Decimal   @default(0)

  notes           String?
}
```

### 2.3 Types de Jours Supplémentaires

| Type | Description | Détection |
|------|-------------|-----------|
| `WEEKEND_SATURDAY` | Travail le samedi | `dayOfWeek === 6` |
| `WEEKEND_SUNDAY` | Travail le dimanche | `dayOfWeek === 0` |
| `HOLIDAY` | Travail jour férié | Table `Holiday` du tenant |

---

## 3. Mécanisme de Détection

### 3.1 Modèle Hybride (Temps Réel + Batch)

Le système utilise un **modèle hybride** à deux niveaux :

```
┌─────────────────────────────────────────────────────────────────┐
│                    MODÈLE HYBRIDE                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  NIVEAU 1 - TEMPS RÉEL                                          │
│  ════════════════════                                           │
│  Déclencheur: Pointage OUT                                      │
│  Méthode: AttendanceService.createAutoSupplementaryDay()        │
│  Timing: Immédiat lors du pointage                              │
│                                                                 │
│  ↓                                                              │
│                                                                 │
│  NIVEAU 2 - BATCH (FILET DE SÉCURITÉ)                           │
│  ════════════════════════════════════                           │
│  Job: DetectSupplementaryDaysJob                                │
│  Cron: 00:30 chaque jour                                        │
│  Rôle: Rattraper les créations manquées                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Niveau 1 : Détection Temps Réel

**Fichier**: `attendance.service.ts` (ligne 282)

**Déclencheurs**:
1. Pointage manuel (create) - ligne 582
2. Pointage terminal webhook - ligne 2025
3. Correction de pointage - ligne 2919

**Flux de détection**:

```
Pointage OUT reçu
       │
       ▼
┌──────────────────────────────┐
│  hoursWorked > 0 ?           │──Non──► FIN
└──────────────────────────────┘
       │ Oui
       ▼
┌──────────────────────────────┐
│  Trouver le pointage IN      │
│  correspondant               │
└──────────────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│  Appeler                     │
│  supplementaryDaysService.   │
│  createAutoSupplementaryDay()│
└──────────────────────────────┘
```

### 3.3 Niveau 2 : Job Batch de Consolidation

**Fichier**: `detect-supplementary-days.job.ts`

**Exécution**: `@Cron('30 0 * * *')` = **00:30 chaque jour**

**Rôle**: Filet de sécurité pour rattraper les jours supplémentaires non créés en temps réel.

```
Job démarre à 00:30
       │
       ▼
┌────────────────────────────────────┐
│  Calculer "yesterday"              │
│  (veille du jour actuel)           │
└────────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────┐
│  Pour chaque tenant:               │
│  supplementaryDaysService.         │
│  detectMissingSupplementaryDays()  │
└────────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────┐
│  Log des statistiques:             │
│  - created (créés)                 │
│  - existing (déjà existants)       │
│  - skipped (ignorés)               │
│  - errors (erreurs)                │
└────────────────────────────────────┘
```

---

## 4. Logique de Création (createAutoSupplementaryDay)

**Fichier**: `supplementary-days.service.ts` (ligne 463)

### 4.1 Paramètres d'entrée

```typescript
interface CreateAutoSupplementaryDayParams {
  tenantId: string;
  employeeId: string;
  attendanceId: string;
  date: Date;
  checkIn: Date;
  checkOut: Date;
  hoursWorked: number;
}
```

### 4.2 Algorithme de Création

```
┌────────────────────────────────────────────────────────────────┐
│  ÉTAPE 1: Déterminer le type de jour                           │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Pour les SHIFTS DE NUIT, priorité au checkIn:                 │
│  - IN samedi 22:00, OUT dimanche 06:00 → WEEKEND_SATURDAY      │
│  - IN vendredi 22:00, OUT samedi 06:00 → WEEKEND_SATURDAY      │
│                                                                │
│  1. Vérifier checkIn → isSupplementaryDay(tenantId, checkIn)   │
│     Si weekend/férié → utiliser ce type                        │
│                                                                │
│  2. Sinon vérifier checkOut                                    │
│     Si weekend/férié → utiliser ce type                        │
│                                                                │
│  3. Aucun → return { created: false }                          │
│                                                                │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│  ÉTAPE 2: Vérifier l'éligibilité de l'employé                  │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  - employee.isEligibleForOvertime === true ?                   │
│    (utilise le même flag que les heures sup)                   │
│                                                                │
│  Si non éligible → return { created: false }                   │
│                                                                │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│  ÉTAPE 3: Vérifier si jour supp existe déjà                    │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  SELECT * FROM SupplementaryDay WHERE                          │
│    tenantId = ? AND                                            │
│    employeeId = ? AND                                          │
│    date BETWEEN startOfDay AND endOfDay                        │
│                                                                │
│  Si existe → return { created: false, reason: 'déjà existant' }│
│                                                                │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│  ÉTAPE 4: Vérifier si l'employé est en congé                   │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  SELECT * FROM Leave WHERE                                     │
│    employeeId = ? AND                                          │
│    startDate <= date AND endDate >= date AND                   │
│    status IN ('APPROVED', 'MANAGER_APPROVED', 'HR_APPROVED')   │
│                                                                │
│  Si en congé → return { created: false }                       │
│                                                                │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│  ÉTAPE 5: Vérifier le seuil minimum                            │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  minimumThreshold = tenantSettings.overtimeMinimumThreshold    │
│                     (par défaut: 30 minutes = 0.5h)            │
│                                                                │
│  Si hoursWorked < minimumThreshold → return { created: false } │
│                                                                │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│  ÉTAPE 6: Créer le SupplementaryDay                            │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  INSERT INTO SupplementaryDay {                                │
│    tenantId,                                                   │
│    employeeId,                                                 │
│    date: startOfDay,                                           │
│    hours: hoursWorked,                                         │
│    type: finalType,                                            │
│    source: 'AUTO_DETECTED',                                    │
│    checkIn,                                                    │
│    checkOut,                                                   │
│    attendanceId,                                               │
│    status: 'PENDING',                                          │
│    notes: 'Détecté automatiquement depuis pointage'            │
│  }                                                             │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## 5. Méthode isSupplementaryDay()

**Fichier**: `supplementary-days.service.ts` (ligne 422)

```typescript
async isSupplementaryDay(tenantId: string, date: Date): Promise<{
  isSupplementary: boolean;
  type: SupplementaryDayType | null;
}>
```

### Logique de détection

```
┌──────────────────────────────────────┐
│  1. Vérifier jour férié              │
│     SELECT * FROM Holiday WHERE      │
│     tenantId = ? AND date = ?        │
├──────────────────────────────────────┤
│  Si trouvé → return {                │
│    isSupplementary: true,            │
│    type: HOLIDAY                     │
│  }                                   │
└──────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│  2. Vérifier weekend                 │
│     dayOfWeek = date.getDay()        │
├──────────────────────────────────────┤
│  Si dayOfWeek === 0 → return {       │
│    isSupplementary: true,            │
│    type: WEEKEND_SUNDAY              │
│  }                                   │
│                                      │
│  Si dayOfWeek === 6 → return {       │
│    isSupplementary: true,            │
│    type: WEEKEND_SATURDAY            │
│  }                                   │
└──────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│  3. Jour ouvrable normal             │
│  return {                            │
│    isSupplementary: false,           │
│    type: null                        │
│  }                                   │
└──────────────────────────────────────┘
```

---

## 6. Workflow d'Approbation

### 6.1 États (Status)

| Status | Description |
|--------|-------------|
| `PENDING` | En attente de validation par un manager |
| `APPROVED` | Approuvé - heures comptabilisées |
| `REJECTED` | Rejeté avec motif |
| `RECOVERED` | Converti en jour(s) de récupération |

### 6.2 Cycle de Vie

```
                    ┌─────────┐
                    │ PENDING │
                    └────┬────┘
                         │
           ┌─────────────┼─────────────┐
           │             │             │
           ▼             ▼             ▼
     ┌──────────┐  ┌──────────┐  ┌──────────┐
     │ APPROVED │  │ REJECTED │  │  (reste  │
     └────┬─────┘  └──────────┘  │  PENDING)│
          │              ▲       └──────────┘
          │              │
          │        revokeRejection()
          │
          ▼
    ┌───────────┐
    │ RECOVERED │ (conversion en récupération)
    └───────────┘
```

### 6.3 Actions Disponibles

| Action | Méthode | Condition |
|--------|---------|-----------|
| Approuver | `approve()` | status === PENDING |
| Rejeter | `approve()` | status === PENDING |
| Convertir en récup | `convertToRecovery()` | status === APPROVED |
| Annuler approbation | `revokeApproval()` | status === APPROVED && !converti |
| Annuler rejet | `revokeRejection()` | status === REJECTED |
| Supprimer | `remove()` | status === PENDING |

---

## 7. Endpoints API

### 7.1 Routes Principales

```
GET    /supplementary-days              # Liste avec filtres
GET    /supplementary-days/stats        # Statistiques dashboard
GET    /supplementary-days/:id          # Détail d'un jour
POST   /supplementary-days              # Création manuelle
POST   /supplementary-days/:id/approve  # Approuver/Rejeter
POST   /supplementary-days/:id/convert  # Convertir en récupération
DELETE /supplementary-days/:id          # Supprimer (si PENDING)
```

### 7.2 Filtres disponibles (findAll)

```typescript
{
  employeeId?: string;
  status?: OvertimeStatus;
  type?: SupplementaryDayType;
  startDate?: string;
  endDate?: string;
  siteId?: string;
  departmentId?: string;
}
```

---

## 8. Dashboard Statistiques

### 8.1 Métriques Affichées

| Métrique | Description |
|----------|-------------|
| Total jours supp. | Nombre total + heures |
| Jours en attente | Count status = PENDING |
| Jours approuvés | Count status = APPROVED |
| Jours récupérés | Count status = RECOVERED |
| Taux conversion | % RECOVERED / APPROVED |

### 8.2 Regroupement par Type

```json
{
  "byType": [
    { "type": "WEEKEND_SATURDAY", "count": 5, "hours": 40.5 },
    { "type": "WEEKEND_SUNDAY", "count": 3, "hours": 24.0 },
    { "type": "HOLIDAY", "count": 1, "hours": 8.0 }
  ]
}
```

---

## 9. Différences avec Heures Supplémentaires (Overtime)

| Aspect | Jours Supplémentaires | Heures Supplémentaires |
|--------|----------------------|------------------------|
| **Quand** | Weekend / Jour férié | Jour ouvrable |
| **Ce qu'on compte** | Toutes les heures travaillées | Heures au-delà du planning |
| **Type** | WEEKEND_SATURDAY, WEEKEND_SUNDAY, HOLIDAY | STANDARD, NIGHT, HOLIDAY, EMERGENCY |
| **Seuil minimum** | Même (overtimeMinimumThreshold) | Même |
| **Éligibilité** | isEligibleForOvertime | isEligibleForOvertime |
| **Conversion** | En jours de récupération | En récupération ou paiement |

---

## 10. Points d'Attention / Problèmes Potentiels

### 10.1 Pourquoi 0 Jours Supplémentaires ?

Si l'écran affiche "Aucun jour supplémentaire trouvé", vérifier :

1. **Pas de pointages weekend/férié**
   - Vérifier s'il y a des pointages OUT les samedis/dimanches/fériés

2. **Éligibilité des employés**
   - Vérifier `employee.isEligibleForOvertime = true`

3. **Seuil minimum non atteint**
   - Par défaut 30 minutes
   - Si travaillé moins → pas de création

4. **Job batch pas encore exécuté**
   - Le job s'exécute à 00:30
   - Pour la détection manuelle, utiliser l'endpoint admin

5. **Employés en congé**
   - Si l'employé a un congé approuvé ce jour → pas de création

### 10.2 Shifts de Nuit

Pour les shifts de nuit traversant minuit :
- **Priorité au checkIn** pour déterminer le type
- Exemple: IN samedi 22:00, OUT dimanche 06:00 → `WEEKEND_SATURDAY`

---

## 11. Configuration Tenant

### Paramètres Impactants (TenantSettings)

| Paramètre | Impact |
|-----------|--------|
| `overtimeMinimumThreshold` | Seuil minimum en minutes (défaut: 30) |
| Table `Holiday` | Liste des jours fériés pour détecter type HOLIDAY |

---

## 12. Logs et Debugging

### Messages de Log Importants

```
✅ [SupplementaryDay] Créé automatiquement: John Doe, 2026-02-01, 8.50h, type=WEEKEND_SATURDAY

⚠️ [CONSOLIDATION] 2 jour(s) supplémentaire(s) manquant(s) créé(s) pour Entreprise X

📊 Consolidation terminée: 5 créés, 10 existants, 2 ignorés, 0 erreurs
```

### Raisons de Skip

| Raison | Log |
|--------|-----|
| Pas weekend/férié | "Ce n'est pas un weekend ni un jour férié" |
| Non éligible | "Employé non éligible" |
| Déjà existant | "Jour supplémentaire déjà existant" |
| En congé | "Employé en congé" |
| Heures insuffisantes | "Heures insuffisantes (< 0.5h)" |

---

## 13. Recommandations

1. **Vérifier régulièrement les logs** du job de consolidation à 00:30
2. **S'assurer que les jours fériés** sont bien configurés dans la table Holiday
3. **Activer l'éligibilité** pour les employés concernés (isEligibleForOvertime)
4. **Ajuster le seuil minimum** si nécessaire dans TenantSettings

---

*Document généré automatiquement - PointageFlex Backend Analysis*
