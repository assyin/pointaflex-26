'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Download,
  Calendar,
  Clock,
  TrendingUp,
  Users,
  FileSpreadsheet,
  FileBarChart,
} from 'lucide-react';
import {
  useAttendanceReport,
  useOvertimeReport,
  usePayrollReport,
  useExportReport,
  useReportHistory,
} from '@/lib/hooks/useReports';

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState<string>('attendance');
  const [startDate, setStartDate] = useState(
    format(new Date(new Date().setDate(1)), 'yyyy-MM-dd')
  );
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Fetch reports based on selection
  const { data: attendanceData, isLoading: attendanceLoading } = useAttendanceReport({
    startDate,
    endDate,
  });

  const { data: overtimeData, isLoading: overtimeLoading } = useOvertimeReport({
    startDate,
    endDate,
  });

  const { data: payrollData, isLoading: payrollLoading } = usePayrollReport({
    startDate,
    endDate,
  });

  const { data: historyData } = useReportHistory();
  const exportMutation = useExportReport();

  const reportTypes = [
    {
      id: 'attendance',
      name: 'Feuille de présence',
      description: 'Rapport détaillé des présences et absences',
      icon: Calendar,
      color: 'text-blue-600',
    },
    {
      id: 'overtime',
      name: 'Heures supplémentaires',
      description: 'Récapitulatif des heures sup et récupérations',
      icon: Clock,
      color: 'text-purple-600',
    },
    {
      id: 'absences',
      name: 'Retards & Absences',
      description: 'Synthèse des retards et absences injustifiées',
      icon: TrendingUp,
      color: 'text-orange-600',
    },
    {
      id: 'payroll',
      name: 'Export paie',
      description: 'Données formatées pour import paie',
      icon: FileSpreadsheet,
      color: 'text-green-600',
    },
  ];

  const handleExport = (format: 'PDF' | 'EXCEL' | 'CSV') => {
    exportMutation.mutate({
      reportType: selectedReport,
      filters: {
        startDate,
        endDate,
        format,
      },
    });
  };

  const getCurrentReportData = () => {
    switch (selectedReport) {
      case 'attendance':
        return { data: attendanceData, loading: attendanceLoading };
      case 'overtime':
        return { data: overtimeData, loading: overtimeLoading };
      case 'payroll':
        return { data: payrollData, loading: payrollLoading };
      default:
        return { data: null, loading: false };
    }
  };

  const { data: currentData, loading: currentLoading } = getCurrentReportData();

  return (
    <DashboardLayout
      title="Rapports & Exports"
      subtitle="Générer et exporter des rapports RH"
    >
      <div className="space-y-6">
        {/* Period Selection */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-text-secondary">Du:</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-40"
                />
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-text-secondary">Au:</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-40"
                />
              </div>

              <div className="flex-1" />

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport('PDF')}
                  disabled={exportMutation.isPending}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport('EXCEL')}
                  disabled={exportMutation.isPending}
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Excel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport('CSV')}
                  disabled={exportMutation.isPending}
                >
                  <FileBarChart className="h-4 w-4 mr-2" />
                  CSV
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Report Types */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {reportTypes.map((report) => {
            const Icon = report.icon;
            const isSelected = selectedReport === report.id;

            return (
              <Card
                key={report.id}
                className={`cursor-pointer transition-all hover:shadow-lg ${
                  isSelected ? 'ring-2 ring-primary bg-primary/5' : ''
                }`}
                onClick={() => setSelectedReport(report.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-3 rounded-lg bg-gray-100 ${report.color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-text-primary mb-1">
                        {report.name}
                      </h3>
                      <p className="text-xs text-text-secondary">
                        {report.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Report Preview */}
        <Card>
          <CardHeader>
            <CardTitle>
              Aperçu du rapport -{' '}
              {reportTypes.find((r) => r.id === selectedReport)?.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {currentLoading ? (
              <div className="flex items-center justify-center py-12">
                <Clock className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-3 text-text-secondary">Chargement...</span>
              </div>
            ) : currentData ? (
              <div className="space-y-4">
                {/* Stats Summary */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-600 font-medium">Total employés</p>
                    <p className="text-2xl font-bold text-blue-700">
                      {currentData.totalEmployees || 0}
                    </p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-600 font-medium">Présences</p>
                    <p className="text-2xl font-bold text-green-700">
                      {currentData.totalPresent || 0}
                    </p>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg">
                    <p className="text-sm text-orange-600 font-medium">Absences</p>
                    <p className="text-2xl font-bold text-orange-700">
                      {currentData.totalAbsent || 0}
                    </p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <p className="text-sm text-purple-600 font-medium">Heures total</p>
                    <p className="text-2xl font-bold text-purple-700">
                      {currentData.totalHours || 0}h
                    </p>
                  </div>
                </div>

                {/* Data Table Preview */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 border-b">
                    <p className="text-sm font-medium text-text-secondary">
                      Données du rapport (aperçu)
                    </p>
                  </div>
                  <div className="p-4">
                    <p className="text-sm text-text-secondary">
                      {currentData.records?.length || 0} entrée(s) dans ce rapport
                    </p>
                    <p className="text-xs text-text-secondary mt-2">
                      Utilisez les boutons d'export ci-dessus pour télécharger le rapport complet
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-text-secondary">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>Sélectionnez une période pour générer le rapport</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Report History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Historique des rapports générés
            </CardTitle>
          </CardHeader>
          <CardContent>
            {historyData && historyData.length > 0 ? (
              <div className="space-y-2">
                {historyData.slice(0, 5).map((item: any, index: number) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium text-text-primary">{item.name}</p>
                        <p className="text-xs text-text-secondary">
                          {format(new Date(item.createdAt), 'dd MMM yyyy à HH:mm', {
                            locale: fr,
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="default">{item.format}</Badge>
                      <Button variant="outline" size="sm">
                        <Download className="h-3 w-3 mr-1" />
                        Télécharger
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-text-secondary">
                <p>Aucun rapport généré récemment</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
