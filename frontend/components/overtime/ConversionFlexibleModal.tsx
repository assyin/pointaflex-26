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
} from 'lucide-react';
import { useCumulativeBalance, useConvertFlexible } from '@/lib/hooks/useRecoveryDays';

interface ConversionFlexibleModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  employeeName: string;
}

export function ConversionFlexibleModal({
  isOpen,
  onClose,
  employeeId,
  employeeName,
}: ConversionFlexibleModalProps) {
  // State
  const [selectedOvertimeIds, setSelectedOvertimeIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [days, setDays] = useState<number>(1);
  const [autoApprove, setAutoApprove] = useState(false);
  const [allowPastDate, setAllowPastDate] = useState(false);
  const [notes, setNotes] = useState('');

  // Hooks
  const { data: balanceData, isLoading: isLoadingBalance } = useCumulativeBalance(employeeId);
  const convertMutation = useConvertFlexible();

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedOvertimeIds([]);
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
    if (!balanceData?.overtimeDetails) {
      return { selectedHours: 0, maxPossibleDays: 0, selectedDetails: [] };
    }

    const selectedDetails = balanceData.overtimeDetails.filter(
      (ot) => selectedOvertimeIds.includes(ot.id)
    );

    const selectedHours = selectedDetails.reduce(
      (sum, ot) => sum + ot.availableHours,
      0
    );

    const dailyHours = balanceData.dailyWorkingHours || 7.33;
    const rate = balanceData.conversionRate || 1.0;
    const maxPossibleDays = Math.floor((selectedHours * rate) / dailyHours);

    return { selectedHours, maxPossibleDays, selectedDetails };
  }, [balanceData, selectedOvertimeIds]);

  // Auto-adjust days when selection changes
  useEffect(() => {
    if (maxPossibleDays > 0 && days > maxPossibleDays) {
      setDays(maxPossibleDays);
    }
    if (maxPossibleDays >= 1 && days < 1) {
      setDays(1);
    }
  }, [maxPossibleDays, days]);

  // Auto-adjust end date based on days
  useEffect(() => {
    if (days >= 1 && startDate) {
      const start = new Date(startDate);
      const end = addDays(start, Math.ceil(days) - 1);
      setEndDate(format(end, 'yyyy-MM-dd'));
    }
  }, [days, startDate]);

  // Handlers
  const handleToggleOvertime = (overtimeId: string) => {
    setSelectedOvertimeIds((prev) =>
      prev.includes(overtimeId)
        ? prev.filter((id) => id !== overtimeId)
        : [...prev, overtimeId]
    );
  };

  const handleSelectAll = () => {
    if (!balanceData?.overtimeDetails) return;
    const allIds = balanceData.overtimeDetails.map((ot) => ot.id);
    if (selectedOvertimeIds.length === allIds.length) {
      setSelectedOvertimeIds([]);
    } else {
      setSelectedOvertimeIds(allIds);
    }
  };

  const handleSubmit = async () => {
    if (selectedOvertimeIds.length === 0 || days < 1) return;

    try {
      await convertMutation.mutateAsync({
        employeeId,
        overtimeIds: selectedOvertimeIds,
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

  const isPastDate = new Date(startDate) < new Date(new Date().toDateString());

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Conversion flexible en récupération
          </DialogTitle>
          <DialogDescription>
            Sélectionnez les heures supplémentaires à convertir en jours de récupération pour{' '}
            <strong>{employeeName}</strong>
          </DialogDescription>
        </DialogHeader>

        {isLoadingBalance ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-3 text-text-secondary">Chargement du solde...</span>
          </div>
        ) : !balanceData || balanceData.overtimeDetails.length === 0 ? (
          <Alert variant="info">
            <Info className="h-4 w-4" />
            <AlertDescription>
              Aucune heure supplémentaire approuvée disponible pour la conversion.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-6">
            {/* Summary Card */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-sm text-text-secondary">Cumul disponible</p>
                    <p className="text-xl font-bold text-primary">
                      {formatHours(balanceData.cumulativeHours)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-text-secondary">Heures sélectionnées</p>
                    <p className="text-xl font-bold text-success">
                      {formatHours(selectedHours)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-text-secondary">Jours possibles</p>
                    <p className="text-xl font-bold">
                      {maxPossibleDays}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-text-secondary">Taux journalier</p>
                    <p className="text-xl font-bold text-text-secondary">
                      {formatHours(balanceData.dailyWorkingHours)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Overtime Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">
                  Heures supplémentaires à convertir
                </Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                >
                  {selectedOvertimeIds.length === balanceData.overtimeDetails.length
                    ? 'Tout désélectionner'
                    : 'Tout sélectionner'}
                </Button>
              </div>

              <div className="border rounded-lg divide-y max-h-60 overflow-y-auto">
                {balanceData.overtimeDetails.map((ot) => (
                  <div
                    key={ot.id}
                    className={`flex items-center gap-4 p-3 hover:bg-gray-50 cursor-pointer ${
                      selectedOvertimeIds.includes(ot.id) ? 'bg-primary/5' : ''
                    }`}
                    onClick={() => handleToggleOvertime(ot.id)}
                  >
                    <Checkbox
                      checked={selectedOvertimeIds.includes(ot.id)}
                      onCheckedChange={() => handleToggleOvertime(ot.id)}
                    />
                    <div className="flex-1 grid grid-cols-4 gap-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-text-secondary" />
                        <span className="text-sm">
                          {format(new Date(ot.date), 'dd MMM yyyy', { locale: fr })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-text-secondary" />
                        <span className="text-sm font-medium">
                          {formatHours(ot.approvedHours)}
                        </span>
                      </div>
                      <div className="text-sm text-text-secondary">
                        Disponible: {formatHours(ot.availableHours)}
                      </div>
                      <div>
                        {selectedOvertimeIds.includes(ot.id) && (
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
            {selectedOvertimeIds.length > 0 && (
              <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
                <h4 className="font-semibold">Paramètres de la récupération</h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="days">Nombre de jours *</Label>
                    <Input
                      id="days"
                      type="number"
                      min={1}
                      max={maxPossibleDays}
                      step={0.5}
                      value={days}
                      onChange={(e) => setDays(Math.min(maxPossibleDays, Math.max(1, parseFloat(e.target.value) || 1)))}
                    />
                    <p className="text-xs text-text-secondary">
                      Maximum: {maxPossibleDays} jour(s)
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
            {isPastDate && !allowPastDate && selectedOvertimeIds.length > 0 && (
              <Alert variant="warning">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  La date de début est dans le passé. Cochez &quot;Autoriser les dates passées&quot; pour effectuer une régularisation.
                </AlertDescription>
              </Alert>
            )}

            {/* Confirmation Summary */}
            {selectedOvertimeIds.length > 0 && maxPossibleDays >= 1 && (
              <Alert variant="info">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Résumé:</strong> {selectedOvertimeIds.length} ligne(s) sélectionnée(s) = {formatHours(selectedHours)} → {days} jour(s) de récupération du {format(new Date(startDate), 'dd/MM/yyyy')} au {format(new Date(endDate), 'dd/MM/yyyy')}.
                  <br />
                  <span className="text-text-secondary text-sm">
                    Les heures sélectionnées seront marquées comme &quot;RÉCUPÉRÉ&quot; et ne seront plus payables.
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
              selectedOvertimeIds.length === 0 ||
              maxPossibleDays < 1 ||
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

export default ConversionFlexibleModal;
