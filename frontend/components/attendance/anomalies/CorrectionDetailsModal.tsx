'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  CheckCircle,
  Clock,
  User,
  FileText,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import {
  ANOMALY_LABELS,
  ANOMALY_COLORS,
  type AnomalyRecord,
  type AnomalyType,
} from '@/lib/api/anomalies';

interface CorrectionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  anomaly: AnomalyRecord | null;
}

export function CorrectionDetailsModal({
  isOpen,
  onClose,
  anomaly,
}: CorrectionDetailsModalProps) {
  if (!anomaly) return null;

  const anomalyType = anomaly.anomalyType as AnomalyType;
  const anomalyLabel = ANOMALY_LABELS[anomalyType] || anomaly.anomalyType;
  const anomalyColor = ANOMALY_COLORS[anomalyType] || '#6C757D';

  // Parser le code de motif de la note de correction (format: [CODE] Note)
  const parseCorrection = (note: string | undefined) => {
    if (!note) return { code: null, note: note || '' };
    const match = note.match(/^\[([A-Z_]+)\]\s*(.*)$/);
    if (match) {
      return { code: match[1], note: match[2] };
    }
    return { code: null, note };
  };

  const correctionInfo = parseCorrection(anomaly.correctionNote);

  // Labels pour les codes de motif
  const reasonCodeLabels: Record<string, string> = {
    FORGOT_BADGE: 'Oubli de badge',
    DEVICE_FAILURE: 'Panne du terminal',
    SYSTEM_ERROR: 'Erreur système',
    BADGE_MULTIPLE_PASS: 'Passage multiple badge',
    EXTERNAL_MEETING: 'Réunion externe',
    MISSION: 'Mission',
    TELEWORK: 'Télétravail',
    TRAFFIC: 'Embouteillage',
    PUBLIC_TRANSPORT: 'Transport en commun',
    MEDICAL_APPOINTMENT: 'Rendez-vous médical',
    SICK_LEAVE: 'Arrêt maladie',
    FAMILY_EMERGENCY: 'Urgence familiale',
    PERSONAL_REASON: 'Raison personnelle',
    AUTHORIZED_ABSENCE: 'Absence autorisée',
    SCHEDULE_ERROR: 'Erreur de planning',
    SHIFT_SWAP: 'Échange de poste',
    EXTRA_SHIFT: 'Poste supplémentaire',
    PLANNED_OVERTIME: 'Heures sup planifiées',
    EMERGENCY_WORK: 'Travail d\'urgence',
    MANAGER_AUTH: 'Autorisation manager',
    OTHER: 'Autre',
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Détails de l'anomalie
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informations de l'employé */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <User className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="font-medium">
                  {anomaly.employee
                    ? `${anomaly.employee.firstName} ${anomaly.employee.lastName}`
                    : 'N/A'}
                </div>
                <div className="text-sm text-muted-foreground">
                  {anomaly.employee?.matricule || ''} • {anomaly.employee?.department?.name || '-'}
                </div>
              </div>
            </div>
          </div>

          {/* Type d'anomalie et date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Type d'anomalie</div>
              <Badge
                style={{
                  backgroundColor: `${anomalyColor}20`,
                  color: anomalyColor,
                  borderColor: anomalyColor,
                }}
                className="border"
              >
                <AlertTriangle className="h-3 w-3 mr-1" />
                {anomalyLabel}
              </Badge>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Date/Heure</div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">
                  {format(parseISO(anomaly.timestamp), 'dd/MM/yyyy HH:mm', {
                    locale: fr,
                  })}
                </span>
              </div>
            </div>
          </div>

          <hr className="border-gray-200" />

          {/* Statut de correction */}
          {anomaly.isCorrected ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Anomalie corrigée</span>
              </div>

              {/* Date de correction */}
              {anomaly.correctedAt && (
                <div>
                  <div className="text-sm text-muted-foreground mb-1">
                    <Clock className="h-4 w-4 inline mr-1" />
                    Corrigée le
                  </div>
                  <div className="font-medium">
                    {format(parseISO(anomaly.correctedAt), "dd MMMM yyyy 'à' HH:mm", {
                      locale: fr,
                    })}
                  </div>
                </div>
              )}

              {/* Motif de correction */}
              {correctionInfo.code && (
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Motif</div>
                  <Badge variant="secondary" className="text-sm">
                    {reasonCodeLabels[correctionInfo.code] || correctionInfo.code}
                  </Badge>
                </div>
              )}

              {/* Note de correction */}
              {correctionInfo.note && (
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Note de correction</div>
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                    <p className="text-sm text-blue-800">{correctionInfo.note}</p>
                  </div>
                </div>
              )}

              {/* Pas de note */}
              {!anomaly.correctionNote && (
                <div className="text-sm text-muted-foreground italic">
                  Aucune note de correction fournie
                </div>
              )}
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-4">
              <div className="flex items-center gap-2 text-yellow-700">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-medium">En attente de correction</span>
              </div>
              <p className="text-sm text-yellow-600 mt-2">
                Cette anomalie n'a pas encore été corrigée.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default CorrectionDetailsModal;
