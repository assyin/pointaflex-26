# Analyse du Système Heures Supplémentaires et Récupération

**Date:** 23 Janvier 2026
**Module:** Overtime / Recovery
**Version:** PointaFlex v1.0

---

## 1. Cas d'Usage Métier (Exemple CIT)

### Scénario Type

Un employé du secteur CIT travaille 16 heures par jour en continu du lundi au jeudi. Son manager lui accorde une récupération le vendredi.

```
┌──────────────────────────────────────────────────────────────┐
│  SEMAINE TYPE - EMPLOYÉ CIT                                  │
├──────────────┬─────────────┬─────────────┬───────────────────┤
│ Jour         │ Heures      │ Base légale │ Heures Sup        │
├──────────────┼─────────────┼─────────────┼───────────────────┤
│ Lundi        │ 16h         │ 8h          │ +8h               │
│ Mardi        │ 16h         │ 8h          │ +8h               │
│ Mercredi     │ 16h         │ 8h          │ +8h               │
│ Jeudi        │ 16h         │ 8h          │ +8h               │
├──────────────┼─────────────┼─────────────┼───────────────────┤
│ TOTAL        │ 64h         │ 32h         │ 32h sup           │
└──────────────┴─────────────┴─────────────┴───────────────────┘

Décision Manager: Convertir 32h → Jour(s) de récupération
Résultat: Heures sup payées annulées → Remplacées par récup
```

### Règles Métier

1. **Cumul des heures**: Les heures supplémentaires de plusieurs jours peuvent être cumulées
2. **Conversion flexible**: Le manager décide du nombre de jours de récupération
3. **Dates autorisées**: Dates futures ET passées (régularisation)
4. **Annulation paiement**: Les heures converties ne sont plus payées

---

## 2. État Actuel de l'Implémentation

### 2.1 Modèles de Données (Prisma)

#### Overtime (Heures Supplémentaires)
```prisma
model Overtime {
  id                        String   @id @default(uuid())
  tenantId                  String
  employeeId                String
  date                      DateTime
  hours                     Decimal  // Heures demandées
  approvedHours             Decimal? // Heures validées par manager
  type                      OvertimeType // STANDARD, NIGHT, HOLIDAY, EMERGENCY
  rate                      Decimal  // Taux multiplicateur (1.25, 1.50, 2.0)
  status                    OvertimeStatus // PENDING, APPROVED, REJECTED, PAID, RECOVERED

  // Champs de conversion
  convertedToRecovery       Boolean  @default(false)
  recoveryId                String?
  convertedToRecoveryDays   Boolean  @default(false)
  convertedHoursToRecoveryDays Decimal @default(0)

  // Relations
  recoveryDays              OvertimeRecoveryDay[]
}
```

#### RecoveryDay (Jour de Récupération)
```prisma
model RecoveryDay {
  id              String   @id @default(uuid())
  tenantId        String
  employeeId      String
  startDate       DateTime
  endDate         DateTime
  days            Decimal  // Nombre de jours
  sourceHours     Decimal  // Heures utilisées pour conversion
  conversionRate  Decimal? // Taux appliqué
  status          RecoveryDayStatus // PENDING, APPROVED, USED, CANCELLED

  // Relations
  overtimeSources OvertimeRecoveryDay[]
}
```

#### OvertimeRecoveryDay (Table de Liaison)
```prisma
model OvertimeRecoveryDay {
  id            String @id @default(uuid())
  overtimeId    String
  recoveryDayId String
  hoursUsed     Decimal // Heures de cet OT utilisées

  @@unique([overtimeId, recoveryDayId])
}
```

### 2.2 Paramètres de Configuration (TenantSettings)

| Paramètre | Défaut | Description |
|-----------|--------|-------------|
| `dailyWorkingHours` | 7.33h | Heures par jour ouvré (base conversion) |
| `recoveryConversionRate` | 1.0 | Ratio heures sup → heures récup |
| `recoveryExpiryDays` | 90 | Jours avant expiration des récups |
| `overtimeRate` | 1.25 | Taux standard |
| `overtimeRateNight` | 1.50 | Taux nuit |
| `overtimeRateHoliday` | 2.00 | Taux jour férié |

### 2.3 Endpoints API Existants

#### Overtime Controller
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/overtime` | Créer heures sup |
| GET | `/overtime` | Lister heures sup |
| POST | `/overtime/:id/approve` | Approuver/Rejeter |
| POST | `/overtime/:id/convert-to-recovery` | Convertir (ancien modèle) |
| GET | `/overtime/cumulative-balance/:employeeId` | Solde cumulé |

#### Recovery Days Controller
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/recovery-days/cumulative-balance/:employeeId` | Solde cumulé pour conversion |
| POST | `/recovery-days/convert-from-overtime` | Convertir cumul → récup |
| POST | `/recovery-days/:id/approve` | Approuver récup |
| POST | `/recovery-days/:id/cancel` | Annuler (retourne heures) |

---

## 3. Analyse des Écarts

### 3.1 Fonctionnalités Implémentées ✅

| Fonctionnalité | État | Détails |
|----------------|------|---------|
| Création heures sup | ✅ | Automatique via pointage ou manuelle |
| Approbation manager | ✅ | PENDING → APPROVED/REJECTED |
| Cumul des heures | ✅ | Agrégation de toutes les heures APPROVED |
| Conversion → Récup | ✅ | Endpoint `convertFromOvertime` |
| Liaison FIFO | ✅ | Allocation des heures les plus anciennes d'abord |
| Annulation heures payées | ✅ | Status → RECOVERED |
| Annulation récup | ✅ | Retourne les heures au solde |

### 3.2 Problèmes Identifiés ⚠️

#### Problème 1: Workflow en 2 Étapes
```
ACTUEL:
1. Manager convertit heures → RecoveryDay (PENDING)
2. Manager approuve RecoveryDay (APPROVED)
   └── Double action inutile

SOUHAITÉ:
1. Manager convertit heures → RecoveryDay (APPROVED direct)
   └── Le manager décide, donc pas besoin de 2ème approbation
```

#### Problème 2: Dates Passées
```
ACTUEL:
- Validation vérifie conflits avec congés/récups existants
- Pas de blocage explicite des dates passées
- Comportement non documenté

SOUHAITÉ:
- Dates passées explicitement autorisées (régularisation)
- Option configurable par tenant
```

#### Problème 3: Interface Utilisateur
```
ACTUEL:
- Interface basique de conversion
- Pas de visualisation claire du solde

SOUHAITÉ:
- Tableau de bord clair avec solde
- Détail des heures par jour (FIFO visible)
- Calcul automatique des jours possibles
```

---

## 4. Proposition de Solution

### 4.1 Workflow Optimisé

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    FLUX HEURES SUP → RÉCUPÉRATION                           │
└─────────────────────────────────────────────────────────────────────────────┘

     EMPLOYÉ                         SYSTÈME                        MANAGER
        │                               │                               │
        │  Pointage 16h/jour            │                               │
        ├──────────────────────────────►│                               │
        │                               │  Création auto heures sup     │
        │                               │  (8h/jour × 4 jours = 32h)    │
        │                               │  Status: PENDING              │
        │                               │                               │
        │                               │◄──────────────────────────────┤
        │                               │  Approbation heures sup       │
        │                               │  Status: APPROVED             │
        │                               │                               │
        │                               │         ┌─────────────────────┤
        │                               │         │ Consulte solde      │
        │                               │         │ cumulé: 32h dispo   │
        │                               │         │ = 4.36 jours récup  │
        │                               │         │ (32h ÷ 7.33h/jour)  │
        │                               │         └─────────────────────┤
        │                               │                               │
        │                               │◄──────────────────────────────┤
        │                               │  Conversion directe:          │
        │                               │  - 32h → 1 jour récup         │
        │                               │  - Date: Vendredi 24/01       │
        │                               │  - Status: APPROVED (direct)  │
        │                               │                               │
        │                               │  Actions automatiques:        │
        │                               │  ✓ Création RecoveryDay       │
        │                               │  ✓ Liaison FIFO aux OT        │
        │                               │  ✓ OT status → RECOVERED      │
        │                               │  ✓ Heures déduites du solde   │
        │                               │                               │
        │◄──────────────────────────────│  Notification employé         │
        │  "Récup accordée: 24/01"      │                               │
        │                               │                               │
```

### 4.2 Modifications Backend

#### A. Option Auto-Approve pour Conversion

```typescript
// POST /recovery-days/convert-from-overtime
interface ConvertFromOvertimeDto {
  employeeId: string;
  startDate: string;      // Format YYYY-MM-DD
  endDate: string;
  days: number;
  notes?: string;
  autoApprove?: boolean;  // NOUVEAU: Approuver directement
}

// Si autoApprove = true:
// - RecoveryDay créé avec status = APPROVED
// - approvedBy = manager actuel
// - approvedAt = maintenant
```

#### B. Autorisation Dates Passées

```typescript
// Nouveau paramètre TenantSettings
recoveryAllowPastDates: boolean  // Défaut: true

// Ou option par requête
interface ConvertFromOvertimeDto {
  // ...
  allowPastDate?: boolean;  // Override pour cette requête
}
```

#### C. Endpoint Calcul Automatique

```typescript
// GET /recovery-days/calculate
// Query params: employeeId, hours (optionnel)

interface CalculateResponse {
  availableHours: number;      // Heures dispo pour conversion
  dailyWorkingHours: number;   // Base horaire journalière
  conversionRate: number;      // Taux de conversion
  possibleDays: number;        // Jours possibles (décimal)
  roundedDays: number;         // Jours arrondis (inférieur)
  remainingHours: number;      // Heures restantes après arrondi

  // Détail par overtime (FIFO)
  overtimeBreakdown: Array<{
    id: string;
    date: string;
    hours: number;
    availableHours: number;
  }>;
}
```

### 4.3 Interface Utilisateur - Conversion Flexible

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  CONVERSION HEURES SUPPLÉMENTAIRES → RÉCUPÉRATION                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Employé: Mohamed EL KHAYATI (00994)                                        │
│  Département: CIT                                                            │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  CUMUL HEURES SUPPLÉMENTAIRES DISPONIBLES                                    │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │   32.00 heures supplémentaires approuvées                               ││
│  │   Base: 7.33h/jour                                                       ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  ÉTAPE 1: SÉLECTIONNER LES HEURES À CONVERTIR                               │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                                                                         │ │
│  │  ☑ Lundi    20/01/2026   8.00h   APPROVED                              │ │
│  │  ☑ Mardi    21/01/2026   8.00h   APPROVED                              │ │
│  │  ☐ Mercredi 22/01/2026   8.00h   APPROVED                              │ │
│  │  ☐ Jeudi    23/01/2026   8.00h   APPROVED                              │ │
│  │                                                                         │ │
│  │  ─────────────────────────────────────────────────────────────────────  │ │
│  │  [Tout sélectionner]  [Tout désélectionner]                            │ │
│  │                                                                         │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  📊 RÉSUMÉ DE LA SÉLECTION                                             │ │
│  │  ─────────────────────────────────────────────────────────────────────  │ │
│  │  Heures sélectionnées:     16.00h  → Seront converties (non payées)    │ │
│  │  Heures non sélectionnées: 16.00h  → Resteront payables                │ │
│  │  Maximum jours récup:      2 jours (16h ÷ 7.33h)                       │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  ÉTAPE 2: DÉFINIR LA RÉCUPÉRATION                                           │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                                                                         │ │
│  │  Date(s) de récupération:                                              │ │
│  │  Du: [ 24/01/2026 ]  Au: [ 25/01/2026 ]  📅                           │ │
│  │                                                                         │ │
│  │  ☑ Autoriser date passée (régularisation)                              │ │
│  │                                                                         │ │
│  │  Nombre de jours accordés:  [ 2 ▼ ]                                    │ │
│  │                             (Min: 1 | Max: 2)                          │ │
│  │                                                                         │ │
│  │  Notes: [ Récupération pour heures sup semaine 4                    ]  │ │
│  │                                                                         │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│     [ Annuler ]                                    [ Suivant → Confirmer ]  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.4 Interface - Écran de Confirmation

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ⚠️  CONFIRMATION DE CONVERSION                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Employé: Mohamed EL KHAYATI (00994)                                        │
│  Département: CIT                                                            │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │  🔄 HEURES QUI SERONT CONVERTIES (non payées)                          ││
│  │  ──────────────────────────────────────────────                         ││
│  │  • Lundi 20/01/2026      8.00h   → RECOVERED                           ││
│  │  • Mardi 21/01/2026      8.00h   → RECOVERED                           ││
│  │  ──────────────────────────────────────────────                         ││
│  │  Total: 16.00h                                                          ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │  💰 HEURES QUI RESTERONT PAYABLES                                      ││
│  │  ──────────────────────────────────────────────                         ││
│  │  • Mercredi 22/01/2026   8.00h   → APPROVED (payable)                  ││
│  │  • Jeudi 23/01/2026      8.00h   → APPROVED (payable)                  ││
│  │  ──────────────────────────────────────────────                         ││
│  │  Total: 16.00h                                                          ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │  📅 RÉCUPÉRATION ACCORDÉE                                               ││
│  │  ──────────────────────────────────────────────                         ││
│  │  Date(s): 24/01/2026 - 25/01/2026                                       ││
│  │  Jours: 2                                                                ││
│  │  Notes: Récupération pour heures sup semaine 4                          ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ⚠️  Cette action est irréversible. Les heures converties ne pourront      │
│      plus être payées.                                                       │
│                                                                              │
│     [ ← Retour ]                              [ ✓ Confirmer la Conversion ] │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.5 Logique de Validation - Conversion Flexible

```typescript
interface OvertimeRecord {
  id: string;
  date: string;
  hours: number;
  status: 'APPROVED' | 'PENDING' | 'REJECTED' | 'PAID' | 'RECOVERED';
  selected: boolean;  // Sélectionné par le manager
}

interface ConversionValidation {
  valid: boolean;
  error?: string;
  heuresSelectionnees: number;
  heuresNonSelectionnees: number;
  maxJours: number;
  minJours: number;
}

function validateFlexibleConversion(
  overtimes: OvertimeRecord[],
  joursDemandes: number,
  heuresJournalieres: number = 7.33
): ConversionValidation {

  // Filtrer uniquement les heures APPROVED
  const eligible = overtimes.filter(ot => ot.status === 'APPROVED');

  // Calculer les heures sélectionnées et non sélectionnées
  const heuresSelectionnees = eligible
    .filter(ot => ot.selected)
    .reduce((sum, ot) => sum + ot.hours, 0);

  const heuresNonSelectionnees = eligible
    .filter(ot => !ot.selected)
    .reduce((sum, ot) => sum + ot.hours, 0);

  // Calculer le maximum de jours basé sur la SÉLECTION
  const maxJours = Math.floor(heuresSelectionnees / heuresJournalieres);
  const minJours = 1;

  // Validations
  if (heuresSelectionnees === 0) {
    return {
      valid: false,
      error: "Aucune heure sélectionnée",
      heuresSelectionnees: 0,
      heuresNonSelectionnees,
      maxJours: 0,
      minJours: 0
    };
  }

  if (heuresSelectionnees < heuresJournalieres) {
    return {
      valid: false,
      error: `Sélection insuffisante. Minimum ${heuresJournalieres}h requis pour 1 jour.`,
      heuresSelectionnees,
      heuresNonSelectionnees,
      maxJours: 0,
      minJours: 0
    };
  }

  if (joursDemandes < minJours) {
    return {
      valid: false,
      error: "Minimum 1 jour de récupération requis",
      heuresSelectionnees,
      heuresNonSelectionnees,
      maxJours,
      minJours
    };
  }

  if (joursDemandes > maxJours) {
    return {
      valid: false,
      error: `Maximum ${maxJours} jour(s) pour cette sélection de ${heuresSelectionnees}h`,
      heuresSelectionnees,
      heuresNonSelectionnees,
      maxJours,
      minJours
    };
  }

  return {
    valid: true,
    heuresSelectionnees,
    heuresNonSelectionnees,
    maxJours,
    minJours
  };
}
```

### 4.6 DTO Backend - Conversion Flexible

```typescript
// POST /recovery-days/convert-flexible
interface ConvertFlexibleDto {
  employeeId: string;

  // Liste des IDs d'overtime sélectionnés pour conversion
  overtimeIds: string[];

  // Détails de la récupération
  startDate: string;  // Format YYYY-MM-DD
  endDate: string;
  days: number;

  // Options
  autoApprove?: boolean;  // Approuver directement (recommandé pour managers)
  allowPastDate?: boolean;  // Autoriser date passée

  notes?: string;
}

// Réponse
interface ConvertFlexibleResponse {
  success: boolean;
  recoveryDay: RecoveryDay;

  // Détails de la conversion
  convertedOvertimes: Array<{
    id: string;
    date: string;
    hours: number;
    newStatus: 'RECOVERED';
  }>;

  remainingOvertimes: Array<{
    id: string;
    date: string;
    hours: number;
    status: 'APPROVED';  // Inchangé, reste payable
  }>;

  summary: {
    hoursConverted: number;
    hoursRemaining: number;
    daysGranted: number;
  };
}
```

---

## 5. Plan d'Implémentation

### Phase 1: Backend (Priorité Haute)

| # | Tâche | Complexité | Durée Est. |
|---|-------|------------|------------|
| 1.1 | Ajouter `autoApprove` au DTO de conversion | Faible | 1h |
| 1.2 | Implémenter logique auto-approve dans service | Faible | 2h |
| 1.3 | Ajouter paramètre `recoveryAllowPastDates` | Faible | 1h |
| 1.4 | Créer endpoint `/recovery-days/calculate` | Moyenne | 3h |
| 1.5 | Tests unitaires | Moyenne | 2h |

### Phase 2: Frontend (Priorité Haute)

| # | Tâche | Complexité | Durée Est. |
|---|-------|------------|------------|
| 2.1 | Refonte composant ConversionModal | Moyenne | 4h |
| 2.2 | Affichage solde avec détail FIFO | Moyenne | 3h |
| 2.3 | Calcul automatique jours/heures | Faible | 2h |
| 2.4 | Checkbox date passée | Faible | 1h |
| 2.5 | Tests E2E | Moyenne | 2h |

### Phase 3: Améliorations (Priorité Moyenne)

| # | Tâche | Complexité |
|---|-------|------------|
| 3.1 | Notification employé après conversion | Moyenne |
| 3.2 | Historique des conversions | Faible |
| 3.3 | Rapport récapitulatif mensuel | Moyenne |
| 3.4 | Export Excel des conversions | Faible |

---

## 6. Règles Métier de Conversion (Option B - Flexible)

### Principe Fondamental

> **CONVERSION FLEXIBLE: Le manager sélectionne précisément les heures à convertir.**
> - Les heures sélectionnées sont converties en récupération (RECOVERED)
> - Les heures non sélectionnées restent payables (APPROVED)
> - Contrôle total ligne par ligne (par journée d'heures sup)

### Avantages de l'Approche Flexible

| Avantage | Description |
|----------|-------------|
| **Contrôle précis** | Manager choisit exactement quelles heures convertir |
| **Gestion budgétaire** | Payer une partie en fin de mois si budget disponible |
| **Équité** | Plus juste vis-à-vis des collaborateurs |
| **Contexte opérationnel** | Ajuster selon la charge et les priorités |
| **Alignement RH** | Correspond aux pratiques RH réelles |

### Garde-fous Obligatoires

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  RÈGLES DE SÉCURITÉ - CONVERSION FLEXIBLE                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1️⃣  ÉLIGIBILITÉ                                                            │
│      → Seules les heures APPROVED peuvent être converties                   │
│      → Les heures PENDING, REJECTED, PAID, RECOVERED sont exclues           │
│                                                                              │
│  2️⃣  VALIDATION STRICTE                                                     │
│      → Max jours = PLANCHER(heures sélectionnées ÷ heuresJournalières)      │
│      → Min jours = 1 (si heures sélectionnées >= heuresJournalières)        │
│      → Impossible de dépasser le maximum calculé                            │
│                                                                              │
│  3️⃣  CONFIRMATION EXPLICITE                                                 │
│      → Résumé clair avant validation finale                                 │
│      → Liste des heures qui seront annulées                                 │
│      → Liste des heures qui resteront payables                              │
│                                                                              │
│  4️⃣  TRAÇABILITÉ (Audit RH)                                                 │
│      → Historique de chaque conversion                                      │
│      → Qui a converti, quand, quelles heures                                │
│      → Lien entre OT source et RecoveryDay créé                             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Tableau des Scénarios - Conversion Flexible

| Cumul Total | Sélectionnées | Non Sélectionnées | Max Jours | Jours Demandés | Résultat |
|-------------|---------------|-------------------|-----------|----------------|----------|
| 32h | 32h | 0h | 4 | 4 | ✅ 32h → RECOVERED |
| 32h | 32h | 0h | 4 | 2 | ✅ 32h → RECOVERED |
| 32h | 16h | 16h | 2 | 2 | ✅ 16h RECOVERED / 16h APPROVED |
| 32h | 16h | 16h | 2 | 1 | ✅ 16h RECOVERED / 16h APPROVED |
| 32h | 16h | 16h | 2 | 3 | ❌ Refusé (max 2 jours) |
| 32h | 8h | 24h | 1 | 1 | ✅ 8h RECOVERED / 24h APPROVED |
| 32h | 5h | 27h | 0 | - | ❌ Insuffisant (< 7.33h) |

### Formules de Calcul

```
// Calcul basé sur les heures SÉLECTIONNÉES (pas le cumul total)
heuresSelectionnees = SOMME(heures des OT cochés par le manager)
maxJours = PLANCHER(heuresSelectionnees ÷ heuresJournalières)

// Exemple: Manager sélectionne Lundi + Mardi (16h sur 32h total)
heuresSelectionnees = 8h + 8h = 16h
maxJours = PLANCHER(16 ÷ 7.33) = PLANCHER(2.18) = 2 jours

// Validation
SI heuresSelectionnees < heuresJournalières ALORS
    → Refusé: "Sélection insuffisante pour 1 jour"
SINON SI joursDemandés > maxJours ALORS
    → Refusé: "Maximum X jour(s) pour cette sélection"
SINON SI joursDemandés < 1 ALORS
    → Refusé: "Minimum 1 jour requis"
SINON
    → ✅ Conversion autorisée
FIN SI
```

### Logique de Conversion Flexible

```
AVANT Conversion (Manager sélectionne Lundi + Mardi):
┌──────────────────────────────────────────────────────────────┐
│ ☑ OT Lundi    8h  APPROVED  → SÉLECTIONNÉ pour conversion   │
│ ☑ OT Mardi    8h  APPROVED  → SÉLECTIONNÉ pour conversion   │
│ ☐ OT Mercredi 8h  APPROVED  → NON sélectionné               │
│ ☐ OT Jeudi    8h  APPROVED  → NON sélectionné               │
│ ────────────────────────────────────────────────────────────│
│ Sélection: 16h  |  Non sélectionné: 16h                     │
│ Max jours récup: 2                                           │
└──────────────────────────────────────────────────────────────┘

APRÈS Conversion (Manager accorde 2 jours):
┌──────────────────────────────────────────────────────────────┐
│ OT Lundi    8h  RECOVERED  → NON payé (converti)            │
│ OT Mardi    8h  RECOVERED  → NON payé (converti)            │
│ OT Mercredi 8h  APPROVED   → PAYABLE (conservé)             │
│ OT Jeudi    8h  APPROVED   → PAYABLE (conservé)             │
│ ────────────────────────────────────────────────────────────│
│ Heures converties: 16h → 2 jours récup                      │
│ Heures payables: 16h → Paiement normal                      │
└──────────────────────────────────────────────────────────────┘
```

### Écran de Confirmation (Obligatoire)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ⚠️  CONFIRMATION DE CONVERSION                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Employé: Mohamed EL KHAYATI (00994)                                        │
│  Date récupération: 24/01/2026                                              │
│  Jours accordés: 2                                                           │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ HEURES QUI SERONT ANNULÉES (non payées)                                 ││
│  │ ───────────────────────────────────────                                 ││
│  │ • Lundi 20/01/2026    8.00h                                             ││
│  │ • Mardi 21/01/2026    8.00h                                             ││
│  │ ───────────────────────────────────────                                 ││
│  │ Total: 16.00h → RECOVERED                                               ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ HEURES QUI RESTERONT PAYABLES                                           ││
│  │ ───────────────────────────────────────                                 ││
│  │ • Mercredi 22/01/2026  8.00h                                            ││
│  │ • Jeudi 23/01/2026     8.00h                                            ││
│  │ ───────────────────────────────────────                                 ││
│  │ Total: 16.00h → Seront payées normalement                               ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│     [ Annuler ]                              [ Confirmer la Conversion ]    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Audit et Traçabilité

```
// Enregistrement dans AuditLog pour chaque conversion
{
  action: "OVERTIME_TO_RECOVERY_CONVERSION",
  entity: "Overtime",
  userId: "manager-id",
  timestamp: "2026-01-24T10:30:00Z",
  details: {
    employeeId: "employee-id",
    employeeName: "Mohamed EL KHAYATI",
    overtimeIds: ["ot-lundi-id", "ot-mardi-id"],
    totalHoursConverted: 16,
    hoursKeptPayable: 16,
    recoveryDaysGranted: 2,
    recoveryDate: "2026-01-24",
    notes: "Récupération semaine 4"
  }
}
```

---

## 7. Statuts et Transitions

### Overtime Status

```
        ┌──────────┐
        │ PENDING  │ ← Création initiale
        └────┬─────┘
             │
      ┌──────┴──────┐
      ▼             ▼
┌──────────┐  ┌──────────┐
│ APPROVED │  │ REJECTED │
└────┬─────┘  └──────────┘
     │
     ├─────────────────┐
     ▼                 ▼
┌──────────┐     ┌───────────┐
│   PAID   │     │ RECOVERED │ ← Converti en récup
└──────────┘     └───────────┘
```

### RecoveryDay Status - Cycle de Vie Détaillé

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CYCLE DE VIE - RECOVERY DAY                              │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌──────────────┐
                              │   CRÉATION   │
                              └──────┬───────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
                    ▼                ▼                │
           ┌──────────────┐  ┌──────────────┐        │
           │   PENDING    │  │   APPROVED   │        │
           │  (En attente)│  │  (Approuvé)  │◄───────┘
           └──────┬───────┘  └──────┬───────┘   autoApprove=true
                  │                 │
         ┌────────┼────────┐        │
         │        │        │        │
         ▼        ▼        │        ▼
  ┌───────────┐ ┌────────┐ │  ┌───────────┐
  │ APPROVED  │ │CANCELLED│ │  │CANCELLED │
  │           │ │         │ │  │          │
  └─────┬─────┘ └────┬────┘ │  └────┬─────┘
        │            │      │       │
        │            ▼      │       ▼
        │    ┌─────────────────────────┐
        │    │  HEURES RETOURNÉES AU   │
        │    │  SOLDE (OT → APPROVED)  │
        │    └─────────────────────────┘
        │
        ▼
  ┌───────────┐
  │   USED    │
  │  (Prise)  │
  └───────────┘
```

---

#### STATUT 1: PENDING (En Attente)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  STATUT: PENDING                                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  📌 QUAND CE STATUT EST UTILISÉ:                                            │
│  • Création de récupération SANS option autoApprove                         │
│  • Workflow multi-niveaux: Manager crée → RH/Directeur approuve            │
│                                                                              │
│  📋 SIGNIFICATION:                                                           │
│  • La récupération est PROPOSÉE mais pas encore validée                     │
│  • Les heures OT sources sont "réservées" (pré-affectées)                   │
│  • En attente de validation d'un niveau supérieur                           │
│                                                                              │
│  ⚙️  ACTIONS POSSIBLES:                                                     │
│  ├── ✅ Approuver → Passe à APPROVED                                       │
│  └── ❌ Annuler   → Passe à CANCELLED (heures libérées)                    │
│                                                                              │
│  💼 CAS D'USAGE ENTREPRISE:                                                 │
│  • Grandes entreprises avec hiérarchie d'approbation                        │
│  • Contrôle RH obligatoire avant validation                                 │
│  • Audit et traçabilité des décisions                                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### STATUT 2: APPROVED (Approuvé)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  STATUT: APPROVED                                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  📌 QUAND CE STATUT EST UTILISÉ:                                            │
│  • Création avec autoApprove=true (Manager a autorité directe)              │
│  • OU après approbation d'un statut PENDING                                 │
│                                                                              │
│  📋 SIGNIFICATION:                                                           │
│  • La récupération est CONFIRMÉE et DÉFINITIVE                              │
│  • L'employé peut prendre sa récupération à la date prévue                  │
│  • Les heures OT sources sont maintenant RECOVERED                          │
│                                                                              │
│  ⚠️  IMPACT SUR LES HEURES SUPPLÉMENTAIRES:                                 │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  AVANT:                                                                 │ │
│  │  OT Lundi    8h  APPROVED  → Payable                                   │ │
│  │  OT Mardi    8h  APPROVED  → Payable                                   │ │
│  │                                                                         │ │
│  │  APRÈS APPROVED:                                                        │ │
│  │  OT Lundi    8h  RECOVERED → NON payable (converti)                    │ │
│  │  OT Mardi    8h  RECOVERED → NON payable (converti)                    │ │
│  │                                                                         │ │
│  │  ⚡ Les heures sont définitivement converties                          │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ⚙️  ACTIONS POSSIBLES:                                                     │
│  ├── ✅ Marquer comme prise → Passe à USED (après la date)                 │
│  └── ❌ Annuler            → Passe à CANCELLED (heures retournées)         │
│                                                                              │
│  💼 CAS D'USAGE:                                                            │
│  • Récupération planifiée pour une date future                              │
│  • Régularisation d'une récupération déjà prise (date passée)              │
│  • Manager avec autorité directe (PME, équipes autonomes)                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### STATUT 3: USED (Prise/Consommée)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  STATUT: USED                                                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  📌 QUAND CE STATUT EST UTILISÉ:                                            │
│  • L'employé a EFFECTIVEMENT pris sa journée de récupération                │
│  • La date de récupération est passée                                       │
│  • Peut être marqué manuellement OU automatiquement par le système          │
│                                                                              │
│  📋 SIGNIFICATION:                                                           │
│  • 🔒 STATUT FINAL - Aucune modification possible                           │
│  • La récupération est TERMINÉE et CONSOMMÉE                                │
│  • Conservé pour historique, rapports et audit RH                           │
│                                                                              │
│  ⚙️  ACTIONS POSSIBLES:                                                     │
│  └── ❌ AUCUNE - Statut final et irréversible                              │
│                                                                              │
│  🚫 POURQUOI L'ANNULATION EST IMPOSSIBLE:                                   │
│  • L'employé a déjà bénéficié de la récupération                           │
│  • Impossibilité de "reprendre" un jour déjà pris                          │
│  • Les heures OT restent définitivement RECOVERED                           │
│  • Intégrité des données pour la paie et les rapports                       │
│                                                                              │
│  💼 CAS D'USAGE:                                                            │
│  • Clôture mensuelle de la paie                                             │
│  • Rapports RH annuels                                                      │
│  • Audit et conformité légale                                               │
│  • Historique employé                                                       │
│                                                                              │
│  🤖 AUTOMATISATION RECOMMANDÉE:                                             │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  // Job quotidien - Marquer automatiquement les récups passées         │ │
│  │  async function markPastRecoveryDaysAsUsed() {                          │ │
│  │    const yesterday = new Date();                                        │ │
│  │    yesterday.setDate(yesterday.getDate() - 1);                          │ │
│  │                                                                         │ │
│  │    await prisma.recoveryDay.updateMany({                                │ │
│  │      where: {                                                           │ │
│  │        status: 'APPROVED',                                              │ │
│  │        endDate: { lte: yesterday }                                      │ │
│  │      },                                                                 │ │
│  │      data: { status: 'USED' }                                           │ │
│  │    });                                                                  │ │
│  │  }                                                                      │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### STATUT 4: CANCELLED (Annulé)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  STATUT: CANCELLED                                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  📌 QUAND CE STATUT EST UTILISÉ:                                            │
│  • Annulation d'une récupération PENDING (avant approbation)                │
│  • Annulation d'une récupération APPROVED (avant utilisation)               │
│  • Changement de planning, erreur de saisie, urgence opérationnelle         │
│                                                                              │
│  📋 SIGNIFICATION:                                                           │
│  • La récupération est ANNULÉE et n'aura pas lieu                           │
│  • 🔒 STATUT FINAL - Pas de retour possible                                 │
│                                                                              │
│  ⚠️  EFFET CRITIQUE - RETOUR DES HEURES AU SOLDE:                           │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                                                                         │ │
│  │  AVANT ANNULATION (RecoveryDay APPROVED):                               │ │
│  │  ┌──────────────────────────────────────────────────────────────────┐  │ │
│  │  │  OT Lundi    8h  RECOVERED  → Non payable                        │  │ │
│  │  │  OT Mardi    8h  RECOVERED  → Non payable                        │  │ │
│  │  │  RecoveryDay: 2 jours APPROVED pour 24-25/01                     │  │ │
│  │  └──────────────────────────────────────────────────────────────────┘  │ │
│  │                                                                         │ │
│  │                           ⬇️ ANNULATION ⬇️                              │ │
│  │                                                                         │ │
│  │  APRÈS ANNULATION (RecoveryDay CANCELLED):                              │ │
│  │  ┌──────────────────────────────────────────────────────────────────┐  │ │
│  │  │  OT Lundi    8h  APPROVED   → Redevient PAYABLE ✅               │  │ │
│  │  │  OT Mardi    8h  APPROVED   → Redevient PAYABLE ✅               │  │ │
│  │  │  RecoveryDay: CANCELLED (conservé pour historique)               │  │ │
│  │  └──────────────────────────────────────────────────────────────────┘  │ │
│  │                                                                         │ │
│  │  💰 Les heures retournent au solde et peuvent être:                    │ │
│  │     • Payées en fin de mois                                            │ │
│  │     • Converties à nouveau en récupération                             │ │
│  │                                                                         │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ⚙️  ACTIONS POSSIBLES APRÈS CANCELLED:                                    │
│  └── ❌ AUCUNE - Statut final                                              │
│       (Pour recréer une récup, faire une nouvelle conversion)              │
│                                                                              │
│  💼 CAS D'USAGE:                                                            │
│  • Urgence opérationnelle: employé finalement nécessaire                   │
│  • Erreur de saisie (mauvais employé, mauvaise date)                       │
│  • Changement de planning de dernière minute                               │
│  • Employé préfère être payé plutôt que récupérer                          │
│  • Annulation à la demande de l'employé                                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

#### Tableau Récapitulatif des Transitions

| Statut Actuel | Action | Nouveau Statut | Qui Peut Faire | Effet sur Heures OT |
|---------------|--------|----------------|----------------|---------------------|
| - | Créer (sans autoApprove) | PENDING | Manager | Réservées |
| - | Créer (avec autoApprove) | APPROVED | Manager | → RECOVERED |
| PENDING | Approuver | APPROVED | RH/Directeur | → RECOVERED |
| PENDING | Annuler | CANCELLED | Manager/RH | Libérées (inchangées) |
| APPROVED | Marquer prise | USED | Système/RH | Restent RECOVERED |
| APPROVED | Annuler | CANCELLED | Manager/RH | → APPROVED (retour) |
| USED | - | ❌ Impossible | - | Statut final |
| CANCELLED | - | ❌ Impossible | - | Statut final |

---

#### Exemple Concret - Timeline Complète

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  EXEMPLE: Employé Mohamed EL KHAYATI - Semaine du 20/01/2026               │
└─────────────────────────────────────────────────────────────────────────────┘

📅 LUNDI 20/01 - Travail intensif
   ├── Mohamed travaille 16h (8h normales + 8h sup)
   └── Système crée: OT Lundi 8h (PENDING)

📅 MARDI 21/01 - Travail intensif
   ├── Mohamed travaille 16h (8h normales + 8h sup)
   └── Système crée: OT Mardi 8h (PENDING)

📅 MERCREDI 22/01 - Approbation et Conversion
   ├── 09:00 - Manager approuve les heures sup
   │   └── OT Lundi 8h → APPROVED
   │   └── OT Mardi 8h → APPROVED
   │
   └── 10:00 - Manager crée récupération (autoApprove=true)
       ├── Sélectionne: OT Lundi + OT Mardi (16h)
       ├── Accorde: 2 jours de récup (24-25/01)
       │
       └── RÉSULTAT:
           ├── RecoveryDay créé: APPROVED
           ├── OT Lundi 8h  → RECOVERED (non payable)
           └── OT Mardi 8h  → RECOVERED (non payable)

📅 JEUDI 23/01 - Journée normale
   └── Mohamed travaille normalement

📅 VENDREDI 24/01 - Récupération Jour 1
   └── Mohamed en récupération (ne travaille pas)

📅 SAMEDI 25/01 - Récupération Jour 2
   └── Mohamed en récupération (ne travaille pas)

📅 DIMANCHE 26/01 - Clôture automatique
   └── Job système: RecoveryDay (24-25/01) → USED
       (Date passée, récup consommée)

📅 FIN DE MOIS - Paie
   ├── Heures payées: 0h (tout converti en récup)
   └── Jours de récup utilisés: 2

═══════════════════════════════════════════════════════════════════════════════

⚠️  SCÉNARIO ALTERNATIF - ANNULATION

📅 JEUDI 23/01 - Urgence opérationnelle
   │
   ├── 14:00 - Client important nécessite Mohamed le 24/01
   │
   └── 14:30 - Manager ANNULE la récupération
       │
       ├── RecoveryDay → CANCELLED
       │
       └── EFFET RETOUR:
           ├── OT Lundi 8h  RECOVERED → APPROVED (payable)
           └── OT Mardi 8h  RECOVERED → APPROVED (payable)

📅 VENDREDI 24/01
   └── Mohamed travaille (récup annulée)

📅 FIN DE MOIS - Paie
   ├── Heures payées: 16h × taux majoré
   └── Jours de récup utilisés: 0

═══════════════════════════════════════════════════════════════════════════════

🔄 SCÉNARIO 3 - NOUVELLE CONVERSION APRÈS ANNULATION

📅 LUNDI 27/01
   │
   └── Manager re-convertit les heures en récup pour 31/01
       ├── OT Lundi 8h  APPROVED → RECOVERED
       ├── OT Mardi 8h  APPROVED → RECOVERED
       └── Nouveau RecoveryDay: 31/01, 2 jours, APPROVED

   Les heures peuvent être converties à nouveau après annulation!
```

---

## 8. Conclusion

Le système actuel possède une base solide pour la gestion des heures supplémentaires et leur conversion en récupération. Les principales améliorations recommandées sont:

1. **Simplification du workflow**: Option `autoApprove` pour éviter la double approbation
2. **Flexibilité des dates**: Autorisation explicite des dates passées pour régularisation
3. **Interface améliorée**: Visualisation claire du solde et calcul automatique
4. **Transparence FIFO**: Affichage du détail des heures utilisées

Ces modifications respectent la logique métier existante tout en améliorant l'expérience utilisateur pour les managers.

---

## 9. Statut d'Implémentation

### ✅ IMPLÉMENTÉ (23 Janvier 2026)

| Composant | Fichier | Description |
|-----------|---------|-------------|
| DTO Backend | `backend/src/modules/recovery-days/dto/create-recovery-day.dto.ts` | `ConvertFlexibleDto` avec overtimeIds, autoApprove, allowPastDate |
| Service Backend | `backend/src/modules/recovery-days/recovery-days.service.ts` | Méthode `convertFlexible()` avec validation complète |
| Endpoint API | `POST /recovery-days/convert-flexible` | Endpoint avec permissions `overtime.approve` |
| Job CRON | `backend/src/modules/recovery-days/jobs/mark-used-recovery-days.job.ts` | Job quotidien 2h du matin pour APPROVED → USED |
| API Frontend | `frontend/lib/api/recovery-days.ts` | Interface avec le backend |
| Hook Frontend | `frontend/lib/hooks/useRecoveryDays.ts` | React Query hooks pour la gestion d'état |
| Modal UI | `frontend/components/overtime/ConversionFlexibleModal.tsx` | Interface de sélection flexible |
| Page Intégration | `frontend/app/(dashboard)/overtime/page.tsx` | Bouton "Convertir" lié au modal |

### Fonctionnalités Implémentées

- ✅ Sélection ligne par ligne des heures supplémentaires à convertir
- ✅ Calcul automatique du nombre de jours possibles
- ✅ Option `autoApprove` pour approbation directe si manager
- ✅ Option `allowPastDate` pour régularisation de dates passées
- ✅ Validation des conflits avec congés et autres récupérations
- ✅ Transaction atomique pour la conversion
- ✅ Job automatique pour marquer les récupérations passées comme USED
- ✅ Interface utilisateur avec résumé de la conversion

---

**Document rédigé par:** Claude (Assistant IA)
**Pour:** Équipe Développement PointaFlex
**Dernière mise à jour:** 23 Janvier 2026
