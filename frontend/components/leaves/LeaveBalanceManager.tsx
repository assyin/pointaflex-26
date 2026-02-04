'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Search,
  X,
  Edit,
  Check,
  Download,
  Loader2,
  Users,
  Calendar,
  Building2,
  Briefcase,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { leavesApi } from '@/lib/api/leaves';
import { useDepartments } from '@/lib/hooks/useDepartments';
import { useSites } from '@/lib/hooks/useSites';
import apiClient from '@/lib/api/client';

interface LeaveBalance {
  employeeId: string;
  employeeName: string;
  matricule: string;
  year: number;
  quota: number;
  quotaSource: 'employee' | 'tenant';
  taken: number;
  pending: number;
  remaining: number;
}

interface LeaveBalanceManagerProps {
  onClose: () => void;
}

export function LeaveBalanceManager({ onClose }: LeaveBalanceManagerProps) {
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSite, setFilterSite] = useState<string>('all');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // Editing state
  const [editingEmployee, setEditingEmployee] = useState<string | null>(null);
  const [editingQuota, setEditingQuota] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Export state
  const [isExporting, setIsExporting] = useState(false);

  // Data
  const { data: departmentsData } = useDepartments();
  const { data: sitesData } = useSites();

  const sites = Array.isArray(sitesData) ? sitesData : (sitesData?.data || []);
  const departments = Array.isArray(departmentsData) ? departmentsData : ((departmentsData as any)?.data || []);

  // Years for filter
  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return [currentYear - 1, currentYear, currentYear + 1];
  }, []);

  // Fetch balances
  const fetchBalances = async () => {
    setIsLoading(true);
    setError(null);
    try {
      console.log('Fetching balances with params:', {
        year: selectedYear,
        siteId: filterSite !== 'all' ? filterSite : undefined,
        departmentId: filterDepartment !== 'all' ? filterDepartment : undefined,
      });
      const data = await leavesApi.getAllBalances({
        year: selectedYear,
        siteId: filterSite !== 'all' ? filterSite : undefined,
        departmentId: filterDepartment !== 'all' ? filterDepartment : undefined,
      });
      console.log('Received balances:', data?.length || 0, 'employees');
      // Handle both array and { data: [...] } response formats
      const balanceArray = Array.isArray(data) ? data : (data as any)?.data || [];
      setBalances(balanceArray);
    } catch (err: any) {
      console.error('Error fetching balances:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Erreur lors du chargement des soldes';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch on mount
  useEffect(() => {
    console.log('[LeaveBalanceManager] Component mounted, fetching balances...');
    fetchBalances();
  }, []); // Fetch on mount

  // Refetch when filters change (but not on initial mount)
  const isFirstRender = React.useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    console.log('[LeaveBalanceManager] Filters changed, refetching...');
    fetchBalances();
  }, [selectedYear, filterSite, filterDepartment]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterSite, filterDepartment, selectedYear]);

  // Filter balances
  const filteredBalances = useMemo(() => {
    return balances.filter((b) => {
      const matchesSearch =
        searchQuery === '' ||
        b.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.matricule.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [balances, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredBalances.length / itemsPerPage);
  const paginatedBalances = filteredBalances.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Handle quota update
  const handleEditQuota = (employeeId: string, currentQuota: number) => {
    setEditingEmployee(employeeId);
    setEditingQuota(currentQuota.toString());
  };

  const handleSaveQuota = async (employeeId: string) => {
    setIsSaving(true);
    try {
      const newQuota = editingQuota === '' ? null : parseInt(editingQuota);
      await leavesApi.updateEmployeeQuota(employeeId, newQuota);

      // Refresh balances
      await fetchBalances();
      setEditingEmployee(null);
      setEditingQuota('');
    } catch (err: any) {
      console.error('Error updating quota:', err);
      alert('Erreur lors de la mise à jour du quota');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingEmployee(null);
    setEditingQuota('');
  };

  // Export to Excel
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await apiClient.get('/reports/export/leave-balance', {
        params: {
          year: selectedYear,
          siteId: filterSite !== 'all' ? filterSite : undefined,
          departmentId: filterDepartment !== 'all' ? filterDepartment : undefined,
          format: 'excel',
        },
        responseType: 'blob',
      });

      // Download file
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `solde_conges_${selectedYear}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Error exporting balances:', err);
      alert('Erreur lors de l\'export. Vérifiez que l\'endpoint est disponible.');
    } finally {
      setIsExporting(false);
    }
  };

  // Summary stats
  const stats = useMemo(() => {
    if (filteredBalances.length === 0) return null;

    const totalQuota = filteredBalances.reduce((sum, b) => sum + b.quota, 0);
    const totalTaken = filteredBalances.reduce((sum, b) => sum + b.taken, 0);
    const totalPending = filteredBalances.reduce((sum, b) => sum + b.pending, 0);
    const totalRemaining = filteredBalances.reduce((sum, b) => sum + b.remaining, 0);
    const withCustomQuota = filteredBalances.filter((b) => b.quotaSource === 'employee').length;
    const lowBalance = filteredBalances.filter((b) => b.remaining <= 3 && b.remaining > 0).length;
    const noBalance = filteredBalances.filter((b) => b.remaining <= 0).length;

    return {
      totalEmployees: filteredBalances.length,
      totalQuota,
      totalTaken,
      totalPending,
      totalRemaining,
      withCustomQuota,
      lowBalance,
      noBalance,
      avgQuota: Math.round(totalQuota / filteredBalances.length),
      avgTaken: Math.round((totalTaken / filteredBalances.length) * 10) / 10,
    };
  }, [filteredBalances]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[95vh] overflow-hidden m-4 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Users className="h-6 w-6 text-gray-700" />
                Gestion des Soldes de Congés
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Visualisez et modifiez les quotas de congés par employé
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-gray-200 bg-white">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Search */}
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Rechercher par nom, matricule..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10"
              />
            </div>

            {/* Year */}
            <div>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="w-full h-10 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            {/* Site */}
            <div>
              <select
                value={filterSite}
                onChange={(e) => setFilterSite(e.target.value)}
                className="w-full h-10 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                <option value="all">Tous les sites</option>
                {sites.map((site: any) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Department */}
            <div>
              <select
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                className="w-full h-10 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                <option value="all">Tous les départements</option>
                {departments.map((dept: any) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchBalances}
                disabled={isLoading}
                className="border-gray-300"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>
              <span className="text-sm text-gray-600">
                {isLoading ? 'Chargement...' : `${filteredBalances.length} employé(s)`}
              </span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={isExporting || filteredBalances.length === 0}
              className="border-gray-300"
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Exporter Excel
            </Button>
          </div>
        </div>

        {/* Stats */}
        {stats && !isLoading && (
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{stats.totalEmployees}</p>
                <p className="text-xs text-gray-600">Employés</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{stats.avgQuota}j</p>
                <p className="text-xs text-gray-600">Quota moyen</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-600">{stats.totalTaken}j</p>
                <p className="text-xs text-gray-600">Jours pris</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-600">{stats.totalPending}j</p>
                <p className="text-xs text-gray-600">En attente</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{stats.totalRemaining}j</p>
                <p className="text-xs text-gray-600">Restants</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">{stats.withCustomQuota}</p>
                <p className="text-xs text-gray-600">Quotas perso.</p>
              </div>
            </div>

            {(stats.lowBalance > 0 || stats.noBalance > 0) && (
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-200">
                {stats.lowBalance > 0 && (
                  <div className="flex items-center gap-1 text-sm text-yellow-700">
                    <AlertCircle className="h-4 w-4" />
                    {stats.lowBalance} employé(s) avec solde faible (≤3j)
                  </div>
                )}
                {stats.noBalance > 0 && (
                  <div className="flex items-center gap-1 text-sm text-red-700">
                    <AlertCircle className="h-4 w-4" />
                    {stats.noBalance} employé(s) sans solde (≤0j)
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Table */}
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
              <span className="ml-3 text-gray-600">Chargement des soldes...</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12 text-red-600">
              <AlertCircle className="h-6 w-6 mr-2" />
              {error}
            </div>
          ) : filteredBalances.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-gray-500">
              <Users className="h-12 w-12 mr-3 opacity-20" />
              <p>Aucun employé trouvé</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr className="text-left text-sm font-semibold text-gray-700 border-b border-gray-200">
                  <th className="px-4 py-3">Matricule</th>
                  <th className="px-4 py-3">Employé</th>
                  <th className="px-4 py-3 text-center">Quota</th>
                  <th className="px-4 py-3 text-center">Pris</th>
                  <th className="px-4 py-3 text-center">En attente</th>
                  <th className="px-4 py-3 text-center">Restant</th>
                  <th className="px-4 py-3 text-center">Source</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedBalances.map((balance) => (
                  <tr key={balance.employeeId} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm text-gray-600">
                        {balance.matricule}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900">
                        {balance.employeeName}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {editingEmployee === balance.employeeId ? (
                        <Input
                          type="number"
                          min="0"
                          value={editingQuota}
                          onChange={(e) => setEditingQuota(e.target.value)}
                          className="w-20 h-8 text-center mx-auto"
                          placeholder="Vide = défaut"
                          autoFocus
                        />
                      ) : (
                        <span className="font-semibold text-blue-600">
                          {balance.quota}j
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-orange-600">{balance.taken}j</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-yellow-600">{balance.pending}j</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-semibold ${
                        balance.remaining <= 0
                          ? 'text-red-600'
                          : balance.remaining <= 3
                          ? 'text-yellow-600'
                          : 'text-green-600'
                      }`}>
                        {balance.remaining}j
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {balance.quotaSource === 'employee' ? (
                        <Badge className="bg-purple-100 text-purple-700 border-purple-200">
                          Personnalisé
                        </Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-600 border-gray-200">
                          Défaut
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {editingEmployee === balance.employeeId ? (
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSaveQuota(balance.employeeId)}
                            disabled={isSaving}
                            className="h-8 px-2 bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                          >
                            {isSaving ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCancelEdit}
                            disabled={isSaving}
                            className="h-8 px-2"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditQuota(balance.employeeId, balance.quota)}
                          className="h-8 border-gray-300"
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Modifier
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {!isLoading && filteredBalances.length > itemsPerPage && (
          <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
            <span className="text-sm text-gray-600">
              {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filteredBalances.length)} sur {filteredBalances.length}
            </span>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <span className="text-sm text-gray-700">
                Page {currentPage} / {totalPages}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-white flex justify-between items-center">
          <p className="text-xs text-gray-500">
            Pour définir le quota par défaut, allez dans Paramètres &gt; Configuration &gt; Congés
          </p>
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </div>
    </div>
  );
}
