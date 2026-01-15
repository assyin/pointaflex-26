# Rapport de Cohérence - Détection IN/OUT Automatique

## Analyse Comparative : Recommandations vs Système Existant

---

## 1. ANTI-REBOND (Double Badge)

### Votre Recommandation
> Tout pointage survenant moins de 2 minutes après le précédent est ignoré.
> Ce délai est configurable par entreprise.

### Ce qui existe déjà dans TenantSettings
```prisma
doublePunchToleranceMinutes  Int @default(2)  // Tolérance pour erreurs de badgeage
```

### Implémentation actuelle
✅ **Implémenté** avec valeur hardcodée `DEBOUNCE_MINUTES = 2`

### Action requise pour cohérence
⚠️ **Utiliser le paramètre TenantSettings au lieu de la constante hardcodée**

```typescript
// attendance.service.ts - À MODIFIER
const settings = await this.prisma.tenantSettings.findUnique({
  where: { tenantId },
  select: { doublePunchToleranceMinutes: true },
});
const DEBOUNCE_MINUTES = settings?.doublePunchToleranceMinutes || 2;
```

---

## 2. DÉTECTION SHIFT DE NUIT

### Votre Recommandation
> Si un employé a une session ouverte la veille ET que son planning est marqué comme shift de nuit

### Ce qui existe déjà

#### Dans le modèle Shift
```prisma
model Shift {
  isNightShift    Boolean @default(false)  // FLAG EXPLICITE
}
```

#### Dans TenantSettings
```prisma
nightShiftStart  String @default("21:00")  // Début période nuit
nightShiftEnd    String @default("06:00")  // Fin période nuit
```

### Implémentation actuelle
⚠️ **Partiellement implémenté** - Utilise un seuil fixe de 10h au lieu des paramètres

### Actions requises pour cohérence

1. **Utiliser `nightShiftEnd` de TenantSettings** au lieu de `NIGHT_SHIFT_MORNING_THRESHOLD = 10`

2. **Vérifier le flag `Shift.isNightShift`** en plus de l'heure

```typescript
// getPunchCountForDay - À AMÉLIORER
const settings = await this.prisma.tenantSettings.findUnique({
  where: { tenantId },
  select: { nightShiftEnd: true },
});

const nightEndTime = this.parseTimeString(settings?.nightShiftEnd || '06:00');
const NIGHT_SHIFT_MORNING_THRESHOLD = nightEndTime.hours + 4; // Marge de 4h

// Vérifier aussi le flag isNightShift sur le shift de la veille
const lastInYesterday = await this.prisma.attendance.findFirst({
  where: { ... },
  include: {
    employee: {
      include: { currentShift: { select: { isNightShift: true } } }
    }
  }
});

if (lastInYesterday?.employee?.currentShift?.isNightShift) {
  // Forcer OUT
}
```

---

## 3. PAUSES IMPLICITES (Déjeuner)

### Votre Recommandation
> Un OUT suivi d'un IN dans un délai raisonnable (30 à 120 minutes) est considéré comme pause implicite

### Ce qui existe déjà
```prisma
breakDuration            Int @default(60)     // Durée pause en minutes
absencePartialThreshold  Decimal @default(2)  // Seuil absence partielle (heures)
```

### Implémentation actuelle
❌ **Non implémenté** - Les pauses créent des anomalies ABSENCE_PARTIAL

### Action requise
Ajouter un nouveau paramètre dans TenantSettings :

```prisma
// À ajouter dans schema.prisma
allowImplicitBreaks      Boolean @default(true)
maxImplicitBreakMinutes  Int @default(120)
```

Et modifier la détection d'anomalies pour tolérer les pauses.

---

## 4. OUBLI DE BADGE - CLÔTURE AUTOMATIQUE

### Votre Recommandation
> La nuit, le système ferme les sessions ouvertes à l'heure de fin du shift ou à 23:59

### Ce qui existe déjà
```prisma
missingOutDetectionTime              String @default("00:00")  // Heure du job batch
missingOutDetectionWindowMinutes     Int @default(120)         // Fenêtre de détection
orphanInThreshold                    Decimal @default(12)      // Seuil session orpheline
```

### Implémentation actuelle
✅ **Implémenté** via `auto-close-sessions.job.ts` (exécution à 2h00)

### Actions requises pour cohérence

1. **Utiliser le paramètre existant** `missingOutDetectionTime` au lieu de hardcoder 2h00

```typescript
// Remplacer @Cron('0 2 * * *')
// Par une vérification dynamique basée sur les settings de chaque tenant
```

2. **Ajouter un flag de contrôle** dans TenantSettings :

```prisma
// À ajouter
autoCloseOrphanSessions  Boolean @default(true)
```

---

## 5. ASTREINTES ET INTERVENTIONS

### Votre Recommandation
> Si l'entreprise dispose de plannings d'astreinte, les pointages dans cette plage sont des interventions

### Ce qui existe déjà
```prisma
model Overtime {
  type  OvertimeType  // STANDARD | NIGHT | HOLIDAY | EMERGENCY
}

// Dans TenantSettings
overtimeRateEmergency  Decimal @default(1.30)  // Taux pour urgences/astreintes
```

### Implémentation actuelle
⚠️ **Type EMERGENCY existe** mais pas de modèle OnCallSchedule

### Action requise (Phase 2)
Créer un modèle pour les astreintes :

```prisma
model OnCallSchedule {
  id          String   @id @default(uuid())
  tenantId    String
  employeeId  String
  startDate   DateTime
  endDate     DateTime
  isActive    Boolean  @default(true)

  tenant      Tenant   @relation(...)
  employee    Employee @relation(...)
}
```

---

## 6. TRAÇABILITÉ

### Votre Recommandation
> Chaque pointage doit indiquer s'il a été déduit automatiquement et quelle règle a été appliquée

### Ce qui existe déjà
```prisma
model Attendance {
  rawData       Json?           // Données brutes
  anomalyNote   String?         // Note d'anomalie
}
```

### Implémentation actuelle
⚠️ **Partiellement implémenté** - `rawData` utilisé pour stocker les métadonnées

### Action requise pour cohérence
Standardiser le format de `rawData` :

```typescript
rawData: {
  // Source du pointage
  source: 'TERMINAL_ZKTECO' | 'MANUAL' | 'AUTO_CORRECTION',

  // Règle appliquée pour IN/OUT
  inOutDetection: {
    method: 'ALTERNATION' | 'NIGHT_SHIFT' | 'FORCED',
    reason: string,
    existingCount: number,
    detectedAt: string,
  },

  // Si ignoré
  ignored?: {
    reason: 'DEBOUNCE' | 'DUPLICATE',
    previousPunchTime: string,
  },

  // Si corrigé automatiquement
  autoCorrection?: {
    originalInId: string,
    generatedAt: string,
    reason: string,
  }
}
```

---

## 7. RÉSUMÉ DES MODIFICATIONS REQUISES

### Modifications Immédiates (Schema)

```prisma
// À ajouter dans TenantSettings
model TenantSettings {
  // ... existant ...

  // Anti-rebond (utiliser doublePunchToleranceMinutes existant)

  // Pauses implicites
  allowImplicitBreaks       Boolean @default(true)
  maxImplicitBreakMinutes   Int     @default(120)

  // Clôture automatique
  autoCloseOrphanSessions   Boolean @default(true)
}
```

### Modifications Code (attendance.service.ts)

| Fonction | Modification |
|----------|-------------|
| `handleWebhookFast` | Utiliser `doublePunchToleranceMinutes` de TenantSettings |
| `handleWebhook` | Idem |
| `getPunchCountForDay` | Utiliser `nightShiftEnd` et vérifier `Shift.isNightShift` |
| `detectAnomalies` | Tolérer les pauses implicites si `allowImplicitBreaks` |

### Modifications Code (auto-close-sessions.job.ts)

| Modification |
|-------------|
| Utiliser `missingOutDetectionTime` pour l'heure d'exécution |
| Vérifier `autoCloseOrphanSessions` par tenant |

---

## 8. MATRICE DE COHÉRENCE FINALE

| Règle | Setting Existant | Implémenté | Cohérent |
|-------|------------------|------------|----------|
| Anti-rebond 2min | `doublePunchToleranceMinutes` | ✅ Oui | ⚠️ À lier |
| Shift de nuit | `nightShiftStart/End`, `Shift.isNightShift` | ✅ Partiel | ⚠️ À améliorer |
| Pauses implicites | `breakDuration` | ❌ Non | ❌ À créer |
| Clôture auto | `missingOutDetectionTime` | ✅ Oui | ⚠️ À lier |
| Astreintes | `overtimeRateEmergency` | ❌ Partiel | ⏳ Phase 2 |
| Traçabilité | `rawData`, `anomalyNote` | ⚠️ Partiel | ⚠️ À standardiser |

---

## 9. INTERFACES FRONTEND À METTRE À JOUR

### Page Settings (/settings)
- Ajouter section "Détection IN/OUT automatique"
- Exposer les paramètres :
  - `doublePunchToleranceMinutes`
  - `allowImplicitBreaks` + `maxImplicitBreakMinutes`
  - `autoCloseOrphanSessions`
  - `nightShiftStart/End`

### Page Pointages (/attendance)
- Afficher le badge "AUTO" ou "DÉDUIT" sur les pointages automatiques
- Afficher la règle appliquée (tooltip)

### Page Anomalies (/anomalies)
- Nouveau type `AUTO_CLOSED` avec explication
- Filtrer par source de détection

---

## 10. CONCLUSION

Votre recommandation est **excellente et cohérente** avec l'architecture existante.

**Points forts du système existant :**
- TenantSettings très complet avec déjà les bons paramètres
- Modèle Shift avec flag `isNightShift`
- Infrastructure d'anomalies robuste
- Jobs batch pour consolidation

**Améliorations nécessaires :**
1. Lier le code aux paramètres TenantSettings existants (au lieu de hardcoder)
2. Ajouter 2-3 nouveaux paramètres pour pauses/clôture
3. Standardiser le format `rawData` pour traçabilité
4. Mettre à jour les interfaces frontend

**Estimation totale : 6-8 heures de développement**
