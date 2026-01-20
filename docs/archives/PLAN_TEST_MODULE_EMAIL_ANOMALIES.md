# 📋 Plan de Test Complet - Module Email pour Anomalies (LATE / ABSENCE_PARTIAL / ABSENCE_TECHNICAL / ABSENCE)

**Date**: 2026-01-02
**Objectif**: Créer et tester l'infrastructure complète de notifications email p

our toutes les anomalies de pointage

---

## 🎯 Vue d'Ensemble

### Statut Actuel
❌ **INFRASTRUCTURE NON EXISTANTE** - À créer de toute pièce

**Ce qui existe déjà**:
- ✅ Détection des anomalies dans `attendance.service.ts`
- ✅ Job de détection des absences (`detect-absences.job.ts`)
- ✅ Tables d'anomalies dans la base de données
- ✅ Module Email configuré et fonctionnel (testé avec MISSING_IN/OUT)

**Ce qui manque** (À créer dans ce plan):
- ❌ Templates HTML pour chaque type d'anomalie (4 templates)
- ❌ Jobs de notification pour chaque type (4 jobs)
- ❌ Tables de log de notifications dans Prisma (4 models)
- ❌ Services de notification intégrés

---

## 📊 Types d'Anomalies et Leurs Règles Métier

### 1. LATE (Retard)
**Déclenchement**: Pointage IN après l'heure prévue + tolérance

**Paramètres Tenant**:
- `lateToleranceEntry`: Tolérance en minutes (défaut: 10 minutes)
- `lateNotificationFrequencyMinutes`: Fréquence job (défaut: 15 minutes)
- `lateNotificationWindowMinutes`: Fenêtre après shift start pour notifier (défaut: 30 minutes)

**Règle**:
```
Retard en minutes = Heure réelle IN - Heure prévue IN
SI retard > lateToleranceEntry ET retard < absencePartialThreshold (en heures)
  => LATE
```

**Exemple**:
- Shift: 08:00-17:00
- Tolérance: 10 minutes
- Pointage IN: 08:25
- **Résultat**: LATE de 25 minutes

---

### 2. ABSENCE_PARTIAL (Absence Partielle)
**Déclenchement**: Pointage IN après un seuil important (retard significatif)

**Paramètres Tenant**:
- `absencePartialThreshold`: Seuil en heures (défaut: 2 heures)
- `absencePartialNotificationFrequencyMinutes`: Fréquence job (défaut: 30 minutes)

**Règle**:
```
Retard en heures = (Heure réelle IN - Heure prévue IN) / 60
SI retard >= absencePartialThreshold
  => ABSENCE_PARTIAL
```

**Exemple**:
- Shift: 08:00-17:00
- Seuil: 2 heures
- Pointage IN: 10:30
- **Résultat**: ABSENCE_PARTIAL (2.5 heures de retard)

---

### 3. ABSENCE_TECHNICAL (Absence Technique)
**Déclenchement**: Tentatives de pointage échouées sans pointage réussi

**Paramètres Tenant**:
- `enableTechnicalAbsenceDetection`: Activer/désactiver (défaut: true)
- `technicalAbsenceNotificationDelay`: Délai avant notification en heures (défaut: 24h)

**Règle**:
```
SI tentatives échouées (AttendanceAttempt.status = 'FAILED')
  ET aucun pointage réussi (Attendance) pour la journée
  ET schedule publié existe
  ET pas de congé approuvé
  => ABSENCE_TECHNICAL
```

**Exemple**:
- Shift: 08:00-17:00
- Tentative 08:05: FAILED (carte non reconnue)
- Tentative 08:10: FAILED (erreur réseau)
- Aucun pointage réussi
- **Résultat**: ABSENCE_TECHNICAL

---

### 4. ABSENCE (Absence Complète)
**Déclenchement**: Aucun pointage IN pour un schedule publié

**Paramètres Tenant**:
- `absenceDetectionTime`: Heure d'exécution (défaut: 01:00 AM)
- `workingDays`: Jours ouvrables (défaut: [1,2,3,4,5,6] = Lun-Sam)

**Règle**:
```
SI schedule publié existe
  ET aucun pointage IN pour la journée
  ET pas de congé approuvé
  ET jour ouvrable
  => ABSENCE
```

**Exemple**:
- Shift: 08:00-17:00
- Jour: Lundi (jour ouvrable)
- Aucun pointage IN de toute la journée
- Pas de congé
- **Résultat**: ABSENCE

---

## 🔧 Configuration Initiale

### Tenant de Test
Utiliser les mêmes que pour MISSING_IN/OUT:

- **Tenant ID**: 340a6c2a-160e-4f4b-917e-6eea8fd5ff2d
- **Nom**: Test Company
- **Manager**: SAID TANSIN (yassine.aitsaid@g4s-cs.com)
- **Employé**: FARID NABI (420cb50e-a6a6-46b3-8c1b-2633b95bd84d)
- **Département**: Qualité
- **Shifts**: Matin (08:00-17:00), MI JOUR (08:00-12:00), etc.

### Paramètres TenantSettings à Ajouter
```sql
UPDATE "TenantSettings"
SET
  -- LATE
  "lateToleranceEntry" = 10,
  "lateNotificationFrequencyMinutes" = 15,
  "lateNotificationWindowMinutes" = 30,

  -- ABSENCE_PARTIAL
  "absencePartialThreshold" = 2,
  "absencePartialNotificationFrequencyMinutes" = 30,

  -- ABSENCE_TECHNICAL
  "enableTechnicalAbsenceDetection" = true,
  "technicalAbsenceNotificationDelay" = 24,

  -- ABSENCE
  "absenceDetectionTime" = '01:00',
  "workingDays" = '{1,2,3,4,5,6}'
WHERE "tenantId" = '340a6c2a-160e-4f4b-917e-6eea8fd5ff2d';
```

---

## 📝 INFRASTRUCTURE À CRÉER

### Étape 1: Modèles Prisma (schema.prisma)

```prisma
// 1. Table log LATE
model LateNotificationLog {
  id          String   @id @default(uuid())
  createdAt   DateTime @default(now())
  tenantId    String
  employeeId  String
  managerId   String
  sessionDate DateTime @db.Date
  sentAt      DateTime @default(now())
  shiftStart  String   // Heure de début prévue (HH:mm)
  actualIn    DateTime // Heure réelle du IN
  lateMinutes Int      // Minutes de retard

  tenant   Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  employee User   @relation("EmployeeLateNotifications", fields: [employeeId], references: [id], onDelete: Cascade)
  manager  User   @relation("ManagerLateNotifications", fields: [managerId], references: [id], onDelete: Cascade)

  @@unique([tenantId, employeeId, sessionDate, shiftStart])
  @@map("late_notification_logs")
}

// 2. Table log ABSENCE_PARTIAL
model AbsencePartialNotificationLog {
  id             String   @id @default(uuid())
  createdAt      DateTime @default(now())
  tenantId       String
  employeeId     String
  managerId      String
  sessionDate    DateTime @db.Date
  sentAt         DateTime @default(now())
  shiftStart     String   // Heure prévue (HH:mm)
  actualIn       DateTime // Heure réelle du IN
  absenceHours   Float    // Heures d'absence partielle

  tenant   Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  employee User   @relation("EmployeeAbsencePartialNotifications", fields: [employeeId], references: [id], onDelete: Cascade)
  manager  User   @relation("ManagerAbsencePartialNotifications", fields: [managerId], references: [id], onDelete: Cascade)

  @@unique([tenantId, employeeId, sessionDate, shiftStart])
  @@map("absence_partial_notification_logs")
}

// 3. Table log ABSENCE_TECHNICAL
model AbsenceTechnicalNotificationLog {
  id                String   @id @default(uuid())
  createdAt         DateTime @default(now())
  tenantId          String
  employeeId        String
  managerId         String
  sessionDate       DateTime @db.Date
  sentAt            DateTime @default(now())
  shiftStart        String   // Heure prévue (HH:mm)
  failedAttemptsCount Int    // Nombre de tentatives échouées

  tenant   Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  employee User   @relation("EmployeeAbsenceTechnicalNotifications", fields: [employeeId], references: [id], onDelete: Cascade)
  manager  User   @relation("ManagerAbsenceTechnicalNotifications", fields: [managerId], references: [id], onDelete: Cascade)

  @@unique([tenantId, employeeId, sessionDate, shiftStart])
  @@map("absence_technical_notification_logs")
}

// 4. Table log ABSENCE
model AbsenceNotificationLog {
  id          String   @id @default(uuid())
  createdAt   DateTime @default(now())
  tenantId    String
  employeeId  String
  managerId   String
  sessionDate DateTime @db.Date
  sentAt      DateTime @default(now())
  shiftStart  String   // Heure prévue (HH:mm)

  tenant   Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  employee User   @relation("EmployeeAbsenceNotifications", fields: [employeeId], references: [id], onDelete: Cascade)
  manager  User   @relation("ManagerAbsenceNotifications", fields: [managerId], references: [id], onDelete: Cascade)

  @@unique([tenantId, employeeId, sessionDate, shiftStart])
  @@map("absence_notification_logs")
}
```

### Étape 2: Templates HTML à Créer

**Fichiers à créer**:
1. `src/modules/mail/templates/late-notification.html`
2. `src/modules/mail/templates/absence-partial-notification.html`
3. `src/modules/mail/templates/absence-technical-notification.html`
4. `src/modules/mail/templates/absence-notification.html`

**Structure de chaque template** (exemple pour LATE):
```html
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Retard détecté</title>
    <style>
        /* Style similaire à missing-in-notification.html */
        /* Couleur: Orange pour LATE */
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⏰ Retard détecté</h1>
            <span class="alert-badge">INFORMATION</span>
        </div>

        <div class="greeting">
            Bonjour <strong>{{managerName}}</strong>,
        </div>

        <div class="info-box">
            <strong>Un retard a été enregistré pour l'employé suivant :</strong>
        </div>

        <div class="details">
            <ul>
                <li><strong>Employé :</strong> {{employeeName}}</li>
                <li><strong>Date :</strong> {{sessionDate}}</li>
                <li><strong>Heure prévue :</strong> {{shiftStart}}</li>
                <li><strong>Heure réelle :</strong> {{actualIn}}</li>
                <li><strong>Retard :</strong> {{lateMinutes}} minutes</li>
            </ul>
        </div>

        <p>Merci de prendre note de ce retard dans le cadre de la gestion des présences.</p>

        <div class="footer">
            <strong>Point important :</strong> Cette notification a été générée automatiquement.
            <em>Merci de ne pas répondre à cet email.</em>
        </div>
    </div>
</body>
</html>
```

### Étape 3: Jobs de Notification à Créer

**Fichiers à créer**:
1. `src/modules/attendance/jobs/late-manager-notification.job.ts`
2. `src/modules/attendance/jobs/absence-partial-manager-notification.job.ts`
3. `src/modules/attendance/jobs/absence-technical-manager-notification.job.ts`
4. `src/modules/attendance/jobs/absence-manager-notification.job.ts`

**Structure de chaque job** (similaire à MISSING_IN/OUT):
- Cron job configurable
- Traitement par tenant
- Récupération des anomalies depuis table Attendance
- Envoi email via MailService
- Log dans table de notification
- Idempotence (pas de duplicata)

---

## 🧪 SCÉNARIOS DE TEST - LATE

### Scénario LATE #1: Retard Simple Dans Tolérance
**Objectif**: Vérifier qu'AUCUNE notification n'est envoyée si retard < tolérance

**Paramètres**:
- Shift: 08:00-17:00
- Tolérance: 10 minutes
- Pointage IN: 08:07

**Étapes**:
1. Créer schedule shift Matin (08:00)
2. Créer pointage IN à 08:07 (7 min de retard)
3. Attendre cycle job

**Résultat attendu**:
- ❌ AUCUN email envoyé (retard dans tolérance)
- ❌ AUCUNE anomalie créée
- ❌ AUCUN log dans `late_notification_logs`

---

### Scénario LATE #2: Retard Hors Tolérance
**Objectif**: Notification envoyée pour retard > tolérance

**Paramètres**:
- Shift: 08:00-17:00
- Tolérance: 10 minutes
- Pointage IN: 08:25

**Étapes**:
1. Créer schedule shift Matin
2. Créer pointage IN à 08:25 (25 min de retard)
3. Vérifier anomalie détectée (hasAnomaly=true, anomalyType='LATE')
4. Attendre cycle job (08:30)

**Résultat attendu**:
- ✅ Email envoyé à manager
- ✅ Sujet: "[Pointage] Retard détecté – Information"
- ✅ Contenu: Retard de 25 minutes
- ✅ Log dans `late_notification_logs`
- ✅ Log dans `email_logs`

---

### Scénario LATE #3: Retard en Limite d'ABSENCE_PARTIAL
**Objectif**: Distinguer LATE et ABSENCE_PARTIAL

**Paramètres**:
- Shift: 08:00-17:00
- Tolérance: 10 minutes
- Seuil ABSENCE_PARTIAL: 2 heures
- Pointage IN: 09:50 (1h50 de retard)

**Étapes**:
1. Créer schedule shift Matin
2. Créer pointage IN à 09:50
3. Vérifier anomalyType

**Résultat attendu**:
- ✅ Anomalie = 'LATE' (pas 'ABSENCE_PARTIAL')
- ✅ Email LATE envoyé
- ✅ Retard: 110 minutes

---

### Scénario LATE #4: Multiple Retards Même Jour
**Objectif**: Tester employee avec multiple shifts dans la journée

**Paramètres**:
- Shift 1: 08:00-12:00 (MI JOUR)
- Shift 2: 14:00-18:00 (MI SOIR)
- Pointage IN shift 1: 08:20 (retard 20 min)
- Pointage IN shift 2: 14:35 (retard 35 min)

**Étapes**:
1. Créer 2 schedules
2. Créer 2 pointages IN en retard
3. Attendre cycles jobs

**Résultat attendu**:
- ✅ 2 emails envoyés (un par shift)
- ✅ 2 logs dans `late_notification_logs`

---

### Scénario LATE #5: Idempotence
**Objectif**: Pas de duplicata

**Étapes**:
1. Créer retard (comme Scénario #2)
2. Déclencher job 3 fois

**Résultat attendu**:
- ✅ 1 seul email
- ✅ 1 seul log

---

## 🧪 SCÉNARIOS DE TEST - ABSENCE_PARTIAL

### Scénario ABSENCE_PARTIAL #1: Retard >= 2 Heures
**Objectif**: Notification pour retard significatif

**Paramètres**:
- Shift: 08:00-17:00
- Seuil: 2 heures
- Pointage IN: 10:30 (2h30 de retard)

**Étapes**:
1. Créer schedule shift Matin
2. Créer pointage IN à 10:30
3. Vérifier anomaly détectée

**Résultat attendu**:
- ✅ Anomalie = 'ABSENCE_PARTIAL'
- ✅ Email envoyé
- ✅ Sujet: "[Pointage] Absence partielle détectée – Action requise"
- ✅ Contenu: "2.5 heures d'absence partielle"
- ✅ Log dans `absence_partial_notification_logs`

---

### Scénario ABSENCE_PARTIAL #2: Juste à la Limite (Edge Case)
**Objectif**: Tester seuil exact

**Paramètres**:
- Shift: 08:00-17:00
- Seuil: 2 heures
- Pointage IN: 10:00 (exactement 2h)

**Résultat attendu**:
- ✅ Anomalie = 'ABSENCE_PARTIAL'
- ✅ Email envoyé

---

### Scénario ABSENCE_PARTIAL #3: Retard Très Long (4h+)
**Objectif**: Cas de retard extrême

**Paramètres**:
- Shift: 08:00-17:00
- Pointage IN: 12:30 (4h30 de retard)

**Résultat attendu**:
- ✅ Anomalie = 'ABSENCE_PARTIAL'
- ✅ Email avec "4.5 heures d'absence partielle"

---

### Scénario ABSENCE_PARTIAL #4: Avec Congé Partiel
**Objectif**: Vérifier exclusion si congé matin

**Paramètres**:
- Shift: 08:00-17:00
- Congé matin approuvé (08:00-12:00)
- Pointage IN: 12:15

**Résultat attendu**:
- ❌ AUCUNE notification (congé partiel)

---

### Scénario ABSENCE_PARTIAL #5: Idempotence
**Objectif**: Pas de duplicata

**Résultat attendu**:
- ✅ 1 seul email par shift

---

## 🧪 SCÉNARIOS DE TEST - ABSENCE_TECHNICAL

### Scénario ABSENCE_TECHNICAL #1: Tentatives Échouées Sans Succès
**Objectif**: Notification après tentatives de pointage échouées

**Paramètres**:
- Shift: 08:00-17:00
- Tentative 08:05: FAILED (carte non reconnue)
- Tentative 08:10: FAILED (erreur lecteur)
- Tentative 08:15: FAILED (timeout réseau)
- Aucun pointage réussi

**Étapes**:
1. Créer schedule shift Matin
2. Créer 3 AttendanceAttempt avec status='FAILED'
3. NE PAS créer de pointage Attendance réussi
4. Attendre job de détection (1h du matin lendemain)

**Résultat attendu**:
- ✅ Anomalie = 'ABSENCE_TECHNICAL' créée
- ✅ Email envoyé au manager
- ✅ Sujet: "[Pointage] Absence technique détectée – Urgence"
- ✅ Contenu: "3 tentatives échouées, aucun pointage réussi"
- ✅ Log dans `absence_technical_notification_logs`

---

### Scénario ABSENCE_TECHNICAL #2: Tentatives Échouées PUIS Succès
**Objectif**: Pas de notification si finalement réussi

**Paramètres**:
- Tentative 08:05: FAILED
- Tentative 08:10: FAILED
- Tentative 08:15: SUCCESS (Attendance créé)

**Résultat attendu**:
- ❌ AUCUNE notification ABSENCE_TECHNICAL
- ⚠️ Potentielle notification LATE si 08:15 > tolérance

---

### Scénario ABSENCE_TECHNICAL #3: Erreur Lecteur Biométrique
**Objectif**: Cas réel d'erreur matérielle

**Paramètres**:
- Device: Lecteur empreinte digitale défaillant
- Multiples tentatives avec error="BIOMETRIC_READ_FAILED"

**Résultat attendu**:
- ✅ Email avec détails techniques
- ✅ Permettre identification du matériel défaillant

---

### Scénario ABSENCE_TECHNICAL #4: Avec Congé
**Objectif**: Pas de notification si congé

**Paramètres**:
- Congé approuvé pour la journée
- Tentatives échouées (erreur système)

**Résultat attendu**:
- ❌ AUCUNE notification

---

### Scénario ABSENCE_TECHNICAL #5: Idempotence
**Résultat attendu**:
- ✅ 1 seul email

---

## 🧪 SCÉNARIOS DE TEST - ABSENCE

### Scénario ABSENCE #1: Absence Complète Jour Ouvrable
**Objectif**: Notification pour absence totale

**Paramètres**:
- Shift: 08:00-17:00
- Jour: Lundi (jour ouvrable)
- Aucun pointage IN
- Aucun pointage OUT
- Pas de congé

**Étapes**:
1. Créer schedule shift Matin pour hier
2. NE créer AUCUN pointage
3. Attendre job de détection (1h du matin)

**Résultat attendu**:
- ✅ Anomalie = 'ABSENCE' créée (attendance virtuel)
- ✅ Email envoyé au manager
- ✅ Sujet: "[Pointage] Absence complète détectée – Action urgente"
- ✅ Contenu: "Aucun pointage enregistré pour la journée"
- ✅ Log dans `absence_notification_logs`
- ✅ hasAnomaly=true, isGenerated=true, generatedBy='ABSENCE_DETECTION_JOB'

---

### Scénario ABSENCE #2: Absence avec Congé Approuvé
**Objectif**: Pas de notification si congé

**Paramètres**:
- Schedule shift Matin
- Congé approuvé pour la journée
- Aucun pointage

**Résultat attendu**:
- ❌ AUCUNE notification
- ❌ AUCUNE anomalie créée

---

### Scénario ABSENCE #3: Weekend (Jour Non Ouvrable)
**Objectif**: Pas de notification weekend

**Paramètres**:
- Jour: Dimanche
- workingDays = [1,2,3,4,5,6] (pas le 7=dimanche)
- Schedule existe
- Aucun pointage

**Résultat attendu**:
- ❌ AUCUNE notification
- ⚠️ Sauf si schedule spécifique publié

---

### Scénario ABSENCE #4: Employee Inactif
**Objectif**: Pas de notification si employee.isActive=false

**Paramètres**:
- Employee.isActive = false
- Schedule publié
- Aucun pointage

**Résultat attendu**:
- ❌ AUCUNE notification

---

### Scénario ABSENCE #5: Multiple Absences Consécutives
**Objectif**: Notification chaque jour

**Paramètres**:
- Lundi: Absence
- Mardi: Absence
- Mercredi: Absence

**Résultat attendu**:
- ✅ 3 emails (un par jour)
- ✅ 3 logs distincts

---

### Scénario ABSENCE #6: Idempotence
**Objectif**: Pas de duplicata si job re-run

**Résultat attendu**:
- ✅ 1 seul email par jour

---

## 📊 Méthodes de Vérification

### Vérifier Anomalies Détectées
```sql
-- Vérifier LATE
SELECT * FROM "Attendance"
WHERE "tenantId" = '340a6c2a-160e-4f4b-917e-6eea8fd5ff2d'
AND "hasAnomaly" = true
AND "anomalyType" = 'LATE'
AND DATE("timestamp") = CURRENT_DATE
ORDER BY "timestamp" DESC;

-- Vérifier ABSENCE_PARTIAL
SELECT * FROM "Attendance"
WHERE "anomalyType" = 'ABSENCE_PARTIAL'
AND DATE("timestamp") = CURRENT_DATE;

-- Vérifier ABSENCE_TECHNICAL
SELECT * FROM "Attendance"
WHERE "anomalyType" = 'ABSENCE_TECHNICAL'
AND DATE("timestamp") = CURRENT_DATE;

-- Vérifier ABSENCE (avec isGenerated=true)
SELECT * FROM "Attendance"
WHERE "anomalyType" = 'ABSENCE'
AND "isGenerated" = true
AND DATE("timestamp") = CURRENT_DATE;
```

### Vérifier Logs de Notifications
```sql
-- LATE
SELECT * FROM late_notification_logs
WHERE "tenantId" = '340a6c2a-160e-4f4b-917e-6eea8fd5ff2d'
ORDER BY "sentAt" DESC;

-- ABSENCE_PARTIAL
SELECT * FROM absence_partial_notification_logs
WHERE "tenantId" = '340a6c2a-160e-4f4b-917e-6eea8fd5ff2d'
ORDER BY "sentAt" DESC;

-- ABSENCE_TECHNICAL
SELECT * FROM absence_technical_notification_logs
WHERE "tenantId" = '340a6c2a-160e-4f4b-917e-6eea8fd5ff2d'
ORDER BY "sentAt" DESC;

-- ABSENCE
SELECT * FROM absence_notification_logs
WHERE "tenantId" = '340a6c2a-160e-4f4b-917e-6eea8fd5ff2d'
ORDER BY "sentAt" DESC;
```

### Vérifier Emails Envoyés
```sql
SELECT
  type,
  subject,
  "sentAt",
  status,
  u1."firstName" || ' ' || u1."lastName" as employee,
  u2."firstName" || ' ' || u2."lastName" as manager
FROM email_logs el
LEFT JOIN "User" u1 ON u1.id = el."employeeId"
LEFT JOIN "User" u2 ON u2.id = el."managerId"
WHERE el."tenantId" = '340a6c2a-160e-4f4b-917e-6eea8fd5ff2d'
AND el.type IN ('LATE', 'ABSENCE_PARTIAL', 'ABSENCE_TECHNICAL', 'ABSENCE')
ORDER BY el."sentAt" DESC
LIMIT 20;
```

---

## ✅ Checklist Globale d'Implémentation

### Phase 1: Infrastructure Base de Données
- [ ] Ajouter 4 modèles Prisma (notification logs)
- [ ] Ajouter relations dans model User
- [ ] Ajouter relations dans model Tenant
- [ ] Exécuter migration: `npx prisma migrate dev --name add_anomaly_notification_logs`
- [ ] Vérifier tables créées

### Phase 2: Templates HTML
- [ ] Créer `late-notification.html`
- [ ] Créer `absence-partial-notification.html`
- [ ] Créer `absence-technical-notification.html`
- [ ] Créer `absence-notification.html`
- [ ] Tester rendu dans navigateur
- [ ] Vérifier variables remplaçables {{variable}}

### Phase 3: Jobs de Notification
- [ ] Créer `late-manager-notification.job.ts`
- [ ] Créer `absence-partial-manager-notification.job.ts`
- [ ] Créer `absence-technical-manager-notification.job.ts`
- [ ] Créer `absence-manager-notification.job.ts`
- [ ] Enregistrer jobs dans `attendance.module.ts`
- [ ] Configurer cron expressions

### Phase 4: Configuration TenantSettings
- [ ] Ajouter nouveaux champs dans schema.prisma
- [ ] Ajouter dans DTO update-tenant-settings.dto.ts
- [ ] Mettre à jour interface frontend
- [ ] Migrer base de données

### Phase 5: Tests - LATE
- [ ] Test #1: Retard dans tolérance
- [ ] Test #2: Retard hors tolérance
- [ ] Test #3: Limite ABSENCE_PARTIAL
- [ ] Test #4: Multiple shifts
- [ ] Test #5: Idempotence

### Phase 6: Tests - ABSENCE_PARTIAL
- [ ] Test #1: Retard >= 2h
- [ ] Test #2: Limite exacte
- [ ] Test #3: Retard extrême 4h+
- [ ] Test #4: Avec congé partiel
- [ ] Test #5: Idempotence

### Phase 7: Tests - ABSENCE_TECHNICAL
- [ ] Test #1: Tentatives échouées
- [ ] Test #2: Tentatives puis succès
- [ ] Test #3: Erreur matérielle
- [ ] Test #4: Avec congé
- [ ] Test #5: Idempotence

### Phase 8: Tests - ABSENCE
- [ ] Test #1: Absence complète
- [ ] Test #2: Avec congé
- [ ] Test #3: Weekend
- [ ] Test #4: Employee inactif
- [ ] Test #5: Absences multiples
- [ ] Test #6: Idempotence

### Phase 9: Validation Finale
- [ ] Tous les emails reçus
- [ ] Tous les logs corrects
- [ ] Pas d'erreurs backend
- [ ] Templates bien formatés
- [ ] Performance acceptable
- [ ] Documentation à jour

---

## 📅 Estimation de Durée

| Phase | Tâche | Durée Estimée |
|-------|-------|---------------|
| 1 | Prisma models + migration | 30 min |
| 2 | 4 templates HTML | 1h |
| 3 | 4 jobs de notification | 3h |
| 4 | Config TenantSettings | 30 min |
| 5-8 | Tests (4 types × 5 scénarios) | 4h |
| 9 | Validation finale | 30 min |
| **TOTAL** | | **~9h30** |

---

## 🚨 Points Critiques

### Attention Particulière
1. **Timezone**: Utiliser Date.UTC() partout (leçon de MISSING_IN/OUT)
2. **Idempotence**: Contraintes uniques dans Prisma
3. **Templates**: Copier automatiquement vers dist/ (postbuild script)
4. **Performance**: Optimiser requêtes SQL (indexes)
5. **Edge Cases**: Shifts de nuit, multiples shifts/jour

### Erreurs à Éviter
- ❌ Oublier de copier templates HTML vers dist/
- ❌ Utiliser setHours() au lieu de Date.UTC()
- ❌ Contrainte unique trop large (oublier shiftStart)
- ❌ Notifier pour congés approuvés
- ❌ Notifier employees inactifs

---

**Créé par**: Claude Code
**Date**: 2026-01-02
**Statut**: ✅ PRÊT POUR IMPLÉMENTATION
**Référence**: PLAN_TEST_MODULE_EMAIL_MISSING_IN_OUT.md
