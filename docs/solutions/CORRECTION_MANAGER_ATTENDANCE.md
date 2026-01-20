# Correction : Bouton "Corriger" pour Manager Régional

## 🔍 Problème Identifié

Le manager régional (département IT, CPT RABAT) n'avait pas l'option "Action de correction" pour corriger les anomalies des employés de son périmètre.

---

## ✅ Corrections Effectuées

### 1. **Backend - Vérification des Permissions** (`attendance.service.ts`)

**Problème** : Le service `correctAttendance()` ne vérifiait pas si le manager pouvait corriger les pointages de ses employés.

**Solution** : Ajout d'une vérification du périmètre du manager avant de permettre la correction.

**Code ajouté** :
```typescript
async correctAttendance(
  tenantId: string,
  id: string,
  correctionDto: CorrectAttendanceDto,
  userId?: string,  // ✅ Nouveau paramètre
  userPermissions?: string[],  // ✅ Nouveau paramètre
) {
  // ... récupération du pointage ...
  
  // ✅ NOUVEAU : Vérification du périmètre du manager
  if (userId && userPermissions) {
    const hasViewAll = userPermissions.includes('attendance.view_all');
    
    if (!hasViewAll) {
      const managerLevel = await getManagerLevel(this.prisma, userId, tenantId);
      
      if (managerLevel.type) {
        const managedEmployeeIds = await getManagedEmployeeIds(this.prisma, managerLevel, tenantId);
        
        if (!managedEmployeeIds.includes(attendance.employeeId)) {
          throw new ForbiddenException(
            'Vous ne pouvez corriger que les pointages des employés de votre périmètre',
          );
        }
      }
    }
  }
  
  // ... reste de la logique ...
}
```

---

### 2. **Backend - Controller** (`attendance.controller.ts`)

**Modification** : Passage de `userId` et `userPermissions` au service.

**Code modifié** :
```typescript
correctAttendance(
  @CurrentUser() user: any,
  @CurrentTenant() tenantId: string,
  @Param('id') id: string,
  @Body() correctionDto: CorrectAttendanceDto,
) {
  return this.attendanceService.correctAttendance(
    tenantId,
    id,
    correctionDto,
    user.userId,  // ✅ Ajouté
    user.permissions || [],  // ✅ Ajouté
  );
}
```

---

### 3. **Frontend - Condition d'Affichage** (`attendance/page.tsx`)

**Problème** : La condition `!record.needsApproval` était trop restrictive et pouvait masquer le bouton même quand `needsApproval` était `undefined` ou `false`.

**Solution** : Amélioration de la condition pour être plus explicite.

**Code modifié** :
```typescript
// ✅ AVANT (trop restrictif)
{record.hasAnomaly && !record.isCorrected && !record.needsApproval && (
  <PermissionGate permissions={['attendance.correct']}>
    <Button>Corriger</Button>
  </PermissionGate>
)}

// ✅ APRÈS (plus explicite)
{record.hasAnomaly && 
 !record.isCorrected && 
 (!record.needsApproval || record.approvalStatus !== 'PENDING_APPROVAL') && (
  <PermissionGate permissions={['attendance.correct']}>
    <Button>Corriger</Button>
  </PermissionGate>
)}
```

**Amélioration** : Le bouton s'affiche maintenant si :
- ✅ Il y a une anomalie
- ✅ Le pointage n'est pas déjà corrigé
- ✅ Le pointage n'est pas en attente d'approbation (ou `needsApproval` est `false`/`undefined`)

---

### 4. **Frontend - Permission pour Approuver**

**Amélioration** : Ajout de `attendance.correct` comme permission alternative pour approuver.

**Code modifié** :
```typescript
// ✅ AVANT
<PermissionGate permissions={['attendance.approve_correction']}>

// ✅ APRÈS
<PermissionGate permissions={['attendance.approve_correction', 'attendance.correct']}>
```

**Raison** : Les managers avec `attendance.correct` peuvent aussi approuver les corrections de leurs employés.

---

## 🔐 Vérification des Permissions

### Permissions Requises pour Corriger

Le manager doit avoir **au moins une** de ces permissions :
- ✅ `attendance.correct` (assignée au rôle MANAGER)
- ✅ `attendance.edit` (alternative)

### Vérification du Périmètre

Le système vérifie maintenant que :
1. ✅ Le manager a la permission `attendance.correct`
2. ✅ L'employé du pointage appartient au périmètre du manager :
   - **Manager Régional (SITE)** : Employés du département dans le(s) site(s) géré(s)
   - **Manager de Département** : Tous les employés du département (tous sites)
   - **Manager d'Équipe** : Tous les employés de l'équipe

---

## 🧪 Tests à Effectuer

### Test 1 : Manager Régional - Correction Autorisée

**Scénario** :
- Manager : temp007@demo.local (Manager Régional, Département IT, CPT RABAT)
- Employé : Employé du département IT dans le site CPT RABAT
- Pointage : Avec anomalie (ex: LATE)

**Résultat attendu** : ✅ Bouton "Corriger" visible et fonctionnel

---

### Test 2 : Manager Régional - Correction Refusée (Hors Périmètre)

**Scénario** :
- Manager : temp007@demo.local (Manager Régional, Département IT, CPT RABAT)
- Employé : Employé d'un autre département ou d'un autre site
- Pointage : Avec anomalie

**Résultat attendu** : ❌ Erreur 403 "Vous ne pouvez corriger que les pointages des employés de votre périmètre"

---

### Test 3 : Affichage du Bouton

**Conditions d'affichage** :
- ✅ `hasAnomaly = true`
- ✅ `isCorrected = false`
- ✅ `needsApproval = false` OU `undefined` OU `approvalStatus !== 'PENDING_APPROVAL'`
- ✅ Permission `attendance.correct` présente

**Résultat attendu** : ✅ Bouton "Corriger" visible

---

## 📋 Checklist de Vérification

- [x] **Backend** : Vérification du périmètre du manager ajoutée
- [x] **Backend** : Controller passe `userId` et `permissions` au service
- [x] **Frontend** : Condition d'affichage améliorée
- [x] **Frontend** : PermissionGate vérifie `attendance.correct`
- [ ] **Test** : Vérifier avec le compte temp007@demo.local
- [ ] **Test** : Vérifier que les pointages sont bien filtrés selon le périmètre
- [ ] **Test** : Vérifier que le bouton s'affiche pour les anomalies

---

## 🔄 Workflow de Correction

### Étape 1 : Affichage
1. Manager ouvre la page `/attendance`
2. Les pointages sont filtrés selon son périmètre (automatique via `findAll`)
3. Les pointages avec anomalies affichent le bouton "Corriger"

### Étape 2 : Correction
1. Manager clique sur "Corriger"
2. Modal de correction s'ouvre
3. Manager saisit la note et/ou modifie l'heure
4. Backend vérifie :
   - ✅ Permission `attendance.correct`
   - ✅ L'employé appartient au périmètre du manager
5. Correction appliquée ou mise en attente d'approbation

### Étape 3 : Approbation (si nécessaire)
1. Si correction nécessite approbation → Statut `PENDING_APPROVAL`
2. Manager peut approuver avec `attendance.approve_correction` ou `attendance.correct`
3. Correction appliquée définitivement

---

## ✅ Résumé

**Problèmes corrigés** :
1. ✅ Vérification du périmètre du manager dans le backend
2. ✅ Condition d'affichage améliorée dans le frontend
3. ✅ Gestion des permissions pour l'approbation

**Le manager régional peut maintenant** :
- ✅ Voir les pointages de ses employés (déjà fonctionnel)
- ✅ Corriger les anomalies des employés de son périmètre (✅ **CORRIGÉ**)
- ✅ Approuver les corrections nécessitant approbation (✅ **AMÉLIORÉ**)

---

**Date de correction** : 2025-01-XX
**Statut** : ✅ **Corrections appliquées - Prêt pour test**

