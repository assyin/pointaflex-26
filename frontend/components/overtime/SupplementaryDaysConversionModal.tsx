'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { format, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Clock,
  Calendar,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Info,
  Sun,
  Sunrise,
} from 'lucide-react';
import { useSupplementaryDaysCumulativeBalance, useConvertSupplementaryDaysFlexible } from '@/lib/hooks/useRecoveryDays';

interface SupplementaryDaysConversionModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  employeeName: string;
}

export function SupplementaryDaysConversionModal({
  isOpen,
  onClose,
  employeeId,
  employeeName,
}: SupplementaryDaysConversionModalProps) {
  // State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [days, setDays] = useState<number>(1);
  const [autoApprove, setAutoApprove] = useState(false);
  const [allowPastDate, setAllowPastDate] = useState(false);
  const [notes, setNotes] = useState('');

  // Hooks
  const { data: balanceData, isLoading: isLoadingBalance } = useSupplementaryDaysCumulativeBalance(employeeId);
  const convertMutation = useConvertSupplementaryDaysFlexible();

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedIds([]);
      setStartDate(format(new Date(), 'yyyy-MM-dd'));
      setEndDate(format(new Date(), 'yyyy-MM-dd'));
      setDays(1);
      setAutoApprove(false);
      setAllowPastDate(false);
      setNotes('');
    }
  }, [isOpen]);

  // Calculate selected hours and max days
  const { selectedHours, maxPossibleDays, selectedDetails } = useMemo(() => {
    if (!balanceData?.supplementaryDayDetails) {
      return { selectedHours: 0, maxPossibleDays: 0, selectedDetails: [] };
    }

    const selectedDetails = balanceData.supplementaryDayDetails.filter(
      (sd) => selectedIds.includes(sd.id)
    );

    const selectedHours = selectedDetails.reduce(
      (sum, sd) => sum + sd.availableHours,
      0
    );

    const dailyHours = balanceData.dailyWorkingHours || 7.33;
    const rate = balanceData.conversionRate || 1.0;
    // Permettre les fractions de jour (arrondi à 0.5 près)
    const rawDays = (selectedHours * rate) / dailyHours;
    const maxPossibleDays = Math.round(rawDays * 2) / 2; // Arrondi à 0.5 près

    return { selectedHours, maxPossibleDays, selectedDetails };
  }, [balanceData, selectedIds]);

  // Auto-adjust days when selection changes
  useEffect(() => {
    if (maxPossibleDays > 0 && days > maxPossibleDays) {
      setDays(maxPossibleDays);
    }
    // Permettre minimum 0.5 jour (demi-journée)
    if (maxPossibleDays >= 0.5 && days < 0.5) {
      setDays(Math.min(maxPossibleDays, 0.5));
    }
    // Si on a des heures mais pas assez pour 0.5 jour, proposer ce qu'on peut
    if (maxPossibleDays > 0 && maxPossibleDays < 0.5 && days !== maxPossibleDays) {
      setDays(maxPossibleDays);
    }
  }, [maxPossibleDays, days]);

  // Auto-adjust end date based on days
  useEffect(() => {
    if (days > 0 && startDate) {
      const start = new Date(startDate);
      // Pour les fractions de jour (0.5, etc.), la date de fin = date de début
      const daysToAdd = days < 1 ? 0 : Math.ceil(days) - 1;
      const end = addDays(start, daysToAdd);
      setEndDate(format(end, 'yyyy-MM-dd'));
    }
  }, [days, startDate]);

  // Handlers
  const handleToggle = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((i) => i !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (!balanceData?.supplementaryDayDetails) return;
    const allIds = balanceData.supplementaryDayDetails.map((sd) => sd.id);
    if (selectedIds.length === allIds.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(allIds);
    }
  };

  const handleSubmit = async () => {
    if (selectedIds.length === 0 || days <= 0) return;

    try {
      await convertMutation.mutateAsync({
        employeeId,
        supplementaryDayIds: selectedIds,
        startDate,
        endDate,
        days,
        autoApprove,
        allowPastDate,
        notes: notes || undefined,
      });
      onClose();
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const formatHours = (hours: number): string => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (h === 0) return `${m}min`;
    return `${h}h${m.toString().padStart(2, '0')}min`;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'WEEKEND_SATURDAY':
        return <Sun className="h-4 w-4 text-orange-500" />;
      case 'WEEKEND_SUNDAY':
        return <Sunrise className="h-4 w-4 text-red-500" />;
      case 'HOLIDAY':
        return <Calendar className="h-4 w-4 text-purple-500" />;
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'WEEKEND_SATURDAY':
        return 'Samedi';
      case 'WEEKEND_SUNDAY':
        return 'Dimanche';
      case 'HOLIDAY':
        return 'Jour Férié';
      default:
        return type;
    }
  };

  const isPastDate = new Date(startDate) < new Date(new Date().toDateString());

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Conversion en récupération - Jours Supplémentaires
          </DialogTitle>
          <DialogDescription>
            Sélectionnez les jours supplémentaires (weekend/férié) à convertir en jours de récupération pour{' '}
            <strong>{employeeName}</strong>
          </DialogDescription>
        </DialogHeader>

        {isLoadingBalance ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-3 text-text-secondary">Chargement du solde...</span>
          </div>
        ) : !balanceData || balanceData.supplementaryDayDetails.length === 0 ? (
          <Alert variant="info">
            <Info className="h-4 w-4" />
            <AlertDescription>
              Aucun jour supplémentaire approuvé disponible pour la conversion.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-6">
            {/* Summary Card */}
            <Card className="bg-indigo-50 border-indigo-200">
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-sm text-indigo-600">Cumul disponible</p>
                    <p className="text-xl font-bold text-indigo-700">
                      {formatHours(balanceData.cumulativeHours)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-indigo-600">Heures sélectionnées</p>
                    <p className="text-xl font-bold text-green-600">
                      {formatHours(selectedHours)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-indigo-600">Jours possibles</p>
                    <p className="text-xl font-bold text-indigo-700">
                      {maxPossibleDays}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-indigo-600">Taux journalier</p>
                    <p className="text-xl font-bold text-gray-600">
                      {formatHours(balanceData.dailyWorkingHours)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Supplementary Days Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">
                  Jours supplémentaires à convertir
                </Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                >
                  {selectedIds.length === balanceData.supplementaryDayDetails.length
                    ? 'Tout désélectionner'
                    : 'Tout sélectionner'}
                </Button>
              </div>

              <div className="border rounded-lg divide-y max-h-60 overflow-y-auto">
                {balanceData.supplementaryDayDetails.map((sd) => (
                  <div
                    key={sd.id}
                    className={`flex items-center gap-4 p-3 hover:bg-gray-50 cursor-pointer ${
                      selectedIds.includes(sd.id) ? 'bg-indigo-50' : ''
                    }`}
                    onClick={() => handleToggle(sd.id)}
                  >
                    <Checkbox
                      checked={selectedIds.includes(sd.id)}
                      onCheckedChange={() => handleToggle(sd.id)}
                    />
                    <div className="flex-1 grid grid-cols-4 gap-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-text-secondary" />
                        <span className="text-sm">
                          {format(new Date(sd.date), 'dd MMM yyyy', { locale: fr })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {getTypeIcon(sd.type)}
                        <span className="text-sm font-medium">
                          {getTypeLabel(sd.type)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-text-secondary" />
                        <span className="text-sm">
                          Disponible: {formatHours(sd.availableHours)}
                        </span>
                      </div>
                      <div>
                        {selectedIds.includes(sd.id) && (
                          <Badge variant="success" className="text-xs">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Sélectionné
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Conversion Settings */}
            {selectedIds.length > 0 && (
              <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
                <h4 className="font-semibold">Paramètres de la récupération</h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="days">Nombre de jours *</Label>
                    <Input
                      id="days"
                      type="number"
                      min={0.5}
                      max={maxPossibleDays || 0.5}
                      step={0.5}
                      value={days}
                      onChange={(e) => setDays(Math.min(maxPossibleDays || 0.5, Math.max(0.5, parseFloat(e.target.value) || 0.5)))}
                    />
                    <p className="text-xs text-text-secondary">
                      Maximum: {maxPossibleDays} jour(s) - Minimum: 0.5 jour (demi-journée)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="start-date">Date de début *</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
                      <Input
                        id="start-date"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="end-date">Date de fin *</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
                      <Input
                        id="end-date"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (optionnel)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Motif de la conversion, commentaires..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                  />
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="auto-approve"
                      checked={autoApprove}
                      onCheckedChange={(checked) => setAutoApprove(checked === true)}
                    />
                    <Label htmlFor="auto-approve" className="cursor-pointer">
                      Approuver automatiquement (si vous êtes le manager direct)
                    </Label>
                  </div>

                  {isPastDate && (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="allow-past"
                        checked={allowPastDate}
                        onCheckedChange={(checked) => setAllowPastDate(checked === true)}
                      />
                      <Label htmlFor="allow-past" className="cursor-pointer text-warning">
                        <AlertCircle className="h-4 w-4 inline mr-1" />
                        Autoriser les dates passées (régularisation)
                      </Label>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Warning for past dates */}
            {isPastDate && !allowPastDate && selectedIds.length > 0 && (
              <Alert variant="warning">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  La date de début est dans le passé. Cochez &quot;Autoriser les dates passées&quot; pour effectuer une régularisation.
                </AlertDescription>
              </Alert>
            )}

            {/* Confirmation Summary */}
            {selectedIds.length > 0 && maxPossibleDays > 0 && (
              <Alert variant="info">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Résumé:</strong> {selectedIds.length} jour(s) supplémentaire(s) sélectionné(s) = {formatHours(selectedHours)} → {days} jour(s) de récupération du {format(new Date(startDate), 'dd/MM/yyyy')} au {format(new Date(endDate), 'dd/MM/yyyy')}.
                  <br />
                  <span className="text-text-secondary text-sm">
                    Les jours sélectionnés seront marqués comme &quot;RÉCUPÉRÉ&quot; et ne seront plus payables.
                  </span>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={
              convertMutation.isPending ||
              selectedIds.length === 0 ||
              maxPossibleDays <= 0 ||
              days <= 0 ||
              (isPastDate && !allowPastDate)
            }
          >
            {convertMutation.isPending ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Conversion...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Convertir en récupération
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SupplementaryDaysConversionModal;
