'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Search, Edit, Trash2, User, Mail, Phone, Upload, Download, FileSpreadsheet, XCircle, ChevronLeft, ChevronRight, Building2, X, UserCircle, Briefcase, Calendar } from 'lucide-react';
import { useEmployees, useCreateEmployee, useUpdateEmployee, useDeleteEmployee, useDeleteAllEmployees } from '@/lib/hooks/useEmployees';
import { useSites } from '@/lib/hooks/useSites';
import { useDepartments } from '@/lib/hooks/useDepartments';
import { usePositions } from '@/lib/hooks/usePositions';
import { ImportExcelModal } from '@/components/employees/ImportExcelModal';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { toast } from 'sonner';
import apiClient from '@/lib/api/client';

export default function EmployeesPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isMounted, setIsMounted] = useState(false);
  const [formData, setFormData] = useState({
    matricule: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    position: '',
    positionId: '',
    siteId: '',
    departmentId: '',
    hireDate: new Date().toISOString().split('T')[0],
  });

  const { data: employees, isLoading, error, refetch } = useEmployees();
  const { data: sitesData } = useSites();
  const { data: departmentsData } = useDepartments();
  const { data: positionsData } = usePositions();
  const createMutation = useCreateEmployee();
  const updateMutation = useUpdateEmployee();
  const deleteMutation = useDeleteEmployee();
  const deleteAllMutation = useDeleteAllEmployees();

  // Extraire les tableaux des réponses API (qui peuvent être { data: [...], total: number } ou directement un tableau)
  // Utiliser useMemo pour éviter les recalculs et les problèmes de rendu
  const sites = useMemo(() => {
    if (!sitesData) return [];
    if (Array.isArray(sitesData)) return sitesData;
    if (sitesData?.data && Array.isArray(sitesData.data)) return sitesData.data;
    return [];
  }, [sitesData]);
  
  const departments = useMemo(() => {
    if (!departmentsData) return [];
    if (Array.isArray(departmentsData)) return departmentsData;
    if (departmentsData?.data && Array.isArray(departmentsData.data)) return departmentsData.data;
    return [];
  }, [departmentsData]);
  
  const positions = useMemo(() => {
    if (!positionsData) return [];
    if (Array.isArray(positionsData)) return positionsData;
    if (positionsData?.data && Array.isArray(positionsData.data)) return positionsData.data;
    return [];
  }, [positionsData]);

  const handleCreateEmployee = async () => {
    if (!formData.matricule || !formData.firstName || !formData.lastName || !formData.email) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    // Prepare data for API - only send non-empty values
    const createData: any = {
      matricule: formData.matricule,
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phone || undefined,
      position: formData.position || undefined,
      positionId: formData.positionId || undefined,
      siteId: formData.siteId || undefined,
      departmentId: formData.departmentId || undefined,
      hireDate: formData.hireDate,
    };

    await createMutation.mutateAsync(createData);
    setShowCreateModal(false);
    setFormData({
      matricule: '',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      position: '',
      positionId: '',
      siteId: '',
      departmentId: '',
      hireDate: new Date().toISOString().split('T')[0],
    });
  };

  const handleEdit = (employee: any) => {
    setEditingEmployee(employee);
    setFormData({
      matricule: employee.matricule || '',
      firstName: employee.firstName || '',
      lastName: employee.lastName || '',
      email: employee.email || '',
      phone: employee.phone || '',
      position: employee.position || '',
      positionId: employee.positionId || '',
      siteId: employee.siteId || '',
      departmentId: employee.departmentId || '',
      hireDate: employee.hireDate ? new Date(employee.hireDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    });
    setShowEditModal(true);
  };

  const handleUpdateEmployee = async () => {
    if (!editingEmployee) return;
    
    if (!formData.firstName || !formData.lastName || !formData.email) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    const updateData: any = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phone || undefined,
      position: formData.position || undefined,
      positionId: formData.positionId || undefined,
      siteId: formData.siteId || undefined,
      departmentId: formData.departmentId || undefined,
      hireDate: formData.hireDate,
    };

    await updateMutation.mutateAsync({ id: editingEmployee.id, data: updateData });
    setShowEditModal(false);
    setEditingEmployee(null);
    setFormData({
      matricule: '',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      position: '',
      positionId: '',
      siteId: '',
      departmentId: '',
      hireDate: new Date().toISOString().split('T')[0],
    });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet employé ?\n\nCette action est irréversible et supprimera également toutes les données associées (pointages, plannings, etc.).')) {
      try {
        await deleteMutation.mutateAsync(id);
      } catch (error) {
        // Error is already handled by the mutation
      }
    }
  };

  const handleDeleteAll = async () => {
    const employeeCount = Array.isArray(employees) ? employees.length : 0;
    if (employeeCount === 0) {
      toast.error('Aucun employé à supprimer');
      return;
    }

    if (confirm(`⚠️ ATTENTION: Voulez-vous vraiment supprimer TOUS les ${employeeCount} employés ?\n\nCette action est IRRÉVERSIBLE!`)) {
      if (confirm(`Confirmation finale: Supprimer ${employeeCount} employés?`)) {
        await deleteAllMutation.mutateAsync();
        refetch();
      }
    }
  };

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const response = await apiClient.get('/employees/export/excel', {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `employees_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Export Excel réussi!');
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error('Erreur lors de l\'export');
    } finally {
      setIsExporting(false);
    }
  };

  const filteredEmployees = Array.isArray(employees)
    ? employees.filter((emp: any) =>
        searchQuery === '' ||
        emp.matricule?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.region?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  // Pagination logic
  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedEmployees = filteredEmployees.slice(startIndex, endIndex);

  // Reset to first page when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Fix hydration error by ensuring consistent initial render
  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <DashboardLayout
      title="Gestion des Employés"
      subtitle="Liste et gestion des employés de l'entreprise"
    >
      <div className="space-y-6">
        {/* Actions Bar */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
            <Input
              type="text"
              placeholder="Rechercher un employé..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-64"
            />
          </div>

          <div className="flex gap-2">
            <PermissionGate permission="employee.delete">
              <Button
                variant="outline"
                onClick={handleDeleteAll}
                disabled={deleteAllMutation.isPending || !Array.isArray(employees) || employees.length === 0}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <XCircle className="h-4 w-4 mr-2" />
                {deleteAllMutation.isPending ? 'Suppression...' : 'Tout Supprimer'}
              </Button>
            </PermissionGate>
            <PermissionGate permissions={['employee.export', 'employee.view_all']}>
              <Button
                variant="outline"
                onClick={handleExportExcel}
                disabled={isExporting || !Array.isArray(employees) || employees.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                {isExporting ? 'Export en cours...' : 'Exporter Excel'}
              </Button>
            </PermissionGate>
            <PermissionGate permission="employee.import">
              <Button variant="outline" onClick={() => setShowImportModal(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Importer Excel
              </Button>
            </PermissionGate>
            <PermissionGate permission="employee.create">
              <Button variant="primary" onClick={() => setShowCreateModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nouvel Employé
              </Button>
            </PermissionGate>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-secondary">Total employés</p>
                  <p className="text-2xl font-bold text-text-primary mt-1">
                    {Array.isArray(employees) ? employees.length : 0}
                  </p>
                </div>
                <User className="h-10 w-10 text-primary opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Employees Table */}
        <Card>
          <CardHeader>
            <CardTitle>Liste des employés</CardTitle>
          </CardHeader>
          <CardContent>
            {!isMounted ? (
              <div className="text-center py-12 text-text-secondary">Chargement...</div>
            ) : isLoading ? (
              <div className="text-center py-12 text-text-secondary">Chargement...</div>
            ) : error ? (
              <Alert variant="danger">
                <AlertDescription>Erreur lors du chargement des employés</AlertDescription>
              </Alert>
            ) : filteredEmployees.length === 0 ? (
              <div className="text-center py-12 text-text-secondary">
                <User className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>Aucun employé trouvé</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-table-header text-left text-sm font-semibold text-text-primary">
                      <th className="p-3">Matricule</th>
                      <th className="p-3">Nom complet</th>
                      <th className="p-3">Email</th>
                      <th className="p-3">Téléphone</th>
                      <th className="p-3">Poste</th>
                      <th className="p-3">Département</th>
                      <th className="p-3">Région</th>
                      <th className="p-3">Date d'embauche</th>
                      <th className="p-3">Statut</th>
                      <th className="p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-table-border">
                    {paginatedEmployees.map((employee: any) => (
                      <tr key={employee.id} className="hover:bg-table-hover transition-colors">
                        <td className="p-3 font-mono text-sm font-semibold text-primary">{employee.matricule}</td>
                        <td className="p-3">
                          <div className="font-medium">{employee.firstName} {employee.lastName}</div>
                          {employee.civilite && (
                            <div className="text-xs text-text-secondary">{employee.civilite}</div>
                          )}
                        </td>
                        <td className="p-3 text-sm text-text-secondary">
                          <div className="flex items-center gap-2">
                            <Mail className="h-3 w-3" />
                            {employee.email}
                          </div>
                        </td>
                        <td className="p-3 text-sm text-text-secondary">
                          <div className="flex items-center gap-2">
                            <Phone className="h-3 w-3" />
                            {employee.phone || '—'}
                          </div>
                        </td>
                        <td className="p-3 text-sm">
                          <div>{employee.position || '—'}</div>
                          {employee.contractType && (
                            <div className="text-xs text-text-secondary">{employee.contractType}</div>
                          )}
                        </td>
                        <td className="p-3 text-sm">
                          {employee.department?.name || '—'}
                        </td>
                        <td className="p-3 text-sm text-text-secondary">
                          {employee.region || '—'}
                        </td>
                        <td className="p-3 text-sm text-text-secondary">
                          {employee.hireDate ? new Date(employee.hireDate).toLocaleDateString('fr-FR') : '—'}
                        </td>
                        <td className="p-3">
                          <Badge variant={employee.status === 'ACTIVE' ? 'success' : 'default'}>
                            {employee.status === 'ACTIVE' ? 'Actif' : employee.status}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            <PermissionGate permission="employee.update">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(employee)}
                                title="Modifier l'employé"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                            </PermissionGate>
                            <PermissionGate permission="employee.delete">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDelete(employee.id)}
                                disabled={deleteMutation.isPending}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </PermissionGate>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {filteredEmployees.length > 0 && (
              <div className="mt-4 flex items-center justify-between border-t border-table-border pt-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-text-secondary">
                    Affichage de {startIndex + 1} à {Math.min(endIndex, filteredEmployees.length)} sur {filteredEmployees.length} employés
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 mr-4">
                    <label className="text-sm text-text-secondary">Lignes par page:</label>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="border border-border rounded px-2 py-1 text-sm"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNumber;
                      if (totalPages <= 5) {
                        pageNumber = i + 1;
                      } else if (currentPage <= 3) {
                        pageNumber = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNumber = totalPages - 4 + i;
                      } else {
                        pageNumber = currentPage - 2 + i;
                      }

                      return (
                        <Button
                          key={pageNumber}
                          variant={currentPage === pageNumber ? 'primary' : 'outline'}
                          size="sm"
                          onClick={() => setCurrentPage(pageNumber)}
                          className="min-w-[2rem]"
                        >
                          {pageNumber}
                        </Button>
                      );
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Import Excel Modal */}
        {showImportModal && (
          <ImportExcelModal
            onClose={() => setShowImportModal(false)}
            onSuccess={() => {
              refetch();
              setShowImportModal(false);
            }}
          />
        )}

        {/* Create Employee Modal */}
        {showCreateModal && (
          <div 
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowCreateModal(false)}
          >
            <Card 
              className="w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <CardHeader className="border-b border-gray-200 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <UserCircle className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl font-bold text-gray-900">Nouvel Employé</CardTitle>
                      <p className="text-sm text-gray-500 mt-1">Remplissez les informations pour créer un nouvel employé</p>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowCreateModal(false)}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="p-6">
                <div className="space-y-6">
                  {/* Section 1: Informations Personnelles */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                      <User className="h-5 w-5 text-gray-600" />
                      <h3 className="text-lg font-semibold text-gray-900">Informations Personnelles</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Matricule <span className="text-red-500">*</span>
                        </label>
                        <Input
                          value={formData.matricule}
                          onChange={(e) => setFormData({ ...formData, matricule: e.target.value })}
                          placeholder="EMP001"
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Date d'embauche <span className="text-red-500">*</span>
                        </label>
                        <Input
                          type="date"
                          value={formData.hireDate}
                          onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })}
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Prénom <span className="text-red-500">*</span>
                        </label>
                        <Input
                          value={formData.firstName}
                          onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                          placeholder="Jean"
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Nom <span className="text-red-500">*</span>
                        </label>
                        <Input
                          value={formData.lastName}
                          onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                          placeholder="Dupont"
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Email <span className="text-red-500">*</span>
                        </label>
                        <Input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="jean.dupont@entreprise.com"
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Téléphone
                        </label>
                        <Input
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="0612345678"
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Affectation Organisationnelle */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                      <Building2 className="h-5 w-5 text-gray-600" />
                      <h3 className="text-lg font-semibold text-gray-900">Affectation Organisationnelle</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Site
                        </label>
                        <select
                          value={formData.siteId}
                          onChange={(e) => setFormData({ ...formData, siteId: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
                        >
                          <option value="">Sélectionner un site</option>
                          {sites.map((site: any) => (
                            <option key={site.id} value={site.id}>
                              {site.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Département
                        </label>
                        <select
                          value={formData.departmentId}
                          onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
                        >
                          <option value="">Sélectionner un département</option>
                          {departments.map((dept: any) => (
                            <option key={dept.id} value={dept.id}>
                              {dept.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Fonction et Poste */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                      <Briefcase className="h-5 w-5 text-gray-600" />
                      <h3 className="text-lg font-semibold text-gray-900">Fonction et Poste</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Fonction/Position
                        </label>
                        <select
                          value={formData.positionId}
                          onChange={(e) => {
                            const selectedPosition = positions.find((p: any) => p.id === e.target.value);
                            setFormData({
                              ...formData,
                              positionId: e.target.value,
                              position: selectedPosition ? selectedPosition.name : formData.position,
                            });
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
                        >
                          <option value="">Sélectionner une fonction</option>
                          {positions.map((pos: any) => (
                            <option key={pos.id} value={pos.id}>
                              {pos.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Poste (texte libre)
                        </label>
                        <Input
                          value={formData.position}
                          onChange={(e) => setFormData({ ...formData, position: e.target.value, positionId: '' })}
                          placeholder="Développeur (si fonction non listée)"
                          className="w-full"
                        />
                        <p className="text-xs text-gray-500 mt-1.5">Utilisé si aucune fonction n'est sélectionnée</p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
                    <Button 
                      variant="outline" 
                      onClick={() => setShowCreateModal(false)}
                      disabled={createMutation.isPending}
                    >
                      Annuler
                    </Button>
                    <Button
                      variant="primary"
                      onClick={handleCreateEmployee}
                      disabled={createMutation.isPending || !formData.matricule || !formData.firstName || !formData.lastName || !formData.email}
                      className="min-w-[120px]"
                    >
                      {createMutation.isPending ? (
                        <>
                          <span className="animate-spin mr-2">⏳</span>
                          Création...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Créer l'employé
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Edit Employee Modal */}
        {showEditModal && editingEmployee && (
          <div 
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => {
              setShowEditModal(false);
              setEditingEmployee(null);
            }}
          >
            <Card 
              className="w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <CardHeader className="border-b border-gray-200 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Edit className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl font-bold text-gray-900">Modifier l'employé</CardTitle>
                      <p className="text-sm text-gray-500 mt-1">Modifiez les informations de {editingEmployee.firstName} {editingEmployee.lastName}</p>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingEmployee(null);
                    }}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="p-6">
                <div className="space-y-6">
                  {/* Section 1: Informations Personnelles */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                      <User className="h-5 w-5 text-gray-600" />
                      <h3 className="text-lg font-semibold text-gray-900">Informations Personnelles</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Matricule
                        </label>
                        <Input
                          value={formData.matricule}
                          disabled
                          className="w-full bg-gray-50"
                        />
                        <p className="text-xs text-gray-500 mt-1">Le matricule ne peut pas être modifié</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Date d'embauche <span className="text-red-500">*</span>
                        </label>
                        <Input
                          type="date"
                          value={formData.hireDate}
                          onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })}
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Prénom <span className="text-red-500">*</span>
                        </label>
                        <Input
                          value={formData.firstName}
                          onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                          placeholder="Jean"
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Nom <span className="text-red-500">*</span>
                        </label>
                        <Input
                          value={formData.lastName}
                          onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                          placeholder="Dupont"
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Email <span className="text-red-500">*</span>
                        </label>
                        <Input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="jean.dupont@entreprise.com"
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Téléphone
                        </label>
                        <Input
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="0612345678"
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Affectation Organisationnelle */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                      <Building2 className="h-5 w-5 text-gray-600" />
                      <h3 className="text-lg font-semibold text-gray-900">Affectation Organisationnelle</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Site
                        </label>
                        <select
                          value={formData.siteId}
                          onChange={(e) => setFormData({ ...formData, siteId: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
                        >
                          <option value="">Sélectionner un site</option>
                          {sites.map((site: any) => (
                            <option key={site.id} value={site.id}>
                              {site.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Département
                        </label>
                        <select
                          value={formData.departmentId}
                          onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
                        >
                          <option value="">Sélectionner un département</option>
                          {departments.map((dept: any) => (
                            <option key={dept.id} value={dept.id}>
                              {dept.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Fonction et Poste */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                      <Briefcase className="h-5 w-5 text-gray-600" />
                      <h3 className="text-lg font-semibold text-gray-900">Fonction et Poste</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Fonction/Position
                        </label>
                        <select
                          value={formData.positionId}
                          onChange={(e) => {
                            const selectedPosition = positions.find((p: any) => p.id === e.target.value);
                            setFormData({
                              ...formData,
                              positionId: e.target.value,
                              position: selectedPosition ? selectedPosition.name : formData.position,
                            });
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
                        >
                          <option value="">Sélectionner une fonction</option>
                          {positions.map((pos: any) => (
                            <option key={pos.id} value={pos.id}>
                              {pos.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Poste (texte libre)
                        </label>
                        <Input
                          value={formData.position}
                          onChange={(e) => setFormData({ ...formData, position: e.target.value, positionId: '' })}
                          placeholder="Développeur (si fonction non listée)"
                          className="w-full"
                        />
                        <p className="text-xs text-gray-500 mt-1.5">Utilisé si aucune fonction n'est sélectionnée</p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setShowEditModal(false);
                        setEditingEmployee(null);
                      }}
                      disabled={updateMutation.isPending}
                    >
                      Annuler
                    </Button>
                    <Button
                      variant="primary"
                      onClick={handleUpdateEmployee}
                      disabled={updateMutation.isPending || !formData.firstName || !formData.lastName || !formData.email}
                      className="min-w-[120px]"
                    >
                      {updateMutation.isPending ? (
                        <>
                          <span className="animate-spin mr-2">⏳</span>
                          Modification...
                        </>
                      ) : (
                        <>
                          <Edit className="h-4 w-4 mr-2" />
                          Enregistrer
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
