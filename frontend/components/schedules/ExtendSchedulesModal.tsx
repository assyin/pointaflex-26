'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  X,
  Calendar,
  Users,
  CheckCircle,
  AlertCircle,
  Eye,
  Loader2,
  Search,
  TrendingUp,
  Building2,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import { useEmployees } from '@/lib/hooks/useEmployees';
import { useDepartments } from '@/lib/hooks/useDepartments';
import {
  schedulesApi,
  type ExtendMode,
  type ExtendPreviewResponse,
  type ExtendPreviewEmployee,
} from '@/lib/api/schedules';
import { translateErrorMessage } from '@/lib/utils/errorMessages';
import { format, parseISO, addMonths } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ExtendSchedulesModalProps {
  onClose: () => void;
  onSuccess: () => void;
  defaultDepartmentId?: string;
}

export function ExtendSchedulesModal({
  onClose,
  onSuccess,
  defaultDepartmentId,
}: ExtendSchedulesModalProps) {
  // Form state
  const [mode, setMode] = useState<ExtendMode>('all');
  const [departmentId, setDepartmentId] = useState(defaultDepartmentId || '');
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<Set<string>>(new Set());
  const [singleEmployeeId, setSingleEmployeeId] = useState('');
  const [fromDate, setFromDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [toDate, setToDate] = useState(format(addMonths(new Date(), 1), 'yyyy-MM-dd'));
  const [respectLeaves, setRespectLeaves] = useState(true);
  const [respectRecoveryDays, setRespectRecoveryDays] = useState(true);
  const [overwriteExisting, setOverwriteExisting] = useState(false);

  // UI state
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [preview, setPreview] = useState<ExtendPreviewResponse | null>(null);
  const [step, setStep] = useState<'config' | 'employees' | 'preview'>('config');
  const [searchQuery, setSearchQuery] = useState('');

  // Data fetching
  const { data: employeesData } = useEmployees({ limit: 500 });
  const { data: departmentsData } = useDepartments();

  const employees = useMemo(() => {
    const list = employeesData?.data || employeesData || [];
    if (mode === 'department' && departmentId) {
      return list.filter((e: any) => e.departmentId === departmentId);
    }
    return list;
  }, [employeesData, mode, departmentId]);

  const filteredEmployees = useMemo(() => {
    if (!searchQuery.trim()) return employees;
    const query = searchQuery.toLowerCase().trim();
    return employees.filter((e: any) => {
      const fullName = `${e.firstName || ''} ${e.lastName || ''}`.toLowerCase();
      const matricule = (e.matricule || '').toLowerCase();
      return fullName.includes(query) || matricule.includes(query);
    });
  }, [employees, searchQuery]);

  const departments = useMemo(() => {
    return departmentsData || [];
  }, [departmentsData]);

  const handleSelectAll = (select: boolean) => {
    if (select) {
      const ids = new Set<string>(filteredEmployees.map((e: any) => e.id));
      setSelectedEmployeeIds(ids);
    } else {
      setSelectedEmployeeIds(new Set<string>());
    }
  };

  const handleEmployeeToggle = (employeeId: string) => {
    const newSet = new Set(selectedEmployeeIds);
    if (newSet.has(employeeId)) {
      newSet.delete(employeeId);
    } else {
      newSet.add(employeeId);
    }
    setSelectedEmployeeIds(newSet);
  };

  const buildDto = () => {
    const base = {
      mode,
      fromDate,
      toDate,
      respectLeaves,
      respectRecoveryDays,
      overwriteExisting,
    };

    switch (mode) {
      case 'department':
        return { ...base, departmentId };
      case 'employees':
        return { ...base, employeeIds: Array.from(selectedEmployeeIds) };
      case 'employee':
        return { ...base, employeeId: singleEmployeeId };
      default:
        return base;
    }
  };

  const handlePreview = async () => {
    if (!validateForm()) return;

    setIsPreviewing(true);
    try {
      const result = await schedulesApi.previewExtendSchedules(buildDto());
      setPreview(result);
      setStep('preview');
    } catch (error: any) {
      toast.error(translateErrorMessage(error));
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleGenerate = async () => {
    if (!validateForm()) return;

    setIsGenerating(true);
    try {
      const result = await schedulesApi.extendSchedules(buildDto());
      const successCount = result?.success ?? 0;

      setIsGenerating(false);

      if (successCount > 0) {
        toast.success(`Prolongation terminée: ${successCount} planning(s) créé(s)`);
        // Fermer le modal avec un léger délai pour s'assurer que le state est mis à jour
        setTimeout(() => {
          onClose();
          onSuccess();
        }, 100);
        return;
      } else {
        toast.warning(result?.message || 'Aucun planning créé');
      }
    } catch (error: any) {
      toast.error(translateErrorMessage(error));
      setIsGenerating(false);
    }
  };

  const validateForm = (): boolean => {
    if (!fromDate || !toDate) {
      toast.error('Veuillez sélectionner une plage de dates');
      return false;
    }
    if (new Date(fromDate) > new Date(toDate)) {
      toast.error('La date de début doit être avant la date de fin');
      return false;
    }
    if (mode === 'department' && !departmentId) {
      toast.error('Veuillez sélectionner un département');
      return false;
    }
    if (mode === 'employees' && selectedEmployeeIds.size === 0) {
      toast.error('Veuillez sélectionner au moins un employé');
      return false;
    }
    if (mode === 'employee' && !singleEmployeeId) {
      toast.error('Veuillez sélectionner un employé');
      return false;
    }
    return true;
  };

  const getModeIcon = (m: ExtendMode) => {
    switch (m) {
      case 'all':
        return <Users className="h-5 w-5" />;
      case 'department':
        return <Building2 className="h-5 w-5" />;
      case 'employees':
        return <Users className="h-5 w-5" />;
      case 'employee':
        return <User className="h-5 w-5" />;
    }
  };

  const getModeLabel = (m: ExtendMode) => {
    switch (m) {
      case 'all':
        return 'Tous les employés';
      case 'department':
        return 'Par département';
      case 'employees':
        return 'Sélection multiple';
      case 'employee':
        return 'Un seul employé';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-auto">
        <CardHeader className="flex flex-row items-center justify-between sticky top-0 bg-white z-10 border-b">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Prolonger les Plannings Rotatifs
          </CardTitle>
          <Button variant="outline" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-6 pt-4">
          {/* Step indicator */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <div
              className={`flex items-center gap-2 cursor-pointer ${step === 'config' ? 'text-primary font-semibold' : 'text-gray-400'}`}
              onClick={() => setStep('config')}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'config' ? 'bg-primary text-white' : 'bg-gray-200'}`}
              >
                1
              </div>
              <span>Configuration</span>
            </div>
            <div className="w-12 h-0.5 bg-gray-300" />
            <div
              className={`flex items-center gap-2 cursor-pointer ${step === 'employees' ? 'text-primary font-semibold' : 'text-gray-400'}`}
              onClick={() => mode === 'employees' && step !== 'config' && setStep('employees')}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'employees' ? 'bg-primary text-white' : 'bg-gray-200'}`}
              >
                2
              </div>
              <span>Employés</span>
            </div>
            <div className="w-12 h-0.5 bg-gray-300" />
            <div
              className={`flex items-center gap-2 ${step === 'preview' ? 'text-primary font-semibold' : 'text-gray-400'}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'preview' ? 'bg-primary text-white' : 'bg-gray-200'}`}
              >
                3
              </div>
              <span>Aperçu</span>
            </div>
          </div>

          {/* Step 1: Configuration */}
          {step === 'config' && (
            <div className="space-y-6">
              {/* Mode selection */}
              <div>
                <label className="block text-sm font-medium mb-3">Mode de prolongation</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {(['all', 'department', 'employees', 'employee'] as ExtendMode[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => setMode(m)}
                      className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                        mode === m
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {getModeIcon(m)}
                      <span className="text-sm font-medium text-center">{getModeLabel(m)}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Department selection (if mode === department) */}
              {mode === 'department' && (
                <div>
                  <label className="block text-sm font-medium mb-2">Département</label>
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                  >
                    <option value="">-- Sélectionner un département --</option>
                    {departments.map((dept: any) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Single employee selection (if mode === employee) */}
              {mode === 'employee' && (
                <div>
                  <label className="block text-sm font-medium mb-2">Employé</label>
                  <select
                    value={singleEmployeeId}
                    onChange={(e) => setSingleEmployeeId(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                  >
                    <option value="">-- Sélectionner un employé --</option>
                    {employees.map((emp: any) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.matricule} - {emp.firstName} {emp.lastName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Date range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Prolonger à partir du</label>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Jusqu'au</label>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    min={fromDate}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <Alert className="bg-blue-50 border-blue-200">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  Le système détecte automatiquement le pattern de rotation (ex: 4j travail / 2j repos)
                  de chaque employé et prolonge le planning en respectant ce cycle.
                </AlertDescription>
              </Alert>

              {/* Options */}
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={respectLeaves}
                    onChange={(e) => setRespectLeaves(e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm">Respecter les congés approuvés</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={respectRecoveryDays}
                    onChange={(e) => setRespectRecoveryDays(e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm">Respecter les jours de récupération</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={overwriteExisting}
                    onChange={(e) => setOverwriteExisting(e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm">Écraser les plannings existants</span>
                </label>
              </div>

              <div className="flex justify-end pt-4">
                {mode === 'employees' ? (
                  <Button onClick={() => setStep('employees')}>
                    Suivant: Sélectionner les employés
                  </Button>
                ) : (
                  <Button onClick={handlePreview} disabled={isPreviewing}>
                    {isPreviewing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Chargement...
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4 mr-2" />
                        Aperçu
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Employee Selection (only for mode === 'employees') */}
          {step === 'employees' && (
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher par matricule ou nom..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Select all */}
              <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                <span className="text-sm font-medium">
                  {selectedEmployeeIds.size} employé(s) sélectionné(s) sur {employees.length}
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleSelectAll(true)}>
                    Tout sélectionner
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleSelectAll(false)}>
                    Tout désélectionner
                  </Button>
                </div>
              </div>

              {/* Employee list */}
              <div className="max-h-80 overflow-auto border rounded-lg">
                <table className="w-full">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium">Sélection</th>
                      <th className="px-4 py-2 text-left text-sm font-medium">Matricule</th>
                      <th className="px-4 py-2 text-left text-sm font-medium">Nom</th>
                      <th className="px-4 py-2 text-left text-sm font-medium">Département</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmployees.map((emp: any) => (
                      <tr
                        key={emp.id}
                        className={`border-t hover:bg-gray-50 ${selectedEmployeeIds.has(emp.id) ? 'bg-blue-50' : ''}`}
                      >
                        <td className="px-4 py-2">
                          <input
                            type="checkbox"
                            checked={selectedEmployeeIds.has(emp.id)}
                            onChange={() => handleEmployeeToggle(emp.id)}
                            className="w-4 h-4 rounded"
                          />
                        </td>
                        <td className="px-4 py-2 text-sm font-mono">{emp.matricule}</td>
                        <td className="px-4 py-2 text-sm">
                          {emp.firstName} {emp.lastName}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-600">
                          {emp.department?.name || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep('config')}>
                  Retour
                </Button>
                <Button onClick={handlePreview} disabled={isPreviewing || selectedEmployeeIds.size === 0}>
                  {isPreviewing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Préparation...
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      Aperçu
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Preview */}
          {step === 'preview' && preview && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-700">
                    {preview.summary.totalRotationEmployees}
                  </div>
                  <div className="text-sm text-blue-600">Employés avec rotation</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-700">
                    {preview.summary.totalSchedulesToCreate}
                  </div>
                  <div className="text-sm text-green-600">Plannings à créer</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-purple-700">
                    {preview.summary.groups.length}
                  </div>
                  <div className="text-sm text-purple-600">Groupes de phase</div>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-orange-700">
                    {preview.summary.withLeaveExclusions}
                  </div>
                  <div className="text-sm text-orange-600">Avec exclusions</div>
                </div>
              </div>

              {preview.summary.totalRotationEmployees === 0 ? (
                <Alert className="bg-yellow-50 border-yellow-200">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-800">
                    Aucun employé avec un pattern de rotation détecté. Assurez-vous que les employés
                    ont des plannings existants avec un cycle régulier (ex: 4j travail / 2j repos).
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <Alert className="bg-green-50 border-green-200">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      <strong>{preview.summary.totalSchedulesToCreate} plannings</strong> seront créés
                      pour {preview.summary.totalRotationEmployees} employé(s) du{' '}
                      {format(parseISO(fromDate), 'dd/MM/yyyy', { locale: fr })} au{' '}
                      {format(parseISO(toDate), 'dd/MM/yyyy', { locale: fr })}
                    </AlertDescription>
                  </Alert>

                  {/* Preview table */}
                  <div className="max-h-96 overflow-auto border rounded-lg">
                    {preview.employees.map((emp) => (
                      <div key={emp.employeeId} className="border-b last:border-0">
                        <div className="bg-gray-50 px-4 py-2 font-medium flex flex-wrap justify-between gap-2">
                          <span>
                            {emp.employeeName} ({emp.matricule})
                          </span>
                          <span className="text-sm text-gray-600">
                            Pattern: {emp.detectedPattern.workDays}T/{emp.detectedPattern.restDays}R |
                            Shift: {emp.detectedPattern.shiftName} |
                            {emp.scheduleDates.length} jours
                            {emp.excludedDates.length > 0 && (
                              <span className="text-orange-600 ml-2">
                                ({emp.excludedDates.length} exclus)
                              </span>
                            )}
                          </span>
                        </div>
                        <div className="px-4 py-2 flex flex-wrap gap-1">
                          {emp.scheduleDates.slice(0, 31).map((date) => (
                            <div
                              key={date}
                              className="w-8 h-8 flex items-center justify-center text-xs rounded bg-green-100 text-green-800 font-medium"
                              title={format(parseISO(date), 'EEEE dd/MM', { locale: fr })}
                            >
                              {format(parseISO(date), 'd')}
                            </div>
                          ))}
                          {emp.scheduleDates.length > 31 && (
                            <span className="text-sm text-gray-500 self-center ml-2">
                              +{emp.scheduleDates.length - 31} jours
                            </span>
                          )}
                        </div>
                        {emp.excludedDates.length > 0 && (
                          <div className="px-4 py-2 bg-orange-50 text-sm text-orange-700">
                            <strong>Exclusions:</strong>{' '}
                            {emp.excludedDates.slice(0, 5).map((ed) => (
                              <span key={ed.date} className="mr-2">
                                {format(parseISO(ed.date), 'dd/MM')} ({ed.reason === 'APPROVED_LEAVE' ? 'Congé' : 'Récup'})
                              </span>
                            ))}
                            {emp.excludedDates.length > 5 && (
                              <span>+{emp.excludedDates.length - 5} autres</span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div className="flex justify-between pt-4">
                <Button
                  variant="outline"
                  onClick={() => setStep(mode === 'employees' ? 'employees' : 'config')}
                >
                  Retour
                </Button>
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating || preview.summary.totalSchedulesToCreate === 0}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Génération...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Confirmer et Prolonger
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
