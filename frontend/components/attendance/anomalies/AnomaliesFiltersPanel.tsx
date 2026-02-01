'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
// Collapsible removed - using simple state toggle instead
import {
  Filter,
  ChevronDown,
  Download,
  RefreshCw,
  X,
} from 'lucide-react';
import { ANOMALY_LABELS, type AnomalyType } from '@/lib/api/anomalies';

export interface AnomaliesFiltersState {
  startDate: string;
  endDate: string;
  employeeId?: string;
  departmentId?: string;
  siteId?: string;
  anomalyType?: AnomalyType;
  isCorrected?: boolean;
}

interface AnomaliesFiltersPanelProps {
  filters: AnomaliesFiltersState;
  onFiltersChange: (filters: AnomaliesFiltersState) => void;
  onRefresh: () => void;
  onExport: (format: 'csv' | 'excel') => void;
  isExporting?: boolean;
  departments?: Array<{ id: string; name: string }>;
  sites?: Array<{ id: string; name: string }>;
  employees?: Array<{ id: string; firstName: string; lastName: string }>;
}

export function AnomaliesFiltersPanel({
  filters,
  onFiltersChange,
  onRefresh,
  onExport,
  isExporting,
  departments = [],
  sites = [],
  employees = [],
}: AnomaliesFiltersPanelProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const handleFilterChange = (key: keyof AnomaliesFiltersState, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value === 'all' ? undefined : value,
    });
  };

  const handleClearFilters = () => {
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);

    onFiltersChange({
      startDate: sevenDaysAgo.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0],
      employeeId: undefined,
      departmentId: undefined,
      siteId: undefined,
      anomalyType: undefined,
      isCorrected: undefined,
    });
  };

  const activeFiltersCount = [
    filters.employeeId,
    filters.departmentId,
    filters.siteId,
    filters.anomalyType,
    filters.isCorrected !== undefined ? true : undefined,
  ].filter(Boolean).length;

  return (
    <Card>
      <CardContent className="p-4">
        {/* Filtres principaux toujours visibles */}
        <div className="flex flex-wrap gap-4 items-end">
          {/* Date Du */}
          <div className="flex-1 min-w-[140px]">
            <Label htmlFor="startDate" className="text-xs text-muted-foreground">
              Du
            </Label>
            <Input
              id="startDate"
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="h-9"
            />
          </div>

          {/* Date Au */}
          <div className="flex-1 min-w-[140px]">
            <Label htmlFor="endDate" className="text-xs text-muted-foreground">
              Au
            </Label>
            <Input
              id="endDate"
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="h-9"
            />
          </div>

          {/* Type d'anomalie */}
          <div className="flex-1 min-w-[180px]">
            <Label className="text-xs text-muted-foreground">
              Type d'anomalie
            </Label>
            <Select
              value={filters.anomalyType || 'all'}
              onValueChange={(value) => handleFilterChange('anomalyType', value)}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Tous les types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                {Object.entries(ANOMALY_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Boutons d'action */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              className="h-9"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1"
              onClick={() => setIsOpen(!isOpen)}
            >
              <Filter className="h-4 w-4" />
              Filtres
              {activeFiltersCount > 0 && (
                <span className="bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 text-xs">
                  {activeFiltersCount}
                </span>
              )}
              <ChevronDown
                className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onExport('csv')}
              disabled={isExporting}
              className="h-9 gap-1"
            >
              <Download className="h-4 w-4" />
              CSV
            </Button>
          </div>
        </div>

        {/* Filtres avancés */}
        {isOpen && (
          <div className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t">
              {/* Employé */}
              <div>
                <Label className="text-xs text-muted-foreground">Employé</Label>
                <Select
                  value={filters.employeeId || 'all'}
                  onValueChange={(value) => handleFilterChange('employeeId', value)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Tous les employés" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les employés</SelectItem>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Département */}
              <div>
                <Label className="text-xs text-muted-foreground">Département</Label>
                <Select
                  value={filters.departmentId || 'all'}
                  onValueChange={(value) => handleFilterChange('departmentId', value)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Tous les départements" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les départements</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Site */}
              <div>
                <Label className="text-xs text-muted-foreground">Site</Label>
                <Select
                  value={filters.siteId || 'all'}
                  onValueChange={(value) => handleFilterChange('siteId', value)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Tous les sites" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les sites</SelectItem>
                    {sites.map((site) => (
                      <SelectItem key={site.id} value={site.id}>
                        {site.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Statut correction */}
              <div>
                <Label className="text-xs text-muted-foreground">Statut</Label>
                <Select
                  value={
                    filters.isCorrected === undefined
                      ? 'all'
                      : filters.isCorrected
                        ? 'corrected'
                        : 'pending'
                  }
                  onValueChange={(value) =>
                    handleFilterChange(
                      'isCorrected',
                      value === 'all' ? undefined : value === 'corrected'
                    )
                  }
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Tous les statuts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="pending">En attente</SelectItem>
                    <SelectItem value="corrected">Corrigées</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Bouton reset */}
            {activeFiltersCount > 0 && (
              <div className="flex justify-end mt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilters}
                  className="gap-1 text-muted-foreground"
                >
                  <X className="h-4 w-4" />
                  Réinitialiser les filtres
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default AnomaliesFiltersPanel;
