'use client';

import React, { useState, useMemo, useEffect } from 'react';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import {
  Search,
  Download,
  RefreshCw,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Filter,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  useAttendance,
  useAttendanceAnomalies,
  useExportAttendance,
  useApproveAttendanceCorrection,
  useCreateAttendance,
  useDeleteAttendance,
} from '@/lib/hooks/useAttendance';
import { useAuth } from '@/contexts/AuthContext';
import { useEmployees } from '@/lib/hooks/useEmployees';
import { useSites } from '@/lib/hooks/useSites';
import { useDepartments } from '@/lib/hooks/useDepartments';
import { useShifts } from '@/lib/hooks/useShifts';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { SearchableEmployeeSelect } from '@/components/schedules/SearchableEmployeeSelect';
import { ChevronDown, ChevronUp, X, Calendar, ArrowUpDown, Users } from 'lucide-react';

// Helper pour formater les heures décimales en format "Xh Ymin"
const formatHoursToHM = (decimalHours: number): string => {
  const hours = Math.floor(decimalHours);
  const minutes = Math.round((decimalHours - hours) * 60);
  return `${hours}h${minutes.toString().padStart(2, '0')}min`;
};

// Helper pour formater les minutes en format "XhYYmin" (ex: 151min → 2h31min)
const formatMinutesToHM = (totalMinutes: number): string => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) {
    return `${minutes}min`;
  }
  return `${hours}h${minutes.toString().padStart(2, '0')}min`;
};

export default function AttendancePage() {
  const { user, hasPermission, hasRole } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState(
    format(new Date(), 'yyyy-MM-dd')
  );
  const [endDate, setEndDate] = useState(
    format(new Date(), 'yyyy-MM-dd')
  );
  const [showAnomaliesOnly, setShowAnomaliesOnly] = useState(false);
  
  // Modal création pointage manuel
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    employeeId: '',
    type: 'IN' as 'IN' | 'OUT' | 'BREAK_START' | 'BREAK_END',
    timestamp: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    siteId: '',
    notes: '',
  });

  // Advanced filters
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [selectedSite, setSelectedSite] = useState<string>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedAnomalyType, setSelectedAnomalyType] = useState<string>('all');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedShift, setSelectedShift] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'timestamp' | 'matricule'>('timestamp');
  const [groupByMatricule, setGroupByMatricule] = useState<boolean>(false);

  // Reset page quand les filtres changent
  useEffect(() => {
    setCurrentPage(1);
  }, [startDate, endDate, selectedEmployee, selectedSite, showAnomaliesOnly, selectedType, searchQuery, selectedDepartment, selectedAnomalyType, selectedSource, selectedStatus, selectedShift]);

  const approveMutation = useApproveAttendanceCorrection();
  const createMutation = useCreateAttendance();
  const deleteMutation = useDeleteAttendance();

  // Fetch data for filters
  // Charger tous les employés actifs pour le modal de création (sans pagination)
  const { data: employeesData, isLoading: isLoadingEmployees } = useEmployees({ isActive: true });
  const { data: sitesData } = useSites();
  const { data: departmentsData } = useDepartments();
  const { data: shiftsData } = useShifts();
  
  // Filtrer les employés selon les permissions (managers voient seulement leurs employés)
  const availableEmployees = useMemo(() => {
    if (!employeesData) {
      return [];
    }
    
    // Gérer les deux formats de réponse : tableau direct ou objet avec data/meta
    let employees: any[] = [];
    
    // Vérifier si c'est un tableau directement
    if (Array.isArray(employeesData)) {
      employees = employeesData;
    } 
    // Vérifier si c'est un objet avec une propriété data qui est un tableau
    else if (employeesData && typeof employeesData === 'object' && 'data' in employeesData) {
      if (Array.isArray(employeesData.data)) {
        employees = employeesData.data;
      }
    }
    // Si aucune des deux structures, essayer de convertir
    else {
      employees = [];
    }
    
    // Filtrer uniquement les employés actifs (double vérification côté client)
    const activeEmployees = employees.filter((emp: any) => {
      // Vérifier isActive de différentes façons possibles
      if (emp.isActive === false || emp.isActive === 'false') return false;
      if (emp.status === 'INACTIVE' || emp.status === 'TERMINATED') return false;
      // Par défaut, considérer comme actif si pas d'info explicite
      return true;
    });
    
    // Retourner les employés actifs (le backend gère déjà le filtrage par périmètre)
    return activeEmployees;
  }, [employeesData]);

  // Build filters object for API
  // PERF FIX 01/02/2026: Tous les filtres envoyés au backend (avant: filtrage client sur 500 records)
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  const apiFilters = useMemo(() => {
    const filters: any = {
      startDate,
      endDate,
      page: currentPage,
      limit: pageSize,
    };
    if (selectedEmployee !== 'all') filters.employeeId = selectedEmployee;
    if (selectedSite !== 'all') filters.siteId = selectedSite;
    if (showAnomaliesOnly) filters.hasAnomaly = true;
    if (selectedType !== 'all') filters.type = selectedType;
    if (searchQuery.trim()) filters.search = searchQuery.trim();
    if (selectedDepartment !== 'all') filters.departmentId = selectedDepartment;
    if (selectedAnomalyType !== 'all') filters.anomalyType = selectedAnomalyType;
    if (selectedSource !== 'all') filters.source = selectedSource;
    if (selectedStatus !== 'all') filters.status = selectedStatus;
    if (selectedShift !== 'all') filters.shiftId = selectedShift;
    return filters;
  }, [startDate, endDate, selectedEmployee, selectedSite, showAnomaliesOnly, selectedType, searchQuery, selectedDepartment, selectedAnomalyType, selectedSource, selectedStatus, selectedShift, currentPage]);

  // Helper function to convert Decimal values to numbers
  const toNumber = (value: any): number => {
    if (value == null || value === undefined) return 0;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return parseFloat(value) || 0;
    // Handle Prisma Decimal objects
    if (typeof value === 'object' && 'toNumber' in value) {
      return (value as any).toNumber();
    }
    return Number(value) || 0;
  };

  // Fetch attendance data with auto-refresh
  const { data: attendanceDataRaw, isLoading, isFetching, error, refetch, dataUpdatedAt } = useAttendance(apiFilters);
  // Handle both paginated response {data: [], meta: {}} and raw array response
  const attendanceData = Array.isArray(attendanceDataRaw) ? attendanceDataRaw : (attendanceDataRaw as any)?.data || [];
  const paginationMeta = !Array.isArray(attendanceDataRaw) ? (attendanceDataRaw as any)?.meta : null;
  const totalPages = paginationMeta?.totalPages || 1;
  const totalRecords = paginationMeta?.total || attendanceData.length;

  // Auto-refresh notification
  const [lastCount, setLastCount] = React.useState(0);
  React.useEffect(() => {
    if (Array.isArray(attendanceData) && attendanceData.length > lastCount && lastCount > 0) {
      const newRecords = attendanceData.length - lastCount;
      // toast.success(`${newRecords} nouveau(x) pointage(s) détecté(s)`);
    }
    if (Array.isArray(attendanceData)) {
      setLastCount(attendanceData.length);
    }
  }, [attendanceData, lastCount]);

  // Fetch anomalies
  const { data: anomaliesDataRaw } = useAttendanceAnomalies(startDate);

  // Normalize anomalies data (handle both array and paginated response)
  const anomaliesData = useMemo(() => {
    if (!anomaliesDataRaw) return [];
    if (Array.isArray(anomaliesDataRaw)) return anomaliesDataRaw;
    if (anomaliesDataRaw.data && Array.isArray(anomaliesDataRaw.data)) return anomaliesDataRaw.data;
    return [];
  }, [anomaliesDataRaw]);

  // Export mutation
  const exportMutation = useExportAttendance();

  const handleExport = (format: 'csv' | 'excel') => {
    exportMutation.mutate({
      format,
      filters: {
        ...apiFilters,
        // Inclure les filtres côté client pour l'export
        departmentId: selectedDepartment !== 'all' ? selectedDepartment : undefined,
        anomalyType: selectedAnomalyType !== 'all' ? selectedAnomalyType : undefined,
        source: selectedSource !== 'all' ? selectedSource : undefined,
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
      },
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'VALID':
        return (
          <Badge variant="success" className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Valide
          </Badge>
        );
      case 'PENDING_CORRECTION':
        return (
          <Badge variant="warning" className="flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            En attente
          </Badge>
        );
      case 'CORRECTED':
        return (
          <Badge variant="info" className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Corrigé
          </Badge>
        );
      default:
        return null;
    }
  };

  const getSourceBadge = (source: string) => {
    const sourceLabels: Record<string, string> = {
      BIOMETRIC: 'Empreinte',
      FINGERPRINT: 'Empreinte',
      FACE_RECOGNITION: 'Reconnaissance faciale',
      RFID: 'Badge RFID',
      RFID_BADGE: 'Badge RFID',
      FACIAL: 'Reconnaissance faciale',
      QR_CODE: 'QR Code',
      PIN: 'Code PIN',
      PIN_CODE: 'Code PIN',
      MOBILE_GPS: 'Mobile GPS',
      MANUAL: 'Manuel',
      IMPORT: 'Import',
    };
    return sourceLabels[source] || source;
  };

  const getTypeBadge = (type: string) => {
    const typeLabels: Record<string, { label: string; color: string; icon?: any }> = {
      ENTRY: { label: 'Entrée', color: 'bg-green-100 text-green-800' },
      EXIT: { label: 'Sortie', color: 'bg-blue-100 text-blue-800' },
      IN: { label: 'Entrée', color: 'bg-green-100 text-green-800' },
      OUT: { label: 'Sortie', color: 'bg-blue-100 text-blue-800' },
      BREAK_START: { label: 'Début pause', color: 'bg-yellow-100 text-yellow-800' },
      BREAK_END: { label: 'Fin pause', color: 'bg-orange-100 text-orange-800' },
      BREAK: { label: 'Pause', color: 'bg-yellow-100 text-yellow-800' },
    };
    const typeInfo = typeLabels[type] || { label: type, color: 'bg-gray-100 text-gray-800' };
    return (
      <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${typeInfo.color} inline-flex items-center gap-1`}>
        {typeInfo.label}
      </span>
    );
  };

  // Helper pour vérifier si c'est une vraie anomalie (pas une alerte informative)
  const isRealAnomaly = (record: any) => {
    return record.hasAnomaly && record.anomalyType !== 'JOUR_FERIE_TRAVAILLE';
  };

  const getAnomalyTypeBadge = (type?: string) => {
    if (!type) return null;
    const anomalyLabels: Record<string, { label: string; color: string }> = {
      // Anomalies informatives (auto-corrigées)
      DOUBLE_IN: { label: 'Double entrée', color: 'bg-sky-100 text-sky-700' },
      DOUBLE_OUT: { label: 'Double sortie', color: 'bg-sky-100 text-sky-700' },
      DEBOUNCE_BLOCKED: { label: 'Anti-rebond', color: 'bg-sky-100 text-sky-700' },
      AUTO_CORRECTED_WRONG_TYPE: { label: 'Mauvais bouton (auto-corrigé)', color: 'bg-blue-100 text-blue-800' },
      PROBABLE_WRONG_TYPE: { label: 'Mauvais bouton probable', color: 'bg-amber-100 text-amber-800' },
      // Anomalies de séquence
      MISSING_IN: { label: 'Sortie sans entrée', color: 'bg-orange-100 text-orange-800' },
      MISSING_OUT: { label: 'Entrée sans sortie', color: 'bg-yellow-100 text-yellow-800' },
      // Anomalies de temps
      LATE: { label: 'Retard', color: 'bg-purple-100 text-purple-800' },
      EARLY_LEAVE: { label: 'Départ anticipé', color: 'bg-pink-100 text-pink-800' },
      OVERTIME: { label: 'Heures supplémentaires', color: 'bg-green-100 text-green-800' },
      // Absences
      ABSENCE: { label: 'Absence', color: 'bg-red-100 text-red-800' },
      ABSENCE_PARTIAL: { label: 'Absence partielle', color: 'bg-orange-100 text-orange-800' },
      ABSENCE_TECHNICAL: { label: 'Absence technique', color: 'bg-blue-100 text-blue-800' },
      UNPLANNED_PUNCH: { label: 'Pointage non planifié', color: 'bg-slate-100 text-slate-800' },
      INSUFFICIENT_REST: { label: 'Repos insuffisant', color: 'bg-amber-100 text-amber-800' },
      // Jours spéciaux (alertes informatives, pas des anomalies)
      JOUR_FERIE_TRAVAILLE: { label: 'Jour férié', color: 'bg-purple-50 text-purple-600' },
      HOLIDAY_WORKED: { label: 'Jour férié', color: 'bg-purple-50 text-purple-600' },
      WEEKEND_WORK: { label: 'Weekend', color: 'bg-slate-50 text-slate-500' },
      WEEKEND_WORK_UNAUTHORIZED: { label: 'Weekend non autorisé', color: 'bg-red-100 text-red-800' },
      // Congés
      LEAVE_CONFLICT: { label: 'Pointage pendant congé', color: 'bg-red-100 text-red-800' },
      LEAVE_BUT_PRESENT: { label: 'Présent malgré congé', color: 'bg-orange-100 text-orange-800' },
    };
    const anomalyInfo = anomalyLabels[type] || { label: type, color: 'bg-gray-100 text-gray-800' };
    return (
      <Badge className={`${anomalyInfo.color} text-xs`}>
        {anomalyInfo.label}
      </Badge>
    );
  };

  const handleCreateAttendance = () => {
    if (!createFormData.employeeId || !createFormData.timestamp) {
      return;
    }

    // Extraire la date du pointage créé pour mettre à jour le filtre de dates
    const createdDate = format(new Date(createFormData.timestamp), 'yyyy-MM-dd');

    createMutation.mutate(
      {
        employeeId: createFormData.employeeId,
        type: createFormData.type,
        timestamp: new Date(createFormData.timestamp).toISOString(),
        method: 'MANUAL',
        siteId: createFormData.siteId || undefined,
        rawData: createFormData.notes ? { notes: createFormData.notes } : undefined,
      },
      {
        onSuccess: () => {
          setShowCreateModal(false);

          // Mettre à jour le filtre de dates pour inclure la date du pointage créé
          // Cela permet de voir immédiatement le pointage créé
          if (createdDate < startDate) {
            setStartDate(createdDate);
          }
          if (createdDate > endDate) {
            setEndDate(createdDate);
          }
          // Si la date est en dehors de la plage actuelle, ajuster la plage
          if (createdDate < startDate || createdDate > endDate) {
            setStartDate(createdDate);
            setEndDate(createdDate);
          }

          setCreateFormData({
            employeeId: '',
            type: 'IN',
            timestamp: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
            siteId: '',
            notes: '',
          });
          refetch();
        },
      }
    );
  };

  const filteredRecords = useMemo(() => {
    if (!Array.isArray(attendanceData)) return [];

    // PERF FIX 01/02/2026: Les filtres principaux sont maintenant côté backend
    // Seul le tri et quelques filtres légers restent côté client
    return attendanceData.filter((record: any) => {
      const matchesSearch = true;
      const matchesDepartment = true; // Filtré côté backend
      const matchesSite = true; // Filtré côté backend
      const matchesAnomalyType = true; // Filtré côté backend
      const matchesSource = true; // Filtré côté backend
      const matchesStatus = true; // Filtré côté backend

      const matchesShift = true; // Filtré côté backend

      return matchesSearch && matchesDepartment && matchesSite && matchesAnomalyType && matchesSource && matchesStatus && matchesShift;
    });
  }, [attendanceData, searchQuery, selectedDepartment, selectedSite, selectedAnomalyType, selectedSource, selectedStatus, selectedShift]);

  // Tri et groupement des records
  const sortedRecords = useMemo(() => {
    if (!filteredRecords.length) return [];

    const records = [...filteredRecords];

    if (groupByMatricule || sortBy === 'matricule') {
      // Trier par matricule puis par timestamp
      return records.sort((a: any, b: any) => {
        const matriculeA = a.employee?.matricule || '';
        const matriculeB = b.employee?.matricule || '';
        const matriculeCompare = matriculeA.localeCompare(matriculeB);

        if (matriculeCompare !== 0) return matriculeCompare;

        // Si même matricule, trier par timestamp
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      });
    } else {
      // Tri par timestamp (par défaut)
      return records.sort((a: any, b: any) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    }
  }, [filteredRecords, sortBy, groupByMatricule]);

  const resetFilters = () => {
    setSelectedEmployee('all');
    setSelectedSite('all');
    setSelectedDepartment('all');
    setSelectedType('all');
    setSelectedAnomalyType('all');
    setSelectedSource('all');
    setSelectedStatus('all');
    setSelectedShift('all');
    setSortBy('timestamp');
    setGroupByMatricule(false);
    setSearchQuery('');
    setShowAnomaliesOnly(false);
    const today = format(new Date(), 'yyyy-MM-dd');
    setStartDate(today);
    setEndDate(today);
  };

  const hasActiveFilters = selectedEmployee !== 'all' || selectedSite !== 'all' ||
    selectedDepartment !== 'all' || selectedType !== 'all' || selectedAnomalyType !== 'all' ||
    selectedSource !== 'all' || selectedStatus !== 'all' || selectedShift !== 'all' ||
    sortBy !== 'timestamp' || groupByMatricule || searchQuery !== '' || showAnomaliesOnly;

  return (
    <ProtectedRoute permissions={['attendance.view_all', 'attendance.view_own', 'attendance.view_team']}>
      <DashboardLayout
        title="Pointages & Présences"
        subtitle="Suivre les entrées/sorties, anomalies et intégrations biométriques"
      >
      <div className="space-y-6">
        {/* Anomalies Alert */}
        {anomaliesData && anomaliesData.length > 0 && (
          <Alert variant="warning">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <span className="font-semibold">{anomaliesData.length} anomalie(s) détectée(s)</span>
              {' '}nécessitent votre attention (sorties manquantes, retards, absences).
            </AlertDescription>
          </Alert>
        )}

        {/* Filters and Actions */}
        <Card>
          <CardContent className="p-4">
            <div className="space-y-4">
              {/* Date Filters Row */}
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-text-secondary whitespace-nowrap">Période:</label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-44"
                  />
                  <span className="text-text-secondary">→</span>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-44"
                  />
                </div>

                <div className="flex gap-2 ml-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const today = format(new Date(), 'yyyy-MM-dd');
                      setStartDate(today);
                      setEndDate(today);
                    }}
                  >
                    Aujourd'hui
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const today = new Date();
                      const weekStart = new Date(today.setDate(today.getDate() - today.getDay() + 1));
                      setStartDate(format(weekStart, 'yyyy-MM-dd'));
                      setEndDate(format(new Date(), 'yyyy-MM-dd'));
                    }}
                  >
                    Cette semaine
                  </Button>
                </div>
              </div>

              {/* Search and Actions Row */}
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex-1 min-w-[250px] max-w-md">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
                    <Input
                      type="text"
                      placeholder="Rechercher par nom, prénom ou matricule..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

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

                <PermissionGate permissions={['attendance.correct', 'attendance.view_anomalies']}>
                  <Button
                    variant={showAnomaliesOnly ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setShowAnomaliesOnly(!showAnomaliesOnly)}
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Anomalies uniquement
                    {showAnomaliesOnly && (
                      <Badge variant="danger" className="ml-2">
                        {filteredRecords.filter((r: any) => isRealAnomaly(r)).length}
                      </Badge>
                    )}
                  </Button>
                </PermissionGate>

                <Button
                  variant={groupByMatricule ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setGroupByMatricule(!groupByMatricule);
                    if (!groupByMatricule) {
                      setSortBy('matricule');
                    }
                  }}
                  title="Grouper les pointages par matricule"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Grouper par matricule
                </Button>

                <div className="flex gap-2 ml-auto">
                  <PermissionGate permissions={['attendance.create']}>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setShowCreateModal(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Créer un pointage
                    </Button>
                  </PermissionGate>
                  <PermissionGate permissions={['attendance.export', 'attendance.view_all']}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExport('csv')}
                      disabled={exportMutation.isPending}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {exportMutation.isPending ? 'Export...' : 'Export CSV'}
                    </Button>
                  </PermissionGate>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => refetch()}
                    disabled={isFetching}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
                    Actualiser
                  </Button>
                </div>
              </div>

              {/* Auto-refresh indicator */}
              <div className="flex items-center justify-between text-xs text-text-secondary">
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${isFetching ? 'bg-primary animate-pulse' : 'bg-success'}`} />
                  <span>
                    {isFetching ? 'Chargement en cours...' : `Dernière actualisation: ${format(new Date(dataUpdatedAt), 'HH:mm:ss')}`}
                  </span>
                </div>
                <span className="text-text-secondary">
                  Actualisation automatique toutes les 60s
                </span>
              </div>

              {/* Advanced Filters Panel */}
              {showAdvancedFilters && (
                <div className="mt-4 pt-4 border-t border-border-light">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {(() => {
                      const employeeOptions = [
                        { value: 'all', label: 'Tous les employés' },
                        ...availableEmployees.map((emp: any) => ({
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
                          }}
                          options={employeeOptions}
                          placeholder="Tous les employés"
                          label="Employé"
                          searchPlaceholder="Rechercher un employé..."
                        />
                      );
                    })()}

                    <div className="space-y-2">
                      <Label htmlFor="site-filter">Site</Label>
                      <Select value={selectedSite} onValueChange={setSelectedSite}>
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
                      <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
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
                      <Label htmlFor="type-filter">Type de pointage</Label>
                      <Select value={selectedType} onValueChange={setSelectedType}>
                        <SelectTrigger id="type-filter">
                          <SelectValue placeholder="Tous les types" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tous les types</SelectItem>
                          <SelectItem value="IN">Entrée</SelectItem>
                          <SelectItem value="OUT">Sortie</SelectItem>
                          <SelectItem value="BREAK_START">Début pause</SelectItem>
                          <SelectItem value="BREAK_END">Fin pause</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="anomaly-type-filter">Type d'anomalie</Label>
                      <Select value={selectedAnomalyType} onValueChange={setSelectedAnomalyType}>
                        <SelectTrigger id="anomaly-type-filter">
                          <SelectValue placeholder="Tous les types" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tous les types</SelectItem>
                          <SelectItem value="DOUBLE_IN">Double entrée</SelectItem>
                          <SelectItem value="MISSING_IN">Sortie sans entrée</SelectItem>
                          <SelectItem value="MISSING_OUT">Entrée sans sortie</SelectItem>
                          <SelectItem value="LATE">Retard</SelectItem>
                          <SelectItem value="EARLY_LEAVE">Départ anticipé</SelectItem>
                          <SelectItem value="ABSENCE">Absence</SelectItem>
                          <SelectItem value="ABSENCE_PARTIAL">Absence partielle</SelectItem>
                          <SelectItem value="ABSENCE_TECHNICAL">Absence technique</SelectItem>
                          <SelectItem value="UNPLANNED_PUNCH">Pointage non planifié</SelectItem>
                          <SelectItem value="INSUFFICIENT_REST">Repos insuffisant</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="source-filter">Source/Méthode</Label>
                      <Select value={selectedSource} onValueChange={setSelectedSource}>
                        <SelectTrigger id="source-filter">
                          <SelectValue placeholder="Toutes les sources" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Toutes les sources</SelectItem>
                          <SelectItem value="BIOMETRIC">Empreinte</SelectItem>
                          <SelectItem value="FACIAL">Reconnaissance faciale</SelectItem>
                          <SelectItem value="RFID">Badge RFID</SelectItem>
                          <SelectItem value="QR_CODE">QR Code</SelectItem>
                          <SelectItem value="PIN">Code PIN</SelectItem>
                          <SelectItem value="MOBILE_GPS">Mobile GPS</SelectItem>
                          <SelectItem value="MANUAL">Manuel</SelectItem>
                          <SelectItem value="IMPORT">Import</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="status-filter">Statut</Label>
                      <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                        <SelectTrigger id="status-filter">
                          <SelectValue placeholder="Tous les statuts" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tous les statuts</SelectItem>
                          <SelectItem value="VALID">Valide</SelectItem>
                          <SelectItem value="HAS_ANOMALY">Avec anomalie</SelectItem>
                          <SelectItem value="CORRECTED">Corrigé</SelectItem>
                          <SelectItem value="PENDING_APPROVAL">En attente d'approbation</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="shift-filter">Shift</Label>
                      <Select value={selectedShift} onValueChange={setSelectedShift}>
                        <SelectTrigger id="shift-filter">
                          <SelectValue placeholder="Tous les shifts" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tous les shifts</SelectItem>
                          {(Array.isArray(shiftsData) ? shiftsData : shiftsData?.data || []).map((shift: any) => (
                            <SelectItem key={shift.id} value={shift.id}>
                              {shift.name} ({shift.startTime} - {shift.endTime})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                      }}
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Aujourd'hui
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const today = new Date();
                        const weekStart = new Date(today.setDate(today.getDate() - today.getDay() + 1));
                        setStartDate(format(weekStart, 'yyyy-MM-dd'));
                        setEndDate(format(new Date(), 'yyyy-MM-dd'));
                      }}
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Cette semaine
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const now = new Date();
                        setStartDate(format(new Date(now.getFullYear(), now.getMonth(), 1), 'yyyy-MM-dd'));
                        setEndDate(format(new Date(now.getFullYear(), now.getMonth() + 1, 0), 'yyyy-MM-dd'));
                      }}
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Ce mois
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-secondary">Total pointages</p>
                  <p className="text-3xl font-bold text-text-primary mt-1">
                    {totalRecords}
                  </p>
                  <p className="text-xs text-text-secondary mt-1">
                    {totalRecords} au total
                  </p>
                </div>
                <Clock className="h-12 w-12 text-primary opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-secondary">Entrées</p>
                  <p className="text-3xl font-bold text-success mt-1">
                    {paginationMeta?.totalIN ?? filteredRecords.filter((r: any) => r.type === 'IN' || r.type === 'ENTRY').length}
                  </p>
                  <p className="text-xs text-text-secondary mt-1">
                    Pointages d'entrée
                  </p>
                </div>
                <CheckCircle className="h-12 w-12 text-success opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-secondary">Sorties</p>
                  <p className="text-3xl font-bold text-primary mt-1">
                    {paginationMeta?.totalOUT ?? filteredRecords.filter((r: any) => r.type === 'OUT' || r.type === 'EXIT').length}
                  </p>
                  <p className="text-xs text-text-secondary mt-1">
                    Pointages de sortie
                  </p>
                </div>
                <XCircle className="h-12 w-12 text-primary opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-secondary">Anomalies</p>
                  <p className="text-3xl font-bold text-danger mt-1">
                    {paginationMeta?.totalAnomalies ?? filteredRecords.filter((r: any) => isRealAnomaly(r)).length}
                  </p>
                  <p className="text-xs text-text-secondary mt-1">
                    {anomaliesData?.filter((a: any) => a.anomalyType !== 'JOUR_FERIE_TRAVAILLE').length || 0} non résolues
                  </p>
                </div>
                <AlertTriangle className="h-12 w-12 text-danger opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Attendance Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Liste des pointages</CardTitle>
            <div className="text-sm text-text-secondary">
              {totalRecords} pointage{totalRecords > 1 ? 's' : ''} trouvé{totalRecords > 1 ? 's' : ''}
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
            ) : filteredRecords.length === 0 && !isFetching ? (
              <div className="text-center py-12 text-text-secondary">
                <Clock className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>Aucun pointage trouvé pour cette période.</p>
              </div>
            ) : (
              <>
              {isFetching && !isLoading && (
                <div className="flex items-center justify-center py-3 mb-2 bg-blue-50 rounded-lg border border-blue-100">
                  <RefreshCw className="h-4 w-4 animate-spin text-primary mr-2" />
                  <span className="text-sm text-primary font-medium">Chargement des données...</span>
                </div>
              )}
              <div className={`overflow-x-auto ${isFetching && !isLoading ? 'opacity-50 pointer-events-none' : ''}`}>
                <table className="w-full">
                  <thead>
                    <tr className="bg-table-header text-left text-sm font-semibold text-text-primary border-b-2 border-table-border">
                      <th className="p-4">Employé</th>
                      <th className="p-4">Shift</th>
                      <th className="p-4">Type</th>
                      <th className="p-4">Date & Heure</th>
                      <th className="p-4">Métriques</th>
                      <th className="p-4">Source</th>
                      <th className="p-4">Terminal</th>
                      <th className="p-4">Statut</th>
                      <th className="p-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-table-border">
                    {sortedRecords.map((record: any, index: number) => {
                      // Déterminer si c'est un nouveau groupe de matricule
                      const isNewGroup = groupByMatricule && index > 0 &&
                        record.employee?.matricule !== sortedRecords[index - 1]?.employee?.matricule;

                      return (
                      <tr
                        key={record.id}
                        className={`hover:bg-table-hover transition-colors ${isNewGroup ? 'border-t-4 border-primary/30' : ''}`}
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-sm font-semibold text-primary">
                                {record.employee?.firstName?.charAt(0)}{record.employee?.lastName?.charAt(0)}
                              </span>
                            </div>
                            <div>
                              <div className="font-medium text-text-primary">
                                {record.employee?.firstName} {record.employee?.lastName}
                              </div>
                              <div className="text-sm text-text-secondary">
                                {record.employee?.matricule || '—'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          {/* FIX 17/01/2026: Utiliser effectiveShift (planning personnalisé) au lieu de currentShift (défaut) */}
                          {record.effectiveShift ? (
                            <div className="text-sm">
                              <div className="font-medium text-primary">
                                {record.effectiveShift.name}
                              </div>
                              <div className="text-xs text-text-secondary">
                                {record.effectiveShift.startTime} - {record.effectiveShift.endTime}
                              </div>
                              {record.effectiveShift.code && (
                                <div className="text-xs text-text-secondary font-mono">
                                  ({record.effectiveShift.code})
                                </div>
                              )}
                            </div>
                          ) : record.employee?.currentShift ? (
                            <div className="text-sm">
                              <div className="font-medium text-primary">
                                {record.employee.currentShift.name}
                              </div>
                              <div className="text-xs text-text-secondary">
                                {record.employee.currentShift.startTime} - {record.employee.currentShift.endTime}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-text-secondary italic">Aucun shift</span>
                          )}
                        </td>
                        <td className="p-4">
                          {getTypeBadge(record.type)}
                        </td>
                        <td className="p-4">
                          <div className="text-sm font-medium text-text-primary">
                            {format(new Date(record.timestamp), 'dd MMMM yyyy', { locale: fr })}
                          </div>
                          <div className="text-sm text-text-secondary font-mono">
                            {format(new Date(record.timestamp), 'HH:mm:ss')}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="space-y-1">
                            {record.hoursWorked && (
                              <div className="text-xs text-text-secondary">
                                <span className="font-medium">Heures:</span> {formatHoursToHM(toNumber(record.hoursWorked))}
                              </div>
                            )}
                            {record.lateMinutes && record.lateMinutes > 0 && (
                              <div className="text-xs text-danger">
                                <span className="font-medium">Retard:</span> {formatMinutesToHM(record.lateMinutes)}
                              </div>
                            )}
                            {record.earlyLeaveMinutes && record.earlyLeaveMinutes > 0 && (
                              <div className="text-xs text-warning">
                                <span className="font-medium">Départ anticipé:</span> {formatMinutesToHM(record.earlyLeaveMinutes)}
                              </div>
                            )}
                            {record.overtimeMinutes && record.overtimeMinutes > 0 && (
                              <div className="text-xs text-success">
                                <span className="font-medium">Heures sup:</span> {formatMinutesToHM(record.overtimeMinutes)}
                              </div>
                            )}
                            {!record.hoursWorked && !record.lateMinutes && !record.earlyLeaveMinutes && !record.overtimeMinutes && (
                              <span className="text-xs text-text-secondary">—</span>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="text-sm text-text-secondary">
                            {getSourceBadge(record.method || record.source)}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="text-sm text-text-secondary font-mono">
                            {record.device?.name || record.deviceId?.substring(0, 8) || '—'}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="space-y-1">
                            {/* Si corrigé et approuvé, afficher "Valide" au lieu de l'anomalie */}
                            {record.isCorrected && record.approvalStatus === 'APPROVED' ? (
                              <>
                                <Badge variant="success" className="flex items-center gap-1 w-fit">
                                  <CheckCircle className="h-3 w-3" />
                                  Valide
                                </Badge>
                                <Badge variant="info" className="flex items-center gap-1 w-fit mt-1">
                                  <CheckCircle className="h-3 w-3" />
                                  {['DOUBLE_OUT', 'DOUBLE_IN', 'DEBOUNCE_BLOCKED'].includes(record.anomalyType)
                                    ? 'Auto correction'
                                    : 'Corrigé'}
                                </Badge>
                                {!['DOUBLE_OUT', 'DOUBLE_IN', 'DEBOUNCE_BLOCKED'].includes(record.anomalyType) && (
                                  <Badge variant="success" className="flex items-center gap-1 w-fit mt-1">
                                    <CheckCircle className="h-3 w-3" />
                                    Approuvé
                                  </Badge>
                                )}
                              </>
                            ) : record.hasAnomaly || ['WEEKEND_WORK', 'HOLIDAY_WORKED'].includes(record.anomalyType) ? (
                              <>
                                {['JOUR_FERIE_TRAVAILLE', 'HOLIDAY_WORKED', 'WEEKEND_WORK', 'DOUBLE_OUT', 'DOUBLE_IN', 'DEBOUNCE_BLOCKED'].includes(record.anomalyType) ? (
                                  <Badge variant="info" className="flex items-center gap-1 w-fit">
                                    <AlertCircle className="h-3 w-3" />
                                    {['WEEKEND_WORK', 'HOLIDAY_WORKED'].includes(record.anomalyType) ? 'Alerte' : 'Info'}
                                  </Badge>
                                ) : (
                                  <Badge variant="danger" className="flex items-center gap-1 w-fit">
                                    <AlertTriangle className="h-3 w-3" />
                                    Anomalie
                                  </Badge>
                                )}
                                {record.anomalyType && (
                                  <div className="mt-1">
                                    {getAnomalyTypeBadge(record.anomalyType)}
                                  </div>
                                )}
                                {record.anomalyNote && (
                                  <div className="text-xs text-text-secondary mt-1 max-w-xs">
                                    {record.anomalyNote}
                                  </div>
                                )}
                                {/* Afficher badges de correction si en cours mais pas encore approuvé */}
                                {record.isCorrected && (
                                  <Badge variant="info" className="flex items-center gap-1 w-fit mt-1">
                                    <CheckCircle className="h-3 w-3" />
                                    {['DOUBLE_OUT', 'DOUBLE_IN', 'DEBOUNCE_BLOCKED', 'AUTO_CORRECTED_WRONG_TYPE'].includes(record.anomalyType)
                                      ? 'Auto correction'
                                      : 'Corrigé'}
                                  </Badge>
                                )}
                                {record.needsApproval && record.approvalStatus === 'PENDING_APPROVAL' && (
                                  <Badge variant="warning" className="flex items-center gap-1 w-fit mt-1">
                                    <AlertCircle className="h-3 w-3" />
                                    En attente d'approbation
                                  </Badge>
                                )}
                                {record.approvalStatus === 'REJECTED' && (
                                  <Badge variant="danger" className="flex items-center gap-1 w-fit mt-1">
                                    <XCircle className="h-3 w-3" />
                                    Rejeté
                                  </Badge>
                                )}
                              </>
                            ) : (
                              <Badge variant="success" className="flex items-center gap-1 w-fit">
                                <CheckCircle className="h-3 w-3" />
                                Valide
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            {/* Lien vers page anomalies : si anomalie non corrigée (sauf info) */}
                            {record.hasAnomaly &&
                             !['JOUR_FERIE_TRAVAILLE', 'DOUBLE_OUT', 'DOUBLE_IN', 'DEBOUNCE_BLOCKED', 'WEEKEND_WORK', 'HOLIDAY_WORKED'].includes(record.anomalyType) &&
                             !record.isCorrected && (
                              <PermissionGate permissions={['attendance.correct', 'attendance.view_anomalies']}>
                                <Link href="/attendance/anomalies">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                  >
                                    <AlertTriangle className="h-4 w-4 mr-1" />
                                    Voir anomalies
                                  </Button>
                                </Link>
                              </PermissionGate>
                            )}
                            {/* Bouton Approuver : Afficher si correction en attente d'approbation */}
                            {record.needsApproval && record.approvalStatus === 'PENDING_APPROVAL' && (
                              <PermissionGate permissions={['attendance.approve_correction', 'attendance.correct']}>
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() => {
                                    if (confirm('Approuver cette correction ?')) {
                                      approveMutation.mutate({
                                        id: record.id,
                                        approved: true,
                                      });
                                    }
                                  }}
                                  disabled={approveMutation.isPending}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Approuver
                                </Button>
                              </PermissionGate>
                            )}
                            {/* Bouton Supprimer : Afficher uniquement pour les pointages manuels */}
                            {(record.method === 'MANUAL' || record.source === 'MANUAL') && (
                              <PermissionGate permissions={['attendance.delete', 'attendance.edit']}>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    if (confirm(
                                      `Êtes-vous sûr de vouloir supprimer ce pointage manuel ?\n\n` +
                                      `Employé: ${record.employee?.firstName} ${record.employee?.lastName}\n` +
                                      `Date: ${format(new Date(record.timestamp), 'dd/MM/yyyy HH:mm', { locale: fr })}\n` +
                                      `Type: ${record.type}\n\n` +
                                      `Cette action est irréversible.`
                                    )) {
                                      deleteMutation.mutate(record.id);
                                    }
                                  }}
                                  disabled={deleteMutation.isPending}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  Supprimer
                                </Button>
                              </PermissionGate>
                            )}
                            {/* Afficher si déjà corrigé */}
                            {record.isCorrected && !record.needsApproval && (
                              <span className="text-xs text-gray-500 italic">
                                {['DOUBLE_OUT', 'DOUBLE_IN', 'DEBOUNCE_BLOCKED'].includes(record.anomalyType)
                                  ? 'Auto correction'
                                  : 'Corrigé'}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 0 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <div className="text-sm text-muted-foreground">
                    {totalRecords} pointage(s) — Page {currentPage} / {totalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage <= 1}
                    >
                      Précédent
                    </Button>
                    {totalPages <= 7 ? (
                      Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                        <Button
                          key={p}
                          variant={p === currentPage ? 'primary' : 'outline'}
                          size="sm"
                          onClick={() => setCurrentPage(p)}
                          className="min-w-[36px]"
                        >
                          {p}
                        </Button>
                      ))
                    ) : (
                      <>
                        {[1, 2].map(p => (
                          <Button key={p} variant={p === currentPage ? 'primary' : 'outline'} size="sm" onClick={() => setCurrentPage(p)} className="min-w-[36px]">{p}</Button>
                        ))}
                        {currentPage > 3 && <span className="px-1">...</span>}
                        {currentPage > 2 && currentPage < totalPages - 1 && (
                          <Button variant="primary" size="sm" className="min-w-[36px]">{currentPage}</Button>
                        )}
                        {currentPage < totalPages - 2 && <span className="px-1">...</span>}
                        {[totalPages - 1, totalPages].filter(p => p > 2).map(p => (
                          <Button key={p} variant={p === currentPage ? 'primary' : 'outline'} size="sm" onClick={() => setCurrentPage(p)} className="min-w-[36px]">{p}</Button>
                        ))}
                      </>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage >= totalPages}
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

        {/* Create Attendance Modal */}
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Créer un pointage manuel</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                {(() => {
                  const employeeOptions = availableEmployees.map((emp: any) => ({
                    value: emp.id,
                    label: `${emp.firstName} ${emp.lastName} (${emp.matricule || 'N/A'})`,
                    searchText: `${emp.firstName} ${emp.lastName} ${emp.matricule || ''}`.toLowerCase()
                  }));

                  return (
                    <SearchableSelect
                      value={createFormData.employeeId}
                      onChange={(value) => setCreateFormData({ ...createFormData, employeeId: value })}
                      options={employeeOptions}
                      placeholder={
                        isLoadingEmployees 
                          ? "Chargement..." 
                          : availableEmployees.length === 0 
                            ? "Aucun employé disponible" 
                            : "Sélectionner un employé"
                      }
                      label="Employé *"
                      searchPlaceholder="Rechercher un employé..."
                      disabled={isLoadingEmployees || availableEmployees.length === 0}
                    />
                  );
                })()}

                <div className="space-y-2">
                  <Label htmlFor="create-type">Type de pointage *</Label>
                  <Select
                    value={createFormData.type}
                    onValueChange={(value) =>
                      setCreateFormData({ ...createFormData, type: value as 'IN' | 'OUT' | 'BREAK_START' | 'BREAK_END' })
                    }
                  >
                    <SelectTrigger id="create-type">
                      <SelectValue placeholder="Sélectionner un type">
                        {createFormData.type === 'IN' && 'Entrée'}
                        {createFormData.type === 'OUT' && 'Sortie'}
                        {createFormData.type === 'BREAK_START' && 'Début pause'}
                        {createFormData.type === 'BREAK_END' && 'Fin pause'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IN">Entrée</SelectItem>
                      <SelectItem value="OUT">Sortie</SelectItem>
                      <SelectItem value="BREAK_START">Début pause</SelectItem>
                      <SelectItem value="BREAK_END">Fin pause</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="create-timestamp">Date & Heure *</Label>
                  <Input
                    id="create-timestamp"
                    type="datetime-local"
                    value={createFormData.timestamp}
                    onChange={(e) => setCreateFormData({ ...createFormData, timestamp: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="create-site">Site</Label>
                  <Select
                    value={createFormData.siteId}
                    onValueChange={(value) => setCreateFormData({ ...createFormData, siteId: value })}
                  >
                    <SelectTrigger id="create-site">
                      <SelectValue placeholder="Sélectionner un site (optionnel)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Aucun site</SelectItem>
                      {(Array.isArray(sitesData) ? sitesData : sitesData?.data || []).map((site: any) => (
                        <SelectItem key={site.id} value={site.id}>
                          {site.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-notes">Notes (optionnel)</Label>
                <Textarea
                  id="create-notes"
                  value={createFormData.notes}
                  onChange={(e) => setCreateFormData({ ...createFormData, notes: e.target.value })}
                  placeholder="Ajouter des notes sur ce pointage..."
                  className="min-h-[100px]"
                />
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Pointage manuel :</strong> Ce pointage sera créé avec la méthode "MANUAL" et pourra être marqué comme anomalie si nécessaire selon les règles de validation.
                </AlertDescription>
              </Alert>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateModal(false);
                  setCreateFormData({
                    employeeId: '',
                    type: 'IN',
                    timestamp: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
                    siteId: '',
                    notes: '',
                  });
                }}
              >
                Annuler
              </Button>
              <Button
                variant="primary"
                onClick={handleCreateAttendance}
                disabled={!createFormData.employeeId || !createFormData.timestamp || createMutation.isPending}
              >
                {createMutation.isPending ? 'Création...' : 'Créer le pointage'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </DashboardLayout>
    </ProtectedRoute>
  );
}
