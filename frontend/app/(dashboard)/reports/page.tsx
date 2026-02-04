'use client';

import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { ReportComparisonView } from '@/components/reports/ReportComparisonView';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import {
  FileText,
  Download,
  Calendar,
  Clock,
  TrendingUp,
  Users,
  FileSpreadsheet,
  FileBarChart,
  Filter,
  ChevronDown,
  ChevronUp,
  X,
  Search,
  Table,
  RefreshCw,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import {
  useAttendanceReport,
  useOvertimeReport,
  useSupplementaryDaysReport,
  usePayrollReport,
  useAbsencesReport,
  useRecoveryDaysReport,
  useExportReport,
  useReportHistory,
} from '@/lib/hooks/useReports';
import { useEmployees } from '@/lib/hooks/useEmployees';
import { useSites } from '@/lib/hooks/useSites';
import { useDepartments } from '@/lib/hooks/useDepartments';
import { useTeams } from '@/lib/hooks/useTeams';
import type { ReportFilters } from '@/lib/api/reports';
import { ReportExportModal, type ExportConfig } from '@/components/reports/ReportExportModal';
import { ReportFiltersPanel } from '@/components/reports/ReportFiltersPanel';

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState<string>('attendance');
  // Par défaut, afficher HIER (J-1)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const [startDate, setStartDate] = useState(
    format(yesterday, 'yyyy-MM-dd')
  );
  const [endDate, setEndDate] = useState(format(yesterday, 'yyyy-MM-dd'));

  // Previous period for comparison
  const [previousStartDate, setPreviousStartDate] = useState<string>('');
  const [previousEndDate, setPreviousEndDate] = useState<string>('');
  const [showComparison, setShowComparison] = useState(false);

  // Export modal states
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel' | 'csv'>('pdf');
  const [exportProgress, setExportProgress] = useState(0);

  // Advanced filters
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [selectedSite, setSelectedSite] = useState<string>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedTeam, setSelectedTeam] = useState<string>('all');

  // Sub-tab for absences report (retards, absences, early leaves)
  const [absencesSubTab, setAbsencesSubTab] = useState<'all' | 'retards' | 'absences' | 'earlyLeaves'>('all');

  // Fetch data for filters
  const { data: employeesData } = useEmployees();
  const { data: sitesData } = useSites();
  const { data: departmentsData } = useDepartments();
  const { data: teamsData } = useTeams();

  // Build filters object for API
  const apiFilters: ReportFilters = useMemo(() => {
    const filters: ReportFilters = {
      startDate,
      endDate,
    };
    if (selectedEmployee !== 'all') filters.employeeId = selectedEmployee;
    if (selectedSite !== 'all') filters.siteId = selectedSite;
    if (selectedDepartment !== 'all') filters.departmentId = selectedDepartment;
    if (selectedTeam !== 'all') filters.teamId = selectedTeam;
    return filters;
  }, [startDate, endDate, selectedEmployee, selectedSite, selectedDepartment, selectedTeam]);

  // Build previous period filters for comparison
  const previousApiFilters: ReportFilters = useMemo(() => {
    if (!previousStartDate || !previousEndDate) return {} as ReportFilters;
    const filters: ReportFilters = {
      startDate: previousStartDate,
      endDate: previousEndDate,
    };
    if (selectedEmployee !== 'all') filters.employeeId = selectedEmployee;
    if (selectedSite !== 'all') filters.siteId = selectedSite;
    if (selectedDepartment !== 'all') filters.departmentId = selectedDepartment;
    if (selectedTeam !== 'all') filters.teamId = selectedTeam;
    return filters;
  }, [previousStartDate, previousEndDate, selectedEmployee, selectedSite, selectedDepartment, selectedTeam]);

  // Fetch reports based on selection
  const { data: attendanceData, isLoading: attendanceLoading } = useAttendanceReport(apiFilters);
  const { data: overtimeData, isLoading: overtimeLoading } = useOvertimeReport(apiFilters);
  const { data: supplementaryDaysData, isLoading: supplementaryDaysLoading } = useSupplementaryDaysReport(apiFilters);
  const { data: payrollData, isLoading: payrollLoading } = usePayrollReport(apiFilters);
  const { data: absencesData, isLoading: absencesLoading } = useAbsencesReport(apiFilters);
  const { data: recoveryData, isLoading: recoveryLoading } = useRecoveryDaysReport(apiFilters);

  // Fetch previous period data for comparison
  const { data: previousAttendanceData } = useAttendanceReport(previousApiFilters);
  const { data: previousOvertimeData } = useOvertimeReport(previousApiFilters);
  const { data: previousPayrollData } = usePayrollReport(previousApiFilters);
  const { data: previousAbsencesData } = useAbsencesReport(previousApiFilters);

  const { data: historyData } = useReportHistory();
  const exportMutation = useExportReport();

  const reportTypes = [
    {
      id: 'attendance',
      name: 'Feuille de présence',
      description: 'Rapport détaillé des présences et absences',
      icon: Calendar,
      color: 'text-blue-600',
    },
    {
      id: 'overtime',
      name: 'Heures supplémentaires',
      description: 'Récapitulatif des heures sup et récupérations',
      icon: Clock,
      color: 'text-purple-600',
    },
    {
      id: 'supplementaryDays',
      name: 'Jours supplémentaires',
      description: 'Travail weekend et jours fériés',
      icon: Calendar,
      color: 'text-indigo-600',
    },
    {
      id: 'recovery',
      name: 'Jours de récupération',
      description: 'Suivi des jours de récupération (conversion HS)',
      icon: RefreshCw,
      color: 'text-teal-600',
    },
    {
      id: 'absences',
      name: 'Retards & Absences',
      description: 'Synthèse des retards et absences injustifiées',
      icon: TrendingUp,
      color: 'text-orange-600',
    },
    {
      id: 'payroll',
      name: 'Export paie',
      description: 'Données formatées pour import paie',
      icon: FileSpreadsheet,
      color: 'text-green-600',
    },
  ];

  const handleExport = (format: 'pdf' | 'excel' | 'csv') => {
    setExportFormat(format);
    setShowExportModal(true);
  };

  const handleExportConfirm = (config: ExportConfig) => {
    setExportProgress(0);
    exportMutation.mutate({
      reportType: selectedReport,
      filters: {
        ...apiFilters,
        format: config.format,
        columns: config.columns.join(','),
        template: config.template,
        includeSummary: config.includeSummary,
        includeCharts: config.includeCharts,
      },
      onProgress: (progress: number) => {
        setExportProgress(progress);
      },
    });
    setShowExportModal(false);
  };

  // Définir les colonnes disponibles selon le type de rapport
  const getAvailableColumns = () => {
    switch (selectedReport) {
      case 'attendance':
        return [
          { id: 'employee', label: 'Employé', default: true },
          { id: 'date', label: 'Date', default: true },
          { id: 'time', label: 'Heure', default: true },
          { id: 'type', label: 'Type', default: true },
          { id: 'site', label: 'Site', default: true },
          { id: 'department', label: 'Département', default: false },
          { id: 'status', label: 'Statut', default: true },
          { id: 'anomaly', label: 'Anomalie', default: false },
        ];
      case 'overtime':
        return [
          { id: 'employee', label: 'Employé', default: true },
          { id: 'date', label: 'Date', default: true },
          { id: 'hours', label: 'Heures', default: true },
          { id: 'type', label: 'Type', default: true },
          { id: 'status', label: 'Statut', default: true },
          { id: 'department', label: 'Département', default: false },
          { id: 'site', label: 'Site', default: false },
        ];
      case 'absences':
        return [
          { id: 'employee', label: 'Employé', default: true },
          { id: 'date', label: 'Date', default: true },
          { id: 'type', label: 'Type', default: true },
          { id: 'department', label: 'Département', default: false },
          { id: 'site', label: 'Site', default: false },
        ];
      case 'payroll':
        return [
          { id: 'employee', label: 'Employé', default: true },
          { id: 'matricule', label: 'Matricule', default: true },
          { id: 'workedDays', label: 'Jours travaillés', default: true },
          { id: 'normalHours', label: 'Heures normales', default: true },
          { id: 'overtimeHours', label: 'Heures sup', default: true },
          { id: 'leaveDays', label: 'Jours de congé', default: true },
          { id: 'department', label: 'Département', default: false },
          { id: 'site', label: 'Site', default: false },
        ];
      case 'recovery':
        return [
          { id: 'employee', label: 'Employé', default: true },
          { id: 'matricule', label: 'Matricule', default: true },
          { id: 'startDate', label: 'Date début', default: true },
          { id: 'endDate', label: 'Date fin', default: true },
          { id: 'days', label: 'Jours', default: true },
          { id: 'status', label: 'Statut', default: true },
          { id: 'notes', label: 'Notes', default: false },
          { id: 'department', label: 'Département', default: false },
        ];
      case 'supplementaryDays':
        return [
          { id: 'employee', label: 'Employé', default: true },
          { id: 'date', label: 'Date', default: true },
          { id: 'hours', label: 'Heures', default: true },
          { id: 'type', label: 'Type', default: true },
          { id: 'status', label: 'Statut', default: true },
          { id: 'department', label: 'Département', default: false },
          { id: 'site', label: 'Site', default: false },
        ];
      default:
        return [];
    }
  };

  const getCurrentReportData = () => {
    switch (selectedReport) {
      case 'attendance':
        return { data: attendanceData, loading: attendanceLoading };
      case 'overtime':
        return { data: overtimeData, loading: overtimeLoading };
      case 'supplementaryDays':
        return { data: supplementaryDaysData, loading: supplementaryDaysLoading };
      case 'recovery':
        return { data: recoveryData, loading: recoveryLoading };
      case 'payroll':
        return { data: payrollData, loading: payrollLoading };
      case 'absences':
        return { data: absencesData, loading: absencesLoading };
      default:
        return { data: null, loading: false };
    }
  };

  const getPreviousReportData = () => {
    switch (selectedReport) {
      case 'attendance':
        return previousAttendanceData;
      case 'overtime':
        return previousOvertimeData;
      case 'payroll':
        return previousPayrollData;
      case 'absences':
        return previousAbsencesData;
      default:
        return null;
    }
  };

  const { data: currentData, loading: currentLoading } = getCurrentReportData();
  const previousData = getPreviousReportData();

  // Helper to get absences report data based on sub-tab
  const getAbsencesDisplayData = useMemo(() => {
    if (selectedReport !== 'absences' || !currentData?.data) return [];

    const { anomalies = [], absences = [] } = currentData.data;

    // Filter anomalies by type
    const retards = anomalies.filter((a: any) =>
      a.anomalyType?.includes('LATE') || a.type?.includes('LATE')
    );
    const earlyLeaves = anomalies.filter((a: any) =>
      a.anomalyType?.includes('EARLY_LEAVE') || a.type?.includes('EARLY_LEAVE')
    );

    switch (absencesSubTab) {
      case 'retards':
        return retards;
      case 'absences':
        return absences;
      case 'earlyLeaves':
        return earlyLeaves;
      case 'all':
      default:
        // Combine all data with type indicator
        return [
          ...retards.map((item: any) => ({ ...item, _category: 'RETARD' })),
          ...absences.map((item: any) => ({ ...item, _category: 'ABSENCE' })),
          ...earlyLeaves.map((item: any) => ({ ...item, _category: 'EARLY_LEAVE' })),
        ].sort((a, b) => {
          const dateA = a.timestamp || a.date;
          const dateB = b.timestamp || b.date;
          return new Date(dateB).getTime() - new Date(dateA).getTime();
        });
    }
  }, [selectedReport, currentData, absencesSubTab]);

  // Count for absences report
  const getAbsencesDataCount = useMemo(() => {
    if (selectedReport !== 'absences' || !currentData?.data) return 0;
    return getAbsencesDisplayData.length;
  }, [selectedReport, currentData, getAbsencesDisplayData]);

  const resetFilters = () => {
    setSelectedEmployee('all');
    setSelectedSite('all');
    setSelectedDepartment('all');
    setSelectedTeam('all');
    // Réinitialiser à HIER (J-1) par défaut
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    setStartDate(format(yesterdayDate, 'yyyy-MM-dd'));
    setEndDate(format(yesterdayDate, 'yyyy-MM-dd'));
  };

  const hasActiveFilters = selectedEmployee !== 'all' || selectedSite !== 'all' ||
    selectedDepartment !== 'all' || selectedTeam !== 'all';

  // Extract arrays from API responses
  const employees = useMemo(() => {
    if (!employeesData) return [];
    if (Array.isArray(employeesData)) return employeesData;
    if (employeesData?.data && Array.isArray(employeesData.data)) return employeesData.data;
    return [];
  }, [employeesData]);

  const sites = useMemo(() => {
    if (!sitesData) return [];
    if (Array.isArray(sitesData)) return sitesData;
    if (sitesData?.data && Array.isArray(sitesData.data)) return sitesData.data;
    return [];
  }, [sitesData]);

  const departments = useMemo(() => {
    if (!departmentsData) return [];
    return Array.isArray(departmentsData) ? departmentsData : [];
  }, [departmentsData]);

  const teams = useMemo(() => {
    if (!teamsData) return [];
    if (Array.isArray(teamsData)) return teamsData;
    if (teamsData?.data && Array.isArray(teamsData.data)) return teamsData.data;
    return [];
  }, [teamsData]);

  // Use all employees for SearchableSelect (it handles filtering internally)
  const filteredEmployees = useMemo(() => {
    return employees;
  }, [employees]);

  return (
    <ProtectedRoute permissions={['reports.view_all', 'reports.view_attendance', 'reports.view_leaves', 'reports.view_overtime']}>
      <DashboardLayout
        title="Rapports & Exports"
        subtitle="Générer et exporter des rapports RH"
      >
        <div className="space-y-6">
          {/* Period Selection and Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="space-y-4">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="start-date" className="text-sm font-medium text-text-secondary">Du:</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-40"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Label htmlFor="end-date" className="text-sm font-medium text-text-secondary">Au:</Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-40"
                    />
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

                  <div className="flex-1" />

                  <div className="flex gap-2 items-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowComparison(!showComparison)}
                      disabled={!currentData}
                    >
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Comparer
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExport('pdf')}
                      disabled={exportMutation.isPending || !currentData}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      PDF
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExport('excel')}
                      disabled={exportMutation.isPending || !currentData}
                    >
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Excel
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExport('csv')}
                      disabled={exportMutation.isPending || !currentData}
                    >
                      <FileBarChart className="h-4 w-4 mr-2" />
                      CSV
                    </Button>
                    {exportMutation.isPending && exportProgress > 0 && (
                      <div className="flex items-center gap-2 ml-2">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all duration-300"
                            style={{ width: `${exportProgress}%` }}
                          />
                        </div>
                        <span className="text-xs text-text-secondary whitespace-nowrap">{exportProgress}%</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Advanced Filters Panel */}
                {showAdvancedFilters && (
                  <ReportFiltersPanel
                    startDate={startDate}
                    endDate={endDate}
                    selectedEmployee={selectedEmployee}
                    selectedSite={selectedSite}
                    selectedDepartment={selectedDepartment}
                    selectedTeam={selectedTeam}
                    onStartDateChange={setStartDate}
                    onEndDateChange={setEndDate}
                    onEmployeeChange={setSelectedEmployee}
                    onSiteChange={setSelectedSite}
                    onDepartmentChange={setSelectedDepartment}
                    onTeamChange={setSelectedTeam}
                    onReset={resetFilters}
                    employees={employees}
                    sites={sites}
                    departments={departments}
                    teams={teams}
                    filteredEmployees={filteredEmployees}
                  />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Report Types */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reportTypes.map((report) => {
              const Icon = report.icon;
              const isSelected = selectedReport === report.id;

              return (
                <Card
                  key={report.id}
                  className={`cursor-pointer transition-all hover:shadow-lg ${
                    isSelected ? 'ring-2 ring-primary bg-primary/5' : ''
                  }`}
                  onClick={() => setSelectedReport(report.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-3 rounded-lg bg-gray-100 ${report.color}`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-text-primary mb-1">
                          {report.name}
                        </h3>
                        <p className="text-xs text-text-secondary">
                          {report.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Comparison View */}
          {showComparison && (
            <Card>
              <CardHeader>
                <CardTitle>Configuration de la Comparaison</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="previous-start-date">Date de début (période précédente)</Label>
                    <Input
                      id="previous-start-date"
                      type="date"
                      value={previousStartDate}
                      onChange={(e) => setPreviousStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="previous-end-date">Date de fin (période précédente)</Label>
                    <Input
                      id="previous-end-date"
                      type="date"
                      value={previousEndDate}
                      onChange={(e) => setPreviousEndDate(e.target.value)}
                    />
                  </div>
                </div>
                {previousStartDate && previousEndDate && previousData && currentData && (
                  <div className="mt-4">
                    <ReportComparisonView
                      currentPeriod={{ startDate, endDate }}
                      previousPeriod={{ startDate: previousStartDate, endDate: previousEndDate }}
                      currentData={currentData}
                      previousData={previousData}
                      reportType={selectedReport}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Report Preview */}
          <Card>
            <CardHeader>
              <CardTitle>
                Aperçu du rapport -{' '}
                {reportTypes.find((r) => r.id === selectedReport)?.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {currentLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Clock className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-3 text-text-secondary">Chargement...</span>
                </div>
              ) : currentData !== undefined && currentData !== null ? (
                <div className="space-y-4">
                  {/* Stats Summary - Dynamic based on report type */}
                  {selectedReport === 'attendance' && currentData.summary && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-600 font-medium">Total pointages</p>
                        <p className="text-2xl font-bold text-blue-700">
                          {currentData.summary.total || 0}
                        </p>
                      </div>
                      <div className="p-4 bg-red-50 rounded-lg">
                        <p className="text-sm text-red-600 font-medium">Anomalies</p>
                        <p className="text-2xl font-bold text-red-700">
                          {currentData.summary.anomalies || 0}
                        </p>
                      </div>
                      <div className="p-4 bg-green-50 rounded-lg">
                        <p className="text-sm text-green-600 font-medium">Période</p>
                        <p className="text-sm font-bold text-green-700">
                          {format(new Date(currentData.summary.period?.startDate || startDate), 'dd MMM', { locale: fr })} - {format(new Date(currentData.summary.period?.endDate || endDate), 'dd MMM yyyy', { locale: fr })}
                        </p>
                      </div>
                      <div className="p-4 bg-purple-50 rounded-lg">
                        <p className="text-sm text-purple-600 font-medium">Employés</p>
                        <p className="text-2xl font-bold text-purple-700">
                          {new Set(currentData.data?.map((d: any) => d.employeeId)).size || 0}
                        </p>
                      </div>
                    </div>
                  )}

                  {selectedReport === 'overtime' && currentData.summary && (
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-600 font-medium">Total demandes</p>
                        <p className="text-2xl font-bold text-blue-700">
                          {currentData.summary.total || 0}
                        </p>
                      </div>
                      <div className="p-4 bg-green-50 rounded-lg">
                        <p className="text-sm text-green-600 font-medium">Heures approuvées</p>
                        <p className="text-2xl font-bold text-green-700">
                          {currentData.summary.totalApprovedHours?.toFixed(1) || currentData.summary.totalHours?.toFixed(1) || 0}h
                        </p>
                      </div>
                      <div className="p-4 bg-purple-50 rounded-lg">
                        <p className="text-sm text-purple-600 font-medium">Heures récupérées</p>
                        <p className="text-2xl font-bold text-purple-700">
                          {currentData.summary.recoveredHours?.toFixed(1) ||
                           (currentData.data?.filter((r: any) => r.status === 'RECOVERED')
                             .reduce((sum: number, r: any) => sum + (parseFloat(r.approvedHours || r.hours) || 0), 0))?.toFixed(1) || 0}h
                        </p>
                      </div>
                      <div className="p-4 bg-yellow-50 rounded-lg">
                        <p className="text-sm text-yellow-600 font-medium">En attente</p>
                        <p className="text-2xl font-bold text-yellow-700">
                          {currentData.summary.byStatus?.PENDING ||
                           currentData.data?.filter((r: any) => r.status === 'PENDING').length || 0}
                        </p>
                      </div>
                      <div className="p-4 bg-orange-50 rounded-lg">
                        <p className="text-sm text-orange-600 font-medium">Période</p>
                        <p className="text-sm font-bold text-orange-700">
                          {format(new Date(currentData.summary.period?.startDate || startDate), 'dd MMM', { locale: fr })} - {format(new Date(currentData.summary.period?.endDate || endDate), 'dd MMM yyyy', { locale: fr })}
                        </p>
                      </div>
                    </div>
                  )}

                  {selectedReport === 'supplementaryDays' && currentData.summary && (
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                      <div className="p-4 bg-indigo-50 rounded-lg">
                        <p className="text-sm text-indigo-600 font-medium">Total jours supp.</p>
                        <p className="text-2xl font-bold text-indigo-700">
                          {currentData.summary.total || 0}
                        </p>
                      </div>
                      <div className="p-4 bg-green-50 rounded-lg">
                        <p className="text-sm text-green-600 font-medium">Jours approuvés</p>
                        <p className="text-2xl font-bold text-green-700">
                          {currentData.summary.byStatus?.APPROVED || 0}
                        </p>
                        <p className="text-xs text-green-600">
                          ({currentData.summary.totalApprovedHours?.toFixed(1) || 0}h)
                        </p>
                      </div>
                      <div className="p-4 bg-purple-50 rounded-lg">
                        <p className="text-sm text-purple-600 font-medium">Jours récupérés</p>
                        <p className="text-2xl font-bold text-purple-700">
                          {currentData.summary.byStatus?.RECOVERED || 0}
                        </p>
                        <p className="text-xs text-purple-600">
                          ({currentData.summary.recoveredHours?.toFixed(1) || 0}h)
                        </p>
                      </div>
                      <div className="p-4 bg-yellow-50 rounded-lg">
                        <p className="text-sm text-yellow-600 font-medium">En attente</p>
                        <p className="text-2xl font-bold text-yellow-700">
                          {currentData.summary.byStatus?.PENDING || 0}
                        </p>
                      </div>
                      <div className="p-4 bg-orange-50 rounded-lg">
                        <p className="text-sm text-orange-600 font-medium">Par type</p>
                        <p className="text-xs font-medium text-orange-700">
                          Sam: {currentData.summary.byType?.WEEKEND_SATURDAY || 0} |
                          Dim: {currentData.summary.byType?.WEEKEND_SUNDAY || 0} |
                          Férié: {currentData.summary.byType?.HOLIDAY || 0}
                        </p>
                      </div>
                    </div>
                  )}

                  {selectedReport === 'absences' && currentData.summary && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="p-4 bg-red-50 rounded-lg">
                        <p className="text-sm text-red-600 font-medium">Total anomalies</p>
                        <p className="text-2xl font-bold text-red-700">
                          {currentData.summary.totalAnomalies || 0}
                        </p>
                      </div>
                      <div className="p-4 bg-orange-50 rounded-lg">
                        <p className="text-sm text-orange-600 font-medium">Absences</p>
                        <p className="text-2xl font-bold text-orange-700">
                          {currentData.summary.totalAbsences || 0}
                        </p>
                      </div>
                      <div className="p-4 bg-yellow-50 rounded-lg">
                        <p className="text-sm text-yellow-600 font-medium">Retards</p>
                        <p className="text-2xl font-bold text-yellow-700">
                          {currentData.summary.lateCount || 0}
                        </p>
                      </div>
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-600 font-medium">Départs anticipés</p>
                        <p className="text-2xl font-bold text-blue-700">
                          {currentData.summary.earlyLeaveCount || 0}
                        </p>
                      </div>
                    </div>
                  )}

                  {selectedReport === 'payroll' && currentData.summary && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-600 font-medium">Total employés</p>
                        <p className="text-2xl font-bold text-blue-700">
                          {currentData.summary.totalEmployees || 0}
                        </p>
                      </div>
                      <div className="p-4 bg-green-50 rounded-lg">
                        <p className="text-sm text-green-600 font-medium">Jours travaillés</p>
                        <p className="text-2xl font-bold text-green-700">
                          {currentData.summary.totalWorkedDays || 0}
                        </p>
                      </div>
                      <div className="p-4 bg-purple-50 rounded-lg">
                        <p className="text-sm text-purple-600 font-medium">Heures normales</p>
                        <p className="text-2xl font-bold text-purple-700">
                          {currentData.summary.totalNormalHours || 0}h
                        </p>
                      </div>
                      <div className="p-4 bg-orange-50 rounded-lg">
                        <p className="text-sm text-orange-600 font-medium">Heures sup</p>
                        <p className="text-2xl font-bold text-orange-700">
                          {currentData.summary.totalOvertimeHours?.toFixed(1) || 0}h
                        </p>
                      </div>
                    </div>
                  )}

                  {selectedReport === 'recovery' && currentData.summary && (
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                      <div className="p-4 bg-teal-50 rounded-lg">
                        <p className="text-sm text-teal-600 font-medium">Total demandes</p>
                        <p className="text-2xl font-bold text-teal-700">
                          {currentData.summary.total || 0}
                        </p>
                      </div>
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-600 font-medium">Total jours</p>
                        <p className="text-2xl font-bold text-blue-700">
                          {currentData.summary.totalDays?.toFixed(1) || 0}
                        </p>
                      </div>
                      <div className="p-4 bg-yellow-50 rounded-lg">
                        <p className="text-sm text-yellow-600 font-medium">En attente</p>
                        <p className="text-2xl font-bold text-yellow-700">
                          {currentData.summary.pendingCount || 0}
                        </p>
                      </div>
                      <div className="p-4 bg-green-50 rounded-lg">
                        <p className="text-sm text-green-600 font-medium">Approuvés</p>
                        <p className="text-2xl font-bold text-green-700">
                          {currentData.summary.approvedCount || 0}
                        </p>
                      </div>
                      <div className="p-4 bg-purple-50 rounded-lg">
                        <p className="text-sm text-purple-600 font-medium">Utilisés</p>
                        <p className="text-2xl font-bold text-purple-700">
                          {currentData.summary.usedCount || 0}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Charts */}
                  {selectedReport === 'attendance' && currentData.data && currentData.data.length > 0 && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm">Répartition par jour (10 premiers jours)</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={currentData.data.slice(0, 10).map((item: any) => ({
                              date: format(new Date(item.timestamp), 'dd/MM'),
                              anomalies: item.hasAnomaly ? 1 : 0,
                              valides: item.hasAnomaly ? 0 : 1,
                            }))}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="date" />
                              <YAxis />
                              <Tooltip />
                              <Legend />
                              <Bar dataKey="valides" fill="#28A745" name="Valides" />
                              <Bar dataKey="anomalies" fill="#DC3545" name="Anomalies" />
                            </BarChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {selectedReport === 'overtime' && currentData.summary?.byStatus && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm">Répartition par statut</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                              <Pie
                                data={Object.entries(currentData.summary.byStatus).map(([key, value]) => ({
                                  name: key,
                                  value,
                                }))}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                              >
                                {Object.entries(currentData.summary.byStatus).map((_, index) => (
                                  <Cell key={`cell-${index}`} fill={['#0052CC', '#28A745', '#DC3545', '#FFC107', '#6F42C1'][index % 5]} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* Sub-tabs for Absences Report */}
                  {selectedReport === 'absences' && currentData?.data && (
                    <div className="flex gap-2 mb-4">
                      <Button
                        variant={absencesSubTab === 'all' ? 'primary' : 'outline'}
                        size="sm"
                        onClick={() => setAbsencesSubTab('all')}
                      >
                        Tout ({(currentData.data.anomalies?.length || 0) + (currentData.data.absences?.length || 0)})
                      </Button>
                      <Button
                        variant={absencesSubTab === 'retards' ? 'primary' : 'outline'}
                        size="sm"
                        onClick={() => setAbsencesSubTab('retards')}
                        className="bg-yellow-50 border-yellow-300 text-yellow-700 hover:bg-yellow-100"
                      >
                        Retards ({currentData.summary?.lateCount || 0})
                      </Button>
                      <Button
                        variant={absencesSubTab === 'absences' ? 'primary' : 'outline'}
                        size="sm"
                        onClick={() => setAbsencesSubTab('absences')}
                        className="bg-orange-50 border-orange-300 text-orange-700 hover:bg-orange-100"
                      >
                        Absences ({currentData.summary?.totalAbsences || 0})
                      </Button>
                      <Button
                        variant={absencesSubTab === 'earlyLeaves' ? 'primary' : 'outline'}
                        size="sm"
                        onClick={() => setAbsencesSubTab('earlyLeaves')}
                        className="bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100"
                      >
                        Départs anticipés ({currentData.summary?.earlyLeaveCount || 0})
                      </Button>
                    </div>
                  )}

                  {/* Data Table Preview */}
                    <div className="border rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 border-b flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Table className="h-4 w-4 text-text-secondary" />
                        <p className="text-sm font-medium text-text-secondary">
                          Données du rapport (aperçu - {selectedReport === 'absences' ? getAbsencesDataCount : (currentData?.data?.length || 0)} entrée(s))
                        </p>
                      </div>
                      {((selectedReport === 'absences' && getAbsencesDataCount > 10) ||
                        (selectedReport !== 'absences' && currentData?.data && currentData.data.length > 10)) && (
                        <Badge variant="outline">
                          Affichage des 10 premières lignes
                        </Badge>
                      )}
                    </div>
                    <div className="overflow-x-auto">
                      {((selectedReport === 'absences' && getAbsencesDataCount > 0) ||
                        (selectedReport !== 'absences' && currentData?.data && Array.isArray(currentData.data) && currentData.data.length > 0)) ? (
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 border-b">
                            <tr>
                              {selectedReport === 'attendance' && (
                                <>
                                  <th className="px-4 py-2 text-left text-text-secondary font-medium">Employé</th>
                                  <th className="px-4 py-2 text-left text-text-secondary font-medium">Date/Heure</th>
                                  <th className="px-4 py-2 text-left text-text-secondary font-medium">Type</th>
                                  <th className="px-4 py-2 text-left text-text-secondary font-medium">Site</th>
                                  <th className="px-4 py-2 text-left text-text-secondary font-medium">Statut</th>
                                </>
                              )}
                              {selectedReport === 'overtime' && (
                                <>
                                  <th className="px-4 py-2 text-left text-text-secondary font-medium">Employé</th>
                                  <th className="px-4 py-2 text-left text-text-secondary font-medium">Date</th>
                                  <th className="px-4 py-2 text-left text-text-secondary font-medium">Heures</th>
                                  <th className="px-4 py-2 text-left text-text-secondary font-medium">Type</th>
                                  <th className="px-4 py-2 text-left text-text-secondary font-medium">Statut</th>
                                </>
                              )}
                              {selectedReport === 'supplementaryDays' && (
                                <>
                                  <th className="px-4 py-2 text-left text-text-secondary font-medium">Employé</th>
                                  <th className="px-4 py-2 text-left text-text-secondary font-medium">Date</th>
                                  <th className="px-4 py-2 text-left text-text-secondary font-medium">Heures</th>
                                  <th className="px-4 py-2 text-left text-text-secondary font-medium">Type</th>
                                  <th className="px-4 py-2 text-left text-text-secondary font-medium">Statut</th>
                                </>
                              )}
                              {selectedReport === 'absences' && (
                                <>
                                  <th className="px-4 py-2 text-left text-text-secondary font-medium">Employé</th>
                                  <th className="px-4 py-2 text-left text-text-secondary font-medium">Date</th>
                                  <th className="px-4 py-2 text-left text-text-secondary font-medium">Type</th>
                                  <th className="px-4 py-2 text-left text-text-secondary font-medium">Département</th>
                                </>
                              )}
                              {selectedReport === 'payroll' && (
                                <>
                                  <th className="px-4 py-2 text-left text-text-secondary font-medium">Employé</th>
                                  <th className="px-4 py-2 text-left text-text-secondary font-medium">Jours travaillés</th>
                                  <th className="px-4 py-2 text-left text-text-secondary font-medium">Heures normales</th>
                                  <th className="px-4 py-2 text-left text-text-secondary font-medium">Heures sup</th>
                                  <th className="px-4 py-2 text-left text-text-secondary font-medium">Congés</th>
                                </>
                              )}
                              {selectedReport === 'recovery' && (
                                <>
                                  <th className="px-4 py-2 text-left text-text-secondary font-medium">Employé</th>
                                  <th className="px-4 py-2 text-left text-text-secondary font-medium">Période</th>
                                  <th className="px-4 py-2 text-left text-text-secondary font-medium">Jours</th>
                                  <th className="px-4 py-2 text-left text-text-secondary font-medium">Statut</th>
                                  <th className="px-4 py-2 text-left text-text-secondary font-medium">Notes</th>
                                </>
                              )}
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {(selectedReport === 'absences'
                              ? getAbsencesDisplayData.slice(0, 10)
                              : currentData?.data?.slice(0, 10) || []
                            ).map((item: any, index: number) => (
                              <tr key={index} className="hover:bg-gray-50">
                                {selectedReport === 'attendance' && (
                                  <>
                                    <td className="px-4 py-2">
                                      {item.employee?.firstName} {item.employee?.lastName}
                                    </td>
                                    <td className="px-4 py-2">
                                      {format(new Date(item.timestamp), 'dd/MM/yyyy HH:mm', { locale: fr })}
                                    </td>
                                    <td className="px-4 py-2">
                                      <Badge variant={item.type === 'IN' ? 'default' : 'outline'}>
                                        {item.type}
                                      </Badge>
                                    </td>
                                    <td className="px-4 py-2">{item.site?.name || '-'}</td>
                                    <td className="px-4 py-2">
                                      {item.hasAnomaly ? (
                                        <Badge variant="danger">Anomalie</Badge>
                                      ) : (
                                        <Badge variant="success">Valide</Badge>
                                      )}
                                    </td>
                                  </>
                                )}
                                {selectedReport === 'overtime' && (
                                  <>
                                    <td className="px-4 py-2">
                                      {item.employee?.firstName} {item.employee?.lastName}
                                    </td>
                                    <td className="px-4 py-2">
                                      {format(new Date(item.date), 'dd/MM/yyyy', { locale: fr })}
                                    </td>
                                    <td className="px-4 py-2">{item.approvedHours || item.hours}h</td>
                                    <td className="px-4 py-2">
                                      <Badge variant="outline">{item.type}</Badge>
                                    </td>
                                    <td className="px-4 py-2">
                                      <Badge variant={
                                        item.status === 'APPROVED' ? 'success' :
                                        item.status === 'PENDING' ? 'warning' :
                                        item.status === 'RECOVERED' ? 'info' :
                                        item.status === 'PAID' ? 'default' :
                                        'danger'
                                      }>
                                        {item.status === 'APPROVED' ? 'Approuvé' :
                                         item.status === 'PENDING' ? 'En attente' :
                                         item.status === 'RECOVERED' ? 'Récupéré' :
                                         item.status === 'PAID' ? 'Payé' :
                                         item.status === 'REJECTED' ? 'Rejeté' :
                                         item.status}
                                      </Badge>
                                    </td>
                                  </>
                                )}
                                {selectedReport === 'supplementaryDays' && (
                                  <>
                                    <td className="px-4 py-2">
                                      {item.employee?.firstName} {item.employee?.lastName}
                                    </td>
                                    <td className="px-4 py-2">
                                      {format(new Date(item.date), 'dd/MM/yyyy', { locale: fr })}
                                    </td>
                                    <td className="px-4 py-2">{item.approvedHours || item.hours}h</td>
                                    <td className="px-4 py-2">
                                      <Badge variant={
                                        item.type === 'WEEKEND_SATURDAY' ? 'outline' :
                                        item.type === 'WEEKEND_SUNDAY' ? 'secondary' :
                                        'default'
                                      }>
                                        {item.type === 'WEEKEND_SATURDAY' ? 'Samedi' :
                                         item.type === 'WEEKEND_SUNDAY' ? 'Dimanche' :
                                         item.type === 'HOLIDAY' ? 'Férié' :
                                         item.type}
                                      </Badge>
                                    </td>
                                    <td className="px-4 py-2">
                                      <Badge variant={
                                        item.status === 'APPROVED' ? 'success' :
                                        item.status === 'PENDING' ? 'warning' :
                                        item.status === 'RECOVERED' ? 'info' :
                                        item.status === 'PAID' ? 'default' :
                                        'danger'
                                      }>
                                        {item.status === 'APPROVED' ? 'Approuvé' :
                                         item.status === 'PENDING' ? 'En attente' :
                                         item.status === 'RECOVERED' ? 'Récupéré' :
                                         item.status === 'PAID' ? 'Payé' :
                                         item.status === 'REJECTED' ? 'Rejeté' :
                                         item.status}
                                      </Badge>
                                    </td>
                                  </>
                                )}
                                {selectedReport === 'absences' && (
                                  <>
                                    <td className="px-4 py-2">
                                      {item.employee?.firstName} {item.employee?.lastName}
                                      <div className="text-xs text-text-secondary">{item.employee?.matricule}</div>
                                    </td>
                                    <td className="px-4 py-2">
                                      {item.timestamp
                                        ? format(new Date(item.timestamp), 'dd/MM/yyyy HH:mm', { locale: fr })
                                        : item.date}
                                    </td>
                                    <td className="px-4 py-2">
                                      <Badge variant={
                                        (item._category === 'RETARD' || item.anomalyType?.includes('LATE')) ? 'warning' :
                                        (item._category === 'ABSENCE' || item.type === 'ABSENCE') ? 'danger' :
                                        (item._category === 'EARLY_LEAVE' || item.anomalyType?.includes('EARLY')) ? 'info' :
                                        'default'
                                      }>
                                        {item._category === 'RETARD' ? 'Retard' :
                                         item._category === 'ABSENCE' ? 'Absence' :
                                         item._category === 'EARLY_LEAVE' ? 'Départ anticipé' :
                                         item.anomalyType || item.type}
                                      </Badge>
                                    </td>
                                    <td className="px-4 py-2">{item.employee?.department?.name || '-'}</td>
                                  </>
                                )}
                                {selectedReport === 'payroll' && (
                                  <>
                                    <td className="px-4 py-2">
                                      {item.employee?.fullName || `${item.employee?.firstName} ${item.employee?.lastName}`}
                                    </td>
                                    <td className="px-4 py-2">{item.workedDays}</td>
                                    <td className="px-4 py-2">{item.normalHours}h</td>
                                    <td className="px-4 py-2">{item.overtimeHours?.toFixed(1) || 0}h</td>
                                    <td className="px-4 py-2">{item.leaveDays}</td>
                                  </>
                                )}
                                {selectedReport === 'recovery' && (
                                  <>
                                    <td className="px-4 py-2">
                                      {item.employee?.firstName} {item.employee?.lastName}
                                      <div className="text-xs text-text-secondary">{item.employee?.matricule}</div>
                                    </td>
                                    <td className="px-4 py-2">
                                      {format(new Date(item.startDate), 'dd/MM/yyyy', { locale: fr })}
                                      {item.endDate !== item.startDate && (
                                        <> - {format(new Date(item.endDate), 'dd/MM/yyyy', { locale: fr })}</>
                                      )}
                                    </td>
                                    <td className="px-4 py-2 font-semibold">{parseFloat(item.days).toFixed(1)}</td>
                                    <td className="px-4 py-2">
                                      <Badge variant={
                                        item.status === 'APPROVED' ? 'success' :
                                        item.status === 'PENDING' ? 'warning' :
                                        item.status === 'USED' ? 'info' :
                                        item.status === 'CANCELLED' ? 'danger' :
                                        'default'
                                      }>
                                        {item.status === 'APPROVED' ? 'Approuvé' :
                                         item.status === 'PENDING' ? 'En attente' :
                                         item.status === 'USED' ? 'Utilisé' :
                                         item.status === 'CANCELLED' ? 'Annulé' :
                                         item.status}
                                      </Badge>
                                    </td>
                                    <td className="px-4 py-2 text-text-secondary text-sm">
                                      {item.notes || '-'}
                                    </td>
                                  </>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <div className="p-8 text-center text-text-secondary">
                          <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
                          <p className="font-medium mb-2">Aucune donnée disponible</p>
                          <p className="text-sm">
                            Aucune donnée trouvée pour la période du {format(new Date(startDate), 'dd MMM yyyy', { locale: fr })} au {format(new Date(endDate), 'dd MMM yyyy', { locale: fr })}.
                          </p>
                          {(selectedEmployee !== 'all' || selectedSite !== 'all' || selectedDepartment !== 'all' || selectedTeam !== 'all') && (
                            <p className="text-sm mt-2">
                              Vérifiez vos filtres ou essayez une autre période.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    {currentData?.data && currentData.data.length > 10 && (
                      <div className="bg-gray-50 px-4 py-2 border-t text-center text-sm text-text-secondary">
                        <p>... et {currentData.data.length - 10} autres entrées. Utilisez l'export pour voir toutes les données.</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-text-secondary">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>Sélectionnez une période pour générer le rapport</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Report History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Historique des rapports générés
              </CardTitle>
            </CardHeader>
            <CardContent>
              {historyData && historyData.length > 0 ? (
                <div className="space-y-2">
                  {historyData.slice(0, 10).map((item: any) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium text-text-primary">{item.name}</p>
                          <p className="text-xs text-text-secondary">
                            {format(new Date(item.createdAt), 'dd MMM yyyy à HH:mm', {
                              locale: fr,
                            })}
                            {item.user && ` • Par ${item.user.firstName} ${item.user.lastName}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="default">{item.format}</Badge>
                        <Badge variant="outline" className="text-xs">
                          {item.reportType}
                        </Badge>
                        {item.fileSize && (
                          <span className="text-xs text-text-secondary">
                            {(item.fileSize / 1024).toFixed(1)} KB
                          </span>
                        )}
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            // Note: Le téléchargement nécessiterait un endpoint pour récupérer le fichier
                            // Pour l'instant, on affiche juste un message
                            alert('Fonctionnalité de téléchargement depuis l\'historique à implémenter avec un endpoint de récupération de fichier');
                          }}
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Télécharger
                        </Button>
                      </div>
                    </div>
                  ))}
                  {historyData.length > 10 && (
                    <div className="text-center pt-2 text-sm text-text-secondary">
                      <p>... et {historyData.length - 10} autres rapports</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-text-secondary">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>Aucun rapport généré récemment</p>
                  <p className="text-xs mt-2 opacity-75">
                    Les rapports exportés seront sauvegardés ici
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Export Modal */}
        <ReportExportModal
          isOpen={showExportModal}
          onClose={() => {
            setShowExportModal(false);
            setExportProgress(0);
          }}
          onExport={handleExportConfirm}
          reportType={selectedReport}
          reportName={reportTypes.find((r) => r.id === selectedReport)?.name || 'Rapport'}
          availableColumns={getAvailableColumns()}
          defaultFormat={exportFormat.toUpperCase() as 'PDF' | 'EXCEL' | 'CSV'}
          isLoading={exportMutation.isPending}
        />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
