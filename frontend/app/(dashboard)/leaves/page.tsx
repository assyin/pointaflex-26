'use client';

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { PermissionGate } from '@/components/auth/PermissionGate';
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
  Filter,
  X,
  Download,
  Loader2,
  Building2,
  Users,
  Briefcase,
  Upload,
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
  useUploadLeaveDocument,
  useDownloadLeaveDocument,
  useDeleteLeaveDocument,
  useLeaveWorkflowConfig,
} from '@/lib/hooks/useLeaves';
import { FileUpload } from '@/components/leaves/FileUpload';
import { useEmployees } from '@/lib/hooks/useEmployees';
import { useDepartments } from '@/lib/hooks/useDepartments';
import { useSites } from '@/lib/hooks/useSites';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { SearchableEmployeeSelect } from '@/components/schedules/SearchableEmployeeSelect';
import { LeaveBalanceManager } from '@/components/leaves/LeaveBalanceManager';

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
  const uploadDocumentMutation = useUploadLeaveDocument();
  const { data: employeesData } = useEmployees();
  const employees = Array.isArray(employeesData) ? employeesData : (employeesData?.data || []);

  const [formData, setFormData] = useState({
    employeeId: '',
    leaveTypeId: '',
    startDate: '',
    endDate: '',
    reason: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [workingDaysData, setWorkingDaysData] = useState<{
    workingDays: number;
    excludedWeekends: number;
    excludedHolidays: number;
    totalCalendarDays: number;
    includeSaturday: boolean;
    details: Array<{ date: string; isWorking: boolean; reason?: string }>;
  } | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // État pour le solde de congés
  const [balanceData, setBalanceData] = useState<{
    quota: number;
    taken: number;
    pending: number;
    remaining: number;
    hasPersonalizedQuota: boolean;
  } | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  // Charger le solde quand l'employé change
  useEffect(() => {
    const fetchBalance = async () => {
      if (!formData.employeeId) {
        setBalanceData(null);
        return;
      }

      setIsLoadingBalance(true);
      try {
        const { leavesApi } = await import('@/lib/api/leaves');
        const result = await leavesApi.getQuickBalance(formData.employeeId);
        setBalanceData(result);
      } catch (error) {
        console.error('Error fetching balance:', error);
        setBalanceData(null);
      } finally {
        setIsLoadingBalance(false);
      }
    };

    fetchBalance();
  }, [formData.employeeId]);

  // Calculate working days when dates or employee change
  // MODIFIÉ: Passer employeeId pour vérifier le planning personnalisé (rotation 4/2, etc.)
  useEffect(() => {
    const fetchWorkingDays = async () => {
      if (!formData.startDate || !formData.endDate) {
        setWorkingDaysData(null);
        return;
      }

      // Vérifier que la date de fin est >= date de début
      if (new Date(formData.endDate) < new Date(formData.startDate)) {
        setWorkingDaysData(null);
        return;
      }

      setIsCalculating(true);
      try {
        const { leavesApi } = await import('@/lib/api/leaves');
        // MODIFIÉ: Passer employeeId pour tenir compte du planning personnalisé
        const result = await leavesApi.calculateWorkingDays(
          formData.startDate,
          formData.endDate,
          formData.employeeId || undefined
        );
        setWorkingDaysData(result);
      } catch (error) {
        console.error('Error calculating working days:', error);
        setWorkingDaysData(null);
      } finally {
        setIsCalculating(false);
      }
    };

    fetchWorkingDays();
  }, [formData.startDate, formData.endDate, formData.employeeId]); // MODIFIÉ: Ajout de employeeId

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.employeeId || !formData.leaveTypeId || !formData.startDate || !formData.endDate) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      // Créer la demande de congé
      const leave = await createMutation.mutateAsync({
        employeeId: formData.employeeId,
        leaveTypeId: formData.leaveTypeId,
        startDate: formData.startDate,
        endDate: formData.endDate,
        reason: formData.reason,
      });

      // Uploader le document si un fichier a été sélectionné
      if (selectedFile && leave?.id) {
        try {
          await uploadDocumentMutation.mutateAsync({
            id: leave.id,
            file: selectedFile,
          });
        } catch (uploadError) {
          console.error('Error uploading document:', uploadError);
          // Ne pas bloquer si l'upload échoue, la demande est déjà créée
        }
      }

      onSuccess();
    } catch (error) {
      console.error('Error creating leave:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <SearchableEmployeeSelect
          value={formData.employeeId}
          onChange={(value) => setFormData({ ...formData, employeeId: value })}
          employees={employees}
          isLoading={!employees.length}
          label="Employé"
          placeholder="Rechercher un employé..."
          required
        />
      </div>

      {/* Affichage du solde de congés */}
      {formData.employeeId && (
        <div className={`p-3 rounded-lg border ${
          balanceData && balanceData.remaining <= 0
            ? 'bg-red-50 border-red-200'
            : balanceData && balanceData.remaining <= 5
            ? 'bg-yellow-50 border-yellow-200'
            : 'bg-gray-50 border-gray-200'
        }`}>
          {isLoadingBalance ? (
            <p className="text-sm text-gray-600 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Chargement du solde...
            </p>
          ) : balanceData ? (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Solde de congés</span>
                {balanceData.hasPersonalizedQuota && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                    Quota personnalisé
                  </span>
                )}
              </div>
              <div className="flex gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Quota:</span>{' '}
                  <span className="font-semibold">{balanceData.quota}j</span>
                </div>
                <div>
                  <span className="text-gray-500">Pris:</span>{' '}
                  <span className="font-semibold text-orange-600">{balanceData.taken}j</span>
                </div>
                {balanceData.pending > 0 && (
                  <div>
                    <span className="text-gray-500">En attente:</span>{' '}
                    <span className="font-semibold text-yellow-600">{balanceData.pending}j</span>
                  </div>
                )}
                <div>
                  <span className="text-gray-500">Restant:</span>{' '}
                  <span className={`font-semibold ${
                    balanceData.remaining <= 0 ? 'text-red-600' :
                    balanceData.remaining <= 5 ? 'text-yellow-600' : 'text-green-600'
                  }`}>
                    {balanceData.remaining}j
                  </span>
                </div>
              </div>
              {balanceData.remaining <= 0 && (
                <p className="text-xs text-red-600 mt-1">
                  ⚠️ Solde insuffisant. La demande pourra être refusée.
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Impossible de charger le solde</p>
          )}
        </div>
      )}

      <div>
        <label htmlFor="leaveTypeId" className="block text-sm font-medium text-text-primary mb-2">
          Type de congé *
        </label>
        {leaveTypes.length === 0 ? (
          <div className="w-full px-3 py-2 border border-yellow-300 bg-yellow-50 rounded-lg">
            <p className="text-sm text-yellow-800">
              ⚠️ Aucun type de congé configuré. Veuillez créer des types de congé dans la section "Types de congé" ci-dessous avant de créer une demande.
            </p>
          </div>
        ) : (
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
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="startDate" className="block text-sm font-medium text-text-primary mb-2">
            Date de début * <span className="text-gray-500 font-normal">(Incluse)</span>
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
            Date de fin * <span className="text-gray-500 font-normal">(Incluse)</span>
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
        <div className={`p-3 border rounded-lg space-y-2 ${
          (workingDaysData as any)?.isPersonalizedSchedule
            ? 'bg-green-50 border-green-200'
            : 'bg-blue-50 border-blue-200'
        }`}>
          {isCalculating ? (
            <p className="text-sm text-blue-800 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Calcul des jours ouvrables...
            </p>
          ) : workingDaysData ? (
            <>
              <p className={`text-sm ${(workingDaysData as any)?.isPersonalizedSchedule ? 'text-green-800' : 'text-blue-800'}`}>
                <span className="font-semibold">Durée:</span> {workingDaysData.workingDays} jour(s) {(workingDaysData as any)?.isPersonalizedSchedule ? 'planifié(s)' : 'ouvrable(s)'}
              </p>
              <div className={`text-xs space-y-1 ${(workingDaysData as any)?.isPersonalizedSchedule ? 'text-green-600' : 'text-blue-600'}`}>
                {(workingDaysData as any)?.isPersonalizedSchedule ? (
                  <p className="font-medium">
                    ✓ Calcul basé sur le planning personnalisé de l'employé (jours fériés et weekends inclus si planifiés)
                  </p>
                ) : (
                  <p>
                    {workingDaysData.totalCalendarDays} jour(s) calendaire(s) total
                    {workingDaysData.excludedWeekends > 0 && (
                      <span> • {workingDaysData.excludedWeekends} week-end(s) exclu(s)</span>
                    )}
                    {workingDaysData.excludedHolidays > 0 && (
                      <span> • {workingDaysData.excludedHolidays} jour(s) férié(s) exclu(s)</span>
                    )}
                  </p>
                )}
                {workingDaysData.includeSaturday && !(workingDaysData as any)?.isPersonalizedSchedule && (
                  <p className="text-blue-500">
                    <span className="font-medium">Note:</span> Le samedi est inclus dans le calcul des congés
                  </p>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-yellow-700">
              Impossible de calculer la durée
            </p>
          )}
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

      <FileUpload
        file={selectedFile}
        onFileChange={setSelectedFile}
        disabled={createMutation.isPending || uploadDocumentMutation.isPending}
      />

      <div className="flex gap-2 justify-end pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={createMutation.isPending || uploadDocumentMutation.isPending}>
          Annuler
        </Button>
        <Button type="submit" variant="primary" disabled={createMutation.isPending || uploadDocumentMutation.isPending}>
          {(createMutation.isPending || uploadDocumentMutation.isPending) ? 'Création...' : 'Créer la demande'}
        </Button>
      </div>
    </form>
  );
}

export default function LeavesPage() {
  const { user, hasRole } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showLeaveTypesModal, setShowLeaveTypesModal] = useState(false);
  const [showLeaveTypeForm, setShowLeaveTypeForm] = useState(false);
  const [showBalanceManager, setShowBalanceManager] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<any>(null);
  const [selectedLeaveType, setSelectedLeaveType] = useState<any>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Check if user is HR admin
  const isHRAdmin = hasRole('ADMIN_RH') || user?.role === 'ADMIN_RH';
  const isManager = hasRole('MANAGER') || user?.role === 'MANAGER';
  
  // Advanced filters
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filterLeaveType, setFilterLeaveType] = useState<string>('all');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [filterSite, setFilterSite] = useState<string>('all');
  const [filterEmployee, setFilterEmployee] = useState<string>('all');
  const [filterDateStart, setFilterDateStart] = useState<string>('');
  const [filterDateEnd, setFilterDateEnd] = useState<string>('');

  // Fetch leaves data
  const { data: leavesData, isLoading, error } = useLeaves();
  const { data: leaveTypesData } = useLeaveTypes();
  const { data: employeesData } = useEmployees();
  const { data: departmentsData } = useDepartments();
  const { data: sitesData } = useSites();
  const { data: workflowConfig } = useLeaveWorkflowConfig();

  // Configuration du workflow (par défaut: 2 niveaux)
  const twoLevelWorkflow = workflowConfig?.twoLevelWorkflow ?? true;
  const leaveApprovalLevels = workflowConfig?.leaveApprovalLevels ?? 2;

  // Normalize data structures - handle both array and { data: [...] } formats
  const sites = Array.isArray(sitesData) ? sitesData : (sitesData?.data || []);
  const departments = Array.isArray(departmentsData) ? departmentsData : ((departmentsData as any)?.data || []);
  const leaveTypes = Array.isArray(leaveTypesData) ? leaveTypesData : (leaveTypesData?.data || []);
  const employees = Array.isArray(employeesData) ? employeesData : (employeesData?.data || []);

  // Mutations
  const approveMutation = useApproveLeave();
  const rejectMutation = useRejectLeave();
  const deleteLeaveTypeMutation = useDeleteLeaveType();
  const downloadDocumentMutation = useDownloadLeaveDocument();
  const uploadDocumentMutation = useUploadLeaveDocument();
  const deleteDocumentMutation = useDeleteLeaveDocument();

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
    // Search filter
    const matchesSearch =
      searchQuery === '' ||
      leave.employee?.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      leave.employee?.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      leave.employee?.matricule?.toLowerCase().includes(searchQuery.toLowerCase());

    // Status filter
    const matchesStatus =
      selectedStatus === 'all' ||
      leave.status === selectedStatus;

    // Leave type filter
    const matchesLeaveType =
      filterLeaveType === 'all' ||
      leave.leaveTypeId === filterLeaveType;

    // Department filter
    const matchesDepartment =
      filterDepartment === 'all' ||
      leave.employee?.departmentId === filterDepartment ||
      leave.employee?.department?.id === filterDepartment;

    // Site filter
    const matchesSite =
      filterSite === 'all' ||
      leave.employee?.siteId === filterSite ||
      leave.employee?.site?.id === filterSite;

    // Employee filter
    const matchesEmployee =
      filterEmployee === 'all' ||
      leave.employeeId === filterEmployee;

    // Date range filter
    const matchesDateRange = (() => {
      if (!filterDateStart && !filterDateEnd) return true;
      const leaveStart = new Date(leave.startDate);
      const leaveEnd = new Date(leave.endDate);
      const filterStart = filterDateStart ? new Date(filterDateStart) : null;
      const filterEnd = filterDateEnd ? new Date(filterDateEnd) : null;

      if (filterStart && filterEnd) {
        return (leaveStart >= filterStart && leaveStart <= filterEnd) ||
               (leaveEnd >= filterStart && leaveEnd <= filterEnd) ||
               (leaveStart <= filterStart && leaveEnd >= filterEnd);
      }
      if (filterStart) {
        return leaveEnd >= filterStart;
      }
      if (filterEnd) {
        return leaveStart <= filterEnd;
      }
      return true;
    })();

    return matchesSearch && matchesStatus && matchesLeaveType && 
           matchesDepartment && matchesSite && matchesEmployee && matchesDateRange;
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
  }, [searchQuery, selectedStatus, filterLeaveType, filterDepartment, filterSite, filterEmployee, filterDateStart, filterDateEnd]);

  // Reset filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedStatus('all');
    setFilterLeaveType('all');
    setFilterDepartment('all');
    setFilterSite('all');
    setFilterEmployee('all');
    setFilterDateStart('');
    setFilterDateEnd('');
    setCurrentPage(1);
  };

  const hasActiveFilters = searchQuery || selectedStatus !== 'all' || filterLeaveType !== 'all' || 
    filterDepartment !== 'all' || filterSite !== 'all' || filterEmployee !== 'all' || 
    filterDateStart || filterDateEnd;

  return (
    <ProtectedRoute permissions={['leave.view_all', 'leave.view_own', 'leave.view_team']}>
      <DashboardLayout
        title="Gestion des Congés & Absences"
        subtitle="Demandes, validations et soldes de congés"
      >
      <div className="space-y-6">
        {/* Filters Card */}
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-gray-900">Filtres et actions</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className="border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  {showAdvancedFilters ? 'Masquer' : 'Filtres avancés'}
                </Button>
                {hasActiveFilters && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetFilters}
                    className="border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Réinitialiser
                  </Button>
                )}
                <PermissionGate permissions={['leave.view_all', 'leave.update']}>
                  <Button variant="outline" size="sm" onClick={() => setShowBalanceManager(true)} className="border-gray-300 text-gray-700 hover:bg-gray-50">
                    <Calendar className="h-4 w-4 mr-2" />
                    Soldes
                  </Button>
                </PermissionGate>
                <PermissionGate permissions={['leavetype.view_all', 'leavetype.manage']}>
                  <Button variant="outline" size="sm" onClick={() => setShowLeaveTypesModal(true)} className="border-gray-300 text-gray-700 hover:bg-gray-50">
                    <Settings className="h-4 w-4 mr-2" />
                    Types
                  </Button>
                </PermissionGate>
                <PermissionGate permission="leave.create">
                  <Button variant="primary" size="sm" onClick={() => setShowCreateModal(true)} className="bg-gray-900 hover:bg-gray-800">
                    <Plus className="h-4 w-4 mr-2" />
                    Nouvelle demande
                  </Button>
                </PermissionGate>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Basic Filters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Rechercher par nom, matricule..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-11 border-gray-300 focus:border-gray-500 focus:ring-gray-500"
                  />
                </div>

                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="h-11 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 bg-white"
                >
                  <option value="all">Tous les statuts</option>
                  <option value="PENDING">En attente</option>
                  <option value="MANAGER_APPROVED">Approuvé Manager</option>
                  <option value="HR_APPROVED">Approuvé RH</option>
                  <option value="APPROVED">Approuvé</option>
                  <option value="REJECTED">Rejeté</option>
                  <option value="CANCELLED">Annulé</option>
                </select>

                <select
                  value={filterLeaveType}
                  onChange={(e) => setFilterLeaveType(e.target.value)}
                  className="h-11 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 bg-white"
                >
                  <option value="all">Tous les types de congé</option>
                  {leaveTypes?.map((type: any) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Advanced Filters */}
              {showAdvancedFilters && (
                <div className="pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <Label htmlFor="filterDepartment" className="text-sm font-semibold text-gray-700 mb-2 block">
                        <Building2 className="h-4 w-4 inline mr-1" />
                        Département
                      </Label>
                      <select
                        id="filterDepartment"
                        value={filterDepartment}
                        onChange={(e) => setFilterDepartment(e.target.value)}
                        className="w-full h-11 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 bg-white"
                      >
                        <option value="all">Tous les départements</option>
                        {departments?.map((dept: any) => (
                          <option key={dept.id} value={dept.id}>
                            {dept.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="filterSite" className="text-sm font-semibold text-gray-700 mb-2 block">
                        <Briefcase className="h-4 w-4 inline mr-1" />
                        Site
                      </Label>
                      <select
                        id="filterSite"
                        value={filterSite}
                        onChange={(e) => setFilterSite(e.target.value)}
                        className="w-full h-11 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 bg-white"
                      >
                        <option value="all">Tous les sites</option>
                        {sites?.map((site: any) => (
                          <option key={site.id} value={site.id}>
                            {site.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="filterEmployee" className="text-sm font-semibold text-gray-700 mb-2 block">
                        <Users className="h-4 w-4 inline mr-1" />
                        Employé
                      </Label>
                      <select
                        id="filterEmployee"
                        value={filterEmployee}
                        onChange={(e) => setFilterEmployee(e.target.value)}
                        className="w-full h-11 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 bg-white"
                      >
                        <option value="all">Tous les employés</option>
                        {employees?.map((emp: any) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.firstName} {emp.lastName} ({emp.matricule})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="filterDateStart" className="text-sm font-semibold text-gray-700 mb-2 block">
                        <Calendar className="h-4 w-4 inline mr-1" />
                        Période
                      </Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          id="filterDateStart"
                          type="date"
                          value={filterDateStart}
                          onChange={(e) => setFilterDateStart(e.target.value)}
                          className="h-11 border-gray-300 focus:border-gray-500 focus:ring-gray-500"
                          placeholder="Date début"
                        />
                        <Input
                          id="filterDateEnd"
                          type="date"
                          value={filterDateEnd}
                          onChange={(e) => setFilterDateEnd(e.target.value)}
                          className="h-11 border-gray-300 focus:border-gray-500 focus:ring-gray-500"
                          placeholder="Date fin"
                          min={filterDateStart}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Total demandes</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {leavesData?.meta?.total || leavesData?.data?.length || 0}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-xl">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">En attente</p>
                  <p className="text-3xl font-bold text-orange-600">
                    {pendingCount}
                  </p>
                </div>
                <div className="p-3 bg-orange-100 rounded-xl">
                  <Clock className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Approuvé Manager</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {managerApprovedCount}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-xl">
                  <AlertCircle className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Approuvés</p>
                  <p className="text-3xl font-bold text-green-600">
                    {approvedCount}
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-xl">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
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
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="pb-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-gray-900">Demandes de congés</CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  {filteredLeaves.length} résultat{filteredLeaves.length > 1 ? 's' : ''}
                </span>
                <PermissionGate permissions={['leave.export', 'leave.view_all']}>
                  <Button variant="outline" size="sm" className="border-gray-300 text-gray-700 hover:bg-gray-50">
                    <Download className="h-4 w-4 mr-2" />
                    Exporter
                  </Button>
                </PermissionGate>
              </div>
            </div>
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
                    <tr className="bg-gray-50 border-b border-gray-200 text-left text-sm font-semibold text-gray-700">
                      <th className="px-4 py-4">Employé</th>
                      <th className="px-4 py-4">Site</th>
                      <th className="px-4 py-4">Département</th>
                      <th className="px-4 py-4">Type de congé</th>
                      <th className="px-4 py-4">Période</th>
                      <th className="px-4 py-4">Durée</th>
                      <th className="px-4 py-4">Document</th>
                      <th className="px-4 py-4">Statut</th>
                      <th className="px-4 py-4">Workflow</th>
                      <th className="px-4 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginatedLeaves.map((leave: any) => (
                      <tr key={leave.id} className="hover:bg-gray-50 transition-colors duration-150 border-b border-gray-100">
                        <td className="px-4 py-4">
                          <div className="font-semibold text-gray-900">
                            {leave.employee?.firstName} {leave.employee?.lastName}
                          </div>
                          <div className="text-sm text-gray-500 mt-0.5">
                            {leave.employee?.matricule}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600">
                          {leave.employee?.site?.name || leave.employee?.site?.code || '-'}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600">
                          {leave.employee?.department?.name || leave.employee?.department?.code || '-'}
                        </td>
                        <td className="px-4 py-4">
                          <Badge className="bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200">
                            {leave.leaveType?.name || 'Non spécifié'}
                          </Badge>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm">
                            <div className="font-medium text-gray-900">
                              {format(new Date(leave.startDate), 'dd MMM yyyy', { locale: fr })}
                            </div>
                            <div className="text-gray-500">
                              au {format(new Date(leave.endDate), 'dd MMM yyyy', { locale: fr })}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="font-semibold text-gray-900">
                            {leave.days || leave.totalDays} jour{(leave.days || leave.totalDays) > 1 ? 's' : ''}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          {leave.document ? (
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-primary" />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => downloadDocumentMutation.mutate(leave.id)}
                                disabled={downloadDocumentMutation.isPending}
                                className="h-7 text-xs border-gray-300 text-gray-700 hover:bg-gray-50"
                              >
                                {downloadDocumentMutation.isPending ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <>
                                    <Download className="h-3 w-3 mr-1" />
                                    Télécharger
                                  </>
                                )}
                              </Button>
                              {(isManager || isHRAdmin || ((user as any)?.employeeId === leave.employeeId && leave.status === 'PENDING')) && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const input = document.createElement('input');
                                    input.type = 'file';
                                    input.accept = '.pdf,.doc,.docx,.jpg,.jpeg,.png,.gif';
                                    input.onchange = async (e: any) => {
                                      const file = e.target.files[0];
                                      if (file) {
                                        await uploadDocumentMutation.mutateAsync({ id: leave.id, file });
                                      }
                                    };
                                    input.click();
                                  }}
                                  disabled={uploadDocumentMutation.isPending}
                                  className="h-7 text-xs border-gray-300 text-gray-700 hover:bg-gray-50"
                                >
                                  {uploadDocumentMutation.isPending ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <>
                                      <Upload className="h-3 w-3 mr-1" />
                                      Modifier
                                    </>
                                  )}
                                </Button>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-400">Aucun document</span>
                              {(isManager || isHRAdmin || ((user as any)?.employeeId === leave.employeeId && leave.status === 'PENDING')) && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const input = document.createElement('input');
                                    input.type = 'file';
                                    input.accept = '.pdf,.doc,.docx,.jpg,.jpeg,.png,.gif';
                                    input.onchange = async (e: any) => {
                                      const file = e.target.files[0];
                                      if (file) {
                                        await uploadDocumentMutation.mutateAsync({ id: leave.id, file });
                                      }
                                    };
                                    input.click();
                                  }}
                                  disabled={uploadDocumentMutation.isPending}
                                  className="h-7 text-xs border-gray-300 text-gray-700 hover:bg-gray-50"
                                >
                                  {uploadDocumentMutation.isPending ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <>
                                      <Upload className="h-3 w-3 mr-1" />
                                      Ajouter
                                    </>
                                  )}
                                </Button>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          {getStatusBadge(leave.status)}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-col gap-1 text-xs">
                            {leave.managerApprovedBy && (
                              <div className="flex items-center gap-1 text-green-600">
                                <CheckCircle className="h-3 w-3" />
                                <span>Manager: {format(new Date(leave.managerApprovedAt), 'dd/MM/yy')}</span>
                              </div>
                            )}
                            {leave.hrApprovedBy && (
                              <div className="flex items-center gap-1 text-green-600">
                                <CheckCircle className="h-3 w-3" />
                                <span>RH: {format(new Date(leave.hrApprovedAt), 'dd/MM/yy')}</span>
                              </div>
                            )}
                            {leave.status === 'PENDING' && (
                              <div className="text-orange-600 font-medium">En attente validation manager</div>
                            )}
                            {leave.status === 'MANAGER_APPROVED' && (
                              <div className="text-blue-600 font-medium">En attente validation RH</div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex gap-2 flex-wrap justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDetails(leave)}
                              className="h-8 border-gray-300 text-gray-700 hover:bg-gray-50"
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              Détails
                            </Button>
                            <PermissionGate permission="leave.approve">
                              {(() => {
                                // Logique selon la configuration du workflow
                                let canApprove = false;
                                let buttonLabel = 'Approuver';

                                if (!twoLevelWorkflow || leaveApprovalLevels === 1) {
                                  // Workflow à 1 niveau: tout le monde peut approuver un congé PENDING
                                  canApprove = leave.status === 'PENDING';
                                  buttonLabel = 'Approuver';
                                } else {
                                  // Workflow à 2+ niveaux
                                  if (isHRAdmin) {
                                    // HR peut approuver uniquement après validation manager
                                    canApprove = leave.status === 'MANAGER_APPROVED';
                                    buttonLabel = 'Approuver RH';
                                  } else if (isManager) {
                                    // Manager peut approuver les congés PENDING
                                    canApprove = leave.status === 'PENDING';
                                    buttonLabel = 'Approuver Manager';
                                  } else {
                                    // SUPER_ADMIN peut approuver à tous les niveaux
                                    canApprove = leave.status === 'PENDING' || leave.status === 'MANAGER_APPROVED';
                                    buttonLabel = leave.status === 'PENDING' ? 'Approuver Manager' : 'Approuver RH';
                                  }
                                }

                                if (!canApprove) return null;

                                return (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleApprove(leave.id, leave.status)}
                                      disabled={approveMutation.isPending}
                                      className="h-8 bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                                    >
                                      {approveMutation.isPending ? (
                                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                      ) : (
                                        <CheckCircle className="h-3 w-3 mr-1" />
                                      )}
                                      {buttonLabel}
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleReject(leave.id)}
                                      disabled={rejectMutation.isPending}
                                      className="h-8 bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                                    >
                                      {rejectMutation.isPending ? (
                                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                      ) : (
                                        <XCircle className="h-3 w-3 mr-1" />
                                      )}
                                      Rejeter
                                    </Button>
                                  </>
                                );
                              })()}
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
                leaveTypes={leaveTypes || []}
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
                        {selectedLeave.days} jour{selectedLeave.days > 1 ? 's' : ''}
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

              {/* Document */}
              <div className="mt-6 pt-6 border-t border-border">
                <h3 className="font-semibold text-text-primary mb-3 flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Document attaché
                </h3>
                {selectedLeave.document ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {selectedLeave.documentName || 'Document'}
                          </p>
                          {selectedLeave.documentSize && (
                            <p className="text-xs text-gray-500">
                              {(selectedLeave.documentSize / 1024 / 1024).toFixed(2)} MB
                            </p>
                          )}
                          {selectedLeave.documentUploadedAt && (
                            <p className="text-xs text-gray-500">
                              Ajouté le {format(new Date(selectedLeave.documentUploadedAt), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadDocumentMutation.mutate(selectedLeave.id)}
                          disabled={downloadDocumentMutation.isPending}
                          className="border-gray-300 text-gray-700 hover:bg-gray-50"
                        >
                          {downloadDocumentMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Download className="h-4 w-4 mr-2" />
                              Télécharger
                            </>
                          )}
                        </Button>
                        {(isManager || isHRAdmin || ((user as any)?.employeeId === selectedLeave.employeeId && selectedLeave.status === 'PENDING')) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const input = document.createElement('input');
                              input.type = 'file';
                              input.accept = '.pdf,.doc,.docx,.jpg,.jpeg,.png,.gif';
                              input.onchange = async (e: any) => {
                                const file = e.target.files[0];
                                if (file) {
                                  await uploadDocumentMutation.mutateAsync({ id: selectedLeave.id, file });
                                }
                              };
                              input.click();
                            }}
                            disabled={uploadDocumentMutation.isPending}
                            className="border-gray-300 text-gray-700 hover:bg-gray-50"
                          >
                            {uploadDocumentMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Upload className="h-4 w-4 mr-2" />
                                Modifier
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm text-gray-500 mb-3">Aucun document attaché</p>
                    {(isManager || isHRAdmin || ((user as any)?.employeeId === selectedLeave.employeeId && selectedLeave.status === 'PENDING')) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = '.pdf,.doc,.docx,.jpg,.jpeg,.png,.gif';
                          input.onchange = async (e: any) => {
                            const file = e.target.files[0];
                            if (file) {
                              await uploadDocumentMutation.mutateAsync({ id: selectedLeave.id, file });
                            }
                          };
                          input.click();
                        }}
                        disabled={uploadDocumentMutation.isPending}
                        className="border-gray-300 text-gray-700 hover:bg-gray-50"
                      >
                        {uploadDocumentMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Upload className="h-4 w-4 mr-2" />
                        )}
                        Ajouter un document
                      </Button>
                    )}
                  </div>
                )}
              </div>

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
                <PermissionGate permission="leave.approve">
                  {(() => {
                    // HR can only act on MANAGER_APPROVED leaves
                    // Manager can act on PENDING leaves
                    // SUPER_ADMIN can act on both
                    const canApprove = 
                      (isHRAdmin && selectedLeave.status === 'MANAGER_APPROVED') ||
                      (isManager && selectedLeave.status === 'PENDING') ||
                      (!isHRAdmin && !isManager && (selectedLeave.status === 'PENDING' || selectedLeave.status === 'MANAGER_APPROVED'));
                    
                    if (!canApprove) return null;
                    
                    return (
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
                    );
                  })()}
                </PermissionGate>
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

              {leaveTypes?.length === 0 ? (
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
                      {leaveTypes?.map((leaveType: any) => (
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
      {/* Leave Balance Manager Modal */}
      {showBalanceManager && (
        <LeaveBalanceManager onClose={() => setShowBalanceManager(false)} />
      )}
    </DashboardLayout>
    </ProtectedRoute>
  );
}
