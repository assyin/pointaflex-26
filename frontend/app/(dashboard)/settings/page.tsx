'use client';

import { useState, useEffect } from 'react';
import { useTenantSettings, useUpdateTenantSettings } from '@/lib/hooks/useTenantSettings';
import { useSites, useCreateSite, useUpdateSite, useDeleteSite } from '@/lib/hooks/useSites';
import { useHolidays, useCreateHoliday, useUpdateHoliday, useDeleteHoliday, useImportHolidays } from '@/lib/hooks/useHolidays';
import { HolidayType } from '@/lib/api/holidays';
import {
  Settings as SettingsIcon,
  RefreshCw,
  Plus,
  Trash2,
  Edit,
  Upload,
  Calendar,
  Building2,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsPage() {
  // Get tenant ID from localStorage
  const [tenantId, setTenantId] = useState<string>('');

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

  // Local state for form
  const [formData, setFormData] = useState({
    legalName: '',
    displayName: '',
    country: '',
    city: '',
    hrEmail: '',
    phone: '',
    language: '',
    timezone: '',
    firstDayOfWeek: '',
    lateToleranceEntry: 10,
    earlyToleranceExit: 5,
    overtimeRounding: 15,
    nightShiftStart: '21:00',
    nightShiftEnd: '06:00',
    twoLevelWorkflow: true,
    anticipatedLeave: false,
    monthlyPayrollEmail: false,
    sfptExport: false,
  });

  // Modal states
  const [showSiteModal, setShowSiteModal] = useState(false);
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [editingSite, setEditingSite] = useState<any>(null);
  const [editingHoliday, setEditingHoliday] = useState<any>(null);
  const [siteForm, setSiteForm] = useState({
    code: '',
    name: '',
    address: '',
    city: '',
    phone: '',
  });
  const [holidayForm, setHolidayForm] = useState({
    name: '',
    date: '',
    type: HolidayType.NATIONAL,
    isRecurring: false,
  });

  // Update form when settings load
  useEffect(() => {
    if (settings) {
      setFormData({
        legalName: settings.legalName || '',
        displayName: settings.displayName || '',
        country: settings.country || '',
        city: settings.city || '',
        hrEmail: settings.hrEmail || '',
        phone: settings.phone || '',
        language: settings.language || 'fr',
        timezone: settings.timezone || 'Africa/Casablanca',
        firstDayOfWeek: settings.firstDayOfWeek || 'Lundi',
        lateToleranceEntry: settings.lateToleranceEntry || 10,
        earlyToleranceExit: settings.earlyToleranceExit || 5,
        overtimeRounding: settings.overtimeRounding || 15,
        nightShiftStart: settings.nightShiftStart || '21:00',
        nightShiftEnd: settings.nightShiftEnd || '06:00',
        twoLevelWorkflow: settings.twoLevelWorkflow ?? true,
        anticipatedLeave: settings.anticipatedLeave ?? false,
        monthlyPayrollEmail: settings.monthlyPayrollEmail ?? false,
        sfptExport: settings.sfptExport ?? false,
      });
    }
  }, [settings]);

  const handleSaveSettings = async () => {
    if (!tenantId) {
      toast.error('Tenant ID manquant');
      return;
    }

    await updateSettings.mutateAsync({
      tenantId,
      data: formData,
    });
  };

  const handleRefresh = () => {
    refetchSettings();
    refetchSites();
    refetchHolidays();
    toast.success('Données rechargées');
  };

  const handleCreateSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteForm.code || !siteForm.name) {
      toast.error('Le code et le nom sont requis');
      return;
    }

    await createSite.mutateAsync(siteForm);
    setShowSiteModal(false);
    setSiteForm({ code: '', name: '', address: '', city: '', phone: '' });
  };

  const handleUpdateSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSite) return;

    await updateSite.mutateAsync({
      id: editingSite.id,
      data: siteForm,
    });
    setShowSiteModal(false);
    setEditingSite(null);
    setSiteForm({ code: '', name: '', address: '', city: '', phone: '' });
  };

  const handleDeleteSite = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce site ?')) return;
    await deleteSite.mutateAsync(id);
  };

  const openEditSite = (site: any) => {
    setEditingSite(site);
    setSiteForm({
      code: site.code,
      name: site.name,
      address: site.address || '',
      city: site.city || '',
      phone: site.phone || '',
    });
    setShowSiteModal(true);
  };

  const handleCreateHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holidayForm.name || !holidayForm.date) {
      toast.error('Le nom et la date sont requis');
      return;
    }

    await createHoliday.mutateAsync(holidayForm);
    setShowHolidayModal(false);
    setHolidayForm({ name: '', date: '', type: HolidayType.NATIONAL, isRecurring: false });
  };

  const handleUpdateHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHoliday) return;

    await updateHoliday.mutateAsync({
      id: editingHoliday.id,
      data: holidayForm,
    });
    setShowHolidayModal(false);
    setEditingHoliday(null);
    setHolidayForm({ name: '', date: '', type: HolidayType.NATIONAL, isRecurring: false });
  };

  const handleDeleteHoliday = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce jour férié ?')) return;
    await deleteHoliday.mutateAsync(id);
  };

  const openEditHoliday = (holiday: any) => {
    setEditingHoliday(holiday);
    setHolidayForm({
      name: holiday.name,
      date: holiday.date,
      type: holiday.type,
      isRecurring: holiday.isRecurring,
    });
    setShowHolidayModal(true);
  };

  const handleImportHolidays = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    await importHolidays.mutateAsync(file);
    e.target.value = ''; // Reset input
  };

  const sites = sitesData?.data || [];
  const holidays = holidaysData?.data || [];

  if (settingsLoading || sitesLoading || holidaysLoading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#0052CC]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-[1800px] mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-[28px] font-bold text-[#212529]">Paramètres entreprise</h1>
              <p className="text-[14px] text-[#6C757D] mt-1">
                Configurer les informations, horaires, sites et jours fériés de votre entreprise
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 text-[#212529] rounded-lg hover:bg-gray-50 transition-colors text-[14px] font-medium"
              >
                <RefreshCw className="w-4 h-4" />
                Recharger
              </button>

              <button
                onClick={handleSaveSettings}
                disabled={updateSettings.isPending}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#0052CC] text-white rounded-lg hover:bg-[#0041A8] transition-colors text-[14px] font-semibold disabled:opacity-50"
              >
                {updateSettings.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : null}
                Enregistrer les modifications
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1800px] mx-auto px-6 py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Left Column - Configuration */}
          <div className="col-span-7 space-y-6">
            {/* Company Information */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-[18px] font-semibold text-[#212529]">
                  Informations entreprise
                </h2>
                <p className="text-[13px] text-[#6C757D] mt-0.5">
                  Nom, identité visuelle et contacts principaux
                </p>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[13px] font-medium text-[#6C757D] mb-1.5">
                      Nom légal de l'entreprise
                    </label>
                    <input
                      type="text"
                      value={formData.legalName}
                      onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
                      className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
                    />
                  </div>

                  <div>
                    <label className="block text-[13px] font-medium text-[#6C757D] mb-1.5">
                      Nom affiché dans l'application
                    </label>
                    <input
                      type="text"
                      value={formData.displayName}
                      onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                      className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
                    />
                  </div>

                  <div>
                    <label className="block text-[13px] font-medium text-[#6C757D] mb-1.5">
                      Pays
                    </label>
                    <input
                      type="text"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
                    />
                  </div>

                  <div>
                    <label className="block text-[13px] font-medium text-[#6C757D] mb-1.5">
                      Ville principale
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
                    />
                  </div>

                  <div>
                    <label className="block text-[13px] font-medium text-[#6C757D] mb-1.5">
                      Email de contact RH
                    </label>
                    <input
                      type="email"
                      value={formData.hrEmail}
                      onChange={(e) => setFormData({ ...formData, hrEmail: e.target.value })}
                      className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
                    />
                  </div>

                  <div>
                    <label className="block text-[13px] font-medium text-[#6C757D] mb-1.5">
                      Téléphone
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Regional Settings */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-[18px] font-semibold text-[#212529]">
                  Fuseau horaire & paramètres régionaux
                </h2>
                <p className="text-[13px] text-[#6C757D] mt-0.5">
                  Heure locale, format de date et semaine de travail
                </p>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[13px] font-medium text-[#6C757D] mb-1.5">
                      Fuseau horaire
                    </label>
                    <select
                      value={formData.timezone}
                      onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                      className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
                    >
                      <option value="Africa/Casablanca">Africa/Casablanca (UTC+1)</option>
                      <option value="Europe/Paris">Europe/Paris (UTC+1)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[13px] font-medium text-[#6C757D] mb-1.5">
                      Langue par défaut
                    </label>
                    <select
                      value={formData.language}
                      onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                      className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
                    >
                      <option value="fr">Français</option>
                      <option value="en">English</option>
                      <option value="ar">العربية</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[13px] font-medium text-[#6C757D] mb-1.5">
                      Premier jour de la semaine
                    </label>
                    <select
                      value={formData.firstDayOfWeek}
                      onChange={(e) => setFormData({ ...formData, firstDayOfWeek: e.target.value })}
                      className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
                    >
                      <option value="Lundi">Lundi</option>
                      <option value="Dimanche">Dimanche</option>
                      <option value="Samedi">Samedi</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Time Policy */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-[18px] font-semibold text-[#212529]">
                  Politique horaire & tolérances
                </h2>
                <p className="text-[13px] text-[#6C757D] mt-0.5">
                  Règles de calcul des retards et heures supplémentaires
                </p>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[13px] font-medium text-[#6C757D] mb-1.5">
                      Tolérance retard à l'entrée (minutes)
                    </label>
                    <input
                      type="number"
                      value={formData.lateToleranceEntry}
                      onChange={(e) => setFormData({ ...formData, lateToleranceEntry: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
                    />
                  </div>

                  <div>
                    <label className="block text-[13px] font-medium text-[#6C757D] mb-1.5">
                      Tolérance départ anticipé (minutes)
                    </label>
                    <input
                      type="number"
                      value={formData.earlyToleranceExit}
                      onChange={(e) => setFormData({ ...formData, earlyToleranceExit: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
                    />
                  </div>

                  <div>
                    <label className="block text-[13px] font-medium text-[#6C757D] mb-1.5">
                      Arrondi des heures sup (minutes)
                    </label>
                    <select
                      value={formData.overtimeRounding}
                      onChange={(e) => setFormData({ ...formData, overtimeRounding: parseInt(e.target.value) })}
                      className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
                    >
                      <option value="15">15 minutes</option>
                      <option value="30">30 minutes</option>
                      <option value="60">60 minutes</option>
                    </select>
                  </div>

                  <div className="col-span-2 grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[13px] font-medium text-[#6C757D] mb-1.5">
                        Début de nuit
                      </label>
                      <input
                        type="time"
                        value={formData.nightShiftStart}
                        onChange={(e) => setFormData({ ...formData, nightShiftStart: e.target.value })}
                        className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
                      />
                    </div>
                    <div>
                      <label className="block text-[13px] font-medium text-[#6C757D] mb-1.5">
                        Fin de nuit
                      </label>
                      <input
                        type="time"
                        value={formData.nightShiftEnd}
                        onChange={(e) => setFormData({ ...formData, nightShiftEnd: e.target.value })}
                        className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
                      />
                    </div>
                  </div>
                </div>

                {/* Leave Rules */}
                <div>
                  <label className="block text-[13px] font-medium text-[#6C757D] mb-3">
                    Règles de congés & validation
                  </label>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <div className="text-[14px] font-semibold text-[#212529]">
                          Workflow à 2 niveaux
                        </div>
                        <div className="text-[12px] text-[#6C757D] mt-0.5">
                          Validation par manager puis service RH
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={formData.twoLevelWorkflow}
                        onChange={(e) => setFormData({ ...formData, twoLevelWorkflow: e.target.checked })}
                        className="w-11 h-6"
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <div className="text-[14px] font-semibold text-[#212529]">
                          Autoriser la prise anticipée de congés
                        </div>
                        <div className="text-[12px] text-[#6C757D] mt-0.5">
                          Permet un solde négatif
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={formData.anticipatedLeave}
                        onChange={(e) => setFormData({ ...formData, anticipatedLeave: e.target.checked })}
                        className="w-11 h-6"
                      />
                    </div>
                  </div>
                </div>

                {/* Export Settings */}
                <div>
                  <label className="block text-[13px] font-medium text-[#6C757D] mb-3">
                    Exports automatiques
                  </label>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <div className="text-[14px] font-semibold text-[#212529]">
                          Envoyer l'export paie mensuel par email
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={formData.monthlyPayrollEmail}
                        onChange={(e) => setFormData({ ...formData, monthlyPayrollEmail: e.target.checked })}
                        className="w-11 h-6"
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <div className="text-[14px] font-semibold text-[#212529]">
                          Activer l'export vers SFTP
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={formData.sfptExport}
                        onChange={(e) => setFormData({ ...formData, sfptExport: e.target.checked })}
                        className="w-11 h-6"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Sites & Holidays */}
          <div className="col-span-5 space-y-6">
            {/* Sites Management */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-[18px] font-semibold text-[#212529]">Sites</h2>
                    <p className="text-[13px] text-[#6C757D] mt-0.5">
                      Gérer les différents sites de l'entreprise
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setEditingSite(null);
                      setSiteForm({ code: '', name: '', address: '', city: '', phone: '' });
                      setShowSiteModal(true);
                    }}
                    className="flex items-center gap-2 px-3 py-2 bg-[#0052CC] text-white rounded-lg hover:bg-[#0041A8] text-[13px] font-semibold"
                  >
                    <Plus className="w-4 h-4" />
                    Nouveau site
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-2 max-h-[400px] overflow-y-auto">
                {sites.length === 0 ? (
                  <div className="text-center py-8 text-[#6C757D]">
                    <Building2 className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p className="text-[14px]">Aucun site</p>
                  </div>
                ) : (
                  sites.map((site: any) => (
                    <div
                      key={site.id}
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      <div>
                        <div className="text-[14px] font-semibold text-[#212529]">{site.name}</div>
                        <div className="text-[12px] text-[#6C757D]">Code: {site.code}</div>
                        {site.city && <div className="text-[12px] text-[#6C757D]">{site.city}</div>}
                        {site._count && (
                          <div className="text-[11px] text-[#6C757D] mt-1">
                            {site._count.employees} employés · {site._count.devices} terminaux
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEditSite(site)}
                          className="p-2 text-[#6C757D] hover:text-[#0052CC]"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteSite(site.id)}
                          className="p-2 text-[#6C757D] hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Holidays Management */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-[18px] font-semibold text-[#212529]">Jours fériés</h2>
                    <p className="text-[13px] text-[#6C757D] mt-0.5">
                      Calendrier des jours fériés ({holidays.length})
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <label className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 text-[#212529] rounded-lg hover:bg-gray-50 cursor-pointer text-[13px] font-medium">
                      <Upload className="w-4 h-4" />
                      Importer
                      <input
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        onChange={handleImportHolidays}
                        className="hidden"
                      />
                    </label>
                    <button
                      onClick={() => {
                        setEditingHoliday(null);
                        setHolidayForm({ name: '', date: '', type: HolidayType.NATIONAL, isRecurring: false });
                        setShowHolidayModal(true);
                      }}
                      className="flex items-center gap-2 px-3 py-2 bg-[#0052CC] text-white rounded-lg hover:bg-[#0041A8] text-[13px] font-semibold"
                    >
                      <Plus className="w-4 h-4" />
                      Ajouter
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-2 max-h-[400px] overflow-y-auto">
                {holidays.length === 0 ? (
                  <div className="text-center py-8 text-[#6C757D]">
                    <Calendar className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p className="text-[14px]">Aucun jour férié</p>
                  </div>
                ) : (
                  holidays.map((holiday: any) => (
                    <div
                      key={holiday.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`px-2.5 py-1 rounded text-[11px] font-semibold ${
                            holiday.type === 'NATIONAL'
                              ? 'bg-blue-100 text-blue-800'
                              : holiday.type === 'RELIGIOUS'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {holiday.type}
                        </span>
                        <span className="text-[13px] text-[#212529]">{holiday.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] text-[#6C757D]">
                          {new Date(holiday.date).toLocaleDateString('fr-FR')}
                        </span>
                        <button
                          onClick={() => openEditHoliday(holiday)}
                          className="text-[#6C757D] hover:text-[#0052CC]"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteHoliday(holiday.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Site Modal */}
      {showSiteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full mx-4">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-[18px] font-semibold">
                {editingSite ? 'Modifier le site' : 'Nouveau site'}
              </h3>
            </div>
            <form onSubmit={editingSite ? handleUpdateSite : handleCreateSite} className="p-6 space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-[#6C757D] mb-1.5">
                  Code *
                </label>
                <input
                  type="text"
                  value={siteForm.code}
                  onChange={(e) => setSiteForm({ ...siteForm, code: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
                  required
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#6C757D] mb-1.5">
                  Nom *
                </label>
                <input
                  type="text"
                  value={siteForm.name}
                  onChange={(e) => setSiteForm({ ...siteForm, name: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
                  required
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#6C757D] mb-1.5">
                  Adresse
                </label>
                <input
                  type="text"
                  value={siteForm.address}
                  onChange={(e) => setSiteForm({ ...siteForm, address: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#6C757D] mb-1.5">
                  Ville
                </label>
                <input
                  type="text"
                  value={siteForm.city}
                  onChange={(e) => setSiteForm({ ...siteForm, city: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#6C757D] mb-1.5">
                  Téléphone
                </label>
                <input
                  type="tel"
                  value={siteForm.phone}
                  onChange={(e) => setSiteForm({ ...siteForm, phone: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowSiteModal(false);
                    setEditingSite(null);
                  }}
                  className="flex-1 px-4 py-2.5 bg-white border border-gray-300 text-[#212529] rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-[#0052CC] text-white rounded-lg hover:bg-[#0041A8]"
                >
                  {editingSite ? 'Modifier' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Holiday Modal */}
      {showHolidayModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full mx-4">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-[18px] font-semibold">
                {editingHoliday ? 'Modifier le jour férié' : 'Nouveau jour férié'}
              </h3>
            </div>
            <form onSubmit={editingHoliday ? handleUpdateHoliday : handleCreateHoliday} className="p-6 space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-[#6C757D] mb-1.5">
                  Nom *
                </label>
                <input
                  type="text"
                  value={holidayForm.name}
                  onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
                  required
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#6C757D] mb-1.5">
                  Date *
                </label>
                <input
                  type="date"
                  value={holidayForm.date}
                  onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
                  required
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#6C757D] mb-1.5">
                  Type
                </label>
                <select
                  value={holidayForm.type}
                  onChange={(e) => setHolidayForm({ ...holidayForm, type: e.target.value as HolidayType })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
                >
                  <option value={HolidayType.NATIONAL}>National</option>
                  <option value={HolidayType.RELIGIOUS}>Religieux</option>
                  <option value={HolidayType.COMPANY}>Entreprise</option>
                </select>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isRecurring"
                  checked={holidayForm.isRecurring}
                  onChange={(e) => setHolidayForm({ ...holidayForm, isRecurring: e.target.checked })}
                  className="mr-2"
                />
                <label htmlFor="isRecurring" className="text-[13px] text-[#6C757D]">
                  Récurrent chaque année
                </label>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowHolidayModal(false);
                    setEditingHoliday(null);
                  }}
                  className="flex-1 px-4 py-2.5 bg-white border border-gray-300 text-[#212529] rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-[#0052CC] text-white rounded-lg hover:bg-[#0041A8]"
                >
                  {editingHoliday ? 'Modifier' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
