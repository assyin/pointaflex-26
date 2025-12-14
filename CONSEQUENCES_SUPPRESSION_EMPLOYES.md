# ⚠️ Conséquences de la Suppression de Tous les Employés

**Date :** 2025-01-09  
**Action :** Suppression de tous les employés via `DELETE /employees/all`

---

## ✅ Données qui SERONT SUPPRIMÉES automatiquement (CASCADE)

Grâce aux contraintes `onDelete: Cascade` dans le schéma Prisma, les données suivantes seront **automatiquement supprimées** lors de la suppression des employés :

### 1. 📊 **Pointage (Attendance)**
- ✅ **TOUS les pointages** de tous les employés seront supprimés
- **Relation :** `Attendance.employeeId` → `Employee.id` (onDelete: Cascade)
- **Impact :** Perte de **TOUTES** les données de pointage historiques

### 2. 📅 **Planning (Schedule)**
- ✅ **TOUS les plannings** de tous les employés seront supprimés
- **Relation :** `Schedule.employeeId` → `Employee.id` (onDelete: Cascade)
- **Impact :** Perte de **TOUS** les plannings passés et futurs

### 3. 🏖️ **Congés (Leave)**
- ✅ **TOUS les congés** de tous les employés seront supprimés
- **Relation :** `Leave.employeeId` → `Employee.id` (onDelete: Cascade)
- **Impact :** Perte de **TOUTES** les demandes de congés (en attente, approuvées, rejetées)

### 4. ⏰ **Heures Supplémentaires (Overtime)**
- ✅ **TOUTES les heures supplémentaires** de tous les employés seront supprimées
- **Relation :** `Overtime.employeeId` → `Employee.id` (onDelete: Cascade)
- **Impact :** Perte de **TOUTES** les heures supplémentaires (en attente, approuvées)

### 5. 🔄 **Récupération (Recovery)**
- ✅ **TOUTES les heures de récupération** de tous les employés seront supprimées
- **Relation :** `Recovery.employeeId` → `Employee.id` (onDelete: Cascade)
- **Impact :** Perte de **TOUTES** les heures de récupération disponibles

### 6. 🔔 **Notifications (Notification)**
- ✅ **TOUTES les notifications** de tous les employés seront supprimées
- **Relation :** `Notification.employeeId` → `Employee.id` (onDelete: Cascade)
- **Impact :** Perte de **TOUTES** les notifications (lues et non lues)

---

## ⚠️ Données qui NE SERONT PAS SUPPRIMÉES (mais peuvent causer des problèmes)

### 1. 🔄 **Remplacements de Shift (ShiftReplacement)**
- ❌ **PROBLÈME POTENTIEL** : Les remplacements ne seront **PAS automatiquement supprimés**
- **Relation :** `ShiftReplacement.originalEmployeeId` et `replacementEmployeeId` → `Employee.id` (PAS de onDelete: Cascade)
- **Impact :** 
  - ⚠️ **Erreur de contrainte de clé étrangère** si des ShiftReplacement référencent des employés supprimés
  - ⚠️ **Données orphelines** dans la base de données
- **Solution requise :** Supprimer manuellement les ShiftReplacement avant de supprimer les employés, OU ajouter `onDelete: Cascade` au schéma

### 2. 👤 **Comptes Utilisateurs (User)**
- ⚠️ Les comptes utilisateurs liés aux employés ne seront **PAS automatiquement supprimés**
- **Relation :** `Employee.userId` → `User.id` (PAS de onDelete: Cascade)
- **Impact :** 
  - Les utilisateurs resteront dans la base mais sans employé associé
  - Le champ `Employee.userId` sera mis à `null` automatiquement (contrainte de clé étrangère)

---

## ✅ Données qui NE SERONT PAS SUPPRIMÉES (structure organisationnelle)

Ces données sont **indépendantes** des employés et seront **conservées** :

### 1. 🏢 **Sites**
- ✅ **CONSERVÉS** - Les sites ne seront pas supprimés
- **Relation :** `Employee.siteId` → `Site.id` (PAS de onDelete: Cascade)
- **Impact :** Les sites resteront intacts, mais n'auront plus d'employés assignés

### 2. 📁 **Départements (Department)**
- ✅ **CONSERVÉS** - Les départements ne seront pas supprimés
- **Relation :** `Employee.departmentId` → `Department.id` (PAS de onDelete: Cascade)
- **Impact :** Les départements resteront intacts, mais n'auront plus d'employés assignés

### 3. 💼 **Fonctions/Positions (Position)**
- ✅ **CONSERVÉS** - Les positions ne seront pas supprimées
- **Relation :** `Employee.positionId` → `Position.id` (PAS de onDelete: Cascade)
- **Impact :** Les positions resteront intactes, mais n'auront plus d'employés assignés

### 4. 👥 **Équipes (Team)**
- ✅ **CONSERVÉS** - Les équipes ne seront pas supprimées
- **Relation :** `Employee.teamId` → `Team.id` (PAS de onDelete: Cascade)
- **Impact :** Les équipes resteront intactes, mais n'auront plus d'employés assignés

### 5. ⏱️ **Shifts (Horaires)**
- ✅ **CONSERVÉS** - Les shifts ne seront pas supprimés
- **Relation :** `Employee.currentShiftId` → `Shift.id` (PAS de onDelete: Cascade)
- **Impact :** Les shifts resteront intacts

### 6. 📋 **Types de Congés (LeaveType)**
- ✅ **CONSERVÉS** - Les types de congés ne seront pas supprimés
- **Impact :** Les types de congés resteront intacts

### 7. 🎯 **Types de Congés (Holiday)**
- ✅ **CONSERVÉS** - Les jours fériés ne seront pas supprimés
- **Impact :** Les jours fériés resteront intacts

---

## 🚨 PROBLÈME CRITIQUE : ShiftReplacement

### ⚠️ Action Requise AVANT la Suppression

Avant de supprimer tous les employés, vous **DEVEZ** supprimer tous les `ShiftReplacement` qui référencent des employés, sinon vous obtiendrez une **erreur de contrainte de clé étrangère**.

### Solution 1 : Supprimer manuellement les ShiftReplacement
```sql
DELETE FROM "ShiftReplacement" WHERE "tenantId" = 'votre-tenant-id';
```

### Solution 2 : Modifier le code pour supprimer automatiquement
Modifier la méthode `deleteAll` dans `employees.service.ts` pour supprimer d'abord les ShiftReplacement :

```typescript
async deleteAll(tenantId: string) {
  const count = await this.prisma.employee.count({
    where: { tenantId },
  });

  // Supprimer d'abord les ShiftReplacement
  await this.prisma.shiftReplacement.deleteMany({
    where: { tenantId },
  });

  // Ensuite supprimer les employés
  await this.prisma.employee.deleteMany({
    where: { tenantId },
  });

  return {
    statusCode: 200,
    message: `Successfully deleted ${count} employees`,
    data: { count },
  };
}
```

### Solution 3 : Ajouter onDelete: Cascade au schéma (recommandé)
Modifier `backend/prisma/schema.prisma` :

```prisma
model ShiftReplacement {
  // ...
  originalEmployee      Employee          @relation("OriginalEmployee", fields: [originalEmployeeId], references: [id], onDelete: Cascade)
  replacementEmployee   Employee          @relation("ReplacementEmployee", fields: [replacementEmployeeId], references: [id], onDelete: Cascade)
  // ...
}
```

Puis exécuter une migration :
```bash
npx prisma migrate dev --name add-cascade-to-shift-replacement
```

---

## 📊 Résumé des Données Affectées

| Type de Donnée | Supprimée ? | Méthode | Impact |
|----------------|-------------|---------|--------|
| **Employés** | ✅ OUI | Directe | Tous supprimés |
| **Pointage (Attendance)** | ✅ OUI | Cascade | Tous supprimés |
| **Planning (Schedule)** | ✅ OUI | Cascade | Tous supprimés |
| **Congés (Leave)** | ✅ OUI | Cascade | Tous supprimés |
| **Heures Supplémentaires (Overtime)** | ✅ OUI | Cascade | Tous supprimés |
| **Récupération (Recovery)** | ✅ OUI | Cascade | Tous supprimés |
| **Notifications** | ✅ OUI | Cascade | Toutes supprimées |
| **Remplacements (ShiftReplacement)** | ⚠️ NON | - | **ERREUR si non géré** |
| **Sites** | ❌ NON | - | Conservés (vides) |
| **Départements** | ❌ NON | - | Conservés (vides) |
| **Positions** | ❌ NON | - | Conservées (vides) |
| **Équipes** | ❌ NON | - | Conservées (vides) |
| **Shifts** | ❌ NON | - | Conservés |
| **Types de Congés** | ❌ NON | - | Conservés |
| **Jours Fériés** | ❌ NON | - | Conservés |
| **Comptes Utilisateurs** | ⚠️ PARTIEL | - | Conservés (sans employé) |

---

## ✅ Recommandations

1. **⚠️ AVANT de supprimer** : Vérifier et supprimer manuellement les `ShiftReplacement` OU modifier le code pour les supprimer automatiquement

2. **💾 SAUVEGARDE** : Faire une sauvegarde complète de la base de données avant la suppression

3. **📊 EXPORT** : Exporter les données importantes (pointages, plannings, congés) si vous souhaitez les conserver

4. **🔧 AMÉLIORATION** : Ajouter `onDelete: Cascade` aux relations `ShiftReplacement` pour éviter ce problème à l'avenir

---

**⚠️ ATTENTION : Cette action est IRRÉVERSIBLE ! Une fois les employés supprimés, toutes les données liées (pointages, plannings, congés, etc.) seront perdues définitivement.**

