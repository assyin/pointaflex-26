'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, parseISO, isWithinInterval, startOfDay, endOfDay, differenceInDays, isAfter } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Search, Download, Printer, Plus, Calendar, AlertTriangle, Clock, Loader2, Upload,
  ChevronLeft, ChevronRight, Filter, X, Users, Building2, Eye, EyeOff, Grid3x3, List,
  Edit, Trash2, Save
} from 'lucide-react';
import {
  useSchedules,
  useScheduleAlerts,
  useCreateSchedule,
  useDeleteSchedule,
  useBulkDeleteSchedules,
} from '@/lib/hooks/useSchedules';
import { useShifts, useCreateShift, useUpdateShift, useDeleteShift } from '@/lib/hooks/useShifts';
import { useTeams } from '@/lib/hooks/useTeams';
import { useEmployees } from '@/lib/hooks/useEmployees';
import { useSites } from '@/lib/hooks/useSites';
import { useHolidays } from '@/lib/hooks/useHolidays';
import { ImportSchedulesModal } from '@/components/schedules/ImportSchedulesModal';
import { SearchableEmployeeSelect } from '@/components/schedules/SearchableEmployeeSelect';
import { formatErrorAlert } from '@/lib/utils/errorMessages';
import { toast } from 'sonner';
import { schedulesApi, type CreateScheduleDto } from '@/lib/api/schedules';
import { recoveryDaysApi, type RecoveryDay } from '@/lib/api/recovery-days';
import { canDeleteSchedule } from '@/lib/utils/auth';

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
      status?: 'PUBLISHED' | 'DRAFT' | 'CANCELLED' | 'SUSPENDED_BY_LEAVE';
      customStartTime?: string;
      customEndTime?: string;
      notes?: string;
    }>;
  }>;
}

export default function ShiftsPlanningPage() {
  const router = useRouter();
  const canDelete = canDeleteSchedule();
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'planning' | 'shifts'>('planning');
  
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
  
  // Modal pour afficher les dates exclues
  const [showExcludedDatesModal, setShowExcludedDatesModal] = useState(false);
  const [excludedDatesData, setExcludedDatesData] = useState<{
    excludedDates?: Array<{ date: string; reason: string; details?: string }>;
    conflictingDates?: Array<{ date: string; shift: string; reason?: string; details?: string }>;
    summary?: any;
  } | null>(null);

  // Pagination for detailed view
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Modals
  const [showImportModal, setShowImportModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Shifts management state
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [editingShift, setEditingShift] = useState<any>(null);
  const [shiftFormData, setShiftFormData] = useState({
    name: '',
    code: '',
    startTime: '08:00',
    endTime: '17:00',
    breakStartTime: '',
    breakDuration: 60,
    isNightShift: false,
    color: '#0052CC',
  });

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
  const { data: employeesData, isLoading: employeesLoading } = useEmployees();
  const { data: sitesResponse, isLoading: sitesLoading } = useSites();
  const { data: holidaysData } = useHolidays(); // Récupérer les jours fériés

  // Debug: Log employeesData structure (moved to avoid setState during render)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && employeesData) {
      console.log('Employees Data:', employeesData);
      console.log('Employees Loading:', employeesLoading);
    }
  }, [employeesData, employeesLoading]);

  // Extract sites from response
  const sitesData = sitesResponse?.data || sitesResponse || [];
  const { data: alertsData } = useScheduleAlerts(
    filterDateStart,
    filterDateEnd
  );

  // Créer une Map des jours fériés pour un accès rapide
  const holidaysMap = useMemo(() => {
    const map = new Map<string, { name: string; date: string }>();
    if (holidaysData?.data) {
      holidaysData.data.forEach((holiday: any) => {
        const dateKey = format(parseISO(holiday.date), 'yyyy-MM-dd');
        map.set(dateKey, { name: holiday.name, date: holiday.date });
      });
    }
    return map;
  }, [holidaysData]);

  // État pour les jours de récupération
  const [recoveryDaysData, setRecoveryDaysData] = useState<RecoveryDay[]>([]);

  // Récupérer les jours de récupération pour la période
  useEffect(() => {
    const fetchRecoveryDays = async () => {
      try {
        const response = await recoveryDaysApi.getAll({
          startDate: filterDateStart,
          endDate: filterDateEnd,
          status: 'APPROVED', // Seulement les récupérations approuvées
        });
        const recoveryDays = Array.isArray(response) ? response : (response?.data || []);
        setRecoveryDaysData(recoveryDays);
      } catch (error) {
        console.error('Error fetching recovery days:', error);
        setRecoveryDaysData([]);
      }
    };
    fetchRecoveryDays();
  }, [filterDateStart, filterDateEnd]);

  // Créer une Map des jours de récupération par employé et date
  const recoveryDaysMap = useMemo(() => {
    const map = new Map<string, RecoveryDay>(); // key: "employeeId-yyyy-MM-dd"
    recoveryDaysData.forEach((rd) => {
      // Un RecoveryDay peut couvrir plusieurs jours (startDate à endDate)
      const start = parseISO(rd.startDate);
      const end = parseISO(rd.endDate);
      const days = eachDayOfInterval({ start, end });
      days.forEach((day) => {
        const key = `${rd.employeeId}-${format(day, 'yyyy-MM-dd')}`;
        map.set(key, rd);
      });
    });
    return map;
  }, [recoveryDaysData]);

  const deleteScheduleMutation = useDeleteSchedule();
  const bulkDeleteMutation = useBulkDeleteSchedules();
  const createScheduleMutation = useCreateSchedule();
  
  // Shifts management hooks
  const createShiftMutation = useCreateShift();
  const updateShiftMutation = useUpdateShift();
  const deleteShiftMutation = useDeleteShift();

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

    const shiftMap = new Map<string, GroupedSchedule>();
    const employeeMap = new Map<string, GroupedSchedule['employees'][0]>();

    // Process existing schedules
    if (schedulesData && Array.isArray(schedulesData) && schedulesData.length > 0) {
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
        status: schedule.status,
        customStartTime: schedule.customStartTime,
        customEndTime: schedule.customEndTime,
        notes: schedule.notes,
      });
    });
    }

    // Add shifts without any schedules (if not filtered by other criteria)
    // Extract shifts from shiftsData
    const availableShifts = shiftsData
      ? (Array.isArray(shiftsData) ? shiftsData : (shiftsData?.data && Array.isArray(shiftsData.data) ? shiftsData.data : []))
      : [];

    if (availableShifts.length > 0 && !filterSite && !filterTeam && !searchQuery) {
      availableShifts.forEach((shift: any) => {
        // Skip if already in map (has schedules)
        if (shiftMap.has(shift.id)) return;

        // Skip if shift filter is active and doesn't match
        if (filterShift && shift.id !== filterShift) return;

        // Add empty shift entry
        shiftMap.set(shift.id, {
          shiftId: shift.id,
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
      });
    }

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
  }, [schedulesData, shiftsData, filterShift, filterSite, filterTeam, searchQuery]);

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
      try {
        await deleteScheduleMutation.mutateAsync(scheduleId);
        refetch();
      } catch (error: any) {
        // L'erreur est déjà gérée par le hook useDeleteSchedule avec un toast
        // On évite juste que l'erreur soit non catchée
        console.error('Erreur lors de la suppression du planning:', error);
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedSchedules.size === 0) return;
    if (confirm(`Êtes-vous sûr de vouloir supprimer ${selectedSchedules.size} planning(s) ?`)) {
      try {
        await bulkDeleteMutation.mutateAsync(Array.from(selectedSchedules));
        setSelectedSchedules(new Set());
        refetch();
      } catch (error: any) {
        // L'erreur est déjà gérée par le hook useBulkDeleteSchedules avec un toast
        // On évite juste que l'erreur soit non catchée
        console.error('Erreur lors de la suppression en masse des plannings:', error);
      }
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

  // Shifts management handlers
  const handleOpenShiftModal = (shift?: any) => {
    if (shift) {
      setEditingShift(shift);
      setShiftFormData({
        name: shift.name || '',
        code: shift.code || '',
        startTime: shift.startTime || '08:00',
        endTime: shift.endTime || '17:00',
        breakStartTime: shift.breakStartTime || '',
        breakDuration: shift.breakDuration || 60,
        isNightShift: shift.isNightShift || false,
        color: shift.color || '#0052CC',
      });
    } else {
      setEditingShift(null);
      setShiftFormData({
        name: '',
        code: '',
        startTime: '08:00',
        endTime: '17:00',
        breakStartTime: '',
        breakDuration: 60,
        isNightShift: false,
        color: '#0052CC',
      });
    }
    setShowShiftModal(true);
  };

  const handleCloseShiftModal = () => {
    setShowShiftModal(false);
    setEditingShift(null);
    setShiftFormData({
      name: '',
      code: '',
      startTime: '08:00',
      endTime: '17:00',
      breakStartTime: '',
      breakDuration: 60,
      isNightShift: false,
      color: '#0052CC',
    });
  };

  const handleSaveShift = async () => {
    if (!shiftFormData.name || !shiftFormData.code || !shiftFormData.startTime || !shiftFormData.endTime) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      if (editingShift) {
        await updateShiftMutation.mutateAsync({
          id: editingShift.id,
          data: shiftFormData,
        });
      } else {
        await createShiftMutation.mutateAsync(shiftFormData);
      }
      handleCloseShiftModal();
    } catch (error) {
      // Error is handled by the mutation hook
    }
  };

  const handleDeleteShift = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce shift ?')) {
      return;
    }

    try {
      await deleteShiftMutation.mutateAsync(id);
    } catch (error) {
      // Error is handled by the mutation hook
    }
  };

  // Extract shifts array
  const shifts = useMemo(() => {
    if (!shiftsData) return [];
    if (Array.isArray(shiftsData)) return shiftsData;
    if (shiftsData?.data && Array.isArray(shiftsData.data)) return shiftsData.data;
    return [];
  }, [shiftsData]);

  return (
    <ProtectedRoute permissions={['schedule.view_all', 'schedule.view_own', 'schedule.view_team']}>
      <DashboardLayout
        title="Shifts & Planning"
        subtitle="Planification des équipes et gestion des plannings"
      >
      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'planning' | 'shifts')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="planning">
              <Calendar className="h-4 w-4 mr-2" />
              Planning
            </TabsTrigger>
            <TabsTrigger value="shifts">
              <Clock className="h-4 w-4 mr-2" />
              Gestion des Shifts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="planning" className="space-y-6">
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
                <PermissionGate permissions={['schedule.create', 'schedule.manage_team']}>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setShowCreateModal(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Créer un planning
                  </Button>
                </PermissionGate>
                <PermissionGate permissions={['schedule.import', 'schedule.create']}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowImportModal(true)}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Importer
                  </Button>
                </PermissionGate>
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
              {selectedSchedules.size > 0 && canDelete && (
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
                    <PermissionGate permissions={['schedule.create', 'schedule.manage_team']}>
                      <Button
                        variant="primary"
                        onClick={() => setShowCreateModal(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Créer un planning
                      </Button>
                    </PermissionGate>
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
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <Badge className={getShiftTypeColor(group.shiftType)}>
                            {getShiftTypeLabel(group.shiftType)}
                          </Badge>
                          {group.shiftCode && (
                            <Badge variant="default">{group.shiftCode}</Badge>
                          )}
                        </div>
                        {/* Période de validation */}
                        {filterDateStart && filterDateEnd && (
                          <div className="mt-2 pt-2 border-t border-gray-200">
                            <div className="flex items-center gap-2 text-xs">
                              <Calendar className="h-3.5 w-3.5 text-gray-500" />
                              <span className="text-gray-600">
                                Période du <span className="font-semibold text-gray-900">{format(parseISO(filterDateStart), 'dd/MM/yyyy', { locale: fr })}</span> au <span className="font-semibold text-gray-900">{format(parseISO(filterDateEnd), 'dd/MM/yyyy', { locale: fr })}</span>
                              </span>
                            </div>
                          </div>
                        )}
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
                            const isSuspended = schedule?.status === 'SUSPENDED_BY_LEAVE';

                            // Déterminer les informations spéciales du jour
                            const dayOfWeek = day.getDay();
                            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

                            // Vérifier si c'est un jour férié
                            const dayKey = format(day, 'yyyy-MM-dd');
                            const holiday = holidaysMap.get(dayKey);
                            const isHoliday = !!holiday;
                            const holidayName = holiday?.name || '';

                            // Vérifier si c'est un jour de récupération
                            const recoveryDayKey = `${employee.id}-${dayKey}`;
                            const recoveryDay = recoveryDaysMap.get(recoveryDayKey);
                            const isRecoveryDay = !!recoveryDay;

                            // Construire le message du tooltip
                            let tooltipMessages: string[] = [];
                            if (isSuspended) tooltipMessages.push('🏖️ Planning suspendu par un congé approuvé');
                            if (isRecoveryDay) tooltipMessages.push('🔄 Jour de récupération approuvé');
                            if (isHoliday) tooltipMessages.push(`🎉 Jour férié: ${holidayName}`);
                            if (isWeekend && !isHoliday) tooltipMessages.push('📅 Weekend');
                            if (schedule?.notes) tooltipMessages.push(`📝 Note: ${schedule.notes}`);

                            const hasSpecialInfo = tooltipMessages.length > 0;

                            return (
                              <td key={day.toISOString()} className="px-3 py-3 border text-center">
                                {schedule ? (
                                  <div className="flex flex-col items-center gap-1 relative group">
                                    <div
                                      className={`px-2 py-1 rounded text-xs font-medium ${
                                        isSuspended
                                          ? 'bg-gray-300 text-gray-600 opacity-60'
                                          : 'text-white'
                                      }`}
                                      style={{
                                        backgroundColor: isSuspended ? undefined : (selectedShiftDetails.color || '#3B82F6'),
                                      }}
                                    >
                                      {schedule.customStartTime || selectedShiftDetails.startTime}
                                      {isSuspended && (
                                        <span className="ml-1 text-base" title="Suspendu par congé">🏖️</span>
                                      )}
                                      {isRecoveryDay && !isSuspended && (
                                        <span className="ml-1 text-base" title="Jour de récupération">🔄</span>
                                      )}
                                      {isHoliday && !isSuspended && !isRecoveryDay && (
                                        <span className="ml-1 text-base" title="Jour férié">🎉</span>
                                      )}
                                      {isWeekend && !isSuspended && !isHoliday && !isRecoveryDay && (
                                        <span className="ml-1 text-base" title="Weekend">📅</span>
                                      )}
                                    </div>
                                    <div className={`text-xs ${isSuspended ? 'text-gray-500' : 'text-text-secondary'}`}>
                                      {schedule.customEndTime || selectedShiftDetails.endTime}
                                    </div>
                                    {hasSpecialInfo && (
                                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 w-56 p-2 bg-gray-800 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                        <div className="space-y-1">
                                          {tooltipMessages.map((msg, idx) => (
                                            <div key={idx}>{msg}</div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    <PermissionGate permissions={['schedule.delete', 'schedule.manage_team']}>
                                      {!isSuspended && (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="mt-1 h-6 px-2 text-xs"
                                          onClick={() => handleDeleteSchedule(schedule.id)}
                                        >
                                          <X className="h-3 w-3" />
                                        </Button>
                                      )}
                                    </PermissionGate>
                                  </div>
                                ) : (
                                  // Pas de planning : afficher "-" ou info jour spécial
                                  <div className="relative group inline-block">
                                    {isRecoveryDay ? (
                                      // Jour de récupération sans planning
                                      <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs font-medium">
                                        🔄 Récup
                                      </span>
                                    ) : (
                                      <span className="text-text-secondary text-xs">
                                        -
                                        {isHoliday && <span className="ml-1">🎉</span>}
                                        {isWeekend && !isHoliday && <span className="ml-1">📅</span>}
                                      </span>
                                    )}
                                    {(isHoliday || isWeekend || isRecoveryDay) && (
                                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 w-48 p-2 bg-gray-800 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap">
                                        {isRecoveryDay && '🔄 Jour de récupération approuvé'}
                                        {isHoliday && !isRecoveryDay && `🎉 Jour férié: ${holidayName}`}
                                        {isWeekend && !isHoliday && !isRecoveryDay && '📅 Weekend'}
                                      </div>
                                    )}
                                  </div>
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
            onSuccess={(excludedData?: any) => {
              setShowCreateModal(false);
              if (excludedData && (excludedData.excludedDates?.length > 0 || excludedData.conflictingDates?.length > 0)) {
                setExcludedDatesData(excludedData);
                setShowExcludedDatesModal(true);
              }
              refetch();
            }}
            shiftsData={shiftsData}
            employeesData={employeesData}
            employeesLoading={employeesLoading}
            teamsData={teamsData}
            createScheduleMutation={createScheduleMutation}
          />
        )}

        {/* Excluded Dates Modal */}
        {showExcludedDatesModal && excludedDatesData && (
          <Dialog open={showExcludedDatesModal} onOpenChange={setShowExcludedDatesModal}>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  Jours exclus lors de la création du planning
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                {/* Dates exclues */}
                {excludedDatesData.excludedDates && excludedDatesData.excludedDates.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">
                      Dates exclues ({excludedDatesData.excludedDates.length})
                    </h3>
                    <div className="space-y-2">
                      {excludedDatesData.excludedDates.map((excluded: any, index: number) => {
                        const reasonLabels: Record<string, { label: string; color: string; icon: string }> = {
                          NON_OUVRABLE: { label: 'Jour non ouvrable', color: 'bg-gray-100 text-gray-800', icon: '📅' },
                          JOUR_FERIE: { label: 'Jour férié', color: 'bg-blue-100 text-blue-800', icon: '🎉' },
                          CONGE: { label: 'Congé approuvé', color: 'bg-purple-100 text-purple-800', icon: '🏖️' },
                          RECUPERATION: { label: 'Jour de récupération', color: 'bg-orange-100 text-orange-800', icon: '🔄' },
                        };
                        
                        const reasonInfo = reasonLabels[excluded.reason] || { 
                          label: excluded.reason, 
                          color: 'bg-gray-100 text-gray-800',
                          icon: '❓'
                        };
                        
                        return (
                          <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <span className="text-lg">{reasonInfo.icon}</span>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-gray-900">
                                  {new Date(excluded.date).toLocaleDateString('fr-FR', { 
                                    weekday: 'long', 
                                    year: 'numeric', 
                                    month: 'long', 
                                    day: 'numeric' 
                                  })}
                                </span>
                                <Badge className={reasonInfo.color}>
                                  {reasonInfo.label}
                                </Badge>
                              </div>
                              {excluded.details && (
                                <p className="text-sm text-gray-600 mt-1">{excluded.details}</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Dates en conflit */}
                {excludedDatesData.conflictingDates && excludedDatesData.conflictingDates.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">
                      Dates avec planning existant ({excludedDatesData.conflictingDates.length})
                    </h3>
                    <div className="space-y-2">
                      {excludedDatesData.conflictingDates.map((conflict: any, index: number) => (
                        <div key={index} className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                          <span className="text-lg">⚠️</span>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-gray-900">
                                {new Date(conflict.date).toLocaleDateString('fr-FR', { 
                                  weekday: 'long', 
                                  year: 'numeric', 
                                  month: 'long', 
                                  day: 'numeric' 
                                })}
                              </span>
                              <Badge className="bg-yellow-100 text-yellow-800">
                                Planning existant
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              Shift: <strong>{conflict.shift}</strong>
                            </p>
                            {conflict.details && (
                              <p className="text-sm text-gray-600 mt-1">{conflict.details}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Résumé */}
                {excludedDatesData.summary && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h3 className="text-sm font-semibold text-blue-900 mb-2">📊 Résumé</h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-blue-700">Total dates dans la plage:</span>
                        <span className="ml-2 font-semibold">{excludedDatesData.summary.totalDatesInRange}</span>
                      </div>
                      <div>
                        <span className="text-blue-700">Dates valides:</span>
                        <span className="ml-2 font-semibold">{excludedDatesData.summary.validDates}</span>
                      </div>
                      <div>
                        <span className="text-blue-700">Plannings créés:</span>
                        <span className="ml-2 font-semibold text-green-600">{excludedDatesData.summary.created}</span>
                      </div>
                      <div>
                        <span className="text-blue-700">Dates exclues:</span>
                        <span className="ml-2 font-semibold text-orange-600">
                          {(excludedDatesData.excludedDates?.length || 0) + (excludedDatesData.conflictingDates?.length || 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button onClick={() => setShowExcludedDatesModal(false)}>
                  Fermer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
          </TabsContent>

          <TabsContent value="shifts" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Gestion des Shifts</CardTitle>
                  <PermissionGate permissions={['shift.create', 'shift.manage']}>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleOpenShiftModal()}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Créer un shift
                    </Button>
                  </PermissionGate>
                </div>
              </CardHeader>
              <CardContent>
                {shiftsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : shifts.length === 0 ? (
                  <div className="text-center py-8 text-text-secondary">
                    Aucun shift trouvé. Créez votre premier shift.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {shifts.map((shift: any) => (
                      <Card key={shift.id} className="relative">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-base flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: shift.color || '#0052CC' }}
                                />
                                {shift.name}
                              </CardTitle>
                              <p className="text-sm text-text-secondary mt-1">
                                Code: {shift.code}
                              </p>
                            </div>
                            <div className="flex gap-1">
                              <PermissionGate permissions={['shift.update', 'shift.manage']}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenShiftModal(shift)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </PermissionGate>
                              <PermissionGate permissions={['shift.delete', 'shift.manage']}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteShift(shift.id)}
                                  disabled={!shift._usage?.canDelete}
                                  title={
                                    shift._usage?.canDelete
                                      ? 'Supprimer ce shift'
                                      : `Impossible de supprimer : ${shift._usage?.employeeCount || 0} employé(s) et ${shift._usage?.scheduleCount || 0} planning(s) associés`
                                  }
                                >
                                  <Trash2 className={`h-4 w-4 ${shift._usage?.canDelete ? 'text-destructive' : 'text-gray-300'}`} />
                                </Button>
                              </PermissionGate>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-text-secondary">Début:</span>
                              <span className="font-medium">{shift.startTime}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-text-secondary">Fin:</span>
                              <span className="font-medium">{shift.endTime}</span>
                            </div>
                            {shift.breakStartTime && (
                              <div className="flex items-center justify-between">
                                <span className="text-text-secondary">Début pause:</span>
                                <span className="font-medium">{shift.breakStartTime}</span>
                              </div>
                            )}
                            {shift.breakDuration && (
                              <div className="flex items-center justify-between">
                                <span className="text-text-secondary">Durée pause:</span>
                                <span className="font-medium">{shift.breakDuration} min</span>
                              </div>
                            )}
                            {/* Statistiques d'utilisation */}
                            <div className="pt-2 mt-2 border-t border-gray-200">
                              <div className="flex items-center justify-between">
                                <span className="text-text-secondary flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  Employés:
                                </span>
                                <span className="font-medium">{shift._usage?.employeeCount || 0}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-text-secondary flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  Plannings:
                                </span>
                                <span className="font-medium">{shift._usage?.scheduleCount || 0}</span>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {shift.isNightShift && (
                                <Badge variant="secondary">
                                  Shift de nuit
                                </Badge>
                              )}
                              {shift._usage?.canDelete && (
                                <Badge variant="outline" className="text-green-600 border-green-300">
                                  Supprimable
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Shift Create/Edit Modal */}
            <Dialog open={showShiftModal} onOpenChange={setShowShiftModal}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingShift ? 'Modifier le shift' : 'Créer un nouveau shift'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="shift-name">Nom du shift *</Label>
                      <Input
                        id="shift-name"
                        value={shiftFormData.name}
                        onChange={(e) => setShiftFormData({ ...shiftFormData, name: e.target.value })}
                        placeholder="Ex: Matin, Soir, Nuit"
                      />
                    </div>
                    <div>
                      <Label htmlFor="shift-code">Code *</Label>
                      <Input
                        id="shift-code"
                        value={shiftFormData.code}
                        onChange={(e) => setShiftFormData({ ...shiftFormData, code: e.target.value.toUpperCase() })}
                        placeholder="Ex: MAT, SOIR, NUIT"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="shift-start">Heure de début *</Label>
                      <Input
                        id="shift-start"
                        type="time"
                        value={shiftFormData.startTime}
                        onChange={(e) => setShiftFormData({ ...shiftFormData, startTime: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="shift-end">Heure de fin *</Label>
                      <Input
                        id="shift-end"
                        type="time"
                        value={shiftFormData.endTime}
                        onChange={(e) => setShiftFormData({ ...shiftFormData, endTime: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="shift-break-start">Heure début pause</Label>
                      <Input
                        id="shift-break-start"
                        type="time"
                        value={shiftFormData.breakStartTime || ''}
                        onChange={(e) => setShiftFormData({ ...shiftFormData, breakStartTime: e.target.value })}
                        placeholder="12:00"
                      />
                    </div>
                    <div>
                      <Label htmlFor="shift-break">Durée de pause (minutes)</Label>
                      <Input
                        id="shift-break"
                        type="number"
                        min="0"
                        value={shiftFormData.breakDuration}
                        onChange={(e) => setShiftFormData({ ...shiftFormData, breakDuration: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="shift-color">Couleur</Label>
                      <div className="flex gap-2">
                        <Input
                          id="shift-color"
                          type="color"
                          value={shiftFormData.color}
                          onChange={(e) => setShiftFormData({ ...shiftFormData, color: e.target.value })}
                          className="w-20 h-10"
                        />
                        <Input
                          value={shiftFormData.color}
                          onChange={(e) => setShiftFormData({ ...shiftFormData, color: e.target.value })}
                          placeholder="#0052CC"
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="shift-night"
                        checked={shiftFormData.isNightShift}
                        onChange={(e) => setShiftFormData({ ...shiftFormData, isNightShift: e.target.checked })}
                        className="rounded border-gray-300"
                      />
                      <Label htmlFor="shift-night" className="cursor-pointer">
                        Shift de nuit
                      </Label>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={handleCloseShiftModal}>
                    Annuler
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleSaveShift}
                    disabled={createShiftMutation.isPending || updateShiftMutation.isPending}
                  >
                    {createShiftMutation.isPending || updateShiftMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Enregistrement...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        {editingShift ? 'Modifier' : 'Créer'}
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>
        </Tabs>
      </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

// Create Schedule Modal Component
function CreateScheduleModalComponent({
  onClose,
  onSuccess,
  shiftsData,
  employeesData,
  employeesLoading,
  teamsData,
  createScheduleMutation,
}: {
  onClose: () => void;
  onSuccess: (excludedData?: any) => void;
  shiftsData: any;
  employeesData: any;
  employeesLoading?: boolean;
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
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Fonction de validation complète
  const validateSchedule = (): boolean => {
    const errors: string[] = [];

    // Validation champs obligatoires
    if (!formData.employeeId) errors.push('L\'employé est obligatoire');
    if (!formData.shiftId) errors.push('Le shift est obligatoire');
    if (!formData.dateDebut) errors.push('La date de début est obligatoire');
    
    if (scheduleType === 'range' && !formData.dateFin) {
      errors.push('La date de fin est obligatoire pour un intervalle');
    }

    // Validation dates
    if (formData.dateDebut && formData.dateFin) {
      const start = parseISO(formData.dateDebut);
      const end = parseISO(formData.dateFin);
      
      if (isAfter(start, end)) {
        errors.push('La date de fin doit être supérieure ou égale à la date de début');
      }
      
      const daysDiff = differenceInDays(end, start);
      if (daysDiff > 365) {
        errors.push('L\'intervalle ne peut pas dépasser 365 jours');
      }
    }

    // Validation heures personnalisées
    if (formData.customStartTime && formData.customEndTime) {
      const [startH, startM] = formData.customStartTime.split(':').map(Number);
      const [endH, endM] = formData.customEndTime.split(':').map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;
      
      if (endMinutes <= startMinutes) {
        errors.push('L\'heure de fin doit être supérieure à l\'heure de début');
      }
    }

    // Si une seule heure est fournie, c'est une erreur
    if ((formData.customStartTime && !formData.customEndTime) || 
        (!formData.customStartTime && formData.customEndTime)) {
      errors.push('Si vous personnalisez les heures, vous devez fournir l\'heure de début ET l\'heure de fin');
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  // Calculer le nombre de jours qui seront créés (pour prévisualisation)
  const previewDates = useMemo(() => {
    if (!formData.dateDebut) return [];
    
    if (scheduleType === 'range' && formData.dateFin) {
      try {
        const start = parseISO(formData.dateDebut);
        const end = parseISO(formData.dateFin);
        if (!isAfter(start, end)) {
          return eachDayOfInterval({ start, end });
        }
      } catch (e) {
        return [];
      }
    }
    
    return [parseISO(formData.dateDebut)];
  }, [formData.dateDebut, formData.dateFin, scheduleType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation avant soumission
    if (!validateSchedule()) {
      validationErrors.forEach(error => toast.error(error));
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
      const result = await createScheduleMutation.mutateAsync(data);
      
      // Passer les données des dates exclues à onSuccess
      if (result && (result.excludedDates?.length > 0 || result.conflictingDates?.length > 0)) {
        onSuccess({
          excludedDates: result.excludedDates || [],
          conflictingDates: result.conflictingDates || [],
          summary: result.summary,
        });
      } else {
        onSuccess();
      }
    } catch (error) {
      // Error handled by mutation
      onSuccess();
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
              <SearchableEmployeeSelect
                value={formData.employeeId}
                onChange={(value) => {
                  setFormData({ ...formData, employeeId: value });
                  setValidationErrors([]);
                }}
                employees={
                  // Gérer différentes structures de données
                  Array.isArray(employeesData)
                    ? employeesData.filter((emp: any) => emp.isActive !== false) // Filtrer les employés actifs
                    : employeesData?.data
                    ? employeesData.data.filter((emp: any) => emp.isActive !== false)
                    : []
                }
                isLoading={employeesLoading || false}
                placeholder="Rechercher un employé par nom ou matricule..."
                label="Employé"
                required
                error={validationErrors.find((e) => e.includes('employé'))}
              />
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
                  onChange={(e) => {
                    setFormData({ ...formData, dateFin: e.target.value });
                    setValidationErrors([]); // Réinitialiser les erreurs lors de la modification
                  }}
                  min={formData.dateDebut}
                />
                {formData.dateDebut && formData.dateFin && (
                  <p className="text-xs text-text-secondary mt-1">
                    {(() => {
                      try {
                        const start = parseISO(formData.dateDebut);
                        const end = parseISO(formData.dateFin);
                        const days = differenceInDays(end, start) + 1;
                        if (days > 0 && days <= 365) {
                          return `${days} jour(s) seront créé(s)`;
                        } else if (days > 365) {
                          return <span className="text-red-600">⚠️ Maximum 365 jours autorisés</span>;
                        }
                      } catch (e) {
                        return null;
                      }
                    })()}
                  </p>
                )}
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
                  onChange={(e) => {
                    setFormData({ ...formData, customStartTime: e.target.value });
                    setValidationErrors([]); // Réinitialiser les erreurs lors de la modification
                  }}
                />
                <p className="text-xs text-text-secondary mt-1">
                  Optionnel. Si non renseigné, les heures du shift seront utilisées.
                </p>
              </div>
              <div>
                <Label htmlFor="customEndTime">Heure de fin personnalisée</Label>
                <Input
                  id="customEndTime"
                  type="time"
                  value={formData.customEndTime}
                  onChange={(e) => {
                    setFormData({ ...formData, customEndTime: e.target.value });
                    setValidationErrors([]); // Réinitialiser les erreurs lors de la modification
                  }}
                />
                <p className="text-xs text-text-secondary mt-1">
                  Optionnel. Doit être supérieure à l'heure de début.
                </p>
              </div>
            </div>
            {formData.customStartTime && formData.customEndTime && (
              <div className="text-xs text-text-secondary">
                {(() => {
                  const [startH, startM] = formData.customStartTime.split(':').map(Number);
                  const [endH, endM] = formData.customEndTime.split(':').map(Number);
                  const startMinutes = startH * 60 + startM;
                  const endMinutes = endH * 60 + endM;
                  const duration = endMinutes - startMinutes;
                  const hours = Math.floor(duration / 60);
                  const minutes = duration % 60;
                  return endMinutes > startMinutes ? (
                    <span className="text-success" style={{ color: '#28A745' }}>
                      Durée : {hours}h{minutes > 0 ? `${minutes}min` : ''}
                    </span>
                  ) : (
                    <span className="text-red-600">
                      ⚠️ L'heure de fin doit être supérieure à l'heure de début
                    </span>
                  );
                })()}
              </div>
            )}

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Notes optionnelles..."
              />
            </div>

            {/* Prévisualisation */}
            {formData.employeeId && formData.shiftId && formData.dateDebut && (
              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <Eye className="h-4 w-4 text-primary" />
                  <Label className="text-sm font-semibold">Prévisualisation</Label>
                </div>
                <div className="text-sm text-text-secondary space-y-1">
                  <p>
                    <span className="font-medium">{previewDates.length}</span> jour(s) seront créé(s)
                  </p>
                  {previewDates.length > 0 && previewDates.length <= 10 && (
                    <div className="mt-2">
                      <p className="text-xs text-text-secondary mb-1">Dates concernées :</p>
                      <ul className="list-disc list-inside space-y-0.5 text-xs">
                        {previewDates.map((date, idx) => (
                          <li key={idx}>
                            {format(date, 'dd/MM/yyyy', { locale: fr })}
                            {shiftsData?.data?.find((s: any) => s.id === formData.shiftId) && (
                              <span className="ml-2 text-text-secondary">
                                - {shiftsData.data.find((s: any) => s.id === formData.shiftId).name}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {previewDates.length > 10 && (
                    <div className="mt-2">
                      <p className="text-xs text-text-secondary">
                        {format(previewDates[0], 'dd/MM/yyyy', { locale: fr })} au{' '}
                        {format(previewDates[previewDates.length - 1], 'dd/MM/yyyy', { locale: fr })}
                      </p>
                    </div>
                  )}
                  {formData.customStartTime && formData.customEndTime && (
                    <p className="mt-2 text-xs">
                      Heures personnalisées : {formData.customStartTime} - {formData.customEndTime}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Affichage des erreurs de validation */}
            {validationErrors.length > 0 && (
              <Alert variant="danger" className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p className="font-semibold">Erreurs de validation :</p>
                    <ul className="list-disc list-inside space-y-0.5 text-sm">
                      {validationErrors.map((error, idx) => (
                        <li key={idx}>{error}</li>
                      ))}
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            )}

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
