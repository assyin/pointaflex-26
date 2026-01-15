# 🧪 Guide de Test - Détection IN/OUT Automatique

## Vue d'ensemble

Ce document décrit les scénarios de test pour valider l'implémentation de la détection IN/OUT automatique avec les fonctionnalités suivantes :
- Anti-rebond (double badge)
- Pauses implicites
- Clôture automatique des sessions orphelines
- Traçabilité (rawData standardisé)

---

## 📋 Description des Options

### Section "Détection IN/OUT Automatique"

Cette section permet de configurer comment le système gère automatiquement les pointages reçus des terminaux (ZKTeco, etc.) qui ne fournissent pas l'information IN/OUT.

---

### 🔄 Option 1 : Tolérance Anti-rebond (minutes)

| Propriété | Valeur |
|-----------|--------|
| **Champ** | `doublePunchToleranceMinutes` |
| **Type** | Nombre entier (1-10) |
| **Défaut** | 2 minutes |

#### Fonctionnalité Attendue

**Problème résolu :** Quand un employé badge sur le terminal, il arrive qu'il badge 2 fois par erreur (double appui, lecteur lent, etc.).

**Comportement :**
- Si un employé badge et rebadge dans un délai **inférieur** à X minutes, le 2ème badge est **ignoré**
- Le système répond avec `status: 'ignored', reason: 'DEBOUNCE'`
- Un log est généré : `⚠️ [DEBOUNCE] Badge ignoré pour MATRICULE`

**Exemple concret :**
```
Configuration : 2 minutes
- 08:00:00 → Employé badge IN ✅ Enregistré
- 08:00:45 → Employé rebadge   ❌ Ignoré (45 sec < 2 min)
- 08:03:00 → Employé badge     ✅ Enregistré (3 min > 2 min)
```

---

### ☕ Option 2 : Pauses Implicites

| Propriété | Valeur |
|-----------|--------|
| **Toggle** | `allowImplicitBreaks` |
| **Type** | Booléen (Activé/Désactivé) |
| **Défaut** | Activé |

#### Fonctionnalité Attendue

**Problème résolu :** Quand un employé sort pour sa pause déjeuner (badge OUT) puis revient (badge IN), le système pourrait considérer ce retour comme un retard et créer une anomalie ABSENCE_PARTIAL.

**Comportement quand ACTIVÉ :**
- Le système vérifie si le IN est précédé d'un OUT récent
- Si oui, c'est considéré comme un "retour de pause" → **pas d'anomalie**
- Log : `✅ Pause implicite détectée pour employé X: OUT à 12:00 → IN à 13:00`

**Comportement quand DÉSACTIVÉ :**
- Chaque IN est évalué indépendamment
- Un retour après pause peut générer une anomalie LATE ou ABSENCE_PARTIAL

---

### ⏱️ Option 2a : Durée Minimum de Pause (minutes)

| Propriété | Valeur |
|-----------|--------|
| **Champ** | `minImplicitBreakMinutes` |
| **Type** | Nombre entier (5-60) |
| **Défaut** | 30 minutes |

#### Fonctionnalité Attendue

**Rôle :** Définit le seuil minimum pour qu'un OUT→IN soit considéré comme une pause.

**Logique :**
- Si durée OUT→IN **< minImplicitBreakMinutes** → Probablement un double badge ou erreur
- Si durée OUT→IN **≥ minImplicitBreakMinutes** → Peut être une pause implicite

**Exemple :**
```
Configuration : min = 30 minutes
- OUT 12:00 → IN 12:15 (15 min) → ❌ Trop court, pas une pause
- OUT 12:00 → IN 12:45 (45 min) → ✅ Pause implicite reconnue
```

---

### ⏱️ Option 2b : Durée Maximum de Pause (minutes)

| Propriété | Valeur |
|-----------|--------|
| **Champ** | `maxImplicitBreakMinutes` |
| **Type** | Nombre entier (30-240) |
| **Défaut** | 120 minutes (2 heures) |

#### Fonctionnalité Attendue

**Rôle :** Définit le seuil maximum au-delà duquel un OUT→IN n'est plus considéré comme une pause.

**Logique :**
- Si durée OUT→IN **≤ maxImplicitBreakMinutes** → Pause implicite (pas d'anomalie)
- Si durée OUT→IN **> maxImplicitBreakMinutes** → Absence partielle (anomalie ABSENCE_PARTIAL)

**Exemple :**
```
Configuration : max = 120 minutes
- OUT 12:00 → IN 13:30 (90 min)  → ✅ Pause implicite (90 < 120)
- OUT 12:00 → IN 15:00 (180 min) → ❌ Trop long, ABSENCE_PARTIAL
```

---

### 🔌 Option 3 : Clôture Automatique des Sessions Orphelines

| Propriété | Valeur |
|-----------|--------|
| **Toggle** | `autoCloseOrphanSessions` |
| **Type** | Booléen (Activé/Désactivé) |
| **Défaut** | Activé |

#### Fonctionnalité Attendue

**Problème résolu :** Un employé badge IN le matin mais oublie de badger OUT en partant. Sa session reste "ouverte" indéfiniment avec une anomalie MISSING_OUT.

**Comportement quand ACTIVÉ :**
- Chaque nuit à 2h00, le job vérifie les sessions orphelines de la veille
- Pour chaque IN sans OUT correspondant :
  - Crée un OUT automatique à l'heure de fin de shift (si défini)
  - Ou à l'heure configurée par défaut (si pas de shift)
- Le OUT créé est marqué `anomalyType: 'AUTO_CORRECTION'`
- Le IN original est marqué `anomalyType: 'AUTO_CLOSED'`

**Comportement quand DÉSACTIVÉ :**
- Les sessions orphelines restent avec l'anomalie MISSING_OUT
- Nécessite une correction manuelle

---

### 🕐 Option 3a : Heure de Clôture par Défaut

| Propriété | Valeur |
|-----------|--------|
| **Champ** | `autoCloseDefaultTime` |
| **Type** | Heure (format HH:mm) |
| **Défaut** | 23:59 |

#### Fonctionnalité Attendue

**Rôle :** Définit l'heure à laquelle créer le OUT automatique si l'employé n'a pas de shift défini.

**Priorité de l'heure de clôture :**
1. Heure de fin du **schedule du jour** (si existe)
2. Heure de fin du **shift par défaut de l'employé** (si existe)
3. **Heure configurée ici** (dernier recours)

**Exemple :**
```
Configuration : 22:00

Employé sans shift :
- IN à 08:00, oublie de badger OUT
- À 2h du matin, le job crée : OUT à 22:00 (heure configurée)

Employé avec shift 08:00-17:00 :
- IN à 08:00, oublie de badger OUT
- À 2h du matin, le job crée : OUT à 17:00 (heure du shift)
```

---

### ✅ Option 3b : Vérifier les Heures Sup Approuvées

| Propriété | Valeur |
|-----------|--------|
| **Champ** | `autoCloseCheckApprovedOvertime` |
| **Type** | Booléen (Activé/Désactivé) |
| **Défaut** | Activé |

#### Fonctionnalité Attendue

**Problème résolu :** Si un employé fait des heures supplémentaires approuvées mais oublie de badger, la clôture automatique à l'heure de fin du shift **perdrait** ces heures travaillées.

**Comportement quand ACTIVÉ :**
1. Le job vérifie si l'employé a des heures sup **APPROVED** pour le jour
2. **Si APPROVED trouvé :** Crée OUT à (fin shift + heures sup)
   - Ex: Shift 17:00 + 2h overtime → OUT créé à 19:00
3. **Si PENDING trouvé :** Crée OUT mais marque avec anomalie `AUTO_CLOSED_CHECK_OVERTIME`
   - Signal pour le RH de vérifier et potentiellement ajuster l'heure

**Comportement quand DÉSACTIVÉ :**
- Ignore complètement les heures supplémentaires
- OUT créé à l'heure de fin de shift (risque de perte d'heures)

**Exemple :**
```
Employé avec shift 08:00-17:00, overtime approuvé de 2h

AVEC vérification activée :
- IN à 08:00, oublie de badger OUT
- Overtime APPROVED : 2h
- Job crée : OUT à 19:00 (17:00 + 2h)

SANS vérification :
- IN à 08:00, oublie de badger OUT
- Job crée : OUT à 17:00 (perte des 2h !)
```

---

### ⏰ Option 3c : Buffer Heures Supplémentaires (minutes)

| Propriété | Valeur |
|-----------|--------|
| **Champ** | `autoCloseOvertimeBuffer` |
| **Type** | Nombre entier (0-480) |
| **Défaut** | 0 (désactivé) |

#### Fonctionnalité Attendue

**Rôle :** Ajoute automatiquement X minutes après l'heure de fin de shift lors de la clôture auto, pour couvrir les heures sup non encore approuvées.

**Logique :**
- Si `autoCloseOvertimeBuffer` = 0 → Pas de buffer ajouté
- Si `autoCloseOvertimeBuffer` = 120 → Ajoute 2h après fin de shift

**Note importante :** Ce buffer est utilisé UNIQUEMENT si :
- Aucune overtime APPROVED n'existe pour le jour
- L'option `autoCloseCheckApprovedOvertime` est activée

**Exemple :**
```
Configuration : buffer = 120 minutes (2h)
Employé avec shift 08:00-17:00, PAS d'overtime approuvé

- IN à 08:00, oublie de badger OUT
- Job crée : OUT à 19:00 (17:00 + 2h buffer)

Ainsi l'employé a une marge de 2h pour ses heures sup
éventuelles qui seront régularisées plus tard.
```

---

### ⚠️ Option 3d : Anomalie AUTO_CLOSED_CHECK_OVERTIME

Cette anomalie est créée automatiquement quand :
1. La clôture automatique est activée
2. Un overtime **PENDING** (en attente d'approbation) existe pour l'employé

**Signification :**
- Le système a détecté des heures sup non encore validées
- Le RH doit vérifier et potentiellement ajuster l'heure de sortie
- Visible dans le filtre des anomalies de l'interface

**Action RH recommandée :**
1. Vérifier si les heures sup PENDING doivent être approuvées
2. Si approuvées, corriger manuellement l'heure de OUT si nécessaire
3. Valider ou rejeter l'anomalie dans l'interface

---

## 🔬 Tableau Récapitulatif des Options

| Option | Champ | Défaut | Impact |
|--------|-------|--------|--------|
| Anti-rebond | `doublePunchToleranceMinutes` | 2 min | Ignore les badges trop rapprochés |
| Pauses implicites | `allowImplicitBreaks` | ✅ Activé | Reconnaît OUT→IN comme pause |
| Durée min pause | `minImplicitBreakMinutes` | 30 min | Seuil bas pour pause valide |
| Durée max pause | `maxImplicitBreakMinutes` | 120 min | Seuil haut avant absence partielle |
| Clôture auto | `autoCloseOrphanSessions` | ✅ Activé | Ferme les sessions orphelines |
| Heure clôture | `autoCloseDefaultTime` | 23:59 | Heure OUT par défaut |
| Vérif overtime | `autoCloseCheckApprovedOvertime` | ✅ Activé | Vérifie heures sup avant clôture |
| Buffer overtime | `autoCloseOvertimeBuffer` | 0 min | Marge après fin shift |

---

## 1. Tests Frontend - Interface Settings

### 1.1 Accès à la nouvelle section

**Objectif :** Vérifier que la section "Détection IN/OUT Automatique" s'affiche correctement

**Étapes :**
1. Connectez-vous à l'application (http://localhost:3001)
2. Allez dans **Settings** (Paramètres) via le menu latéral
3. Cliquez sur l'onglet **"Horaires"**
4. Scrollez vers le bas

**Résultat attendu :**
- [ ] Une section "Détection IN/OUT Automatique" apparaît avec une icône empreinte violette
- [ ] La section contient 3 sous-parties : Anti-rebond, Pauses implicites, Clôture automatique
- [ ] Un message d'information violet s'affiche en bas de la section

---

### 1.2 Test Anti-rebond

**Objectif :** Vérifier la modification et persistance du paramètre anti-rebond

**Étapes :**
1. Localisez le champ "Tolérance anti-rebond (minutes)"
2. Notez la valeur actuelle (défaut: 2)
3. Changez la valeur à **5**
4. Cliquez sur le bouton **"Enregistrer"** en haut de la page
5. Rafraîchissez la page (F5)

**Résultat attendu :**
- [ ] La valeur 5 est conservée après rafraîchissement
- [ ] Notification "Paramètres mis à jour" affichée

**Comportement attendu après configuration :**
- Tous les badges espacés de moins de 5 minutes seront ignorés

---

### 1.3 Test Toggle Pauses Implicites

**Objectif :** Vérifier le comportement du toggle et des champs associés

**Étapes :**
1. Localisez le toggle "Activer les pauses implicites"
2. **Si activé :** Désactivez-le
3. Observez les champs "Durée minimum" et "Durée maximum"

**Résultat attendu :**
- [ ] Les champs durée sont grisés (opacity réduite, non cliquables)
- [ ] Le toggle change d'état visuellement

**Comportement attendu si désactivé :**
- Les retours de pause (OUT→IN) seront traités comme des retards normaux
- Des anomalies LATE ou ABSENCE_PARTIAL pourront être générées

**Étapes suite :**
4. Réactivez le toggle
5. Modifiez "Durée minimum" à **45** minutes
6. Modifiez "Durée maximum" à **90** minutes
7. Enregistrez et rafraîchissez

**Résultat attendu :**
- [ ] Les champs redeviennent actifs
- [ ] Les valeurs 45 et 90 sont conservées

**Comportement attendu après configuration :**
- Pauses de 45-90 min reconnues comme implicites (pas d'anomalie)
- Pauses < 45 min ou > 90 min → anomalie possible

---

### 1.4 Test Toggle Clôture Automatique

**Objectif :** Vérifier le comportement du toggle clôture auto

**Étapes :**
1. Localisez le toggle "Clôture automatique des sessions orphelines"
2. Désactivez-le
3. Observez le champ "Heure de clôture par défaut"

**Résultat attendu :**
- [ ] Le champ heure est grisé

**Comportement attendu si désactivé :**
- Les employés qui oublient de badger OUT garderont l'anomalie MISSING_OUT
- Aucun OUT automatique ne sera créé

**Étapes suite :**
4. Réactivez le toggle
5. Changez l'heure à **22:00**
6. Enregistrez et rafraîchissez

**Résultat attendu :**
- [ ] L'heure 22:00 est conservée

**Comportement attendu après configuration :**
- Les employés sans shift qui oublient de badger auront un OUT créé à 22:00

---

### 1.5 Validation Formulaire Complet

**Objectif :** Sauvegarder tous les paramètres ensemble

**Configuration test recommandée :**
| Paramètre | Valeur | Justification |
|-----------|--------|---------------|
| Anti-rebond | 3 min | Évite doubles badges accidentels |
| Pauses implicites | Activé | Reconnaît les pauses déjeuner |
| Durée min pause | 30 min | Pause minimum raisonnable |
| Durée max pause | 120 min | 2h max pour pause déjeuner |
| Clôture auto | Activé | Ferme les sessions oubliées |
| Heure clôture | 23:00 | Heure de fermeture tardive |

---

## 2. Tests Fonctionnels - Comportement Attendu

### 2.1 Scénario : Double Badge Accidentel

**Configuration requise :**
- `doublePunchToleranceMinutes` = 2

**Actions :**
1. Employé badge IN à 08:00:00
2. Employé rebadge à 08:01:00 (1 min après)

**Résultat attendu :**
| Badge | Heure | Résultat |
|-------|-------|----------|
| 1er | 08:00:00 | ✅ Enregistré |
| 2ème | 08:01:00 | ❌ Ignoré (DEBOUNCE) |

**Log attendu :**
```
⚠️ [DEBOUNCE] Badge ignoré pour MATRICULE: 1.0 min depuis le dernier (< 2 min)
```

---

### 2.2 Scénario : Pause Déjeuner Normale

**Configuration requise :**
- `allowImplicitBreaks` = true
- `minImplicitBreakMinutes` = 30
- `maxImplicitBreakMinutes` = 120

**Actions :**
1. Employé badge IN à 08:00
2. Employé badge OUT à 12:00 (pause déjeuner)
3. Employé badge IN à 13:00 (retour - 60 min après)

**Résultat attendu :**
| Badge | Heure | Type | Anomalie |
|-------|-------|------|----------|
| 1 | 08:00 | IN | Aucune |
| 2 | 12:00 | OUT | Aucune |
| 3 | 13:00 | IN | ✅ Aucune (pause implicite) |

**Log attendu :**
```
✅ [detectAnomalies] Pause implicite détectée: OUT à 12:00 → IN à 13:00 (60 min)
```

---

### 2.3 Scénario : Pause Trop Longue

**Configuration requise :**
- `maxImplicitBreakMinutes` = 120

**Actions :**
1. Employé badge OUT à 12:00
2. Employé badge IN à 15:30 (210 min après)

**Résultat attendu :**
| Badge | Heure | Anomalie |
|-------|-------|----------|
| OUT | 12:00 | Aucune |
| IN | 15:30 | ❌ ABSENCE_PARTIAL (210 > 120 min) |

---

### 2.4 Scénario : Badge Oublié (Clôture Auto)

**Configuration requise :**
- `autoCloseOrphanSessions` = true
- `autoCloseDefaultTime` = "22:00"
- Employé sans shift défini

**Actions :**
1. Employé badge IN à 08:00
2. Employé ne badge PAS OUT (oubli)
3. Job s'exécute à 2h du matin

**Résultat attendu :**
| Événement | Heure | Action |
|-----------|-------|--------|
| IN original | 08:00 | Marqué AUTO_CLOSED |
| OUT créé | 22:00 | Créé avec AUTO_CORRECTION |

**rawData du OUT créé :**
```json
{
  "autoGenerated": true,
  "originalInId": "xxx",
  "reason": "MISSING_OUT_AUTO_CLOSE"
}
```

---

### 2.5 Scénario : Badge Oublié avec Overtime Approuvé

**Configuration requise :**
- `autoCloseOrphanSessions` = true
- `autoCloseCheckApprovedOvertime` = true
- Employé avec shift 08:00-17:00
- Overtime APPROVED de 2h pour le jour

**Actions :**
1. Employé badge IN à 08:00
2. Employé fait 2h supplémentaires (overtime approuvé)
3. Employé ne badge PAS OUT (oubli)
4. Job s'exécute à 2h du matin

**Résultat attendu :**
| Événement | Heure | Action |
|-----------|-------|--------|
| IN original | 08:00 | Marqué AUTO_CLOSED |
| OUT créé | **19:00** | Créé avec AUTO_CORRECTION (17:00 + 2h overtime) |

**Note :** Les heures sup sont préservées grâce à la vérification !

**rawData du OUT créé :**
```json
{
  "autoGenerated": true,
  "originalInId": "xxx",
  "reason": "MISSING_OUT_AUTO_CLOSE",
  "overtimeInfo": {
    "status": "APPROVED",
    "hours": 2
  },
  "baseEndTime": "2026-01-07T17:00:00.000Z"
}
```

---

### 2.6 Scénario : Badge Oublié avec Overtime PENDING

**Configuration requise :**
- `autoCloseOrphanSessions` = true
- `autoCloseCheckApprovedOvertime` = true
- `autoCloseOvertimeBuffer` = 120 (2h)
- Employé avec shift 08:00-17:00
- Overtime **PENDING** (non encore approuvé) de 2h

**Actions :**
1. Employé badge IN à 08:00
2. Employé fait des heures sup (demande PENDING)
3. Employé ne badge PAS OUT (oubli)
4. Job s'exécute à 2h du matin

**Résultat attendu :**
| Événement | Heure | Action |
|-----------|-------|--------|
| IN original | 08:00 | Marqué **AUTO_CLOSED_CHECK_OVERTIME** |
| OUT créé | **19:00** | Créé avec **AUTO_CLOSED_CHECK_OVERTIME** |

**Note importante :**
- L'anomalie `AUTO_CLOSED_CHECK_OVERTIME` signale au RH qu'il faut vérifier
- Le buffer de 2h est appliqué (17:00 + 120 min)
- Le RH doit valider ou ajuster si nécessaire

**Log attendu :**
```
⚠️ Overtime PENDING trouvé pour MATRICULE: 2h - Vérification RH requise
⚠️ Session clôturée: John Doe (MAT001) - IN à 08:00 → OUT à 19:00 (OVERTIME CONFLICT - À VÉRIFIER)
```

---

## 3. Tests Base de Données

### 3.1 Vérifier les Settings

```sql
SELECT
  "tenantId",
  "doublePunchToleranceMinutes",
  "allowImplicitBreaks",
  "minImplicitBreakMinutes",
  "maxImplicitBreakMinutes",
  "autoCloseOrphanSessions",
  "autoCloseDefaultTime",
  "autoCloseOvertimeBuffer",
  "autoCloseCheckApprovedOvertime"
FROM "TenantSettings"
LIMIT 5;
```

### 3.2 Vérifier un Pointage avec rawData Standardisé

```sql
SELECT
  id,
  "employeeId",
  type,
  timestamp,
  "rawData"
FROM "Attendance"
WHERE "rawData"::text LIKE '%source%'
ORDER BY "createdAt" DESC
LIMIT 5;
```

**Structure rawData attendue :**
```json
{
  "source": "TERMINAL_ZKTECO",
  "originalData": {...},
  "inOutDetection": {
    "method": "ALTERNATION",
    "receivedType": "IN",
    "processedAt": "2024-01-15T08:00:00.000Z"
  },
  "receivedAt": "2024-01-15T08:00:00.000Z",
  "deviceId": "..."
}
```

---

## 4. Checklist Finale

### Frontend
- [ ] Section "Détection IN/OUT Automatique" visible dans Horaires
- [ ] Anti-rebond : champ numérique fonctionnel
- [ ] Toggle pauses : active/désactive les champs enfants
- [ ] Durées pauses : modifiables quand toggle activé
- [ ] Toggle clôture : active/désactive le champ heure
- [ ] Heure clôture : modifiable quand toggle activé
- [ ] Section "Protection Heures Sup" : visible dans clôture auto
- [ ] Toggle vérif overtime : fonctionnel
- [ ] Champ buffer overtime : modifiable
- [ ] Sauvegarde : toutes les valeurs persistent après refresh

### Backend
- [ ] Anti-rebond : ignore les badges < X minutes
- [ ] Pauses implicites : reconnaît OUT→IN comme pause
- [ ] Clôture auto : crée OUT pour sessions orphelines
- [ ] Vérif overtime : ajoute heures APPROVED à l'heure de clôture
- [ ] Overtime PENDING : marque avec anomalie AUTO_CLOSED_CHECK_OVERTIME
- [ ] Buffer overtime : ajoute X minutes si pas d'overtime approuvé
- [ ] rawData : format standardisé avec source et métadonnées

### Base de données
- [ ] 8 nouveaux champs présents dans TenantSettings (incluant overtime protection)
- [ ] Valeurs par défaut correctes
- [ ] rawData bien formaté sur nouveaux pointages (incluant overtimeInfo)

---

## 5. Commandes Utiles

```bash
# Démarrer le backend
cd /home/assyin/PointaFlex/backend && npm run start:dev

# Démarrer le frontend
cd /home/assyin/PointaFlex/frontend && npm run dev

# Rebuild backend
cd /home/assyin/PointaFlex/backend && npm run build

# Rebuild frontend
cd /home/assyin/PointaFlex/frontend && npm run build

# Sync Prisma (appliquer les changements schema)
cd /home/assyin/PointaFlex/backend && npx prisma db push
```

---

## 6. Résumé Visuel

```
┌─────────────────────────────────────────────────────────────────────┐
│                 DÉTECTION IN/OUT AUTOMATIQUE                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  🔄 ANTI-REBOND                                                      │
│  ├─ Tolérance: [2] minutes                                           │
│  └─ Effet: Ignore badges < 2 min                                     │
│                                                                      │
│  ☕ PAUSES IMPLICITES                                                │
│  ├─ [✓] Activé                                                       │
│  ├─ Durée min: [30] minutes                                          │
│  ├─ Durée max: [120] minutes                                         │
│  └─ Effet: OUT→IN dans 30-120 min = pause (pas d'anomalie)           │
│                                                                      │
│  🔌 CLÔTURE AUTOMATIQUE                                              │
│  ├─ [✓] Activé                                                       │
│  ├─ Heure défaut: [23:59]                                            │
│  │                                                                   │
│  │  ⚠️ PROTECTION HEURES SUPPLÉMENTAIRES                             │
│  │  ├─ [✓] Vérifier overtime approuvé                                │
│  │  │   └─ Si APPROVED: OUT = fin shift + heures sup                 │
│  │  │   └─ Si PENDING: Marque AUTO_CLOSED_CHECK_OVERTIME             │
│  │  └─ Buffer: [0] minutes après fin shift                           │
│  │                                                                   │
│  └─ Effet: Crée OUT auto pour badges oubliés (préserve heures sup)   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

*Document mis à jour le 2026-01-07 - Ajout protection heures supplémentaires*
