'use client';

import React, { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OvertimeDashboard, ConversionFlexibleModal, SupplementaryDaysTab } from '@/components/overtime';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  Search,
  RefreshCw,
  Filter,
  ChevronDown,
  ChevronUp,
  Download,
  Calendar,
  X,
  User,
  Undo2,
  Edit3,
  RotateCcw,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import {
  useOvertimeRecords,
  useApproveOvertime,
  useRejectOvertime,
  useConvertToRecovery,
  useCreateOvertime,
  useOvertimeDashboardStats,
  useRevokeApproval,
  useRevokeRejection,
  useUpdateApprovedHours,
  useCancelConversion,
  useRecoveryInfo,
} from '@/lib/hooks/useOvertime';
import { SearchableEmployeeSelect } from '@/components/schedules/SearchableEmployeeSelect';
import { useEmployees } from '@/lib/hooks/useEmployees';
import { useSites } from '@/lib/hooks/useSites';
import { useDepartments } from '@/lib/hooks/useDepartments';
import { Textarea } from '@/components/ui/textarea';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

export default function OvertimePage() {
  // Tab state
  const [activeTab, setActiveTab] = useState<'list' | 'supplementary' | 'dashboard'>('list');

  // Search and basic filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  
  // Advanced filters
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedSite, setSelectedSite] = useState<string>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  // Par défaut, afficher les données d'aujourd'hui
  const today = format(new Date(), 'yyyy-MM-dd');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  // Rejection dialog
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [recordToReject, setRecordToReject] = useState<string | null>(null);

  // Approval dialog
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [recordToApprove, setRecordToApprove] = useState<any | null>(null);
  const [approvedHours, setApprovedHours] = useState<string>('');

  // Create modal state
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Conversion flexible modal state
  const [showConversionModal, setShowConversionModal] = useState(false);
  const [selectedEmployeeForConversion, setSelectedEmployeeForConversion] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // Rectification dialogs state
  const [revokeApprovalDialogOpen, setRevokeApprovalDialogOpen] = useState(false);
  const [revokeRejectionDialogOpen, setRevokeRejectionDialogOpen] = useState(false);
  const [editHoursDialogOpen, setEditHoursDialogOpen] = useState(false);
  const [cancelConversionDialogOpen, setCancelConversionDialogOpen] = useState(false);
  const [selectedRecordForAction, setSelectedRecordForAction] = useState<any | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [newApprovedHours, setNewApprovedHours] = useState('');

  const [createFormData, setCreateFormData] = useState({
    employeeId: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    hours: '',
    type: 'STANDARD' as 'STANDARD' | 'NIGHT' | 'HOLIDAY' | 'EMERGENCY',
    notes: '',
  });
  const createMutation = useCreateOvertime();

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Build filters object for table
  const filters = useMemo(() => {
    const filterObj: any = {};
    if (selectedEmployee !== 'all') filterObj.employeeId = selectedEmployee;
    if (selectedStatus !== 'all') filterObj.status = selectedStatus;
    if (selectedType !== 'all') filterObj.type = selectedType;
    if (selectedSite !== 'all') filterObj.siteId = selectedSite;
    if (selectedDepartment !== 'all') filterObj.departmentId = selectedDepartment;
    if (startDate) filterObj.startDate = startDate;
    if (endDate) filterObj.endDate = endDate;
    filterObj.page = currentPage;
    filterObj.limit = itemsPerPage;
    return filterObj;
  }, [selectedEmployee, selectedStatus, selectedType, selectedSite, selectedDepartment, startDate, endDate, currentPage, itemsPerPage]);

  // Fetch data for table (with all filters including date)
  const { data: overtimeData, isLoading, error, refetch } = useOvertimeRecords(filters);
  const { data: employeesData } = useEmployees();
  const { data: sitesData } = useSites();
  const { data: departmentsData } = useDepartments();

  // Dashboard stats (only fetch when dashboard tab is active)
  const dashboardFilters = useMemo(() => ({
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    siteId: selectedSite !== 'all' ? selectedSite : undefined,
    departmentId: selectedDepartment !== 'all' ? selectedDepartment : undefined,
  }), [startDate, endDate, selectedSite, selectedDepartment]);

  const { data: dashboardData, isLoading: isDashboardLoading } = useOvertimeDashboardStats(
    activeTab === 'dashboard' ? dashboardFilters : undefined
  );

  // Mutations
  const approveMutation = useApproveOvertime();
  const rejectMutation = useRejectOvertime();
  const convertMutation = useConvertToRecovery();

  // Rectification mutations
  const revokeApprovalMutation = useRevokeApproval();
  const revokeRejectionMutation = useRevokeRejection();
  const updateApprovedHoursMutation = useUpdateApprovedHours();
  const cancelConversionMutation = useCancelConversion();

  // State pour la justification d'annulation de conversion
  const [cancelConversionReason, setCancelConversionReason] = useState('');

  // Récupérer les infos de récupération quand on ouvre le dialog d'annulation
  const { data: recoveryInfo, isLoading: isLoadingRecoveryInfo } = useRecoveryInfo(
    cancelConversionDialogOpen ? selectedRecordForAction?.id : null
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <Badge variant="warning" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            En attente
          </Badge>
        );
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
      case 'PAID':
        return (
          <Badge variant="info" className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Payé
          </Badge>
        );
      case 'RECOVERED':
        return (
          <Badge variant="default" className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Récupéré
          </Badge>
        );
      default:
        return null;
    }
  };

  const getTypeBadge = (type: string) => {
    const typeLabels: Record<string, { label: string; color: string }> = {
      STANDARD: { label: 'Standard', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
      NIGHT: { label: 'Nuit', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
      HOLIDAY: { label: 'Jour férié', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
      EMERGENCY: { label: 'Urgence', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
    };
    const typeInfo = typeLabels[type] || { label: type, color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' };
    return (
      <span className={`px-2 py-1 rounded-md text-xs font-medium ${typeInfo.color}`}>
        {typeInfo.label}
      </span>
    );
  };

  // Fonction pour convertir les heures en nombre (gère Decimal, string, number)
  const getHoursAsNumber = (hours: any): number => {
    if (hours == null || hours === undefined) return 0;
    if (typeof hours === 'number') return hours;
    if (typeof hours === 'string') return parseFloat(hours) || 0;
    // Gérer les objets Decimal de Prisma
    if (typeof hours === 'object' && 'toNumber' in hours) {
      return (hours as any).toNumber();
    }
    return parseFloat(String(hours)) || 0;
  };

  // Fonction pour formater les heures en format "XhYYmin" (ex: 2.52 → 2h31min)
  const formatHours = (hours: number | string): string => {
    const numHours = getHoursAsNumber(hours);
    const h = Math.floor(numHours);
    const m = Math.round((numHours - h) * 60);
    if (h === 0) {
      return `${m}min`;
    }
    return `${h}h${m.toString().padStart(2, '0')}min`;
  };

  const handleApproveClick = (record: any) => {
    setRecordToApprove(record);
    setApprovedHours(record.hours?.toString() || '');
    setApproveDialogOpen(true);
  };

  const handleApprove = async () => {
    if (!recordToApprove) return;
    
    try {
      const hours = approvedHours ? parseFloat(approvedHours) : undefined;
      await approveMutation.mutateAsync({ 
        id: recordToApprove.id, 
        approvedHours: hours 
      });
      setApproveDialogOpen(false);
      setRecordToApprove(null);
      setApprovedHours('');
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleRejectClick = (id: string) => {
    setRecordToReject(id);
    setRejectReason('');
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = async () => {
    if (!recordToReject || !rejectReason.trim()) {
      return;
    }
    try {
      await rejectMutation.mutateAsync({ id: recordToReject, reason: rejectReason });
      setRejectDialogOpen(false);
      setRejectReason('');
      setRecordToReject(null);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleConvertToRecovery = async (id: string) => {
    if (confirm('Convertir ces heures supplémentaires en récupération?')) {
      try {
        await convertMutation.mutateAsync(id);
      } catch (error) {
        // Error handled by mutation
      }
    }
  };

  const handleOpenFlexibleConversion = (employee: any) => {
    setSelectedEmployeeForConversion({
      id: employee.id,
      name: `${employee.firstName} ${employee.lastName}`,
    });
    setShowConversionModal(true);
  };

  const handleCreateOvertime = async () => {
    if (!createFormData.employeeId || !createFormData.date || !createFormData.hours) {
      return;
    }

    try {
      await createMutation.mutateAsync({
        employeeId: createFormData.employeeId,
        date: createFormData.date,
        hours: parseFloat(createFormData.hours),
        type: createFormData.type,
        notes: createFormData.notes || undefined,
      });
      setShowCreateModal(false);
      setCreateFormData({
        employeeId: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        hours: '',
        type: 'STANDARD',
        notes: '',
      });
    } catch (error) {
      // Error handled by mutation
    }
  };

  // ============================================
  // HANDLERS DE RECTIFICATION
  // ============================================

  const handleRevokeApprovalClick = (record: any) => {
    setSelectedRecordForAction(record);
    setActionReason('');
    setRevokeApprovalDialogOpen(true);
  };

  const handleRevokeApprovalConfirm = async () => {
    if (!selectedRecordForAction) return;
    try {
      await revokeApprovalMutation.mutateAsync({
        id: selectedRecordForAction.id,
        reason: actionReason || undefined,
      });
      setRevokeApprovalDialogOpen(false);
      setSelectedRecordForAction(null);
      setActionReason('');
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleRevokeRejectionClick = (record: any) => {
    setSelectedRecordForAction(record);
    setActionReason('');
    setRevokeRejectionDialogOpen(true);
  };

  const handleRevokeRejectionConfirm = async () => {
    if (!selectedRecordForAction) return;
    try {
      await revokeRejectionMutation.mutateAsync({
        id: selectedRecordForAction.id,
        reason: actionReason || undefined,
      });
      setRevokeRejectionDialogOpen(false);
      setSelectedRecordForAction(null);
      setActionReason('');
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleEditHoursClick = (record: any) => {
    setSelectedRecordForAction(record);
    setNewApprovedHours(String(record.approvedHours || record.hours));
    setActionReason('');
    setEditHoursDialogOpen(true);
  };

  const handleEditHoursConfirm = async () => {
    if (!selectedRecordForAction || !newApprovedHours) return;
    try {
      await updateApprovedHoursMutation.mutateAsync({
        id: selectedRecordForAction.id,
        approvedHours: parseFloat(newApprovedHours),
        reason: actionReason || undefined,
      });
      setEditHoursDialogOpen(false);
      setSelectedRecordForAction(null);
      setNewApprovedHours('');
      setActionReason('');
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleCancelConversionClick = (record: any) => {
    setSelectedRecordForAction(record);
    setCancelConversionReason('');
    setCancelConversionDialogOpen(true);
  };

  const handleCancelConversionConfirm = async () => {
    if (!selectedRecordForAction) return;

    // Si date passée, la justification est obligatoire
    if (recoveryInfo?.hasPastDates && (!cancelConversionReason || cancelConversionReason.trim().length < 10)) {
      return; // Le bouton sera désactivé, mais au cas où
    }

    try {
      await cancelConversionMutation.mutateAsync({
        id: selectedRecordForAction.id,
        reason: cancelConversionReason || undefined,
      });
      setCancelConversionDialogOpen(false);
      setSelectedRecordForAction(null);
      setCancelConversionReason('');
    } catch (error) {
      // Error handled by mutation
    }
  };

  // Client-side filtering for search and all filters
  const filteredRecords = useMemo(() => {
    let records = overtimeData?.data || [];
    
    // Appliquer le filtre de recherche par nom/prénom/matricule
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      records = records.filter((record: any) => {
        const firstName = record.employee?.firstName?.toLowerCase() || '';
        const lastName = record.employee?.lastName?.toLowerCase() || '';
        const matricule = record.employee?.matricule?.toLowerCase() || '';
        return firstName.includes(query) || lastName.includes(query) || matricule.includes(query);
      });
    }
    
    // Debug: Log pour vérifier les données (à retirer en production)
    if (process.env.NODE_ENV === 'development' && records.length > 0) {
      console.log('Overtime records for calculation:', records.map((r: any) => ({
        id: r.id,
        hours: r.hours,
        approvedHours: r.approvedHours,
        status: r.status,
        employee: r.employee?.firstName + ' ' + r.employee?.lastName,
      })));
    }
    
    return records;
  }, [overtimeData?.data, searchQuery]);

  // Statistics - utiliser les données filtrées pour refléter tous les filtres appliqués
  // Note: Les filtres de date, statut, type, et employé sont déjà appliqués côté serveur via filters
  // Seul le filtre de recherche par nom est appliqué côté client
  
  // IMPORTANT: Utiliser le totalHours du backend (calculé sur toutes les données, pas seulement la page actuelle)
  // Cela garantit la cohérence entre Manager et Employee même avec la pagination
  // Si un filtre de recherche par nom est appliqué, calculer sur filteredRecords (filtré côté client)
  const totalHours = searchQuery 
    ? filteredRecords.reduce((sum: number, r: any) => {
        // Si recherche appliquée, calculer sur les données filtrées côté client
        const hoursToUse = (r.approvedHours != null && r.approvedHours !== undefined) 
          ? r.approvedHours 
          : r.hours;
        const numHours = getHoursAsNumber(hoursToUse);
        return sum + numHours;
      }, 0)
    : (overtimeData?.meta?.totalHours != null 
        ? getHoursAsNumber(overtimeData.meta.totalHours)
        : filteredRecords.reduce((sum: number, r: any) => {
            // Fallback: calculer côté client si totalHours n'est pas disponible
            const hoursToUse = (r.approvedHours != null && r.approvedHours !== undefined) 
              ? r.approvedHours 
              : r.hours;
            const numHours = getHoursAsNumber(hoursToUse);
            return sum + numHours;
          }, 0));
  
  // Filtrer les enregistrements par statut (comparaison insensible à la casse pour sécurité)
  // Note: Ces comptes sont calculés sur la page actuelle uniquement
  // Pour avoir les totaux réels, il faudrait aussi les calculer côté serveur
  const pendingCount = filteredRecords.filter((r: any) => {
    const status = String(r.status || '').toUpperCase();
    return status === 'PENDING';
  }).length;
  
  const approvedCount = filteredRecords.filter((r: any) => {
    const status = String(r.status || '').toUpperCase();
    return status === 'APPROVED';
  }).length;

  // Pagination
  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
  const paginatedRecords = filteredRecords.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Export function
  const handleExport = () => {
    const csvContent = [
      ['Employé', 'Matricule', 'Date', 'Heures', 'Type', 'Statut', 'Converti'].join(','),
      ...filteredRecords.map((record: any) => [
        `${record.employee?.firstName || ''} ${record.employee?.lastName || ''}`,
        record.employee?.matricule || '',
        format(new Date(record.date), 'dd/MM/yyyy', { locale: fr }),
        formatHours(record.hours),
        record.type,
        record.status,
        (record.convertedToRecovery || record.convertedToRecoveryDays) ? 'Oui' : 'Non',
      ].join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `heures-supplementaires-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetFilters = () => {
    setSelectedStatus('all');
    setSelectedEmployee('all');
    setSelectedType('all');
    setSelectedSite('all');
    setSelectedDepartment('all');
    const today = format(new Date(), 'yyyy-MM-dd');
    setStartDate(today);
    setEndDate(today);
    setSearchQuery('');
    setCurrentPage(1);
  };

  const hasActiveFilters = selectedStatus !== 'all' || selectedEmployee !== 'all' || 
    selectedType !== 'all' || selectedSite !== 'all' || selectedDepartment !== 'all' ||
    searchQuery !== '';

  return (
    <ProtectedRoute permissions={['overtime.view_all', 'overtime.view_own']}>
      <DashboardLayout
        title="Gestion des Heures Supplémentaires"
        subtitle="Demandes, approbations et récupérations"
      >
      <div className="space-y-6">
        {/* Action Bar */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4 flex-wrap flex-1">
              <div className="relative flex-1 min-w-[250px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
                <Input
                  type="text"
                  placeholder="Rechercher par nom, prénom ou matricule..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1); // Réinitialiser la pagination
                  }}
                  className="pl-10"
                />
              </div>

              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="PENDING">En attente</SelectItem>
                  <SelectItem value="APPROVED">Approuvé</SelectItem>
                  <SelectItem value="REJECTED">Rejeté</SelectItem>
                  <SelectItem value="PAID">Payé</SelectItem>
                  <SelectItem value="RECOVERED">Récupéré</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="whitespace-nowrap"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filtres avancés
                {showAdvancedFilters ? (
                  <ChevronUp className="h-4 w-4 ml-2" />
                ) : (
                  <ChevronDown className="h-4 w-4 ml-2" />
                )}
              </Button>

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetFilters}
                  className="whitespace-nowrap"
                >
                  <X className="h-4 w-4 mr-2" />
                  Réinitialiser
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>
              <PermissionGate permissions={['overtime.export', 'overtime.view_all']}>
                <Button variant="outline" size="sm" onClick={handleExport} disabled={filteredRecords.length === 0}>
                  <Download className="h-4 w-4 mr-2" />
                  Exporter
                </Button>
              </PermissionGate>
              <PermissionGate permission="overtime.create">
                <Button variant="primary" size="sm" onClick={() => setShowCreateModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nouvelle demande
                </Button>
              </PermissionGate>
            </div>
          </div>

          {/* Advanced Filters Panel */}
          {showAdvancedFilters && (
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(() => {
                    // Handle both paginated response {data: []} and direct array response []
                    const employees = Array.isArray(employeesData)
                      ? employeesData
                      : (employeesData?.data || []);
                    const employeeOptions = [
                      { value: 'all', label: 'Tous les employés' },
                      ...employees.map((emp: any) => ({
                        value: emp.id,
                        label: `${emp.firstName} ${emp.lastName} (${emp.matricule})`,
                        searchText: `${emp.firstName} ${emp.lastName} ${emp.matricule}`.toLowerCase()
                      }))
                    ];
                    return (
                      <SearchableSelect
                        value={selectedEmployee}
                        onChange={(value) => {
                          setSelectedEmployee(value);
                          setCurrentPage(1);
                        }}
                        options={employeeOptions}
                        placeholder="Tous les employés"
                        label="Employé"
                        searchPlaceholder="Rechercher par nom, prénom ou matricule..."
                      />
                    );
                  })()}

                  <div className="space-y-2">
                    <Label htmlFor="site-filter">Site</Label>
                    <Select value={selectedSite} onValueChange={(value) => {
                      setSelectedSite(value);
                      setCurrentPage(1); // Réinitialiser la pagination
                    }}>
                      <SelectTrigger id="site-filter">
                        <SelectValue placeholder="Tous les sites" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les sites</SelectItem>
                        {(Array.isArray(sitesData) ? sitesData : sitesData?.data || []).map((site: any) => (
                          <SelectItem key={site.id} value={site.id}>
                            {site.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="department-filter">Département</Label>
                    <Select value={selectedDepartment} onValueChange={(value) => {
                      setSelectedDepartment(value);
                      setCurrentPage(1); // Réinitialiser la pagination
                    }}>
                      <SelectTrigger id="department-filter">
                        <SelectValue placeholder="Tous les départements" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les départements</SelectItem>
                        {(departmentsData || []).map((dept: any) => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="type-filter">Type</Label>
                    <Select value={selectedType} onValueChange={setSelectedType}>
                      <SelectTrigger id="type-filter">
                        <SelectValue placeholder="Tous les types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les types</SelectItem>
                        <SelectItem value="STANDARD">Standard</SelectItem>
                        <SelectItem value="NIGHT">Nuit</SelectItem>
                        <SelectItem value="HOLIDAY">Jour férié</SelectItem>
                        <SelectItem value="EMERGENCY">Urgence</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="start-date">Date de début</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
                      <Input
                        id="start-date"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="end-date">Date de fin</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
                      <Input
                        id="end-date"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const today = format(new Date(), 'yyyy-MM-dd');
                      setStartDate(today);
                      setEndDate(today);
                      setCurrentPage(1); // Réinitialiser la pagination
                    }}
                  >
                    Aujourd'hui
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const today = new Date();
                      const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Lundi
                      const weekEnd = endOfWeek(today, { weekStartsOn: 1 }); // Dimanche
                      setStartDate(format(weekStart, 'yyyy-MM-dd'));
                      setEndDate(format(weekEnd, 'yyyy-MM-dd'));
                      setCurrentPage(1); // Réinitialiser la pagination
                    }}
                  >
                    Cette semaine
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const now = new Date();
                      setStartDate(format(startOfMonth(now), 'yyyy-MM-dd'));
                      setEndDate(format(endOfMonth(now), 'yyyy-MM-dd'));
                      setCurrentPage(1); // Réinitialiser la pagination
                    }}
                  >
                    Ce mois
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'list' | 'supplementary' | 'dashboard')} className="w-full">
          <TabsList className="grid w-full max-w-2xl grid-cols-3">
            <TabsTrigger value="list">Heures Supplémentaires</TabsTrigger>
            <TabsTrigger value="supplementary">Jours Supplémentaires</TabsTrigger>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="mt-6 space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-secondary mb-1">Total heures</p>
                  <p className="text-3xl font-bold text-text-primary">
                    {formatHours(totalHours)}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-secondary mb-1">En attente</p>
                  <p className="text-3xl font-bold text-warning">
                    {pendingCount}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-warning/10 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-warning" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-secondary mb-1">Approuvés</p>
                  <p className="text-3xl font-bold text-success">
                    {approvedCount}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-secondary mb-1">Total demandes</p>
                  <p className="text-3xl font-bold text-text-primary">
                    {filteredRecords.length}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-info/10 flex items-center justify-center">
                  <User className="h-6 w-6 text-info" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Approvals Alert */}
        {pendingCount > 0 && (
          <Alert variant="info">
            <Clock className="h-4 w-4" />
            <AlertDescription>
              <span className="font-semibold">{pendingCount} demande(s) d'heures supplémentaires</span>
              {' '}en attente de validation.
            </AlertDescription>
          </Alert>
        )}

        {/* Overtime Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle>Heures supplémentaires</CardTitle>
            <div className="flex items-center gap-2">
              <Label htmlFor="items-per-page" className="text-sm text-text-secondary">
                Par page:
              </Label>
              <Select
                value={itemsPerPage.toString()}
                onValueChange={(value) => {
                  setItemsPerPage(Number(value));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger id="items-per-page" className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-3 text-text-secondary">Chargement...</span>
              </div>
            ) : error ? (
              <Alert variant="danger">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  Erreur lors du chargement des données. Veuillez réessayer.
                </AlertDescription>
              </Alert>
            ) : filteredRecords.length === 0 ? (
              <div className="text-center py-12 text-text-secondary">
                <Clock className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="font-medium">Aucune demande d'heures supplémentaires trouvée.</p>
                <p className="text-sm mt-1">
                  {hasActiveFilters ? 'Essayez de modifier vos filtres.' : 'Créez une nouvelle demande pour commencer.'}
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-table-header border-b border-table-border">
                        <th className="p-4 text-left text-sm font-semibold text-text-primary">Employé</th>
                        <th className="p-4 text-left text-sm font-semibold text-text-primary">Site</th>
                        <th className="p-4 text-left text-sm font-semibold text-text-primary">Date</th>
                        <th className="p-4 text-left text-sm font-semibold text-text-primary">Heures</th>
                        <th className="p-4 text-left text-sm font-semibold text-text-primary">Type</th>
                        <th className="p-4 text-left text-sm font-semibold text-text-primary">Statut</th>
                        <th className="p-4 text-left text-sm font-semibold text-text-primary">Conversion</th>
                        <th className="p-4 text-left text-sm font-semibold text-text-primary">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-table-border">
                      {paginatedRecords.map((record: any) => (
                        <tr key={record.id} className="hover:bg-table-hover transition-colors">
                          <td className="p-4">
                            <div className="font-medium text-text-primary">
                              {record.employee?.firstName} {record.employee?.lastName}
                            </div>
                            <div className="text-sm text-text-secondary mt-0.5">
                              {record.employee?.matricule}
                            </div>
                          </td>
                          <td className="p-4 text-sm text-text-secondary">
                            {record.employee?.site?.name || record.employee?.site?.code || '-'}
                          </td>
                          <td className="p-4 text-sm text-text-secondary">
                            {format(new Date(record.date), 'dd MMM yyyy', { locale: fr })}
                          </td>
                          <td className="p-4">
                            <div className="flex flex-col">
                              <span className="font-semibold text-lg text-text-primary">
                                {formatHours((record.approvedHours != null && record.approvedHours !== undefined) ? record.approvedHours : record.hours)}
                              </span>
                              {record.approvedHours != null && record.approvedHours !== undefined && record.approvedHours !== record.hours && (
                                <span className="text-xs text-text-secondary line-through">
                                  Demandé: {formatHours(record.hours)}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            {getTypeBadge(record.type)}
                          </td>
                          <td className="p-4">
                            <div className="flex flex-col gap-1">
                              {getStatusBadge(record.status)}
                              {record.rejectionReason && record.status === 'REJECTED' && (
                                <span className="text-xs text-text-secondary italic mt-1" title={record.rejectionReason}>
                                  {record.rejectionReason.length > 50 
                                    ? record.rejectionReason.substring(0, 50) + '...'
                                    : record.rejectionReason}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            {(record.convertedToRecovery || record.convertedToRecoveryDays) ? (
                              <Badge variant="success" className="text-xs">Converti</Badge>
                            ) : (
                              <span className="text-sm text-text-secondary">Non converti</span>
                            )}
                          </td>
                          <td className="p-4">
                            <div className="flex flex-wrap gap-1">
                              <PermissionGate permission="overtime.approve">
                                {/* Actions pour PENDING */}
                                {record.status === 'PENDING' && (
                                  <>
                                    <Button
                                      variant="success"
                                      size="sm"
                                      onClick={() => handleApproveClick(record)}
                                      disabled={approveMutation.isPending}
                                      className="text-xs"
                                    >
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Approuver
                                    </Button>
                                    <Button
                                      variant="danger"
                                      size="sm"
                                      onClick={() => handleRejectClick(record.id)}
                                      disabled={rejectMutation.isPending}
                                      className="text-xs"
                                    >
                                      <XCircle className="h-3 w-3 mr-1" />
                                      Rejeter
                                    </Button>
                                  </>
                                )}

                                {/* Actions pour APPROVED (non converti) */}
                                {record.status === 'APPROVED' && !record.convertedToRecovery && !record.convertedToRecoveryDays && (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleOpenFlexibleConversion(record.employee)}
                                      className="text-xs"
                                      title="Conversion flexible - sélectionner les heures à convertir"
                                    >
                                      <RefreshCw className="h-3 w-3 mr-1" />
                                      Convertir
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleEditHoursClick(record)}
                                      disabled={updateApprovedHoursMutation.isPending}
                                      className="text-xs"
                                      title="Modifier les heures approuvées"
                                    >
                                      <Edit3 className="h-3 w-3 mr-1" />
                                      Modifier
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleRevokeApprovalClick(record)}
                                      disabled={revokeApprovalMutation.isPending}
                                      className="text-xs text-warning"
                                      title="Annuler l'approbation"
                                    >
                                      <Undo2 className="h-3 w-3 mr-1" />
                                      Annuler
                                    </Button>
                                  </>
                                )}

                                {/* Actions pour REJECTED */}
                                {record.status === 'REJECTED' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRevokeRejectionClick(record)}
                                    disabled={revokeRejectionMutation.isPending}
                                    className="text-xs"
                                    title="Annuler le rejet et reconsidérer"
                                  >
                                    <RotateCcw className="h-3 w-3 mr-1" />
                                    Reconsidérer
                                  </Button>
                                )}

                                {/* Actions pour RECOVERED */}
                                {record.status === 'RECOVERED' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleCancelConversionClick(record)}
                                    disabled={cancelConversionMutation.isPending}
                                    className="text-xs text-warning"
                                    title="Annuler la conversion et restaurer les heures"
                                  >
                                    <Undo2 className="h-3 w-3 mr-1" />
                                    Annuler conversion
                                  </Button>
                                )}
                              </PermissionGate>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-table-border">
                    <div className="text-sm text-text-secondary">
                      Affichage de {(currentPage - 1) * itemsPerPage + 1} à{' '}
                      {Math.min(currentPage * itemsPerPage, filteredRecords.length)} sur{' '}
                      {filteredRecords.length} résultat(s)
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        Précédent
                      </Button>
                      <div className="flex items-center gap-1">
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
                              className="min-w-[40px]"
                            >
                              {pageNum}
                            </Button>
                          );
                        })}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Suivant
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="supplementary" className="mt-6">
            <SupplementaryDaysTab startDate={startDate} endDate={endDate} />
          </TabsContent>

          <TabsContent value="dashboard" className="mt-6">
            <OvertimeDashboard data={dashboardData} isLoading={isDashboardLoading} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Approval Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approuver les heures supplémentaires</DialogTitle>
            <DialogDescription>
              Vous pouvez personnaliser le nombre d'heures validées si nécessaire.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {recordToApprove && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="employee-info">Employé</Label>
                  <div className="text-sm text-text-secondary p-2 bg-gray-50 rounded">
                    {recordToApprove.employee?.firstName} {recordToApprove.employee?.lastName} 
                    {' '}({recordToApprove.employee?.matricule})
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="requested-hours">Heures demandées</Label>
                  <div className="text-sm text-text-secondary p-2 bg-gray-50 rounded">
                    {formatHours(recordToApprove.hours)}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="approved-hours">Heures validées *</Label>
                  <Input
                    id="approved-hours"
                    type="number"
                    step="0.5"
                    min="0.5"
                    placeholder="Ex: 2.5"
                    value={approvedHours}
                    onChange={(e) => setApprovedHours(e.target.value)}
                    className="w-full"
                  />
                  <p className="text-xs text-text-secondary">
                    Laissez vide pour valider le nombre d'heures demandées ({formatHours(recordToApprove.hours)})
                  </p>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setApproveDialogOpen(false);
              setRecordToApprove(null);
              setApprovedHours('');
            }}>
              Annuler
            </Button>
            <Button
              variant="success"
              onClick={handleApprove}
              disabled={approveMutation.isPending || !!(approvedHours && (parseFloat(approvedHours) < 0.5 || isNaN(parseFloat(approvedHours))))}
            >
              {approveMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  En cours...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approuver
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeter la demande</DialogTitle>
            <DialogDescription>
              Veuillez indiquer la raison du rejet de cette demande d'heures supplémentaires.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reject-reason">Raison du rejet *</Label>
              <Textarea
                id="reject-reason"
                placeholder="Ex: Heures non justifiées, dépassement du quota autorisé..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="danger"
              onClick={handleRejectConfirm}
              disabled={!rejectReason.trim() || rejectMutation.isPending}
            >
              {rejectMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  En cours...
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Rejeter
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Overtime Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nouvelle demande d'heures supplémentaires</DialogTitle>
            <DialogDescription>
              Créez une nouvelle demande d'heures supplémentaires pour un employé.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="create-employee">Employé *</Label>
              <SearchableEmployeeSelect
                value={createFormData.employeeId}
                onChange={(value) => setCreateFormData({ ...createFormData, employeeId: value })}
                employees={Array.isArray(employeesData) ? employeesData : (employeesData?.data || [])}
                isLoading={!employeesData}
                placeholder="Rechercher un employé..."
                label="Employé"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="create-date">Date *</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
                  <Input
                    id="create-date"
                    type="date"
                    value={createFormData.date}
                    onChange={(e) => setCreateFormData({ ...createFormData, date: e.target.value })}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-hours">Heures *</Label>
                <Input
                  id="create-hours"
                  type="number"
                  step="0.5"
                  min="0.5"
                  placeholder="Ex: 2.5"
                  value={createFormData.hours}
                  onChange={(e) => setCreateFormData({ ...createFormData, hours: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-type">Type *</Label>
              <Select
                value={createFormData.type}
                onValueChange={(value: any) => setCreateFormData({ ...createFormData, type: value })}
              >
                <SelectTrigger id="create-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STANDARD">Standard</SelectItem>
                  <SelectItem value="NIGHT">Nuit</SelectItem>
                  <SelectItem value="HOLIDAY">Jour férié</SelectItem>
                  <SelectItem value="EMERGENCY">Urgence</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-notes">Notes / Justification</Label>
              <Textarea
                id="create-notes"
                placeholder="Ex: Travail supplémentaire pour terminer le projet urgent..."
                value={createFormData.notes}
                onChange={(e) => setCreateFormData({ ...createFormData, notes: e.target.value })}
                rows={3}
                className="resize-none"
                maxLength={500}
              />
              <p className="text-xs text-text-secondary">
                {createFormData.notes.length}/500 caractères
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateModal(false);
                setCreateFormData({
                  employeeId: '',
                  date: format(new Date(), 'yyyy-MM-dd'),
                  hours: '',
                  type: 'STANDARD',
                  notes: '',
                });
              }}
            >
              Annuler
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateOvertime}
              disabled={
                createMutation.isPending ||
                !createFormData.employeeId ||
                !createFormData.date ||
                !createFormData.hours ||
                parseFloat(createFormData.hours) < 0.5 ||
                isNaN(parseFloat(createFormData.hours))
              }
            >
              {createMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Création...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Créer la demande
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Conversion Flexible Modal */}
      {selectedEmployeeForConversion && (
        <ConversionFlexibleModal
          isOpen={showConversionModal}
          onClose={() => {
            setShowConversionModal(false);
            setSelectedEmployeeForConversion(null);
          }}
          employeeId={selectedEmployeeForConversion.id}
          employeeName={selectedEmployeeForConversion.name}
        />
      )}

      {/* ============================================ */}
      {/* DIALOGS DE RECTIFICATION */}
      {/* ============================================ */}

      {/* Dialog: Annuler l'approbation */}
      <Dialog open={revokeApprovalDialogOpen} onOpenChange={setRevokeApprovalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Undo2 className="h-5 w-5 text-warning" />
              Annuler l'approbation
            </DialogTitle>
            <DialogDescription>
              Cette action va remettre les heures supplémentaires en statut "En attente" pour reconsidération.
              {selectedRecordForAction && (
                <span className="block mt-2 font-medium">
                  {selectedRecordForAction.employee?.firstName} {selectedRecordForAction.employee?.lastName} - {format(new Date(selectedRecordForAction.date), 'dd/MM/yyyy')} - {selectedRecordForAction.approvedHours || selectedRecordForAction.hours}h
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="revoke-approval-reason">Motif (optionnel)</Label>
            <Textarea
              id="revoke-approval-reason"
              placeholder="Ex: Erreur de validation, heures à vérifier..."
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeApprovalDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="warning"
              onClick={handleRevokeApprovalConfirm}
              disabled={revokeApprovalMutation.isPending}
            >
              {revokeApprovalMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  En cours...
                </>
              ) : (
                <>
                  <Undo2 className="h-4 w-4 mr-2" />
                  Confirmer l'annulation
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Annuler le rejet */}
      <Dialog open={revokeRejectionDialogOpen} onOpenChange={setRevokeRejectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-primary" />
              Reconsidérer la demande
            </DialogTitle>
            <DialogDescription>
              Cette action va remettre les heures supplémentaires en statut "En attente" pour une nouvelle évaluation.
              {selectedRecordForAction && (
                <span className="block mt-2 font-medium">
                  {selectedRecordForAction.employee?.firstName} {selectedRecordForAction.employee?.lastName} - {format(new Date(selectedRecordForAction.date), 'dd/MM/yyyy')} - {selectedRecordForAction.hours}h
                </span>
              )}
              {selectedRecordForAction?.rejectionReason && (
                <span className="block mt-1 text-sm text-danger">
                  Motif du rejet initial: {selectedRecordForAction.rejectionReason}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="revoke-rejection-reason">Motif de la reconsidération (optionnel)</Label>
            <Textarea
              id="revoke-rejection-reason"
              placeholder="Ex: Appel de l'employé, nouvelles informations..."
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeRejectionDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="primary"
              onClick={handleRevokeRejectionConfirm}
              disabled={revokeRejectionMutation.isPending}
            >
              {revokeRejectionMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  En cours...
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reconsidérer
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Modifier les heures approuvées */}
      <Dialog open={editHoursDialogOpen} onOpenChange={setEditHoursDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit3 className="h-5 w-5 text-primary" />
              Modifier les heures approuvées
            </DialogTitle>
            <DialogDescription>
              Corrigez le nombre d'heures validées pour cette demande.
              {selectedRecordForAction && (
                <span className="block mt-2 font-medium">
                  {selectedRecordForAction.employee?.firstName} {selectedRecordForAction.employee?.lastName} - {format(new Date(selectedRecordForAction.date), 'dd/MM/yyyy')}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <Label htmlFor="new-approved-hours">Nouvelles heures approuvées *</Label>
              <div className="relative mt-2">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
                <Input
                  id="new-approved-hours"
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="24"
                  placeholder="Ex: 8"
                  value={newApprovedHours}
                  onChange={(e) => setNewApprovedHours(e.target.value)}
                  className="pl-10"
                />
              </div>
              {selectedRecordForAction && (
                <p className="text-xs text-text-secondary mt-1">
                  Heures demandées: {selectedRecordForAction.hours}h | Actuellement approuvées: {selectedRecordForAction.approvedHours || selectedRecordForAction.hours}h
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="edit-hours-reason">Motif de la modification (optionnel)</Label>
              <Textarea
                id="edit-hours-reason"
                placeholder="Ex: Correction suite à vérification..."
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditHoursDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="primary"
              onClick={handleEditHoursConfirm}
              disabled={
                updateApprovedHoursMutation.isPending ||
                !newApprovedHours ||
                parseFloat(newApprovedHours) < 0.5 ||
                isNaN(parseFloat(newApprovedHours))
              }
            >
              {updateApprovedHoursMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  En cours...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Enregistrer
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Annuler la conversion */}
      <Dialog open={cancelConversionDialogOpen} onOpenChange={setCancelConversionDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-warning">
              <Undo2 className="h-5 w-5" />
              Annuler la conversion en récupération
            </DialogTitle>
            <DialogDescription>
              {selectedRecordForAction && (
                <span className="block font-medium">
                  {selectedRecordForAction.employee?.firstName} {selectedRecordForAction.employee?.lastName} - {format(new Date(selectedRecordForAction.date), 'dd/MM/yyyy')} - {selectedRecordForAction.approvedHours || selectedRecordForAction.hours}h
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {isLoadingRecoveryInfo ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2">Chargement des informations...</span>
            </div>
          ) : (
            <>
              {/* Avertissement pour date passée */}
              {recoveryInfo?.hasPastDates && (
                <Alert variant="danger" className="my-4 border-2">
                  <AlertTriangle className="h-5 w-5" />
                  <AlertDescription>
                    <div className="font-bold text-danger mb-2">
                      ATTENTION: Date de récupération passée!
                    </div>
                    <div className="text-sm">
                      La date de récupération prévue ({recoveryInfo.recoveryDays?.map((rd: any) =>
                        format(new Date(rd.startDate), 'dd/MM/yyyy')
                      ).join(', ')}) est déjà passée.
                    </div>
                    <div className="text-sm mt-2 font-medium">
                      L'employé a peut-être déjà pris ce jour de repos. Vérifiez les pointages avant de confirmer.
                    </div>
                    <div className="text-sm mt-2 text-danger font-bold">
                      Une justification détaillée est obligatoire (min. 10 caractères).
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Info standard */}
              <Alert variant="warning" className="my-4">
                <AlertDescription>
                  <div>Cette action va:</div>
                  <ul className="list-disc ml-4 mt-2">
                    <li>Annuler le jour de récupération associé</li>
                    <li>Restaurer les heures supplémentaires en statut "Approuvé"</li>
                    <li>Les heures redeviendront disponibles pour paiement ou nouvelle conversion</li>
                  </ul>
                </AlertDescription>
              </Alert>

              {/* Afficher les dates de récupération */}
              {recoveryInfo?.recoveryDays && recoveryInfo.recoveryDays.length > 0 && (
                <div className="text-sm bg-muted p-3 rounded-md mb-4">
                  <div className="font-medium mb-1">Jour(s) de récupération concerné(s):</div>
                  {recoveryInfo.recoveryDays.map((rd: any) => (
                    <div key={rd.id} className={`flex items-center gap-2 ${rd.isPast ? 'text-danger' : ''}`}>
                      <Calendar className="h-4 w-4" />
                      {format(new Date(rd.startDate), 'dd/MM/yyyy')}
                      {rd.isPast && <span className="text-xs bg-danger text-white px-1 rounded">PASSÉ</span>}
                      <span className="text-muted-foreground">({rd.sourceHours}h)</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Champ de justification */}
              <div className="space-y-2">
                <Label htmlFor="cancelReason">
                  Justification {recoveryInfo?.hasPastDates && <span className="text-danger">*</span>}
                </Label>
                <Textarea
                  id="cancelReason"
                  value={cancelConversionReason}
                  onChange={(e) => setCancelConversionReason(e.target.value)}
                  placeholder={recoveryInfo?.hasPastDates
                    ? "Expliquez pourquoi vous annulez cette conversion malgré la date passée (min. 10 caractères)"
                    : "Raison de l'annulation (optionnel)"}
                  className={recoveryInfo?.hasPastDates ? 'border-danger' : ''}
                  rows={3}
                />
                {recoveryInfo?.hasPastDates && cancelConversionReason.length > 0 && cancelConversionReason.length < 10 && (
                  <p className="text-xs text-danger">
                    Minimum 10 caractères requis ({cancelConversionReason.length}/10)
                  </p>
                )}
              </div>
            </>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelConversionDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              variant={recoveryInfo?.hasPastDates ? "danger" : "warning"}
              onClick={handleCancelConversionConfirm}
              disabled={
                cancelConversionMutation.isPending ||
                isLoadingRecoveryInfo ||
                (recoveryInfo?.hasPastDates && (!cancelConversionReason || cancelConversionReason.trim().length < 10))
              }
            >
              {cancelConversionMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  En cours...
                </>
              ) : (
                <>
                  <Undo2 className="h-4 w-4 mr-2" />
                  {recoveryInfo?.hasPastDates ? "Confirmer malgré la date passée" : "Confirmer l'annulation"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      </DashboardLayout>
    </ProtectedRoute>
  );
}