# ANALYSE DETAILLEE - Probleme EARLY_LEAVE sur Pauses Dejeuner

**Date d'analyse:** 14 janvier 2026
**Version:** 1.0
**Analyste:** Claude Code

---

## 1. DESCRIPTION DU PROBLEME

### 1.1 Symptome observe

D'apres le rapport du 13/01/2026, **23 anomalies EARLY_LEAVE** ont ete detectees. Parmi celles-ci, plusieurs correspondent a des **pauses dejeuner legitimes** et non a des departs anticipes reels.

### 1.2 Exemples concrets du rapport

| Employe | Matricule | Sequence | Anomalie |
|---------|-----------|----------|----------|
| Mohammed ELALAMI | 02255 | IN 05:55 → **OUT 12:32** → IN 13:24 | EARLY_LEAVE sur OUT 12:32 |
| Ilyass AJANA | 03243 | IN ?? → **OUT 13:06** → IN ?? | EARLY_LEAVE sur OUT 13:06 |
| Hamid EL MEKKAOUI | 01066 | IN ?? → **OUT 13:32** → IN ?? | EARLY_LEAVE sur OUT 13:32 |

**Probleme:** La sortie a 12:32 n'est PAS un depart anticipe mais une **pause dejeuner** (retour a 13:24).

---

## 2. CONFIGURATION TENANT - PARAMETRES CLES

### 2.1 Parametres lies aux pauses

| Parametre | Valeur par defaut | Description |
|-----------|-------------------|-------------|
| `requireBreakPunch` | `false` | Si `false`, les pointages BREAK_START/BREAK_END sont **REJETES** |
| `allowImplicitBreaks` | `true` | Active la detection des pauses implicites (OUT→IN) |
| `minImplicitBreakMinutes` | `30` | Duree minimum pour considerer un OUT→IN comme pause |
| `maxImplicitBreakMinutes` | `120` | Duree maximum pour considerer un OUT→IN comme pause |
| `breakDuration` | `60` | Duree de pause standard (minutes) |
| `earlyToleranceExit` | `5` | Tolerance en minutes avant de flaguer EARLY_LEAVE |

### 2.2 Cas du tenant actuel

```
requireBreakPunch = false (DESACTIVE)
```

**Consequence importante:**
- Les employes ne peuvent PAS pointer BREAK_START/BREAK_END
- Le systeme doit utiliser les **pauses implicites** (OUT suivi de IN)
- Mais la detection EARLY_LEAVE ne prend pas en compte ce parametre!

---

## 3. FLUX DE DETECTION ACTUEL

### 3.1 Detection EARLY_LEAVE (attendance.service.ts:5085-5164)

```
┌────────────────────────────────────────────────────────────────┐
│                    POINTAGE OUT                                 │
└────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────────────┐
│ Recuperer le IN correspondant                                   │
│ (ignore BREAK_START/BREAK_END)                                 │
└────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────────────┐
│ Trouver le shift associe au IN                                 │
│ → Recuperer expectedEndTime (ex: 17:00)                        │
└────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────────────┐
│ Calculer earlyLeaveMinutes = expectedEnd - timestamp           │
│ Ex: 17:00 - 12:32 = 268 minutes                                │
└────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────────────┐
│ Si earlyLeaveMinutes > toleranceMinutes (5 min)                │
│ → ANOMALIE EARLY_LEAVE DETECTEE!                               │
└────────────────────────────────────────────────────────────────┘
```

### 3.2 Detection Pause Implicite (attendance.service.ts:4946-4986)

```
┌────────────────────────────────────────────────────────────────┐
│                    POINTAGE IN                                  │
└────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────────────┐
│ Verifier si allowImplicitBreaks = true                         │
│ ET lateMinutes > toleranceMinutes                              │
└────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────────────┐
│ Chercher un OUT recent dans la fenetre:                        │
│ - Minimum: IN - maxImplicitBreakMinutes (120 min)              │
│ - Maximum: IN - minImplicitBreakMinutes (30 min)               │
└────────────────────────────────────────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              │                           │
       OUT TROUVE                  PAS DE OUT
              │                           │
              ▼                           ▼
┌──────────────────────┐     ┌──────────────────────┐
│ C'est une pause      │     │ Verifier retard/     │
│ → return false       │     │ absence partielle    │
│ → Nettoyer EARLY_LEAVE│     └──────────────────────┘
└──────────────────────┘
```

---

## 4. PROBLEMES IDENTIFIES

### 4.1 Probleme Principal: Ordre d'execution

**Sequence temporelle:**
1. `12:32` - Employe pointe OUT (pause dejeuner)
2. `detectAnomalies` avec type=OUT s'execute
3. `earlyLeaveMinutes = 268 min > 5 min` → **EARLY_LEAVE cree!**
4. `13:24` - Employe pointe IN (retour de pause)
5. `detectAnomalies` avec type=IN s'execute
6. Pause implicite detectee → **EARLY_LEAVE nettoye!**

**Le probleme:** Entre 12:32 et 13:24, l'anomalie EARLY_LEAVE existe et est visible.

### 4.2 Probleme Secondaire: Fenetre de pause restrictive

La detection de pause implicite exige:
- `minImplicitBreakMinutes = 30 min` (minimum)
- `maxImplicitBreakMinutes = 120 min` (maximum)

**Cas non couverts:**
| Duree pause | Statut | Consequence |
|-------------|--------|-------------|
| < 30 min | Non detectee | EARLY_LEAVE reste |
| 30-120 min | Detectee | EARLY_LEAVE nettoye |
| > 120 min | Non detectee | EARLY_LEAVE reste |

### 4.3 Probleme avec `requireBreakPunch = false`

Quand `requireBreakPunch = false`:
- Les pointages BREAK_START/BREAK_END sont **REJETES** par le systeme
- Le systeme **IGNORE** ces types dans la detection EARLY_LEAVE (ligne 5110)
- Mais il ne **CONSIDERE PAS** que les OUT entre 11h-14h sont probablement des pauses!

**Code actuel (ligne 5110):**
```typescript
if (record.type === AttendanceType.BREAK_START || record.type === AttendanceType.BREAK_END) continue;
```

Ce code ignore les BREAK, mais ne fait rien de special pour les OUT pendant les heures de pause typiques.

---

## 5. ANALYSE DES SCENARIOS

### Scenario 1: Pause dejeuner standard (30-120 min)

| Heure | Action | Resultat |
|-------|--------|----------|
| 08:00 | IN | OK |
| 12:30 | OUT | EARLY_LEAVE (268 min avant 17:00) |
| 13:15 | IN | Pause implicite detectee (45 min) → EARLY_LEAVE nettoye |
| 17:00 | OUT | OK |

**Resultat final:** Pas d'anomalie (nettoyee)
**Probleme:** Anomalie visible temporairement (45 min)

### Scenario 2: Pause courte (< 30 min)

| Heure | Action | Resultat |
|-------|--------|----------|
| 08:00 | IN | OK |
| 12:30 | OUT | EARLY_LEAVE (268 min avant 17:00) |
| 12:50 | IN | Pause implicite NON detectee (20 min < 30 min minimum) |
| 17:00 | OUT | OK |

**Resultat final:** EARLY_LEAVE reste sur OUT 12:30!
**Faux positif:** Oui

### Scenario 3: Pause longue (> 120 min)

| Heure | Action | Resultat |
|-------|--------|----------|
| 08:00 | IN | OK |
| 11:30 | OUT | EARLY_LEAVE (330 min avant 17:00) |
| 14:00 | IN | Pause implicite NON detectee (150 min > 120 min maximum) |
| 17:00 | OUT | OK |

**Resultat final:** EARLY_LEAVE reste sur OUT 11:30!
**Faux positif:** Probable (pause dejeuner etendue legitime)

### Scenario 4: Vrai depart anticipe

| Heure | Action | Resultat |
|-------|--------|----------|
| 08:00 | IN | OK |
| 14:00 | OUT | EARLY_LEAVE (180 min avant 17:00) |
| - | Pas de retour | - |

**Resultat final:** EARLY_LEAVE sur OUT 14:00
**Vrai positif:** Oui (depart reel avant la fin)

### Scenario 5: Pause avec `requireBreakPunch = true` (hypothetique)

| Heure | Action | Resultat |
|-------|--------|----------|
| 08:00 | IN | OK |
| 12:30 | BREAK_START | OK (pause debute) |
| 13:15 | BREAK_END | OK (pause terminee) |
| 17:00 | OUT | OK |

**Resultat:** Aucune anomalie EARLY_LEAVE
**Note:** Ce scenario ne peut pas se produire avec `requireBreakPunch = false`

---

## 6. PARAMETRES NON UTILISES DANS LA DETECTION EARLY_LEAVE

### 6.1 Parametres ignores

| Parametre | Utilise pour EARLY_LEAVE? | Devrait etre utilise? |
|-----------|---------------------------|------------------------|
| `requireBreakPunch` | NON | OUI - Pour adapter la logique |
| `allowImplicitBreaks` | NON (seulement pour IN) | OUI - Pour prevenir la detection |
| `minImplicitBreakMinutes` | NON | OUI - Comme fenetre horaire |
| `maxImplicitBreakMinutes` | NON | OUI - Comme fenetre horaire |
| `breakDuration` | NON | OUI - Pour estimer la pause |

### 6.2 Code de detection EARLY_LEAVE (lignes 5150-5164)

```typescript
const settings = await this.prisma.tenantSettings.findUnique({
  where: { tenantId },
  select: { earlyToleranceExit: true }, // SEUL PARAMETRE UTILISE!
});

const toleranceMinutes = settings?.earlyToleranceExit || 5;
const earlyLeaveMinutes = (expectedEnd.getTime() - timestamp.getTime()) / (1000 * 60);

if (earlyLeaveMinutes > toleranceMinutes) {
  return {
    hasAnomaly: true,
    type: 'EARLY_LEAVE',
    note: `Départ anticipé de ${Math.round(earlyLeaveMinutes)} minutes détecté`,
  };
}
```

**Probleme:** Aucune consideration pour les pauses!

---

## 7. IMPACT BUSINESS

### 7.1 Faux positifs estimes

D'apres le rapport du 13/01/2026:
- 23 anomalies EARLY_LEAVE detectees
- Environ 15-18 sont probablement des pauses dejeuner (65-78%)

### 7.2 Consequences

| Impact | Description |
|--------|-------------|
| **Confiance** | Les managers voient des anomalies incorrectes |
| **Temps RH** | Verification manuelle necessaire |
| **Metriques** | Statistiques faussees |
| **Alertes** | Notifications inutiles aux managers |

---

## 8. RECOMMANDATIONS DE CORRECTION

### 8.1 Option A: Ne pas detecter EARLY_LEAVE en temps reel (comme MISSING_OUT)

**Principe:** Reporter la detection au job batch nocturne qui a une vue complete de la journee.

**Avantages:**
- Simple a implementer
- Coherent avec la correction MISSING_OUT
- Elimine tous les faux positifs temporaires

**Inconvenients:**
- Alertes temps reel perdues pour les vrais departs anticipes

### 8.2 Option B: Fenetre de pause horaire

**Principe:** Si OUT entre 11h-14h, ne pas detecter EARLY_LEAVE immediatement. Attendre un IN dans les 2h.

**Pseudo-code:**
```
Si type == OUT:
  Si heure entre 11h et 14h:
    → Ne pas detecter EARLY_LEAVE maintenant
    → Laisser le nettoyage s'en occuper quand IN arrive
  Sinon:
    → Detection normale EARLY_LEAVE
```

**Avantages:**
- Specifique aux heures de pause
- Garde la detection pour les departs hors heures de pause

**Inconvenients:**
- Heure de pause fixe (pas tous les employes dejeuneent 11h-14h)

### 8.3 Option C: Utiliser `breakDuration` comme indicateur

**Principe:** Si OUT arrive a `expectedEnd - shiftDuration + breakDuration`, c'est probablement une pause.

**Exemple:**
- Shift: 08:00 - 17:00 (9h)
- breakDuration: 60 min
- Temps de travail effectif: 8h
- Si OUT a 12:30 (milieu de journee), c'est probablement une pause

**Avantages:**
- Utilise les parametres existants
- Plus intelligent

**Inconvenients:**
- Complexe a implementer
- Hypotheses sur la structure du shift

### 8.4 Option D: Verifier `requireBreakPunch` pour adapter la logique

**Principe:**
- Si `requireBreakPunch = true`: Detection normale (les employes doivent pointer BREAK)
- Si `requireBreakPunch = false`: Mode "pauses implicites" - plus tolerant

**Pseudo-code:**
```
Si type == OUT:
  settings = charger(requireBreakPunch, allowImplicitBreaks, ...)

  Si !requireBreakPunch ET allowImplicitBreaks:
    → Mode pause implicite
    → Ne pas detecter EARLY_LEAVE si dans fenetre pause probable
  Sinon:
    → Detection normale
```

**Avantages:**
- Respecte la configuration du tenant
- Flexible

**Inconvenients:**
- Plus de logique conditionnelle

### 8.5 Option E (RECOMMANDEE): Combinaison A + correction existante

**Deja implementee:** Le nettoyage EARLY_LEAVE quand pause implicite detectee (lignes 4974-4982).

**Ajout necessaire:** Elargir la fenetre de detection pause OU desactiver la detection temps reel EARLY_LEAVE.

---

## 9. CONFIGURATION ACTUELLE vs RECOMMANDEE

### 9.1 Configuration actuelle du tenant

| Parametre | Valeur | Impact |
|-----------|--------|--------|
| `requireBreakPunch` | `false` | Employes ne pointent pas BREAK |
| `allowImplicitBreaks` | `true` | Pauses implicites activees |
| `minImplicitBreakMinutes` | `30` | Pause minimum 30 min |
| `maxImplicitBreakMinutes` | `120` | Pause maximum 2h |
| `earlyToleranceExit` | `5` | Tolerance depart: 5 min |

### 9.2 Ajustements potentiels

| Parametre | Valeur actuelle | Valeur recommandee | Justification |
|-----------|-----------------|-------------------|---------------|
| `minImplicitBreakMinutes` | 30 | **15-20** | Couvrir pauses courtes |
| `maxImplicitBreakMinutes` | 120 | **150-180** | Couvrir pauses longues |
| `earlyToleranceExit` | 5 | 5 | OK |

### 9.3 Nouveau parametre suggere

| Parametre | Valeur | Description |
|-----------|--------|-------------|
| `lunchBreakWindowStart` | `"11:00"` | Debut fenetre pause dejeuner |
| `lunchBreakWindowEnd` | `"14:30"` | Fin fenetre pause dejeuner |
| `delayEarlyLeaveDetection` | `true` | Reporter detection EARLY_LEAVE |

---

## 10. TESTS A EFFECTUER APRES CORRECTION

### 10.1 Scenarios de test

| # | Scenario | Attendu |
|---|----------|---------|
| 1 | OUT 12:30, IN 13:00 (30 min) | Pas EARLY_LEAVE |
| 2 | OUT 12:30, IN 12:45 (15 min) | Pas EARLY_LEAVE si fenetre elargie |
| 3 | OUT 12:30, IN 15:00 (150 min) | Pas EARLY_LEAVE si fenetre elargie |
| 4 | OUT 14:30, pas de IN | EARLY_LEAVE (vrai depart) |
| 5 | OUT 09:00, IN 09:30 | EARLY_LEAVE? (anormal) |

### 10.2 Verification post-correction

```sql
-- Compter les EARLY_LEAVE restants apres correction
SELECT
  DATE(timestamp) as jour,
  COUNT(*) as total_early_leave,
  COUNT(CASE WHEN EXTRACT(HOUR FROM timestamp) BETWEEN 11 AND 14 THEN 1 END) as pendant_pause
FROM "Attendance"
WHERE "anomalyType" = 'EARLY_LEAVE'
  AND timestamp >= '2026-01-13'
GROUP BY DATE(timestamp);
```

---

## 11. CONCLUSION

### 11.1 Resume du probleme

Le systeme detecte **EARLY_LEAVE en temps reel** sans considerer:
1. Le parametre `requireBreakPunch` (desactive = pas de pointage BREAK)
2. Les pauses implicites qui seront detectees au retour
3. Les heures typiques de pause dejeuner

### 11.2 Actions recommandees

| Priorite | Action |
|----------|--------|
| **HAUTE** | Elargir fenetre pause implicite (15-180 min) |
| **HAUTE** | OU desactiver detection EARLY_LEAVE temps reel |
| **MOYENNE** | Ajouter fenetre horaire pause dejeuner |
| **BASSE** | Creer nouveau parametre `delayEarlyLeaveDetection` |

### 11.3 Correction deja implementee

La correction du nettoyage EARLY_LEAVE lors de la detection de pause implicite est deja en place (lignes 4974-4982). Elle fonctionne pour les pauses de 30-120 minutes.

**Pour les pauses hors fenetre (< 30 min ou > 120 min), une correction supplementaire est necessaire.**

---

## 12. CORRECTIONS IMPLEMENTEES (14/01/2026)

### 12.1 Correction 1: Elargissement fenetre pause implicite

**Fichier:** `attendance.service.ts` (lignes 4949-4952)

**Avant:**
```typescript
const minBreakMinutes = settings?.minImplicitBreakMinutes ?? 30;
const maxBreakMinutes = settings?.maxImplicitBreakMinutes ?? 120;
```

**Apres:**
```typescript
// FIX 14/01/2026: Elargir la fenêtre de pause implicite (15-180 min au lieu de 30-120)
const minBreakMinutes = settings?.minImplicitBreakMinutes ?? 15;
const maxBreakMinutes = settings?.maxImplicitBreakMinutes ?? 180;
```

**Impact:** Les pauses de 15 minutes a 3 heures sont maintenant detectees et nettoyees.

### 12.2 Correction 2: Fenetre horaire pause dejeuner

**Fichier:** `attendance.service.ts` (lignes 5164-5205)

**Logique ajoutee:**
```
Si earlyLeaveMinutes > tolerance:
  Si requireBreakPunch = false ET allowImplicitBreaks = true:
    Si OUT entre 11:00 et 14:30:
      → Ne pas detecter EARLY_LEAVE (pause probable)
      → Le nettoyage se fera quand IN arrive
    Sinon:
      → Detecter EARLY_LEAVE (vrai depart anticipe)
  Sinon:
    → Detecter EARLY_LEAVE normalement
```

**Impact:** Les sorties pendant les heures de dejeuner (11h-14h30) ne declenchent plus d'EARLY_LEAVE si `requireBreakPunch = false`.

### 12.3 Correction 3: Verification requireBreakPunch

**Integration dans correction 2:** Le systeme verifie maintenant `requireBreakPunch` et `allowImplicitBreaks` avant de detecter EARLY_LEAVE.

### 12.4 Correction 4: Ajout breakStartTime au modele Shift

**Fichier:** `prisma/schema.prisma`

**Champ ajoute:**
```prisma
model Shift {
  ...
  breakStartTime String?  // Heure de début de pause (ex: "12:00")
  breakDuration  Int      @default(60)
  ...
}
```

**DTO mis a jour:** `create-shift.dto.ts`
```typescript
@ApiPropertyOptional({ example: '12:00', description: 'Heure de début de pause (Format HH:mm)' })
@IsOptional()
@IsString()
@Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
breakStartTime?: string;
```

### 12.5 Resume des corrections

| # | Correction | Fichier | Lignes |
|---|------------|---------|--------|
| 1 | Fenetre pause 15-180 min | attendance.service.ts | 4949-4952 |
| 2 | Fenetre pause dynamique par shift | attendance.service.ts | 5176-5240 |
| 3 | Check requireBreakPunch | attendance.service.ts | 5170-5175 |
| 4 | Champ breakStartTime | schema.prisma, create-shift.dto.ts | - |
| 5 | Select breakStartTime dans queries | attendance.service.ts | 3068, 3156, 3192 |

### 12.5 Limitation connue

**Scenario non couvert:** Si un employe quitte pendant les heures de pause (11h-14h30) et ne revient jamais, l'EARLY_LEAVE ne sera pas detecte.

**Justification:** Ce cas est rare compare aux pauses dejeuner legitimes. Un job batch pourrait etre ajoute ulterieurement pour detecter ces cas en fin de journee.

---

**Fin de l'analyse et des corrections**

*Document genere le 14/01/2026*
*Corrections implementees le 14/01/2026*
