'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, X, FileSpreadsheet, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/api/client';

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
    firstName: string;
    lastName: string;
  }>;
}

interface ImportExcelModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function ImportExcelModal({ onClose, onSuccess }: ImportExcelModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.name.match(/\.(xlsx|xls)$/)) {
        setSelectedFile(file);
        setImportResult(null);
        setUploadProgress(0);
      } else {
        toast.error('Format de fichier invalide. Seuls les fichiers .xlsx et .xls sont acceptés.');
      }
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      toast.error('Veuillez sélectionner un fichier');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await apiClient.post('/employees/import/excel', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percentCompleted);
          }
        },
      });

      setImportResult(response.data.data);
      setUploadProgress(100);

      if (response.data.data.success > 0) {
        toast.success(`${response.data.data.success} employé(s) importé(s) avec succès!`);
        onSuccess();
      }

      if (response.data.data.failed > 0) {
        toast.warning(`${response.data.data.failed} employé(s) n'ont pas pu être importés`);
      }
    } catch (error: any) {
      console.error('Import error:', error);
      toast.error(error.response?.data?.message || 'Erreur lors de l\'importation');
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importer des Employés depuis Excel
          </CardTitle>
          <Button variant="outline" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Instructions */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-semibold">Format du fichier Excel attendu:</p>
                <ul className="list-disc list-inside text-sm space-y-1">
                  <li>Matricule (obligatoire)</li>
                  <li>Nom (obligatoire)</li>
                  <li>Prénom (obligatoire)</li>
                  <li>Date de Naissance, Téléphone, Adresse, Poste (optionnels)</li>
                </ul>
                <p className="text-sm text-text-secondary mt-2">
                  Les employés existants seront mis à jour, les nouveaux seront créés.
                </p>
              </div>
            </AlertDescription>
          </Alert>

          {/* File Upload */}
          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
            <input
              type="file"
              id="excel-file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
            />
            <label htmlFor="excel-file" className="cursor-pointer">
              {selectedFile ? (
                <div className="space-y-2">
                  <FileSpreadsheet className="h-12 w-12 mx-auto text-success" />
                  <p className="font-medium text-text-primary">{selectedFile.name}</p>
                  <p className="text-sm text-text-secondary">
                    {(selectedFile.size / 1024).toFixed(2)} KB
                  </p>
                  <Button variant="outline" size="sm" onClick={() => setSelectedFile(null)} disabled={isUploading}>
                    Changer de fichier
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-12 w-12 mx-auto text-text-secondary" />
                  <p className="font-medium text-text-primary">
                    Cliquez pour sélectionner un fichier Excel
                  </p>
                  <p className="text-sm text-text-secondary">
                    Formats acceptés: .xlsx, .xls
                  </p>
                </div>
              )}
            </label>
          </div>

          {/* Progress Bar */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-text-primary">Importation en cours...</span>
                <span className="text-text-secondary">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-primary h-full transition-all duration-300 ease-out rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Import Result */}
          {importResult && (
            <div className="space-y-4">
              <Alert variant={importResult.failed === 0 ? 'info' : 'warning'}>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <div className="flex gap-4">
                      <span className="text-success font-semibold">
                        ✅ {importResult.success} importés
                      </span>
                      {importResult.failed > 0 && (
                        <span className="text-danger font-semibold">
                          ❌ {importResult.failed} échoués
                        </span>
                      )}
                    </div>

                    {importResult.imported.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm font-medium mb-1">Employés importés:</p>
                        <div className="max-h-32 overflow-auto text-sm">
                          {importResult.imported.slice(0, 10).map((emp, index) => (
                            <div key={index} className="text-text-secondary">
                              • {emp.matricule} - {emp.firstName} {emp.lastName}
                            </div>
                          ))}
                          {importResult.imported.length > 10 && (
                            <div className="text-text-secondary">
                              ... et {importResult.imported.length - 10} autres
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>

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
            <Button variant="outline" onClick={onClose} disabled={isUploading}>
              Fermer
            </Button>
            <Button
              variant="primary"
              onClick={handleImport}
              disabled={!selectedFile || isUploading}
            >
              {isUploading ? (
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
