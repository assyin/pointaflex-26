# Explication : "En attente d'approbation" - Système de Correction de Pointage

## 📋 Vue d'Ensemble

Le message **"En attente d'approbation"** apparaît lorsqu'une **correction de pointage** nécessite une validation par un manager ou un administrateur avant d'être appliquée définitivement.

---

## 🔄 Workflow de Correction

### Étape 1 : Détection d'Anomalie
Un pointage avec anomalie est détecté (retard, absence, départ anticipé, etc.)

### Étape 2 : Correction par un Utilisateur
Un utilisateur avec la permission `attendance.correct` corrige le pointage :
- Modifie l'heure du pointage
- Ajoute une note de correction
- Le système recalcule les anomalies et métriques

### Étape 3 : Évaluation de la Nécessité d'Approbation
Le système détermine automatiquement si l'approbation est nécessaire via la fonction `requiresApproval()`.

### Étape 4 : Statut "En attente d'approbation"
Si l'approbation est nécessaire :
- `needsApproval = true`
- `approvalStatus = 'PENDING_APPROVAL'`
- Le badge "En attente d'approbation" s'affiche dans l'interface

### Étape 5 : Approbation/Rejet
Un manager/administrateur avec la permission `attendance.approve_correction` :
- **Approuve** → `approvalStatus = 'APPROVED'` → Correction appliquée
- **Rejette** → `approvalStatus = 'REJECTED'` → Correction annulée

---

## ⚙️ Critères de Déclenchement

Le message **"En attente d'approbation"** se déclenche automatiquement si **AU MOINS UN** des critères suivants est rempli :

### ✅ Critère 1 : Changement de Timestamp > 2 heures

**Condition** : La différence entre l'heure originale et l'heure corrigée est **supérieure à 2 heures**.

**Exemples** :
- ❌ **Pointage original** : 08:00
- ✅ **Pointage corrigé** : 10:30
- **Différence** : 2h30 → **Approbation requise** ✅

- ❌ **Pointage original** : 08:00
- ✅ **Pointage corrigé** : 09:30
- **Différence** : 1h30 → **Pas d'approbation** ❌

**Code** :
```typescript
const timeDiff = Math.abs(newTimestamp.getTime() - attendance.timestamp.getTime()) / (1000 * 60 * 60);
if (timeDiff > 2) {
  return true; // Approbation requise
}
```

---

### ✅ Critère 2 : Anomalie de Type ABSENCE

**Condition** : Le pointage a une anomalie de type **ABSENCE**.

**Exemples** :
- Pointage IN sans planning ni shift par défaut
- Absence complète détectée par le job batch
- Absence partielle (retard > seuil configuré)

**Code** :
```typescript
if (attendance.anomalyType === 'ABSENCE') {
  return true; // Approbation requise
}
```

---

### ✅ Critère 3 : Anomalie de Type INSUFFICIENT_REST

**Condition** : Le pointage a une anomalie de type **INSUFFICIENT_REST** (repos insuffisant entre shifts).

**Exemples** :
- Pointage IN moins de 11 heures après le dernier pointage OUT
- Violation des règles de repos légal

**Code** :
```typescript
if (attendance.anomalyType === 'INSUFFICIENT_REST') {
  return true; // Approbation requise
}
```

---

## 🚫 Cas où l'Approbation N'EST PAS Requise

### Cas 1 : Correction Mineure
- Changement de timestamp ≤ 2 heures
- Anomalie autre que ABSENCE ou INSUFFICIENT_REST (ex: LATE, EARLY_LEAVE)

### Cas 2 : Force Approval (Admin)
- L'utilisateur a utilisé le paramètre `forceApproval: true`
- Seulement pour les administrateurs avec permissions spéciales

**Code** :
```typescript
const needsApproval = correctionDto.forceApproval
  ? false  // Force l'approbation à false
  : this.requiresApproval(attendance, newTimestamp, correctionDto.correctionNote);
```

---

## 📊 États du Système d'Approbation

### 1. **PENDING_APPROVAL** (En attente d'approbation)
- **Quand** : Correction soumise, en attente de validation
- **Affichage** : Badge orange "En attente d'approbation"
- **Actions disponibles** :
  - ✅ Approuver (manager/admin)
  - ❌ Rejeter (manager/admin)

### 2. **APPROVED** (Approuvé)
- **Quand** : Correction approuvée par un manager/admin
- **Affichage** : Badge vert "Approuvé"
- **Résultat** : Correction appliquée définitivement
- **Notification** : Employé notifié de la correction

### 3. **REJECTED** (Rejeté)
- **Quand** : Correction rejetée par un manager/admin
- **Affichage** : Badge rouge "Rejeté"
- **Résultat** : Correction annulée, pointage reste dans son état original

---

## 🔔 Notifications

### Quand une Approbation est Requise
Le système envoie une notification aux managers :
- **Type** : `ATTENDANCE_APPROVAL_REQUIRED`
- **Destinataires** : Managers du département/site de l'employé
- **Contenu** : Détails de la correction en attente

### Quand une Correction est Approuvée
Le système envoie une notification à l'employé :
- **Type** : `ATTENDANCE_CORRECTED`
- **Destinataire** : L'employé concerné
- **Contenu** : Détails de la correction approuvée

---

## 💻 Interface Utilisateur

### Affichage dans la Liste des Pointages

```typescript
// Badge "En attente d'approbation"
{record.needsApproval && record.approvalStatus === 'PENDING_APPROVAL' && (
  <Badge variant="warning">
    <AlertCircle />
    En attente d'approbation
  </Badge>
)}
```

### Bouton "Approuver"
Visible uniquement pour les utilisateurs avec la permission `attendance.approve_correction` :

```typescript
{record.needsApproval && record.approvalStatus === 'PENDING_APPROVAL' && (
  <Button onClick={() => approveMutation.mutate({ id: record.id, approved: true })}>
    <CheckCircle />
    Approuver
  </Button>
)}
```

### Filtre dans la Liste
Les utilisateurs peuvent filtrer les pointages par statut :
- "En attente d'approbation" → Affiche uniquement les corrections en attente

---

## 📝 Exemples Concrets

### Exemple 1 : Correction de Retard Mineur
**Situation** :
- Pointage IN à 08:15 (retard de 15 minutes)
- Correction à 08:05 (retard de 5 minutes)
- Différence : 10 minutes

**Résultat** : ✅ **Pas d'approbation requise** (différence < 2h, anomalie LATE)

---

### Exemple 2 : Correction d'Absence
**Situation** :
- Pointage IN détecté comme ABSENCE (pas de planning)
- Correction : Modifier l'heure à 08:00

**Résultat** : ⚠️ **Approbation requise** (anomalie ABSENCE)

---

### Exemple 3 : Correction Importante d'Heure
**Situation** :
- Pointage IN à 08:00
- Correction à 10:30
- Différence : 2h30

**Résultat** : ⚠️ **Approbation requise** (différence > 2h)

---

### Exemple 4 : Correction avec Force Approval
**Situation** :
- Pointage avec anomalie ABSENCE
- Correction avec `forceApproval: true` (admin)

**Résultat** : ✅ **Pas d'approbation requise** (forcé par admin)

---

## 🔐 Permissions Requises

### Pour Corriger un Pointage
- **Permission** : `attendance.correct`
- **Rôles** : Manager, Admin RH, Super Admin

### Pour Approuver une Correction
- **Permission** : `attendance.approve_correction`
- **Rôles** : Manager, Admin RH, Super Admin

---

## 📊 Schéma de Base de Données

```prisma
model Attendance {
  // ... autres champs
  needsApproval     Boolean   @default(false) // Nécessite approbation pour correction
  approvalStatus    String?   // PENDING_APPROVAL, APPROVED, REJECTED
  approvedBy        String?   // ID de l'utilisateur qui a approuvé
  approvedAt        DateTime? // Date d'approbation
  isCorrected       Boolean   @default(false)
  correctedBy       String?
  correctedAt       DateTime?
  correctionNote    String?
}
```

---

## 🎯 Résumé

Le message **"En attente d'approbation"** se déclenche automatiquement quand :

1. ✅ **Changement d'heure > 2 heures** lors d'une correction
2. ✅ **Anomalie de type ABSENCE** corrigée
3. ✅ **Anomalie de type INSUFFICIENT_REST** corrigée

**Objectif** : Garantir que les corrections importantes sont validées par un manager avant d'être appliquées, assurant ainsi l'intégrité des données de pointage et la conformité aux règles RH.

---

## 🔄 Workflow Complet

```
Pointage avec Anomalie
         ↓
Correction par Utilisateur
         ↓
Évaluation: requiresApproval() ?
         ↓
    ┌────┴────┐
    │         │
  OUI       NON
    │         │
    ↓         ↓
PENDING    CORRIGÉ
APPROVAL   (immédiat)
    │
    ↓
Attente Manager
    │
    ↓
┌───┴───┐
│       │
APPROVED REJECTED
│       │
↓       ↓
Appliqué Annulé
```

---

**Date de création** : 2025-01-XX
**Version** : PointaFlex v1.0

