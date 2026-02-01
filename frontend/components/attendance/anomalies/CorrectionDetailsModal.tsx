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
  Info,
  ArrowRight,
  Lightbulb,
  ShieldAlert,
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

// Descriptions détaillées et explications pour chaque type d'anomalie
const ANOMALY_DESCRIPTIONS: Record<string, {
  description: string;
  cause: string;
  impact: string;
  action: string;
  severity: 'low' | 'medium' | 'high' | 'info';
}> = {
  LATE: {
    description: "L'employé a pointé son entrée après l'heure de début prévue par son planning.",
    cause: "Le pointage d'entrée a été enregistré en retard par rapport à l'heure de début du shift assigné.",
    impact: "Le temps de retard est déduit des heures travaillées. Des retards répétés peuvent nécessiter une action disciplinaire.",
    action: "Vérifiez si le retard est justifié (embouteillage, rendez-vous médical, etc.) et corrigez avec le motif approprié.",
    severity: 'medium',
  },
  ABSENCE: {
    description: "Aucun pointage n'a été enregistré pour cet employé alors qu'il était planifié pour travailler.",
    cause: "L'employé n'a effectué aucun pointage (ni entrée, ni sortie) durant sa journée de travail prévue.",
    impact: "La journée est comptabilisée comme absence non justifiée. Aucune heure travaillée n'est enregistrée.",
    action: "Contactez l'employé pour connaître la raison. Si justifié (maladie, congé oublié), corrigez en conséquence.",
    severity: 'high',
  },
  ABSENCE_PARTIAL: {
    description: "L'employé n'a travaillé qu'une partie de sa journée planifiée.",
    cause: "Le temps de présence enregistré est significativement inférieur à la durée du shift prévu.",
    impact: "Seules les heures effectivement pointées sont comptabilisées. La différence est marquée comme absence partielle.",
    action: "Vérifiez si l'employé avait une autorisation de sortie anticipée ou un rendez-vous.",
    severity: 'medium',
  },
  MISSING_IN: {
    description: "Un pointage de sortie a été enregistré sans pointage d'entrée correspondant pour cette journée.",
    cause: "L'employé a pointé sa sortie mais aucune entrée n'a été trouvée le même jour. Cela peut être dû à un oubli de pointage d'entrée, un problème technique du terminal, ou un shift de nuit (entrée la veille).",
    impact: "Les heures travaillées ne peuvent pas être calculées correctement. L'heure d'entrée doit être ajoutée manuellement.",
    action: "Ajoutez l'heure d'entrée manuellement. Consultez le planning de l'employé pour déterminer l'heure d'entrée probable.",
    severity: 'high',
  },
  MISSING_OUT: {
    description: "Un pointage d'entrée a été enregistré sans pointage de sortie correspondant.",
    cause: "L'employé a pointé son entrée mais aucune sortie n'a été trouvée. Cela peut indiquer un oubli de pointage en fin de journée ou un problème technique.",
    impact: "Les heures travaillées ne peuvent pas être calculées. L'heure de sortie doit être ajoutée manuellement.",
    action: "Ajoutez l'heure de sortie manuellement. Vérifiez l'heure de fin de shift prévue au planning.",
    severity: 'high',
  },
  EARLY_LEAVE: {
    description: "L'employé a pointé sa sortie avant l'heure de fin prévue par son planning.",
    cause: "Le pointage de sortie a été enregistré avant l'heure de fin du shift assigné.",
    impact: "Le temps de départ anticipé est déduit des heures travaillées.",
    action: "Vérifiez si le départ anticipé était autorisé par le manager ou justifié par un motif valable.",
    severity: 'medium',
  },
  DOUBLE_IN: {
    description: "Deux pointages d'entrée ont été enregistrés sans pointage de sortie entre les deux.",
    cause: "L'employé a pointé deux fois en entrée, possiblement par erreur (double passage au terminal) ou après une sortie non enregistrée.",
    impact: "Le premier pointage d'entrée est conservé. Le second est marqué comme doublon informatif.",
    action: "Généralement aucune action requise. Vérifiez si une sortie intermédiaire a été oubliée.",
    severity: 'low',
  },
  DOUBLE_OUT: {
    description: "Deux pointages de sortie ont été enregistrés sans pointage d'entrée entre les deux.",
    cause: "L'employé a pointé deux fois en sortie, possiblement par erreur ou après une entrée non enregistrée.",
    impact: "Le premier pointage de sortie est conservé. Le second est marqué comme doublon informatif.",
    action: "Généralement aucune action requise. Vérifiez si une entrée intermédiaire a été oubliée.",
    severity: 'low',
  },
  JOUR_FERIE_TRAVAILLE: {
    description: "Un pointage a été enregistré durant un jour férié officiel.",
    cause: "L'employé a travaillé un jour déclaré comme férié dans le système.",
    impact: "Les heures travaillées peuvent donner droit à une majoration ou un jour de récupération selon la politique de l'entreprise.",
    action: "Vérifiez si le travail était planifié et autorisé. Appliquez la majoration ou le repos compensateur prévu.",
    severity: 'medium',
  },
  INSUFFICIENT_REST: {
    description: "Le temps de repos entre deux shifts consécutifs est inférieur au minimum légal.",
    cause: "L'intervalle entre la sortie d'un shift et l'entrée du shift suivant est trop court (généralement moins de 11h).",
    impact: "Non-conformité potentielle avec le Code du travail. Risque juridique et impact sur la santé de l'employé.",
    action: "Alertez le manager et ajustez le planning. Le repos minimum légal doit être respecté.",
    severity: 'high',
  },
  UNPLANNED_PUNCH: {
    description: "Un pointage a été enregistré alors qu'aucun shift n'était prévu pour cet employé.",
    cause: "L'employé a pointé en dehors de tout planning assigné.",
    impact: "Le pointage est enregistré mais non associé à un shift. Les heures ne sont pas comptabilisées automatiquement.",
    action: "Vérifiez si un shift a été oublié dans le planning ou si l'employé s'est trompé de jour.",
    severity: 'low',
  },
  DEBOUNCE_BLOCKED: {
    description: "Ce pointage a été bloqué par le système anti-rebond car un pointage similaire existe déjà dans un court intervalle.",
    cause: "L'employé a passé son badge ou son empreinte plusieurs fois en quelques minutes. Le système ignore automatiquement les doublons.",
    impact: "Aucun impact. Le pointage original est conservé, ce doublon est uniquement informatif.",
    action: "Aucune action requise. Ce comportement est normal et géré automatiquement.",
    severity: 'info',
  },
  PENDING_VALIDATION: {
    description: "Ce pointage nécessite une validation manuelle avant d'être pris en compte.",
    cause: "Le système a détecté une situation ambiguë nécessitant une vérification humaine.",
    impact: "Les heures ne sont pas comptabilisées tant que la validation n'est pas effectuée.",
    action: "Examinez le pointage et validez ou rejetez-le selon la situation.",
    severity: 'medium',
  },
  REJECTED_PUNCH: {
    description: "Ce pointage a été rejeté lors de la validation.",
    cause: "Un administrateur ou un manager a rejeté ce pointage après examen.",
    impact: "Le pointage n'est pas comptabilisé dans les heures travaillées.",
    action: "Consultez la note de rejet pour comprendre la raison. Contactez le valideur si nécessaire.",
    severity: 'medium',
  },
  WEEKEND_WORK: {
    description: "Un pointage a été enregistré durant le weekend alors qu'aucun planning explicite n'était prévu.",
    cause: "L'employé a travaillé un samedi ou dimanche sans planning assigné pour ce jour.",
    impact: "Les heures peuvent donner droit à une majoration weekend ou un repos compensateur.",
    action: "Vérifiez si le travail était autorisé. Appliquez la politique de majoration weekend de l'entreprise.",
    severity: 'medium',
  },
  HOLIDAY_WORKED: {
    description: "Un pointage a été enregistré durant un jour férié officiel.",
    cause: "L'employé a travaillé un jour déclaré comme férié dans le système.",
    impact: "Les heures travaillées peuvent donner droit à une majoration ou un jour de récupération.",
    action: "Vérifiez si le travail était planifié. Appliquez la majoration ou le repos compensateur prévu.",
    severity: 'medium',
  },
  LEAVE_BUT_PRESENT: {
    description: "Un pointage a été enregistré alors que l'employé est déclaré en congé.",
    cause: "L'employé a un congé approuvé pour cette date mais a quand même pointé au terminal.",
    impact: "Conflit entre le congé enregistré et la présence physique. Le congé ou le pointage doit être rectifié.",
    action: "Vérifiez si le congé a été annulé ou si l'employé est revenu plus tôt. Ajustez le congé ou le pointage en conséquence.",
    severity: 'medium',
  },
  PROBABLE_WRONG_TYPE: {
    description: "Le système a détecté que l'employé a probablement appuyé sur le mauvais bouton (IN au lieu de OUT ou inversement).",
    cause: "En comparant le type de pointage (IN/OUT) avec le planning de l'employé et le contexte des pointages précédents, le système estime que le type enregistré est incorrect.",
    impact: "Le type incorrect génère une anomalie MISSING_IN ou MISSING_OUT en cascade. La correction du type résout ces anomalies.",
    action: "Utilisez le bouton 'Inverser le type' pour corriger rapidement. Vérifiez le planning et les pointages adjacents pour confirmer.",
    severity: 'medium',
  },
};

const SEVERITY_CONFIG = {
  high: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', label: 'Critique' },
  medium: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', label: 'Moyen' },
  low: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', label: 'Faible' },
  info: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-600', label: 'Informatif' },
};

export function CorrectionDetailsModal({
  isOpen,
  onClose,
  anomaly,
}: CorrectionDetailsModalProps) {
  if (!anomaly) return null;

  const anomalyType = anomaly.anomalyType as AnomalyType;
  const anomalyLabel = ANOMALY_LABELS[anomalyType] || anomaly.anomalyType;
  const anomalyColor = ANOMALY_COLORS[anomalyType] || '#6C757D';
  const anomalyInfo = ANOMALY_DESCRIPTIONS[anomaly.anomalyType] || null;
  const severityConfig = anomalyInfo ? SEVERITY_CONFIG[anomalyInfo.severity] : null;

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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Détails de l&apos;anomalie
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

          {/* Type d'anomalie, sévérité et date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Type d&apos;anomalie</div>
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
              {severityConfig && (
                <Badge variant="outline" className={`ml-2 ${severityConfig.text} ${severityConfig.border}`}>
                  {severityConfig.label}
                </Badge>
              )}
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Date/Heure</div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">
                  {format(parseISO(anomaly.timestamp), "EEEE dd/MM/yyyy 'à' HH:mm", {
                    locale: fr,
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Planning associé */}
          {anomaly.schedule?.shift && (
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
              <div className="flex items-center gap-2 text-blue-700 text-sm font-medium mb-1">
                <Clock className="h-4 w-4" />
                Planning prévu
              </div>
              <div className="text-sm text-blue-600">
                Shift <span className="font-medium">{anomaly.schedule.shift.name}</span> : {anomaly.schedule.shift.startTime} <ArrowRight className="h-3 w-3 inline" /> {anomaly.schedule.shift.endTime}
              </div>
            </div>
          )}

          <hr className="border-gray-200" />

          {/* Description et explication de l'anomalie */}
          {anomalyInfo && (
            <div className={`${severityConfig?.bg || 'bg-gray-50'} border ${severityConfig?.border || 'border-gray-200'} rounded-lg p-4 space-y-3`}>
              <div className={`flex items-center gap-2 font-medium ${severityConfig?.text || 'text-gray-700'}`}>
                <Info className="h-4 w-4 flex-shrink-0" />
                Qu&apos;est-ce que cette anomalie ?
              </div>
              <p className="text-sm text-gray-700">
                {anomalyInfo.description}
              </p>

              <div className="space-y-2 pt-1">
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Cause probable</div>
                  <p className="text-sm text-gray-600">{anomalyInfo.cause}</p>
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Impact</div>
                  <p className="text-sm text-gray-600">{anomalyInfo.impact}</p>
                </div>
              </div>

              <div className="flex items-start gap-2 bg-white/60 rounded-md p-2.5 mt-2">
                <Lightbulb className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Action recommandée</div>
                  <p className="text-sm text-gray-700">{anomalyInfo.action}</p>
                </div>
              </div>
            </div>
          )}

          {/* Note d'anomalie du système */}
          {anomaly.anomalyNote && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-gray-600 text-sm font-medium mb-1">
                <ShieldAlert className="h-4 w-4" />
                Note du système
              </div>
              <p className="text-sm text-gray-600">{anomaly.anomalyNote}</p>
            </div>
          )}

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
                Cette anomalie n&apos;a pas encore été corrigée. Utilisez le bouton &quot;Corriger&quot; dans le menu actions pour résoudre cette anomalie.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default CorrectionDetailsModal;
