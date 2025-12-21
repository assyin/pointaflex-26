'use client';

import React, { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  AlertCircle,
  Clock,
  User,
  CheckCircle,
  XCircle,
  Edit,
  Calendar,
  History,
  Search,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  useAllTemporaryMatricules,
  useMigrateMatricule,
  useMappingHistory,
} from '@/lib/hooks/useTerminalMatriculeMapping';
import { toast } from 'sonner';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { PermissionGate } from '@/components/auth/PermissionGate';

export default function TemporaryMatriculesPage() {
  const [activeTab, setActiveTab] = useState('current');
  const [migratingEmployeeId, setMigratingEmployeeId] = useState<string | null>(
    null,
  );
  const [officialMatricule, setOfficialMatricule] = useState<string>('');

  // Filtres pour l'historique
  const [historyFilters, setHistoryFilters] = useState({
    terminalMatricule: '',
    officialMatricule: '',
    startDate: '',
    endDate: '',
    isActive: undefined as boolean | undefined,
    page: 1,
    limit: 10,
  });

  const { data: expiringMatricules, isLoading, refetch } =
    useAllTemporaryMatricules();
  const {
    data: historyData,
    isLoading: historyLoading,
    refetch: refetchHistory,
  } = useMappingHistory(historyFilters);
  const migrateMutation = useMigrateMatricule();

  const handleMigrate = async (
    employeeId: string,
    currentMatricule: string,
  ) => {
    if (!officialMatricule.trim()) {
      toast.error('Veuillez saisir un matricule officiel');
      return;
    }

    try {
      await migrateMutation.mutateAsync({
        employeeId,
        officialMatricule: officialMatricule.trim(),
      });
      setMigratingEmployeeId(null);
      setOfficialMatricule('');
      refetch();
      refetchHistory();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const getStatusBadge = (daysSince: number, expiryDays: number = 8) => {
    const isExpired = daysSince >= expiryDays;
    const isExpiring = daysSince >= expiryDays - 1;

    if (isExpired) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <XCircle className="h-3 w-3" />
          Expiré ({daysSince - expiryDays} jour(s))
        </Badge>
      );
    }

    if (isExpiring) {
      return (
        <Badge
          variant="outline"
          className="flex items-center gap-1 border-orange-500 text-orange-600"
        >
          <AlertCircle className="h-3 w-3" />
          Expire dans {expiryDays - daysSince} jour(s)
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="flex items-center gap-1">
        <Clock className="h-3 w-3" />
        {daysSince} jour(s)
      </Badge>
    );
  };

  const handleFilterChange = (key: string, value: any) => {
    setHistoryFilters((prev) => ({
      ...prev,
      [key]: value,
      page: 1, // Reset to first page when filters change
    }));
  };

  const clearFilters = () => {
    setHistoryFilters({
      terminalMatricule: '',
      officialMatricule: '',
      startDate: '',
      endDate: '',
      isActive: undefined,
      page: 1,
      limit: 10,
    });
  };

  const handlePageChange = (newPage: number) => {
    setHistoryFilters((prev) => ({
      ...prev,
      page: newPage,
    }));
  };

  const handleLimitChange = (newLimit: number) => {
    setHistoryFilters((prev) => ({
      ...prev,
      limit: newLimit,
      page: 1, // Reset to first page when changing limit
    }));
  };

  const hasActiveFilters = useMemo(() => {
    return (
      historyFilters.terminalMatricule ||
      historyFilters.officialMatricule ||
      historyFilters.startDate ||
      historyFilters.endDate ||
      historyFilters.isActive !== undefined
    );
  }, [historyFilters]);

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-orange-100 rounded-lg">
                <AlertCircle className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Matricules Temporaires
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  Gestion et historique des matricules temporaires
                </p>
              </div>
            </div>
          </div>

          {/* Info Card */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-blue-900 font-medium">
                    Information importante
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    Les employés avec un matricule temporaire doivent recevoir un
                    matricule officiel dans les délais configurés. Le matricule
                    temporaire reste actif sur les terminaux même après la migration
                    vers le matricule officiel.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="current">
                <User className="h-4 w-4 mr-2" />
                Employés Actuels
                {expiringMatricules && expiringMatricules.length > 0 && (
                  <Badge variant="outline" className="ml-2">
                    {expiringMatricules.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="history">
                <History className="h-4 w-4 mr-2" />
                Historique Complet
              </TabsTrigger>
            </TabsList>

            {/* Tab: Current Employees */}
            <TabsContent value="current">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Employés avec matricule temporaire
                    {expiringMatricules &&
                      expiringMatricules.length > 0 && (
                        <Badge variant="outline" className="ml-2">
                          {expiringMatricules.length}
                        </Badge>
                      )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                      <p className="text-sm text-gray-500 mt-2">
                        Chargement...
                      </p>
                    </div>
                  ) : !expiringMatricules ||
                    expiringMatricules.length === 0 ? (
                    <div className="text-center py-8">
                      <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                      <p className="text-sm text-gray-500">
                        Aucun employé avec matricule temporaire
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {expiringMatricules.map((mapping: any) => (
                        <div
                          key={mapping.id}
                          className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-purple-100 rounded-lg">
                                  <User className="h-5 w-5 text-purple-600" />
                                </div>
                                <div>
                                  <h3 className="font-semibold text-gray-900">
                                    {mapping.employee.firstName}{' '}
                                    {mapping.employee.lastName}
                                  </h3>
                                  <p className="text-sm text-gray-500">
                                    {mapping.employee.email || "Pas d'email"}
                                  </p>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">
                                    Matricule Terminal
                                  </p>
                                  <p className="text-sm font-mono font-semibold text-orange-600">
                                    {mapping.terminalMatricule}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">
                                    Matricule Officiel
                                  </p>
                                  <p className="text-sm font-mono font-semibold text-gray-900">
                                    {mapping.officialMatricule}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">
                                    Date d'assignation
                                  </p>
                                  <p className="text-sm text-gray-700">
                                    {new Date(
                                      mapping.assignedAt,
                                    ).toLocaleDateString('fr-FR')}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">
                                    Statut
                                  </p>
                                  {getStatusBadge(
                                    mapping.daysSinceAssignment || 0,
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="ml-4">
                              {migratingEmployeeId === mapping.employeeId ? (
                                <div className="flex flex-col gap-2 min-w-[250px]">
                                  <Input
                                    type="text"
                                    placeholder="Matricule officiel"
                                    value={officialMatricule}
                                    onChange={(e) =>
                                      setOfficialMatricule(e.target.value)
                                    }
                                    className="h-9"
                                  />
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() =>
                                        handleMigrate(
                                          mapping.employeeId,
                                          mapping.terminalMatricule,
                                        )
                                      }
                                      disabled={migrateMutation.isPending}
                                      className="flex-1"
                                    >
                                      {migrateMutation.isPending
                                        ? 'Migration...'
                                        : 'Migrer'}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setMigratingEmployeeId(null);
                                        setOfficialMatricule('');
                                      }}
                                      disabled={migrateMutation.isPending}
                                    >
                                      Annuler
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <PermissionGate permission="employee.update">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setMigratingEmployeeId(mapping.employeeId);
                                      setOfficialMatricule(
                                        mapping.officialMatricule,
                                      );
                                    }}
                                    className="flex items-center gap-2"
                                  >
                                    <Edit className="h-4 w-4" />
                                    Assigner matricule
                                  </Button>
                                </PermissionGate>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: History */}
            <TabsContent value="history">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Historique des Matricules Temporaires
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Advanced Filters */}
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-gray-600" />
                        <h3 className="text-sm font-semibold text-gray-900">
                          Recherche Avancée
                        </h3>
                      </div>
                      {hasActiveFilters && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={clearFilters}
                          className="text-xs"
                        >
                          <X className="h-3 w-3 mr-1" />
                          Réinitialiser
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                          Matricule Terminal
                        </label>
                        <Input
                          type="text"
                          placeholder="Ex: TEMP-001"
                          value={historyFilters.terminalMatricule}
                          onChange={(e) =>
                            handleFilterChange('terminalMatricule', e.target.value)
                          }
                          className="h-9"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                          Matricule Officiel
                        </label>
                        <Input
                          type="text"
                          placeholder="Ex: 01001"
                          value={historyFilters.officialMatricule}
                          onChange={(e) =>
                            handleFilterChange('officialMatricule', e.target.value)
                          }
                          className="h-9"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                          Date de début
                        </label>
                        <Input
                          type="date"
                          value={historyFilters.startDate}
                          onChange={(e) =>
                            handleFilterChange('startDate', e.target.value)
                          }
                          className="h-9"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                          Date de fin
                        </label>
                        <Input
                          type="date"
                          value={historyFilters.endDate}
                          onChange={(e) =>
                            handleFilterChange('endDate', e.target.value)
                          }
                          className="h-9"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                          Statut
                        </label>
                        <select
                          value={
                            historyFilters.isActive === undefined
                              ? ''
                              : historyFilters.isActive
                              ? 'true'
                              : 'false'
                          }
                          onChange={(e) =>
                            handleFilterChange(
                              'isActive',
                              e.target.value === ''
                                ? undefined
                                : e.target.value === 'true',
                            )
                          }
                          className="w-full h-9 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="">Tous</option>
                          <option value="true">Actif</option>
                          <option value="false">Inactif</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* History Table */}
                  {historyLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                      <p className="text-sm text-gray-500 mt-2">
                        Chargement de l'historique...
                      </p>
                    </div>
                  ) : !historyData || !historyData.data || historyData.data.length === 0 ? (
                    <div className="text-center py-8">
                      <History className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-sm text-gray-500">
                        Aucun historique trouvé
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="mb-4 flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                          Affichage de{' '}
                          <span className="font-semibold">
                            {(historyData.page - 1) * historyData.limit + 1}
                          </span>{' '}
                          à{' '}
                          <span className="font-semibold">
                            {Math.min(
                              historyData.page * historyData.limit,
                              historyData.total,
                            )}
                          </span>{' '}
                          sur <span className="font-semibold">{historyData.total}</span>{' '}
                          résultat(s)
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-gray-600">
                            Par page:
                          </label>
                          <select
                            value={historyFilters.limit}
                            onChange={(e) =>
                              handleLimitChange(parseInt(e.target.value, 10))
                            }
                            className="h-8 px-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                          >
                            <option value="10">10</option>
                            <option value="25">25</option>
                            <option value="50">50</option>
                            <option value="100">100</option>
                          </select>
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                              <th className="p-3 text-left text-xs font-semibold text-gray-700 uppercase">
                                Employé
                              </th>
                              <th className="p-3 text-left text-xs font-semibold text-gray-700 uppercase">
                                Matricule Terminal
                              </th>
                              <th className="p-3 text-left text-xs font-semibold text-gray-700 uppercase">
                                Matricule Officiel
                              </th>
                              <th className="p-3 text-left text-xs font-semibold text-gray-700 uppercase">
                                Date Assignation
                              </th>
                              <th className="p-3 text-left text-xs font-semibold text-gray-700 uppercase">
                                Statut
                              </th>
                              <th className="p-3 text-left text-xs font-semibold text-gray-700 uppercase">
                                Jours
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {historyData.data.map((mapping: any) => (
                            <tr
                              key={mapping.id}
                              className="hover:bg-gray-50 transition-colors"
                            >
                              <td className="p-3">
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    {mapping.employee.firstName}{' '}
                                    {mapping.employee.lastName}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {mapping.employee.email || "Pas d'email"}
                                  </p>
                                </div>
                              </td>
                              <td className="p-3">
                                <span className="text-sm font-mono font-semibold text-orange-600">
                                  {mapping.terminalMatricule}
                                </span>
                              </td>
                              <td className="p-3">
                                <span className="text-sm font-mono font-semibold text-gray-900">
                                  {mapping.officialMatricule}
                                </span>
                              </td>
                              <td className="p-3">
                                <span className="text-sm text-gray-700">
                                  {new Date(
                                    mapping.assignedAt,
                                  ).toLocaleDateString('fr-FR', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                  })}
                                </span>
                              </td>
                              <td className="p-3">
                                {mapping.isActive ? (
                                  <Badge
                                    variant="outline"
                                    className="bg-green-50 text-green-700 border-green-200"
                                  >
                                    Actif
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className="bg-gray-50 text-gray-600 border-gray-200"
                                  >
                                    Inactif
                                  </Badge>
                                )}
                              </td>
                              <td className="p-3">
                                <span className="text-sm text-gray-600">
                                  {mapping.daysSinceAssignment || 0} jour(s)
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    {historyData.totalPages > 1 && (
                      <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-4">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePageChange(historyData.page - 1)}
                            disabled={historyData.page === 1}
                            className="flex items-center gap-1"
                          >
                            <ChevronLeft className="h-4 w-4" />
                            Précédent
                          </Button>
                          <div className="flex items-center gap-1">
                            {Array.from(
                              { length: Math.min(5, historyData.totalPages) },
                              (_, i) => {
                                let pageNum;
                                if (historyData.totalPages <= 5) {
                                  pageNum = i + 1;
                                } else if (historyData.page <= 3) {
                                  pageNum = i + 1;
                                } else if (
                                  historyData.page >=
                                  historyData.totalPages - 2
                                ) {
                                  pageNum = historyData.totalPages - 4 + i;
                                } else {
                                  pageNum = historyData.page - 2 + i;
                                }

                                return (
                                  <Button
                                    key={pageNum}
                                    size="sm"
                                    variant={
                                      historyData.page === pageNum
                                        ? 'default'
                                        : 'outline'
                                    }
                                    onClick={() => handlePageChange(pageNum)}
                                    className="min-w-[2.5rem]"
                                  >
                                    {pageNum}
                                  </Button>
                                );
                              },
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePageChange(historyData.page + 1)}
                            disabled={historyData.page >= historyData.totalPages}
                            className="flex items-center gap-1"
                          >
                            Suivant
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="text-sm text-gray-600">
                          Page <span className="font-semibold">{historyData.page}</span>{' '}
                          sur{' '}
                          <span className="font-semibold">
                            {historyData.totalPages}
                          </span>
                        </div>
                      </div>
                    )}
                  </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
