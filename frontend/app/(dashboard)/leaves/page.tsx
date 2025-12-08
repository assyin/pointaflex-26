'use client';

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Plus,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Search,
  FileText,
  ChevronLeft,
  ChevronRight,
  Eye,
  User,
  Settings,
  Edit,
  Trash2,
} from 'lucide-react';
import {
  useLeaves,
  useLeaveTypes,
  useCreateLeave,
  useApproveLeave,
  useRejectLeave,
  useDeleteLeave,
  useCreateLeaveType,
  useUpdateLeaveType,
  useDeleteLeaveType,
} from '@/lib/hooks/useLeaves';

// Create/Edit Leave Type Form Component
function LeaveTypeForm({
  leaveType,
  onSuccess,
  onCancel,
}: {
  leaveType?: any;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const createMutation = useCreateLeaveType();
  const updateMutation = useUpdateLeaveType();
  const [formData, setFormData] = useState({
    name: leaveType?.name || '',
    code: leaveType?.code || '',
    isPaid: leaveType?.isPaid ?? true,
    requiresDocument: leaveType?.requiresDocument ?? false,
    maxDaysPerYear: leaveType?.maxDaysPerYear || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.code) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      const data = {
        name: formData.name,
        code: formData.code,
        isPaid: formData.isPaid,
        requiresDocument: formData.requiresDocument,
        maxDaysPerYear: formData.maxDaysPerYear ? parseInt(formData.maxDaysPerYear) : null,
      };

      if (leaveType) {
        await updateMutation.mutateAsync({ id: leaveType.id, data });
      } else {
        await createMutation.mutateAsync(data);
      }
      onSuccess();
    } catch (error) {
      console.error('Error saving leave type:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-text-primary mb-2">
            Nom *
          </label>
          <Input
            id="name"
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Ex: Congé Annuel"
          />
        </div>

        <div>
          <label htmlFor="code" className="block text-sm font-medium text-text-primary mb-2">
            Code *
          </label>
          <Input
            id="code"
            type="text"
            required
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            placeholder="Ex: CA"
          />
        </div>
      </div>

      <div>
        <label htmlFor="maxDaysPerYear" className="block text-sm font-medium text-text-primary mb-2">
          Nombre maximum de jours par an
        </label>
        <Input
          id="maxDaysPerYear"
          type="number"
          min="0"
          value={formData.maxDaysPerYear}
          onChange={(e) => setFormData({ ...formData, maxDaysPerYear: e.target.value })}
          placeholder="Laisser vide si illimité"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          id="isPaid"
          type="checkbox"
          checked={formData.isPaid}
          onChange={(e) => setFormData({ ...formData, isPaid: e.target.checked })}
          className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
        />
        <label htmlFor="isPaid" className="text-sm font-medium text-text-primary">
          Congé payé
        </label>
      </div>

      <div className="flex items-center gap-2">
        <input
          id="requiresDocument"
          type="checkbox"
          checked={formData.requiresDocument}
          onChange={(e) => setFormData({ ...formData, requiresDocument: e.target.checked })}
          className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
        />
        <label htmlFor="requiresDocument" className="text-sm font-medium text-text-primary">
          Requiert un document justificatif
        </label>
      </div>

      <div className="flex gap-2 justify-end pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={createMutation.isPending || updateMutation.isPending}>
          Annuler
        </Button>
        <Button type="submit" variant="primary" disabled={createMutation.isPending || updateMutation.isPending}>
          {(createMutation.isPending || updateMutation.isPending) ? 'Enregistrement...' : (leaveType ? 'Modifier' : 'Créer')}
        </Button>
      </div>
    </form>
  );
}

// Create Leave Form Component
function CreateLeaveForm({
  leaveTypes,
  onSuccess,
  onCancel,
}: {
  leaveTypes: any[];
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const createMutation = useCreateLeave();
  const [formData, setFormData] = useState({
    employeeId: '',
    leaveTypeId: '',
    startDate: '',
    endDate: '',
    reason: '',
  });

  const calculateDays = (start: string, end: string): number => {
    if (!start || !end) return 0;
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays + 1; // Include both start and end dates
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.employeeId || !formData.leaveTypeId || !formData.startDate || !formData.endDate) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    const days = calculateDays(formData.startDate, formData.endDate);

    try {
      await createMutation.mutateAsync({
        employeeId: formData.employeeId,
        leaveTypeId: formData.leaveTypeId,
        startDate: formData.startDate,
        endDate: formData.endDate,
        reason: formData.reason,
      });
      onSuccess();
    } catch (error) {
      console.error('Error creating leave:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="employeeId" className="block text-sm font-medium text-text-primary mb-2">
          ID Employé *
        </label>
        <Input
          id="employeeId"
          type="text"
          required
          value={formData.employeeId}
          onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
          placeholder="ID de l'employé"
        />
      </div>

      <div>
        <label htmlFor="leaveTypeId" className="block text-sm font-medium text-text-primary mb-2">
          Type de congé *
        </label>
        <select
          id="leaveTypeId"
          required
          value={formData.leaveTypeId}
          onChange={(e) => setFormData({ ...formData, leaveTypeId: e.target.value })}
          className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Sélectionner un type</option>
          {leaveTypes.map((type: any) => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="startDate" className="block text-sm font-medium text-text-primary mb-2">
            Date de début *
          </label>
          <Input
            id="startDate"
            type="date"
            required
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
          />
        </div>

        <div>
          <label htmlFor="endDate" className="block text-sm font-medium text-text-primary mb-2">
            Date de fin *
          </label>
          <Input
            id="endDate"
            type="date"
            required
            value={formData.endDate}
            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
          />
        </div>
      </div>

      {formData.startDate && formData.endDate && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <span className="font-semibold">Durée:</span> {calculateDays(formData.startDate, formData.endDate)} jour(s)
          </p>
        </div>
      )}

      <div>
        <label htmlFor="reason" className="block text-sm font-medium text-text-primary mb-2">
          Motif
        </label>
        <textarea
          id="reason"
          rows={4}
          value={formData.reason}
          onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
          className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="Motif de la demande (optionnel)"
        />
      </div>

      <div className="flex gap-2 justify-end pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={createMutation.isPending}>
          Annuler
        </Button>
        <Button type="submit" variant="primary" disabled={createMutation.isPending}>
          {createMutation.isPending ? 'Création...' : 'Créer la demande'}
        </Button>
      </div>
    </form>
  );
}

export default function LeavesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showLeaveTypesModal, setShowLeaveTypesModal] = useState(false);
  const [showLeaveTypeForm, setShowLeaveTypeForm] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<any>(null);
  const [selectedLeaveType, setSelectedLeaveType] = useState<any>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Fetch leaves data
  const { data: leavesData, isLoading, error } = useLeaves();
  const { data: leaveTypesData } = useLeaveTypes();

  // Mutations
  const approveMutation = useApproveLeave();
  const rejectMutation = useRejectLeave();
  const deleteLeaveTypeMutation = useDeleteLeaveType();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <Badge variant="warning" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            En attente
          </Badge>
        );
      case 'MANAGER_APPROVED':
        return (
          <Badge variant="info" className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Approuvé Manager
          </Badge>
        );
      case 'HR_APPROVED':
      case 'APPROVED':
        return (
          <Badge variant="success" className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Approuvé
          </Badge>
        );
      case 'REJECTED':
        return (
          <Badge variant="danger" className="flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            Rejeté
          </Badge>
        );
      case 'CANCELLED':
        return (
          <Badge variant="default" className="flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            Annulé
          </Badge>
        );
      default:
        return null;
    }
  };

  const handleApprove = async (leaveId: string, currentStatus: string) => {
    // Determine the approval level based on current status
    const level = currentStatus === 'PENDING' ? 'manager' : 'hr';
    await approveMutation.mutateAsync({ id: leaveId, level });
  };

  const handleReject = async (leaveId: string) => {
    setSelectedLeave(filteredLeaves.find((l: any) => l.id === leaveId));
    setShowRejectModal(true);
  };

  const handleViewDetails = (leave: any) => {
    setSelectedLeave(leave);
    setShowDetailsModal(true);
  };

  const handleEditLeaveType = (leaveType: any) => {
    setSelectedLeaveType(leaveType);
    setShowLeaveTypeForm(true);
  };

  const handleDeleteLeaveType = async (leaveTypeId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce type de congé ?')) {
      await deleteLeaveTypeMutation.mutateAsync(leaveTypeId);
    }
  };

  const filteredLeaves = leavesData?.data?.filter((leave: any) => {
    const matchesSearch =
      searchQuery === '' ||
      leave.employee?.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      leave.employee?.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      leave.employee?.matricule?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      selectedStatus === 'all' ||
      leave.status === selectedStatus;

    return matchesSearch && matchesStatus;
  }) || [];

  const pendingCount = leavesData?.data?.filter((l: any) => l.status === 'PENDING').length || 0;
  const managerApprovedCount = leavesData?.data?.filter((l: any) => l.status === 'MANAGER_APPROVED').length || 0;
  const approvedCount = leavesData?.data?.filter((l: any) => ['HR_APPROVED', 'APPROVED'].includes(l.status)).length || 0;

  // Pagination logic
  const totalPages = Math.ceil(filteredLeaves.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedLeaves = filteredLeaves.slice(startIndex, endIndex);

  // Fix hydration error
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedStatus]);

  return (
    <DashboardLayout
      title="Gestion des Congés & Absences"
      subtitle="Demandes, validations et soldes de congés"
    >
      <div className="space-y-6">
        {/* Action Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
              <Input
                type="text"
                placeholder="Rechercher employé..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-64"
              />
            </div>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 border border-border rounded-lg text-sm"
            >
              <option value="all">Tous les statuts</option>
              <option value="PENDING">En attente</option>
              <option value="MANAGER_APPROVED">Approuvé Manager</option>
              <option value="HR_APPROVED">Approuvé RH</option>
              <option value="APPROVED">Approuvé</option>
              <option value="REJECTED">Rejeté</option>
            </select>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowLeaveTypesModal(true)}>
              <Settings className="h-4 w-4 mr-2" />
              Types de congé
            </Button>
            <Button variant="primary" onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle demande
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-secondary">Total demandes</p>
                  <p className="text-2xl font-bold text-text-primary mt-1">
                    {leavesData?.data?.length || 0}
                  </p>
                </div>
                <FileText className="h-10 w-10 text-primary opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-secondary">En attente</p>
                  <p className="text-2xl font-bold text-warning mt-1">
                    {pendingCount}
                  </p>
                </div>
                <Clock className="h-10 w-10 text-warning opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-secondary">Approuvé Manager</p>
                  <p className="text-2xl font-bold text-info mt-1">
                    {managerApprovedCount}
                  </p>
                </div>
                <AlertCircle className="h-10 w-10 text-info opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-secondary">Approuvés</p>
                  <p className="text-2xl font-bold text-success mt-1">
                    {approvedCount}
                  </p>
                </div>
                <CheckCircle className="h-10 w-10 text-success opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Approvals Alert */}
        {(pendingCount > 0 || managerApprovedCount > 0) && (
          <Alert variant="info">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <span className="font-semibold">
                {pendingCount > 0 && `${pendingCount} demande(s) en attente de validation manager. `}
                {managerApprovedCount > 0 && `${managerApprovedCount} demande(s) en attente de validation RH.`}
              </span>
            </AlertDescription>
          </Alert>
        )}

        {/* Leaves Table */}
        <Card>
          <CardHeader>
            <CardTitle>Demandes de congés</CardTitle>
          </CardHeader>
          <CardContent>
            {!isMounted ? (
              <div className="flex items-center justify-center py-12">
                <Clock className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-3 text-text-secondary">Chargement...</span>
              </div>
            ) : isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Clock className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-3 text-text-secondary">Chargement...</span>
              </div>
            ) : error ? (
              <Alert variant="danger">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  Erreur lors du chargement des données. Veuillez réessayer.
                </AlertDescription>
              </Alert>
            ) : filteredLeaves.length === 0 ? (
              <div className="text-center py-12 text-text-secondary">
                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>Aucune demande de congé trouvée.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-table-header text-left text-sm font-semibold text-text-primary">
                      <th className="p-3">Employé</th>
                      <th className="p-3">Type de congé</th>
                      <th className="p-3">Période</th>
                      <th className="p-3">Durée</th>
                      <th className="p-3">Statut</th>
                      <th className="p-3">Workflow</th>
                      <th className="p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-table-border">
                    {paginatedLeaves.map((leave: any) => (
                      <tr key={leave.id} className="hover:bg-table-hover transition-colors">
                        <td className="p-3">
                          <div className="font-medium text-text-primary">
                            {leave.employee?.firstName} {leave.employee?.lastName}
                          </div>
                          <div className="text-sm text-text-secondary">
                            {leave.employee?.matricule}
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge variant="default">
                            {leave.leaveType?.name || 'Non spécifié'}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <div className="text-sm">
                            <div className="font-medium text-text-primary">
                              {format(new Date(leave.startDate), 'dd MMM yyyy', { locale: fr })}
                            </div>
                            <div className="text-text-secondary">
                              au {format(new Date(leave.endDate), 'dd MMM yyyy', { locale: fr })}
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="font-medium text-text-primary">
                            {leave.totalDays} jour{leave.totalDays > 1 ? 's' : ''}
                          </span>
                        </td>
                        <td className="p-3">
                          {getStatusBadge(leave.status)}
                        </td>
                        <td className="p-3">
                          <div className="flex flex-col gap-1 text-xs">
                            {leave.managerApprovedBy && (
                              <div className="flex items-center gap-1 text-success">
                                <CheckCircle className="h-3 w-3" />
                                <span>Manager: {format(new Date(leave.managerApprovedAt), 'dd/MM/yy')}</span>
                              </div>
                            )}
                            {leave.hrApprovedBy && (
                              <div className="flex items-center gap-1 text-success">
                                <CheckCircle className="h-3 w-3" />
                                <span>RH: {format(new Date(leave.hrApprovedAt), 'dd/MM/yy')}</span>
                              </div>
                            )}
                            {leave.status === 'PENDING' && (
                              <div className="text-warning">En attente validation manager</div>
                            )}
                            {leave.status === 'MANAGER_APPROVED' && (
                              <div className="text-info">En attente validation RH</div>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex gap-2 flex-wrap">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDetails(leave)}
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              Détails
                            </Button>
                            {(leave.status === 'PENDING' || leave.status === 'MANAGER_APPROVED') && (
                              <>
                                <Button
                                  variant="success"
                                  size="sm"
                                  onClick={() => handleApprove(leave.id, leave.status)}
                                  disabled={approveMutation.isPending}
                                >
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  {leave.status === 'PENDING' ? 'Manager' : 'RH'}
                                </Button>
                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={() => handleReject(leave.id)}
                                  disabled={rejectMutation.isPending}
                                >
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Rejeter
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {filteredLeaves.length > 0 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-table-border">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-text-secondary">
                    Afficher
                  </span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="px-2 py-1 border border-border rounded text-sm"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span className="text-sm text-text-secondary">
                    par page
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-sm text-text-secondary">
                    {startIndex + 1}-{Math.min(endIndex, filteredLeaves.length)} sur {filteredLeaves.length}
                  </span>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>

                    {/* Page Numbers */}
                    <div className="flex gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }

                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? 'primary' : 'outline'}
                            size="sm"
                            onClick={() => setCurrentPage(pageNum)}
                            className="min-w-[2rem]"
                          >
                            {pageNum}
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
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Leave Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto m-4">
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-text-primary">Nouvelle demande de congé</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-text-secondary hover:text-text-primary"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <CreateLeaveForm
                leaveTypes={leaveTypesData || []}
                onSuccess={() => {
                  setShowCreateModal(false);
                }}
                onCancel={() => setShowCreateModal(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedLeave && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full m-4">
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-text-primary">Rejeter la demande</h2>
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setSelectedLeave(null);
                  }}
                  className="text-text-secondary hover:text-text-primary"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <p className="text-sm text-text-secondary mb-2">
                  Vous êtes sur le point de rejeter la demande de congé de{' '}
                  <span className="font-semibold text-text-primary">
                    {selectedLeave.employee?.firstName} {selectedLeave.employee?.lastName}
                  </span>
                </p>
                <p className="text-sm text-text-secondary">
                  Du {format(new Date(selectedLeave.startDate), 'dd MMM yyyy', { locale: fr })} au{' '}
                  {format(new Date(selectedLeave.endDate), 'dd MMM yyyy', { locale: fr })}
                </p>
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const reason = formData.get('reason') as string;

                  if (!reason || reason.trim() === '') {
                    alert('Veuillez fournir une raison pour le rejet');
                    return;
                  }

                  await rejectMutation.mutateAsync({
                    id: selectedLeave.id,
                    reason: reason.trim(),
                  });

                  setShowRejectModal(false);
                  setSelectedLeave(null);
                }}
              >
                <div className="mb-4">
                  <label htmlFor="reason" className="block text-sm font-medium text-text-primary mb-2">
                    Raison du rejet *
                  </label>
                  <textarea
                    id="reason"
                    name="reason"
                    rows={4}
                    required
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Expliquez la raison du rejet..."
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowRejectModal(false);
                      setSelectedLeave(null);
                    }}
                    disabled={rejectMutation.isPending}
                  >
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    variant="danger"
                    disabled={rejectMutation.isPending}
                  >
                    {rejectMutation.isPending ? 'Traitement...' : 'Rejeter'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedLeave && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto m-4">
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-text-primary">Détails de la demande</h2>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedLeave(null);
                  }}
                  className="text-text-secondary hover:text-text-primary"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Employee Info */}
                <div>
                  <h3 className="font-semibold text-text-primary mb-3 flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Informations employé
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-text-secondary">Nom:</span>{' '}
                      <span className="text-text-primary font-medium">
                        {selectedLeave.employee?.firstName} {selectedLeave.employee?.lastName}
                      </span>
                    </div>
                    <div>
                      <span className="text-text-secondary">Matricule:</span>{' '}
                      <span className="text-text-primary">{selectedLeave.employee?.matricule}</span>
                    </div>
                  </div>
                </div>

                {/* Leave Info */}
                <div>
                  <h3 className="font-semibold text-text-primary mb-3 flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Informations congé
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-text-secondary">Type:</span>{' '}
                      <Badge variant="default">{selectedLeave.leaveType?.name}</Badge>
                    </div>
                    <div>
                      <span className="text-text-secondary">Statut:</span>{' '}
                      {getStatusBadge(selectedLeave.status)}
                    </div>
                    <div>
                      <span className="text-text-secondary">Durée:</span>{' '}
                      <span className="text-text-primary font-medium">
                        {selectedLeave.totalDays} jour{selectedLeave.totalDays > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Dates */}
                <div>
                  <h3 className="font-semibold text-text-primary mb-3">Période</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-text-secondary">Début:</span>{' '}
                      <span className="text-text-primary">
                        {format(new Date(selectedLeave.startDate), 'dd MMMM yyyy', { locale: fr })}
                      </span>
                    </div>
                    <div>
                      <span className="text-text-secondary">Fin:</span>{' '}
                      <span className="text-text-primary">
                        {format(new Date(selectedLeave.endDate), 'dd MMMM yyyy', { locale: fr })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Workflow */}
                <div>
                  <h3 className="font-semibold text-text-primary mb-3">Workflow</h3>
                  <div className="space-y-2 text-sm">
                    {selectedLeave.managerApprovedBy ? (
                      <div className="flex items-center gap-2 text-success">
                        <CheckCircle className="h-4 w-4" />
                        <span>
                          Manager approuvé le{' '}
                          {format(new Date(selectedLeave.managerApprovedAt), 'dd/MM/yyyy')}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-warning">
                        <Clock className="h-4 w-4" />
                        <span>En attente validation manager</span>
                      </div>
                    )}
                    {selectedLeave.hrApprovedBy ? (
                      <div className="flex items-center gap-2 text-success">
                        <CheckCircle className="h-4 w-4" />
                        <span>
                          RH approuvé le {format(new Date(selectedLeave.hrApprovedAt), 'dd/MM/yyyy')}
                        </span>
                      </div>
                    ) : selectedLeave.status === 'MANAGER_APPROVED' ? (
                      <div className="flex items-center gap-2 text-info">
                        <AlertCircle className="h-4 w-4" />
                        <span>En attente validation RH</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Reason */}
              {selectedLeave.reason && (
                <div className="mt-6 pt-6 border-t border-border">
                  <h3 className="font-semibold text-text-primary mb-2">Motif</h3>
                  <p className="text-sm text-text-secondary">{selectedLeave.reason}</p>
                </div>
              )}

              {/* Rejection Reason */}
              {selectedLeave.rejectionReason && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <h3 className="font-semibold text-danger mb-2 flex items-center gap-2">
                    <XCircle className="h-4 w-4" />
                    Raison du rejet
                  </h3>
                  <p className="text-sm text-text-secondary">{selectedLeave.rejectionReason}</p>
                </div>
              )}

              {/* Actions */}
              <div className="mt-6 pt-6 border-t border-border flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedLeave(null);
                  }}
                >
                  Fermer
                </Button>
                {(selectedLeave.status === 'PENDING' || selectedLeave.status === 'MANAGER_APPROVED') && (
                  <>
                    <Button
                      variant="success"
                      onClick={async () => {
                        await handleApprove(selectedLeave.id, selectedLeave.status);
                        setShowDetailsModal(false);
                        setSelectedLeave(null);
                      }}
                      disabled={approveMutation.isPending}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {selectedLeave.status === 'PENDING' ? 'Approuver (Manager)' : 'Approuver (RH)'}
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => {
                        setShowDetailsModal(false);
                        setShowRejectModal(true);
                      }}
                      disabled={rejectMutation.isPending}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Rejeter
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leave Types Management Modal */}
      {showLeaveTypesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto m-4">
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-text-primary">Gestion des types de congé</h2>
                <button
                  onClick={() => setShowLeaveTypesModal(false)}
                  className="text-text-secondary hover:text-text-primary"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="flex justify-end mb-4">
                <Button
                  variant="primary"
                  onClick={() => {
                    setSelectedLeaveType(null);
                    setShowLeaveTypeForm(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nouveau type de congé
                </Button>
              </div>

              {leaveTypesData?.length === 0 ? (
                <div className="text-center py-12 text-text-secondary">
                  <Settings className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>Aucun type de congé configuré.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-table-header text-left text-sm font-semibold text-text-primary">
                        <th className="p-3">Nom</th>
                        <th className="p-3">Code</th>
                        <th className="p-3">Type</th>
                        <th className="p-3">Max jours/an</th>
                        <th className="p-3">Document requis</th>
                        <th className="p-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-table-border">
                      {leaveTypesData?.map((leaveType: any) => (
                        <tr key={leaveType.id} className="hover:bg-table-hover transition-colors">
                          <td className="p-3 font-medium text-text-primary">{leaveType.name}</td>
                          <td className="p-3">
                            <Badge variant="default">{leaveType.code}</Badge>
                          </td>
                          <td className="p-3">
                            {leaveType.isPaid ? (
                              <Badge variant="success">Payé</Badge>
                            ) : (
                              <Badge variant="default">Non payé</Badge>
                            )}
                          </td>
                          <td className="p-3 text-text-secondary">
                            {leaveType.maxDaysPerYear || 'Illimité'}
                          </td>
                          <td className="p-3">
                            {leaveType.requiresDocument ? (
                              <Badge variant="info">Oui</Badge>
                            ) : (
                              <Badge variant="default">Non</Badge>
                            )}
                          </td>
                          <td className="p-3">
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditLeaveType(leaveType)}
                              >
                                <Edit className="h-3 w-3 mr-1" />
                                Modifier
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => handleDeleteLeaveType(leaveType.id)}
                                disabled={deleteLeaveTypeMutation.isPending}
                              >
                                <Trash2 className="h-3 w-3 mr-1" />
                                Supprimer
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Leave Type Form Modal */}
      {showLeaveTypeForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto m-4">
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-text-primary">
                  {selectedLeaveType ? 'Modifier le type de congé' : 'Nouveau type de congé'}
                </h2>
                <button
                  onClick={() => {
                    setShowLeaveTypeForm(false);
                    setSelectedLeaveType(null);
                  }}
                  className="text-text-secondary hover:text-text-primary"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <LeaveTypeForm
                leaveType={selectedLeaveType}
                onSuccess={() => {
                  setShowLeaveTypeForm(false);
                  setSelectedLeaveType(null);
                }}
                onCancel={() => {
                  setShowLeaveTypeForm(false);
                  setSelectedLeaveType(null);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
