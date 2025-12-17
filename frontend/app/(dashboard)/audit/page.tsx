'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Shield,
  Search,
  RefreshCw,
  AlertTriangle,
  Eye,
  Activity,
} from 'lucide-react';
import {
  useAuditLogs,
  useAuditStats,
  useSuspiciousActivities,
} from '@/lib/hooks/useAudit';

export default function AuditPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const [selectedEntity, setSelectedEntity] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Fetch audit logs
  const { data: auditData, isLoading, error, refetch } = useAuditLogs({
    action: selectedAction !== 'all' ? selectedAction : undefined,
    entity: selectedEntity !== 'all' ? selectedEntity : undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  // Fetch stats and suspicious activities
  const { data: statsData } = useAuditStats({ startDate, endDate });
  const { data: suspiciousData } = useSuspiciousActivities();

  const getActionBadge = (action: string) => {
    const actionColors: Record<string, string> = {
      CREATE: 'bg-green-100 text-green-800',
      UPDATE: 'bg-blue-100 text-blue-800',
      DELETE: 'bg-red-100 text-red-800',
      LOGIN: 'bg-purple-100 text-purple-800',
      LOGOUT: 'bg-gray-100 text-gray-800',
    };
    const color = actionColors[action] || 'bg-gray-100 text-gray-800';
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${color}`}>
        {action}
      </span>
    );
  };

  const filteredLogs = auditData?.data?.filter((log: any) =>
    searchQuery === '' ||
    log.user?.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.user?.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.user?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.entity?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <DashboardLayout
      title="Journal d'Audit"
      subtitle="Traçabilité et surveillance des actions système"
    >
      <div className="space-y-6">
        {/* Suspicious Activities Alert */}
        {suspiciousData && suspiciousData.length > 0 && (
          <Alert variant="warning">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <span className="font-semibold">{suspiciousData.length} activité(s) suspecte(s)</span>
              {' '}détectée(s) nécessitant votre attention.
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-secondary">Total actions</p>
                  <p className="text-2xl font-bold text-text-primary mt-1">
                    {auditData?.data?.length || 0}
                  </p>
                </div>
                <Activity className="h-10 w-10 text-primary opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-secondary">Créations</p>
                  <p className="text-2xl font-bold text-success mt-1">
                    {auditData?.data?.filter((l: any) => l.action === 'CREATE').length || 0}
                  </p>
                </div>
                <Shield className="h-10 w-10 text-success opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-secondary">Modifications</p>
                  <p className="text-2xl font-bold text-info mt-1">
                    {auditData?.data?.filter((l: any) => l.action === 'UPDATE').length || 0}
                  </p>
                </div>
                <Eye className="h-10 w-10 text-info opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-secondary">Suppressions</p>
                  <p className="text-2xl font-bold text-danger mt-1">
                    {auditData?.data?.filter((l: any) => l.action === 'DELETE').length || 0}
                  </p>
                </div>
                <AlertTriangle className="h-10 w-10 text-danger opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
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

              <select
                value={selectedAction}
                onChange={(e) => setSelectedAction(e.target.value)}
                className="px-3 py-2 border border-border rounded-lg text-sm"
              >
                <option value="all">Toutes les actions</option>
                <option value="CREATE">Créations</option>
                <option value="UPDATE">Modifications</option>
                <option value="DELETE">Suppressions</option>
                <option value="LOGIN">Connexions</option>
                <option value="LOGOUT">Déconnexions</option>
              </select>

              <select
                value={selectedEntity}
                onChange={(e) => setSelectedEntity(e.target.value)}
                className="px-3 py-2 border border-border rounded-lg text-sm"
              >
                <option value="all">Toutes les entités</option>
                <option value="EMPLOYEE">Employés</option>
                <option value="ATTENDANCE">Pointages</option>
                <option value="LEAVE">Congés</option>
                <option value="OVERTIME">Heures sup</option>
                <option value="SCHEDULE">Planning</option>
                <option value="USER">Utilisateurs</option>
              </select>

              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
                  <Input
                    type="text"
                    placeholder="Rechercher utilisateur, entité..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Audit Log Table */}
        <Card>
          <CardHeader>
            <CardTitle>Journal des activités</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-3 text-text-secondary">Chargement...</span>
              </div>
            ) : error ? (
              <Alert variant="danger">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Erreur lors du chargement des données. Veuillez réessayer.
                </AlertDescription>
              </Alert>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-12 text-text-secondary">
                <Shield className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>Aucune entrée d'audit trouvée.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-table-header text-left text-sm font-semibold text-text-primary">
                      <th className="p-3">Date & Heure</th>
                      <th className="p-3">Utilisateur</th>
                      <th className="p-3">Action</th>
                      <th className="p-3">Entité</th>
                      <th className="p-3">ID Entité</th>
                      <th className="p-3">IP</th>
                      <th className="p-3">Détails</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-table-border">
                    {filteredLogs.map((log: any) => (
                      <tr key={log.id} className="hover:bg-table-hover transition-colors">
                        <td className="p-3">
                          <div className="text-sm font-medium text-text-primary">
                            {format(new Date(log.createdAt), 'dd/MM/yyyy', { locale: fr })}
                          </div>
                          <div className="text-xs text-text-secondary">
                            {format(new Date(log.createdAt), 'HH:mm:ss')}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="font-medium text-text-primary">
                            {log.user?.firstName} {log.user?.lastName}
                          </div>
                          <div className="text-xs text-text-secondary">
                            {log.user?.email}
                          </div>
                        </td>
                        <td className="p-3">
                          {getActionBadge(log.action)}
                        </td>
                        <td className="p-3 text-sm text-text-secondary">
                          {log.entity}
                        </td>
                        <td className="p-3 text-xs font-mono text-text-secondary">
                          {log.entityId ? log.entityId.substring(0, 8) + '...' : '—'}
                        </td>
                        <td className="p-3 text-xs font-mono text-text-secondary">
                          {log.ipAddress || '—'}
                        </td>
                        <td className="p-3">
                          {log.changes && Object.keys(log.changes).length > 0 ? (
                            <Button variant="outline" size="sm">
                              <Eye className="h-3 w-3 mr-1" />
                              Voir
                            </Button>
                          ) : (
                            <span className="text-xs text-text-secondary">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
