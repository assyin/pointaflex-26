'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  useSiteManagers,
  useCreateSiteManager,
  useUpdateSiteManager,
  useDeleteSiteManager,
} from '@/lib/hooks/useSiteManagers';
import { useSites } from '@/lib/hooks/useSites';
import { useDepartments } from '@/lib/hooks/useDepartments';
import { useEmployees } from '@/lib/hooks/useEmployees';
import type { SiteManager, CreateSiteManagerDto } from '@/lib/api/site-managers';
import { Plus, Pencil, Trash2, Users, Search, Loader2, MapPin, Building2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ManagersAdvancedFilters, type ManagersFilters } from './ManagersAdvancedFilters';
import { SearchableEmployeeSelect } from '@/components/schedules/SearchableEmployeeSelect';

export function ManagersTab() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingManager, setEditingManager] = useState<SiteManager | null>(null);
  const [deletingManager, setDeletingManager] = useState<SiteManager | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filters, setFilters] = useState<ManagersFilters>({});
  const [formData, setFormData] = useState<CreateSiteManagerDto>({
    siteId: '',
    managerId: '',
    departmentId: '',
  });

  const { data: siteManagers, isLoading } = useSiteManagers();
  const { data: sitesData } = useSites();
  const { data: departmentsData } = useDepartments();
  const { data: employeesData } = useEmployees();

  // Extraire les tableaux des réponses API
  const sites = useMemo(() => {
    const data = sitesData as any;
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (data?.data && Array.isArray(data.data)) return data.data;
    return [];
  }, [sitesData]);

  const departments = useMemo(() => {
    const data = departmentsData as any;
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (data?.data && Array.isArray(data.data)) return data.data;
    return [];
  }, [departmentsData]);

  const employees = useMemo(() => {
    const data = employeesData as any;
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (data?.data && Array.isArray(data.data)) return data.data;
    return [];
  }, [employeesData]);

  // Filtrer les employés par département sélectionné
  const availableManagers = useMemo(() => {
    if (!formData.departmentId) return [];
    return employees.filter((emp: any) => emp.departmentId === formData.departmentId && emp.isActive);
  }, [employees, formData.departmentId]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const createMutation = useCreateSiteManager();
  const updateMutation = useUpdateSiteManager();
  const deleteMutation = useDeleteSiteManager();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.siteId || !formData.managerId || !formData.departmentId) {
      return;
    }
    try {
      await createMutation.mutateAsync(formData);
      setIsCreateOpen(false);
      setFormData({ siteId: '', managerId: '', departmentId: '' });
    } catch (error) {
      // Error is handled by the mutation's onError callback
    }
  };

  const handleEdit = (siteManager: SiteManager) => {
    setEditingManager(siteManager);
    setFormData({
      siteId: siteManager.siteId,
      managerId: siteManager.managerId,
      departmentId: siteManager.departmentId,
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.managerId || !editingManager) {
      return;
    }
    try {
      await updateMutation.mutateAsync({
        id: editingManager.id,
        data: { managerId: formData.managerId },
      });
      setEditingManager(null);
      setFormData({ siteId: '', managerId: '', departmentId: '' });
    } catch (error) {
      // Error is handled by the mutation's onError callback
    }
  };

  const handleDelete = async () => {
    if (deletingManager) {
      await deleteMutation.mutateAsync(deletingManager.id);
      setDeletingManager(null);
    }
  };

  const filteredManagers = siteManagers?.filter((sm) => {
    // Recherche principale
    const searchLower = (filters.search || searchQuery || '').toLowerCase();
    const matchesSearch = !searchLower || 
      sm.site?.name.toLowerCase().includes(searchLower) ||
      sm.department?.name.toLowerCase().includes(searchLower) ||
      sm.manager?.firstName.toLowerCase().includes(searchLower) ||
      sm.manager?.lastName.toLowerCase().includes(searchLower) ||
      sm.manager?.matricule.toLowerCase().includes(searchLower);

    // Filtre site
    const matchesSite = !filters.siteId || sm.siteId === filters.siteId;

    // Filtre département
    const matchesDepartment = !filters.departmentId || sm.departmentId === filters.departmentId;

    return matchesSearch && matchesSite && matchesDepartment;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gray-100 rounded-lg">
            <Users className="h-5 w-5 text-gray-700" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Managers Régionaux</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Gérez les managers régionaux par site et département
            </p>
          </div>
        </div>
        <PermissionGate permission="tenant.manage_sites">
          <Button
            onClick={() => setIsCreateOpen(true)}
            className="bg-gray-900 hover:bg-gray-800 text-white shadow-md hover:shadow-lg transition-all duration-200"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nouveau manager régional
          </Button>
        </PermissionGate>
      </div>

      {/* Search */}
      <Card className="border border-gray-200 shadow-sm">
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              placeholder="Rechercher par site, département ou manager..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 border-gray-300 focus:border-gray-500 focus:ring-gray-500"
            />
          </div>
        </div>
      </Card>

      {/* Advanced Filters */}
      <ManagersAdvancedFilters
        filters={filters}
        onFiltersChange={setFilters}
        onReset={() => {
          setFilters({});
          setSearchQuery('');
        }}
        sites={sites}
        departments={departments}
        isOpen={showAdvancedFilters}
        onToggle={() => setShowAdvancedFilters(!showAdvancedFilters)}
      />

      {/* Table */}
      <Card className="border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 hover:bg-gray-50 border-b border-gray-200">
                <TableHead className="font-semibold text-gray-700 py-4">Site</TableHead>
                <TableHead className="font-semibold text-gray-700 py-4">Département</TableHead>
                <TableHead className="font-semibold text-gray-700 py-4">Manager</TableHead>
                <TableHead className="font-semibold text-gray-700 py-4">Matricule</TableHead>
                <TableHead className="text-right font-semibold text-gray-700 py-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!isMounted || isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600"></div>
                      <p className="text-gray-500">Chargement des managers régionaux...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredManagers?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-4 bg-gray-100 rounded-full">
                        <Users className="h-10 w-10 text-gray-400" />
                      </div>
                      <p className="text-gray-600 font-medium">Aucun manager régional trouvé</p>
                      <p className="text-sm text-gray-500">
                        {searchQuery ? 'Aucun résultat pour votre recherche' : 'Commencez par créer un manager régional'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredManagers?.map((siteManager) => (
                  <TableRow key={siteManager.id} className="hover:bg-gray-50">
                    <TableCell className="py-4">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-900">{siteManager.site?.name}</p>
                          {siteManager.site?.code && (
                            <p className="text-xs text-gray-500">{siteManager.site.code}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-900">{siteManager.department?.name}</p>
                          {siteManager.department?.code && (
                            <p className="text-xs text-gray-500">{siteManager.department.code}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div>
                        <p className="font-medium text-gray-900">
                          {siteManager.manager?.firstName} {siteManager.manager?.lastName}
                        </p>
                        {siteManager.manager?.email && (
                          <p className="text-xs text-gray-500">{siteManager.manager.email}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <Badge variant="outline" className="font-mono">
                        {siteManager.manager?.matricule}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right py-4">
                      <div className="flex items-center justify-end gap-2">
                        <PermissionGate permission="tenant.manage_sites">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(siteManager)}
                            className="h-8 w-8 p-0"
                          >
                            <Pencil className="h-4 w-4 text-gray-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeletingManager(siteManager)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
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

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nouveau Manager Régional</DialogTitle>
            <DialogDescription>
              Assignez un manager régional pour gérer un département dans un site spécifique
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="siteId">Site *</Label>
                <select
                  id="siteId"
                  value={formData.siteId}
                  onChange={(e) => setFormData({ ...formData, siteId: e.target.value, departmentId: '', managerId: '' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
                  required
                >
                  <option value="">Sélectionner un site</option>
                  {sites.map((site: any) => (
                    <option key={site.id} value={site.id}>
                      {site.name} {site.code && `(${site.code})`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="departmentId">Département *</Label>
                <select
                  id="departmentId"
                  value={formData.departmentId}
                  onChange={(e) => setFormData({ ...formData, departmentId: e.target.value, managerId: '' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
                  required
                  disabled={!formData.siteId}
                >
                  <option value="">Sélectionner un département</option>
                  {departments.map((dept: any) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name} {dept.code && `(${dept.code})`}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Seuls les employés de ce département seront disponibles comme managers
                </p>
              </div>

              <div>
                <SearchableEmployeeSelect
                  label="Manager"
                  value={formData.managerId}
                  onChange={(value) => setFormData({ ...formData, managerId: value })}
                  employees={availableManagers}
                  placeholder="Rechercher un manager..."
                  required
                  error={formData.departmentId && availableManagers.length === 0 ? 'Aucun employé actif trouvé dans ce département' : undefined}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsCreateOpen(false);
                  setFormData({ siteId: '', managerId: '', departmentId: '' });
                }}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Créer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingManager} onOpenChange={(open) => !open && setEditingManager(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Modifier le Manager Régional</DialogTitle>
            <DialogDescription>
              Modifiez le manager assigné à ce site et département
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate}>
            <div className="space-y-4 py-4">
              <div>
                <Label>Site</Label>
                <Input
                  value={editingManager?.site?.name || ''}
                  disabled
                  className="bg-gray-50"
                />
              </div>

              <div>
                <Label>Département</Label>
                <Input
                  value={editingManager?.department?.name || ''}
                  disabled
                  className="bg-gray-50"
                />
              </div>

              <div>
                <SearchableEmployeeSelect
                  label="Manager"
                  value={formData.managerId}
                  onChange={(value) => setFormData({ ...formData, managerId: value })}
                  employees={availableManagers}
                  placeholder="Rechercher un manager..."
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditingManager(null);
                  setFormData({ siteId: '', managerId: '', departmentId: '' });
                }}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enregistrer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deletingManager} onOpenChange={(open) => !open && setDeletingManager(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le Manager Régional</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le manager régional{' '}
              <strong>
                {deletingManager?.manager?.firstName} {deletingManager?.manager?.lastName}
              </strong>{' '}
              du site <strong>{deletingManager?.site?.name}</strong> pour le département{' '}
              <strong>{deletingManager?.department?.name}</strong> ?
              <br />
              <br />
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-danger text-white hover:bg-danger-hover focus-visible:ring-danger disabled:opacity-50"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
