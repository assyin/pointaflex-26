'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Search, Edit, Trash2, User, Mail, Phone, Upload, Download, FileSpreadsheet, XCircle, ChevronLeft, ChevronRight, Building2 } from 'lucide-react';
import { useEmployees, useCreateEmployee, useDeleteEmployee, useDeleteAllEmployees } from '@/lib/hooks/useEmployees';
import { ImportExcelModal } from '@/components/employees/ImportExcelModal';
import { BulkAssignSiteModal } from '@/components/employees/BulkAssignSiteModal';
import { toast } from 'sonner';
import apiClient from '@/lib/api/client';

export default function EmployeesPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
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
    hireDate: new Date().toISOString().split('T')[0],
  });

  const { data: employees, isLoading, error, refetch } = useEmployees();
  const createMutation = useCreateEmployee();
  const deleteMutation = useDeleteEmployee();
  const deleteAllMutation = useDeleteAllEmployees();

  const handleCreateEmployee = async () => {
    if (!formData.matricule || !formData.firstName || !formData.lastName || !formData.email) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    await createMutation.mutateAsync(formData);
    setShowCreateModal(false);
    setFormData({
      matricule: '',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      position: '',
      hireDate: new Date().toISOString().split('T')[0],
    });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet employé ?')) {
      await deleteMutation.mutateAsync(id);
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
  React.useEffect(() => {
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
            <Button
              variant="outline"
              onClick={handleDeleteAll}
              disabled={deleteAllMutation.isPending || !Array.isArray(employees) || employees.length === 0}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <XCircle className="h-4 w-4 mr-2" />
              {deleteAllMutation.isPending ? 'Suppression...' : 'Tout Supprimer'}
            </Button>
            <Button
              variant="outline"
              onClick={handleExportExcel}
              disabled={isExporting || !Array.isArray(employees) || employees.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              {isExporting ? 'Export en cours...' : 'Exporter Excel'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowBulkAssignModal(true)}
              disabled={!Array.isArray(employees) || employees.length === 0}
            >
              <Building2 className="h-4 w-4 mr-2" />
              Assigner à un site
            </Button>
            <Button variant="outline" onClick={() => setShowImportModal(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Importer Excel
            </Button>
            <Button variant="primary" onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nouvel Employé
            </Button>
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
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(employee.id)}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
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
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Ajouter un employé</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Matricule *</label>
                  <Input
                    value={formData.matricule}
                    onChange={(e) => setFormData({ ...formData, matricule: e.target.value })}
                    placeholder="EMP001"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Prénom *</label>
                  <Input
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="Jean"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Nom *</label>
                  <Input
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="Dupont"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Email *</label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="jean.dupont@entreprise.com"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Téléphone</label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="0612345678"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Poste</label>
                  <Input
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    placeholder="Développeur"
                  />
                </div>

                <div className="flex gap-2 justify-end pt-4">
                  <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                    Annuler
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleCreateEmployee}
                    disabled={createMutation.isPending}
                  >
                    {createMutation.isPending ? 'Création...' : 'Créer'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Bulk Assign Site Modal */}
        <BulkAssignSiteModal
          isOpen={showBulkAssignModal}
          onClose={() => setShowBulkAssignModal(false)}
          onSuccess={() => {
            refetch();
            setShowBulkAssignModal(false);
          }}
          employeeCount={Array.isArray(employees) ? employees.length : 0}
        />
      </div>
    </DashboardLayout>
  );
}
