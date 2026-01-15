# Analyse des Risques - Détection Automatique IN/OUT

## Contexte Actuel

**Logique implémentée** : Alternance simple basée sur le comptage
- 0 pointage existant → IN
- 1 pointage existant → OUT
- 2 pointages existants → IN
- etc.

---

## 1. Badge Multiple par Erreur (Double Badge)

### Scénario
Un employé stressé badge 2 fois rapidement à l'entrée (< 30 secondes d'écart).

### Impact avec logique actuelle
```
08:00:01 → IN  (correct)
08:00:03 → OUT (FAUX ! créé un OUT fantôme)
```
**Résultat** : Session de 2 secondes, heures travaillées = 0, anomalie EARLY_LEAVE.

### Solutions Professionnelles

#### Solution A : Anti-rebond (Debounce) - RECOMMANDÉ
```typescript
// Ignorer les pointages < X minutes du précédent pour le même type potentiel
const DEBOUNCE_MINUTES = 2;

// Dans le script de sync ou le webhook
const lastPunch = await getLastPunchForEmployee(employeeId, date);
if (lastPunch) {
  const diffMinutes = (newPunchTime - lastPunch.timestamp) / 60000;
  if (diffMinutes < DEBOUNCE_MINUTES) {
    log(`⚠️ Badge ignoré (debounce): ${diffMinutes.toFixed(1)} min depuis le dernier`);
    return { ignored: true, reason: 'DEBOUNCE' };
  }
}
```

#### Solution B : Validation côté terminal ZKTeco
- Configurer le terminal pour refuser les badges < 60s d'intervalle
- Option "Anti-passback" dans les paramètres ZKTeco

#### Recommandation
**Implémenter Solution A** avec paramètre configurable par tenant (2-5 minutes par défaut).

---

## 2. Pause Déjeuner Non Planifiée

### Scénario
Un employé sort déjeuner sans que ce soit planifié dans son shift.

```
08:00 → IN
12:00 → OUT (pause déjeuner)
13:00 → IN  (retour)
17:00 → OUT (fin de journée)
```

### Impact avec logique actuelle
✅ **Fonctionne correctement** - L'alternance IN/OUT/IN/OUT est respectée.

### Problème potentiel
Si le shift ne prévoit pas de pause, le système pourrait créer des anomalies inutiles.

### Solutions Professionnelles

#### Solution A : Tolérance pause implicite
```typescript
// Si OUT suivi de IN dans un délai raisonnable (30min - 2h), considérer comme pause
const isLikelyBreak = (outTime, inTime) => {
  const diffMinutes = (inTime - outTime) / 60000;
  return diffMinutes >= 30 && diffMinutes <= 120;
};

// Ne pas créer d'anomalie pour les pauses implicites
if (isLikelyBreak(previousOut, currentIn)) {
  anomalyType = null; // Pas ABSENCE_PARTIAL
}
```

#### Solution B : Configuration "Pause libre"
Ajouter un flag au niveau du shift ou tenant :
```prisma
model Shift {
  // ...
  allowImplicitBreaks Boolean @default(true)
  maxBreakDuration    Int     @default(120) // minutes
}
```

#### Recommandation
**Implémenter Solution A** comme comportement par défaut, avec **Solution B** pour personnalisation.

---

## 3. Badge Oublié à la Sortie → Badge le Lendemain

### Scénario
```
Jour 1 - 08:00 → IN
Jour 1 - (oubli de badge OUT)
Jour 2 - 08:00 → IN (nouveau jour)
```

### Impact avec logique actuelle
```
Jour 1: 1 pointage (IN) → MISSING_OUT détecté ✅
Jour 2: 0 pointage → IN ✅
```
✅ **Fonctionne correctement** car le comptage est PAR JOUR.

### Problème réel
Le Jour 1 reste avec une session ouverte et une anomalie MISSING_OUT non résolue.

### Solutions Professionnelles

#### Solution A : Job de clôture automatique (déjà partiellement implémenté)
```typescript
// Cron job à minuit ou 2h du matin
async function closeOpenSessions() {
  const openSessions = await findSessionsWithoutOUT(yesterday);

  for (const session of openSessions) {
    // Option 1: Créer un OUT automatique à l'heure de fin de shift
    // Option 2: Créer un OUT automatique à 23:59:59
    // Option 3: Marquer comme "à corriger manuellement"

    await createAutoOUT(session, {
      timestamp: session.shift?.endTime || '23:59:59',
      method: 'AUTO_CORRECTION',
      note: 'OUT automatique - badge oublié'
    });
  }
}
```

#### Solution B : Notification proactive
Envoyer une notification au manager/employé si une session est ouverte depuis > X heures.

#### Solution C : Interface de correction rapide
Dashboard avec liste des sessions ouvertes et bouton "Clôturer" en un clic.

#### Recommandation
**Combiner les 3 solutions** :
1. Notification après 2h de dépassement du shift
2. Job de clôture automatique à 2h du matin
3. Interface de correction pour cas particuliers

---

## 4. Travail de Nuit (Shift Chevauchant 2 Jours)

### Scénario
```
Shift nuit: 22:00 - 06:00
Jour 1 - 22:00 → IN
Jour 2 - 06:00 → OUT
```

### Impact avec logique actuelle
```
Jour 1: 1 pointage (22:00 IN) → count=1
Jour 2: 0 pointage → 06:00 détecté comme IN (FAUX!)
```
❌ **PROBLÈME CRITIQUE** - Le OUT du lendemain est interprété comme IN.

### Solutions Professionnelles

#### Solution A : Détection de shift de nuit - RECOMMANDÉ
```typescript
async function determineInOutType(employeeId, punchTime, tenantId) {
  const count = await getPunchCountForDay(employeeId, punchTime);

  // Vérifier si c'est un shift de nuit avec session ouverte la veille
  const yesterday = subDays(punchTime, 1);
  const openSessionYesterday = await findOpenSession(employeeId, yesterday);

  if (openSessionYesterday && isNightShift(openSessionYesterday.shift)) {
    // C'est probablement le OUT du shift de nuit
    const hoursSinceIN = (punchTime - openSessionYesterday.inTime) / 3600000;
    if (hoursSinceIN < 14) { // Max 14h de travail
      return 'OUT'; // Forcer OUT pour clôturer la session de nuit
    }
  }

  // Logique normale d'alternance
  return count % 2 === 0 ? 'IN' : 'OUT';
}
```

#### Solution B : Fenêtre de 24h glissante
Au lieu de compter par jour calendaire, utiliser une fenêtre de 24h depuis le dernier IN.

```typescript
async function getPunchCountSince(employeeId, sinceTime) {
  return await prisma.attendance.count({
    where: {
      employeeId,
      timestamp: { gte: sinceTime }
    }
  });
}

// Utiliser le dernier IN comme référence
const lastIN = await getLastINPunch(employeeId);
if (lastIN && !hasMatchingOUT(lastIN)) {
  return 'OUT'; // Session ouverte, donc c'est un OUT
}
return 'IN'; // Nouvelle session
```

#### Solution C : Flag "Shift de nuit" explicite
```prisma
model Shift {
  // ...
  isNightShift Boolean @default(false)
  // Si true, la détection IN/OUT traverse minuit
}
```

#### Recommandation
**Implémenter Solution A + C** : Détection intelligente pour les shifts marqués comme "nuit".

---

## 5. Astreintes ou Interventions Courtes

### Scénario
Un employé en astreinte fait une intervention de 30 minutes à 3h du matin.

```
03:00 → IN
03:30 → OUT
```

### Impact avec logique actuelle
✅ **Fonctionne correctement** - IN puis OUT.

### Problème potentiel
- Peut être confondu avec un shift de nuit
- Peut créer des anomalies si pas de planning d'astreinte

### Solutions Professionnelles

#### Solution A : Type de pointage "INTERVENTION"
```typescript
enum AttendanceType {
  IN
  OUT
  INTERVENTION_START
  INTERVENTION_END
}

// Sur le terminal, l'employé peut choisir le mode "Intervention"
```

#### Solution B : Plage horaire d'astreinte
```prisma
model OnCallSchedule {
  id          String   @id @default(uuid())
  employeeId  String
  startDate   DateTime
  endDate     DateTime
  // Pointages dans cette plage = interventions
}
```

#### Solution C : Détection automatique par durée
```typescript
// Si pointage IN+OUT < 2h et hors shift normal → Intervention
const sessionDuration = outTime - inTime;
if (sessionDuration < 2 * 60 * 60 * 1000 && !isWithinNormalShift(inTime)) {
  markAsIntervention(session);
}
```

#### Recommandation
**Solution B** pour les entreprises avec astreintes formalisées, **Solution C** en fallback.

---

## 6. NOUVEAU RISQUE : Panne/Redémarrage du Sync

### Scénario
Le script de sync s'arrête pendant 2h, puis redémarre et envoie tous les pointages d'un coup.

### Impact
Les pointages arrivent dans le désordre ou avec des counts incorrects.

### Solution
```typescript
// Toujours traiter les pointages dans l'ordre chronologique
const punches = sortBy(newPunches, 'recordTime');

// Pour chaque punch, recalculer le count APRÈS avoir envoyé le précédent
for (const punch of punches) {
  const count = await getPunchCountForDay(punch.employeeId, punch.date);
  const type = count % 2 === 0 ? 'IN' : 'OUT';
  await sendPunch({ ...punch, type });
  // Le count sera +1 pour le prochain punch du même employé/jour
}
```

---

## Résumé des Solutions à Implémenter

### Priorité HAUTE (à faire maintenant)

| Risque | Solution | Effort |
|--------|----------|--------|
| Double badge | Anti-rebond 2 min | 2h |
| Shift de nuit | Détection session ouverte veille | 4h |
| Badge oublié | Job de clôture automatique | 3h |

### Priorité MOYENNE (phase 2)

| Risque | Solution | Effort |
|--------|----------|--------|
| Pause déjeuner | Tolérance pause implicite | 2h |
| Notifications | Alertes session ouverte > 2h | 3h |

### Priorité BASSE (phase 3)

| Risque | Solution | Effort |
|--------|----------|--------|
| Astreintes | Plages horaires d'astreinte | 4h |
| Interventions | Type INTERVENTION | 2h |

---

## Architecture Recommandée Finale

```
┌─────────────────────────────────────────────────────────────────┐
│                     DÉTECTION IN/OUT                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. ANTI-REBOND (2 min)                                        │
│     └── Si < 2 min depuis dernier pointage → IGNORER           │
│                                                                 │
│  2. DÉTECTION SHIFT DE NUIT                                    │
│     └── Si session ouverte hier + shift nuit → OUT             │
│                                                                 │
│  3. COMPTAGE JOURNALIER                                        │
│     └── Count pair → IN, Count impair → OUT                    │
│                                                                 │
│  4. POST-TRAITEMENT                                            │
│     └── Job nocturne: clôture sessions orphelines              │
│     └── Notifications: sessions > 2h après fin shift           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Prochaine Étape

Voulez-vous que j'implémente les solutions de **Priorité HAUTE** ?
1. Anti-rebond (debounce) dans le webhook
2. Détection shift de nuit dans getPunchCountForDay
3. Job de clôture automatique des sessions orphelines
