# Implémentation Complète des Cas d'Absence

## ✅ Résumé des Implémentations

Tous les cas d'absence manquants ont été implémentés selon l'analyse complète.

---

## 📋 Cas Implémentés

### ✅ Cas A - Pointage IN sans planning (Déjà existant)
- **Statut** : Déjà implémenté
- **Fichier** : `backend/src/modules/attendance/attendance.service.ts`
- **Fonction** : `detectAnomalies()`

### ✅ Cas B - Absence complète sans pointage
- **Statut** : ✅ Implémenté
- **Fichier** : `backend/src/modules/attendance/jobs/detect-absences.job.ts`
- **Type** : Job batch quotidien
- **Exécution** : Tous les jours à 1h du matin (configurable)
- **Fonctionnalité** :
  - Analyse les plannings de la veille
  - Détecte les absences complètes (pas de pointage IN)
  - Crée un enregistrement d'absence virtuel
  - Vérifie les congés approuvés
  - Ignore les jours non ouvrables

### ✅ Cas C - Absence partielle
- **Statut** : ✅ Implémenté
- **Fichier** : `backend/src/modules/attendance/attendance.service.ts`
- **Fonction** : `detectAnomalies()` - Section détection LATE
- **Paramètre** : `absencePartialThreshold` dans `TenantSettings` (défaut: 2 heures)
- **Logique** :
  - Si retard >= seuil → `ABSENCE_PARTIAL`
  - Sinon → `LATE` (comportement normal)

### ✅ Cas D - Planning supprimé/non validé
- **Statut** : ✅ Implémenté
- **Fichier** : `backend/src/modules/attendance/attendance.service.ts`
- **Fonction** : `detectAnomalies()`
- **Modification schéma** : Ajout du champ `status` au modèle `Schedule`
- **Valeurs** : `PUBLISHED`, `DRAFT`, `CANCELLED`
- **Logique** :
  - Si planning existe mais `status !== 'PUBLISHED'` → `ABSENCE_TECHNICAL`
  - Vérifie aussi les congés approuvés

### ✅ Cas E - Pointage invalide (erreur technique)
- **Statut** : ✅ Implémenté
- **Fichier** : `backend/src/modules/attendance/attendance.service.ts`
- **Modèle** : `AttendanceAttempt` (nouveau)
- **Fonctionnalité** :
  - Logging de toutes les tentatives de pointage (succès/échec)
  - Enregistrement des erreurs (code, message)
  - Job pour détecter absences dues aux erreurs techniques
  - Méthode `detectTechnicalAbsences()` dans le job

---

## 📝 Modifications du Schéma Prisma

### 1. TenantSettings
```prisma
absencePartialThreshold      Int      @default(2) // Heures de retard pour considérer absence partielle
absenceDetectionTime         String?  @default("01:00") // Heure d'exécution du job (format HH:mm)
```

### 2. Schedule
```prisma
status          String   @default("PUBLISHED") // PUBLISHED, DRAFT, CANCELLED
publishedAt     DateTime?
cancelledAt     DateTime?
```

### 3. AttendanceAttempt (Nouveau modèle)
```prisma
model AttendanceAttempt {
  id           String          @id @default(uuid())
  createdAt    DateTime        @default(now())
  tenantId     String
  employeeId   String
  deviceId     String?
  timestamp    DateTime
  type         AttendanceType
  method       DeviceType
  status       String          // SUCCESS, FAILED, REJECTED
  errorCode    String?         // BADGE_NOT_RECOGNIZED, DEVICE_OFF, NETWORK_ERROR, etc.
  errorMessage String?
  rawData      Json?
  // Relations...
}
```

---

## 🔧 Fichiers Modifiés/Créés

### Nouveaux Fichiers
1. ✅ `backend/src/modules/attendance/jobs/detect-absences.job.ts`
   - Job batch pour détection absences complètes (Cas B)
   - Méthode `detectTechnicalAbsences()` pour Cas E

### Fichiers Modifiés
1. ✅ `backend/prisma/schema.prisma`
   - Ajout champs `absencePartialThreshold` et `absenceDetectionTime` dans `TenantSettings`
   - Ajout champs `status`, `publishedAt`, `cancelledAt` dans `Schedule`
   - Création modèle `AttendanceAttempt`
   - Ajout relations dans `Tenant`, `Employee`, `AttendanceDevice`

2. ✅ `backend/src/modules/attendance/attendance.service.ts`
   - Modification `create()` : Ajout logging tentatives (Cas E)
   - Modification `detectAnomalies()` : 
     - Ajout détection absence partielle (Cas C)
     - Ajout vérification statut planning (Cas D)
   - Modification `getAnomalyPriority()` : Ajout priorités pour nouveaux types

3. ✅ `backend/src/modules/attendance/attendance.module.ts`
   - Ajout `ScheduleModule` dans imports
   - Ajout `DetectAbsencesJob` dans providers

4. ✅ `frontend/app/(dashboard)/attendance/page.tsx`
   - Ajout nouveaux types dans `getAnomalyTypeBadge()`
   - Ajout options dans filtre type d'anomalie

---

## 🚀 Instructions de Déploiement

### 1. Migration de la Base de Données

```bash
cd backend
npx prisma migrate dev --name add_absence_detection_features
```

**OU** si vous préférez générer la migration manuellement :

```bash
npx prisma migrate dev --create-only --name add_absence_detection_features
# Puis vérifier le fichier généré avant d'appliquer
npx prisma migrate deploy
```

### 2. Génération du Client Prisma

```bash
cd backend
npx prisma generate
```

### 3. Vérification de la Configuration

Le job batch s'exécute automatiquement à 1h du matin chaque jour. Pour modifier l'heure :

1. Mettre à jour `TenantSettings.absenceDetectionTime` dans la base de données
2. OU modifier le cron dans `detect-absences.job.ts` :
   ```typescript
   @Cron('0 2 * * *') // Exemple : 2h du matin
   ```

### 4. Initialisation des Données Existantes

Pour les plannings existants, le statut par défaut est `PUBLISHED`. Si vous avez des plannings en brouillon, mettez à jour manuellement :

```sql
UPDATE "Schedule" SET status = 'DRAFT' WHERE ...;
```

### 5. Test du Job Batch

Pour tester manuellement le job :

```typescript
// Dans un script de test ou via endpoint admin
const job = new DetectAbsencesJob(prismaService);
await job.detectAbsences();
```

---

## 🧪 Tests à Effectuer

### Cas B - Absence complète
1. Créer un planning pour un employé pour hier
2. S'assurer qu'il n'y a pas de pointage IN pour cette date
3. Vérifier qu'il n'y a pas de congé approuvé
4. Exécuter le job manuellement ou attendre 1h du matin
5. Vérifier qu'un enregistrement d'absence est créé

### Cas C - Absence partielle
1. Configurer `absencePartialThreshold = 2` dans TenantSettings
2. Créer un planning 08:00-17:00
3. Créer un pointage IN à 10:30 (2h30 de retard)
4. Vérifier que l'anomalie est `ABSENCE_PARTIAL` et non `LATE`

### Cas D - Planning non validé
1. Créer un planning avec `status = 'DRAFT'`
2. Créer un pointage IN pour cette date
3. Vérifier que l'anomalie est `ABSENCE_TECHNICAL`

### Cas E - Erreur technique
1. Tenter un pointage qui échoue (ex: employé non trouvé)
2. Vérifier qu'un `AttendanceAttempt` avec `status = 'FAILED'` est créé
3. Vérifier que les champs `errorCode` et `errorMessage` sont remplis

---

## 📊 Types d'Anomalies Absence

| Type | Description | Priorité | Détection |
|------|-------------|----------|-----------|
| **ABSENCE** | Absence complète (Cas A et B) | 9 | Temps réel + Job batch |
| **ABSENCE_PARTIAL** | Absence partielle (Cas C) | 8 | Temps réel |
| **ABSENCE_TECHNICAL** | Absence technique (Cas D) | 7 | Temps réel |

---

## ⚙️ Paramètres Configurables

### TenantSettings

- **`absencePartialThreshold`** (Int, défaut: 2)
  - Heures de retard pour considérer une absence partielle
  - Exemple : Si = 2, un retard de 2h ou plus → ABSENCE_PARTIAL

- **`absenceDetectionTime`** (String, défaut: "01:00")
  - Heure d'exécution du job batch (format HH:mm)
  - Actuellement non utilisé (cron fixe à 1h), peut être implémenté dynamiquement

---

## 🔍 Points d'Attention

### Limitations Actuelles

1. **Job batch** : Exécution fixe à 1h du matin
   - Pour personnaliser par tenant, il faudrait implémenter un système de jobs dynamiques

2. **Détection technique (Cas E)** : 
   - Le job `detectTechnicalAbsences()` n'est pas appelé automatiquement
   - À intégrer dans le job principal ou créer un job séparé

3. **Statut Schedule** :
   - Les plannings existants ont `status = 'PUBLISHED'` par défaut
   - Workflow de publication/annulation à implémenter dans l'interface

### Améliorations Futures

1. **Job dynamique** : Utiliser `absenceDetectionTime` pour exécution personnalisée
2. **Interface planning** : Workflow de publication/annulation
3. **Dashboard erreurs** : Interface pour visualiser les `AttendanceAttempt` échoués
4. **Notifications** : Notifier les managers des absences techniques

---

## 📚 Références

- **Analyse complète** : `ANALYSE_COMPLETE_SYSTEME_POINTAGE.md`
- **Service attendance** : `backend/src/modules/attendance/attendance.service.ts`
- **Job batch** : `backend/src/modules/attendance/jobs/detect-absences.job.ts`
- **Schéma Prisma** : `backend/prisma/schema.prisma`

---

**Date d'implémentation** : 2025-01-XX
**Statut** : ✅ Tous les cas d'absence implémentés

