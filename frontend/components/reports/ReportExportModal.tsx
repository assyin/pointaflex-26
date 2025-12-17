'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { FileText, FileSpreadsheet, FileBarChart, Download, X } from 'lucide-react';

interface Column {
  id: string;
  label: string;
  default: boolean;
}

interface ReportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (config: ExportConfig) => void;
  reportType: string;
  reportName: string;
  availableColumns: Column[];
  defaultFormat?: 'PDF' | 'EXCEL' | 'CSV';
  isLoading?: boolean;
}

export interface ExportConfig {
  format: 'PDF' | 'EXCEL' | 'CSV';
  columns: string[];
  template?: 'standard' | 'detailed' | 'summary';
  includeSummary?: boolean;
  includeCharts?: boolean;
}

const TEMPLATE_DESCRIPTIONS = {
  standard: 'Rapport standard avec colonnes essentielles',
  detailed: 'Rapport détaillé avec toutes les colonnes et statistiques',
  summary: 'Rapport synthèse avec uniquement les totaux et statistiques',
};

export function ReportExportModal({
  isOpen,
  onClose,
  onExport,
  reportType,
  reportName,
  availableColumns,
  defaultFormat = 'EXCEL',
  isLoading = false,
}: ReportExportModalProps) {
  const [format, setFormat] = useState<'PDF' | 'EXCEL' | 'CSV'>(defaultFormat);
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(
    new Set(availableColumns.filter(col => col.default).map(col => col.id))
  );
  const [template, setTemplate] = useState<'standard' | 'detailed' | 'summary'>('standard');
  const [includeSummary, setIncludeSummary] = useState(true);
  const [includeCharts, setIncludeCharts] = useState(false);

  const handleToggleColumn = (columnId: string) => {
    const newSelected = new Set(selectedColumns);
    if (newSelected.has(columnId)) {
      newSelected.delete(columnId);
    } else {
      newSelected.add(columnId);
    }
    setSelectedColumns(newSelected);
  };

  const handleSelectAll = () => {
    setSelectedColumns(new Set(availableColumns.map(col => col.id)));
  };

  const handleDeselectAll = () => {
    setSelectedColumns(new Set());
  };

  const handleExport = () => {
    if (selectedColumns.size === 0) {
      alert('Veuillez sélectionner au moins une colonne');
      return;
    }

    onExport({
      format,
      columns: Array.from(selectedColumns),
      template,
      includeSummary,
      includeCharts: format === 'PDF' ? includeCharts : false, // Charts seulement pour PDF
    });
  };

  const formatIcon: Record<'PDF' | 'EXCEL' | 'CSV', typeof FileText> = {
    PDF: FileText,
    EXCEL: FileSpreadsheet,
    CSV: FileBarChart,
  };

  const FormatIcon = formatIcon[format] || FileText;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {FormatIcon && <FormatIcon className="h-5 w-5" />}
            Exporter le rapport - {reportName}
          </DialogTitle>
          <DialogDescription>
            Configurez les options d'export pour personnaliser votre rapport
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Format Selection */}
          <div className="space-y-2">
            <Label>Format d'export</Label>
            <div className="grid grid-cols-3 gap-3">
              {(['PDF', 'EXCEL', 'CSV'] as const).map((fmt) => {
                const Icon = formatIcon[fmt] || FileText;
                return (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => setFormat(fmt)}
                    className={`p-4 border-2 rounded-lg transition-all ${
                      format === fmt
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    {Icon && <Icon className="h-6 w-6 mx-auto mb-2" />}
                    <p className="text-sm font-medium">{fmt}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Template Selection */}
          <div className="space-y-2">
            <Label>Template</Label>
            <Select value={template} onValueChange={(value: any) => setTemplate(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">
                  Standard - {TEMPLATE_DESCRIPTIONS.standard}
                </SelectItem>
                <SelectItem value="detailed">
                  Détaillé - {TEMPLATE_DESCRIPTIONS.detailed}
                </SelectItem>
                <SelectItem value="summary">
                  Synthèse - {TEMPLATE_DESCRIPTIONS.summary}
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-text-secondary">
              {TEMPLATE_DESCRIPTIONS[template]}
            </p>
          </div>

          {/* Column Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Colonnes à inclure</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAll}
                  className="text-xs"
                >
                  Tout sélectionner
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleDeselectAll}
                  className="text-xs"
                >
                  Tout désélectionner
                </Button>
              </div>
            </div>
            <div className="border rounded-lg p-4 max-h-60 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                {availableColumns.map((column) => (
                  <div key={column.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={column.id}
                      checked={selectedColumns.has(column.id)}
                      onCheckedChange={() => handleToggleColumn(column.id)}
                    />
                    <Label
                      htmlFor={column.id}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {column.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-xs text-text-secondary">
              {selectedColumns.size} colonne(s) sélectionnée(s) sur {availableColumns.length}
            </p>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <Label>Options supplémentaires</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeSummary"
                  checked={includeSummary}
                  onCheckedChange={(checked) => setIncludeSummary(checked as boolean)}
                />
                <Label htmlFor="includeSummary" className="text-sm font-normal cursor-pointer">
                  Inclure le résumé statistique
                </Label>
              </div>
              {format === 'PDF' && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeCharts"
                    checked={includeCharts}
                    onCheckedChange={(checked) => setIncludeCharts(checked as boolean)}
                  />
                  <Label htmlFor="includeCharts" className="text-sm font-normal cursor-pointer">
                    Inclure les graphiques (PDF uniquement)
                  </Label>
                </div>
              )}
            </div>
          </div>

          {/* Preview Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <strong>Format sélectionné :</strong> {format}
            </p>
            <p className="text-xs text-blue-700 mt-1">
              Le fichier sera généré avec {selectedColumns.size} colonne(s) selon le template "{template}"
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            <X className="h-4 w-4 mr-2" />
            Annuler
          </Button>
          <Button onClick={handleExport} disabled={isLoading || selectedColumns.size === 0}>
            <Download className="h-4 w-4 mr-2" />
            {isLoading ? 'Génération...' : 'Exporter'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

