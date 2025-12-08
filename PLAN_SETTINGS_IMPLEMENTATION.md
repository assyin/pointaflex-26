# Plan d'Action: Rendre l'Interface Settings Entièrement Fonctionnelle

## Analyse de l'Existant

### Données Mockup Actuelles (Lignes 78-112)
- ✗ Informations entreprise (hardcoded)
- ✗ Paramètres régionaux (hardcoded)
- ✗ Politique horaire (hardcoded)
- ✗ Utilisateurs (3 utilisateurs mockup)
- ✗ Jours fériés (3 jours mockup)
- ✗ **Aucune connexion API**
- ✗ **Aucune sauvegarde des modifications**

### Fonctionnalités Manquantes
1. Gestion des **Sites** (nouvelle fonctionnalité demandée)
2. Gestion complète des **Jours Fériés** (intégration avec le générateur)
3. Connexion avec le backend pour charger/sauvegarder les paramètres
4. Gestion réelle des utilisateurs

---

## PHASE 1: Backend - Création des APIs Nécessaires

### 1.1. Créer le Module Tenant Settings

**Fichier:** `backend/src/modules/tenants/dto/tenant-settings.dto.ts`

```typescript
export class UpdateTenantSettingsDto {
  // Company Info
  legalName?: string;
  displayName?: string;
  country?: string;
  city?: string;
  hrEmail?: string;
  phone?: string;
  logo?: string;

  // Regional Settings
  timezone?: string;
  language?: string;
  firstDayOfWeek?: string;
  workingDays?: string[];

  // Time Policy
  lateToleranceEntry?: number;  // minutes
  earlyToleranceExit?: number;  // minutes
  overtimeRounding?: number;    // 15, 30, or 60
  nightShiftStart?: string;     // HH:mm
  nightShiftEnd?: string;       // HH:mm

  // Leave Rules
  twoLevelWorkflow?: boolean;
  anticipatedLeave?: boolean;

  // Export Settings
  monthlyPayrollEmail?: boolean;
  sfptExport?: boolean;
}
```

### 1.2. Ajouter des Champs à la Table Tenant

**Fichier:** `backend/prisma/schema.prisma`

```prisma
model Tenant {
  // ... champs existants

  // Company Info
  legalName              String?
  displayName            String?
  country                String        @default("Maroc")
  city                   String?
  hrEmail                String?
  phone                  String?
  logo                   String?

  // Regional Settings
  timezone               String        @default("Africa/Casablanca")
  language               String        @default("fr")
  firstDayOfWeek         String        @default("monday")
  workingDays            Json?         // ["monday", "tuesday", ...]

  // Time Policy
  lateToleranceEntry     Int           @default(10)   // minutes
  earlyToleranceExit     Int           @default(5)    // minutes
  overtimeRounding       Int           @default(15)   // 15, 30, 60
  nightShiftStart        String        @default("21:00")
  nightShiftEnd          String        @default("06:00")

  // Leave Rules
  twoLevelWorkflow       Boolean       @default(true)
  anticipatedLeave       Boolean       @default(false)

  // Export Settings
  monthlyPayrollEmail    Boolean       @default(false)
  sfptExport             Boolean       @default(false)

  // Relations
  sites                  Site[]
  holidays               Holiday[]
}
```

### 1.3. Créer le Modèle Site

**Nouveau Modèle:** `Site`

```prisma
model Site {
  id                String        @id @default(uuid())
  name              String
  code              String
  address           String?
  city              String?
  phone             String?
  tenantId          String
  tenant            Tenant        @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  // Paramètres spécifiques au site
  workingDays       Json?         // Peut différer du tenant
  timezone          String?       // Peut différer du tenant

  // Relations
  employees         Employee[]
  devices           AttendanceDevice[]

  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt

  @@unique([tenantId, code])
  @@index([tenantId])
}
```

### 1.4. Créer le Modèle Holiday

**Nouveau Modèle:** `Holiday`

```prisma
model Holiday {
  id                String        @id @default(uuid())
  name              String
  date              DateTime
  type              HolidayType   @default(NATIONAL)
  isRecurring       Boolean       @default(false)

  tenantId          String
  tenant            Tenant        @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt

  @@index([tenantId])
  @@index([tenantId, date])
}

enum HolidayType {
  NATIONAL
  COMPANY
  RELIGIOUS
}
```

### 1.5. Endpoints Backend à Créer

**Fichier:** `backend/src/modules/tenants/tenants.controller.ts`

```typescript
// GET /api/v1/tenants/settings
@Get('settings')
async getSettings(@CurrentUser() user: any) {
  return this.tenantsService.getSettings(user.tenantId);
}

// PATCH /api/v1/tenants/settings
@Patch('settings')
async updateSettings(
  @CurrentUser() user: any,
  @Body() dto: UpdateTenantSettingsDto,
) {
  return this.tenantsService.updateSettings(user.tenantId, dto);
}

// POST /api/v1/tenants/logo
@Post('logo')
@UseInterceptors(FileInterceptor('file'))
async uploadLogo(
  @CurrentUser() user: any,
  @UploadedFile() file: Express.Multer.File,
) {
  return this.tenantsService.uploadLogo(user.tenantId, file);
}
```

**Nouveau Module Sites:**

```typescript
// POST /api/v1/sites
@Post()
async create(@CurrentUser() user: any, @Body() dto: CreateSiteDto) {
  return this.sitesService.create(user.tenantId, dto);
}

// GET /api/v1/sites
@Get()
async findAll(@CurrentUser() user: any) {
  return this.sitesService.findAll(user.tenantId);
}

// PATCH /api/v1/sites/:id
@Patch(':id')
async update(@Param('id') id: string, @Body() dto: UpdateSiteDto) {
  return this.sitesService.update(id, dto);
}

// DELETE /api/v1/sites/:id
@Delete(':id')
async remove(@Param('id') id: string) {
  return this.sitesService.remove(id);
}
```

**Nouveau Module Holidays:**

```typescript
// GET /api/v1/holidays
@Get()
async findAll(
  @CurrentUser() user: any,
  @Query('year') year?: string,
) {
  return this.holidaysService.findAll(user.tenantId, year);
}

// POST /api/v1/holidays
@Post()
async create(@CurrentUser() user: any, @Body() dto: CreateHolidayDto) {
  return this.holidaysService.create(user.tenantId, dto);
}

// PATCH /api/v1/holidays/:id
@Patch(':id')
async update(@Param('id') id: string, @Body() dto: UpdateHolidayDto) {
  return this.holidaysService.update(id, dto);
}

// DELETE /api/v1/holidays/:id
@Delete(':id')
async remove(@Param('id') id: string) {
  return this.holidaysService.remove(id);
}

// POST /api/v1/holidays/import-csv
@Post('import-csv')
@UseInterceptors(FileInterceptor('file'))
async importCsv(
  @CurrentUser() user: any,
  @UploadedFile() file: Express.Multer.File,
) {
  return this.holidaysService.importFromCsv(user.tenantId, file);
}
```

---

## PHASE 2: Frontend - Connexion API et Fonctionnalités

### 2.1. Créer les API Clients

**Fichier:** `frontend/lib/api/tenants.ts`

```typescript
export interface TenantSettings {
  // Company Info
  legalName: string;
  displayName: string;
  country: string;
  city: string;
  hrEmail: string;
  phone: string;
  logo?: string;

  // Regional Settings
  timezone: string;
  language: string;
  firstDayOfWeek: string;
  workingDays: string[];

  // Time Policy
  lateToleranceEntry: number;
  earlyToleranceExit: number;
  overtimeRounding: number;
  nightShiftStart: string;
  nightShiftEnd: string;

  // Leave Rules
  twoLevelWorkflow: boolean;
  anticipatedLeave: boolean;

  // Export Settings
  monthlyPayrollEmail: boolean;
  sfptExport: boolean;
}

export const tenantsApi = {
  getSettings: async () => {
    const response = await apiClient.get('/tenants/settings');
    return response.data;
  },

  updateSettings: async (data: Partial<TenantSettings>) => {
    const response = await apiClient.patch('/tenants/settings', data);
    return response.data;
  },

  uploadLogo: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/tenants/logo', formData);
    return response.data;
  },
};
```

**Fichier:** `frontend/lib/api/sites.ts`

```typescript
export interface Site {
  id: string;
  name: string;
  code: string;
  address?: string;
  city?: string;
  phone?: string;
  workingDays?: string[];
  timezone?: string;
}

export interface CreateSiteDto {
  name: string;
  code: string;
  address?: string;
  city?: string;
  phone?: string;
  workingDays?: string[];
  timezone?: string;
}

export const sitesApi = {
  getAll: async () => {
    const response = await apiClient.get('/sites');
    return response.data;
  },

  create: async (data: CreateSiteDto) => {
    const response = await apiClient.post('/sites', data);
    return response.data;
  },

  update: async (id: string, data: Partial<CreateSiteDto>) => {
    const response = await apiClient.patch(`/sites/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/sites/${id}`);
    return response.data;
  },
};
```

**Fichier:** `frontend/lib/api/holidays.ts`

```typescript
export interface Holiday {
  id: string;
  name: string;
  date: string;
  type: 'NATIONAL' | 'COMPANY' | 'RELIGIOUS';
  isRecurring: boolean;
}

export interface CreateHolidayDto {
  name: string;
  date: string;
  type: 'NATIONAL' | 'COMPANY' | 'RELIGIOUS';
  isRecurring: boolean;
}

export const holidaysApi = {
  getAll: async (year?: string) => {
    const response = await apiClient.get('/holidays', { params: { year } });
    return response.data;
  },

  create: async (data: CreateHolidayDto) => {
    const response = await apiClient.post('/holidays', data);
    return response.data;
  },

  update: async (id: string, data: Partial<CreateHolidayDto>) => {
    const response = await apiClient.patch(`/holidays/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/holidays/${id}`);
    return response.data;
  },

  importCsv: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/holidays/import-csv', formData);
    return response.data;
  },
};
```

### 2.2. Créer les React Hooks

**Fichier:** `frontend/lib/hooks/useTenantSettings.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tenantsApi } from '@/lib/api/tenants';
import { toast } from 'sonner';

export function useTenantSettings() {
  return useQuery({
    queryKey: ['tenant-settings'],
    queryFn: tenantsApi.getSettings,
  });
}

export function useUpdateTenantSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: tenantsApi.updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-settings'] });
      toast.success('Paramètres enregistrés avec succès');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la sauvegarde');
    },
  });
}

export function useUploadLogo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: tenantsApi.uploadLogo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-settings'] });
      toast.success('Logo mis à jour');
    },
    onError: (error: any) => {
      toast.error('Erreur lors du téléchargement du logo');
    },
  });
}
```

**Fichier:** `frontend/lib/hooks/useSites.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sitesApi } from '@/lib/api/sites';
import { toast } from 'sonner';

export function useSites() {
  return useQuery({
    queryKey: ['sites'],
    queryFn: sitesApi.getAll,
  });
}

export function useCreateSite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: sitesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      toast.success('Site créé avec succès');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la création');
    },
  });
}

export function useUpdateSite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      sitesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      toast.success('Site mis à jour');
    },
  });
}

export function useDeleteSite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: sitesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      toast.success('Site supprimé');
    },
  });
}
```

**Fichier:** `frontend/lib/hooks/useHolidays.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { holidaysApi } from '@/lib/api/holidays';
import { toast } from 'sonner';

export function useHolidays(year?: string) {
  return useQuery({
    queryKey: ['holidays', year],
    queryFn: () => holidaysApi.getAll(year),
  });
}

export function useCreateHoliday() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: holidaysApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      toast.success('Jour férié ajouté');
    },
  });
}

export function useUpdateHoliday() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      holidaysApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      toast.success('Jour férié mis à jour');
    },
  });
}

export function useDeleteHoliday() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: holidaysApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      toast.success('Jour férié supprimé');
    },
  });
}
```

### 2.3. Refactoriser la Page Settings

**Modifications principales dans `frontend/app/(dashboard)/settings/page.tsx`:**

1. **Remplacer les states mockup par des hooks React Query**
2. **Ajouter une nouvelle section "Gestion des Sites"**
3. **Intégrer la gestion des jours fériés avec l'API**
4. **Connecter les boutons "Enregistrer" avec les mutations**

**Exemple de refactorisation:**

```typescript
export default function SettingsPage() {
  // Remplacer les useState mockup par des hooks
  const { data: settings, isLoading } = useTenantSettings();
  const updateSettings = useUpdateTenantSettings();
  const { data: sites } = useSites();
  const { data: holidays } = useHolidays();

  // Local state pour les modifications
  const [localSettings, setLocalSettings] = useState<any>(null);

  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    }
  }, [settings]);

  const handleSave = async () => {
    await updateSettings.mutateAsync(localSettings);
  };

  // ... reste du code
}
```

### 2.4. Créer un Modal pour Ajouter un Site

**Nouveau Composant:** `frontend/components/settings/CreateSiteModal.tsx`

```typescript
export function CreateSiteModal({ onClose, onSuccess }: Props) {
  const [formData, setFormData] = useState<CreateSiteDto>({
    name: '',
    code: '',
    address: '',
    city: '',
    phone: '',
  });

  const createSite = useCreateSite();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createSite.mutateAsync(formData);
    onSuccess();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Ajouter un nouveau site</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            {/* Formulaire complet */}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

### 2.5. Créer un Modal pour Gérer les Jours Fériés

**Nouveau Composant:** `frontend/components/settings/HolidayModal.tsx`

```typescript
export function HolidayModal({ holiday, onClose, onSuccess }: Props) {
  const [formData, setFormData] = useState<CreateHolidayDto>({
    name: holiday?.name || '',
    date: holiday?.date || '',
    type: holiday?.type || 'NATIONAL',
    isRecurring: holiday?.isRecurring || false,
  });

  const createHoliday = useCreateHoliday();
  const updateHoliday = useUpdateHoliday();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (holiday) {
      await updateHoliday.mutateAsync({ id: holiday.id, data: formData });
    } else {
      await createHoliday.mutateAsync(formData);
    }
    onSuccess();
  };

  return (
    // Modal UI...
  );
}
```

---

## PHASE 3: Intégration avec le Générateur de Jours Fériés

### 3.1. Modifier le Générateur de Jours Fériés

**Fichier:** `backend/src/modules/data-generator/data-generator-holidays.service.ts`

Actuellement, le générateur crée des jours fériés temporaires. Il faut:

1. **Sauvegarder dans la table Holiday** au lieu de seulement générer
2. **Éviter les doublons** lors de la génération
3. **Permettre l'édition** après génération

```typescript
async generateHolidays(tenantId: string, dto: GenerateHolidaysDto) {
  // Générer les jours fériés
  const holidays = this.generateMoroccanHolidays(dto.year);

  // Sauvegarder dans la base de données
  const createdHolidays = [];
  for (const holiday of holidays) {
    // Vérifier si existe déjà
    const existing = await this.prisma.holiday.findFirst({
      where: {
        tenantId,
        date: new Date(holiday.date),
        name: holiday.name,
      },
    });

    if (!existing) {
      const created = await this.prisma.holiday.create({
        data: {
          tenantId,
          name: holiday.name,
          date: new Date(holiday.date),
          type: holiday.isNational ? 'NATIONAL' : 'COMPANY',
          isRecurring: holiday.isRecurring || false,
        },
      });
      createdHolidays.push(created);
    }
  }

  return {
    generated: createdHolidays.length,
    holidays: createdHolidays,
  };
}
```

### 3.2. Afficher les Jours Générés dans Settings

Dans la page Settings, afficher les jours fériés générés depuis le générateur:

```typescript
// Dans settings/page.tsx
const { data: holidays } = useHolidays(new Date().getFullYear().toString());

// Afficher dans la section "Jours fériés"
{holidays?.map(holiday => (
  <div key={holiday.id} className="flex items-center justify-between">
    <span>{holiday.name} - {format(new Date(holiday.date), 'dd/MM/yyyy')}</span>
    <div>
      <Button onClick={() => handleEditHoliday(holiday)}>Modifier</Button>
      <Button onClick={() => handleDeleteHoliday(holiday.id)}>Supprimer</Button>
    </div>
  </div>
))}
```

---

## PHASE 4: Nouvelle Section "Gestion des Sites"

### 4.1. Ajouter une Nouvelle Section dans Settings

**Position:** Après la section "Informations entreprise"

```typescript
{/* Sites Management */}
<div className="bg-white rounded-lg border border-gray-200">
  <div className="p-6 border-b border-gray-200">
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-[18px] font-semibold text-[#212529]">
          Gestion des Sites
        </h2>
        <p className="text-[13px] text-[#6C757D] mt-0.5">
          Gérer les différents sites/emplacements de votre entreprise
        </p>
      </div>
      <Button onClick={() => setShowCreateSiteModal(true)}>
        <Plus className="w-4 h-4 mr-2" />
        Nouveau site
      </Button>
    </div>
  </div>

  <div className="p-6">
    {sites?.data?.map((site: Site) => (
      <div key={site.id} className="flex items-center justify-between p-4 border rounded-lg mb-2">
        <div>
          <h3 className="font-semibold">{site.name}</h3>
          <p className="text-sm text-gray-600">{site.code} - {site.city}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handleEditSite(site)}>
            <Edit className="w-4 h-4" />
          </Button>
          <Button variant="danger" size="sm" onClick={() => handleDeleteSite(site.id)}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    ))}
  </div>
</div>
```

---

## ORDRE D'IMPLÉMENTATION RECOMMANDÉ

### Étape 1: Backend Foundation (Jour 1-2)
1. ✅ Mettre à jour le schéma Prisma (ajouter champs à Tenant + modèles Site & Holiday)
2. ✅ Exécuter `npx prisma migrate dev --name add-tenant-settings-sites-holidays`
3. ✅ Créer le module Sites (controller + service + DTOs)
4. ✅ Créer le module Holidays (controller + service + DTOs)
5. ✅ Ajouter les endpoints settings au TenantController
6. ✅ Tester les APIs avec Postman/Swagger

### Étape 2: Frontend API Layer (Jour 3)
7. ✅ Créer `frontend/lib/api/tenants.ts`
8. ✅ Créer `frontend/lib/api/sites.ts`
9. ✅ Créer `frontend/lib/api/holidays.ts`
10. ✅ Créer les hooks React Query correspondants

### Étape 3: Frontend UI - Sites (Jour 4)
11. ✅ Créer le composant `CreateSiteModal.tsx`
12. ✅ Créer le composant `EditSiteModal.tsx`
13. ✅ Ajouter la section "Gestion des Sites" dans settings/page.tsx
14. ✅ Tester la création/modification/suppression de sites

### Étape 4: Frontend UI - Jours Fériés (Jour 5)
15. ✅ Créer le composant `HolidayModal.tsx`
16. ✅ Connecter la section jours fériés avec l'API
17. ✅ Implémenter l'import CSV
18. ✅ Tester l'ajout/modification/suppression de jours fériés

### Étape 5: Frontend UI - Paramètres Généraux (Jour 6)
19. ✅ Remplacer les données mockup par les hooks React Query
20. ✅ Connecter le formulaire de company info avec l'API
21. ✅ Connecter les paramètres régionaux avec l'API
22. ✅ Connecter la politique horaire avec l'API
23. ✅ Implémenter l'upload de logo

### Étape 6: Intégration Générateur (Jour 7)
24. ✅ Modifier le générateur pour sauvegarder dans la table Holiday
25. ✅ Synchroniser les jours générés avec la page Settings
26. ✅ Tester le flux complet : Générateur → Settings

### Étape 7: Tests & Polish (Jour 8)
27. ✅ Tests E2E de tous les workflows
28. ✅ Gestion des erreurs et messages de validation
29. ✅ Amélioration UX (loading states, confirmations)
30. ✅ Documentation

---

## FICHIERS À CRÉER/MODIFIER

### Backend
- ✅ `prisma/schema.prisma` (modifier Tenant + ajouter Site & Holiday)
- ✅ `src/modules/sites/sites.module.ts` (NOUVEAU)
- ✅ `src/modules/sites/sites.controller.ts` (NOUVEAU)
- ✅ `src/modules/sites/sites.service.ts` (NOUVEAU)
- ✅ `src/modules/sites/dto/create-site.dto.ts` (NOUVEAU)
- ✅ `src/modules/sites/dto/update-site.dto.ts` (NOUVEAU)
- ✅ `src/modules/holidays/holidays.module.ts` (NOUVEAU)
- ✅ `src/modules/holidays/holidays.controller.ts` (NOUVEAU)
- ✅ `src/modules/holidays/holidays.service.ts` (NOUVEAU)
- ✅ `src/modules/holidays/dto/create-holiday.dto.ts` (NOUVEAU)
- ✅ `src/modules/holidays/dto/update-holiday.dto.ts` (NOUVEAU)
- ✅ `src/modules/tenants/tenants.controller.ts` (modifier)
- ✅ `src/modules/tenants/tenants.service.ts` (modifier)
- ✅ `src/modules/tenants/dto/tenant-settings.dto.ts` (NOUVEAU)
- ✅ `src/modules/data-generator/data-generator-holidays.service.ts` (modifier)

### Frontend
- ✅ `lib/api/tenants.ts` (NOUVEAU)
- ✅ `lib/api/sites.ts` (NOUVEAU)
- ✅ `lib/api/holidays.ts` (NOUVEAU)
- ✅ `lib/hooks/useTenantSettings.ts` (NOUVEAU)
- ✅ `lib/hooks/useSites.ts` (NOUVEAU)
- ✅ `lib/hooks/useHolidays.ts` (NOUVEAU)
- ✅ `components/settings/CreateSiteModal.tsx` (NOUVEAU)
- ✅ `components/settings/EditSiteModal.tsx` (NOUVEAU)
- ✅ `components/settings/HolidayModal.tsx` (NOUVEAU)
- ✅ `app/(dashboard)/settings/page.tsx` (modifier complètement)

---

## POINTS D'ATTENTION

### Sécurité
- ✓ Vérifier les permissions (seuls ADMIN_RH/SUPER_ADMIN peuvent modifier)
- ✓ Valider tous les inputs côté backend
- ✓ Limiter la taille des logos uploadés

### Performance
- ✓ Utiliser React Query cache pour éviter les requêtes répétées
- ✓ Optimistic updates pour une meilleure UX
- ✓ Lazy loading pour les modals

### UX
- ✓ Ajouter des confirmations avant suppression
- ✓ Loading states pendant les sauvegardes
- ✓ Messages de succès/erreur clairs
- ✓ Désactiver les boutons pendant les mutations

---

## RÉSUMÉ

Ce plan transformera complètement la page Settings de mockup à fully fonctionnelle avec:

1. ✅ **Sauvegarde réelle** de tous les paramètres dans la base de données
2. ✅ **Gestion complète des Sites** (CRUD)
3. ✅ **Gestion complète des Jours Fériés** (CRUD + Import CSV)
4. ✅ **Intégration avec le générateur** de jours fériés
5. ✅ **Upload de logo** entreprise
6. ✅ **Tous les paramètres configurables** : timezone, tolérances, horaires, etc.

**Temps estimé:** 8 jours (1 développeur full-stack)
**Complexité:** Moyenne-Élevée
**Impact:** Très élevé (fonctionnalité critique pour l'entreprise)
