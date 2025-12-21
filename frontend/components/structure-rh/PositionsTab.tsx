'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  usePositions,
  useCreatePosition,
  useUpdatePosition,
  useDeletePosition,
  usePositionCategories,
} from '@/lib/hooks/usePositions';
import type { Position, CreatePositionDto } from '@/lib/api/positions';
import { Plus, Pencil, Trash2, Briefcase, Search, Filter, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PositionsAdvancedFilters, type PositionsFilters } from './PositionsAdvancedFilters';

export function PositionsTab() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const [deletingPosition, setDeletingPosition] = useState<Position | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isMounted, setIsMounted] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filters, setFilters] = useState<PositionsFilters>({});
  const [formData, setFormData] = useState<CreatePositionDto>({
    name: '',
    code: '',
    category: '',
    description: '',
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

  const { data: positions, isLoading } = usePositions(
    categoryFilter === 'all' ? undefined : categoryFilter
  );
  const { data: categories } = usePositionCategories();

  // Fix hydration mismatch by ensuring client-side only rendering
  useEffect(() => {
    setIsMounted(true);
  }, []);
  const createMutation = useCreatePosition();
  const updateMutation = useUpdatePosition();
  const deleteMutation = useDeletePosition();

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
      setFormData({ name: '', code: '', category: '', description: '' });
    } catch (error) {
      // Error is handled by the mutation's onError callback
    }
  };

  const handleEdit = (position: Position) => {
    setEditingPosition(position);
    setFormData({
      name: position.name,
      code: position.code || '',
      category: position.category || '',
      description: position.description || '',
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    // Basic validation
    if (!formData.name.trim()) {
      return;
    }
    if (editingPosition) {
      try {
        // Ne pas envoyer le code lors de la mise à jour (il ne peut pas être modifié)
        const { code, ...dataToSend } = formData;
        await updateMutation.mutateAsync({
          id: editingPosition.id,
          data: dataToSend,
        });
        setEditingPosition(null);
        setFormData({ name: '', code: '', category: '', description: '' });
      } catch (error) {
        // Error is handled by the mutation's onError callback
      }
    }
  };

  const handleDelete = async () => {
    if (deletingPosition) {
      await deleteMutation.mutateAsync(deletingPosition.id);
      setDeletingPosition(null);
    }
  };

  const filteredPositions = positions?.filter((pos) => {
    // Recherche principale
    const searchLower = (filters.search || searchQuery || '').toLowerCase();
    const matchesSearch = !searchLower || 
      pos.name.toLowerCase().includes(searchLower) ||
      pos.code?.toLowerCase().includes(searchLower) ||
      pos.category?.toLowerCase().includes(searchLower);

    // Filtre catégorie (depuis filtres avancés ou filtre simple)
    const selectedCategory = filters.category || (categoryFilter === 'all' ? undefined : categoryFilter);
    const matchesCategory = !selectedCategory || pos.category === selectedCategory;

    // Filtre nombre d'employés
    const employeeCount = pos._count?.employees || 0;
    const matchesMinEmployees = filters.minEmployees === undefined || employeeCount >= filters.minEmployees;
    const matchesMaxEmployees = filters.maxEmployees === undefined || employeeCount <= filters.maxEmployees;

    return matchesSearch && matchesCategory && matchesMinEmployees && matchesMaxEmployees;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-100 rounded-lg">
            <Briefcase className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Fonctions</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Gérez les fonctions et postes de votre organisation
            </p>
          </div>
        </div>
        <PermissionGate permission="tenant.manage_positions">
          <Button
            onClick={() => setIsCreateOpen(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle fonction
          </Button>
        </PermissionGate>
      </div>

      {/* Search */}
      <Card className="border border-gray-200 shadow-sm">
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              placeholder="Rechercher une fonction par nom, code ou catégorie..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 border-gray-300 focus:border-purple-500 focus:ring-purple-500"
            />
          </div>
        </div>
      </Card>

      {/* Advanced Filters */}
      <PositionsAdvancedFilters
        filters={filters}
        onFiltersChange={(newFilters) => {
          setFilters(newFilters);
          // Synchroniser le filtre de catégorie simple avec les filtres avancés
          if (newFilters.category) {
            setCategoryFilter(newFilters.category);
          } else if (!newFilters.category && categoryFilter !== 'all') {
            setCategoryFilter('all');
          }
        }}
        onReset={() => {
          setFilters({});
          setSearchQuery('');
          setCategoryFilter('all');
        }}
        categories={categories || []}
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
                <TableHead className="font-semibold text-gray-700 py-4">Catégorie</TableHead>
                <TableHead className="font-semibold text-gray-700 py-4">Description</TableHead>
                <TableHead className="font-semibold text-gray-700 py-4">Employés</TableHead>
                <TableHead className="text-right font-semibold text-gray-700 py-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!isMounted || isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                      <p className="text-gray-500">Chargement des fonctions...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredPositions?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-4 bg-gray-100 rounded-full">
                        <Briefcase className="h-10 w-10 text-gray-400" />
                      </div>
                      <p className="text-gray-600 font-medium">Aucune fonction trouvée</p>
                      <p className="text-sm text-gray-500">
                        {searchQuery || categoryFilter !== 'all'
                          ? 'Essayez avec d\'autres filtres'
                          : 'Commencez par créer votre première fonction'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredPositions?.map((position) => (
                  <TableRow
                    key={position.id}
                    className="hover:bg-purple-50/50 transition-colors duration-150 border-b border-gray-100"
                  >
                    <TableCell className="font-semibold text-gray-900 py-4">
                      {position.name}
                    </TableCell>
                    <TableCell className="py-4">
                      {position.code ? (
                        <Badge className="bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200">
                          {position.code}
                        </Badge>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="py-4">
                      {position.category ? (
                        <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200">
                          {position.category}
                        </Badge>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-gray-600 py-4">
                      {position.description || (
                        <span className="text-gray-400 italic">Aucune description</span>
                      )}
                    </TableCell>
                    <TableCell className="py-4">
                      <Badge variant="default" className="border-gray-300 text-gray-700">
                        {position._count?.employees || 0} employé{position._count?.employees !== 1 ? 's' : ''}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right py-4">
                      <div className="flex justify-end gap-2">
                        <PermissionGate permission="tenant.manage_positions">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(position)}
                            className="h-8 w-8 p-0 hover:bg-purple-100 hover:text-purple-700"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeletingPosition(position)}
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
        open={isCreateOpen || !!editingPosition}
        onOpenChange={(open) => {
          // Prevent closing during mutation
          if (!open && (createMutation.isPending || updateMutation.isPending)) {
            return;
          }
          if (!open) {
            setIsCreateOpen(false);
            setEditingPosition(null);
            setFormData({ name: '', code: '', category: '', description: '' });
          } else {
            // Réinitialiser le formulaire lors de l'ouverture
            if (!editingPosition) {
              setFormData({ name: '', code: '', category: '', description: '' });
            }
          }
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={editingPosition ? handleUpdate : handleCreate}>
            <DialogHeader className="pb-4 border-b border-gray-200">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Briefcase className="h-5 w-5 text-purple-600" />
                </div>
                <DialogTitle className="text-2xl font-bold text-gray-900">
                  {editingPosition ? 'Modifier la fonction' : 'Nouvelle fonction'}
                </DialogTitle>
              </div>
              <DialogDescription className="text-gray-600">
                {editingPosition
                  ? 'Modifiez les informations de la fonction'
                  : 'Créez une nouvelle fonction dans votre organisation'}
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
                  placeholder="Ex: Développeur Full Stack"
                  required
                  className="h-11 border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code" className="text-sm font-semibold text-gray-700">
                  Code {!editingPosition && <span className="text-xs font-normal text-gray-500">(généré automatiquement)</span>}
                </Label>
                {editingPosition && editingPosition.code ? (
                  <>
                    <Input
                      id="code"
                      value={editingPosition.code}
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
                <Label htmlFor="category" className="text-sm font-semibold text-gray-700">
                  Catégorie
                </Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  placeholder="Ex: IT, RH, FINANCE..."
                  maxLength={50}
                  className="h-11 border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                />
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
                  placeholder="Description de la fonction..."
                  rows={3}
                  className="border-gray-300 focus:border-purple-500 focus:ring-purple-500 resize-none"
                />
              </div>
            </div>
            <DialogFooter className="border-t border-gray-200 pt-4 gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsCreateOpen(false);
                  setEditingPosition(null);
                  setFormData({ name: '', code: '', category: '', description: '' });
                }}
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-purple-600 hover:bg-purple-700 text-white shadow-md hover:shadow-lg min-w-[100px]"
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {editingPosition ? 'Modifier' : 'Créer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deletingPosition}
        onOpenChange={(open) => !open && setDeletingPosition(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action supprimera définitivement la fonction{' '}
              <strong>{deletingPosition?.name}</strong>.
              {deletingPosition?._count?.employees ? (
                <span className="block mt-2 text-danger">
                  Attention : {deletingPosition._count.employees} employé(s) ont
                  actuellement cette fonction.
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
