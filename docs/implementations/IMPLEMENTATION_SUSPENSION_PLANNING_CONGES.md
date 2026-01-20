# Implémentation de la Suspension Automatique des Plannings par Congé

## Vue d'ensemble

Cette implémentation permet la suspension automatique des plannings lorsqu'un congé est créé, modifié ou supprimé. Les plannings suspendus sont affichés visuellement dans l'interface de planification avec une indication claire.

## Modifications apportées

### 1. Schema Prisma (`backend/prisma/schema.prisma`)

#### Ajout de l'enum `ScheduleStatus`
```prisma
enum ScheduleStatus {
  PUBLISHED
  DRAFT
  CANCELLED
  SUSPENDED_BY_LEAVE  // Nouveau statut
}
```

#### Modification du modèle `Schedule`
```prisma
model Schedule {
  id                 String         @id @default(uuid())
  // ... autres champs ...
  status             ScheduleStatus @default(PUBLISHED)  // Changé de String à ScheduleStatus
  suspendedByLeaveId String?                              // NOUVEAU: Référence au congé
  suspendedAt        DateTime?                            // NOUVEAU: Date de suspension
  // ... autres champs ...
  suspendedByLeave   Leave?         @relation("ScheduleSuspendedByLeave", fields: [suspendedByLeaveId], references: [id], onDelete: SetNull)

  @@index([suspendedByLeaveId])  // NOUVEAU: Index pour performance
}
```

#### Modification du modèle `Leave`
```prisma
model Leave {
  // ... autres champs ...
  suspendedSchedules Schedule[] @relation("ScheduleSuspendedByLeave")  // NOUVEAU: Relation inverse
}
```

### 2. Backend - Service des Congés (`backend/src/modules/leaves/leaves.service.ts`)

#### Nouvelles méthodes privées

##### `suspendSchedulesForLeave()`
Suspend tous les plannings PUBLISHED dans la période du congé.

```typescript
private async suspendSchedulesForLeave(
  tenantId: string,
  employeeId: string,
  leaveId: string,
  startDate: Date,
  endDate: Date,
): Promise<number>
```

**Fonctionnement:**
1. Recherche tous les plannings PUBLISHED entre startDate et endDate
2. Met à jour leur statut à SUSPENDED_BY_LEAVE
3. Enregistre la référence au congé (suspendedByLeaveId)
4. Enregistre la date de suspension (suspendedAt)

##### `reactivateSchedulesForLeave()`
Réactive tous les plannings suspendus par un congé donné.

```typescript
private async reactivateSchedulesForLeave(
  tenantId: string,
  leaveId: string,
): Promise<number>
```

**Fonctionnement:**
1. Recherche tous les plannings avec status=SUSPENDED_BY_LEAVE et suspendedByLeaveId=leaveId
2. Restaure leur statut à PUBLISHED
3. Efface suspendedByLeaveId et suspendedAt

##### `adjustScheduleSuspensionsForLeaveUpdate()`
Ajuste les suspensions lors de la modification des dates d'un congé.

```typescript
private async adjustScheduleSuspensionsForLeaveUpdate(
  tenantId: string,
  employeeId: string,
  leaveId: string,
  oldStartDate: Date,
  oldEndDate: Date,
  newStartDate: Date,
  newEndDate: Date,
): Promise<void>
```

**Fonctionnement:**
1. Réactive tous les plannings suspendus par ce congé
2. Suspend les plannings dans la nouvelle période

#### Modifications des méthodes existantes

##### `approve()`
- **Modification:** Lors de l'approbation finale (status → APPROVED), suspension automatique des plannings
- **Code ajouté:**
```typescript
if (updateData.status === LeaveStatus.APPROVED) {
  await this.suspendSchedulesForLeave(
    tenantId,
    updatedLeave.employeeId,
    updatedLeave.id,
    updatedLeave.startDate,
    updatedLeave.endDate,
  );
}
```

##### `update()`
- **Modification:** Permet la modification des congés approuvés (auparavant bloqué)
- **Logique ajoutée:** Si dates modifiées ET congé approuvé → ajustement des suspensions
- **Code ajouté:**
```typescript
if (leave.status === LeaveStatus.APPROVED && datesChanged) {
  await this.adjustScheduleSuspensionsForLeaveUpdate(
    tenantId,
    updatedLeave.employeeId,
    updatedLeave.id,
    oldStartDate,
    oldEndDate,
    updatedLeave.startDate,
    updatedLeave.endDate,
  );
}
```

##### `cancel()`
- **Modification:** Réactivation automatique des plannings lors de l'annulation
- **Code ajouté:**
```typescript
if (leave.status === LeaveStatus.APPROVED) {
  await this.reactivateSchedulesForLeave(tenantId, id);
}
```

##### `remove()`
- **Modification:** Réactivation automatique des plannings lors de la suppression
- **Code ajouté:**
```typescript
if (leave.status === LeaveStatus.APPROVED) {
  await this.reactivateSchedulesForLeave(tenantId, id);
}
```

### 3. Backend - Service d'Assiduité (`backend/src/modules/attendance/attendance.service.ts`)

#### Modification de `getScheduleWithFallback()`

**Avant:**
```typescript
const schedule = await this.prisma.schedule.findFirst({
  where: {
    tenantId,
    employeeId,
    date: dateOnly,
  },
  // ...
});
```

**Après:**
```typescript
const schedule = await this.prisma.schedule.findFirst({
  where: {
    tenantId,
    employeeId,
    date: dateOnly,
    status: 'PUBLISHED', // Ignorer les plannings suspendus
  },
  // ...
});
```

**Impact:** Les plannings suspendus ne sont plus utilisés pour la validation des pointages. Le système utilise alors le shift par défaut de l'employé (fallback) s'il existe, ou créera une anomalie LEAVE_CONFLICT.

### 4. Frontend - Interface Schedule (`frontend/lib/api/schedules.ts`)

Ajout des nouveaux champs au type Schedule:

```typescript
export interface Schedule {
  id: string;
  employeeId: string;
  shiftId: string;
  date: string;
  tenantId: string;
  status?: 'PUBLISHED' | 'DRAFT' | 'CANCELLED' | 'SUSPENDED_BY_LEAVE';  // NOUVEAU
  suspendedByLeaveId?: string;                                           // NOUVEAU
  suspendedAt?: string;                                                  // NOUVEAU
  customStartTime?: string;
  customEndTime?: string;
  notes?: string;
  // ... autres champs ...
  suspendedByLeave?: any; // Relation vers Leave                        // NOUVEAU
}
```

### 5. Frontend - Page de Planification (`frontend/app/(dashboard)/shifts-planning/page.tsx`)

#### Affichage visuel des plannings suspendus

**Modifications apportées:**
1. Détection du statut suspendu: `const isSuspended = schedule?.status === 'SUSPENDED_BY_LEAVE'`
2. Style visuel différencié:
   - Background gris (`bg-gray-300`)
   - Texte grisé (`text-gray-600`)
   - Opacité réduite (`opacity-60`)
   - Icône 🚫 pour indication visuelle
3. Tooltip informatif au survol: "Planning suspendu par un congé approuvé"
4. Bouton de suppression masqué pour les plannings suspendus

**Code ajouté:**
```typescript
const isSuspended = schedule?.status === 'SUSPENDED_BY_LEAVE';
return (
  <td key={day.toISOString()} className="px-3 py-3 border text-center">
    {schedule ? (
      <div className="flex flex-col items-center gap-1 relative group">
        <div
          className={`px-2 py-1 rounded text-xs font-medium ${
            isSuspended
              ? 'bg-gray-300 text-gray-600 opacity-60'
              : 'text-white'
          }`}
          style={{
            backgroundColor: isSuspended ? undefined : (selectedShiftDetails.color || '#3B82F6'),
          }}
          title={isSuspended ? 'Planning suspendu par un congé' : undefined}
        >
          {schedule.customStartTime || selectedShiftDetails.startTime}
          {isSuspended && (
            <span className="ml-1" title="Suspendu par congé">🚫</span>
          )}
        </div>
        <div className={`text-xs ${isSuspended ? 'text-gray-500' : 'text-text-secondary'}`}>
          {schedule.customEndTime || selectedShiftDetails.endTime}
        </div>
        {isSuspended && (
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 w-48 p-2 bg-gray-800 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
            Planning suspendu par un congé approuvé
          </div>
        )}
        <PermissionGate permissions={['schedule.delete', 'schedule.manage_team']}>
          {!isSuspended && (
            <Button
              variant="outline"
              size="sm"
              className="mt-1 h-6 px-2 text-xs"
              onClick={() => handleDeleteSchedule(schedule.id)}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </PermissionGate>
      </div>
    ) : (
      <span className="text-text-secondary text-xs">-</span>
    )}
  </td>
);
```

## Flux de fonctionnement

### Scénario 1: Création et approbation d'un congé

1. **Manager/RH crée un congé** → Statut: PENDING
   - Aucun planning suspendu à ce stade

2. **Manager approuve** → Statut: MANAGER_APPROVED
   - Aucun planning suspendu (en attente validation RH)

3. **RH approuve** → Statut: APPROVED
   - ✅ **Suspension automatique** de tous les plannings PUBLISHED dans la période
   - Les plannings passent à status=SUSPENDED_BY_LEAVE
   - suspendedByLeaveId est défini avec l'ID du congé
   - suspendedAt est défini à la date actuelle

### Scénario 2: Modification des dates d'un congé approuvé

1. **Manager modifie les dates** (ex: 06-08/01 → 06-10/01)
   - Étape 1: Réactivation de tous les plannings suspendus par ce congé (06-08/01)
   - Étape 2: Suspension des plannings dans la nouvelle période (06-10/01)

### Scénario 3: Annulation d'un congé approuvé

1. **Manager/RH annule le congé** → Statut: CANCELLED
   - ✅ **Réactivation automatique** de tous les plannings suspendus
   - Les plannings repassent à status=PUBLISHED
   - suspendedByLeaveId et suspendedAt sont effacés

### Scénario 4: Suppression d'un congé

1. **Manager/RH supprime le congé**
   - ✅ **Réactivation automatique** avant suppression
   - Les plannings repassent à status=PUBLISHED
   - Le congé est supprimé (onDelete: SetNull maintient l'intégrité)

## Migration de la base de données

Pour appliquer ces changements, vous devez exécuter la migration Prisma:

```bash
cd /home/assyin/PointaFlex/backend
npx prisma migrate dev --name add_schedule_suspension_support
```

**Note:** La migration échouera actuellement car la base de données n'est pas accessible. Vous devrez:
1. Vous assurer que la base de données Supabase est accessible
2. Exécuter la migration

## Impact sur les fonctionnalités existantes

### ✅ Validation des pointages
- Les plannings suspendus ne sont plus pris en compte
- Le système utilise le shift par défaut en fallback
- Anomalie LEAVE_CONFLICT créée si pointage pendant congé approuvé

### ✅ Interface de planification
- Affichage visuel clair des plannings suspendus
- Impossibilité de supprimer un planning suspendu (géré automatiquement)
- Tooltip informatif pour l'utilisateur

### ✅ Gestion des congés
- Possibilité de modifier les dates même après approbation
- Réactivation automatique lors de l'annulation/suppression
- Intégrité garantie par les relations Prisma

## Logs et débogage

Tous les logs sont préfixés pour faciliter le débogage:

```
[suspendSchedulesForLeave] Suspension des plannings pour le congé xxx
[suspendSchedulesForLeave] Période: 2026-01-06T00:00:00.000Z - 2026-01-08T00:00:00.000Z
[suspendSchedulesForLeave] 3 planning(s) trouvé(s) à suspendre
[suspendSchedulesForLeave] 3 planning(s) suspendu(s)
```

```
[reactivateSchedulesForLeave] Réactivation des plannings pour le congé xxx
[reactivateSchedulesForLeave] 3 planning(s) à réactiver
[reactivateSchedulesForLeave] 3 planning(s) réactivé(s)
```

```
[adjustScheduleSuspensionsForLeaveUpdate] Ajustement pour le congé xxx
[adjustScheduleSuspensionsForLeaveUpdate] Anciennes dates: 2026-01-06T00:00:00.000Z - 2026-01-08T00:00:00.000Z
[adjustScheduleSuspensionsForLeaveUpdate] Nouvelles dates: 2026-01-06T00:00:00.000Z - 2026-01-10T00:00:00.000Z
```

## Tests recommandés

Une fois la migration appliquée, testez les scénarios suivants:

1. **Créer un congé et l'approuver** → Vérifier suspension des plannings
2. **Modifier les dates d'un congé approuvé** → Vérifier ajustement des suspensions
3. **Annuler un congé approuvé** → Vérifier réactivation des plannings
4. **Supprimer un congé approuvé** → Vérifier réactivation avant suppression
5. **Créer un pointage pendant congé** → Vérifier anomalie LEAVE_CONFLICT
6. **Afficher la page de planification** → Vérifier affichage visuel des plannings suspendus

## Fichiers modifiés

### Backend
- `/backend/prisma/schema.prisma` - Ajout enum et champs suspension
- `/backend/src/modules/leaves/leaves.service.ts` - Logique de suspension
- `/backend/src/modules/attendance/attendance.service.ts` - Exclusion plannings suspendus

### Frontend
- `/frontend/lib/api/schedules.ts` - Type Schedule étendu
- `/frontend/app/(dashboard)/shifts-planning/page.tsx` - Affichage visuel

## Prochaines étapes

1. **Rendre la base de données accessible**
2. **Exécuter la migration Prisma**
3. **Redémarrer le backend** pour charger le nouveau Prisma Client
4. **Tester les scénarios** listés ci-dessus

---

**Implémentation réalisée le:** 2025-01-XX
**Documentation créée par:** Claude Code
