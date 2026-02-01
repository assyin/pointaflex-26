'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Clock, User, AlertTriangle, CheckCircle, ArrowLeftRight, PlusCircle } from 'lucide-react';
import {
  ANOMALY_LABELS,
  ANOMALY_COLORS,
  type AnomalyRecord,
  type AnomalyType,
} from '@/lib/api/anomalies';

/**
 * Tous les codes de motifs disponibles
 */
export const ALL_REASON_CODES = {
  // Motifs liés aux problèmes techniques
  FORGOT_BADGE: 'Oubli de badge',
  DEVICE_FAILURE: 'Panne terminal',
  SYSTEM_ERROR: 'Erreur système',
  BADGE_MULTIPLE_PASS: 'Double passage badge',

  // Motifs liés aux déplacements/réunions
  EXTERNAL_MEETING: 'Réunion externe',
  MISSION: 'Mission extérieure',
  TELEWORK: 'Télétravail',

  // Motifs liés aux retards
  TRAFFIC: 'Embouteillage / Circulation',
  PUBLIC_TRANSPORT: 'Retard transport en commun',

  // Motifs liés aux absences/départs
  MEDICAL_APPOINTMENT: 'Rendez-vous médical',
  SICK_LEAVE: 'Congé maladie',
  FAMILY_EMERGENCY: 'Urgence familiale',
  PERSONAL_REASON: 'Raison personnelle autorisée',
  AUTHORIZED_ABSENCE: 'Absence autorisée',

  // Motifs liés au planning
  SCHEDULE_ERROR: 'Erreur de planning',
  SHIFT_SWAP: 'Échange de shift',
  EXTRA_SHIFT: 'Shift supplémentaire',
  PLANNED_OVERTIME: 'Heures supp. planifiées',
  EMERGENCY_WORK: 'Travail urgent',

  // Motifs généraux
  MANAGER_AUTH: 'Autorisation manager',
  OTHER: 'Autre (préciser)',
} as const;

export type CorrectionReasonCode = keyof typeof ALL_REASON_CODES;

/**
 * Mapping des motifs de correction par type d'anomalie
 * Chaque type d'anomalie a ses motifs cohérents
 */
export const REASON_CODES_BY_ANOMALY: Record<string, CorrectionReasonCode[]> = {
  // Retard
  LATE: [
    'TRAFFIC',
    'PUBLIC_TRANSPORT',
    'MEDICAL_APPOINTMENT',
    'FAMILY_EMERGENCY',
    'MANAGER_AUTH',
    'OTHER',
  ],

  // Absence complète
  ABSENCE: [
    'SICK_LEAVE',
    'FAMILY_EMERGENCY',
    'AUTHORIZED_ABSENCE',
    'TELEWORK',
    'MISSION',
    'MANAGER_AUTH',
    'SYSTEM_ERROR',
    'OTHER',
  ],

  // Absence partielle
  ABSENCE_PARTIAL: [
    'MEDICAL_APPOINTMENT',
    'FAMILY_EMERGENCY',
    'AUTHORIZED_ABSENCE',
    'TELEWORK',
    'MISSION',
    'MANAGER_AUTH',
    'OTHER',
  ],

  // Entrée manquante
  MISSING_IN: [
    'FORGOT_BADGE',
    'DEVICE_FAILURE',
    'EXTERNAL_MEETING',
    'TELEWORK',
    'MISSION',
    'SYSTEM_ERROR',
    'OTHER',
  ],

  // Sortie manquante
  MISSING_OUT: [
    'FORGOT_BADGE',
    'DEVICE_FAILURE',
    'EXTERNAL_MEETING',
    'TELEWORK',
    'MISSION',
    'SYSTEM_ERROR',
    'OTHER',
  ],

  // Départ anticipé
  EARLY_LEAVE: [
    'MEDICAL_APPOINTMENT',
    'FAMILY_EMERGENCY',
    'PERSONAL_REASON',
    'MANAGER_AUTH',
    'OTHER',
  ],

  // Double entrée
  DOUBLE_IN: [
    'DEVICE_FAILURE',
    'BADGE_MULTIPLE_PASS',
    'SYSTEM_ERROR',
    'OTHER',
  ],

  // Double sortie
  DOUBLE_OUT: [
    'DEVICE_FAILURE',
    'BADGE_MULTIPLE_PASS',
    'SYSTEM_ERROR',
    'OTHER',
  ],

  // Jour férié travaillé
  JOUR_FERIE_TRAVAILLE: [
    'PLANNED_OVERTIME',
    'EMERGENCY_WORK',
    'MANAGER_AUTH',
    'OTHER',
  ],

  // Repos insuffisant
  INSUFFICIENT_REST: [
    'EMERGENCY_WORK',
    'SHIFT_SWAP',
    'MANAGER_AUTH',
    'OTHER',
  ],

  // Pointage non planifié
  UNPLANNED_PUNCH: [
    'SCHEDULE_ERROR',
    'SHIFT_SWAP',
    'EXTRA_SHIFT',
    'MANAGER_AUTH',
    'SYSTEM_ERROR',
    'OTHER',
  ],
};

/**
 * Obtient les motifs de correction disponibles pour un type d'anomalie
 */
export function getReasonCodesForAnomaly(anomalyType: string): { code: CorrectionReasonCode; label: string }[] {
  const codes = REASON_CODES_BY_ANOMALY[anomalyType] || Object.keys(ALL_REASON_CODES) as CorrectionReasonCode[];
  return codes.map(code => ({
    code,
    label: ALL_REASON_CODES[code],
  }));
}

interface CorrectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  anomaly: AnomalyRecord | null;
  onSubmit: (data: {
    correctionNote: string;
    correctedTimestamp?: string;
    reasonCode?: CorrectionReasonCode;
  }) => void;
  isLoading?: boolean;
  onInvertType?: (anomalyId: string) => void;
  isInverting?: boolean;
  onCreateMissing?: (anomalyId: string, suggestedTimestamp?: string) => void;
  isCreatingMissing?: boolean;
  onApproveCorrection?: (anomalyId: string, approved: boolean) => void;
  isApproving?: boolean;
}

export function CorrectionModal({
  isOpen,
  onClose,
  anomaly,
  onSubmit,
  isLoading,
  onInvertType,
  isInverting,
  onCreateMissing,
  isCreatingMissing,
  onApproveCorrection,
  isApproving,
}: CorrectionModalProps) {
  const [reasonCode, setReasonCode] = React.useState<CorrectionReasonCode | ''>('');
  const [correctionNote, setCorrectionNote] = React.useState('');
  const [correctedTimestamp, setCorrectedTimestamp] = React.useState('');
  const [customExitTime, setCustomExitTime] = React.useState('');

  React.useEffect(() => {
    if (anomaly) {
      setReasonCode('');
      setCorrectionNote('');
      setCorrectedTimestamp(
        anomaly.timestamp ? format(parseISO(anomaly.timestamp), "yyyy-MM-dd'T'HH:mm") : ''
      );
      setCustomExitTime(anomaly.schedule?.shift?.endTime || '');
    }
  }, [anomaly]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      correctionNote,
      correctedTimestamp: correctedTimestamp || undefined,
      reasonCode: reasonCode || undefined,
    });
  };

  // Déterminer si la note est requise (si motif = OTHER ou pas de motif)
  const isNoteRequired = !reasonCode || reasonCode === 'OTHER';

  // Obtenir les motifs contextuels pour ce type d'anomalie
  const availableReasonCodes = React.useMemo(() => {
    if (!anomaly) return [];
    return getReasonCodesForAnomaly(anomaly.anomalyType);
  }, [anomaly]);

  if (!anomaly) return null;

  const anomalyType = anomaly.anomalyType as AnomalyType;
  const anomalyLabel = ANOMALY_LABELS[anomalyType] || anomaly.anomalyType;
  const anomalyColor = ANOMALY_COLORS[anomalyType] || '#6C757D';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Corriger l'anomalie
          </DialogTitle>
          <DialogDescription>
            Veuillez fournir les détails de la correction pour cette anomalie.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Informations sur l'anomalie */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">
                    {anomaly.employee
                      ? `${anomaly.employee.firstName} ${anomaly.employee.lastName}`
                      : 'Employé inconnu'}
                  </span>
                </div>
                <Badge
                  style={{ backgroundColor: anomalyColor, color: 'white' }}
                >
                  {anomalyLabel}
                </Badge>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="h-4 w-4" />
                <span>
                  {format(parseISO(anomaly.timestamp), "EEEE d MMMM yyyy 'à' HH:mm", {
                    locale: fr,
                  })}
                </span>
              </div>

              {anomaly.anomalyNote && (
                <div className="text-sm text-gray-600 italic">
                  "{anomaly.anomalyNote}"
                </div>
              )}

              {anomaly.schedule?.shift && (
                <div className="text-xs text-gray-500">
                  Shift prévu: {anomaly.schedule.shift.name} (
                  {anomaly.schedule.shift.startTime} - {anomaly.schedule.shift.endTime})
                </div>
              )}
            </div>

            {/* Validation auto-correction mauvais bouton */}
            {anomaly.anomalyType === 'AUTO_CORRECTED_WRONG_TYPE' ? (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
                  <p className="text-sm font-medium text-blue-800">Auto-correction appliquée</p>
                  <p className="text-sm text-blue-700">
                    Le système a détecté que l'employé a appuyé sur le mauvais bouton (OUT au lieu de IN)
                    et a automatiquement corrigé le type en <strong>Entrée</strong>.
                  </p>
                  {anomaly.anomalyNote && (
                    <p className="text-xs text-blue-600 italic">{anomaly.anomalyNote}</p>
                  )}
                </div>

                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2 border-red-300 text-red-700 hover:bg-red-100"
                    onClick={() => onApproveCorrection?.(anomaly.id, false)}
                    disabled={isApproving}
                  >
                    {isApproving ? 'En cours...' : 'Rejeter (restaurer OUT)'}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="gap-2 bg-green-600 hover:bg-green-700"
                    onClick={() => onApproveCorrection?.(anomaly.id, true)}
                    disabled={isApproving}
                  >
                    <CheckCircle className="h-4 w-4" />
                    {isApproving ? 'En cours...' : 'Valider la correction'}
                  </Button>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={onClose}>
                    Fermer
                  </Button>
                </DialogFooter>
              </>
            ) : (anomaly.anomalyType === 'MISSING_IN' || anomaly.anomalyType === 'MISSING_OUT' || anomaly.anomalyType === 'PROBABLE_WRONG_TYPE') ? (
              <>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
                  <p className="text-sm font-medium text-amber-800">Actions rapides</p>
                  <div className="flex flex-wrap gap-2 items-end">
                    {/* Inverser le type */}
                    {onInvertType && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-100"
                        onClick={() => onInvertType(anomaly.id)}
                        disabled={isInverting}
                      >
                        <ArrowLeftRight className="h-4 w-4" />
                        {isInverting ? 'Inversion...' : `Inverser le type (${(anomaly as any).type === 'IN' ? 'IN → OUT' : 'OUT → IN'})`}
                      </Button>
                    )}
                    {/* Créer le pointage manquant */}
                    {onCreateMissing && (anomaly.anomalyType === 'MISSING_IN' || anomaly.anomalyType === 'MISSING_OUT') && (
                      anomaly.anomalyType === 'MISSING_OUT' ? (
                        <div className="flex items-center gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs text-blue-700">Heure de sortie</Label>
                            <Input
                              type="time"
                              value={customExitTime}
                              onChange={(e) => setCustomExitTime(e.target.value)}
                              className="w-28 h-8 text-sm border-blue-300"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="gap-2 border-blue-300 text-blue-700 hover:bg-blue-100 mt-auto"
                            onClick={() => {
                              const date = anomaly.timestamp.split('T')[0];
                              const ts = customExitTime ? `${date}T${customExitTime}:00` : undefined;
                              onCreateMissing(anomaly.id, ts);
                            }}
                            disabled={isCreatingMissing || !customExitTime}
                          >
                            <PlusCircle className="h-4 w-4" />
                            {isCreatingMissing ? 'Création...' : 'Créer la sortie manquante'}
                          </Button>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-2 border-blue-300 text-blue-700 hover:bg-blue-100"
                          onClick={() => onCreateMissing(anomaly.id)}
                          disabled={isCreatingMissing}
                        >
                          <PlusCircle className="h-4 w-4" />
                          {isCreatingMissing ? 'Création...' : "Créer l'entrée manquante"}
                        </Button>
                      )
                    )}
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={onClose}>
                    Fermer
                  </Button>
                </DialogFooter>
              </>
            ) : (
              <>
                {/* Formulaire classique pour les autres types d'anomalies */}
                <div className="space-y-2">
                  <Label htmlFor="reasonCode">
                    Motif de correction <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={reasonCode}
                    onValueChange={(value) => setReasonCode(value as CorrectionReasonCode)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez un motif..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableReasonCodes.map(({ code, label }) => (
                        <SelectItem key={code} value={code}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Motifs adaptés au type d'anomalie : {anomalyLabel}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="correctedTimestamp">
                    Heure corrigée (optionnel)
                  </Label>
                  <Input
                    id="correctedTimestamp"
                    type="datetime-local"
                    value={correctedTimestamp}
                    onChange={(e) => setCorrectedTimestamp(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Laissez vide pour conserver l'heure d'origine
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="correctionNote">
                    Note de correction {isNoteRequired && <span className="text-red-500">*</span>}
                  </Label>
                  <Textarea
                    id="correctionNote"
                    placeholder={
                      reasonCode === 'OTHER'
                        ? 'Précisez le motif de la correction...'
                        : 'Détails supplémentaires (optionnel)...'
                    }
                    value={correctionNote}
                    onChange={(e) => setCorrectionNote(e.target.value)}
                    rows={3}
                    required={isNoteRequired}
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                  <p className="font-medium">Correction directe</p>
                  <p className="text-blue-600">
                    La correction sera appliquée immédiatement et l'employé sera notifié automatiquement.
                  </p>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={onClose}>
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      isLoading ||
                      !reasonCode ||
                      (isNoteRequired && !correctionNote.trim())
                    }
                    className="gap-2"
                  >
                    {isLoading ? (
                      'Correction en cours...'
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        Corriger
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default CorrectionModal;
