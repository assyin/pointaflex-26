'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ComparisonData {
  label: string;
  current: number;
  previous: number;
  unit?: string;
}

interface ReportComparisonViewProps {
  currentPeriod: {
    startDate: string;
    endDate: string;
  };
  previousPeriod: {
    startDate: string;
    endDate: string;
  };
  currentData: any;
  previousData: any;
  reportType: string;
}

export function ReportComparisonView({
  currentPeriod,
  previousPeriod,
  currentData,
  previousData,
  reportType,
}: ReportComparisonViewProps) {
  const getComparisonMetrics = (): ComparisonData[] => {
    if (!currentData?.summary || !previousData?.summary) return [];

    switch (reportType) {
      case 'attendance':
        return [
          {
            label: 'Total pointages',
            current: currentData.summary.total || 0,
            previous: previousData.summary.total || 0,
          },
          {
            label: 'Anomalies',
            current: currentData.summary.anomalies || 0,
            previous: previousData.summary.anomalies || 0,
          },
          {
            label: 'Heures travaillées',
            current: currentData.summary.totalWorkedHours || 0,
            previous: previousData.summary.totalWorkedHours || 0,
            unit: 'h',
          },
          {
            label: 'Employés uniques',
            current: currentData.summary.uniqueEmployees || 0,
            previous: previousData.summary.uniqueEmployees || 0,
          },
        ];
      case 'overtime':
        return [
          {
            label: 'Total demandes',
            current: currentData.summary.total || 0,
            previous: previousData.summary.total || 0,
          },
          {
            label: 'Heures totales',
            current: currentData.summary.totalHours || 0,
            previous: previousData.summary.totalApprovedHours || 0,
            unit: 'h',
          },
          {
            label: 'Heures approuvées',
            current: currentData.summary.totalApprovedHours || 0,
            previous: previousData.summary.totalApprovedHours || 0,
            unit: 'h',
          },
        ];
      case 'absences':
        return [
          {
            label: 'Total anomalies',
            current: currentData.summary.totalAnomalies || 0,
            previous: previousData.summary.totalAnomalies || 0,
          },
          {
            label: 'Absences',
            current: currentData.summary.totalAbsences || 0,
            previous: previousData.summary.totalAbsences || 0,
          },
          {
            label: 'Retards',
            current: currentData.summary.lateCount || 0,
            previous: previousData.summary.lateCount || 0,
          },
        ];
      case 'payroll':
        return [
          {
            label: 'Total employés',
            current: currentData.summary.totalEmployees || 0,
            previous: previousData.summary.totalEmployees || 0,
          },
          {
            label: 'Jours travaillés',
            current: currentData.summary.totalWorkedDays || 0,
            previous: previousData.summary.totalWorkedDays || 0,
          },
          {
            label: 'Heures normales',
            current: currentData.summary.totalNormalHours || 0,
            previous: previousData.summary.totalNormalHours || 0,
            unit: 'h',
          },
          {
            label: 'Heures sup',
            current: currentData.summary.totalOvertimeHours || 0,
            previous: previousData.summary.totalOvertimeHours || 0,
            unit: 'h',
          },
        ];
      default:
        return [];
    }
  };

  const calculateChange = (current: number, previous: number): { value: number; percent: number; trend: 'up' | 'down' | 'neutral' } => {
    if (previous === 0) {
      return { value: current, percent: current > 0 ? 100 : 0, trend: current > 0 ? 'up' : 'neutral' };
    }
    const diff = current - previous;
    const percent = (diff / previous) * 100;
    return {
      value: diff,
      percent: Math.abs(percent),
      trend: diff > 0 ? 'up' : diff < 0 ? 'down' : 'neutral',
    };
  };

  const metrics = getComparisonMetrics();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Comparaison de Périodes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-600 font-medium mb-1">Période actuelle</p>
            <p className="text-sm font-bold text-blue-700">
              {format(new Date(currentPeriod.startDate), 'dd MMM yyyy', { locale: fr })} - {format(new Date(currentPeriod.endDate), 'dd MMM yyyy', { locale: fr })}
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 font-medium mb-1">Période précédente</p>
            <p className="text-sm font-bold text-gray-700">
              {format(new Date(previousPeriod.startDate), 'dd MMM yyyy', { locale: fr })} - {format(new Date(previousPeriod.endDate), 'dd MMM yyyy', { locale: fr })}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {metrics.map((metric, index) => {
            const change = calculateChange(metric.current, metric.previous);
            const TrendIcon = change.trend === 'up' ? TrendingUp : change.trend === 'down' ? TrendingDown : Minus;
            const trendColor = change.trend === 'up' ? 'text-green-600' : change.trend === 'down' ? 'text-red-600' : 'text-gray-600';

            return (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-text-primary">{metric.label}</p>
                  <div className="flex items-center gap-2">
                    <TrendIcon className={`h-4 w-4 ${trendColor}`} />
                    <Badge variant={change.trend === 'up' ? 'success' : change.trend === 'down' ? 'danger' : 'outline'}>
                      {change.trend === 'up' ? '+' : change.trend === 'down' ? '-' : ''}
                      {change.percent.toFixed(1)}%
                    </Badge>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-text-secondary mb-1">Actuel</p>
                    <p className="text-lg font-bold text-text-primary">
                      {metric.current.toFixed(metric.unit === 'h' ? 1 : 0)}{metric.unit || ''}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-text-secondary mb-1">Précédent</p>
                    <p className="text-lg font-bold text-text-secondary">
                      {metric.previous.toFixed(metric.unit === 'h' ? 1 : 0)}{metric.unit || ''}
                    </p>
                  </div>
                </div>
                {change.value !== 0 && (
                  <p className="text-xs text-text-secondary mt-2">
                    Écart: {change.value > 0 ? '+' : ''}{change.value.toFixed(metric.unit === 'h' ? 1 : 0)}{metric.unit || ''}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

