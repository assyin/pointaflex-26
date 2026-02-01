'use client';

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  MoreHorizontal,
  Edit,
  Eye,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  FileText,
} from 'lucide-react';
import {
  ANOMALY_LABELS,
  ANOMALY_COLORS,
  INFORMATIVE_ANOMALY_TYPES,
  type AnomalyRecord,
  type AnomalyType,
} from '@/lib/api/anomalies';
import { Info } from 'lucide-react';

interface AnomaliesTableProps {
  data?: AnomalyRecord[];
  isLoading?: boolean;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onCorrect: (anomaly: AnomalyRecord) => void;
  onViewDetails?: (anomaly: AnomalyRecord) => void;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  onPageChange?: (page: number) => void;
}

export function AnomaliesTable({
  data = [],
  isLoading,
  selectedIds,
  onSelectionChange,
  onCorrect,
  onViewDetails,
  pagination,
  onPageChange,
}: AnomaliesTableProps) {
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Exclure les anomalies corrigées ET les anomalies informatives
      const selectableIds = data
        .filter((a) => !a.isCorrected && !INFORMATIVE_ANOMALY_TYPES.includes(a.anomalyType as AnomalyType))
        .map((a) => a.id);
      onSelectionChange(selectableIds);
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedIds, id]);
    } else {
      onSelectionChange(selectedIds.filter((i) => i !== id));
    }
  };

  // Compter les anomalies sélectionnables (non corrigées ET non informatives)
  const selectableCount = data.filter(
    (a) => !a.isCorrected && !INFORMATIVE_ANOMALY_TYPES.includes(a.anomalyType as AnomalyType)
  ).length;
  const allSelectableSelected =
    selectableCount > 0 && selectedIds.length === selectableCount;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Liste des Anomalies</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Liste des Anomalies</CardTitle>
        {selectedIds.length > 0 && (
          <Badge variant="secondary">
            {selectedIds.length} sélectionnée{selectedIds.length > 1 ? 's' : ''}
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Aucune anomalie trouvée pour les critères sélectionnés
          </div>
        ) : (
          <>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={allSelectableSelected}
                        onCheckedChange={handleSelectAll}
                        aria-label="Sélectionner tout"
                      />
                    </TableHead>
                    <TableHead>Employé</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date/Heure</TableHead>
                    <TableHead>Département</TableHead>
                    <TableHead>Shift</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="w-12">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((anomaly) => {
                    const anomalyType = anomaly.anomalyType as AnomalyType;
                    const anomalyLabel =
                      ANOMALY_LABELS[anomalyType] || anomaly.anomalyType;
                    const anomalyColor =
                      ANOMALY_COLORS[anomalyType] || '#6C757D';
                    const isInformative = INFORMATIVE_ANOMALY_TYPES.includes(anomalyType);

                    return (
                      <TableRow
                        key={anomaly.id}
                        className={
                          selectedIds.includes(anomaly.id)
                            ? 'bg-blue-50'
                            : isInformative
                            ? 'bg-gray-50/50'
                            : undefined
                        }
                      >
                        <TableCell>
                          {!isInformative ? (
                            <Checkbox
                              checked={selectedIds.includes(anomaly.id)}
                              onCheckedChange={(checked) =>
                                handleSelectOne(anomaly.id, !!checked)
                              }
                              disabled={anomaly.isCorrected}
                              aria-label={`Sélectionner ${anomaly.employee?.firstName}`}
                            />
                          ) : (
                            <Info className="h-4 w-4 text-gray-400" />
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {anomaly.employee
                              ? `${anomaly.employee.firstName} ${anomaly.employee.lastName}`
                              : 'N/A'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {anomaly.employee?.matricule || ''}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            style={{
                              backgroundColor: `${anomalyColor}20`,
                              color: anomalyColor,
                              borderColor: anomalyColor,
                            }}
                            className="border"
                          >
                            {anomalyLabel}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            {format(parseISO(anomaly.timestamp), 'dd/MM/yyyy', {
                              locale: fr,
                            })}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            {format(parseISO(anomaly.timestamp), 'HH:mm', {
                              locale: fr,
                            })}
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              (anomaly as any).type === 'IN'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {(anomaly as any).type === 'IN' ? 'Entrée' : 'Sortie'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {anomaly.employee?.department?.name || '-'}
                        </TableCell>
                        <TableCell>
                          {anomaly.schedule?.shift ? (
                            <div>
                              <div className="text-sm font-medium">
                                {anomaly.schedule.shift.name}
                                {anomaly.schedule.isDefault && (
                                  <span className="text-xs text-muted-foreground ml-1">(défaut)</span>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {anomaly.schedule.shift.startTime} - {anomaly.schedule.shift.endTime}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">Non assigné</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {isInformative ? (
                            <Badge
                              variant="outline"
                              className="bg-gray-50 text-gray-600 border-gray-200"
                            >
                              <Info className="h-3 w-3 mr-1" />
                              Informatif
                            </Badge>
                          ) : anomaly.isCorrected ? (
                            <Badge
                              variant="outline"
                              className="bg-green-50 text-green-700 border-green-200 cursor-pointer hover:bg-green-100"
                              onClick={() => onViewDetails?.(anomaly)}
                              title={anomaly.correctionNote || 'Cliquez pour voir les détails'}
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Corrigée
                              {anomaly.correctionNote && (
                                <FileText className="h-3 w-3 ml-1" />
                              )}
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="bg-yellow-50 text-yellow-700 border-yellow-200"
                            >
                              <XCircle className="h-3 w-3 mr-1" />
                              En attente
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {onViewDetails && (
                                <DropdownMenuItem
                                  onClick={() => onViewDetails(anomaly)}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  Voir détails
                                </DropdownMenuItem>
                              )}
                              {!anomaly.isCorrected && !isInformative && (
                                <DropdownMenuItem
                                  onClick={() => onCorrect(anomaly)}
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Corriger
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Page {pagination.page} sur {pagination.totalPages} (
                  {pagination.total} résultats)
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange?.(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Précédent
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange?.(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                  >
                    Suivant
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default AnomaliesTable;
