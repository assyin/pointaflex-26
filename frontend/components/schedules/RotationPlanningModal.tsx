'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  X,
  RotateCcw,
  Calendar,
  Users,
  CheckCircle,
  AlertCircle,
  Eye,
  Loader2,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';
import { useShifts } from '@/lib/hooks/useShifts';
import { useEmployees } from '@/lib/hooks/useEmployees';
import { schedulesApi, type RotationPreviewResponse } from '@/lib/api/schedules';
import { translateErrorMessage } from '@/lib/utils/errorMessages';
import { format, parseISO, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';

interface RotationPlanningModalProps {
  onClose: () => void;
  onSuccess: () => void;
  defaultDepartmentId?: string;
}

interface EmployeeSelection {
  employeeId: string;
  startDate: string;
  selected: boolean;
}

export function RotationPlanningModal({
  onClose,
  onSuccess,
  defaultDepartmentId,
}: RotationPlanningModalProps) {
  // Form state
  const [workDays, setWorkDays] = useState(4);
  const [restDays, setRestDays] = useState(2);
  const [shiftId, setShiftId] = useState('');
  const [endDate, setEndDate] = useState('');
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [respectLeaves, setRespectLeaves] = useState(true);
  const [respectRecoveryDays, setRespectRecoveryDays] = useState(true);
  const [departmentFilter, setDepartmentFilter] = useState(defaultDepartmentId || '');

  // Employee selections
  const [employeeSelections, setEmployeeSelections] = useState<Map<string, EmployeeSelection>>(
    new Map()
  );
  const [globalStartDate, setGlobalStartDate] = useState('');

  // UI state
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [preview, setPreview] = useState<RotationPreviewResponse | null>(null);
  const [step, setStep] = useState<'config' | 'employees' | 'preview'>('config');
  const [searchQuery, setSearchQuery] = useState('');

  // Data fetching
  const { data: shiftsData } = useShifts();
  const { data: employeesData } = useEmployees({ limit: 500 });

  const shifts = Array.isArray(shiftsData) ? shiftsData : (shiftsData?.data || []);

  // All employees (for selections tracking)
  const allEmployees = useMemo(() => {
    const list = employeesData?.data || employeesData || [];
    if (departmentFilter) {
      return list.filter((e: any) => e.departmentId === departmentFilter);
    }
    return list;
  }, [employeesData, departmentFilter]);

  // Filtered employees for display (with search)
  const employees = useMemo(() => {
    if (!searchQuery.trim()) return allEmployees;
    const query = searchQuery.toLowerCase().trim();
    return allEmployees.filter((e: any) => {
      const fullName = `${e.firstName || ''} ${e.lastName || ''}`.toLowerCase();
      const matricule = (e.matricule || '').toLowerCase();
      return fullName.includes(query) || matricule.includes(query);
    });
  }, [allEmployees, searchQuery]);

  // Get unique departments
  const departments = useMemo(() => {
    const deptMap = new Map();
    const list = employeesData?.data || employeesData || [];
    list.forEach((emp: any) => {
      if (emp.department) {
        deptMap.set(emp.departmentId, emp.department);
      }
    });
    return Array.from(deptMap.values());
  }, [employeesData]);

  // Selected employees
  const selectedEmployees = useMemo(() => {
    return Array.from(employeeSelections.values()).filter((e) => e.selected);
  }, [employeeSelections]);

  // Initialize employee selections when employees change (use allEmployees to track all, not just filtered)
  React.useEffect(() => {
    if (allEmployees.length === 0) return;

    setEmployeeSelections((prevSelections) => {
      const newSelections = new Map<string, EmployeeSelection>();
      allEmployees.forEach((emp: any) => {
        const existing = prevSelections.get(emp.id);
        newSelections.set(emp.id, {
          employeeId: emp.id,
          startDate: existing?.startDate || globalStartDate || '',
          selected: existing?.selected || false,
        });
      });
      return newSelections;
    });
  }, [allEmployees, globalStartDate]);

  const handleSelectAll = (select: boolean) => {
    const newSelections = new Map(employeeSelections);
    // Get IDs of currently visible employees (filtered by search)
    const visibleIds = new Set(employees.map((e: any) => e.id));

    newSelections.forEach((selection, employeeId) => {
      // Only affect visible employees when search is active
      if (visibleIds.has(employeeId)) {
        selection.selected = select;
        if (select && !selection.startDate && globalStartDate) {
          selection.startDate = globalStartDate;
        }
      }
    });
    setEmployeeSelections(new Map(newSelections));
  };

  const handleEmployeeToggle = (employeeId: string) => {
    const newSelections = new Map(employeeSelections);
    const selection = newSelections.get(employeeId);
    if (selection) {
      selection.selected = !selection.selected;
      if (selection.selected && !selection.startDate && globalStartDate) {
        selection.startDate = globalStartDate;
      }
      newSelections.set(employeeId, selection);
      setEmployeeSelections(newSelections);
    }
  };

  const handleEmployeeStartDateChange = (employeeId: string, date: string) => {
    const newSelections = new Map(employeeSelections);
    const selection = newSelections.get(employeeId);
    if (selection) {
      selection.startDate = date;
      newSelections.set(employeeId, selection);
      setEmployeeSelections(newSelections);
    }
  };

  const applyGlobalStartDate = () => {
    if (!globalStartDate) return;
    const newSelections = new Map(employeeSelections);
    newSelections.forEach((selection) => {
      if (selection.selected) {
        selection.startDate = globalStartDate;
      }
    });
    setEmployeeSelections(new Map(newSelections));
    toast.success('Date de début appliquée à tous les employés sélectionnés');
  };

  const handlePreview = async () => {
    if (!validateForm()) return;

    setIsPreviewing(true);
    try {
      const result = await schedulesApi.previewRotationPlanning({
        workDays,
        restDays,
        endDate,
        employees: selectedEmployees.map((e) => ({
          employeeId: e.employeeId,
          startDate: e.startDate,
        })),
      });
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
      const result = await schedulesApi.generateRotationPlanning({
        workDays,
        restDays,
        shiftId,
        endDate,
        employees: selectedEmployees.map((e) => ({
          employeeId: e.employeeId,
          startDate: e.startDate,
        })),
        overwriteExisting,
        respectLeaves,
        respectRecoveryDays,
      });

      if (result.data) {
        toast.success(result.message);
        onSuccess();
        onClose();
      }
    } catch (error: any) {
      toast.error(translateErrorMessage(error));
    } finally {
      setIsGenerating(false);
    }
  };

  const validateForm = (): boolean => {
    if (!shiftId) {
      toast.error('Veuillez sélectionner un shift');
      return false;
    }
    if (!endDate) {
      toast.error('Veuillez sélectionner une date de fin');
      return false;
    }
    if (selectedEmployees.length === 0) {
      toast.error('Veuillez sélectionner au moins un employé');
      return false;
    }
    const missingDates = selectedEmployees.filter((e) => !e.startDate);
    if (missingDates.length > 0) {
      toast.error('Tous les employés sélectionnés doivent avoir une date de début');
      return false;
    }
    return true;
  };

  const cycleLength = workDays + restDays;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    >
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-auto">
        <CardHeader className="flex flex-row items-center justify-between sticky top-0 bg-white z-10 border-b">
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            Génération Planning Rotatif ({workDays}/{restDays})
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
              onClick={() => step !== 'config' && setStep('employees')}
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
              {/* Pattern */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Jours de travail consécutifs
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={7}
                    value={workDays}
                    onChange={(e) => setWorkDays(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Jours de repos consécutifs</label>
                  <input
                    type="number"
                    min={1}
                    max={7}
                    value={restDays}
                    onChange={(e) => setRestDays(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <Alert className="bg-blue-50 border-blue-200">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  <strong>Cycle: {cycleLength} jours</strong> - {workDays} jour(s) de travail puis{' '}
                  {restDays} jour(s) de repos
                </AlertDescription>
              </Alert>

              {/* Shift selection */}
              <div>
                <label className="block text-sm font-medium mb-2">Shift à appliquer</label>
                <select
                  value={shiftId}
                  onChange={(e) => setShiftId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                >
                  <option value="">-- Sélectionner un shift --</option>
                  {shifts.map((shift: any) => (
                    <option key={shift.id} value={shift.id}>
                      {shift.code} - {shift.name} ({shift.startTime} - {shift.endTime})
                    </option>
                  ))}
                </select>
              </div>

              {/* End date */}
              <div>
                <label className="block text-sm font-medium mb-2">Générer jusqu'au</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Options */}
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={overwriteExisting}
                    onChange={(e) => setOverwriteExisting(e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm">Écraser les plannings existants</span>
                </label>
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
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={() => setStep('employees')} disabled={!shiftId || !endDate}>
                  Suivant: Sélectionner les employés
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Employee Selection */}
          {step === 'employees' && (
            <div className="space-y-4">
              {/* Department filter */}
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-2">Filtrer par département</label>
                  <select
                    value={departmentFilter}
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">Tous les départements</option>
                    {departments.map((dept: any) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-2">
                    Date de début (pour tous)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={globalStartDate}
                      onChange={(e) => setGlobalStartDate(e.target.value)}
                      className="flex-1 px-3 py-2 border rounded-lg"
                    />
                    <Button variant="outline" onClick={applyGlobalStartDate}>
                      Appliquer
                    </Button>
                  </div>
                </div>
              </div>

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
                  {selectedEmployees.length} employé(s) sélectionné(s) sur {allEmployees.length}
                  {searchQuery && ` (${employees.length} affiché(s))`}
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
                      <th className="px-4 py-2 text-left text-sm font-medium">Date début travail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((emp: any) => {
                      const selection = employeeSelections.get(emp.id);
                      return (
                        <tr
                          key={emp.id}
                          className={`border-t hover:bg-gray-50 ${selection?.selected ? 'bg-blue-50' : ''}`}
                        >
                          <td className="px-4 py-2">
                            <input
                              type="checkbox"
                              checked={selection?.selected || false}
                              onChange={() => handleEmployeeToggle(emp.id)}
                              className="w-4 h-4 rounded"
                            />
                          </td>
                          <td className="px-4 py-2 text-sm font-mono">{emp.matricule}</td>
                          <td className="px-4 py-2 text-sm">
                            {emp.firstName} {emp.lastName}
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="date"
                              value={selection?.startDate || ''}
                              onChange={(e) => handleEmployeeStartDateChange(emp.id, e.target.value)}
                              disabled={!selection?.selected}
                              className="px-2 py-1 border rounded text-sm disabled:bg-gray-100"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep('config')}>
                  Retour
                </Button>
                <Button
                  onClick={handlePreview}
                  disabled={isPreviewing || selectedEmployees.length === 0}
                >
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
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <strong>{preview.totalSchedulesToCreate} plannings</strong> seront créés pour{' '}
                  {preview.preview.length} employé(s)
                </AlertDescription>
              </Alert>

              {/* Preview table */}
              <div className="max-h-96 overflow-auto border rounded-lg">
                {preview.preview.map((emp) => (
                  <div key={emp.employeeId} className="border-b last:border-0">
                    <div className="bg-gray-50 px-4 py-2 font-medium flex justify-between">
                      <span>
                        {emp.employeeName} ({emp.matricule})
                      </span>
                      <span className="text-sm text-gray-600">
                        Début: {format(parseISO(emp.startDate), 'dd/MM/yyyy', { locale: fr })} |{' '}
                        {emp.totalWorkDays}T / {emp.totalRestDays}R
                      </span>
                    </div>
                    <div className="px-4 py-2 flex flex-wrap gap-1">
                      {emp.schedule.slice(0, 31).map((day) => (
                        <div
                          key={day.date}
                          className={`w-8 h-8 flex items-center justify-center text-xs rounded ${
                            day.isWorkDay
                              ? 'bg-green-100 text-green-800 font-medium'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                          title={`${day.dayOfWeek} ${format(parseISO(day.date), 'dd/MM')}`}
                        >
                          {format(parseISO(day.date), 'd')}
                        </div>
                      ))}
                      {emp.schedule.length > 31 && (
                        <span className="text-sm text-gray-500 self-center ml-2">
                          +{emp.schedule.length - 31} jours
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-sm text-gray-600">
                <div className="flex gap-4 items-center">
                  <span className="flex items-center gap-1">
                    <div className="w-4 h-4 bg-green-100 rounded" /> Travail
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-4 h-4 bg-gray-100 rounded" /> Repos
                  </span>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep('employees')}>
                  Retour
                </Button>
                <Button onClick={handleGenerate} disabled={isGenerating}>
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Génération...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Confirmer et Générer
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
