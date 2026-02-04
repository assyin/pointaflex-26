# Analyse : Gestion des Congés pour Employés en Planning par Rotation

> Document généré le 03/02/2026 - Mis à jour le 04/02/2026
> PointageFlex - Module Congés & Absences

---

## 1. Contexte

### 1.1 Problématique

Les employés avec un **planning par rotation** (ex: GAB - 4 jours travail / 2 jours repos) ont un cycle de travail différent des employés standards (Lundi-Vendredi).

**Questions clés** :
1. Comment les jours de congé doivent-ils être comptabilisés pour ces employés ?
2. **Comment gérer les jours fériés pour les employés en rotation qui travaillent ces jours-là ?**

### 1.2 Exemple Concret - Planning GAB (4T/2R)

```
Semaine 1:
Lun  Mar  Mer  Jeu  Ven  Sam  Dim
 T    T    T    T    R    R    T

Semaine 2:
Lun  Mar  Mer  Jeu  Ven  Sam  Dim
 T    T    R    R    T    T    T

T = Travail, R = Repos
```

Si un employé GAB demande un congé du **lundi au dimanche** (7 jours calendaires), combien de jours doit-on décompter de son solde ?

### 1.3 Cas Spécial : Jours Fériés et Planning par Rotation

**Problématique critique** : Les employés avec planning par rotation (4/2, 3/3, etc.) peuvent être programmés pour travailler les **jours fériés**, tout comme ils peuvent travailler les weekends.

**Exemple** : Si le 1er Mai (jour férié) tombe un jour où l'employé GAB est programmé pour travailler selon son planning de rotation, et qu'il demande un congé incluant cette date :
- **Le jour férié DOIT être compté** comme jour de congé car l'employé était censé travailler
- C'est la même logique que pour les weekends travaillés

---

## 2. Système Actuel - Analyse du Code

### 2.1 Méthode de Calcul Actuelle

**Fichier** : `backend/src/modules/leaves/leaves.service.ts` (lignes 22-118)

```typescript
async calculateWorkingDays(tenantId, startDate, endDate) {
  // 1. Récupère la configuration du tenant
  const tenantSettings = await prisma.tenantSettings.findUnique({
    where: { tenantId },
    select: { workingDays: true, leaveIncludeSaturday: true },
  });

  // 2. Jours ouvrables par défaut: Lundi-Vendredi [1,2,3,4,5]
  let workingDaysConfig = tenantSettings?.workingDays || [1, 2, 3, 4, 5];

  // 3. Option: Inclure samedi si activé
  if (leaveIncludeSaturday && !workingDaysConfig.includes(6)) {
    workingDaysConfig = [...workingDaysConfig, 6];
  }

  // 4. Récupère les jours fériés
  const holidays = await prisma.holiday.findMany({...});

  // 5. Compte les jours ouvrables (exclut weekends + fériés)
  while (currentDate <= endDate) {
    const isWorkingDay = workingDaysConfig.includes(dayOfWeek);
    if (isWorkingDay && !isHoliday) {  // ⚠️ PROBLÈME ICI
      workingDays++;
    }
  }

  return { workingDays, ... };
}
```

### 2.2 Problèmes Identifiés

| Problème | Description | Impact |
|----------|-------------|--------|
| **Configuration globale** | Le système utilise `TenantSettings.workingDays` qui est le même pour TOUS les employés | Les employés en rotation sont traités comme les autres |
| **Pas de vérification du planning** | Le calcul ne consulte PAS la table `Schedule` de l'employé | Un jour de repos prévu dans le planning est compté comme jour ouvrable |
| **Jours fériés toujours exclus** | Les jours fériés sont TOUJOURS exclus du comptage (ligne 62: `&& !isHoliday`) | **Un employé en rotation qui devait travailler un jour férié ne voit pas ce jour compté** |
| **Pas de compteur spécial** | Aucun champ `Employee.leaveBalance` ou équivalent spécifique | Tous les employés ont le même quota annuel (18j par défaut) |

### 2.3 Exemple de Dysfonctionnement - Weekends

**Scénario** : Employé GAB demande congé du 03/02 au 09/02 (7 jours)

**Calcul actuel (erroné)** :
```
Tenant.workingDays = [1,2,3,4,5] (Lun-Ven)

03/02 (Lun) → Jour ouvrable ✓ → Compté
04/02 (Mar) → Jour ouvrable ✓ → Compté
05/02 (Mer) → Jour ouvrable ✓ → Compté
06/02 (Jeu) → Jour ouvrable ✓ → Compté
07/02 (Ven) → Jour ouvrable ✓ → Compté
08/02 (Sam) → Weekend ✗ → Non compté
09/02 (Dim) → Weekend ✗ → Non compté

Total décompté: 5 jours
```

**Planning réel de l'employé GAB** :
```
03/02 (Lun) → TRAVAIL → Devrait être compté
04/02 (Mar) → TRAVAIL → Devrait être compté
05/02 (Mer) → REPOS  → Ne devrait PAS être compté
06/02 (Jeu) → REPOS  → Ne devrait PAS être compté
07/02 (Ven) → TRAVAIL → Devrait être compté
08/02 (Sam) → TRAVAIL → Devrait être compté
09/02 (Dim) → TRAVAIL → Devrait être compté

Total correct: 5 jours (mais pas les mêmes !)
```

### 2.4 Exemple de Dysfonctionnement - Jours Fériés

**Scénario** : Employé GAB demande congé du 28/04 au 04/05 (7 jours calendaires)
**Note** : Le 1er Mai est un jour férié

**Calcul actuel (erroné)** :
```
28/04 (Lun) → Jour ouvrable ✓ → Compté
29/04 (Mar) → Jour ouvrable ✓ → Compté
30/04 (Mer) → Jour ouvrable ✓ → Compté
01/05 (Jeu) → JOUR FÉRIÉ ✗ → NON COMPTÉ ⚠️
02/05 (Ven) → Jour ouvrable ✓ → Compté
03/05 (Sam) → Weekend ✗ → Non compté
04/05 (Dim) → Weekend ✗ → Non compté

Total décompté: 4 jours
```

**Planning réel de l'employé GAB** :
```
28/04 (Lun) → TRAVAIL → Compté ✓
29/04 (Mar) → TRAVAIL → Compté ✓
30/04 (Mer) → REPOS   → Non compté ✓
01/05 (Jeu) → TRAVAIL → DEVRAIT être compté ⚠️ (il était programmé pour travailler!)
02/05 (Ven) → REPOS   → Non compté ✓
03/05 (Sam) → TRAVAIL → DEVRAIT être compté ⚠️
04/05 (Dim) → TRAVAIL → DEVRAIT être compté ⚠️

Total correct: 5 jours (au lieu de 4 calculés!)
```

**Résultat** : L'employé GAB "gagne" 1 jour de congé car le système exclut automatiquement le jour férié, alors qu'il était programmé pour travailler ce jour-là.

---

## 3. Comment Ça Devrait Fonctionner

### 3.1 Principe Fondamental

> **Un jour de congé ne doit être décompté QUE si l'employé était effectivement programmé pour travailler ce jour-là, INDÉPENDAMMENT du fait que ce soit un jour férié, un weekend, ou un jour ouvrable standard.**

### 3.2 Règle Spéciale pour les Jours Fériés

| Type d'employé | Traitement des jours fériés |
|----------------|----------------------------|
| **Employé avec planning personnalisé (Schedule)** | Si l'employé a un planning PUBLISHED pour un jour férié → **COMPTER** ce jour comme congé |
| **Employé standard (shift par défaut)** | Exclure les jours fériés du comptage (comportement actuel) |

**Justification** : Un employé en rotation qui est programmé pour travailler un jour férié a **choisi** de travailler ce jour (ou l'entreprise l'a assigné). S'il prend un congé ce jour-là, c'est bien un jour de travail qu'il "manque".

### 3.3 Règles de Calcul Proposées

#### Option A : Comptage basé sur le Planning Personnalisé

| Situation | Règle |
|-----------|-------|
| Employé avec planning (Schedule) | Compter UNIQUEMENT les jours où il a une entrée `Schedule.status = PUBLISHED`, **y compris les jours fériés et weekends** |
| Employé sans planning (currentShiftId) | Utiliser les jours du shift par défaut, exclure jours fériés |
| Employé sans planning ni shift | Utiliser les jours ouvrables du tenant, exclure jours fériés |

#### Option B : Comptage Uniforme (Alternative)

Certaines entreprises préfèrent un comptage **uniforme** pour éviter les inégalités perçues :
- Tous les employés ont le même nombre de jours de congé annuels
- Peu importe le type de planning
- Compensation via des jours de repos supplémentaires

### 3.4 Algorithme Recommandé (Option A - Corrigé)

```
FONCTION calculerJoursConge(employeeId, startDate, endDate):

  1. Récupérer les plannings de l'employé dans la période:
     schedules = SELECT * FROM Schedule
                 WHERE employeeId = ?
                 AND date BETWEEN startDate AND endDate
                 AND status = 'PUBLISHED'

  2. SI schedules existe ET count > 0:
     // ⚠️ IMPORTANT: NE PAS exclure les jours fériés pour les plannings personnalisés
     // Le planning lui-même indique si l'employé devait travailler
     → Retourner le nombre de schedules (jours planifiés)

  3. SINON, vérifier si l'employé a un shift par défaut:
     employee = SELECT currentShiftId, currentShift FROM Employee

     SI employee.currentShiftId existe:
       shift = employee.currentShift
       → Pour chaque jour de la période:
          SI jour_semaine IN shift.workingDays ET jour N'EST PAS férié:
            → Compter comme jour ouvrable

  4. SINON (pas de planning, pas de shift):
     → Utiliser le calcul standard (TenantSettings.workingDays)
     → Exclure les jours fériés

  RETOURNER nombreJoursConge
```

**Différence clé avec l'algorithme précédent** :
- Pour les employés avec **planning personnalisé** : les jours fériés NE SONT PAS exclus
- Pour les autres employés : les jours fériés SONT exclus (comportement standard)

---

## 4. Quota de Congés - Équité entre Plannings

### 4.1 Problème d'Équité

| Type Employé | Jours travaillés/semaine | Congés annuels actuels | Semaines de repos obtenues |
|--------------|--------------------------|------------------------|---------------------------|
| Standard (Lun-Ven) | 5 jours | 18 jours | 3.6 semaines |
| GAB (4T/2R) | ~4.67 jours | 18 jours | 3.86 semaines |

Un employé GAB avec 18 jours de congé obtient **plus de semaines de repos** car il travaille moins de jours par semaine.

### 4.2 Solutions Possibles

#### Solution 1 : Quota Proportionnel au Planning
```
quota_annuel = base_quota × (jours_travailles_semaine / 5)

Exemple GAB: 18 × (4.67 / 5) = 16.8 ≈ 17 jours
```

#### Solution 2 : Comptage en Heures (Recommandé)
```
Au lieu de compter en JOURS, compter en HEURES:

- Quota annuel: 144 heures (18 × 8h)
- Chaque jour de congé = heures du shift ce jour-là

Employé Standard: 8h/jour → 18 jours
Employé GAB (10h/jour): 144h ÷ 10h = 14.4 jours de congé effectifs
```

#### Solution 3 : Maintenir l'Équité Simple (Approche RH classique)
```
- Tous les employés ont 18 jours de congé
- Chaque jour calendaire demandé compte comme 1 jour
- Peu importe s'ils travaillent ou non ce jour-là
- Simple mais peut sembler injuste pour certains
```

---

## 5. État Actuel de la Base de Données

### 5.1 Champs Pertinents

**TenantSettings** :
```prisma
model TenantSettings {
  workingDays           Json?    // [1,2,3,4,5] par défaut
  leaveIncludeSaturday  Boolean  @default(false)
  annualLeaveDays       Int      @default(18)
}
```

**Employee** :
```prisma
model Employee {
  currentShiftId  String?  // Shift par défaut (si pas de Schedule)
  // Pas de champ leaveBalance ou leaveQuota spécifique
}
```

**Schedule** :
```prisma
model Schedule {
  employeeId  String
  date        DateTime
  status      ScheduleStatus  // DRAFT, PUBLISHED, SUSPENDED_BY_LEAVE
  shiftId     String?
}
```

**Holiday** :
```prisma
model Holiday {
  id        String   @id
  tenantId  String
  date      DateTime
  name      String
}
```

### 5.2 Ce qui Manque

| Champ/Table | Description | Utilité |
|-------------|-------------|---------|
| `Employee.leaveQuota` | Quota annuel personnalisé | Permet d'ajuster par employé |
| `Employee.leaveBalance` | Solde actuel de congés | Suivi en temps réel |
| `LeaveType.countingMethod` | Méthode de comptage (CALENDAR, WORKING, SCHEDULE) | Flexibilité par type de congé |
| `Schedule.isHolidayWork` | Flag indiquant travail jour férié | Clarté pour le calcul |

---

## 6. Recommandations

### 6.1 Court Terme (Quick Fix) - CRITIQUE

1. **Modifier `calculateWorkingDays()`** pour accepter un paramètre `employeeId` optionnel
2. Si `employeeId` fourni → vérifier la table `Schedule` :
   - Si l'employé a des plannings publiés dans la période → compter ces jours **SANS exclure les jours fériés**
   - Sinon → fallback sur le calcul actuel (avec exclusion des jours fériés)
3. Mettre à jour l'appel dans `create()` et `update()` pour passer l'`employeeId`

### 6.2 Moyen Terme

1. Ajouter un champ `Employee.leaveQuota` pour personnaliser le quota par employé
2. Ajouter un service `LeaveBalanceService` pour calculer le solde en temps réel
3. Créer un rapport "Solde de congés" qui montre:
   - Quota annuel
   - Congés pris
   - Solde restant

### 6.3 Long Terme

1. Implémenter un système de comptage en **heures** plutôt qu'en jours
2. Permettre différentes méthodes de comptage par type de congé
3. Ajouter un calendrier visuel montrant:
   - Jours de travail planifiés
   - Jours de congé demandés
   - Impact sur le solde

---

## 7. Conclusion

### 7.1 Diagnostic Final

| Aspect | État Actuel | Recommandation |
|--------|-------------|----------------|
| **Comptage des jours** | Global (tenant) | Personnalisé (schedule/shift) |
| **Gestion jours fériés** | Toujours exclus | Inclus si planning personnalisé existe |
| **Gestion weekends** | Toujours exclus | Inclus si planning personnalisé existe |
| **Quota employé** | Unique (18j) | Personnalisable |
| **Gestion solde** | Non existante | À implémenter |
| **Équité plannings** | Non gérée | Comptage en heures |

### 7.2 Priorité des Corrections

1. **CRITIQUE** : Modifier le calcul pour tenir compte du planning individuel (weekends + jours fériés)
2. **CRITIQUE** : Ne pas exclure automatiquement les jours fériés pour les plannings personnalisés
3. **HAUTE** : Ajouter le suivi du solde de congés
4. **MOYENNE** : Permettre des quotas personnalisés
5. **BASSE** : Passage au comptage en heures

---

## Annexe A : Exemple de Calcul Correct (Weekends)

### Employé GAB demandant congé du 03/02 au 14/02 (12 jours calendaires)

**Planning GAB (4T/2R) :**
```
03/02 Mon: T (Travail)  → Compter
04/02 Mar: T            → Compter
05/02 Mer: T            → Compter
06/02 Jeu: T            → Compter
07/02 Ven: R (Repos)    → NE PAS compter
08/02 Sam: R            → NE PAS compter
09/02 Dim: T            → Compter
10/02 Lun: T            → Compter
11/02 Mar: T            → Compter
12/02 Mer: T            → Compter
13/02 Jeu: R            → NE PAS compter
14/02 Ven: R            → NE PAS compter

Jours de congé à décompter: 8 (au lieu de 10 avec le calcul actuel)
```

---

## Annexe B : Exemple de Calcul Correct (Jour Férié)

### Employé GAB demandant congé du 28/04 au 04/05 (7 jours calendaires)

**Contexte** : Le 1er Mai est un jour férié national

**Planning GAB (4T/2R) :**
```
28/04 Lun: T (Travail)  → Compter
29/04 Mar: T            → Compter
30/04 Mer: R (Repos)    → NE PAS compter
01/05 Jeu: T + FÉRIÉ    → COMPTER ✓ (il était programmé pour travailler)
02/05 Ven: R            → NE PAS compter
03/05 Sam: T            → Compter
04/05 Dim: T            → Compter

Jours de congé à décompter: 5
```

**Comparaison** :
| Méthode | Calcul | Résultat |
|---------|--------|----------|
| Calcul actuel (erroné) | Exclut le 01/05 car férié + exclut weekends | 4 jours |
| Calcul correct (proposé) | Se base sur le planning réel | 5 jours |

**Économie indue** : L'employé "économise" 1 jour de congé avec le calcul actuel alors qu'il était effectivement censé travailler le 1er Mai.

---

## Annexe C : Résumé des Règles

### Pour les employés AVEC planning personnalisé (Schedule)

| Jour | Règle |
|------|-------|
| Jour de travail (planning) | ✅ COMPTER |
| Jour de repos (planning) | ❌ NE PAS compter |
| Jour férié avec planning travail | ✅ COMPTER |
| Jour férié sans planning | ❌ NE PAS compter |
| Weekend avec planning travail | ✅ COMPTER |
| Weekend sans planning | ❌ NE PAS compter |

### Pour les employés SANS planning personnalisé

| Jour | Règle |
|------|-------|
| Jour ouvrable (Lun-Ven) | ✅ COMPTER |
| Weekend | ❌ NE PAS compter |
| Jour férié | ❌ NE PAS compter |
| Samedi (si leaveIncludeSaturday) | ✅ COMPTER |

---

## 8. Recommandations Techniques à Implémenter

### 8.1 Modification de `calculateWorkingDays()` - PRIORITÉ CRITIQUE

**Fichier** : `backend/src/modules/leaves/leaves.service.ts`

**Changements requis** :

1. **Ajouter un paramètre `employeeId` optionnel** à la signature de la méthode :
   ```typescript
   async calculateWorkingDays(
     tenantId: string,
     startDate: Date,
     endDate: Date,
     employeeId?: string,  // NOUVEAU PARAMÈTRE
   )
   ```

2. **Ajouter la logique de vérification du planning personnalisé** :
   - Si `employeeId` est fourni → chercher les `Schedule` avec `status = 'PUBLISHED'` dans la période
   - Si des schedules existent → retourner leur nombre (sans exclure jours fériés ni weekends)
   - Sinon → utiliser le calcul actuel (fallback)

3. **Mettre à jour les appels** dans :
   - `create()` : passer `dto.employeeId`
   - `update()` : passer `leave.employeeId`

### 8.2 Pseudo-code de la Nouvelle Logique

```typescript
async calculateWorkingDays(
  tenantId: string,
  startDate: Date,
  endDate: Date,
  employeeId?: string,
) {
  // ============================================
  // CAS 1 : Employé avec planning personnalisé
  // ============================================
  if (employeeId) {
    const schedules = await this.prisma.schedule.findMany({
      where: {
        tenantId,
        employeeId,
        date: { gte: startDate, lte: endDate },
        status: 'PUBLISHED',
      },
    });

    if (schedules.length > 0) {
      // Pour les plannings personnalisés :
      // - Ne PAS exclure les jours fériés
      // - Ne PAS exclure les weekends
      // - Compter UNIQUEMENT les jours avec planning
      return {
        workingDays: schedules.length,
        excludedWeekends: 0,
        excludedHolidays: 0,
        totalCalendarDays: /* calcul */,
        includeSaturday: false,
        details: schedules.map(s => ({
          date: s.date.toISOString().split('T')[0],
          isWorking: true,
          reason: 'Planning personnalisé',
        })),
        isPersonalizedSchedule: true, // NOUVEAU FLAG
      };
    }
  }

  // ============================================
  // CAS 2 : Calcul standard (code existant)
  // ============================================
  // ... code actuel inchangé ...
}
```

### 8.3 Modifications dans `create()` et `update()`

**Dans `create()`** (ligne ~279) :
```typescript
// AVANT
const daysCalculation = await this.calculateWorkingDays(tenantId, startDate, endDate);

// APRÈS
const daysCalculation = await this.calculateWorkingDays(tenantId, startDate, endDate, dto.employeeId);
```

**Dans `update()`** (si recalcul nécessaire) :
```typescript
const daysCalculation = await this.calculateWorkingDays(tenantId, startDate, endDate, leave.employeeId);
```

### 8.4 Tests à Effectuer

| Scénario | Entrée | Résultat Attendu |
|----------|--------|------------------|
| Employé GAB, congé 03/02-09/02, planning existe | 7 jours calendaires | 5 jours (jours avec Schedule) |
| Employé GAB, congé incluant 1er Mai (férié), planning travail ce jour | Jour férié inclus | Jour férié COMPTÉ |
| Employé GAB, congé incluant samedi travaillé | Samedi inclus | Samedi COMPTÉ |
| Employé standard, congé 03/02-09/02, pas de planning | 7 jours calendaires | 5 jours (Lun-Ven) |
| Employé standard, congé incluant 1er Mai | Jour férié inclus | Jour férié NON compté |

### 8.5 Points d'Attention

1. **Performances** : La requête `Schedule.findMany` peut être coûteuse pour de longues périodes. Envisager un index sur `(tenantId, employeeId, date, status)`.

2. **Cohérence** : S'assurer que le planning est bien créé AVANT la demande de congé pour que le calcul soit correct.

3. **Rétrocompatibilité** : Le paramètre `employeeId` est optionnel, donc le comportement existant n'est pas impacté si non fourni.

4. **Logs** : Ajouter des logs pour déboguer :
   ```typescript
   console.log(`[calculateWorkingDays] Mode: ${schedules.length > 0 ? 'Planning personnalisé' : 'Standard'}`);
   console.log(`[calculateWorkingDays] Jours comptés: ${workingDays}`);
   ```

### 8.6 Ordre d'Implémentation

```
1. [x] Modifier la signature de calculateWorkingDays()
2. [x] Ajouter la logique de recherche des Schedules
3. [x] Ajouter le flag isPersonalizedSchedule dans le retour
4. [x] Mettre à jour l'appel dans create()
5. [x] Mettre à jour l'appel dans update() (si applicable)
6. [x] Ajouter les logs de débogage
7. [ ] Tester avec un employé GAB
8. [ ] Tester avec un jour férié inclus
9. [ ] Tester le fallback (employé sans planning)
10. [ ] Déployer en production
```

---

## 9. Statut d'Implémentation (Mis à jour le 04/02/2026)

### 9.1 Récapitulatif Global

| Catégorie | Élément | Statut | Notes |
|-----------|---------|--------|-------|
| **Court Terme (CRITIQUE)** | Calcul basé sur planning personnalisé | ✅ FAIT | `leaves.service.ts` modifié |
| | Paramètre `employeeId` dans calculateWorkingDays | ✅ FAIT | Backend + Frontend |
| | Jours fériés inclus pour plannings personnalisés | ✅ FAIT | Pas d'exclusion si Schedule existe |
| | Weekends inclus pour plannings personnalisés | ✅ FAIT | Pas d'exclusion si Schedule existe |
| | Flag `isPersonalizedSchedule` | ✅ FAIT | Retourné par l'API |
| | Affichage différencié dans le modal | ✅ FAIT | Vert pour planning personnalisé |
| **Moyen Terme** | Champ `Employee.leaveQuota` | ✅ FAIT | Schéma Prisma modifié |
| | Service `LeaveBalanceService` | ✅ FAIT | Service créé avec toutes les méthodes |
| | Affichage solde dans modal | ✅ FAIT | Quota/Pris/Restant affiché |
| | Rapport "Solde de congés" (API) | ✅ FAIT | Endpoint `/leaves/balance/all` |
| **Long Terme** | Comptage en heures | ❌ NON FAIT | Refonte majeure |
| | Méthodes de comptage par type de congé | ❌ NON FAIT | `LeaveType.countingMethod` |
| | Calendrier visuel | ❌ NON FAIT | Composant frontend |

### 9.2 Détail des Fichiers Modifiés

| Fichier | Modification | Statut |
|---------|--------------|--------|
| `backend/src/modules/leaves/leaves.service.ts` | Ajout paramètre `employeeId`, logique Schedule | ✅ FAIT |
| `backend/src/modules/leaves/leaves.controller.ts` | Ajout query param `employeeId` + endpoints balance | ✅ FAIT |
| `backend/src/modules/leaves/services/leave-balance.service.ts` | **NOUVEAU** - Service gestion solde | ✅ FAIT |
| `backend/src/modules/leaves/leaves.module.ts` | Export LeaveBalanceService | ✅ FAIT |
| `backend/prisma/schema.prisma` | Ajout `Employee.leaveQuota` | ✅ FAIT |
| `frontend/lib/api/leaves.ts` | Ajout paramètre `employeeId` + fonctions balance | ✅ FAIT |
| `frontend/app/(dashboard)/leaves/page.tsx` | Passe `employeeId`, affichage solde | ✅ FAIT |

### 9.3 Ce qui a été Implémenté (Moyen Terme)

#### ✅ Gestion Solde de Congés - FAIT

1. **Champ `Employee.leaveQuota`** ajouté au schéma Prisma
2. **Service `LeaveBalanceService`** créé avec :
   - `calculateBalance(employeeId, year)` : calcule le solde en temps réel
   - `getQuota(employeeId)` : retourne le quota (personnalisé ou tenant default)
   - `getQuickBalance(employeeId)` : résumé rapide pour le modal
   - `getAllBalances(filters)` : pour le rapport
   - `updateEmployeeQuota(employeeId, quota)` : modification quota

3. **Endpoints API** :
   - `GET /leaves/balance/:employeeId` : solde détaillé
   - `GET /leaves/balance/:employeeId/quick` : solde rapide
   - `GET /leaves/balance/all` : tous les soldes (rapport)
   - `PATCH /leaves/balance/:employeeId/quota` : modifier quota

4. **Affichage dans le modal** :
   - Quota | Pris | En attente | Restant
   - Indicateur "Quota personnalisé" si applicable
   - Alerte si solde insuffisant (rouge)

### 9.4 Ce qui Reste à Faire

#### Priorité MOYENNE - Interface Admin Quotas

1. **Page d'administration** pour voir/modifier les quotas employés
2. **Export Excel** du rapport solde de congés

#### Priorité BASSE - Comptage en Heures

1. **Migration schéma** : ajouter `LeaveType.countingMethod` (DAYS, HOURS)
2. **Calcul heures** : utiliser la durée du shift pour chaque jour
3. **Affichage** : montrer heures ou jours selon la méthode

### 9.5 Estimation Effort Restant

| Fonctionnalité | Effort | Complexité | Statut |
|----------------|--------|------------|--------|
| Gestion Solde | 2-3 jours | Moyenne | ✅ FAIT |
| Quotas Personnalisés | 1 jour | Faible | ✅ FAIT (API) |
| Rapport Solde | 1-2 jours | Faible | ✅ FAIT (API) |
| Interface Admin Quotas | 0.5 jour | Faible | ❌ À faire |
| Export Excel Solde | 0.5 jour | Faible | ❌ À faire |
| Comptage en Heures | 3-5 jours | Haute | ❌ À faire |
| Calendrier Visuel | 2-3 jours | Moyenne | ❌ À faire |

---

*Document d'analyse - PointageFlex*
*Mis à jour le 04/02/2026*
*Statut d'implémentation ajouté*
