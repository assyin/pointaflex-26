'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  useDepartments,
  useCreateDepartment,
  useUpdateDepartment,
  useDeleteDepartment,
  useDepartmentSettings,
  useUpdateDepartmentSettings,
} from '@/lib/hooks/useDepartments';
import { useEmployees } from '@/lib/hooks/useEmployees';
import type { Department, CreateDepartmentDto } from '@/lib/api/departments';
import { Plus, Pencil, Trash2, Building2, Search, Loader2, UserCog, Settings } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DepartmentsAdvancedFilters, type DepartmentsFilters } from './DepartmentsAdvancedFilters';
import { SearchableEmployeeSelect } from '@/components/schedules/SearchableEmployeeSelect';

export function DepartmentsTab() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [deletingDepartment, setDeletingDepartment] = useState<Department | null>(null);
  const [settingsDepartment, setSettingsDepartment] = useState<Department | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filters, setFilters] = useState<DepartmentsFilters>({});
  const [formData, setFormData] = useState<CreateDepartmentDto>({
    name: '',
    code: '',
    description: '',
    managerId: undefined,
  });

  /**
   * Génère un code à partir du nom (pour l'aperçu en temps réel)
   * Format: 3 premières lettres (majuscules, sans accents)
   */
  const generateCodePreview = (name: string): string => {
    if (!name.trim()) return '';
    
    // Normaliser le nom: enlever accents, garder seulement lettres et chiffres
    const normalized = name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Enlever les accents
      .replace(/[^a-zA-Z0-9\s]/g, '') // Enlever caractères spéciaux
      .replace(/\s+/g, ' ') // Normaliser les espaces
      .trim()
      .toUpperCase();

    // Extraire les 3 premières lettres/chiffres (enlever les espaces)
    let baseCode = normalized
      .replace(/\s/g, '')
      .substring(0, 3);

    // Si moins de 3 caractères, compléter avec des X
    if (baseCode.length < 3) {
      baseCode = baseCode.padEnd(3, 'X');
    }

    return baseCode;
  };

  // Code généré en temps réel pour l'aperçu
  const generatedCode = formData.name ? generateCodePreview(formData.name) : '';

  const { data: departments, isLoading } = useDepartments();
  const { data: employeesData } = useEmployees();

  // Extraire les employés de la réponse API
  const employees = useMemo(() => {
    if (!employeesData) return [];
    if (Array.isArray(employeesData)) return employeesData;
    if (employeesData?.data && Array.isArray(employeesData.data)) return employeesData.data;
    return [];
  }, [employeesData]);

  // Fix hydration mismatch by ensuring client-side only rendering
  useEffect(() => {
    setIsMounted(true);
  }, []);
  const createMutation = useCreateDepartment();
  const updateMutation = useUpdateDepartment();
  const deleteMutation = useDeleteDepartment();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    // Basic validation
    if (!formData.name.trim()) {
      return;
    }
    try {
      // Ne pas envoyer le code, il sera généré automatiquement par le backend
      const { code, ...dataToSend } = formData;
      await createMutation.mutateAsync(dataToSend);
      setIsCreateOpen(false);
      setFormData({ name: '', code: '', description: '', managerId: undefined });
    } catch (error) {
      // Error is handled by the mutation's onError callback
    }
  };

  const handleEdit = (department: Department) => {
    setEditingDepartment(department);
    setFormData({
      name: department.name,
      code: department.code || '',
      description: department.description || '',
      managerId: department.managerId || undefined,
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    // Basic validation
    if (!formData.name.trim()) {
      return;
    }
    if (editingDepartment) {
      try {
        // Ne pas envoyer le code lors de la mise à jour (il ne peut pas être modifié)
        const { code, ...dataToSend } = formData;
        await updateMutation.mutateAsync({
          id: editingDepartment.id,
          data: dataToSend,
        });
        setEditingDepartment(null);
        setFormData({ name: '', code: '', description: '', managerId: undefined });
      } catch (error) {
        // Error is handled by the mutation's onError callback
      }
    }
  };

  const handleDelete = async () => {
    if (deletingDepartment) {
      await deleteMutation.mutateAsync(deletingDepartment.id);
      setDeletingDepartment(null);
    }
  };

  const filteredDepartments = departments?.filter((dept) => {
    // Recherche principale
    const searchLower = (filters.search || searchQuery || '').toLowerCase();
    const matchesSearch = !searchLower || 
      dept.name.toLowerCase().includes(searchLower) ||
      dept.code?.toLowerCase().includes(searchLower);

    // Filtre manager
    const matchesManager = filters.hasManager === undefined || 
      (filters.hasManager === true && !!dept.managerId) ||
      (filters.hasManager === false && !dept.managerId);

    // Filtre nombre d'employés
    const employeeCount = dept._count?.employees || 0;
    const matchesMinEmployees = filters.minEmployees === undefined || employeeCount >= filters.minEmployees;
    const matchesMaxEmployees = filters.maxEmployees === undefined || employeeCount <= filters.maxEmployees;

    return matchesSearch && matchesManager && matchesMinEmployees && matchesMaxEmployees;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gray-100 rounded-lg">
            <Building2 className="h-5 w-5 text-gray-700" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Départements</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Gérez les départements de votre organisation
            </p>
          </div>
        </div>
        <PermissionGate permission="tenant.manage_departments">
          <Button
            onClick={() => setIsCreateOpen(true)}
            className="bg-gray-900 hover:bg-gray-800 text-white shadow-md hover:shadow-lg transition-all duration-200"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nouveau département
          </Button>
        </PermissionGate>
      </div>

      {/* Search */}
      <Card className="border border-gray-200 shadow-sm">
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              placeholder="Rechercher un département par nom ou code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 border-gray-300 focus:border-gray-500 focus:ring-gray-500"
            />
          </div>
        </div>
      </Card>

      {/* Advanced Filters */}
      <DepartmentsAdvancedFilters
        filters={filters}
        onFiltersChange={setFilters}
        onReset={() => {
          setFilters({});
          setSearchQuery('');
        }}
        employees={employees}
        isOpen={showAdvancedFilters}
        onToggle={() => setShowAdvancedFilters(!showAdvancedFilters)}
      />

      {/* Table */}
      <Card className="border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 hover:bg-gray-50 border-b border-gray-200">
                <TableHead className="font-semibold text-gray-700 py-4">Nom</TableHead>
                <TableHead className="font-semibold text-gray-700 py-4">Code</TableHead>
                <TableHead className="font-semibold text-gray-700 py-4">Manager de Direction</TableHead>
                <TableHead className="font-semibold text-gray-700 py-4">Employés</TableHead>
                <TableHead className="text-right font-semibold text-gray-700 py-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!isMounted || isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600"></div>
                      <p className="text-gray-500">Chargement des départements...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredDepartments?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-4 bg-gray-100 rounded-full">
                        <Building2 className="h-10 w-10 text-gray-400" />
                      </div>
                      <p className="text-gray-600 font-medium">Aucun département trouvé</p>
                      <p className="text-sm text-gray-500">
                        {searchQuery ? 'Essayez avec d\'autres mots-clés' : 'Commencez par créer votre premier département'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredDepartments?.map((department) => (
                  <TableRow
                    key={department.id}
                    className="hover:bg-gray-50 transition-colors duration-150 border-b border-gray-100"
                  >
                    <TableCell className="font-semibold text-gray-900 py-4">
                      {department.name}
                    </TableCell>
                    <TableCell className="py-4">
                      {department.code ? (
                        <Badge className="bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200">
                          {department.code}
                        </Badge>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="py-4">
                      {department.manager ? (
                        <div className="flex items-center gap-2">
                          <UserCog className="h-4 w-4 text-blue-600" />
                          <div>
                            <p className="font-medium text-gray-900">
                              {department.manager.firstName} {department.manager.lastName}
                            </p>
                            <p className="text-xs text-gray-500">Directeur</p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">Non assigné</span>
                      )}
                    </TableCell>
                    <TableCell className="py-4">
                      <Badge variant="default" className="border-gray-300 text-gray-700">
                        {department._count?.employees || 0} employé{department._count?.employees !== 1 ? 's' : ''}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right py-4">
                      <div className="flex justify-end gap-2">
                        <PermissionGate permission="tenant.manage_departments">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSettingsDepartment(department)}
                            className="h-8 w-8 p-0 hover:bg-amber-100 hover:text-amber-700"
                            title="Paramètres de détection"
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(department)}
                            className="h-8 w-8 p-0 hover:bg-gray-100 hover:text-gray-700"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeletingDepartment(department)}
                            className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </PermissionGate>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog
        open={isCreateOpen || !!editingDepartment}
        onOpenChange={(open) => {
          // Prevent closing during mutation
          if (!open && (createMutation.isPending || updateMutation.isPending)) {
            return;
          }
          if (!open) {
            setIsCreateOpen(false);
            setEditingDepartment(null);
            setFormData({ name: '', code: '', description: '', managerId: undefined });
          } else {
            // Réinitialiser le formulaire lors de l'ouverture
            if (!editingDepartment) {
              setFormData({ name: '', code: '', description: '', managerId: undefined });
            }
          }
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={editingDepartment ? handleUpdate : handleCreate}>
            <DialogHeader className="pb-4 border-b border-gray-200">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Building2 className="h-5 w-5 text-gray-700" />
                </div>
                <DialogTitle className="text-2xl font-bold text-gray-900">
                  {editingDepartment ? 'Modifier le département' : 'Nouveau département'}
                </DialogTitle>
              </div>
              <DialogDescription className="text-gray-600">
                {editingDepartment
                  ? 'Modifiez les informations du département'
                  : 'Créez un nouveau département dans votre organisation'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-5 py-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-semibold text-gray-700">
                  Nom <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Ressources Humaines"
                  required
                  className="h-11 border-gray-300 focus:border-gray-500 focus:ring-gray-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code" className="text-sm font-semibold text-gray-700">
                  Code {!editingDepartment && <span className="text-xs font-normal text-gray-500">(généré automatiquement)</span>}
                </Label>
                {editingDepartment && editingDepartment.code ? (
                  <>
                    <Input
                      id="code"
                      value={editingDepartment.code}
                      disabled
                      readOnly
                      className="h-11 border-gray-300 bg-gray-50 text-gray-600 cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-500">Le code est généré automatiquement et ne peut pas être modifié</p>
                  </>
                ) : (
                  <>
                    <Input
                      id="code"
                      value={generatedCode}
                      disabled
                      readOnly
                      placeholder="Le code sera généré automatiquement"
                      className="h-11 border-gray-300 bg-gray-50 text-gray-600 cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-500">
                      Code généré à partir du nom : <span className="font-mono font-semibold">{generatedCode || '...'}</span>
                    </p>
                  </>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-semibold text-gray-700">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Description du département..."
                  rows={3}
                  className="border-gray-300 focus:border-gray-500 focus:ring-gray-500 resize-none"
                />
              </div>
              <div className="space-y-2">
                <SearchableEmployeeSelect
                  label="Manager de Direction"
                  value={formData.managerId || ''}
                  onChange={(value) => setFormData({ ...formData, managerId: value || undefined })}
                  employees={employees}
                  placeholder="Rechercher un directeur..."
                />
                <p className="text-xs text-gray-500">
                  Le Manager de Direction gère ce département dans tous les sites
                </p>
              </div>
            </div>
            <DialogFooter className="border-t border-gray-200 pt-4 gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsCreateOpen(false);
                  setEditingDepartment(null);
                  setFormData({ name: '', code: '', description: '', managerId: undefined });
                }}
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-gray-900 hover:bg-gray-800 text-white shadow-md hover:shadow-lg min-w-[100px]"
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {editingDepartment ? 'Modifier' : 'Créer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Department Settings Modal */}
      {settingsDepartment && (
        <DepartmentSettingsModal
          department={settingsDepartment}
          onClose={() => setSettingsDepartment(null)}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deletingDepartment}
        onOpenChange={(open) => !open && setDeletingDepartment(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action supprimera définitivement le département{' '}
              <strong>{deletingDepartment?.name}</strong>.
              {deletingDepartment?._count?.employees ? (
                <span className="block mt-2 text-danger">
                  Attention : {deletingDepartment._count.employees} employé(s) sont
                  actuellement assignés à ce département.
                </span>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-danger text-white hover:bg-danger-hover focus-visible:ring-danger disabled:opacity-50"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Department Settings Modal - Wrong Type Detection Override
// ═══════════════════════════════════════════════════════════════════════════════

type TriState = true | false | null; // null = inherit from tenant

function TriStateToggle({
  value,
  onChange,
  label,
  description,
  tenantDefault,
}: {
  value: TriState;
  onChange: (v: TriState) => void;
  label: string;
  description: string;
  tenantDefault: boolean;
}) {
  // Cycle: null (inherit) → true (on) → false (off) → null (inherit)
  const stateLabel = value === null ? 'Hériter' : value ? 'Activé' : 'Désactivé';
  const stateColor = value === null ? 'bg-gray-200 text-gray-600' : value ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700';

  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
      <div className="flex-1">
        <div className="text-[14px] font-semibold text-[#212529]">{label}</div>
        <div className="text-[12px] text-[#6C757D] mt-0.5">{description}</div>
        {value === null && (
          <div className="text-[11px] text-blue-600 mt-1">
            Valeur héritée du tenant: {tenantDefault ? 'Activé' : 'Désactivé'}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={() => {
          if (value === null) onChange(true);
          else if (value === true) onChange(false);
          else onChange(null);
        }}
        className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors ${stateColor}`}
      >
        {stateLabel}
      </button>
    </div>
  );
}

function DepartmentSettingsModal({
  department,
  onClose,
}: {
  department: Department;
  onClose: () => void;
}) {
  const { data, isLoading } = useDepartmentSettings(department.id);
  const updateMutation = useUpdateDepartmentSettings();

  const [localSettings, setLocalSettings] = useState<{
    wrongTypeDetectionEnabled: TriState;
    wrongTypeAutoCorrect: TriState;
    wrongTypeShiftMarginMinutes: number | null;
  }>({
    wrongTypeDetectionEnabled: null,
    wrongTypeAutoCorrect: null,
    wrongTypeShiftMarginMinutes: null,
  });

  // Sync local state when data loads
  useEffect(() => {
    if (data?.settings) {
      setLocalSettings({
        wrongTypeDetectionEnabled: data.settings.wrongTypeDetectionEnabled,
        wrongTypeAutoCorrect: data.settings.wrongTypeAutoCorrect,
        wrongTypeShiftMarginMinutes: data.settings.wrongTypeShiftMarginMinutes,
      });
    }
  }, [data]);

  const handleSave = () => {
    updateMutation.mutate(
      { id: department.id, data: localSettings },
      { onSuccess: () => onClose() },
    );
  };

  const tenantDefaults = data?.tenantDefaults || {
    enableWrongTypeDetection: false,
    wrongTypeAutoCorrect: false,
    wrongTypeShiftMarginMinutes: 120,
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-amber-500" />
            Paramètres - {department.name}
          </DialogTitle>
          <DialogDescription>
            Configuration de la détection d&apos;erreur de type IN/OUT pour ce département.
            Les valeurs &quot;Hériter&quot; utilisent la configuration du tenant.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="space-y-3 py-2">
            <TriStateToggle
              value={localSettings.wrongTypeDetectionEnabled}
              onChange={(v) => setLocalSettings({ ...localSettings, wrongTypeDetectionEnabled: v })}
              label="Détection erreur de type"
              description="Détecter les inversions IN/OUT probables"
              tenantDefault={tenantDefaults.enableWrongTypeDetection}
            />

            <TriStateToggle
              value={localSettings.wrongTypeAutoCorrect}
              onChange={(v) => setLocalSettings({ ...localSettings, wrongTypeAutoCorrect: v })}
              label="Auto-correction"
              description="Corriger automatiquement le type quand la confiance est suffisante"
              tenantDefault={tenantDefaults.wrongTypeAutoCorrect}
            />

            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-[14px] font-semibold text-[#212529]">Marge autour du shift</div>
                  <div className="text-[12px] text-[#6C757D]">Minutes de tolérance pour la détection</div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setLocalSettings({
                      ...localSettings,
                      wrongTypeShiftMarginMinutes: localSettings.wrongTypeShiftMarginMinutes === null ? tenantDefaults.wrongTypeShiftMarginMinutes : null,
                    })
                  }
                  className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors ${
                    localSettings.wrongTypeShiftMarginMinutes === null
                      ? 'bg-gray-200 text-gray-600'
                      : 'bg-blue-100 text-blue-700'
                  }`}
                >
                  {localSettings.wrongTypeShiftMarginMinutes === null ? 'Hériter' : 'Personnalisé'}
                </button>
              </div>
              {localSettings.wrongTypeShiftMarginMinutes === null ? (
                <div className="text-[11px] text-blue-600">
                  Valeur héritée du tenant: {tenantDefaults.wrongTypeShiftMarginMinutes} min
                </div>
              ) : (
                <input
                  type="number"
                  min="30"
                  max="300"
                  value={localSettings.wrongTypeShiftMarginMinutes}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      wrongTypeShiftMarginMinutes: parseInt(e.target.value) || 120,
                    })
                  }
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
                />
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending || isLoading}
            className="bg-[#0052CC] hover:bg-[#0747A6]"
          >
            {updateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
