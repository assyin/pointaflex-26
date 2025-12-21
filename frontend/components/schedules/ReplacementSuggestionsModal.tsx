'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertTriangle, Check } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { schedulesApi } from '@/lib/api/schedules';

interface ReplacementSuggestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (employeeId: string) => void;
  originalEmployeeId: string;
  date: string;
  shiftId: string;
  filters?: { teamId?: string; siteId?: string; departmentId?: string };
}

export function ReplacementSuggestionsModal({
  isOpen,
  onClose,
  onSelect,
  originalEmployeeId,
  date,
  shiftId,
  filters,
}: ReplacementSuggestionsModalProps) {
  const { data: suggestionsData, isLoading, error } = useQuery({
    queryKey: ['replacementSuggestions', originalEmployeeId, date, shiftId, filters],
    queryFn: () => schedulesApi.getReplacementSuggestions(originalEmployeeId, date, shiftId, filters),
    enabled: isOpen && !!originalEmployeeId && !!date && !!shiftId,
  });

  const suggestions = suggestionsData?.suggestions || [];

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'bg-green-100 text-green-700 border-green-300';
    if (score >= 40) return 'bg-yellow-100 text-yellow-700 border-yellow-300';
    return 'bg-orange-100 text-orange-700 border-orange-300';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Suggestions de Remplaçants</DialogTitle>
          <DialogDescription>
            Liste des candidats suggérés triés par pertinence
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <Alert variant="danger">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Erreur lors du chargement des suggestions
            </AlertDescription>
          </Alert>
        ) : suggestions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            Aucune suggestion disponible
          </div>
        ) : (
          <div className="space-y-4">
            {suggestions.map((suggestion: any, index: number) => (
              <div
                key={suggestion.employee.id}
                className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold text-lg">
                        {suggestion.employee.firstName} {suggestion.employee.lastName}
                      </h4>
                      {suggestion.employee.matricule && (
                        <Badge variant="outline">{suggestion.employee.matricule}</Badge>
                      )}
                      <Badge className={getScoreColor(suggestion.score)}>
                        Score: {suggestion.score}
                      </Badge>
                    </div>
                    {(suggestion.employee.team || suggestion.employee.site) && (
                      <div className="text-sm text-gray-600 mb-2">
                        {suggestion.employee.team && <span>Équipe: {suggestion.employee.team}</span>}
                        {suggestion.employee.team && suggestion.employee.site && ' • '}
                        {suggestion.employee.site && <span>Site: {suggestion.employee.site}</span>}
                      </div>
                    )}
                  </div>
                  <Button
                    onClick={() => {
                      onSelect(suggestion.employee.id);
                      onClose();
                    }}
                    size="sm"
                  >
                    Sélectionner
                  </Button>
                </div>

                {/* Raisons positives */}
                {suggestion.reasons && suggestion.reasons.length > 0 && (
                  <div className="mb-2">
                    <div className="flex flex-wrap gap-2">
                      {suggestion.reasons.map((reason: string, idx: number) => (
                        <div key={idx} className="flex items-center gap-1 text-sm text-green-700">
                          <Check className="h-3 w-3" />
                          <span>{reason}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Avertissements */}
                {suggestion.warnings && suggestion.warnings.length > 0 && (
                  <div className="mt-2 pt-2 border-t">
                    <div className="flex flex-col gap-1">
                      {suggestion.warnings.map((warning: string, idx: number) => (
                        <Alert key={idx} className="py-2">
                          <AlertTriangle className="h-4 w-4 text-yellow-600" />
                          <AlertDescription className="text-sm">{warning}</AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
