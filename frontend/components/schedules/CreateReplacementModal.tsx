'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, X, AlertCircle, Search } from 'lucide-react';
import { useCreateReplacement } from '@/lib/hooks/useSchedules';
import { useEmployees } from '@/lib/hooks/useEmployees';
import { SearchableEmployeeSelect } from './SearchableEmployeeSelect';
import { format } from 'date-fns';

interface CreateReplacementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  schedule: {
    id: string;
    employeeId: string;
    employeeName?: string;
    date: string;
    shiftId: string;
    shiftName?: string;
  };
  employeesData?: any;
}

export function CreateReplacementModal({
  isOpen,
  onClose,
  onSuccess,
  schedule,
  employeesData,
}: CreateReplacementModalProps) {
  const createReplacementMutation = useCreateReplacement();
  const [replacementEmployeeId, setReplacementEmployeeId] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      // Reset form when modal closes
      setReplacementEmployeeId('');
      setReason('');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!replacementEmployeeId) {
      return;
    }

    try {
      await createReplacementMutation.mutateAsync({
        date: schedule.date,
        originalEmployeeId: schedule.employeeId,
        replacementEmployeeId,
        shiftId: schedule.shiftId,
        reason: reason || undefined,
      });
      onSuccess();
      onClose();
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const employees = employeesData?.data || employeesData || [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Créer un Remplacement</DialogTitle>
          <DialogDescription>
            Remplacer {schedule.employeeName || 'cet employé'} pour le {format(new Date(schedule.date), 'dd/MM/yyyy')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Informations du planning original (non modifiables) */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg border">
            <div>
              <Label className="text-xs text-gray-500">Date</Label>
              <div className="mt-1 font-medium">{format(new Date(schedule.date), 'dd/MM/yyyy')}</div>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Employé Original</Label>
              <div className="mt-1 font-medium">{schedule.employeeName || '-'}</div>
            </div>
            <div className="col-span-2">
              <Label className="text-xs text-gray-500">Shift</Label>
              <div className="mt-1 font-medium">{schedule.shiftName || '-'}</div>
            </div>
          </div>

          {/* Sélection de l'employé remplaçant */}
          <div>
            <Label htmlFor="replacementEmployee">Employé Remplaçant *</Label>
            <SearchableEmployeeSelect
              employees={employees}
              value={replacementEmployeeId}
              onChange={setReplacementEmployeeId}
              placeholder="Rechercher un employé..."
              excludeEmployeeId={schedule.employeeId}
            />
            {/* Button removed - suggestions will be handled by parent component if needed */}
          </div>

          {/* Raison (optionnel) */}
          <div>
            <Label htmlFor="reason">Raison du remplacement (optionnel)</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Congé maladie, congé personnel, etc."
              rows={3}
            />
          </div>

          {/* Avertissements (seront affichés par l'API si nécessaire) */}
          {createReplacementMutation.isError && (
            <Alert variant="danger">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {createReplacementMutation.error?.response?.data?.message || 'Erreur lors de la création du remplacement'}
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={createReplacementMutation.isPending}>
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={!replacementEmployeeId || createReplacementMutation.isPending}
            >
              {createReplacementMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Créer la demande
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
