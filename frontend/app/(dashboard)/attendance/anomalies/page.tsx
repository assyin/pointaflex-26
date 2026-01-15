'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { format, subDays } from 'date-fns';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Edit, BarChart3, List } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useDepartments } from '@/lib/hooks/useDepartments';
import { useSites } from '@/lib/hooks/useSites';
import { useEmployees } from '@/lib/hooks/useEmployees';
import {
  useAnomaliesDashboard,
  useAnomaliesList,
  useHighAnomalyRateEmployees,
  useCorrectAnomaly,
  useBulkCorrectAnomalies,
  useExportAnomalies,
} from '@/lib/hooks/useAnomalies';
import type { AnomalyRecord, AnomaliesFilters } from '@/lib/api/anomalies';
import {
  AnomaliesSummaryCards,
  AnomaliesByTypeChart,
  AnomaliesByDayChart,
  AnomaliesFiltersPanel,
  AnomaliesTable,
  HighAnomalyRateAlert,
  CorrectionModal,
  BulkCorrectionModal,
  type AnomaliesFiltersState,
} from '@/components/attendance/anomalies';
import { CorrectionDetailsModal } from '@/components/attendance/anomalies/CorrectionDetailsModal';

export default function AnomaliesPage() {
  const { user, hasPermission } = useAuth();

  // État des filtres
  const [filters, setFilters] = useState<AnomaliesFiltersState>(() => {
    const today = new Date();
    const sevenDaysAgo = subDays(today, 7);
    return {
      startDate: format(sevenDaysAgo, 'yyyy-MM-dd'),
      endDate: format(today, 'yyyy-MM-dd'),
    };
  });

  // Pagination
  const [page, setPage] = useState(1);
  const limit = 20;

  // Sélection pour correction en masse
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modals
  const [correctionModalOpen, setCorrectionModalOpen] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedAnomaly, setSelectedAnomaly] = useState<AnomalyRecord | null>(null);

  // Tab actif
  const [activeTab, setActiveTab] = useState<'dashboard' | 'list'>('dashboard');

  // Données
  const { data: departments } = useDepartments();
  const { data: sitesData } = useSites();
  const { data: employeesData } = useEmployees();

  const sites = useMemo(() => sitesData?.data || sitesData || [], [sitesData]);
  const employees = useMemo(() => employeesData?.data || employeesData || [], [employeesData]);

  // API calls
  const {
    data: dashboardData,
    isLoading: isDashboardLoading,
    refetch: refetchDashboard,
  } = useAnomaliesDashboard(filters.startDate, filters.endDate);

  const listFilters: AnomaliesFilters = useMemo(
    () => ({
      startDate: filters.startDate,
      endDate: filters.endDate,
      employeeId: filters.employeeId,
      departmentId: filters.departmentId,
      siteId: filters.siteId,
      anomalyType: filters.anomalyType,
      isCorrected: filters.isCorrected,
      page,
      limit,
    }),
    [filters, page, limit]
  );

  const {
    data: listDataRaw,
    isLoading: isListLoading,
    refetch: refetchList,
  } = useAnomaliesList(listFilters);

  // Normalize list data (handle both array and paginated responses)
  const listData = useMemo(() => {
    if (!listDataRaw) return { data: [], meta: undefined };
    if (Array.isArray(listDataRaw)) {
      return { data: listDataRaw, meta: undefined };
    }
    return listDataRaw as { data: AnomalyRecord[]; meta?: any };
  }, [listDataRaw]);

  const { data: highRateEmployees, isLoading: isHighRateLoading } =
    useHighAnomalyRateEmployees(5, 30);

  // Mutations
  const correctMutation = useCorrectAnomaly();
  const bulkCorrectMutation = useBulkCorrectAnomalies();
  const exportMutation = useExportAnomalies();

  // Handlers
  const handleFiltersChange = useCallback((newFilters: AnomaliesFiltersState) => {
    setFilters(newFilters);
    setPage(1);
    setSelectedIds([]);
  }, []);

  const handleRefresh = useCallback(() => {
    refetchDashboard();
    refetchList();
  }, [refetchDashboard, refetchList]);

  const handleExport = useCallback(
    (format: 'csv' | 'excel') => {
      exportMutation.mutate({
        format,
        filters: {
          startDate: filters.startDate,
          endDate: filters.endDate,
          employeeId: filters.employeeId,
          anomalyType: filters.anomalyType,
        },
      });
    },
    [exportMutation, filters]
  );

  const handleCorrect = useCallback((anomaly: AnomalyRecord) => {
    setSelectedAnomaly(anomaly);
    setCorrectionModalOpen(true);
  }, []);

  const handleViewDetails = useCallback((anomaly: AnomalyRecord) => {
    setSelectedAnomaly(anomaly);
    setDetailsModalOpen(true);
  }, []);

  const handleCorrectionSubmit = useCallback(
    (data: { correctionNote: string; correctedTimestamp?: string; reasonCode?: string }) => {
      if (!selectedAnomaly) return;

      correctMutation.mutate(
        {
          id: selectedAnomaly.id,
          payload: {
            correctionNote: data.correctionNote,
            correctedTimestamp: data.correctedTimestamp,
            reasonCode: data.reasonCode as any,
          },
        },
        {
          onSuccess: () => {
            setCorrectionModalOpen(false);
            setSelectedAnomaly(null);
            handleRefresh();
          },
        }
      );
    },
    [selectedAnomaly, correctMutation, handleRefresh]
  );

  const handleBulkCorrect = useCallback(() => {
    setBulkModalOpen(true);
  }, []);

  const handleBulkSubmit = useCallback(
    (data: { generalNote: string; forceApproval: boolean }) => {
      const selectedAnomaliesForBulk = (listData.data || []).filter((a: AnomalyRecord) =>
        selectedIds.includes(a.id)
      );

      bulkCorrectMutation.mutate(
        {
          attendances: selectedAnomaliesForBulk.map((a: AnomalyRecord) => ({
            attendanceId: a.id,
            correctionNote: data.generalNote,
          })),
          generalNote: data.generalNote,
          forceApproval: data.forceApproval,
        },
        {
          onSuccess: () => {
            setBulkModalOpen(false);
            setSelectedIds([]);
            handleRefresh();
          },
        }
      );
    },
    [selectedIds, listData, bulkCorrectMutation, handleRefresh]
  );

  const handleEmployeeClick = useCallback(
    (employeeId: string) => {
      setFilters((prev) => ({ ...prev, employeeId }));
      setActiveTab('list');
    },
    []
  );

  // Anomalies sélectionnées pour le modal bulk
  const selectedAnomalies = useMemo(
    () => (listData.data || []).filter((a: AnomalyRecord) => selectedIds.includes(a.id)),
    [listData.data, selectedIds]
  );

  return (
    <ProtectedRoute>
      <PermissionGate
        permissions={['attendance.view_all', 'attendance.view_anomalies', 'attendance.view_team']}
        requireAll={false}
      >
        <DashboardLayout
          title="Gestion des Anomalies"
          subtitle="Suivez et corrigez les anomalies de pointage"
        >
          <div className="space-y-6">
            {/* Alerte employés à risque */}
            <HighAnomalyRateAlert
              employees={highRateEmployees || []}
              isLoading={isHighRateLoading}
              onEmployeeClick={handleEmployeeClick}
            />

            {/* Filtres */}
            <AnomaliesFiltersPanel
              filters={filters}
              onFiltersChange={handleFiltersChange}
              onRefresh={handleRefresh}
              onExport={handleExport}
              isExporting={exportMutation.isPending}
              departments={departments || []}
              sites={sites}
              employees={employees}
            />

            {/* Tabs Dashboard / Liste */}
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as 'dashboard' | 'list')}
            >
              <div className="flex items-center justify-between">
                <TabsList>
                  <TabsTrigger value="dashboard" className="gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Dashboard
                  </TabsTrigger>
                  <TabsTrigger value="list" className="gap-2">
                    <List className="h-4 w-4" />
                    Liste détaillée
                  </TabsTrigger>
                </TabsList>

                {/* Bouton correction en masse */}
                {activeTab === 'list' && selectedIds.length > 0 && (
                  <Button onClick={handleBulkCorrect} className="gap-2">
                    <Edit className="h-4 w-4" />
                    Corriger {selectedIds.length} anomalie
                    {selectedIds.length > 1 ? 's' : ''}
                  </Button>
                )}
              </div>

              {/* Tab Dashboard */}
              <TabsContent value="dashboard" className="space-y-6">
                {/* KPI Cards */}
                <AnomaliesSummaryCards
                  summary={dashboardData?.summary}
                  isLoading={isDashboardLoading}
                />

                {/* Graphiques */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <AnomaliesByTypeChart
                    data={dashboardData?.byType}
                    isLoading={isDashboardLoading}
                  />
                  <AnomaliesByDayChart
                    data={dashboardData?.byDay}
                    isLoading={isDashboardLoading}
                  />
                </div>

                {/* Top employés avec anomalies */}
                {dashboardData?.byEmployee && dashboardData.byEmployee.length > 0 && (
                  <div className="bg-white rounded-lg border p-4">
                    <h3 className="font-medium mb-4">Top 10 - Employés avec anomalies</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                      {dashboardData.byEmployee.map((emp, index) => (
                        <div
                          key={emp.employeeId}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded-md cursor-pointer hover:bg-gray-100"
                          onClick={() => handleEmployeeClick(emp.employeeId)}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-400">
                              #{index + 1}
                            </span>
                            <div className="truncate">
                              <p className="text-sm font-medium truncate">
                                {emp.employeeName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {emp.matricule}
                              </p>
                            </div>
                          </div>
                          <span className="text-sm font-bold text-orange-500">
                            {emp.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Tab Liste */}
              <TabsContent value="list">
                <AnomaliesTable
                  data={listData?.data}
                  isLoading={isListLoading}
                  selectedIds={selectedIds}
                  onSelectionChange={setSelectedIds}
                  onCorrect={handleCorrect}
                  onViewDetails={handleViewDetails}
                  pagination={listData?.meta}
                  onPageChange={setPage}
                />
              </TabsContent>
            </Tabs>

            {/* Modal correction unitaire */}
            <CorrectionModal
              isOpen={correctionModalOpen}
              onClose={() => {
                setCorrectionModalOpen(false);
                setSelectedAnomaly(null);
              }}
              anomaly={selectedAnomaly}
              onSubmit={handleCorrectionSubmit}
              isLoading={correctMutation.isPending}
            />

            {/* Modal correction en masse */}
            <BulkCorrectionModal
              isOpen={bulkModalOpen}
              onClose={() => setBulkModalOpen(false)}
              anomalies={selectedAnomalies}
              onSubmit={handleBulkSubmit}
              isLoading={bulkCorrectMutation.isPending}
            />

            {/* Modal détails de correction */}
            <CorrectionDetailsModal
              isOpen={detailsModalOpen}
              onClose={() => {
                setDetailsModalOpen(false);
                setSelectedAnomaly(null);
              }}
              anomaly={selectedAnomaly}
            />
          </div>
        </DashboardLayout>
      </PermissionGate>
    </ProtectedRoute>
  );
}
