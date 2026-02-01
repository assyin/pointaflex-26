# Analyse : Détection automatique des erreurs de type de pointage (IN↔OUT)

## 1. Cas concret : Najib ELHARTI (01972)

### Contexte

| Champ | Valeur |
|-------|--------|
| Employé | Najib ELHARTI (01972) |
| Département | TF |
| Shift assigné | CIT Matin (07:00 → 16:00) |
| Planning explicite | Aucun (pas de Schedule en base) |
| Pointage problématique | **19/01/2026 à 20:26** — type **IN** (terminalState=4) |
| Anomalie détectée | MISSING_Oanalyser UT |


| Anomalie réelle | L'employé a appuyé sur **IN** au lieu de **OUT** en quittant |

### Données brutes du terminal

Le terminal ZKTeco utilise les états suivants :
- `terminalState = 4` → OT-In → mappé en **IN**
- `terminalState = 5` → OT-Out → mappé en **OUT**

L'employé **choisit physiquement** le bouton IN ou OUT sur le terminal. L'erreur vient de l'employé, pas du système de synchronisation.

---

## 2. Analyse du pattern de l'employé

### Historique complet des pointages (24/12/2025 → 28/01/2026)

```
24/12 20:00 | OUT (5) | MISSING_IN     ← Sortie seule
25/12 20:01 | IN  (4) | MISSING_OUT    ← ⚠️ Erreur probable (devrait être OUT)
26/12 20:06 | IN  (4) | MISSING_OUT    ← ⚠️ Erreur probable (devrait être OUT)
29/12 05:02 | IN  (4) | OK             ← Entrée normale
29/12 18:06 | OUT (5) | OK             ← Sortie normale
30/12 04:58 | IN  (4) | OK
30/12 18:08 | OUT (5) | OK
31/12 05:00 | IN  (4) | OK
31/12 18:13 | OUT (5) | OK
01/01 15:03 | IN  (4) | MISSING_OUT    ← ⚠️ Erreur probable (férié)
02/01 04:05 | IN  (4) | OK
05/01 20:22 | IN  (4) | MISSING_OUT    ← ⚠️ Erreur probable
06/01 19:39 | IN  (4) | MISSING_OUT    ← ⚠️ Erreur probable
08/01 03:49 | OUT (5) | MISSING_IN
08/01 21:47 | IN  (4) | MISSING_OUT    ← ⚠️ Erreur probable
09/01 21:28 | IN  (4) | MISSING_OUT    ← ⚠️ Erreur probable
12/01 04:55 | IN  (4) | MISSING_OUT    ← Entrée seule (pas sorti)
19/01 20:26 | IN  (4) | MISSING_OUT    ← ⚠️ CAS ANALYSÉ
21/01 03:46 | OUT (5) | MISSING_IN
21/01 22:00 | IN  (4) | MISSING_OUT    ← ⚠️ Erreur probable
22/01 21:28 | IN  (4) | MISSING_OUT    ← ⚠️ Erreur probable
23/01 22:26 | IN  (4) | LATE
24/01 06:06 | OUT (5) | WEEKEND_WORK
26/01 04:53 | IN  (4) | OK
26/01 18:11 | OUT (5) | OK
27/01 04:56 | IN  (4) | OK
27/01 18:19 | OUT (5) | OK
28/01 04:51 | IN  (4) | OK
```

### Observations clés

1. **Pattern normal** : entrée 04:50-06:10, sortie 18:00-18:20
2. **Pattern d'erreur** : pointages IN isolés entre 19:30-22:30 sans OUT → ce sont des sorties où l'employé a appuyé sur IN
3. **Fréquence** : 10 erreurs probables sur 33 pointages = **30%**

---

## 3. Données globales du tenant

### Distribution des MISSING_OUT / MISSING_IN par terminalState

| Anomalie | Total | terminalState=4 (IN) | terminalState=5 (OUT) |
|----------|------:|---------------------:|----------------------:|
| MISSING_OUT | 966 | **962 (99.6%)** | 0 |
| MISSING_IN | 689 | 0 | **689 (100%)** |

**Conclusion** : Quasi-totalité des MISSING sont des erreurs de bouton par l'employé.

### Répartition par département

| Département | Total MISSING | Probable IN→OUT | Probable OUT→IN | % total pointages |
|-------------|:------------:|:---------------:|:---------------:|:-----------------:|
| **CP** | 1 064 | 520 | 544 | Élevé |
| **SECURITE** | 255 | 170 | 85 | Élevé |
| **TF** | 213 | 188 | 21 | Moyen |
| **GAB** | 67 | 50 | 17 | Faible |
| **TECHNIQUE** | 31 | 25 | 6 | Faible |
| **FLEET** | 20 | 4 | 16 | Faible |
| **MENAGE** | 5 | 5 | 0 | Négligeable |

> CP et SECURITE représentent **80%** des erreurs. Ces départements auraient le plus à gagner de la détection automatique.
> Des départements comme FLEET ou IT pourraient préférer ne pas activer la fonctionnalité s'ils ont des patterns de travail spéciaux.

---

## 4. Architecture de configuration proposée

### 4.1. Niveau Tenant (activation globale)

Nouveaux champs dans `TenantSettings` :

| Champ | Type | Default | Description |
|-------|------|---------|-------------|
| `enableWrongTypeDetection` | Boolean | `false` | Active/désactive la détection globale |
| `wrongTypeAutoCorrect` | Boolean | `false` | Si `true`, corrige automatiquement le type. Si `false`, signale uniquement |
| `wrongTypeDetectionMethod` | Enum | `SHIFT_BASED` | Méthode de détection : `SHIFT_BASED`, `PATTERN_BASED`, `COMBINED` |
| `wrongTypeShiftMarginMinutes` | Int | `120` | Marge en minutes après fin de shift pour considérer un IN comme suspect |
| `wrongTypeConfidenceThreshold` | Int | `80` | Score minimum (0-100) pour déclencher la détection |
| `wrongTypeRequiresValidation` | Boolean | `true` | Si `true`, les corrections auto passent en statut PENDING pour validation |

### 4.2. Niveau Département (surcharge par département)

Nouvelle table `DepartmentSettings` ou champs JSON dans `Department` :

| Champ | Type | Default | Description |
|-------|------|---------|-------------|
| `wrongTypeDetectionEnabled` | Boolean | `null` | `null` = hérite du tenant, `true` = forcé actif, `false` = forcé désactivé |
| `wrongTypeAutoCorrect` | Boolean | `null` | `null` = hérite du tenant |
| `wrongTypeShiftMarginMinutes` | Int | `null` | `null` = hérite du tenant |

### 4.3. Logique de résolution (héritage)

```
Pour un employé du département X :
1. Lire DepartmentSettings de X
2. Si wrongTypeDetectionEnabled === true  → activé
3. Si wrongTypeDetectionEnabled === false → désactivé
4. Si wrongTypeDetectionEnabled === null  → lire TenantSettings.enableWrongTypeDetection
```

Cela permet par exemple :
- Activer globalement pour le tenant
- Désactiver pour FLEET (patterns de travail irréguliers)
- Ou inversement : désactiver globalement mais activer uniquement pour CP et SECURITE

---

## 5. Scénarios de détection

### Scénario 1 : Détection par shift (SHIFT_BASED)

**Logique** : Comparer l'heure du pointage avec le shift de l'employé.

```
Shift CIT Matin : 07:00 → 16:00
Marge : 120 minutes (configurable)
Pointage IN à 20:26 = 4h26 après fin de shift (> marge de 2h)
→ Score de confiance : 95% → PROBABLE_WRONG_TYPE
```

**Règles** :
| Situation | Détection | Confiance |
|-----------|-----------|:---------:|
| IN après endTime + marge | Probable OUT | 90-100% |
| OUT avant startTime - marge | Probable IN | 90-100% |
| IN après endTime mais < marge | Suspect | 50-70% |
| IN pendant le shift sans IN préalable | Normal | 0% |

**Sources du shift** (par priorité) :
1. `Schedule` du jour (planning explicite)
2. `Employee.currentShiftId` (shift par défaut)
3. Aucun shift → passer au scénario suivant

**Avantages** : Simple, rapide, fonctionne en temps réel
**Limites** : Nécessite un shift assigné. Ne couvre pas les heures sup légitimes.

---

### Scénario 2 : Détection par pointages du jour (CONTEXT_BASED)

**Logique** : Si un IN existe déjà ce jour sans OUT, un second IN est probablement un OUT.

```
Jour J : IN à 05:00 (pas de OUT)
Jour J : IN à 20:26 → 2ème IN sans OUT intermédiaire
→ Le 2ème IN est probablement un OUT
```

**Avantages** : Ne dépend pas du shift, universel
**Limites** : Ne fonctionne PAS pour le cas de Najib le 19/01 (un seul pointage ce jour-là)

---

### Scénario 3 : Détection par pattern historique (PATTERN_BASED)

**Logique** : Calculer les fenêtres horaires habituelles d'entrée et sortie sur 30 jours.

```
Pattern de Najib (30 jours) :
  - Fenêtre entrée : 04:50 → 06:10
  - Fenêtre sortie : 18:00 → 18:20
Pointage IN à 20:26 → hors fenêtre entrée, après fenêtre sortie
→ Probable OUT erroné (confiance 85%)
```

**Avantages** : Très précis, fonctionne sans shift, détecte les cas avec un seul pointage/jour
**Limites** : Nécessite un historique (minimum 10+ pointages). Coûteux en requêtes. Ne fonctionne pas pour les nouveaux employés.

---

### Scénario 4 : Combiné (COMBINED) — recommandé

```
Étape 1 — Shift disponible ?
  → OUI : appliquer Scénario 1 (SHIFT_BASED)
  → NON : passer à l'étape 2

Étape 2 — Existe-t-il un IN/OUT non fermé le même jour ?
  → OUI : appliquer Scénario 2 (CONTEXT_BASED)
  → NON : passer à l'étape 3

Étape 3 — Historique suffisant (10+ pointages) ?
  → OUI : appliquer Scénario 3 (PATTERN_BASED)
  → NON : ne pas détecter (données insuffisantes)

Score final = max(scores des étapes applicables)
Si score >= seuil configuré → déclencher détection
```

---

## 6. Options de traitement après détection

### Option A : Signaler uniquement (anomalie informative)

- Nouveau type d'anomalie : `PROBABLE_WRONG_TYPE`
- Le type du pointage reste **inchangé** (IN reste IN)
- L'admin voit un avertissement dans la modal : "Ce pointage IN semble être une sortie"
- L'admin corrige manuellement via un bouton "Inverser le type"

**Impact sur l'existant** :
- Aucune modification des données
- Ajout d'un `anomalyType` supplémentaire
- La modal de détails affiche l'explication

### Option B : Auto-corriger le type

- Le système change le type de IN→OUT (ou OUT→IN)
- Le pointage est marqué `detectionMethod = 'AUTO_CORRECTED'`
- Une note est ajoutée : "Type inversé automatiquement (confiance: 95%)"

**Impact sur l'existant** :
- **Risque** : faux positif si heures supplémentaires légitimes
- **Risque** : si le shift est mal configuré, toutes les corrections sont fausses
- **Avantage** : réduit drastiquement le travail manuel (~1 655 corrections potentielles)

### Option C : Auto-corriger avec validation (recommandé)

- Le système détecte et pré-corrige le type
- Le pointage est marqué `validationStatus = PENDING_AUTO_CORRECTION`
- L'admin voit une liste de corrections proposées à valider/rejeter en masse
- Un bouton "Valider tout" et "Rejeter tout" pour le traitement groupé

**Impact sur l'existant** :
- Meilleur compromis automatisation/contrôle
- L'admin garde le dernier mot
- Les corrections groupées accélèrent le travail

---

## 7. Impact sur le code existant

### 7.1. Modèle de données (Prisma)

| Modification | Fichier | Impact |
|-------------|---------|--------|
| Ajouter champs dans `TenantSettings` | `schema.prisma` | Migration DB |
| Créer table `DepartmentSettings` (ou ajouter JSON à `Department`) | `schema.prisma` | Migration DB |
| Ajouter `PROBABLE_WRONG_TYPE` au code | `attendance.service.ts` | Logique métier |
| Ajouter `AUTO_CORRECTED` comme `detectionMethod` | `attendance.service.ts` | Logique métier |

### 7.2. Backend

| Modification | Fichier | Impact |
|-------------|---------|--------|
| Nouveau service de détection | Nouveau fichier | Aucun impact existant |
| Intégrer dans le webhook | `attendance.service.ts` | Ajout après la logique actuelle (non destructif) |
| DTO pour les nouveaux settings | `update-tenant-settings.dto.ts` | Ajout de champs |
| Endpoint settings département | `departments.controller.ts` | Nouveau endpoint |
| Endpoint "Inverser le type" | `attendance.controller.ts` | Nouveau endpoint |

### 7.3. Frontend

| Modification | Fichier | Impact |
|-------------|---------|--------|
| Page settings : onglet détection | `settings/page.tsx` | Nouvel onglet/section |
| Modal correction : bouton "Inverser" | `CorrectionDetailsModal.tsx` | Ajout dans modal existante |
| Labels pour `PROBABLE_WRONG_TYPE` | `anomalies.ts` | Ajout dans les maps |
| Liste des anomalies : filtre | `AnomaliesFiltersPanel.tsx` | Ajout option filtre |
| Settings département | Nouveau composant | Nouveau composant |

### 7.4. Risques

| Risque | Probabilité | Impact | Mitigation |
|--------|:-----------:|:------:|------------|
| Faux positif sur heures sup | Moyen | Élevé | `wrongTypeRequiresValidation = true` par défaut |
| Shift mal configuré | Faible | Élevé | Utiliser méthode COMBINED, pas SHIFT_BASED seul |
| Performance (pattern analysis) | Faible | Moyen | Cache des patterns, calcul async |
| Migration DB sur tenant existant | Nul | Nul | Champs optionnels avec defaults |
| Conflits avec MISSING_OUT/MISSING_IN existants | Moyen | Moyen | `PROBABLE_WRONG_TYPE` est un sous-type, pas un remplacement |

---

## 8. Exemple de flow pour le cas de Najib

```
1. Najib pointe IN à 20:26 le 19/01/2026
2. Le webhook reçoit : { type: "IN", terminalState: 4 }
3. Le système exécute la logique actuelle :
   → Pas de OUT correspondant → MISSING_OUT (comme aujourd'hui)

4. NOUVEAU : Détection d'erreur de type
   a. Vérifier TenantSettings.enableWrongTypeDetection → true
   b. Vérifier DepartmentSettings("TF").wrongTypeDetectionEnabled → null (hérite du tenant) → true
   c. Méthode : COMBINED

   d. Étape 1 (SHIFT_BASED) :
      - currentShiftId = "CIT Matin" (07:00→16:00)
      - Heure pointage : 20:26
      - Écart : 20:26 - 16:00 = 4h26 = 266 minutes > marge de 120 min
      - Score : 95%
      → DÉTECTÉ

   e. Score final : 95% > seuil 80%

5. Action (selon wrongTypeAutoCorrect) :
   Option A (signaler) : anomalyType = "PROBABLE_WRONG_TYPE", note = "Ce IN à 20:26 est probablement un OUT (shift termine à 16:00)"
   Option C (auto+validation) : type changé en OUT, validationStatus = "PENDING_AUTO_CORRECTION"

6. L'admin voit dans la liste :
   "Najib ELHARTI | 19/01/2026 20:26 | ⚠️ Type inversé (IN→OUT) | En attente de validation"
   → Bouton [Valider] [Rejeter]
```

---

## 9. Recommandations groupées

### Phase 1 — Fondations (priorité haute)

| # | Action | Complexité | Fichiers impactés |
|:-:|--------|:----------:|-------------------|
| 1 | Ajouter les champs `enableWrongTypeDetection`, `wrongTypeAutoCorrect`, `wrongTypeDetectionMethod`, `wrongTypeShiftMarginMinutes`, `wrongTypeConfidenceThreshold`, `wrongTypeRequiresValidation` dans `TenantSettings` (Prisma + DTO) | Faible | `schema.prisma`, `update-tenant-settings.dto.ts`, `tenants.service.ts` |
| 2 | Créer la table `DepartmentSettings` avec `wrongTypeDetectionEnabled`, `wrongTypeAutoCorrect`, `wrongTypeShiftMarginMinutes` (champs nullable pour héritage) | Faible | `schema.prisma`, migration |
| 3 | Ajouter `PROBABLE_WRONG_TYPE` dans les labels, couleurs et types frontend | Faible | `lib/api/anomalies.ts`, `CorrectionDetailsModal.tsx` |
| 4 | Créer un service `WrongTypeDetectionService` avec la logique SHIFT_BASED (Scénario 1) | Moyen | Nouveau fichier backend |
| 5 | Intégrer le service dans le webhook `processTerminalStateWebhook` après la détection des anomalies existantes | Moyen | `attendance.service.ts` |

### Phase 2 — Interface utilisateur (priorité haute)

| # | Action | Complexité | Fichiers impactés |
|:-:|--------|:----------:|-------------------|
| 6 | Section dans les Settings tenant pour activer/configurer la détection | Moyen | `settings/page.tsx`, nouveau composant |
| 7 | Interface settings par département (toggle on/off/hériter) | Moyen | `DepartmentsTab.tsx` ou nouveau composant |
| 8 | Bouton "Inverser le type (IN↔OUT)" dans la modal de correction | Faible | `CorrectionModal.tsx`, nouveau endpoint API |
| 9 | Filtre `PROBABLE_WRONG_TYPE` dans la page anomalies | Faible | `AnomaliesFiltersPanel.tsx` |

### Phase 3 — Auto-correction et validation (priorité moyenne)

| # | Action | Complexité | Fichiers impactés |
|:-:|--------|:----------:|-------------------|
| 10 | Implémenter l'auto-correction avec statut `PENDING_AUTO_CORRECTION` | Moyen | `attendance.service.ts` |
| 11 | Vue de validation groupée des corrections proposées (valider/rejeter en masse) | Moyen | Nouveau composant frontend |
| 12 | Implémenter la détection CONTEXT_BASED (Scénario 2 : doublon IN sans OUT) | Faible | `WrongTypeDetectionService` |

### Phase 4 — Intelligence avancée (priorité basse)

| # | Action | Complexité | Fichiers impactés |
|:-:|--------|:----------:|-------------------|
| 13 | Implémenter la détection PATTERN_BASED (Scénario 3 : historique 30 jours) | Élevé | `WrongTypeDetectionService` |
| 14 | Job asynchrone pour recalculer les patterns chaque nuit | Élevé | Nouveau job CRON |
| 15 | Dashboard de statistiques des erreurs de type par département | Moyen | Nouveau composant frontend |
| 16 | Notification manager quand un employé dépasse un seuil d'erreurs de type | Moyen | `mail.service.ts` |

### Résumé par priorité

| Phase | Nb actions | Complexité globale | Valeur ajoutée |
|:-----:|:----------:|:------------------:|----------------|
| 1 | 5 | Moyen | Fondation complète + détection fonctionnelle |
| 2 | 4 | Moyen | Interface admin complète + correction manuelle rapide |
| 3 | 3 | Moyen | Automatisation avec contrôle |
| 4 | 4 | Élevé | Intelligence prédictive |

---

## 10. Chiffres clés de justification

| Métrique | Valeur |
|----------|--------|
| Total MISSING_OUT + MISSING_IN | **1 655** |
| % des erreurs probables de type | **~21.4%** des pointages |
| Département le plus impacté | CP (1 064 cas) |
| Temps de correction manuelle estimé | ~2 min/anomalie × 1 655 = **~55 heures** |
| Temps avec auto-correction + validation | ~5 sec/validation × 1 655 = **~2.3 heures** |
| Gain de productivité estimé | **~96%** de réduction du temps de correction |
