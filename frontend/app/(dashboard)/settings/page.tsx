'use client';

import { useState, useEffect } from 'react';
import { useTenantSettings, useUpdateTenantSettings } from '@/lib/hooks/useTenantSettings';
import { useSites, useCreateSite, useUpdateSite, useDeleteSite } from '@/lib/hooks/useSites';
import { useHolidays, useCreateHoliday, useUpdateHoliday, useDeleteHoliday, useImportHolidays, useGenerateHolidays } from '@/lib/hooks/useHolidays';
import {
  Settings as SettingsIcon,
  RefreshCw,
  Loader2,
  Building2,
  Clock,
  Briefcase,
  UserCheck,
  AlertTriangle,
  LogIn,
  MapPin,
  Calendar,
  ChevronRight,
  Save,
} from 'lucide-react';
import { toast } from 'sonner';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { PermissionGate } from '@/components/auth/PermissionGate';
import {
  EntrepriseTab,
  HorairesTab,
  CongesTab,
  PointageTab,
  AlertesTab,
  AnomaliesTab,
  SitesTab,
  HolidaysTab,
} from '@/components/settings';

type TabType = 'entreprise' | 'horaires' | 'conges' | 'pointage' | 'alertes' | 'anomalies' | 'sites' | 'holidays';

export default function SettingsPage() {
  const [tenantId, setTenantId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabType>('entreprise');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const id = localStorage.getItem('tenantId') || '';
      setTenantId(id);
    }
  }, []);

  // Fetch data
  const { data: settings, isLoading: settingsLoading, refetch: refetchSettings } = useTenantSettings(tenantId);
  const { data: sitesData, isLoading: sitesLoading, refetch: refetchSites } = useSites();
  const { data: holidaysData, isLoading: holidaysLoading, refetch: refetchHolidays } = useHolidays();

  // Mutations
  const updateSettings = useUpdateTenantSettings();
  const createSite = useCreateSite();
  const updateSite = useUpdateSite();
  const deleteSite = useDeleteSite();
  const createHoliday = useCreateHoliday();
  const updateHoliday = useUpdateHoliday();
  const deleteHoliday = useDeleteHoliday();
  const importHolidays = useImportHolidays();
  const generateHolidays = useGenerateHolidays();

  // Local state for form - combines all settings
  const [formData, setFormData] = useState({
    // Entreprise
    legalName: '',
    displayName: '',
    country: '',
    city: '',
    hrEmail: '',
    phone: '',
    language: 'fr',
    timezone: 'Africa/Casablanca',
    firstDayOfWeek: 'Lundi',
    workingDays: [1, 2, 3, 4, 5, 6] as number[],

    // Horaires
    lateToleranceEntry: 10,
    earlyToleranceExit: 5,
    overtimeRounding: 15,
    overtimeMinimumThreshold: 30,
    dailyWorkingHours: 7.33,
    temporaryMatriculeExpiryDays: 8,
    workDaysPerWeek: 6,
    maxWeeklyHours: 44,
    breakDuration: 60,
    overtimeRate: 1.25,
    nightShiftRate: 1.5,
    nightShiftStart: '21:00',
    nightShiftEnd: '06:00',
    // Nouveaux champs taux majorations configurables
    overtimeMajorationEnabled: true,
    overtimeRateStandard: 1.25,
    overtimeRateNight: 1.50,
    overtimeRateHoliday: 2.00,
    overtimeRateEmergency: 1.30,
    overtimeAutoDetectType: true,
    overtimePendingNotificationTime: '09:00',
    // Auto-approbation
    overtimeAutoApprove: false,
    overtimeAutoApproveMaxHours: 4,

    // Conges
    twoLevelWorkflow: true,
    anticipatedLeave: false,
    leaveIncludeSaturday: false,
    annualLeaveDays: 18,
    leaveApprovalLevels: 2,
    recoveryExpiryDays: 90,
    recoveryConversionRate: 1.0,

    // Pointage
    requireBreakPunch: false,
    requireScheduleForAttendance: true,
    absencePartialThreshold: 2,
    absenceDetectionTime: '01:00',
    enableInsufficientRestDetection: true,
    minimumRestHours: 11,
    minimumRestHoursNightShift: 12,
    holidayOvertimeEnabled: true,
    holidayOvertimeRate: 2.0,
    holidayOvertimeAsNormalHours: false,
    monthlyPayrollEmail: false,
    sfptExport: false,

    // Alertes
    alertWeeklyHoursExceeded: true,
    alertInsufficientRest: true,
    alertNightWorkRepetitive: true,
    alertMinimumStaffing: true,

    // Détection IN/OUT automatique
    doublePunchToleranceMinutes: 2,
    allowImplicitBreaks: true,
    minImplicitBreakMinutes: 30,
    maxImplicitBreakMinutes: 120,
    autoCloseOrphanSessions: true,
    autoCloseDefaultTime: '23:59',
    autoCloseOvertimeBuffer: 0,
    autoCloseCheckApprovedOvertime: true,

    // Anomalies - DOUBLE_IN
    doubleInDetectionWindow: 24,
    orphanInThreshold: 12,
    enableDoubleInPatternDetection: true,
    doubleInPatternAlertThreshold: 3,

    // Anomalies - MISSING_IN
    allowMissingInForRemoteWork: true,
    allowMissingInForMissions: true,
    missingInReminderEnabled: true,
    missingInReminderDelay: 15,
    missingInReminderMaxPerDay: 2,
    enableMissingInPatternDetection: true,
    missingInPatternAlertThreshold: 3,

    // Anomalies - MISSING_OUT
    missingOutDetectionTime: '00:00',
    missingOutDetectionWindow: 12,
    allowMissingOutForRemoteWork: true,
    allowMissingOutForMissions: true,
    missingOutReminderEnabled: true,
    missingOutReminderDelay: 15,
    missingOutReminderBeforeClosing: 30,
    enableMissingOutPatternDetection: true,
    missingOutPatternAlertThreshold: 3,

    // Wrong Type Detection
    enableWrongTypeDetection: false,
    wrongTypeAutoCorrect: false,
    wrongTypeDetectionMethod: 'SHIFT_BASED',
    wrongTypeShiftMarginMinutes: 120,
    wrongTypeConfidenceThreshold: 80,
    wrongTypeRequiresValidation: true,
  });

  // Update form when settings load
  useEffect(() => {
    if (settings) {
      let workingDays = [1, 2, 3, 4, 5, 6];
      if (settings.workingDays && Array.isArray(settings.workingDays)) {
        workingDays = settings.workingDays.map((day: any) =>
          typeof day === 'string' ? parseInt(day, 10) : day
        ).filter((day: number) => !isNaN(day) && day >= 1 && day <= 7);
        if (workingDays.length === 0) workingDays = [1, 2, 3, 4, 5, 6];
      }

      setFormData({
        // Entreprise
        legalName: settings.legalName || '',
        displayName: settings.displayName || '',
        country: settings.country || '',
        city: settings.city || '',
        hrEmail: settings.hrEmail || '',
        phone: settings.phone || '',
        language: settings.language || 'fr',
        timezone: settings.timezone || 'Africa/Casablanca',
        firstDayOfWeek: settings.firstDayOfWeek || 'Lundi',
        workingDays,

        // Horaires
        lateToleranceEntry: settings.lateToleranceEntry || 10,
        earlyToleranceExit: settings.earlyToleranceExit || 5,
        overtimeRounding: settings.overtimeRounding || 15,
        overtimeMinimumThreshold: settings.overtimeMinimumThreshold || 30,
        dailyWorkingHours: settings.dailyWorkingHours || 7.33,
        temporaryMatriculeExpiryDays: settings.temporaryMatriculeExpiryDays || 8,
        workDaysPerWeek: settings.workDaysPerWeek ?? 6,
        maxWeeklyHours: settings.maxWeeklyHours ?? 44,
        breakDuration: settings.breakDuration ?? 60,
        overtimeRate: settings.overtimeRate ?? 1.25,
        nightShiftRate: settings.nightShiftRate ?? 1.5,
        nightShiftStart: settings.nightShiftStart ?? '21:00',
        nightShiftEnd: settings.nightShiftEnd ?? '06:00',
        // Nouveaux champs taux majorations configurables
        overtimeMajorationEnabled: settings.overtimeMajorationEnabled ?? true,
        overtimeRateStandard: settings.overtimeRateStandard ?? 1.25,
        overtimeRateNight: settings.overtimeRateNight ?? 1.50,
        overtimeRateHoliday: settings.overtimeRateHoliday ?? 2.00,
        overtimeRateEmergency: settings.overtimeRateEmergency ?? 1.30,
        overtimeAutoDetectType: settings.overtimeAutoDetectType ?? true,
        overtimePendingNotificationTime: settings.overtimePendingNotificationTime ?? '09:00',
        // Auto-approbation
        overtimeAutoApprove: settings.overtimeAutoApprove ?? false,
        overtimeAutoApproveMaxHours: settings.overtimeAutoApproveMaxHours ?? 4,

        // Conges
        twoLevelWorkflow: settings.twoLevelWorkflow ?? true,
        anticipatedLeave: settings.anticipatedLeave ?? false,
        leaveIncludeSaturday: settings.leaveIncludeSaturday ?? false,
        annualLeaveDays: settings.annualLeaveDays ?? 18,
        leaveApprovalLevels: settings.leaveApprovalLevels ?? 2,
        recoveryExpiryDays: settings.recoveryExpiryDays ?? 90,
        recoveryConversionRate: settings.recoveryConversionRate ?? 1.0,

        // Pointage
        requireBreakPunch: settings.requireBreakPunch ?? false,
        requireScheduleForAttendance: settings.requireScheduleForAttendance ?? true,
        absencePartialThreshold: settings.absencePartialThreshold ?? 2,
        absenceDetectionTime: settings.absenceDetectionTime ?? '01:00',
        enableInsufficientRestDetection: settings.enableInsufficientRestDetection ?? true,
        minimumRestHours: settings.minimumRestHours ?? 11,
        minimumRestHoursNightShift: settings.minimumRestHoursNightShift ?? 12,
        holidayOvertimeEnabled: settings.holidayOvertimeEnabled ?? true,
        holidayOvertimeRate: settings.holidayOvertimeRate ?? 2.0,
        holidayOvertimeAsNormalHours: settings.holidayOvertimeAsNormalHours ?? false,
        monthlyPayrollEmail: settings.monthlyPayrollEmail ?? false,
        sfptExport: settings.sfptExport ?? false,

        // Alertes
        alertWeeklyHoursExceeded: settings.alertWeeklyHoursExceeded ?? true,
        alertInsufficientRest: settings.alertInsufficientRest ?? true,
        alertNightWorkRepetitive: settings.alertNightWorkRepetitive ?? true,
        alertMinimumStaffing: settings.alertMinimumStaffing ?? true,

        // Détection IN/OUT automatique
        doublePunchToleranceMinutes: settings.doublePunchToleranceMinutes ?? 2,
        allowImplicitBreaks: settings.allowImplicitBreaks ?? true,
        minImplicitBreakMinutes: settings.minImplicitBreakMinutes ?? 30,
        maxImplicitBreakMinutes: settings.maxImplicitBreakMinutes ?? 120,
        autoCloseOrphanSessions: settings.autoCloseOrphanSessions ?? true,
        autoCloseDefaultTime: settings.autoCloseDefaultTime ?? '23:59',
        autoCloseOvertimeBuffer: settings.autoCloseOvertimeBuffer ?? 0,
        autoCloseCheckApprovedOvertime: settings.autoCloseCheckApprovedOvertime ?? true,

        // Anomalies - DOUBLE_IN
        doubleInDetectionWindow: settings.doubleInDetectionWindow ?? 24,
        orphanInThreshold: settings.orphanInThreshold ?? 12,
        enableDoubleInPatternDetection: settings.enableDoubleInPatternDetection ?? true,
        doubleInPatternAlertThreshold: settings.doubleInPatternAlertThreshold ?? 3,

        // Anomalies - MISSING_IN
        allowMissingInForRemoteWork: settings.allowMissingInForRemoteWork ?? true,
        allowMissingInForMissions: settings.allowMissingInForMissions ?? true,
        missingInReminderEnabled: settings.missingInReminderEnabled ?? true,
        missingInReminderDelay: settings.missingInReminderDelay ?? 15,
        missingInReminderMaxPerDay: settings.missingInReminderMaxPerDay ?? 2,
        enableMissingInPatternDetection: settings.enableMissingInPatternDetection ?? true,
        missingInPatternAlertThreshold: settings.missingInPatternAlertThreshold ?? 3,

        // Anomalies - MISSING_OUT
        missingOutDetectionTime: settings.missingOutDetectionTime ?? '00:00',
        missingOutDetectionWindow: settings.missingOutDetectionWindow ?? 12,
        allowMissingOutForRemoteWork: settings.allowMissingOutForRemoteWork ?? true,
        allowMissingOutForMissions: settings.allowMissingOutForMissions ?? true,
        missingOutReminderEnabled: settings.missingOutReminderEnabled ?? true,
        missingOutReminderDelay: settings.missingOutReminderDelay ?? 15,
        missingOutReminderBeforeClosing: settings.missingOutReminderBeforeClosing ?? 30,
        enableMissingOutPatternDetection: settings.enableMissingOutPatternDetection ?? true,
        missingOutPatternAlertThreshold: settings.missingOutPatternAlertThreshold ?? 3,

        // Wrong Type Detection
        enableWrongTypeDetection: settings.enableWrongTypeDetection ?? false,
        wrongTypeAutoCorrect: settings.wrongTypeAutoCorrect ?? false,
        wrongTypeDetectionMethod: settings.wrongTypeDetectionMethod ?? 'SHIFT_BASED',
        wrongTypeShiftMarginMinutes: settings.wrongTypeShiftMarginMinutes ?? 120,
        wrongTypeConfidenceThreshold: settings.wrongTypeConfidenceThreshold ?? 80,
        wrongTypeRequiresValidation: settings.wrongTypeRequiresValidation ?? true,
      });
    }
  }, [settings]);

  const handleSaveSettings = async () => {
    if (!tenantId) {
      toast.error('Tenant ID manquant');
      return;
    }
    await updateSettings.mutateAsync({ tenantId, data: formData });
  };

  const handleRefresh = () => {
    refetchSettings();
    refetchSites();
    refetchHolidays();
    toast.success('Donnees rechargees');
  };

  // Sites handlers
  const handleCreateSite = async (data: any) => {
    await createSite.mutateAsync(data);
  };
  const handleUpdateSite = async (id: string, data: any) => {
    await updateSite.mutateAsync({ id, data });
  };
  const handleDeleteSite = async (id: string) => {
    await deleteSite.mutateAsync(id);
  };

  // Holidays handlers
  const handleCreateHoliday = async (data: any) => {
    await createHoliday.mutateAsync(data);
  };
  const handleUpdateHoliday = async (id: string, data: any) => {
    await updateHoliday.mutateAsync({ id, data });
  };
  const handleDeleteHoliday = async (id: string) => {
    await deleteHoliday.mutateAsync(id);
  };
  const handleImportHolidays = async (file: File) => {
    await importHolidays.mutateAsync(file);
  };
  const handleGenerateHolidays = async (data: { year: number; includeReligious: boolean; mode: 'add' | 'replace' }) => {
    await generateHolidays.mutateAsync(data);
  };

  const sites = sitesData?.data || [];
  const holidays = holidaysData?.data || [];

  const tabs = [
    { id: 'entreprise' as TabType, label: 'Entreprise', icon: Building2 },
    { id: 'horaires' as TabType, label: 'Horaires', icon: Clock },
    { id: 'conges' as TabType, label: 'Conges', icon: Briefcase },
    { id: 'pointage' as TabType, label: 'Pointage', icon: UserCheck },
    { id: 'alertes' as TabType, label: 'Alertes', icon: AlertTriangle },
    { id: 'anomalies' as TabType, label: 'Anomalies', icon: LogIn },
    { id: 'sites' as TabType, label: 'Sites', icon: MapPin },
    { id: 'holidays' as TabType, label: 'Jours Feries', icon: Calendar },
  ];

  const isLoading = settingsLoading || sitesLoading || holidaysLoading;

  if (isLoading) {
    return (
      <DashboardLayout title="Parametres" subtitle="Chargement...">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-600" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <ProtectedRoute permissions={['tenant.view_settings', 'tenant.update_settings']}>
      <DashboardLayout
        title="Parametres"
        subtitle="Configuration complete de votre systeme de pointage"
      >
        <div className="space-y-6">
          {/* Header with actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[#0052CC] rounded-xl flex items-center justify-center">
                <SettingsIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-[20px] font-bold text-[#212529]">Parametres</h1>
                <p className="text-[13px] text-[#6C757D]">
                  Configuration de l'entreprise, horaires, conges et alertes
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                <RefreshCw className="w-4 h-4" />
                Recharger
              </button>
              <PermissionGate permission="tenant.update_settings">
                <button
                  onClick={handleSaveSettings}
                  disabled={updateSettings.isPending}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#0052CC] text-white rounded-lg hover:bg-[#0047B3] transition-colors text-sm font-semibold disabled:opacity-50"
                >
                  {updateSettings.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Enregistrer
                </button>
              </PermissionGate>
            </div>
          </div>

          {/* Main content with sidebar tabs */}
          <div className="flex gap-6">
            {/* Sidebar Tabs */}
            <div className="w-56 bg-white rounded-lg border border-gray-200 p-2 h-fit sticky top-6">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                      isActive
                        ? 'bg-[#0052CC] text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-[14px] font-medium">{tab.label}</span>
                    {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                  </button>
                );
              })}
            </div>

            {/* Content Area */}
            <div className="flex-1 min-w-0">
              {activeTab === 'entreprise' && (
                <EntrepriseTab formData={formData} setFormData={setFormData} />
              )}
              {activeTab === 'horaires' && (
                <HorairesTab formData={formData} setFormData={setFormData} />
              )}
              {activeTab === 'conges' && (
                <CongesTab formData={formData} setFormData={setFormData} />
              )}
              {activeTab === 'pointage' && (
                <PointageTab formData={formData} setFormData={setFormData} />
              )}
              {activeTab === 'alertes' && (
                <AlertesTab formData={formData} setFormData={setFormData} />
              )}
              {activeTab === 'anomalies' && (
                <AnomaliesTab formData={formData} setFormData={setFormData} />
              )}
              {activeTab === 'sites' && (
                <SitesTab
                  sites={sites}
                  onCreateSite={handleCreateSite}
                  onUpdateSite={handleUpdateSite}
                  onDeleteSite={handleDeleteSite}
                  isCreating={createSite.isPending}
                  isUpdating={updateSite.isPending}
                />
              )}
              {activeTab === 'holidays' && (
                <HolidaysTab
                  holidays={holidays}
                  onCreateHoliday={handleCreateHoliday}
                  onUpdateHoliday={handleUpdateHoliday}
                  onDeleteHoliday={handleDeleteHoliday}
                  onImportHolidays={handleImportHolidays}
                  onGenerateHolidays={handleGenerateHolidays}
                  isGenerating={generateHolidays.isPending}
                />
              )}
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
