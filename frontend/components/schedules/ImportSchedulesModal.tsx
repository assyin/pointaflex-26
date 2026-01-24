'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, X, FileSpreadsheet, AlertCircle, CheckCircle, XCircle, Download, Calendar, List } from 'lucide-react';
import { toast } from 'sonner';
import { useImportSchedules } from '@/lib/hooks/useSchedules';
import { schedulesApi } from '@/lib/api/schedules';
import { translateErrorMessage } from '@/lib/utils/errorMessages';

interface ImportResult {
  success: number;
  failed: number;
  errors: Array<{
    row: number;
    matricule?: string;
    error: string;
  }>;
  imported: Array<{
    matricule: string;
    date: string;
    shiftCode: string;
  }>;
}

interface ImportSchedulesModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

type ImportFormat = 'standard' | 'weekly-calendar';

export function ImportSchedulesModal({ onClose, onSuccess }: ImportSchedulesModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importFormat, setImportFormat] = useState<ImportFormat>('weekly-calendar');
  const [isImporting, setIsImporting] = useState(false);

  const importSchedulesMutation = useImportSchedules();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.name.match(/\.(xlsx|xls)$/)) {
        setSelectedFile(file);
        setImportResult(null);
      } else {
        toast.error('Format de fichier invalide. Seuls les fichiers .xlsx et .xls sont acceptés.');
      }
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      let blob;
      let filename;

      if (importFormat === 'weekly-calendar') {
        blob = await schedulesApi.getWeeklyCalendarTemplate();
        filename = 'planning_calendrier_hebdomadaire.xlsx';
      } else {
        blob = await schedulesApi.getImportTemplate();
        filename = 'modele_import_plannings.xlsx';
      }

      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Modèle Excel téléchargé avec succès !');
    } catch (error: any) {
      const errorMessage = translateErrorMessage(error);
      toast.error(errorMessage, {
        description: 'Erreur lors du téléchargement du modèle.',
        duration: 5000,
      });
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      toast.error('Veuillez sélectionner un fichier');
      return;
    }

    setIsImporting(true);

    try {
      let result;

      if (importFormat === 'weekly-calendar') {
        result = await schedulesApi.importWeeklyCalendar(selectedFile);
      } else {
        result = await importSchedulesMutation.mutateAsync(selectedFile);
      }

      // Set import result for display
      if (result?.data) {
        setImportResult(result.data);
      }

      // onSuccess callback
      if (result?.data?.success > 0) {
        onSuccess();
        toast.success(`${result.data.success} planning(s) importé(s) avec succès`);
      }
    } catch (error: any) {
      // Error handling
      if (error?.response?.data?.data) {
        setImportResult(error.response.data.data);
      }
      toast.error(translateErrorMessage(error));
    } finally {
      setIsImporting(false);
    }
  };

  const isPending = isImporting || importSchedulesMutation.isPending;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 cursor-default"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
      aria-hidden="true"
    >
      <Card
        className="w-full max-w-3xl max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importer des Plannings depuis Excel
          </CardTitle>
          <Button variant="outline" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Format Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Format d'import:</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setImportFormat('weekly-calendar');
                  setSelectedFile(null);
                  setImportResult(null);
                }}
                className={`p-4 border-2 rounded-lg text-left transition-all ${
                  importFormat === 'weekly-calendar'
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Calendar className={`h-8 w-8 ${importFormat === 'weekly-calendar' ? 'text-primary' : 'text-gray-400'}`} />
                  <div>
                    <p className="font-semibold">Calendrier Hebdomadaire</p>
                    <p className="text-xs text-text-secondary">Vue semaine avec Lun-Dim (Recommandé)</p>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setImportFormat('standard');
                  setSelectedFile(null);
                  setImportResult(null);
                }}
                className={`p-4 border-2 rounded-lg text-left transition-all ${
                  importFormat === 'standard'
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <List className={`h-8 w-8 ${importFormat === 'standard' ? 'text-primary' : 'text-gray-400'}`} />
                  <div>
                    <p className="font-semibold">Format Liste</p>
                    <p className="text-xs text-text-secondary">Une ligne par planning</p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Instructions based on format */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            {importFormat === 'weekly-calendar' ? (
              <div className="space-y-2">
                <p className="font-semibold">Format Calendrier Hebdomadaire:</p>
                <ul className="list-disc list-inside text-sm space-y-1">
                  <li><strong>Feuille "Planning"</strong> - Contient le planning des employés</li>
                  <li><strong>Ligne "Semaine du"</strong> - Date du lundi de la semaine (DD/MM/YYYY)</li>
                  <li><strong>Colonnes</strong>: Matricule | Nom | Prénom | Département | Lun | Mar | Mer | Jeu | Ven | Sam | Dim</li>
                  <li><strong>Cellules jour</strong>: Code shift (ex: MATIN, SOIR, NUIT) ou "-" pour repos</li>
                </ul>
                <p className="text-sm text-text-secondary mt-2">
                  <strong>Exemple:</strong> 00994 | EL KHAYATI | Mohamed | GAB | MATIN | MATIN | MATIN | MATIN | MATIN | - | -
                </p>
                <p className="text-sm text-text-secondary">
                  <strong>Horaire personnalisé:</strong> CODE(HH:mm-HH:mm) → MATIN(09:00-18:00)
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="font-semibold">Format Liste (une ligne par planning):</p>
                <ul className="list-disc list-inside text-sm space-y-1">
                  <li><strong>Matricule</strong> (obligatoire) - Matricule de l'employé</li>
                  <li><strong>Date Début</strong> (obligatoire) - Format DD/MM/YYYY</li>
                  <li><strong>Date Fin</strong> (optionnel) - Pour créer un intervalle</li>
                  <li><strong>Code Shift</strong> (obligatoire) - Code du shift</li>
                  <li><strong>Heure Début/Fin</strong> (optionnel) - Format HH:mm</li>
                  <li><strong>Code Équipe</strong> (optionnel)</li>
                  <li><strong>Notes</strong> (optionnel)</li>
                </ul>
              </div>
            )}
          </Alert>

          {/* Download Template Button */}
          <div className="flex justify-end">
            <Button variant="outline" onClick={handleDownloadTemplate} className="gap-2">
              <Download className="h-4 w-4" />
              Télécharger le modèle {importFormat === 'weekly-calendar' ? 'calendrier' : 'liste'}
            </Button>
          </div>

          {/* File Upload */}
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer"
            onClick={() => document.getElementById('file-input-schedules')?.click()}
          >
            <input
              id="file-input-schedules"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
            />
            {selectedFile ? (
              <div className="space-y-2">
                <FileSpreadsheet className="h-12 w-12 mx-auto text-primary" />
                <p className="font-semibold text-text-primary">{selectedFile.name}</p>
                <p className="text-sm text-text-secondary">
                  {(selectedFile.size / 1024).toFixed(2)} KB
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(null);
                    setImportResult(null);
                  }}
                >
                  Changer de fichier
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="h-12 w-12 mx-auto text-gray-400" />
                <p className="text-text-primary font-medium">
                  Cliquez pour sélectionner un fichier Excel
                </p>
                <p className="text-sm text-text-secondary">
                  Formats acceptés: .xlsx, .xls
                </p>
              </div>
            )}
          </div>

          {/* Upload Progress */}
          {isPending && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Importation en cours...</span>
                <span className="text-text-secondary">En traitement...</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300 animate-pulse"
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          )}

          {/* Import Results */}
          {importResult && !isPending && (
            <div className="space-y-4">
              {/* Success Summary */}
              {importResult.success > 0 && (
                <Alert className="border-green-500 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription>
                    <p className="font-semibold text-green-800 mb-2">
                      {importResult.success} planning(s) importé(s) avec succès
                    </p>
                    {importResult.imported.length > 0 && (
                      <div className="max-h-32 overflow-auto space-y-1 text-sm">
                        {importResult.imported.slice(0, 10).map((item, index) => (
                          <div key={index} className="text-green-700">
                            {item.matricule} - {item.date} - Shift {item.shiftCode}
                          </div>
                        ))}
                        {importResult.imported.length > 10 && (
                          <div className="text-green-600 text-xs">
                            ... et {importResult.imported.length - 10} autre(s)
                          </div>
                        )}
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {/* Errors */}
              {importResult.errors.length > 0 && (
                <Alert variant="danger">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    <p className="font-semibold mb-2">Erreurs d'importation:</p>
                    <div className="max-h-48 overflow-auto space-y-1 text-sm">
                      {importResult.errors.map((error, index) => (
                        <div key={index} className="text-danger">
                          Ligne {error.row}
                          {error.matricule && ` (${error.matricule})`}: {error.error}
                        </div>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={onClose} disabled={isPending}>
              Fermer
            </Button>
            <Button
              variant="primary"
              onClick={handleImport}
              disabled={!selectedFile || isPending}
            >
              {isPending ? (
                <>
                  <Upload className="h-4 w-4 mr-2 animate-pulse" />
                  Importation en cours...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Importer
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
