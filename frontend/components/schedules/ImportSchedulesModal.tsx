'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, X, FileSpreadsheet, AlertCircle, CheckCircle, XCircle, Download } from 'lucide-react';
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

export function ImportSchedulesModal({ onClose, onSuccess }: ImportSchedulesModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  
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
      const blob = await schedulesApi.getImportTemplate();
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'modele_import_plannings.xlsx');
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

    try {
      const result = await importSchedulesMutation.mutateAsync(selectedFile);
      
      // Set import result for display
      // The backend returns: { statusCode, message, data: { success, failed, errors, imported } }
      if (result?.data) {
        setImportResult(result.data);
      }
      
      // onSuccess callback is handled by the mutation hook
      if (result?.data?.success > 0) {
        onSuccess();
      }
    } catch (error: any) {
      // Error is already handled by the mutation hook
      // But we can set the result if available for display
      if (error?.response?.data?.data) {
        setImportResult(error.response.data.data);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-auto">
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
          {/* Instructions */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <div className="space-y-2">
              <p className="font-semibold">Format du fichier Excel attendu:</p>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li><strong>Matricule</strong> (obligatoire) - Matricule de l'employé</li>
                <li><strong>Date Début</strong> (obligatoire) - Date de début au format DD/MM/YYYY (ex: 15/01/2025) ou YYYY-MM-DD (ex: 2025-01-15)</li>
                <li><strong>Date Fin</strong> (optionnel) - Date de fin pour créer un intervalle au format DD/MM/YYYY (ex: 31/01/2025). Si vide, crée un planning pour une seule journée</li>
                <li><strong>Code Shift</strong> (obligatoire) - Code du shift (ex: M, S, N)</li>
                <li><strong>Heure Début</strong> (optionnel) - Heure de début personnalisée au format HH:mm (ex: 08:00)</li>
                <li><strong>Heure Fin</strong> (optionnel) - Heure de fin personnalisée au format HH:mm (ex: 16:00)</li>
                <li><strong>Code Équipe</strong> (optionnel) - Code de l'équipe</li>
                <li><strong>Notes</strong> (optionnel) - Notes supplémentaires</li>
              </ul>
              <p className="text-sm text-text-secondary mt-2">
                <strong>Note :</strong> Si "Date Fin" est remplie, tous les plannings entre la date début et la date fin seront créés. Les plannings existants seront ignorés. Le format de date recommandé est DD/MM/YYYY (format français).
              </p>
            </div>
          </Alert>

          {/* Download Template Button */}
          <div className="flex justify-end">
            <Button variant="outline" onClick={handleDownloadTemplate} className="gap-2">
              <Download className="h-4 w-4" />
              Télécharger le modèle
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
          {importSchedulesMutation.isPending && (
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
          {importResult && !importSchedulesMutation.isPending && (
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
            <Button variant="outline" onClick={onClose} disabled={importSchedulesMutation.isPending}>
              Fermer
            </Button>
            <Button
              variant="primary"
              onClick={handleImport}
              disabled={!selectedFile || importSchedulesMutation.isPending}
            >
              {importSchedulesMutation.isPending ? (
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

