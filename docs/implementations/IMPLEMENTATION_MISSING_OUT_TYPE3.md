# ✅ Implémentation Type 3 : MISSING_OUT (Entrée sans Sortie)

## 📋 Résumé

Implémentation complète des améliorations pour la détection et gestion des anomalies **MISSING_OUT** selon les spécifications et remarques validées, avec **respect strict des règles métier**.

## 🔒 Règles Métier Implémentées (Obligatoires)

### ✅ Règle 1 : Un IN ouvre une session
- **Implémenté :** Chaque IN crée une session ouverte
- **Code :** `detectMissingOutImproved()` - Gestion des sessions

### ✅ Règle 2 : Un OUT ferme une seule session
- **Implémenté :** Chaque OUT ferme uniquement la session IN la plus proche
- **Code :** Association IN/OUT par paire dans `detectMissingOutImproved()`

### ✅ Règle 3 : Une session ne traverse jamais plusieurs shifts sans validation
- **Implémenté :** Détection si session ouverte traverse plusieurs shifts (> 2h après fin du shift)
- **Code :** Vérification `hoursAfterShiftEnd > 2` dans `detectMissingOutImproved()`

### ✅ Règle 4 : BREAK ≠ OUT
- **Implémenté :** Distinction explicite entre BREAK_START/BREAK_END et OUT
- **Code :** Filtrage des événements BREAK dans `detectMissingOutImproved()`

### ✅ Règle 5 : Toute correction = audit log
- **Implémenté :** Toutes les suggestions sont stockées dans `suggestedCorrection` pour audit
- **Code :** Structure `suggestedCorrection` avec toutes les informations

---

## 🎯 Améliorations Implémentées

### ✅ 3.1 Détection en Fin de Journée (Job Batch)

**Implémentation :**
- ✅ Job batch quotidien exécuté à minuit (`DetectMissingOutJob`)
- ✅ **Fenêtre de détection basée sur fin de shift, pas date civile**
- ✅ Vérification des IN orphelins (sessions ouvertes)
- ✅ Création d'anomalie rétroactive pour chaque IN sans OUT
- ✅ Gestion des shifts de nuit (fenêtre étendue jusqu'au lendemain midi)

**Code :** `backend/src/modules/attendance/jobs/detect-missing-out.job.ts`

**Comportement :**
- Le job s'exécute chaque jour à minuit
- Analyse tous les IN de la veille
- **Calcule la fenêtre de détection basée sur la fin du shift prévu** (pas date civile)
- Crée/met à jour l'anomalie MISSING_OUT si session toujours ouverte

---

### ✅ 3.2 Gestion des Shifts de Nuit

**Implémentation :**
- ✅ Identification automatique des shifts de nuit (début >= 20h ou fin <= 8h)
- ✅ Fenêtre de détection étendue jusqu'au lendemain midi pour shifts de nuit
- ✅ Délai de détection : ne pas détecter avant X heures après la fin prévue

**Code :** `detectMissingOutImproved()` - Section "3.2 Gestion des Shifts de Nuit"

**Comportement :**
- Si shift de nuit détecté, attendre jusqu'au lendemain midi avant de détecter
- Évite les faux positifs pour les shifts qui se terminent le lendemain matin

---

### ✅ 3.3 Suggestion Automatique d'Heure de Sortie

**Implémentation :**
- ✅ **4 sources de suggestion :**
  1. **Heure prévue du planning** (confiance: 90%)
  2. **Heure moyenne historique** sur 30 derniers jours (confiance: 75%)
  3. **Heure du dernier pointage** (BREAK_END, etc.) (confiance: 60%)
  4. **Heure de fermeture du site** (confiance: 40%)
- ✅ Score de confiance pour chaque suggestion
- ✅ Recommandation automatique de la meilleure option
- ✅ **Jamais de validation automatique** - audit + validation humaine obligatoires

**Code :** `generateMissingOutTimeSuggestion()` - Méthode dédiée

**Comportement :**
- Le système compare les 4 sources et recommande la meilleure
- Toutes les suggestions sont stockées dans `suggestedCorrection.suggestions`
- La meilleure est dans `suggestedCorrection.recommended`
- **Aucune heure n'est validée automatiquement**

---

### ✅ 3.4 Gestion des Cas Légitimes

**Implémentation :**
- ✅ Détection des pointages mobile/GPS (latitude/longitude présents)
- ✅ Vérification des congés approuvés pour la journée
- ✅ **Statut PRESENCE_EXTERNE** (pas juste masquer l'anomalie)
- ✅ Paramètres configurables : `allowMissingOutForRemoteWork`, `allowMissingOutForMissions`

**Code :** `detectMissingOutImproved()` - Section "3.4 Gestion des Cas Légitimes"

**Comportement :**
- Si pointage mobile/GPS → `hasAnomaly: false`, `type: 'PRESENCE_EXTERNE'`
- Si congé approuvé → `hasAnomaly: false`, `type: 'PRESENCE_EXTERNE'`
- **Ces cas désactivent l'anomalie**, pas juste la masquent

---

### ✅ 3.5 Détection de Patterns d'Oubli

**Implémentation :**
- ✅ Analyse des MISSING_OUT sur 30 derniers jours
- ✅ Calcul du nombre de MISSING_OUT par employé
- ✅ Extraction des jours de la semaine où se produisent les MISSING_OUT
- ✅ Extraction des heures auxquelles se produisent les MISSING_OUT
- ✅ Seuil d'alerte configurable (`missingOutPatternAlertThreshold`, défaut: 3)
- ✅ **Analytics informatif uniquement** (HR Insights, pas disciplinaire)

**Code :** `analyzeMissingOutPattern()` - Méthode dédiée

**Comportement :**
- Les métriques sont calculées et affichées dans la note d'anomalie
- Si le seuil est dépassé, un avertissement est ajouté : `⚠️ Pattern d'oubli: X MISSING_OUT sur 30 jours`
- **Ces métriques sont informatives pour HR Insights, pas pour sanctions automatiques**

---

### ✅ 3.7 Gestion des Pointages Multiples (Sessions)

**Implémentation :**
- ✅ **Gestion explicite des sessions** : Un IN ouvre une session, un OUT la ferme
- ✅ Association IN/OUT par paire (session)
- ✅ Détection de OUT manquant par session
- ✅ **Distinction BREAK ≠ OUT** : Les BREAK_START/BREAK_END ne ferment pas la session

**Code :** `detectMissingOutImproved()` - Section "3.7 Gestion des Pointages Multiples"

**Comportement :**
- Chaque IN crée une session ouverte
- Chaque OUT ferme uniquement la session IN la plus proche
- Les BREAK_START/BREAK_END sont analysés mais ne ferment pas la session
- Si une session reste ouverte > fenêtre de détection → MISSING_OUT

---

### ⏭️ 3.6 Notifications Proactives

**Statut :** À implémenter dans un **job séparé** (similaire au job de détection)

**Raison :**
- Nécessite un job cron qui s'exécute périodiquement
- Vérifie les employés avec session ouverte qui n'ont pas pointé OUT après l'heure prévue
- Envoie des rappels progressifs (max 2 par jour)
- Désactive si jour non ouvrable ou congé

**Recommandation :**
- Créer un job similaire à `detect-missing-out.job.ts`
- Exécuter toutes les X minutes (ex: toutes les 15 min)
- Vérifier les sessions ouvertes après l'heure prévue de sortie
- Envoyer notification si délai dépassé (`missingOutReminderDelay`)
- Limiter à `missingOutReminderMaxPerDay` rappels par jour

**Paramètres déjà ajoutés :**
- `missingOutReminderEnabled` (défaut: true)
- `missingOutReminderDelay` (défaut: 15 min)
- `missingOutReminderBeforeClosing` (défaut: 30 min)

---

## 🔧 Paramètres Configurables Ajoutés

Tous les paramètres ont été ajoutés dans le modèle `TenantSettings` :

```prisma
// Paramètres pour amélioration MISSING_OUT
missingOutDetectionTime         String?  @default("00:00") // Heure d'exécution du job batch
missingOutDetectionWindow       Int      @default(12) // Fenêtre de détection en heures pour shifts de nuit
allowMissingOutForRemoteWork     Boolean @default(true) // Autoriser MISSING_OUT pour télétravail
allowMissingOutForMissions       Boolean @default(true) // Autoriser MISSING_OUT pour missions
missingOutReminderEnabled        Boolean @default(true) // Activer les rappels MISSING_OUT
missingOutReminderDelay           Int     @default(15) // Délai en minutes avant le rappel
missingOutReminderBeforeClosing  Int     @default(30) // Rappel X minutes avant fermeture
enableMissingOutPatternDetection Boolean @default(true) // Activer détection patterns
missingOutPatternAlertThreshold  Int     @default(3) // Seuil d'alerte patterns (30 jours)
```

---

## 📝 Modifications de Code

### Fichiers Modifiés

1. **`backend/prisma/schema.prisma`**
   - Ajout de 8 nouveaux champs dans `TenantSettings`

2. **`backend/src/modules/attendance/attendance.service.ts`**
   - Remplacement de la logique MISSING_OUT simple par `detectMissingOutImproved()`
   - Ajout de `generateMissingOutTimeSuggestion()`
   - Ajout de `analyzeMissingOutPattern()`
   - Ajout de `isNightShift()` helper

3. **`backend/src/modules/attendance/jobs/detect-missing-out.job.ts`** (NOUVEAU)
   - Job batch quotidien pour détection en fin de journée

4. **`backend/src/modules/attendance/attendance.module.ts`**
   - Ajout de `DetectMissingOutJob` dans les providers

### Méthodes Ajoutées

1. **`detectMissingOutImproved()`** - Détection améliorée avec toutes les améliorations et règles métier
2. **`generateMissingOutTimeSuggestion()`** - Génération de suggestions d'heure de sortie
3. **`analyzeMissingOutPattern()`** - Analyse des patterns d'oubli (analytics)
4. **`isNightShift()`** - Helper pour identifier les shifts de nuit

---

## 🚀 Prochaines Étapes

### 1. Appliquer la Migration Prisma

```bash
cd backend
npx prisma db push
# ou
npx prisma migrate dev --name add_missing_out_improvements
```

### 2. Régénérer le Client Prisma

```bash
cd backend
npx prisma generate
```

### 3. Redémarrer le Serveur Backend

```bash
cd backend
npm run start:dev
```

### 4. Vérifier le Job Batch

Le job `DetectMissingOutJob` s'exécutera automatiquement chaque jour à minuit. Vérifier les logs pour confirmer son exécution.

### 5. Implémenter le Job de Notifications Proactives (3.6) - Optionnel

Créer un nouveau job `missing-out-reminder.job.ts` :

```typescript
@Injectable()
export class MissingOutReminderJob {
  @Cron('*/15 * * * *') // Toutes les 15 minutes
  async sendMissingOutReminders() {
    // 1. Récupérer tous les tenants avec missingOutReminderEnabled = true
    // 2. Pour chaque tenant, récupérer les sessions ouvertes
    // 3. Vérifier si OUT manquant après l'heure prévue + missingOutReminderDelay
    // 4. Vérifier si jour ouvrable et pas de congé
    // 5. Vérifier nombre de rappels déjà envoyés aujourd'hui (max 2)
    // 6. Envoyer notification
  }
}
```

### 6. Tester l'Implémentation

**Scénarios de test recommandés :**

1. **Test 3.1 - Job Batch :**
   - Créer un IN hier à 08:00 (sans OUT)
   - Attendre minuit (ou déclencher manuellement le job)
   - Vérifier que le système crée une anomalie MISSING_OUT

2. **Test 3.2 - Shift de Nuit :**
   - Créer un IN à 22:00 (shift de nuit 22h-6h)
   - Vérifier que le système attend jusqu'au lendemain midi avant de détecter

3. **Test 3.3 - Suggestion Heure Sortie :**
   - Créer un IN sans OUT
   - Vérifier que le système suggère 4 options avec scores de confiance

4. **Test 3.7 - Sessions Multiples :**
   - Créer IN1 → OUT1 → IN2 (sans OUT2)
   - Vérifier que le système détecte seulement MISSING_OUT pour IN2

5. **Test Règle Métier - Session traverse shifts :**
   - Créer un IN à 08:00 (shift 08h-17h)
   - Attendre > 2h après 17:00
   - Vérifier que le système détecte "session traverse plusieurs shifts"

---

## 📊 Structure des Données

### Format de `suggestedCorrection` pour MISSING_OUT

```typescript
{
  type: 'ADD_MISSING_OUT' | 'CLOSE_SESSION_MULTI_SHIFT',
  suggestions: Array<{
    source: 'PLANNING' | 'HISTORICAL_AVERAGE' | 'LAST_EVENT' | 'SITE_CLOSING',
    suggestedTime: string, // ISO date
    confidence: number, // 0-100
    description: string,
    sampleSize?: number // Si HISTORICAL_AVERAGE
  }>,
  recommended: { /* meilleure suggestion */ },
  inId: string,
  inTimestamp: string // ISO date
}
```

### Format pour Session Multi-Shift

```typescript
{
  type: 'CLOSE_SESSION_MULTI_SHIFT',
  inId: string,
  inTimestamp: string,
  expectedEndTime: string,
  confidence: number,
  reason: 'SESSION_TRAVERSES_MULTIPLE_SHIFTS'
}
```

---

## ✅ Points de Validation des Remarques

### ✅ Fenêtre de détection basée sur fin de shift, pas date civile
- **Implémenté :** Le job batch calcule la fenêtre basée sur la fin du shift prévu
- **Code :** `detect-missing-out.job.ts` - Calcul de `detectionWindowEnd` basé sur shift

### ✅ Gestion explicite des sessions
- **Implémenté :** Chaque IN ouvre une session, chaque OUT ferme une session
- **Code :** `detectMissingOutImproved()` - Gestion des `openSessions`

### ✅ Distinction claire présence / type de travail
- **Implémenté :** Statut `PRESENCE_EXTERNE` pour télétravail/mission
- **Code :** Section "3.4 Gestion des Cas Légitimes"

### ✅ Règles métier strictes respectées
- ✅ Un IN ouvre une session
- ✅ Un OUT ferme une seule session
- ✅ Une session ne traverse jamais plusieurs shifts sans validation
- ✅ BREAK ≠ OUT
- ✅ Toute correction = audit log

---

## 🎉 Résultat

L'implémentation est **complète et conforme** aux spécifications et remarques validées, avec **respect strict des règles métier**.

Le système détecte maintenant les MISSING_OUT de manière intelligente avec :

- ✅ Détection basée sur fin de shift (pas date civile)
- ✅ Gestion explicite des sessions
- ✅ Gestion des shifts de nuit
- ✅ Suggestions automatiques d'heure de sortie (4 sources)
- ✅ Gestion des cas légitimes (PRESENCE_EXTERNE)
- ✅ Détection de patterns d'oubli (analytics)
- ✅ Gestion des pointages multiples (sessions)
- ✅ Job batch quotidien pour détection rétroactive
- ✅ Paramètres configurables
- ⏭️ Notifications proactives (job séparé à implémenter)

**Prêt pour tests et déploiement !** 🚀

