# Prompt d'Implémentation : Système de Remplacement d'Employés - Frontend

## 🎯 Contexte et Objectif

Vous devez implémenter un système complet de gestion des remplacements d'employés dans l'application PointageFlex. Le backend est déjà implémenté et fonctionnel avec tous les endpoints nécessaires. Votre tâche est de créer l'interface utilisateur frontend complète pour ce système.

## 📋 Vue d'Ensemble

Le système de remplacement permet aux managers et RH de :
1. **Créer des demandes de remplacement** quand un employé est absent
2. **Obtenir des suggestions intelligentes** de remplaçants avec scoring
3. **Approuver ou rejeter** les demandes de remplacement
4. **Visualiser l'historique** et les statistiques des remplacements
5. **Échanger des plannings** entre deux employés

**Important** : Le système est **NON-BLOQUANT** - il avertit seulement, ne bloque jamais (sauf contraintes techniques comme planning même jour).

---

## 🗄️ Structure des Données

### Interface Replacement (déjà définie dans `frontend/lib/api/schedules.ts`)

```typescript
interface Replacement {
  id: string;
  date: string; // ISO date string
  originalEmployeeId: string;
  replacementEmployeeId: string;
  shiftId: string;
  reason?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedBy?: string;
  approvedAt?: string;
  originalEmployee?: {
    id: string;
    firstName: string;
    lastName: string;
    matricule?: string;
  };
  replacementEmployee?: {
    id: string;
    firstName: string;
    lastName: string;
    matricule?: string;
  };
  shift?: {
    id: string;
    name: string;
    code: string;
  };
  originalSchedule?: {
    id: string;
    date: string;
    isReplaced: boolean;
  };
  replacementSchedule?: {
    id: string;
    date: string;
  };
  leave?: {
    id: string;
    startDate: string;
    endDate: string;
  };
}
```

### Interface Schedule (à enrichir)

```typescript
interface Schedule {
  id: string;
  employeeId: string;
  shiftId: string;
  date: string;
  isReplaced?: boolean; // Indique si le planning a été remplacé (soft delete)
  replacedAt?: string;
  replacedById?: string;
  employee?: any;
  shift?: any;
}
```

---

## 🔌 Endpoints API Disponibles

Tous les endpoints sont déjà implémentés dans `frontend/lib/api/schedules.ts` :

### 1. Créer un remplacement
```typescript
POST /schedules/replacements
Body: {
  date: string; // YYYY-MM-DD
  originalEmployeeId: string;
  replacementEmployeeId: string;
  shiftId: string;
  reason?: string;
  leaveId?: string; // Optionnel
}
```

### 2. Lister les remplacements
```typescript
GET /schedules/replacements?status=PENDING&startDate=2025-01-01&endDate=2025-02-28
Returns: Replacement[]
```

### 3. Approuver un remplacement
```typescript
PATCH /schedules/replacements/:id/approve
Returns: Replacement (avec replacementSchedule créé)
```

### 4. Rejeter un remplacement
```typescript
PATCH /schedules/replacements/:id/reject
Returns: Replacement
```

### 5. Obtenir des suggestions de remplaçants
```typescript
GET /schedules/replacements/suggestions?originalEmployeeId=xxx&date=2025-02-15&shiftId=yyy&teamId=zzz&siteId=aaa&maxSuggestions=10
Returns: {
  originalEmployee: {...},
  totalCandidates: number,
  suggestions: Array<{
    employee: {
      id: string;
      firstName: string;
      lastName: string;
      matricule: string;
      team?: string;
      site?: string;
    };
    score: number; // Score de pertinence (0-100+)
    reasons: string[]; // Raisons positives (ex: "Même équipe", "Repos suffisant")
    warnings: string[]; // Avertissements (ex: "⚠️ Repos insuffisant: 9h (minimum recommandé: 11h)")
    isEligible: boolean; // Toujours true (système non-bloquant)
  }>
}
```

### 6. Historique des remplacements
```typescript
GET /schedules/replacements/history?employeeId=xxx&startDate=2025-01-01&endDate=2025-02-28&status=APPROVED
Returns: Replacement[]
```

### 7. Statistiques des remplacements
```typescript
GET /schedules/replacements/stats?startDate=2025-01-01&endDate=2025-02-28
Returns: {
  total: number;
  byStatus: Array<{ status: string; count: number }>;
  byReason: Array<{ reason: string; count: number }>;
  topReplacers: Array<{ employeeId: string; employeeName: string; count: number }>;
  topReplaced: Array<{ employeeId: string; employeeName: string; count: number }>;
}
```

### 8. Créer un échange
```typescript
POST /schedules/replacements/exchange
Body: {
  date: string; // YYYY-MM-DD
  employeeAId: string;
  employeeBId: string;
  reason?: string;
}
```

### 9. Approuver un échange
```typescript
PATCH /schedules/replacements/exchange/:id/approve
Returns: Replacement (type: 'EXCHANGE')
```

---

## 🎨 Interface Utilisateur Requise

### Page : `/shifts-planning` (Page de planification existante)

#### 1. Vue Planning (Vue détaillée - Tableau)

**Localisation** : Dans la vue détaillée où les plannings sont affichés dans un tableau

**Modifications à apporter** :

a) **Indicateurs visuels pour plannings remplacés** :
   - Si `schedule.isReplaced === true` :
     - Le bloc du planning doit être **grisé** (opacity-50)
     - Texte **barré** (line-through)
     - Couleur de fond : `#9CA3AF` (gris) au lieu de la couleur normale du shift
     - Icône de remplacement visible (ex: `RefreshCw` de lucide-react, taille réduite)
     - Tooltip au survol : "Planning remplacé le [date]"

b) **Bouton "Remplacer" sur chaque planning** :
   - Ajouter un bouton avec icône `UserPlus` à côté du bouton de suppression (X)
   - Permissions requises : `schedule.create` ou `schedule.request_replacement`
   - Au clic : Ouvrir la modal `CreateReplacementModal` avec les données du planning pré-remplies

**Code de référence** : Le planning est affiché dans la cellule du tableau, environ ligne 887-909 dans `shifts-planning/page.tsx`

---

#### 2. Bouton "Remplacements" dans la barre d'actions

**Localisation** : Dans la section "Filtres et actions", à côté de "Créer un planning" et "Importer"

**Bouton** :
```tsx
<PermissionGate permissions={['schedule.view_all', 'schedule.view_own']}>
  <Button
    variant="outline"
    size="sm"
    onClick={() => router.push('/shifts-planning?tab=replacements')}
    // Ou utiliser un state local pour basculer entre onglets
  >
    <UserPlus className="h-4 w-4 mr-2" />
    Remplacements
  </Button>
</PermissionGate>
```

---

#### 3. Onglets dans la page (Optionnel mais recommandé)

Ajouter un système d'onglets pour basculer entre :
- **Onglet "Plannings"** : Vue actuelle des plannings
- **Onglet "Remplacements"** : Liste des remplacements (voir section suivante)

**Implémentation** :
```tsx
const [activeTab, setActiveTab] = useState<'schedules' | 'replacements'>('schedules');

// Dans le JSX
<div className="border-b border-gray-200">
  <nav className="flex space-x-8">
    <button
      onClick={() => setActiveTab('schedules')}
      className={`py-4 px-1 border-b-2 font-medium text-sm ${
        activeTab === 'schedules'
          ? 'border-primary text-primary'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
      }`}
    >
      Plannings
    </button>
    <PermissionGate permissions={['schedule.view_all', 'schedule.view_own']}>
      <button
        onClick={() => setActiveTab('replacements')}
        className={`py-4 px-1 border-b-2 font-medium text-sm ${
          activeTab === 'replacements'
            ? 'border-primary text-primary'
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
        }`}
      >
        Remplacements
      </button>
    </PermissionGate>
  </nav>
</div>

{activeTab === 'replacements' ? (
  <ReplacementsList />
) : (
  // Contenu actuel des plannings
)}
```

---

### Composant : `ReplacementsList`

**Fichier** : `frontend/components/schedules/ReplacementsList.tsx`

**Fonctionnalités** :

1. **Filtres** :
   - Statut (dropdown) : Tous / En attente / Approuvés / Rejetés
   - Date début (date picker)
   - Date fin (date picker)
   - Bouton "Réinitialiser"

2. **Tableau des remplacements** :
   - Colonnes :
     - Date
     - Employé Original (nom complet)
     - Employé Remplaçant (nom complet)
     - Shift (nom du shift)
     - Raison (texte tronqué si long)
     - Statut (Badge coloré : 🟡 En attente, 🟢 Approuvé, 🔴 Rejeté)
     - Actions

3. **Actions selon le statut** :
   - Si `PENDING` : Boutons "Approuver" (✓) et "Rejeter" (✗)
   - Si `APPROVED` : Affichage de la date d'approbation
   - Si `REJECTED` : Affichage de la date de rejet

4. **États** :
   - Loading : Spinner
   - Erreur : Message d'erreur
   - Vide : Message "Aucun remplacement trouvé"

**Hooks à utiliser** :
- `useReplacements(filters)` - Pour récupérer la liste
- `useApproveReplacement()` - Pour approuver
- `useRejectReplacement()` - Pour rejeter

---

### Composant : `CreateReplacementModal`

**Fichier** : `frontend/components/schedules/CreateReplacementModal.tsx`

**Props** :
```typescript
interface CreateReplacementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  schedule: {
    id: string;
    employeeId: string;
    employeeName?: string;
    date: string;
    shiftId: string;
    shiftName?: string;
  };
  employeesData?: any; // Pour la sélection de l'employé remplaçant
}
```

**Champs du formulaire** :

1. **Section "Informations du planning original"** (non modifiables, grisé) :
   - Date : Affichage formatée (ex: "15/02/2025")
   - Employé Original : Nom complet
   - Shift : Nom du shift

2. **Employé Remplaçant** (obligatoire) :
   - Utiliser le composant `SearchableEmployeeSelect`
   - Exclure l'employé original (`excludeEmployeeId={schedule.employeeId}`)
   - Bouton "Voir les suggestions" à côté

3. **Raison** (optionnel) :
   - Textarea avec placeholder : "Ex: Congé maladie, congé personnel, etc."

4. **Actions** :
   - Bouton "Annuler"
   - Bouton "Créer la demande" (disabled si pas d'employé remplaçant)

**Hook à utiliser** :
- `useCreateReplacement()` - Déjà implémenté dans `useSchedules.ts`

**Comportement** :
- Au succès : Fermer la modal, appeler `onSuccess()` pour rafraîchir les données
- En cas d'erreur : Afficher le message d'erreur dans une Alert

---

### Composant : `ReplacementSuggestionsModal`

**Fichier** : `frontend/components/schedules/ReplacementSuggestionsModal.tsx`

**Props** :
```typescript
interface ReplacementSuggestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (employeeId: string) => void; // Callback quand un candidat est sélectionné
  originalEmployeeId: string;
  date: string;
  shiftId: string;
  filters?: { teamId?: string; siteId?: string; departmentId?: string };
}
```

**Affichage** :

1. **Header** :
   - Titre : "Suggestions de Remplaçants"
   - Description : "Liste des candidats suggérés triés par pertinence"

2. **Liste des suggestions** (triée par score décroissant) :

   Pour chaque suggestion, afficher une carte avec :

   a) **En-tête de la carte** :
      - Nom complet de l'employé
      - Matricule (Badge)
      - Score avec badge coloré :
        - Vert si score >= 70
        - Jaune si score >= 40
        - Orange si score < 40
      - Équipe et Site (si disponible)
      - Bouton "Sélectionner"

   b) **Raisons positives** :
      - Liste avec icône ✓ (Check)
      - Couleur : vert
      - Exemples : "Même équipe", "Même site", "Repos suffisant"

   c) **Avertissements** (si présents) :
      - Liste avec icône ⚠️ (AlertTriangle)
      - Couleur : jaune/orange
      - Exemples : "⚠️ Repos insuffisant: 9h (minimum recommandé: 11h)"

3. **États** :
   - Loading : Spinner
   - Erreur : Message d'erreur
   - Vide : "Aucune suggestion disponible"

4. **Action** :
   - Bouton "Fermer" en bas

**API à utiliser** :
- Ajouter dans `schedules.ts` :
```typescript
getReplacementSuggestions: async (
  originalEmployeeId: string,
  date: string,
  shiftId: string,
  filters?: { teamId?: string; siteId?: string; departmentId?: string; maxSuggestions?: number }
) => {
  const response = await apiClient.get('/schedules/replacements/suggestions', {
    params: {
      originalEmployeeId,
      date,
      shiftId,
      ...filters,
    },
  });
  return response.data;
}
```

---

## 🔄 Workflows et Règles Métier

### Workflow 1 : Créer un Remplacement

1. **Déclenchement** : Clic sur le bouton "Remplacer" (icône UserPlus) sur un planning dans la vue détaillée

2. **Ouverture de la modal** :
   - Modal `CreateReplacementModal` s'ouvre
   - Les champs sont pré-remplis avec les données du planning sélectionné

3. **Optionnel - Voir les suggestions** :
   - Clic sur "Voir les suggestions"
   - Modal `ReplacementSuggestionsModal` s'ouvre
   - L'utilisateur peut sélectionner un candidat
   - La modal de suggestions se ferme
   - La modal de création revient avec l'employé sélectionné

4. **Soumission** :
   - Validation : Employé remplaçant obligatoire
   - Appel API : `POST /schedules/replacements`
   - En cas de succès :
     - Toast : "Demande de remplacement créée"
     - Fermeture de la modal
     - Rafraîchissement de la liste des plannings
     - Le planning original reste visible (pas encore remplacé, statut PENDING)

5. **Gestion des erreurs** :
   - **Planning même jour (bloque)** : Message "L'employé remplaçant a déjà un planning le [date]"
   - **Employé inactif (bloque)** : Message "L'employé est inactif"
   - **Autres erreurs** : Afficher le message d'erreur de l'API

6. **Avertissements (ne bloquent PAS)** :
   - Les avertissements sont loggés côté backend mais ne doivent pas bloquer la création
   - Si nécessaire, afficher les warnings dans la console ou dans une Alert info (optionnel)

---

### Workflow 2 : Approuver un Remplacement

1. **Déclenchement** : Dans `ReplacementsList`, clic sur le bouton "Approuver" (✓) d'un remplacement avec statut `PENDING`

2. **Confirmation** : Demander confirmation ("Êtes-vous sûr de vouloir approuver ce remplacement ?")

3. **Appel API** : `PATCH /schedules/replacements/:id/approve`

4. **En cas de succès** :
   - Toast : "Remplacement approuvé"
   - Rafraîchissement de la liste
   - Le statut passe à `APPROVED`
   - Dans la vue planning :
     - Le planning original devient grisé/barré (`isReplaced = true`)
     - Un nouveau planning apparaît pour l'employé remplaçant
     - Indicateur visuel du lien entre les deux plannings

5. **Avertissements** : Les warnings sont loggés mais ne bloquent pas l'approbation

---

### Workflow 3 : Rejeter un Remplacement

1. **Déclenchement** : Clic sur le bouton "Rejeter" (✗)

2. **Confirmation** : Demander confirmation

3. **Appel API** : `PATCH /schedules/replacements/:id/reject`

4. **En cas de succès** :
   - Toast : "Remplacement rejeté"
   - Statut passe à `REJECTED`
   - Le planning original reste inchangé (pas de soft delete)

---

### Workflow 4 : Consulter les Suggestions

1. **Déclenchement** : Bouton "Voir les suggestions" dans `CreateReplacementModal`

2. **Ouverture de la modal** :
   - Modal `ReplacementSuggestionsModal` s'ouvre
   - Appel API immédiat : `GET /schedules/replacements/suggestions`

3. **Affichage** :
   - Liste triée par score décroissant
   - Chaque candidat affiche : score, raisons, avertissements

4. **Sélection** :
   - Clic sur "Sélectionner" pour un candidat
   - Callback `onSelect(employeeId)` est appelé
   - La modal se ferme
   - L'employé est pré-rempli dans `CreateReplacementModal`

---

## 🎨 Design et Style

### Badges de Statut

```tsx
// PENDING
<Badge className="bg-yellow-100 text-yellow-700 border-yellow-300">En attente</Badge>

// APPROVED
<Badge className="bg-green-100 text-green-700 border-green-300">Approuvé</Badge>

// REJECTED
<Badge className="bg-red-100 text-red-700 border-red-300">Rejeté</Badge>
```

### Badges de Score (Suggestions)

```tsx
const getScoreColor = (score: number) => {
  if (score >= 70) return 'bg-green-100 text-green-700 border-green-300';
  if (score >= 40) return 'bg-yellow-100 text-yellow-700 border-yellow-300';
  return 'bg-orange-100 text-orange-700 border-orange-300';
};
```

### Indicateur de Planning Remplacé

```tsx
{schedule.isReplaced && (
  <div
    className="px-2 py-1 rounded text-xs font-medium text-white opacity-50 line-through"
    style={{ backgroundColor: '#9CA3AF' }}
    title={`Planning remplacé le ${format(new Date(schedule.replacedAt), 'dd/MM/yyyy')}`}
  >
    {schedule.customStartTime || shift.startTime}
    <RefreshCw className="h-2 w-2 inline-block ml-1" />
  </div>
)}
```

---

## 🔐 Permissions Requises

- `schedule.create` : Créer des remplacements
- `schedule.request_replacement` : Demander des remplacements
- `schedule.view_all` : Voir tous les remplacements
- `schedule.view_own` : Voir ses propres remplacements
- `schedule.approve` : Approuver/rejeter des remplacements

Utiliser le composant `PermissionGate` pour protéger les actions.

---

## 📦 Hooks Existants (déjà implémentés)

Dans `frontend/lib/hooks/useSchedules.ts` :

- ✅ `useReplacements(filters)` - Liste des remplacements
- ✅ `useCreateReplacement()` - Créer un remplacement
- ✅ `useApproveReplacement()` - Approuver
- ✅ `useRejectReplacement()` - Rejeter

**À ajouter** (optionnel, pour les suggestions) :
```typescript
export function useReplacementSuggestions(
  originalEmployeeId: string,
  date: string,
  shiftId: string,
  filters?: { teamId?: string; siteId?: string; departmentId?: string }
) {
  return useQuery({
    queryKey: ['replacementSuggestions', originalEmployeeId, date, shiftId, filters],
    queryFn: () => schedulesApi.getReplacementSuggestions(originalEmployeeId, date, shiftId, filters),
    enabled: !!originalEmployeeId && !!date && !!shiftId,
  });
}
```

---

## ✅ Checklist d'Implémentation

### Composants à créer/modifier :

- [ ] **`ReplacementsList.tsx`** : Composant complet pour lister et gérer les remplacements
- [ ] **`CreateReplacementModal.tsx`** : Modal de création avec formulaire
- [ ] **`ReplacementSuggestionsModal.tsx`** : Modal pour afficher les suggestions
- [ ] **`shifts-planning/page.tsx`** : 
  - [ ] Ajouter indicateurs visuels pour plannings remplacés
  - [ ] Ajouter bouton "Remplacer" sur chaque planning
  - [ ] Ajouter bouton "Remplacements" dans la barre d'actions
  - [ ] (Optionnel) Ajouter système d'onglets
  - [ ] Intégrer les modals

### API à compléter :

- [ ] Ajouter `getReplacementSuggestions` dans `frontend/lib/api/schedules.ts`

### Hooks (optionnel) :

- [ ] Ajouter `useReplacementSuggestions` dans `useSchedules.ts`

### Types/Interfaces :

- [ ] S'assurer que `Schedule` inclut `isReplaced`, `replacedAt`, `replacedById`
- [ ] S'assurer que `Replacement` inclut toutes les relations nécessaires

---

## 📝 Exemples de Code

### Exemple 1 : Ajouter le bouton "Remplacer" dans le tableau

```tsx
// Dans la cellule du planning (vue détaillée)
{schedule ? (
  <div className="flex flex-col items-center gap-1">
    {/* Bloc du planning */}
    <div
      className={`px-2 py-1 rounded text-xs font-medium text-white ${
        schedule.isReplaced ? 'opacity-50 line-through' : ''
      }`}
      style={{
        backgroundColor: schedule.isReplaced 
          ? '#9CA3AF' 
          : (selectedShiftDetails.color || '#3B82F6'),
      }}
      title={schedule.isReplaced ? `Planning remplacé le ${format(new Date(schedule.replacedAt), 'dd/MM/yyyy')}` : ''}
    >
      {schedule.customStartTime || selectedShiftDetails.startTime}
      {schedule.isReplaced && (
        <RefreshCw className="h-2 w-2 inline-block ml-1" />
      )}
    </div>
    <div className="text-xs text-text-secondary">
      {schedule.customEndTime || selectedShiftDetails.endTime}
    </div>
    
    {/* Boutons d'action */}
    <div className="flex gap-1 mt-1">
      {!schedule.isReplaced && (
        <PermissionGate permissions={['schedule.create', 'schedule.request_replacement']}>
          <Button
            variant="outline"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              // Trouver l'employé et le shift
              const employee = employeesData?.data?.find((emp: any) => emp.id === schedule.employeeId) || 
                             employeesData?.find((emp: any) => emp.id === schedule.employeeId);
              const shift = shiftsData?.data?.find((s: any) => s.id === schedule.shiftId) ||
                           shiftsData?.find((s: any) => s.id === schedule.shiftId);
              
              setSelectedScheduleForReplacement({
                id: schedule.id,
                employeeId: schedule.employeeId,
                employeeName: employee ? `${employee.firstName} ${employee.lastName}` : undefined,
                date: schedule.date,
                shiftId: schedule.shiftId,
                shiftName: shift?.name,
              });
              setShowReplacementModal(true);
            }}
            title="Remplacer ce planning"
          >
            <UserPlus className="h-3 w-3" />
          </Button>
        </PermissionGate>
      )}
      <PermissionGate permissions={['schedule.delete', 'schedule.manage_team']}>
        <Button
          variant="outline"
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={() => handleDeleteSchedule(schedule.id)}
        >
          <X className="h-3 w-3" />
        </Button>
      </PermissionGate>
    </div>
  </div>
) : (
  <span className="text-text-secondary text-xs">-</span>
)}
```

---

### Exemple 2 : Structure complète de ReplacementsList

```tsx
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Check, X, AlertTriangle } from 'lucide-react';
import { useReplacements, useApproveReplacement, useRejectReplacement } from '@/lib/hooks/useSchedules';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { PermissionGate } from '@/components/auth/PermissionGate';

export function ReplacementsList() {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const { data: replacements, isLoading, error } = useReplacements({
    status: statusFilter || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  const approveMutation = useApproveReplacement();
  const rejectMutation = useRejectReplacement();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300">En attente</Badge>;
      case 'APPROVED':
        return <Badge className="bg-green-100 text-green-700 border-green-300">Approuvé</Badge>;
      case 'REJECTED':
        return <Badge className="bg-red-100 text-red-700 border-red-300">Rejeté</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const handleApprove = async (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir approuver ce remplacement ?')) {
      await approveMutation.mutateAsync(id);
    }
  };

  const handleReject = async (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir rejeter ce remplacement ?')) {
      await rejectMutation.mutateAsync(id);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestion des Remplacements</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Filtres */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div>
            <Label htmlFor="status">Statut</Label>
            <select
              id="status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">Tous</option>
              <option value="PENDING">En attente</option>
              <option value="APPROVED">Approuvés</option>
              <option value="REJECTED">Rejetés</option>
            </select>
          </div>
          <div>
            <Label htmlFor="startDate">Date début</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="endDate">Date fin</Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate}
            />
          </div>
          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={() => {
                setStatusFilter('');
                setStartDate('');
                setEndDate('');
              }}
            >
              Réinitialiser
            </Button>
          </div>
        </div>

        {/* Liste */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <Alert variant="danger">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>Erreur lors du chargement des remplacements</AlertDescription>
          </Alert>
        ) : !replacements || replacements.length === 0 ? (
          <div className="text-center py-12 text-gray-500">Aucun remplacement trouvé</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Employé Original</TableHead>
                  <TableHead>Employé Remplaçant</TableHead>
                  <TableHead>Shift</TableHead>
                  <TableHead>Raison</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {replacements.map((replacement: any) => (
                  <TableRow key={replacement.id}>
                    <TableCell>
                      {format(new Date(replacement.date), 'dd/MM/yyyy', { locale: fr })}
                    </TableCell>
                    <TableCell>
                      {replacement.originalEmployee
                        ? `${replacement.originalEmployee.firstName} ${replacement.originalEmployee.lastName}`
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {replacement.replacementEmployee
                        ? `${replacement.replacementEmployee.firstName} ${replacement.replacementEmployee.lastName}`
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {replacement.shift?.name || replacement.shiftId}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {replacement.reason || '-'}
                    </TableCell>
                    <TableCell>{getStatusBadge(replacement.status)}</TableCell>
                    <TableCell>
                      {replacement.status === 'PENDING' && (
                        <div className="flex gap-2">
                          <PermissionGate permissions={['schedule.approve']}>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleApprove(replacement.id)}
                              disabled={approveMutation.isPending}
                              title="Approuver"
                            >
                              <Check className="h-4 w-4 text-green-600" />
                            </Button>
                          </PermissionGate>
                          <PermissionGate permissions={['schedule.approve']}>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleReject(replacement.id)}
                              disabled={rejectMutation.isPending}
                              title="Rejeter"
                            >
                              <X className="h-4 w-4 text-red-600" />
                            </Button>
                          </PermissionGate>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

---

## 🚨 Points d'Attention

1. **Système non-bloquant** : Les avertissements ne doivent jamais empêcher la création/approbation d'un remplacement (sauf contraintes techniques comme planning même jour)

2. **Rafraîchissement des données** : Après création/approbation/rejet, rafraîchir :
   - La liste des remplacements
   - La liste des plannings (pour voir les changements visuels)

3. **Gestion des erreurs** : Toujours afficher des messages d'erreur clairs et compréhensibles

4. **Permissions** : Utiliser `PermissionGate` pour toutes les actions qui nécessitent des permissions

5. **Loading states** : Afficher des indicateurs de chargement pendant les appels API

6. **Confirmations** : Demander confirmation pour les actions critiques (approuver, rejeter)

---

## 📚 Ressources et Références

- **API Backend** : Tous les endpoints sont documentés dans le contrôleur NestJS
- **Hooks existants** : `frontend/lib/hooks/useSchedules.ts`
- **API Client** : `frontend/lib/api/schedules.ts`
- **Composants UI** : Utiliser les composants de `@/components/ui/`
- **Icons** : Utiliser `lucide-react` (déjà importé dans le projet)

---

Ce prompt contient toutes les informations nécessaires pour implémenter complètement le système de remplacement côté frontend. Suivez cette structure et ces exemples pour créer une interface utilisateur complète et fonctionnelle.
