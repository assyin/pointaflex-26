# Rapport : Gestion des Pointages Weekend & Jours Fériés

## Date : 31/01/2026

---

## 1. Détection des Jours Non-Ouvrables

### 1.1 Weekend (Samedi / Dimanche)

**Logique** (`attendance.service.ts`, lignes ~8830-8839) :
```
dayOfWeek = punchTime.getDay()  // 0=Dimanche, 6=Samedi
```

- Les jours ouvrables sont configurés par tenant dans `TenantSettings.workingDays`
- **Par défaut** : `[1, 2, 3, 4, 5, 6]` = Lundi à Samedi
- **Dimanche (0/7)** = NON ouvrable par défaut
- Si le jour du pointage n'est PAS dans `workingDays` → c'est un weekend

### 1.2 Jours Fériés

**Logique** (`holidays.service.ts`) :
```
holiday = prisma.holiday.findFirst({ where: { tenantId, date: punchDate } })
isHoliday = !!holiday
```

- Les jours fériés sont stockés dans la table `Holiday`
- Types : `NATIONAL`, `COMPANY`, `RELIGIOUS`
- Supporte les jours récurrents (`isRecurring: true`)
- Génération automatique pour le Maroc (`generateMoroccoHolidays()`)

---

## 2. Anomalies Détectées

### 2.1 `HOLIDAY_WORKED`

| Élément | Détail |
|---------|--------|
| **Condition** | Pointage sur un jour férié + employé PAS en congé |
| **Action** | Anomalie enregistrée, pointage accepté |
| **Note** | `Pointage effectué le JJ/MM/AAAA (jour férié : Nom)` |

### 2.2 `WEEKEND_WORK`

| Élément | Détail |
|---------|--------|
| **Condition** | Pointage hors jour ouvrable + planning virtuel (pas de planning explicite) |
| **Action** | Anomalie enregistrée, pointage accepté |
| **Note** | `Pointage le samedi/dimanche sans planning explicite` |

### 2.3 `LEAVE_BUT_PRESENT` (prioritaire)

| Élément | Détail |
|---------|--------|
| **Condition** | Employé en congé approuvé mais pointe quand même |
| **Priorité** | Écrase `HOLIDAY_WORKED` et `WEEKEND_WORK` |

### 2.4 Priorité des anomalies

```
LEAVE_BUT_PRESENT > HOLIDAY_WORKED > WEEKEND_WORK > autres anomalies
```

---

## 3. Scénarios Détaillés

### Scénario 1 : Pointage un Samedi SANS planning explicite

```
Employé pointe IN à 08:00 Samedi, OUT à 16:00 Samedi
→ workingDays = [1,2,3,4,5,6] (Samedi inclus par défaut)
→ isWorkingDay = true → PAS d'anomalie WEEKEND_WORK
→ Traitement normal (LATE, heures sup, etc.)
```

**Attention** : Par défaut le Samedi EST un jour ouvrable. Seul le Dimanche déclenche `WEEKEND_WORK`.

### Scénario 2 : Pointage un Dimanche SANS planning

```
Employé pointe IN à 08:00 Dimanche, OUT à 16:00 Dimanche
→ workingDays = [1,2,3,4,5,6] (Dimanche NON inclus)
→ isWorkingDay = false + isVirtualSchedule = true
→ Anomalie = WEEKEND_WORK
→ Jour Supplémentaire créé = WEEKEND_SUNDAY, 8h
→ Heures sup détectées (si éligible)
```

### Scénario 3 : Pointage un Dimanche AVEC planning explicite

```
Manager crée un planning pour Dimanche
Employé pointe IN à 08:00, OUT à 16:00
→ isWorkingDay = false MAIS isVirtualSchedule = false
→ PAS d'anomalie WEEKEND_WORK (travail autorisé)
→ Jour Supplémentaire créé quand même
→ Heures sup calculées normalement
```

### Scénario 4 : Pointage un Jour Férié

```
01/01 = Jour de l'An (Holiday)
Employé pointe IN à 17:00, OUT à 03:00
→ isHoliday = true
→ Anomalie = HOLIDAY_WORKED
→ Jour Supplémentaire créé = HOLIDAY
→ Heures sup type = HOLIDAY (taux x2.0)
```

### Scénario 5 : Shift de Nuit Vendredi → Samedi

```
Employé pointe IN Vendredi 22:00, OUT Samedi 06:00
→ IN = Vendredi (jour ouvrable) → pas d'anomalie à l'entrée
→ OUT = Samedi (jour ouvrable par défaut) → pas d'anomalie
→ Jour Supplémentaire : vérifie checkOut (Samedi)
   → Si Samedi est dans workingDays → PAS de jour supplémentaire
   → Si Samedi n'est PAS ouvrable → WEEKEND_SATURDAY créé
```

### Scénario 6 : Jour Férié qui tombe un Dimanche

```
→ isHoliday = true → HOLIDAY_WORKED (priorité sur WEEKEND_WORK)
→ Jour Supplémentaire type = HOLIDAY (pas WEEKEND_SUNDAY)
→ Taux heures sup = HOLIDAY (x2.0)
```

---

## 4. Jours Supplémentaires (SupplementaryDay)

### 4.1 Création Automatique

**Quand** : Au moment du pointage OUT sur un jour non-ouvrable / férié

**Conditions** :
- `employee.isEligibleForOvertime = true`
- Heures travaillées > seuil minimum (défaut 30 min)
- Pas de congé approuvé ce jour
- Pas de doublon existant

**Types** :
| Type | Déclencheur |
|------|-------------|
| `WEEKEND_SATURDAY` | Travail un Samedi (si non ouvrable) |
| `WEEKEND_SUNDAY` | Travail un Dimanche |
| `HOLIDAY` | Travail un jour férié |

### 4.2 Statut et Approbation

```
Création → PENDING → Manager approuve → APPROVED
                   → Manager rejette  → REJECTED
```

### 4.3 Job de Consolidation (Filet de sécurité)

- **Exécution** : 00:30 chaque nuit
- **Rôle** : Rattraper les jours supplémentaires manqués en temps réel
- **Vérification** : Pointages OUT de la veille avec heures > 0 sur jour non-ouvrable

---

## 5. Heures Supplémentaires sur Weekend/Férié

### 5.1 Taux de Majoration

**⚠️ MAJORATIONS DÉSACTIVÉES dans la config actuelle du tenant :**

| Paramètre | Valeur actuelle |
|-----------|----------------|
| `overtimeMajorationEnabled` | **false** |
| `holidayOvertimeEnabled` | **false** |
| `overtimeRateStandard` | 1.0 (pas de majoration) |
| `overtimeRateNight` | 1.0 (pas de majoration) |
| `overtimeRateHoliday` | 1.0 (pas de majoration) |
| `overtimeRateEmergency` | 1.0 (pas de majoration) |

Toutes les heures supplémentaires sont comptées à taux x1.0, que ce soit en jour ouvrable, nuit, weekend ou jour férié.

### 5.2 Détection Automatique du Type

`overtimeAutoDetectType = true` — le système détecte le type (STANDARD/NIGHT/HOLIDAY) mais les taux sont tous identiques (x1.0).

### 5.3 Coexistence Jour Supplémentaire + Heures Sup

Un seul pointage peut générer les DEUX :

```
Samedi : IN 10:00, OUT 20:00 (10h travaillées)
→ Jour Supplémentaire : WEEKEND_SATURDAY, 10h, PENDING
→ Heures Supplémentaires : 10h, type selon config, taux appliqué
```

---

## 6. Récupération (Recovery Days)

### 6.1 Conversion Jours Supplémentaires → Récupération

```
Jours sup approuvés → Conversion en jours de récupération
Formule : recoveryDays = (heures × tauxConversion) / heuresJournalières
```

**Exemple** :
- 2 Samedis travaillés (16h)
- Taux conversion : 1.0
- Heures/jour : 7.33h
- Résultat : 16 × 1.0 ÷ 7.33 = **2.18 jours de récupération**

### 6.2 Expiration

- Défaut : 90 jours (`recoveryExpiryDays`)
- Les jours non utilisés expirent automatiquement

---

## 7. Tableau Récapitulatif

| Scénario | Anomalie | Jour Sup | Heures Sup | Taux |
|----------|----------|----------|------------|------|
| Dimanche sans planning | `WEEKEND_WORK` | `WEEKEND_SUNDAY` | Oui | x1.0 |
| Dimanche avec planning | Aucune | `WEEKEND_SUNDAY` | Oui | x1.0 |
| Samedi sans planning | `WEEKEND_WORK` | `WEEKEND_SATURDAY` | Oui | x1.0 |
| Samedi avec planning explicite | Aucune | `WEEKEND_SATURDAY` | Oui | x1.0 |
| Jour férié, pas en congé | `HOLIDAY_WORKED` | `HOLIDAY` | Oui | x1.0 |
| Jour férié + en congé | `LEAVE_BUT_PRESENT` | Non | Non | - |
| Nuit Ven→Sam | `WEEKEND_WORK` | `WEEKEND_SATURDAY` | Oui | x1.0 |
| Férié un Dimanche | `HOLIDAY_WORKED` | `HOLIDAY` | Oui | x1.0 |

---

## 8. Configuration Tenant

```json
{
  "workingDays": [1, 2, 3, 4, 5, 6],
  "overtimeMinimumThreshold": 30,
  "overtimeMajorationEnabled": true,
  "overtimeMajorationEnabled": false,
  "overtimeRateStandard": 1.0,
  "overtimeRateNight": 1.0,
  "overtimeRateHoliday": 1.0,
  "holidayOvertimeEnabled": false,
  "nightShiftStart": "21:00",
  "nightShiftEnd": "06:00",
  "recoveryConversionRate": 1.0,
  "recoveryExpiryDays": 90,
  "dailyWorkingHours": 7.33,
  "overtimeAutoDetectType": true
}
```

---

## 9. Points d'Attention / Issues Potentiels

### 9.1 Jours Ouvrables = Lundi à Vendredi
La configuration actuelle du tenant est `workingDays: [1,2,3,4,5]` (Lundi à Vendredi). Le **Samedi ET le Dimanche** sont donc non-ouvrables et déclenchent `WEEKEND_WORK`.

### 9.2 Shift de Nuit Cross-Day
Le type du jour supplémentaire est déterminé par la date du checkIn en priorité. Si le checkIn est un jour normal et le checkOut un weekend, c'est le checkOut qui détermine le type.

### 9.3 Pas d'Auto-Correction sur Weekend/Férié
L'auto-correction `AUTO_CORRECTED_WRONG_TYPE` fonctionne indépendamment du weekend/férié. Un mauvais bouton un Dimanche sera auto-corrigé ET marqué `WEEKEND_WORK`.

### 9.4 Double Anomalie Impossible
Le système ne stocke qu'**une seule** anomalie par pointage (`anomalyType: string`). Si un pointage est à la fois WEEKEND_WORK et LATE, seul l'un des deux est enregistré selon la priorité.

---

## 10. Fichiers Clés

| Composant | Fichier | Lignes |
|-----------|---------|--------|
| Détection anomalies | `attendance.service.ts` | 8830-9484 |
| Jours supplémentaires | `supplementary-days.service.ts` | 422-720 |
| Configuration fériés | `holidays.service.ts` | 1-362 |
| Détection overtime | `detect-overtime.job.ts` | 1-340 |
| Job consolidation sup | `detect-supplementary-days.job.ts` | 1-117 |
| Récupération | `recovery-days.service.ts` | 1-400+ |
