'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, X, FileSpreadsheet, AlertCircle, CheckCircle, XCircle, Building2, Briefcase, Users, MapPin, Clock } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/api/client';
import * as XLSX from 'xlsx';

interface ImportLogEntry {
  type: 'info' | 'success' | 'warning' | 'error' | 'site' | 'department' | 'position' | 'team' | 'shift';
  message: string;
  timestamp: string;
}

interface ImportResult {
  success: number;
  failed: number;
  totalToProcess: number;
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
  logs: ImportLogEntry[];
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
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [currentCount, setCurrentCount] = useState(0);
  const [importLogs, setImportLogs] = useState<ImportLogEntry[]>([]);
  const logsContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs to bottom
  useEffect(() => {
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [importLogs]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.name.match(/\.(xlsx|xls)$/)) {
        setSelectedFile(file);
        setImportResult(null);
        setUploadProgress(0);
        setImportLogs([]);
        setCurrentCount(0);

        // Parse Excel file to get total count
        try {
          const buffer = await file.arrayBuffer();
          const workbook = XLSX.read(buffer, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          // Count non-empty rows (excluding header)
          const dataRows = rows.slice(1).filter((row: any) => row && row.length > 0 && row[0]);
          setTotalEmployees(dataRows.length);

          setImportLogs([{
            type: 'info',
            message: `📄 Fichier analysé: ${dataRows.length} employés détectés`,
            timestamp: new Date().toISOString()
          }]);
        } catch (error) {
          console.error('Error parsing Excel:', error);
          toast.error('Erreur lors de l\'analyse du fichier');
        }
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
    setImportResult(null);
    setCurrentCount(0);

    // Add starting log
    setImportLogs(prev => [...prev, {
      type: 'info',
      message: `🚀 Démarrage de l'import...`,
      timestamp: new Date().toISOString()
    }]);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      // Simulate progress based on total employees
      const progressInterval = setInterval(() => {
        setCurrentCount((prev) => {
          const newCount = Math.min(prev + 1, totalEmployees - 1);
          const progress = Math.round((newCount / totalEmployees) * 90);
          setUploadProgress(progress);
          return newCount;
        });
      }, 100);

      const response = await apiClient.post('/employees/import/excel', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Stop progress simulation
      clearInterval(progressInterval);

      // Set final values
      setUploadProgress(100);
      setCurrentCount(response.data.data.success);
      setImportResult(response.data.data);

      // Add logs from backend response
      if (response.data.data.logs && response.data.data.logs.length > 0) {
        setImportLogs(prev => [...prev, ...response.data.data.logs]);
      }

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
      setImportLogs(prev => [...prev, {
        type: 'error',
        message: `❌ Erreur: ${error.response?.data?.message || 'Erreur inconnue'}`,
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsUploading(false);
    }
  };

  const getLogIcon = (type: string) => {
    switch (type) {
      case 'site':
        return <MapPin className="h-3 w-3 text-blue-500" />;
      case 'department':
        return <Building2 className="h-3 w-3 text-purple-500" />;
      case 'position':
        return <Briefcase className="h-3 w-3 text-orange-500" />;
      case 'team':
        return <Users className="h-3 w-3 text-green-500" />;
      case 'shift':
        return <Clock className="h-3 w-3 text-cyan-500" />;
      case 'warning':
        return <AlertCircle className="h-3 w-3 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-3 w-3 text-red-500" />;
      case 'success':
        return <CheckCircle className="h-3 w-3 text-green-500" />;
      default:
        return <Clock className="h-3 w-3 text-gray-500" />;
    }
  };

  const getLogColor = (type: string) => {
    switch (type) {
      case 'site':
        return 'text-blue-600 bg-blue-50';
      case 'department':
        return 'text-purple-600 bg-purple-50';
      case 'position':
        return 'text-orange-600 bg-orange-50';
      case 'team':
        return 'text-green-600 bg-green-50';
      case 'shift':
        return 'text-cyan-600 bg-cyan-50';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50';
      case 'error':
        return 'text-red-600 bg-red-50';
      case 'success':
        return 'text-green-600 bg-green-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

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
        className="w-full max-w-2xl max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
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
                    {(selectedFile.size / 1024).toFixed(2)} KB • {totalEmployees} employés détectés
                  </p>
                  <Button variant="outline" size="sm" onClick={() => {
                    setSelectedFile(null);
                    setTotalEmployees(0);
                    setImportLogs([]);
                  }} disabled={isUploading}>
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

          {/* Progress Bar with Counter */}
          {isUploading && (
            <div className="space-y-3">
              {/* Counter */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></div>
                  <span className="font-medium text-text-primary">Importation en cours...</span>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-primary">{currentCount}</span>
                  <span className="text-lg text-text-secondary">/{totalEmployees}</span>
                  <span className="text-sm text-text-secondary ml-2">employés</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-5 overflow-hidden shadow-inner">
                <div
                  className="bg-gradient-to-r from-primary to-primary/80 h-full transition-all duration-300 ease-out rounded-full flex items-center justify-center relative"
                  style={{ width: `${uploadProgress}%`, minWidth: uploadProgress > 0 ? '3rem' : '0' }}
                >
                  {uploadProgress > 10 && (
                    <span className="text-xs font-bold text-white drop-shadow">
                      {uploadProgress}%
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Import Logs */}
          {importLogs.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-text-primary">Journal d'import</p>
                <span className="text-xs text-text-secondary">{importLogs.length} entrée(s)</span>
              </div>
              <div
                ref={logsContainerRef}
                className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 max-h-40 overflow-y-auto space-y-1 font-mono text-xs"
              >
                {importLogs.map((log, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-2 px-2 py-1 rounded ${getLogColor(log.type)}`}
                  >
                    {getLogIcon(log.type)}
                    <span>{log.message}</span>
                  </div>
                ))}
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
                    <div className="flex gap-4 items-center">
                      <span className="text-success font-semibold text-lg">
                        ✅ {importResult.success} importés
                      </span>
                      {importResult.failed > 0 && (
                        <span className="text-danger font-semibold text-lg">
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
                            <div className="text-text-secondary font-medium">
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
                  Importer {totalEmployees > 0 ? `(${totalEmployees})` : ''}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
