'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Search, Download, Printer, Plus, Calendar, AlertTriangle, Clock, Loader2, Upload,
  ChevronLeft, ChevronRight, Filter, X, Users, Building2, Eye, EyeOff, Grid3x3, List
} from 'lucide-react';
import {
  useSchedules,
  useScheduleAlerts,
  useCreateSchedule,
  useDeleteSchedule,
  useBulkDeleteSchedules,
} from '@/lib/hooks/useSchedules';
import { useShifts } from '@/lib/hooks/useShifts';
import { useTeams } from '@/lib/hooks/useTeams';
import { useEmployees } from '@/lib/hooks/useEmployees';
import { useSites } from '@/lib/hooks/useSites';
import { ImportSchedulesModal } from '@/components/schedules/ImportSchedulesModal';
import { formatErrorAlert } from '@/lib/utils/errorMessages';
import { toast } from 'sonner';
import { schedulesApi, type CreateScheduleDto } from '@/lib/api/schedules';

interface GroupedSchedule {
  shiftId: string;
  shiftName: string;
  shiftCode: string;
  shiftType: 'MORNING' | 'AFTERNOON' | 'NIGHT' | 'CUSTOM';
  startTime: string;
  endTime: string;
  color?: string;
  employeeCount: number;
  scheduleCount: number;
  sites: string[]; // Liste des sites uniques des employés
  teams: string[]; // Liste des équipes uniques des employés
  employees: Array<{
    id: string;
    name: string;
    matricule: string;
    department?: string;
    site?: string;
    team?: string;
    schedules: Array<{
      id: string;
      date: string;
      customStartTime?: string;
      customEndTime?: string;
    }>;
  }>;
}

export default function ShiftsPlanningPage() {
  const router = useRouter();
  
  // View state
  const [viewMode, setViewMode] = useState<'grouped' | 'detailed'>('grouped');
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);
  const [selectedDateRange, setSelectedDateRange] = useState<{ start: Date; end: Date }>({
    start: startOfWeek(new Date(), { weekStartsOn: 1 }),
    end: endOfWeek(new Date(), { weekStartsOn: 1 }),
  });

  // Filters
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filterTeam, setFilterTeam] = useState<string>('');
  const [filterSite, setFilterSite] = useState<string>('');
  const [filterShift, setFilterShift] = useState<string>('');
  const [filterDateStart, setFilterDateStart] = useState<string>(format(selectedDateRange.start, 'yyyy-MM-dd'));
  const [filterDateEnd, setFilterDateEnd] = useState<string>(format(selectedDateRange.end, 'yyyy-MM-dd'));
  const [searchQuery, setSearchQuery] = useState('');

  // Selection
  const [selectedSchedules, setSelectedSchedules] = useState<Set<string>>(new Set());
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  // Pagination for detailed view
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Modals
  const [showImportModal, setShowImportModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // API hooks - use direct API call for date range
  const [schedulesData, setSchedulesData] = useState<any[]>([]);
  const [schedulesLoading, setSchedulesLoading] = useState(false);
  const [schedulesError, setSchedulesError] = useState<any>(null);

  useEffect(() => {
    const fetchSchedules = async () => {
      setSchedulesLoading(true);
      setSchedulesError(null);
      try {
        const response = await schedulesApi.getByDateRange(
          filterDateStart,
          filterDateEnd,
          {
            teamId: filterTeam || undefined,
            shiftId: filterShift || undefined,
            siteId: filterSite || undefined,
          }
        );
        // L'API retourne { data: [...], meta: {...} }
        const schedules = Array.isArray(response) ? response : (response?.data || []);
        setSchedulesData(schedules);
      } catch (error: any) {
        console.error('Error fetching schedules:', error);
        setSchedulesError(error);
        setSchedulesData([]);
      } finally {
        setSchedulesLoading(false);
      }
    };
    fetchSchedules();
  }, [filterDateStart, filterDateEnd, filterTeam, filterShift, filterSite]);

  const refetch = () => {
    const fetchSchedules = async () => {
      setSchedulesLoading(true);
      setSchedulesError(null);
      try {
        const response = await schedulesApi.getByDateRange(
          filterDateStart,
          filterDateEnd,
          {
            teamId: filterTeam || undefined,
            shiftId: filterShift || undefined,
            siteId: filterSite || undefined,
          }
        );
        const schedules = Array.isArray(response) ? response : (response?.data || []);
        setSchedulesData(schedules);
      } catch (error: any) {
        console.error('Error refetching schedules:', error);
        setSchedulesError(error);
        setSchedulesData([]);
      } finally {
        setSchedulesLoading(false);
      }
    };
    fetchSchedules();
  };

  const { data: shiftsData, isLoading: shiftsLoading } = useShifts();
  const { data: teamsData } = useTeams();
  const { data: employeesData } = useEmployees();
  const { data: sitesResponse, isLoading: sitesLoading } = useSites();
  
  // Extract sites from response
  const sitesData = sitesResponse?.data || sitesResponse || [];
  const { data: alertsData } = useScheduleAlerts(
    filterDateStart,
    filterDateEnd
  );

  const deleteScheduleMutation = useDeleteSchedule();
  const bulkDeleteMutation = useBulkDeleteSchedules();
  const createScheduleMutation = useCreateSchedule();

  // Update date range when filters change
  useEffect(() => {
    setSelectedDateRange({
      start: parseISO(filterDateStart),
      end: parseISO(filterDateEnd),
    });
  }, [filterDateStart, filterDateEnd]);

  // Group schedules by shift
  const groupedSchedules: GroupedSchedule[] = useMemo(() => {
    console.log('Grouping schedules, data:', schedulesData);
    if (!schedulesData || !Array.isArray(schedulesData) || schedulesData.length === 0) {
      console.log('No schedules data to group');
      return [];
    }

    const shiftMap = new Map<string, GroupedSchedule>();
    const employeeMap = new Map<string, GroupedSchedule['employees'][0]>();

    schedulesData.forEach((schedule: any) => {
      // Apply filters
      if (filterShift && schedule.shiftId !== filterShift) return;
      if (filterSite && schedule.employee?.site?.id !== filterSite) return;
      if (filterTeam && schedule.teamId !== filterTeam) return;

      const shiftId = schedule.shiftId;
      const shift = schedule.shift;

      if (!shift) {
        return;
      }

      if (!shiftMap.has(shiftId)) {
        shiftMap.set(shiftId, {
          shiftId,
          shiftName: shift.name || 'Shift inconnu',
          shiftCode: shift.code || '',
          shiftType: shift.type || 'CUSTOM',
          startTime: shift.startTime || '08:00',
          endTime: shift.endTime || '16:00',
          color: shift.color,
          employeeCount: 0,
          scheduleCount: 0,
          sites: [],
          teams: [],
          employees: [],
        });
      }

      const group = shiftMap.get(shiftId)!;
      group.scheduleCount++;

      const employeeId = schedule.employeeId;
      const employee = schedule.employee;

      if (!employee) return;

      const employeeKey = `${shiftId}-${employeeId}`;
      if (!employeeMap.has(employeeKey)) {
        const emp = {
          id: employeeId,
          name: `${employee.firstName || ''} ${employee.lastName || ''}`.trim(),
          matricule: employee.matricule || '',
          department: employee.department?.name,
          site: employee.site?.name,
          team: schedule.team?.name || employee.team?.name,
          schedules: [],
        };
        employeeMap.set(employeeKey, emp);
        group.employees.push(emp);
        group.employeeCount++;
        
        // Ajouter le site à la liste des sites uniques du groupe
        if (emp.site && !group.sites.includes(emp.site)) {
          group.sites.push(emp.site);
        }
        
        // Ajouter l'équipe à la liste des équipes uniques du groupe
        if (emp.team && !group.teams.includes(emp.team)) {
          group.teams.push(emp.team);
        }
      }

      const emp = employeeMap.get(employeeKey)!;
      emp.schedules.push({
        id: schedule.id,
        date: schedule.date,
        customStartTime: schedule.customStartTime,
        customEndTime: schedule.customEndTime,
      });
    });

    // Apply search filter
    let result = Array.from(shiftMap.values());
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.map(group => ({
        ...group,
        employees: group.employees.filter(emp =>
          emp.name.toLowerCase().includes(query) ||
          emp.matricule.toLowerCase().includes(query) ||
          emp.department?.toLowerCase().includes(query) ||
          emp.site?.toLowerCase().includes(query)
        ),
      })).filter(group => group.employees.length > 0);
    }

    // Sort by shift type and name
    result.sort((a, b) => {
      const typeOrder = { MORNING: 1, AFTERNOON: 2, NIGHT: 3, CUSTOM: 4 };
      const aOrder = typeOrder[a.shiftType] || 99;
      const bOrder = typeOrder[b.shiftType] || 99;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.shiftName.localeCompare(b.shiftName);
    });

    return result;
  }, [schedulesData, filterShift, filterSite, filterTeam, searchQuery]);

  // Get selected shift details
  const selectedShiftDetails = useMemo(() => {
    if (!selectedShiftId) return null;
    return groupedSchedules.find(g => g.shiftId === selectedShiftId) || null;
  }, [selectedShiftId, groupedSchedules]);

  // Paginated employees for detailed view
  const paginatedEmployees = useMemo(() => {
    if (!selectedShiftDetails) return [];
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
    return selectedShiftDetails.employees.slice(startIndex, endIndex);
  }, [selectedShiftDetails, currentPage, itemsPerPage]);

  const totalPages = selectedShiftDetails
    ? Math.ceil(selectedShiftDetails.employees.length / itemsPerPage)
    : 0;

  // Reset to first page when shift changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedShiftId]);

  // Generate date range days - use filter dates directly to ensure sync
  const dateRangeDays = useMemo(() => {
    if (!filterDateStart || !filterDateEnd) return [];
    try {
      const start = parseISO(filterDateStart);
      const end = parseISO(filterDateEnd);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return [];
      return eachDayOfInterval({
        start: startOfDay(start),
        end: endOfDay(end),
      });
    } catch (error) {
      console.error('Error generating date range days:', error);
      return [];
    }
  }, [filterDateStart, filterDateEnd]);

  // Filter alerts
  const filteredAlerts = useMemo(() => {
    if (!alertsData) return [];
    return alertsData.filter((alert) => !dismissedAlerts.has(alert.id));
  }, [alertsData, dismissedAlerts]);

  // Handlers
  const handleSelectShift = (shiftId: string) => {
    setSelectedShiftId(shiftId);
    setViewMode('detailed');
  };

  const handleBackToGrouped = () => {
    setSelectedShiftId(null);
    setViewMode('grouped');
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce planning ?')) {
      await deleteScheduleMutation.mutateAsync(scheduleId);
      refetch();
    }
  };

  const handleBulkDelete = async () => {
    if (selectedSchedules.size === 0) return;
    if (confirm(`Êtes-vous sûr de vouloir supprimer ${selectedSchedules.size} planning(s) ?`)) {
      await bulkDeleteMutation.mutateAsync(Array.from(selectedSchedules));
      setSelectedSchedules(new Set());
      refetch();
    }
  };

  const handleResetFilters = () => {
    setFilterTeam('');
    setFilterSite('');
    setFilterShift('');
    setSearchQuery('');
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
    setFilterDateStart(format(weekStart, 'yyyy-MM-dd'));
    setFilterDateEnd(format(weekEnd, 'yyyy-MM-dd'));
  };

  const getShiftTypeColor = (type: string) => {
    switch (type) {
      case 'MORNING':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'AFTERNOON':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'NIGHT':
        return 'bg-gray-800 text-white border-gray-600';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getShiftTypeLabel = (type: string) => {
    switch (type) {
      case 'MORNING':
        return 'Matin';
      case 'AFTERNOON':
        return 'Après-midi';
      case 'NIGHT':
        return 'Nuit';
      default:
        return 'Personnalisé';
    }
  };

  return (
    <DashboardLayout
      title="Shifts & Planning"
      subtitle="Planification des équipes et gestion des plannings"
    >
      <div className="space-y-6">
        {/* Alert Summary Banner */}
        {filteredAlerts.length > 0 && (
          <Alert className="border-primary bg-primary/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-primary" />
                <div>
                  <AlertDescription className="font-semibold text-text-primary">
                    {filteredAlerts.filter(a => a.type === 'CRITICAL').length} alerte(s) critique(s) et{' '}
                    {filteredAlerts.filter(a => a.type === 'WARNING').length} avertissement(s) détecté(s)
                  </AlertDescription>
                  <AlertDescription className="text-sm text-text-secondary mt-1">
                    Consultez la page dédiée pour plus de détails et la gestion des alertes
                  </AlertDescription>
                </div>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => router.push('/schedule-alerts')}
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Voir les alertes
              </Button>
            </div>
          </Alert>
        )}

        {/* Filters and Actions */}
        <Card>
          <CardHeader>
        <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Filtres et actions</CardTitle>
          <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  {showAdvancedFilters ? 'Masquer' : 'Filtres avancés'}
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setShowCreateModal(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Créer un planning
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowImportModal(true)}
                >
              <Upload className="h-4 w-4 mr-2" />
                  Importer
            </Button>
          </div>
        </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Basic filters */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                  <Label htmlFor="search">Recherche</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-secondary" />
                    <Input
                      id="search"
                      placeholder="Nom, matricule..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
              </div>
                </div>
                <div>
                  <Label htmlFor="dateStart">Date début</Label>
                <Input
                    id="dateStart"
                  type="date"
                    value={filterDateStart}
                    onChange={(e) => setFilterDateStart(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="dateEnd">Date fin</Label>
                  <Input
                    id="dateEnd"
                    type="date"
                    value={filterDateEnd}
                    onChange={(e) => setFilterDateEnd(e.target.value)}
                    min={filterDateStart}
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    onClick={handleResetFilters}
                    className="w-full"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Réinitialiser
                  </Button>
                </div>
              </div>

              {/* Advanced filters */}
              {showAdvancedFilters && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                  <div>
                    <Label htmlFor="filterTeam">Équipe</Label>
                    <select
                      id="filterTeam"
                      value={filterTeam}
                      onChange={(e) => setFilterTeam(e.target.value)}
                      className="w-full border border-border rounded-md px-3 py-2 text-sm"
                    >
                      <option value="">Toutes les équipes</option>
                      {teamsData?.data?.map((team: any) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                      ))}
                    </select>
              </div>
                  <div>
                    <Label htmlFor="filterShift">Shift</Label>
                    <select
                      id="filterShift"
                      value={filterShift}
                      onChange={(e) => setFilterShift(e.target.value)}
                      className="w-full border border-border rounded-md px-3 py-2 text-sm"
                    >
                      <option value="">Tous les shifts</option>
                      {shiftsData?.data?.map((shift: any) => (
                        <option key={shift.id} value={shift.id}>
                          {shift.name} ({shift.code})
                        </option>
                      ))}
                    </select>
                </div>
                  <div>
                    <Label htmlFor="filterSite">Site</Label>
                    <select
                      id="filterSite"
                      value={filterSite}
                      onChange={(e) => setFilterSite(e.target.value)}
                      className="w-full border border-border rounded-md px-3 py-2 text-sm"
                      disabled={sitesLoading}
                    >
                      <option value="">Tous les sites</option>
                      {sitesData.map((site: any) => (
                        <option key={site.id} value={site.id}>
                          {site.name} {site.code ? `(${site.code})` : ''}
                        </option>
                      ))}
                    </select>
              </div>
                </div>
              )}

              {/* Bulk actions */}
              {selectedSchedules.size > 0 && (
                <div className="flex items-center justify-between p-3 bg-primary/10 rounded-md border border-primary/20">
                  <span className="text-sm font-medium text-primary">
                    {selectedSchedules.size} planning(s) sélectionné(s)
                  </span>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleBulkDelete}
                    disabled={bulkDeleteMutation.isPending}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Supprimer sélection
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        {schedulesLoading ? (
            <Card>
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </CardContent>
          </Card>
        ) : schedulesError ? (
          <Alert variant="danger">
            <AlertTriangle className="h-5 w-5" />
            <AlertDescription>
              <p className="font-semibold">{formatErrorAlert(schedulesError).title}</p>
              <p className="text-sm mt-1">{formatErrorAlert(schedulesError).description}</p>
              {process.env.NODE_ENV === 'development' && (
                <pre className="text-xs mt-2 overflow-auto">
                  {JSON.stringify(schedulesError, null, 2)}
                </pre>
              )}
            </AlertDescription>
          </Alert>
        ) : viewMode === 'grouped' ? (
          /* Grouped View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groupedSchedules.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Calendar className="h-12 w-12 text-text-secondary mb-4" />
                  <p className="text-text-primary font-medium mb-2">
                    Aucun planning trouvé
                  </p>
                  <p className="text-sm text-text-secondary text-center mb-4">
                    {schedulesData.length === 0
                      ? `Aucun planning n'a été créé pour la période du ${format(parseISO(filterDateStart), 'dd/MM/yyyy', { locale: fr })} au ${format(parseISO(filterDateEnd), 'dd/MM/yyyy', { locale: fr })}.`
                      : 'Aucun planning ne correspond aux filtres sélectionnés.'}
                  </p>
                  {process.env.NODE_ENV === 'development' && (
                    <div className="text-xs text-text-secondary mb-4 p-3 bg-gray-50 rounded">
                      <p>Données reçues: {schedulesData.length} planning(s)</p>
                      <p>Période: {filterDateStart} à {filterDateEnd}</p>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={handleResetFilters}
                    >
                      Réinitialiser les filtres
                    </Button>
                    <Button
                      variant="primary"
                      onClick={() => setShowCreateModal(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Créer un planning
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              groupedSchedules.map((group) => (
                <Card
                  key={group.shiftId}
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => handleSelectShift(group.shiftId)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-1">{group.shiftName}</CardTitle>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={getShiftTypeColor(group.shiftType)}>
                            {getShiftTypeLabel(group.shiftType)}
                          </Badge>
                          {group.shiftCode && (
                            <Badge variant="default">{group.shiftCode}</Badge>
                          )}
                  </div>
                    </div>
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold"
                        style={{
                          backgroundColor: group.color || '#3B82F6',
                        }}
                      >
                        <Clock className="h-6 w-6" />
                    </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-text-secondary">Horaires</span>
                        <span className="font-medium">
                          {group.startTime} - {group.endTime}
                        </span>
                    </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-text-secondary flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          Employés
                        </span>
                        <span className="font-medium">{group.employeeCount}</span>
                    </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-text-secondary flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Plannings
                        </span>
                        <span className="font-medium">{group.scheduleCount}</span>
                    </div>
                      {group.sites.length > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-text-secondary flex items-center gap-1">
                            <Building2 className="h-4 w-4" />
                            Site{group.sites.length > 1 ? 's' : ''}
                          </span>
                          <span className="font-medium text-right max-w-[60%]">
                            {group.sites.join(', ')}
                          </span>
                        </div>
                      )}
                      {group.teams.length > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-text-secondary flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            Équipe{group.teams.length > 1 ? 's' : ''}
                          </span>
                          <span className="font-medium text-right max-w-[60%]">
                            {group.teams.join(', ')}
                          </span>
                        </div>
                      )}
                      <div className="pt-2 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectShift(group.shiftId);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Voir les détails
                        </Button>
                  </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
                      </div>
        ) : (
          /* Detailed View */
          selectedShiftDetails && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleBackToGrouped}
                    >
                      <ChevronLeft className="h-4 w-4 mr-2" />
                      Retour
                    </Button>
                    <div>
                      <CardTitle className="text-xl">
                        {selectedShiftDetails.shiftName}
                      </CardTitle>
                      <p className="text-sm text-text-secondary mt-1">
                        {selectedShiftDetails.startTime} - {selectedShiftDetails.endTime}
                      </p>
                    </div>
                  </div>
                  <Badge className={getShiftTypeColor(selectedShiftDetails.shiftType)}>
                    {getShiftTypeLabel(selectedShiftDetails.shiftType)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-table-header">
                            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary border w-12">
                          <input
                            type="checkbox"
                            checked={selectedSchedules.size === selectedShiftDetails.employees.reduce((acc, emp) => acc + emp.schedules.length, 0)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                const allIds = new Set<string>();
                                selectedShiftDetails.employees.forEach(emp => {
                                  emp.schedules.forEach(s => allIds.add(s.id));
                                });
                                setSelectedSchedules(allIds);
                              } else {
                                setSelectedSchedules(new Set());
                              }
                            }}
                          />
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary border">
                          Employé
                            </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary border">
                          Matricule
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary border">
                          Département
                        </th>
                        {dateRangeDays.map((day) => (
                          <th
                            key={day.toISOString()}
                            className="px-3 py-3 text-center text-xs font-medium text-text-secondary border min-w-[100px]"
                          >
                            {format(day, 'EEE d', { locale: fr })}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                      {paginatedEmployees.map((employee) => (
                        <tr key={employee.id} className="hover:bg-table-hover">
                          <td className="px-4 py-3 border text-center">
                            <input
                              type="checkbox"
                              checked={employee.schedules.every(s => selectedSchedules.has(s.id))}
                              onChange={(e) => {
                                            const newSelected = new Set(selectedSchedules);
                                if (e.target.checked) {
                                  employee.schedules.forEach(s => newSelected.add(s.id));
                                        } else {
                                  employee.schedules.forEach(s => newSelected.delete(s.id));
                                }
                                setSelectedSchedules(newSelected);
                              }}
                            />
                                </td>
                          <td className="px-4 py-3 border font-medium">{employee.name}</td>
                          <td className="px-4 py-3 border text-sm text-text-secondary">{employee.matricule}</td>
                          <td className="px-4 py-3 border text-sm text-text-secondary">{employee.department || '-'}</td>
                          {dateRangeDays.map((day) => {
                            const schedule = employee.schedules.find(s => {
                              const scheduleDate = parseISO(s.date);
                              return isWithinInterval(scheduleDate, {
                                start: startOfDay(day),
                                end: endOfDay(day),
                              });
                            });
                                  return (
                              <td key={day.toISOString()} className="px-3 py-3 border text-center">
                                {schedule ? (
                                  <div className="flex flex-col items-center gap-1">
                                    <div
                                      className="px-2 py-1 rounded text-xs font-medium text-white"
                                      style={{
                                        backgroundColor: selectedShiftDetails.color || '#3B82F6',
                                      }}
                                    >
                                      {schedule.customStartTime || selectedShiftDetails.startTime}
                                            </div>
                                    <div className="text-xs text-text-secondary">
                                      {schedule.customEndTime || selectedShiftDetails.endTime}
                                    </div>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="mt-1 h-6 px-2 text-xs"
                                      onClick={() => handleDeleteSchedule(schedule.id)}
                                              >
                                                <X className="h-3 w-3" />
                                    </Button>
                                          </div>
                                ) : (
                                  <span className="text-text-secondary text-xs">-</span>
                                )}
                                    </td>
                                  );
                                })}
                              </tr>
                      ))}
                        </tbody>
                      </table>
                    </div>

                  {/* Pagination Controls */}
                {selectedShiftDetails.employees.length > 0 && (
                    <div className="mt-4 flex items-center justify-between border-t border-table-border pt-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-text-secondary">
                        Affichage de {((currentPage - 1) * itemsPerPage) + 1} à {Math.min(currentPage * itemsPerPage, selectedShiftDetails.employees.length)} sur {selectedShiftDetails.employees.length} employé(s)
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
                        {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                            let pageNum;
                          if (totalPages <= 7) {
                              pageNum = i + 1;
                          } else if (currentPage <= 4) {
                              pageNum = i + 1;
                          } else if (currentPage >= totalPages - 3) {
                            pageNum = totalPages - 6 + i;
                            } else {
                            pageNum = currentPage - 3 + i;
                            }

                            return (
                              <Button
                                key={pageNum}
                              variant={currentPage === pageNum ? "primary" : "outline"}
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
          )
        )}

        {/* Create Schedule Modal */}
        {showCreateModal && (
          <CreateScheduleModalComponent
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => {
              setShowCreateModal(false);
              refetch();
            }}
            shiftsData={shiftsData}
            employeesData={employeesData}
            teamsData={teamsData}
            createScheduleMutation={createScheduleMutation}
          />
        )}

        {/* Import Modal */}
        {showImportModal && (
          <ImportSchedulesModal
            onClose={() => setShowImportModal(false)}
            onSuccess={() => {
              setShowImportModal(false);
              refetch();
            }}
          />
                                )}
                              </div>
    </DashboardLayout>
  );
}

// Create Schedule Modal Component
function CreateScheduleModalComponent({
  onClose,
  onSuccess,
  shiftsData,
  employeesData,
  teamsData,
  createScheduleMutation,
}: {
  onClose: () => void;
  onSuccess: () => void;
  shiftsData: any;
  employeesData: any;
  teamsData: any;
  createScheduleMutation: any;
}) {
  const [formData, setFormData] = useState<CreateScheduleDto>({
    employeeId: '',
    shiftId: '',
    dateDebut: format(new Date(), 'yyyy-MM-dd'),
    dateFin: '',
    teamId: '',
    customStartTime: '',
    customEndTime: '',
    notes: '',
  });
  const [scheduleType, setScheduleType] = useState<'single' | 'range'>('single');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employeeId || !formData.shiftId || !formData.dateDebut) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (scheduleType === 'range' && !formData.dateFin) {
      toast.error('Veuillez sélectionner une date de fin');
      return;
    }

    try {
      const data: CreateScheduleDto = {
        employeeId: formData.employeeId,
        shiftId: formData.shiftId,
        dateDebut: formData.dateDebut,
        ...(scheduleType === 'range' && formData.dateFin ? { dateFin: formData.dateFin } : {}),
        ...(formData.teamId ? { teamId: formData.teamId } : {}),
        ...(formData.customStartTime ? { customStartTime: formData.customStartTime } : {}),
        ...(formData.customEndTime ? { customEndTime: formData.customEndTime } : {}),
        ...(formData.notes ? { notes: formData.notes } : {}),
      };
      await createScheduleMutation.mutateAsync(data);
      onSuccess();
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Créer un planning</CardTitle>
          <Button variant="outline" size="sm" onClick={onClose}>
                      <X className="h-4 w-4" />
                    </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <Label htmlFor="employeeId">Employé *</Label>
              <select
                id="employeeId"
                required
                value={formData.employeeId}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                className="w-full border border-border rounded-md px-3 py-2 text-sm"
                        >
                          <option value="">Sélectionner un employé</option>
                {employeesData?.data?.map((emp: any) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName} ({emp.matricule})
                              </option>
                ))}
              </select>
                      </div>

                      <div>
                          <Label htmlFor="shiftId">Shift *</Label>
              <select
                id="shiftId"
                required
                value={formData.shiftId}
                onChange={(e) => setFormData({ ...formData, shiftId: e.target.value })}
                className="w-full border border-border rounded-md px-3 py-2 text-sm"
                        >
                          <option value="">Sélectionner un shift</option>
                {shiftsData?.data?.map((shift: any) => (
                              <option key={shift.id} value={shift.id}>
                    {shift.name} ({shift.code}) - {shift.startTime} à {shift.endTime}
                              </option>
                ))}
              </select>
                      </div>

                      <div>
              <Label>Type de planning</Label>
                        <div className="flex gap-4 mt-2">
                <label className="flex items-center">
                            <input
                              type="radio"
                              value="single"
                              checked={scheduleType === 'single'}
                    onChange={(e) => setScheduleType(e.target.value as 'single' | 'range')}
                    className="mr-2"
                  />
                  Jour unique
                          </label>
                <label className="flex items-center">
                            <input
                              type="radio"
                              value="range"
                              checked={scheduleType === 'range'}
                    onChange={(e) => setScheduleType(e.target.value as 'single' | 'range')}
                    className="mr-2"
                            />
                  Intervalle
                          </label>
                        </div>
                      </div>

                        <div>
              <Label htmlFor="dateDebut">Date de début *</Label>
                          <Input
                            id="dateDebut"
                            type="date"
                required
                value={formData.dateDebut}
                onChange={(e) => setFormData({ ...formData, dateDebut: e.target.value })}
                          />
                        </div>

                        {scheduleType === 'range' && (
                          <div>
                            <Label htmlFor="dateFin">Date de fin *</Label>
                            <Input
                              id="dateFin"
                              type="date"
                  required={scheduleType === 'range'}
                  value={formData.dateFin}
                  onChange={(e) => setFormData({ ...formData, dateFin: e.target.value })}
                  min={formData.dateDebut}
                />
                          </div>
                        )}

                        <div>
              <Label htmlFor="teamId">Équipe</Label>
              <select
                id="teamId"
                value={formData.teamId}
                onChange={(e) => setFormData({ ...formData, teamId: e.target.value })}
                className="w-full border border-border rounded-md px-3 py-2 text-sm"
                        >
                          <option value="">Aucune équipe</option>
                {teamsData?.data?.map((team: any) => (
                              <option key={team.id} value={team.id}>
                                {team.name}
                              </option>
                ))}
              </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                <Label htmlFor="customStartTime">Heure de début personnalisée</Label>
                      <Input
                  id="customStartTime"
                        type="time"
                  value={formData.customStartTime}
                  onChange={(e) => setFormData({ ...formData, customStartTime: e.target.value })}
                      />
                    </div>
                    <div>
                <Label htmlFor="customEndTime">Heure de fin personnalisée</Label>
                      <Input
                  id="customEndTime"
                        type="time"
                  value={formData.customEndTime}
                  onChange={(e) => setFormData({ ...formData, customEndTime: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
              <Label htmlFor="notes">Notes</Label>
                    <Input
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Notes optionnelles..."
                    />
                  </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                      Annuler
                    </Button>
                    <Button
                type="submit"
                      variant="primary"
                disabled={createScheduleMutation.isPending}
              >
                {createScheduleMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Création...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Créer
                  </>
                )}
                    </Button>
                  </div>
          </form>
                </CardContent>
              </Card>
            </div>
  );
}
