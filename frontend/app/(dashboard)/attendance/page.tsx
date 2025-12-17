'use client';

import React, { useState, useMemo } from 'react';
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
import {
  Search,
  Download,
  RefreshCw,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Edit,
  Filter,
} from 'lucide-react';
import {
  useAttendance,
  useAttendanceAnomalies,
  useExportAttendance,
  useCorrectAttendance,
  useApproveAttendanceCorrection,
} from '@/lib/hooks/useAttendance';
import { useAuth } from '@/contexts/AuthContext';
import { useEmployees } from '@/lib/hooks/useEmployees';
import { useSites } from '@/lib/hooks/useSites';
import { useDepartments } from '@/lib/hooks/useDepartments';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { SearchableEmployeeSelect } from '@/components/schedules/SearchableEmployeeSelect';
import { ChevronDown, ChevronUp, X, Calendar } from 'lucide-react';

export default function AttendancePage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState(
    format(new Date(), 'yyyy-MM-dd')
  );
  const [endDate, setEndDate] = useState(
    format(new Date(), 'yyyy-MM-dd')
  );
  const [showAnomaliesOnly, setShowAnomaliesOnly] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [correctionNote, setCorrectionNote] = useState('');
  const [correctedTimestamp, setCorrectedTimestamp] = useState('');

  // Advanced filters
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [selectedSite, setSelectedSite] = useState<string>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedAnomalyType, setSelectedAnomalyType] = useState<string>('all');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState('');

  const correctMutation = useCorrectAttendance();
  const approveMutation = useApproveAttendanceCorrection();

  // Fetch data for filters
  const { data: employeesData } = useEmployees();
  const { data: sitesData } = useSites();
  const { data: departmentsData } = useDepartments();

  // Build filters object for API
  const apiFilters = useMemo(() => {
    const filters: any = {
      startDate,
      endDate,
      page: 1,
      limit: 100,
    };
    if (selectedEmployee !== 'all') filters.employeeId = selectedEmployee;
    if (selectedSite !== 'all') filters.siteId = selectedSite;
    if (showAnomaliesOnly) filters.hasAnomaly = true;
    if (selectedType !== 'all') filters.type = selectedType;
    return filters;
  }, [startDate, endDate, selectedEmployee, selectedSite, showAnomaliesOnly, selectedType]);

  // Fetch attendance data with auto-refresh
  const { data: attendanceData, isLoading, error, refetch, dataUpdatedAt } = useAttendance(apiFilters);

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
  const { data: anomaliesData } = useAttendanceAnomalies(startDate);

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

  const getAnomalyTypeBadge = (type?: string) => {
    if (!type) return null;
    const anomalyLabels: Record<string, { label: string; color: string }> = {
      DOUBLE_IN: { label: 'Double entrée', color: 'bg-red-100 text-red-800' },
      MISSING_IN: { label: 'Sortie sans entrée', color: 'bg-orange-100 text-orange-800' },
      MISSING_OUT: { label: 'Entrée sans sortie', color: 'bg-yellow-100 text-yellow-800' },
      LATE: { label: 'Retard', color: 'bg-purple-100 text-purple-800' },
      EARLY_LEAVE: { label: 'Départ anticipé', color: 'bg-pink-100 text-pink-800' },
      ABSENCE: { label: 'Absence', color: 'bg-red-100 text-red-800' },
    };
    const anomalyInfo = anomalyLabels[type] || { label: type, color: 'bg-gray-100 text-gray-800' };
    return (
      <Badge className={`${anomalyInfo.color} text-xs`}>
        {anomalyInfo.label}
      </Badge>
    );
  };

  const handleCorrect = (record: any) => {
    setSelectedRecord(record);
    setCorrectionNote('');
    setCorrectedTimestamp(format(new Date(record.timestamp), "yyyy-MM-dd'T'HH:mm"));
    setShowCorrectionModal(true);
  };

  const handleSubmitCorrection = () => {
    if (!selectedRecord || !correctionNote.trim() || !user?.id) return;

    correctMutation.mutate(
      {
        id: selectedRecord.id,
        data: {
          correctionNote: correctionNote.trim(),
          correctedBy: user.id,
          correctedTimestamp: correctedTimestamp || undefined,
        },
      },
      {
        onSuccess: () => {
          setShowCorrectionModal(false);
          setSelectedRecord(null);
          setCorrectionNote('');
          setCorrectedTimestamp('');
        },
      }
    );
  };

  const filteredRecords = useMemo(() => {
    if (!Array.isArray(attendanceData)) return [];

    return attendanceData.filter((record: any) => {
      // Filtre par recherche
      const matchesSearch =
        searchQuery === '' ||
        record.employee?.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.employee?.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.employee?.matricule?.toLowerCase().includes(searchQuery.toLowerCase());

      // Filtre par département (côté client)
      const matchesDepartment =
        selectedDepartment === 'all' ||
        record.employee?.departmentId === selectedDepartment;

      // Filtre par type d'anomalie (côté client)
      const matchesAnomalyType =
        selectedAnomalyType === 'all' ||
        !record.hasAnomaly ||
        record.anomalyType === selectedAnomalyType;

      // Filtre par source (côté client)
      const matchesSource =
        selectedSource === 'all' ||
        record.method === selectedSource ||
        record.source === selectedSource;

      // Filtre par statut (côté client)
      const matchesStatus =
        selectedStatus === 'all' ||
        (selectedStatus === 'VALID' && !record.hasAnomaly && !record.isCorrected) ||
        (selectedStatus === 'HAS_ANOMALY' && record.hasAnomaly) ||
        (selectedStatus === 'CORRECTED' && record.isCorrected) ||
        (selectedStatus === 'PENDING_APPROVAL' && record.approvalStatus === 'PENDING_APPROVAL');

      return matchesSearch && matchesDepartment && matchesAnomalyType && matchesSource && matchesStatus;
    });
  }, [attendanceData, searchQuery, selectedDepartment, selectedAnomalyType, selectedSource, selectedStatus]);

  const resetFilters = () => {
    setSelectedEmployee('all');
    setSelectedSite('all');
    setSelectedDepartment('all');
    setSelectedType('all');
    setSelectedAnomalyType('all');
    setSelectedSource('all');
    setSelectedStatus('all');
    setSearchQuery('');
    setEmployeeSearchQuery('');
    setShowAnomaliesOnly(false);
    const today = format(new Date(), 'yyyy-MM-dd');
    setStartDate(today);
    setEndDate(today);
  };

  const hasActiveFilters = selectedEmployee !== 'all' || selectedSite !== 'all' ||
    selectedDepartment !== 'all' || selectedType !== 'all' || selectedAnomalyType !== 'all' ||
    selectedSource !== 'all' || selectedStatus !== 'all' || searchQuery !== '' ||
    employeeSearchQuery !== '' || showAnomaliesOnly;

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
                        {filteredRecords.filter((r: any) => r.hasAnomaly).length}
                      </Badge>
                    )}
                  </Button>
                </PermissionGate>

                <div className="flex gap-2 ml-auto">
                  <PermissionGate permissions={['attendance.export', 'attendance.view_all']}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExport('csv')}
                      disabled={exportMutation.isPending}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      CSV
                    </Button>
                  </PermissionGate>
                  <PermissionGate permissions={['attendance.export', 'attendance.view_all']}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExport('excel')}
                      disabled={exportMutation.isPending}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Excel
                    </Button>
                  </PermissionGate>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => refetch()}
                    disabled={isLoading}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                    Actualiser
                  </Button>
                </div>
              </div>

              {/* Auto-refresh indicator */}
              <div className="flex items-center justify-between text-xs text-text-secondary">
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${isLoading ? 'bg-primary animate-pulse' : 'bg-success'}`} />
                  <span>
                    {isLoading ? 'Chargement en cours...' : `Dernière actualisation: ${format(new Date(dataUpdatedAt), 'HH:mm:ss')}`}
                  </span>
                </div>
                <span className="text-text-secondary">
                  Actualisation automatique toutes les 30s
                </span>
              </div>

              {/* Advanced Filters Panel */}
              {showAdvancedFilters && (
                <div className="mt-4 pt-4 border-t border-border-light">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="employee-filter">Employé</Label>
                      <div className="space-y-2">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
                          <Input
                            id="employee-search"
                            type="text"
                            placeholder="Rechercher un employé..."
                            value={employeeSearchQuery}
                            onChange={(e) => {
                              setEmployeeSearchQuery(e.target.value);
                              setSearchQuery(e.target.value);
                            }}
                            className="pl-10"
                          />
                        </div>
                        <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                          <SelectTrigger id="employee-filter">
                            <SelectValue placeholder="Tous les employés" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Tous les employés</SelectItem>
                            {employeesData?.data
                              ?.filter((emp: any) => {
                                if (!employeeSearchQuery) return true;
                                const query = employeeSearchQuery.toLowerCase();
                                const firstName = emp.firstName?.toLowerCase() || '';
                                const lastName = emp.lastName?.toLowerCase() || '';
                                const matricule = emp.matricule?.toLowerCase() || '';
                                return firstName.includes(query) || lastName.includes(query) || matricule.includes(query);
                              })
                              .map((emp: any) => (
                                <SelectItem key={emp.id} value={emp.id}>
                                  {emp.firstName} {emp.lastName} ({emp.matricule})
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

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
                          {(Array.isArray(departmentsData) ? departmentsData : departmentsData?.data || []).map((dept: any) => (
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
                    {filteredRecords.length}
                  </p>
                  <p className="text-xs text-text-secondary mt-1">
                    {Array.isArray(attendanceData) ? attendanceData.length : 0} au total
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
                    {filteredRecords.filter((r: any) => r.type === 'IN' || r.type === 'ENTRY').length}
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
                    {filteredRecords.filter((r: any) => r.type === 'OUT' || r.type === 'EXIT').length}
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
                    {filteredRecords.filter((r: any) => r.hasAnomaly).length}
                  </p>
                  <p className="text-xs text-text-secondary mt-1">
                    {anomaliesData?.length || 0} non résolues
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
              {filteredRecords.length} pointage{filteredRecords.length > 1 ? 's' : ''} trouvé{filteredRecords.length > 1 ? 's' : ''}
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
                <p>Aucun pointage trouvé pour cette période.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-table-header text-left text-sm font-semibold text-text-primary border-b-2 border-table-border">
                      <th className="p-4">Employé</th>
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
                    {filteredRecords.map((record: any) => (
                      <tr key={record.id} className="hover:bg-table-hover transition-colors">
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
                                <span className="font-medium">Heures:</span> {record.hoursWorked.toFixed(2)}h
                              </div>
                            )}
                            {record.lateMinutes && record.lateMinutes > 0 && (
                              <div className="text-xs text-danger">
                                <span className="font-medium">Retard:</span> {record.lateMinutes}min
                              </div>
                            )}
                            {record.earlyLeaveMinutes && record.earlyLeaveMinutes > 0 && (
                              <div className="text-xs text-warning">
                                <span className="font-medium">Départ anticipé:</span> {record.earlyLeaveMinutes}min
                              </div>
                            )}
                            {record.overtimeMinutes && record.overtimeMinutes > 0 && (
                              <div className="text-xs text-success">
                                <span className="font-medium">Heures sup:</span> {record.overtimeMinutes}min
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
                            {record.hasAnomaly ? (
                              <>
                                <Badge variant="danger" className="flex items-center gap-1 w-fit">
                                  <AlertTriangle className="h-3 w-3" />
                                  Anomalie
                                </Badge>
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
                              </>
                            ) : (
                              <Badge variant="success" className="flex items-center gap-1 w-fit">
                                <CheckCircle className="h-3 w-3" />
                                Valide
                              </Badge>
                            )}
                            {record.isCorrected && (
                              <Badge variant="info" className="flex items-center gap-1 w-fit mt-1">
                                <CheckCircle className="h-3 w-3" />
                                Corrigé
                              </Badge>
                            )}
                            {record.needsApproval && record.approvalStatus === 'PENDING_APPROVAL' && (
                              <Badge variant="warning" className="flex items-center gap-1 w-fit mt-1">
                                <AlertCircle className="h-3 w-3" />
                                En attente d'approbation
                              </Badge>
                            )}
                            {record.approvalStatus === 'APPROVED' && (
                              <Badge variant="success" className="flex items-center gap-1 w-fit mt-1">
                                <CheckCircle className="h-3 w-3" />
                                Approuvé
                              </Badge>
                            )}
                            {record.approvalStatus === 'REJECTED' && (
                              <Badge variant="danger" className="flex items-center gap-1 w-fit mt-1">
                                <XCircle className="h-3 w-3" />
                                Rejeté
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            {record.hasAnomaly && !record.isCorrected && !record.needsApproval && (
                              <PermissionGate permissions={['attendance.correct']}>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleCorrect(record)}
                                >
                                  <Edit className="h-4 w-4 mr-1" />
                                  Corriger
                                </Button>
                              </PermissionGate>
                            )}
                            {record.needsApproval && record.approvalStatus === 'PENDING_APPROVAL' && (
                              <PermissionGate permissions={['attendance.approve_correction']}>
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
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Correction Modal */}
        <Dialog open={showCorrectionModal} onOpenChange={setShowCorrectionModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Corriger le pointage</DialogTitle>
            </DialogHeader>
            {selectedRecord && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Employé</Label>
                    <div className="text-sm font-medium">
                      {selectedRecord.employee?.firstName} {selectedRecord.employee?.lastName}
                    </div>
                    <div className="text-xs text-text-secondary">
                      {selectedRecord.employee?.matricule}
                    </div>
                  </div>
                  <div>
                    <Label>Type d'anomalie</Label>
                    <div className="mt-1">
                      {getAnomalyTypeBadge(selectedRecord.anomalyType)}
                    </div>
                    {selectedRecord.anomalyNote && (
                      <div className="text-xs text-text-secondary mt-1">
                        {selectedRecord.anomalyNote}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="correctedTimestamp">Date & Heure corrigée</Label>
                  <Input
                    id="correctedTimestamp"
                    type="datetime-local"
                    value={correctedTimestamp}
                    onChange={(e) => setCorrectedTimestamp(e.target.value)}
                    className="mt-1"
                  />
                  <div className="text-xs text-text-secondary mt-1">
                    Date & heure actuelle: {format(new Date(selectedRecord.timestamp), 'dd/MM/yyyy HH:mm:ss', { locale: fr })}
                  </div>
                </div>

                <div>
                  <Label htmlFor="correctionNote">Note de correction *</Label>
                  <Textarea
                    id="correctionNote"
                    value={correctionNote}
                    onChange={(e) => setCorrectionNote(e.target.value)}
                    placeholder="Expliquez la correction apportée..."
                    className="mt-1 min-h-[100px]"
                    required
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowCorrectionModal(false);
                  setSelectedRecord(null);
                  setCorrectionNote('');
                  setCorrectedTimestamp('');
                }}
              >
                Annuler
              </Button>
              <Button
                variant="primary"
                onClick={handleSubmitCorrection}
                disabled={!correctionNote.trim() || correctMutation.isPending}
              >
                {correctMutation.isPending ? 'Correction...' : 'Corriger'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
    </ProtectedRoute>
  );
}
