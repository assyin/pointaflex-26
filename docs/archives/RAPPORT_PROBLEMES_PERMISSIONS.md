# 🔐 Rapport d'Analyse - Problèmes de Permissions

**Date:** 11 Décembre 2025
**Analysé par:** Claude Code
**Gravité:** 🔴 **CRITIQUE**

---

## 📋 Résumé Exécutif

Un employé simple (rôle EMPLOYEE) a actuellement accès à des fonctionnalités réservées aux managers et administrateurs RH, créant un **problème de sécurité critique**.

### Problèmes Identifiés

- ❌ **Heures supplémentaires**: Peut voir TOUTES les demandes et les APPROUVER/REJETER
- ❌ **Employés**: Voit les 200 employés (devrait voir seulement lui-même)
- ❌ **Planning**: Peut créer/importer des plannings (accès administrateur)
- ❌ **Pointages**: Voit 774 pointages de TOUS les employés
- ❌ **Rapports**: Accès complet aux rapports RH avec exports PDF/Excel/CSV

---

## 🔍 Analyse Détaillée

### 1. Permissions dans la Base de Données ✅

**Statut:** Les permissions sont CORRECTES dans la base de données

```sql
SELECT permissions FROM Role WHERE code = 'EMPLOYEE'
```

**Résultat:**
- employee.view_own
- attendance.view_own
- attendance.create
- schedule.view_own
- leave.view_own
- leave.create
- leave.update
- overtime.view_own
- reports.view_attendance

✅ **Conclusion:** Les permissions en base sont appropriées pour un employé.

---

### 2. Backend API - Problèmes Critiques ❌

#### Problème 1: Pas de Protection sur GET /overtime
**Fichier:** `backend/src/modules/overtime/overtime.controller.ts:36`

```typescript
@Get()
@ApiOperation({ summary: 'Get all overtime records' })
findAll(@CurrentUser() user: any, ...) {
  // ❌ PAS DE @Roles() - Tout le monde peut accéder
  return this.overtimeService.findAll(user.tenantId, ...);
}
```

**Impact:** N'importe quel utilisateur peut voir toutes les heures supplémentaires de tous les employés.

**Solution:**
```typescript
@Get()
@Permissions('overtime.view_all', 'overtime.view_own') // Au moins une permission
@ApiOperation({ summary: 'Get all overtime records' })
findAll(@CurrentUser() user: any, ...) {
  // Filtrer par employé si permission = overtime.view_own
}
```

#### Problème 2: Utilisation de LegacyRole au lieu de RBAC
**Fichiers:** Tous les contrôleurs

```typescript
@Roles(LegacyRole.ADMIN_RH, LegacyRole.MANAGER) // ❌ Ancien système
```

**Impact:** Le nouveau système RBAC avec permissions n'est pas utilisé.

**Solution:**
```typescript
@Permissions('overtime.approve') // ✅ Nouveau système
```

#### Problème 3: Pas de Filtrage par Utilisateur
**Fichier:** `overtime.service.ts`, `employees.service.ts`, etc.

**Impact:** Les services retournent toutes les données sans filtrer selon les permissions.

**Solution:** Implémenter une logique de filtrage:
```typescript
// Si l'utilisateur a seulement "view_own", filtrer par son employeeId
if (hasOnlyPermission('overtime.view_own')) {
  filters.employeeId = currentUser.employeeId;
}
```

---

### 3. Frontend - Problèmes Critiques ❌

#### Problème 1: Pages Non Protégées

**Fichiers concernés:**
- `app/(dashboard)/overtime/page.tsx`
- `app/(dashboard)/employees/page.tsx`
- `app/(dashboard)/attendance/page.tsx`
- `app/(dashboard)/shifts-planning/page.tsx`
- `app/(dashboard)/reports/page.tsx`

**Impact:** Les pages affichent toutes les données sans vérifier les permissions.

**Exemple - Overtime (ligne 639-661):**
```typescript
{record.status === 'PENDING' && (
  <>
    <Button onClick={() => handleApprove(record.id)}>
      Approuver  {/* ❌ PAS de PermissionGate */}
    </Button>
    <Button onClick={() => handleRejectClick(record.id)}>
      Rejeter  {/* ❌ PAS de PermissionGate */}
    </Button>
  </>
)}
```

**Solution:**
```typescript
<PermissionGate permission="overtime.approve">
  {record.status === 'PENDING' && (
    <>
      <Button onClick={() => handleApprove(record.id)}>
        Approuver
      </Button>
      <Button onClick={() => handleRejectClick(record.id)}>
        Rejeter
      </Button>
    </>
  )}
</PermissionGate>
```

#### Problème 2: Pas de Vérification de Permission sur les Pages

**Impact:** Les utilisateurs peuvent accéder aux pages même sans la permission appropriée.

**Solution:** Ajouter une vérification au début de chaque page:
```typescript
export default function OvertimePage() {
  const { hasPermission, hasAnyPermission } = useAuth();

  // Rediriger si pas de permission
  if (!hasAnyPermission(['overtime.view_all', 'overtime.view_own'])) {
    return <AccessDenied />;
  }

  // Filtrer les données selon les permissions
  const canViewAll = hasPermission('overtime.view_all');
  // ...
}
```

#### Problème 3: Pas de Filtrage des Données

**Impact:** Même avec PermissionGate, les données de tous les employés sont chargées.

**Solution:** Filtrer les données côté client selon les permissions:
```typescript
const filteredData = useMemo(() => {
  if (hasPermission('overtime.view_all')) {
    return allData;
  }
  if (hasPermission('overtime.view_own')) {
    return allData.filter(item => item.employeeId === currentUser.employeeId);
  }
  return [];
}, [allData, hasPermission, currentUser]);
```

---

## 🎯 Plan de Correction

### Phase 1: Backend (PRIORITÉ HAUTE)

1. **Ajouter le guard Permissions sur tous les endpoints**
   ```bash
   cd backend
   # Créer un nouveau guard pour les permissions RBAC
   ```

2. **Implémenter le filtrage par utilisateur dans les services**
   - overtime.service.ts
   - employees.service.ts
   - attendance.service.ts
   - schedules.service.ts

3. **Tester tous les endpoints avec différents rôles**

### Phase 2: Frontend (PRIORITÉ HAUTE)

1. **Protéger tous les boutons sensibles avec PermissionGate**
   - Boutons Approuver/Rejeter
   - Boutons Créer/Modifier/Supprimer
   - Boutons Export

2. **Ajouter des vérifications de permissions au début des pages**
   - Redirection vers /403 si pas de permission
   - Affichage d'un message d'erreur

3. **Filtrer les données affichées selon les permissions**
   - Overtime: view_all vs view_own
   - Employees: view_all vs view_own
   - Attendance: view_all vs view_own vs view_team

### Phase 3: Tests (PRIORITÉ HAUTE)

1. **Tester avec le compte EMPLOYEE**
   - Vérifier qu'il voit SEULEMENT ses propres données
   - Vérifier qu'il ne peut PAS approuver/rejeter
   - Vérifier qu'il ne peut PAS créer de planning

2. **Tester avec le compte MANAGER**
   - Vérifier qu'il voit les données de son équipe
   - Vérifier qu'il peut approuver/rejeter

3. **Tester avec le compte ADMIN_RH**
   - Vérifier l'accès complet

---

## 📊 Gravité des Problèmes

| Problème | Gravité | Impact | Priorité |
|----------|---------|--------|----------|
| Pas de protection GET /overtime | 🔴 Critique | Fuite de données sensibles | P0 |
| Boutons Approuver/Rejeter non protégés | 🔴 Critique | Manipulation non autorisée | P0 |
| Voir tous les employés | 🟠 Élevé | Violation de confidentialité | P1 |
| Accès aux rapports RH | 🟠 Élevé | Fuite d'informations | P1 |
| Voir tous les pointages | 🟠 Élevé | Violation de confidentialité | P1 |
| Accès au planning | 🟡 Moyen | Fonctionnalité inappropriée | P2 |

---

## ✅ Permissions Correctes par Rôle

### 👤 EMPLOYEE (Employé)
**Doit pouvoir:**
- ✅ Voir SES propres informations
- ✅ Voir SES pointages
- ✅ Créer un pointage (pointer)
- ✅ Voir SON planning
- ✅ Demander un congé
- ✅ Voir SES congés
- ✅ Demander des heures supplémentaires
- ✅ Voir SES heures supplémentaires
- ✅ Voir SON rapport de présence

**Ne doit PAS pouvoir:**
- ❌ Voir les autres employés
- ❌ Voir les pointages des autres
- ❌ Créer/modifier le planning
- ❌ Approuver/rejeter quoi que ce soit
- ❌ Voir les rapports RH globaux
- ❌ Exporter des données

### 👔 MANAGER (Manager)
**En plus de EMPLOYEE:**
- ✅ Voir les données de SON ÉQUIPE
- ✅ Corriger les pointages de son équipe
- ✅ Gérer le planning de son équipe
- ✅ Approuver/rejeter les congés de son équipe
- ✅ Approuver les heures supplémentaires
- ✅ Voir les rapports de son équipe
- ✅ Exporter les données de son équipe

### 👨‍💼 ADMIN_RH (Administrateur RH)
**Accès complet:**
- ✅ Voir TOUS les employés
- ✅ Créer/modifier/supprimer des employés
- ✅ Voir TOUS les pointages
- ✅ Créer/modifier TOUS les plannings
- ✅ Approuver/rejeter TOUS les congés et heures sup
- ✅ Voir TOUS les rapports
- ✅ Exporter toutes les données
- ✅ Gérer les utilisateurs et rôles

### ⭐ SUPER_ADMIN (Super Administrateur)
**Accès système complet:**
- ✅ Tout ce que ADMIN_RH peut faire
- ✅ Gérer les tenants
- ✅ Gérer les rôles et permissions système
- ✅ Accès aux audits système

---

## 🚀 Actions Immédiates Recommandées

1. **URGENT:** Implémenter le guard de permissions sur backend/src/modules/overtime/overtime.controller.ts:36
2. **URGENT:** Ajouter PermissionGate sur les boutons Approuver/Rejeter
3. **URGENT:** Filtrer les données selon les permissions dans tous les services
4. **URGENT:** Tester avec le compte employee@demo.com après corrections

---

## 📝 Notes Techniques

### Composant PermissionGate Disponible
```typescript
// frontend/components/auth/PermissionGate.tsx
<PermissionGate permission="overtime.approve">
  <Button>Approuver</Button>
</PermissionGate>
```

### Hook useAuth Disponible
```typescript
const { hasPermission, hasAnyPermission } = useAuth();

if (hasPermission('employee.view_all')) {
  // Afficher tous les employés
} else if (hasPermission('employee.view_own')) {
  // Afficher seulement l'employé courant
}
```

---

**Prochaines étapes:** Corriger les problèmes dans l'ordre de priorité (P0 → P1 → P2)
