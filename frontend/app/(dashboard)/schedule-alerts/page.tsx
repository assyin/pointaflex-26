'use client';

import React, { useState, useMemo } from 'react';
import { format, parseISO, startOfWeek, endOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertTriangle, Filter, X, Download, RefreshCw, Calendar, Search,
  CheckCircle2, XCircle, Clock, Users, Building2, Loader2
} from 'lucide-react';
import { useScheduleAlerts } from '@/lib/hooks/useSchedules';
import { LegalAlert } from '@/lib/api/schedules';
import { toast } from 'sonner';

export default function ScheduleAlertsPage() {
  // Date range state - default to current week
  const [filterDateStart, setFilterDateStart] = useState<string>(
    format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  );
  const [filterDateEnd, setFilterDateEnd] = useState<string>(
    format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  );

  // Filter states
  const [filterType, setFilterType] = useState<'ALL' | 'CRITICAL' | 'WARNING'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  // Fetch alerts
  const { data: alertsData, isLoading, error, refetch } = useScheduleAlerts(
    filterDateStart,
    filterDateEnd
  );

  // Filter and process alerts
  const processedAlerts = useMemo(() => {
    if (!alertsData) return { critical: [], warning: [], all: [] };

    let filtered = alertsData;

    // Filter by type
    if (filterType !== 'ALL') {
      filtered = filtered.filter(alert => alert.type === filterType);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(alert =>
        alert.employeeName?.toLowerCase().includes(query) ||
        alert.message?.toLowerCase().includes(query) ||
        alert.date?.toLowerCase().includes(query)
      );
    }

    // Exclude dismissed alerts
    filtered = filtered.filter(alert => !dismissedAlerts.has(alert.id));

    // Group by type
    const critical = filtered.filter(a => a.type === 'CRITICAL');
    const warning = filtered.filter(a => a.type === 'WARNING');

    return {
      critical,
      warning,
      all: filtered,
    };
  }, [alertsData, filterType, searchQuery, dismissedAlerts]);

  // Group alerts by employee
  const alertsByEmployee = useMemo(() => {
    const grouped = new Map<string, LegalAlert[]>();
    processedAlerts.all.forEach(alert => {
      const key = alert.employeeId || 'unknown';
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(alert);
    });
    return grouped;
  }, [processedAlerts.all]);

  // Helper to extract alert type from message
  const getAlertType = (message: string): string => {
    if (message.includes('Heures hebdomadaires')) return 'Heures hebdomadaires';
    if (message.includes('Travail de nuit')) return 'Travail de nuit';
    if (message.includes('Aucun employé planifié')) return 'Effectif minimum';
    if (message.includes('Repos insuffisant')) return 'Repos insuffisant';
    return 'Autre';
  };

  const handleDismiss = (alertId: string) => {
    setDismissedAlerts(prev => new Set([...prev, alertId]));
    toast.success('Alerte masquée');
  };

  const handleDismissAll = (type?: 'CRITICAL' | 'WARNING') => {
    const alertsToDismiss = type
      ? processedAlerts[type.toLowerCase() as 'critical' | 'warning']
      : processedAlerts.all;
    
    alertsToDismiss.forEach(alert => {
      setDismissedAlerts(prev => new Set([...prev, alert.id]));
    });
    toast.success(`${alertsToDismiss.length} alerte(s) masquée(s)`);
  };

  const handleResetFilters = () => {
    setFilterType('ALL');
    setSearchQuery('');
    setDismissedAlerts(new Set());
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
    setFilterDateStart(format(weekStart, 'yyyy-MM-dd'));
    setFilterDateEnd(format(weekEnd, 'yyyy-MM-dd'));
  };

  const handleExport = () => {
    // TODO: Implement export functionality
    toast.info('Export en cours de développement');
  };

  return (
    <DashboardLayout
      title="Alertes de Conformité"
      subtitle="Suivi et gestion des alertes critiques et avertissements"
    >
      <div className="space-y-6">
        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filtres et actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <Label htmlFor="dateStart">Date début</Label>
                <Input
                  id="dateStart"
                  type="date"
                  value={filterDateStart}
                  onChange={(e) => setFilterDateStart(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="dateEnd">Date fin</Label>
                <Input
                  id="dateEnd"
                  type="date"
                  value={filterDateEnd}
                  onChange={(e) => setFilterDateEnd(e.target.value)}
                  min={filterDateStart}
                />
              </div>
              <div>
                <Label htmlFor="filterType">Type d'alerte</Label>
                <select
                  id="filterType"
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as 'ALL' | 'CRITICAL' | 'WARNING')}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm"
                >
                  <option value="ALL">Toutes</option>
                  <option value="CRITICAL">Critiques</option>
                  <option value="WARNING">Avertissements</option>
                </select>
              </div>
              <div>
                <Label htmlFor="search">Recherche</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-secondary" />
                  <Input
                    id="search"
                    placeholder="Employé, message..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex items-end gap-2">
                <Button
                  variant="outline"
                  onClick={handleResetFilters}
                  className="flex-1"
                >
                  <X className="h-4 w-4 mr-2" />
                  Réinitialiser
                </Button>
                <Button
                  variant="outline"
                  onClick={() => refetch()}
                  disabled={isLoading}
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-text-secondary">Total d'alertes</p>
                  <p className="text-2xl font-bold">{processedAlerts.all.length}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-text-secondary" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-text-secondary">Critiques</p>
                  <p className="text-2xl font-bold text-red-600">{processedAlerts.critical.length}</p>
                </div>
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-text-secondary">Avertissements</p>
                  <p className="text-2xl font-bold text-yellow-600">{processedAlerts.warning.length}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Loading State */}
        {isLoading && (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {error && (
          <Alert variant="danger">
            <AlertTriangle className="h-5 w-5" />
            <AlertDescription>
              Erreur lors du chargement des alertes. Veuillez réessayer.
            </AlertDescription>
          </Alert>
        )}

        {/* Alerts Display */}
        {!isLoading && !error && (
          <>
            {/* Critical Alerts */}
            {processedAlerts.critical.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <XCircle className="h-6 w-6 text-red-600" />
                      <CardTitle className="text-lg text-red-900">
                        Alertes Critiques ({processedAlerts.critical.length})
                      </CardTitle>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDismissAll('CRITICAL')}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Masquer toutes
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExport}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Exporter
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {processedAlerts.critical.map((alert) => (
                      <Alert
                        key={alert.id}
                        variant="danger"
                        className="border-red-500 bg-red-50"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                {alert.employeeName && (
                                  <Badge variant="danger" className="bg-red-600">
                                    {alert.employeeName}
                                  </Badge>
                                )}
                                <Badge variant="default" className="text-xs">
                                  {getAlertType(alert.message)}
                                </Badge>
                                {alert.date && (
                                  <span className="text-xs text-red-600">
                                    {format(parseISO(alert.date), 'dd/MM/yyyy', { locale: fr })}
                                  </span>
                                )}
                              </div>
                              <AlertDescription className="text-sm text-red-800">
                                {alert.message}
                              </AlertDescription>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-800 hover:bg-red-100 ml-2"
                            onClick={() => handleDismiss(alert.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </Alert>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Warning Alerts */}
            {processedAlerts.warning.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-6 w-6 text-yellow-600" />
                      <CardTitle className="text-lg text-yellow-900">
                        Avertissements ({processedAlerts.warning.length})
                      </CardTitle>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDismissAll('WARNING')}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Masquer toutes
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExport}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Exporter
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {processedAlerts.warning.map((alert) => (
                      <Alert
                        key={alert.id}
                        className="border-yellow-500 bg-yellow-50"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                {alert.employeeName && (
                                  <Badge variant="warning" className="bg-yellow-100 text-yellow-800 border-yellow-500">
                                    {alert.employeeName}
                                  </Badge>
                                )}
                                <Badge variant="default" className="text-xs">
                                  {getAlertType(alert.message)}
                                </Badge>
                                {alert.date && (
                                  <span className="text-xs text-yellow-600">
                                    {format(parseISO(alert.date), 'dd/MM/yyyy', { locale: fr })}
                                  </span>
                                )}
                              </div>
                              <AlertDescription className="text-sm text-yellow-800">
                                {alert.message}
                              </AlertDescription>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0 text-yellow-600 hover:text-yellow-800 hover:bg-yellow-100 ml-2"
                            onClick={() => handleDismiss(alert.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </Alert>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* No Alerts */}
            {processedAlerts.all.length === 0 && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
                  <p className="text-text-primary font-medium mb-2">
                    Aucune alerte trouvée
                  </p>
                  <p className="text-sm text-text-secondary text-center">
                    {dismissedAlerts.size > 0
                      ? 'Toutes les alertes ont été masquées ou filtrées.'
                      : 'Aucune alerte pour la période sélectionnée.'}
                  </p>
                  {dismissedAlerts.size > 0 && (
                    <Button
                      variant="outline"
                      onClick={() => setDismissedAlerts(new Set())}
                      className="mt-4"
                    >
                      Afficher les alertes masquées
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

