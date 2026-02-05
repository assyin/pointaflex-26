'use client';

import React, { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { useAuth } from '@/contexts/AuthContext';
import { EmployeeDashboard } from '@/components/dashboard/EmployeeDashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import {
  Users,
  Clock,
  AlertTriangle,
  Calendar,
  Activity,
  CheckCircle,
  UserX,
  Timer,
  CalendarCheck,
  Bell,
  ChevronRight,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { useDashboardStats } from '@/lib/hooks/useDashboardStats';
import { useAttendance } from '@/lib/hooks/useAttendance';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import Link from 'next/link';

// Couleurs
const COLORS = {
  present: '#22C55E',
  absent: '#EF4444',
  late: '#F59E0B',
  leave: '#3B82F6',
};

export default function DashboardPage() {
  const { user, hasRole } = useAuth();

  // Router vers le bon dashboard selon le profil
  const isSuperAdmin = hasRole('SUPER_ADMIN');
  const isAdminRH = !isSuperAdmin && hasRole('ADMIN_RH');
  const isManager = !isSuperAdmin && !isAdminRH && hasRole('MANAGER');
  const isEmployee = !isSuperAdmin && !isAdminRH && !isManager && hasRole('EMPLOYEE');

  // Dashboard employé
  if (isEmployee) {
    return (
      <DashboardLayout
        title="Mon Tableau de Bord"
        subtitle="Vue d'ensemble de mes données personnelles"
      >
        <EmployeeDashboard />
      </DashboardLayout>
    );
  }

  // État
  const [selectedPeriod, setSelectedPeriod] = useState('semaine');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Calcul des dates
  const dateFilters = useMemo(() => {
    const today = new Date();
    const startDate = new Date();

    if (selectedPeriod === 'aujourd-hui') {
      startDate.setHours(0, 0, 0, 0);
    } else if (selectedPeriod === 'semaine') {
      startDate.setDate(today.getDate() - 7);
    } else if (selectedPeriod === 'mois') {
      startDate.setDate(1);
    }

    return {
      startDate: startDate.toISOString(),
      endDate: today.toISOString(),
    };
  }, [selectedPeriod]);

  // Scope selon le rôle
  const scope = useMemo(() => {
    if (isSuperAdmin) return 'platform';
    if (isAdminRH) return 'tenant';
    if (isManager) return 'team';
    return 'tenant';
  }, [isManager, isAdminRH, isSuperAdmin]);

  // UN SEUL appel API pour les stats
  const { data: stats, isLoading, refetch } = useDashboardStats({
    ...dateFilters,
    scope: scope as any,
  });

  // Derniers pointages (limité à 5)
  const { data: recentAttendance } = useAttendance({ limit: 5 });

  // Rafraîchir
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Calculs KPIs
  const kpis = useMemo(() => {
    const total = stats?.employees?.total || 0;
    const activeToday = stats?.employees?.activeToday || 0;
    const onLeave = stats?.employees?.onLeave || 0;
    // Utiliser todayAbsences (calculé selon les schedules) ou fallback simple
    const absents = stats?.todayAbsences ?? Math.max(0, total - activeToday - onLeave);
    const retards = stats?.lates || 0; // Retards 7 derniers jours
    const retardsToday = stats?.todayRetards || 0; // Retards d'aujourd'hui
    const attendanceRate = total > 0 ? ((activeToday / total) * 100).toFixed(0) : 0;

    return {
      total,
      activeToday,
      absents,
      retards,
      retardsToday,
      onLeave,
      attendanceRate,
    };
  }, [stats]);

  // Alertes
  const alerts = useMemo(() => {
    const items = [];

    if ((stats?.pendingApprovals?.leaves || 0) > 0) {
      items.push({
        type: 'warning',
        icon: Calendar,
        title: `${stats.pendingApprovals.leaves} congé(s) à valider`,
        link: '/leaves',
        linkText: 'Traiter',
      });
    }

    if ((stats?.pendingApprovals?.overtime || 0) > 0) {
      items.push({
        type: 'warning',
        icon: Clock,
        title: `${stats.pendingApprovals.overtime} heure(s) sup. à valider`,
        link: '/overtime',
        linkText: 'Traiter',
      });
    }

    if ((stats?.attendance?.anomalies || 0) > 5) {
      items.push({
        type: 'danger',
        icon: AlertTriangle,
        title: `${stats.attendance.anomalies} anomalies détectées`,
        link: '/anomalies',
        linkText: 'Voir',
      });
    }

    return items;
  }, [stats]);

  // Données graphique 7 jours
  const chartData = useMemo(() => {
    if (!stats?.weeklyAttendance) return [];
    return stats.weeklyAttendance.map((d: any) => ({
      jour: d.day,
      Présents: d.present || 0,
      Retards: d.retards || d.late || 0,
      Absents: d.absences || 0,
    }));
  }, [stats]);

  // Loading
  if (isLoading) {
    return (
      <DashboardLayout title="Tableau de Bord" subtitle="Chargement...">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-12 w-12 animate-spin text-gray-400" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Tableau de Bord"
      subtitle={`Vue d'ensemble • ${new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}`}
    >
      <div className="space-y-6">
        {/* Header: Période + Refresh */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              <option value="aujourd-hui">Aujourd'hui</option>
              <option value="semaine">7 derniers jours</option>
              <option value="mois">Ce mois</option>
            </select>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="border-gray-200"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>

        {/* KPIs - 4 cartes essentielles */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Présents */}
          <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-white">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Présents</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-bold text-gray-900">{kpis.activeToday}</span>
                    <span className="text-sm text-gray-400">/ {kpis.total}</span>
                  </div>
                  <p className="text-xs text-green-600 font-medium mt-2">
                    {kpis.attendanceRate}% de présence
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-xl">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Absents */}
          <Card className="border-0 shadow-sm bg-gradient-to-br from-red-50 to-white">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Absents</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-bold text-gray-900">{kpis.absents}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    Sans justification
                  </p>
                </div>
                <div className="p-3 bg-red-100 rounded-xl">
                  <UserX className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Retards */}
          <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-white">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Retards</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-bold text-gray-900">{kpis.retardsToday}</span>
                    <span className="text-sm text-gray-400">aujourd'hui</span>
                  </div>
                  <p className="text-xs text-amber-600 font-medium mt-2">
                    {kpis.retards} sur 7 jours
                  </p>
                </div>
                <div className="p-3 bg-amber-100 rounded-xl">
                  <Timer className="h-6 w-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* En congé */}
          <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-white">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">En congé</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-bold text-gray-900">{kpis.onLeave}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    Actuellement
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-xl">
                  <CalendarCheck className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alertes et Actions */}
        {alerts.length > 0 && (
          <Card className="border-0 shadow-sm border-l-4 border-l-amber-400 bg-amber-50/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Bell className="h-5 w-5 text-amber-600" />
                <h3 className="font-semibold text-gray-900">Actions requises</h3>
                <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                  {alerts.length}
                </Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {alerts.map((alert, idx) => (
                  <Link
                    key={idx}
                    href={alert.link}
                    className="flex items-center justify-between p-3 bg-white rounded-lg hover:shadow-md transition-shadow border border-gray-100"
                  >
                    <div className="flex items-center gap-3">
                      <alert.icon className={`h-5 w-5 ${
                        alert.type === 'danger' ? 'text-red-500' : 'text-amber-500'
                      }`} />
                      <span className="text-sm font-medium text-gray-700">{alert.title}</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Graphique + Activité récente */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Graphique 7 jours */}
          <Card className="lg:col-span-2 border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-gray-900">
                Présence sur 7 jours
              </CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chartData} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis
                      dataKey="jour"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: '#6B7280' }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: '#6B7280' }}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                      }}
                    />
                    <Bar dataKey="Présents" fill={COLORS.present} radius={[4, 4, 0, 0]} maxBarSize={40} />
                    <Bar dataKey="Retards" fill={COLORS.late} radius={[4, 4, 0, 0]} maxBarSize={40} />
                    <Bar dataKey="Absents" fill={COLORS.absent} radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[280px] text-gray-400">
                  <div className="text-center">
                    <Activity className="h-12 w-12 mx-auto mb-2 opacity-40" />
                    <p>Aucune donnée disponible</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Derniers pointages */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-gray-900">
                  Activité récente
                </CardTitle>
                <Badge className="bg-green-100 text-green-700 border-green-200 animate-pulse">
                  Live
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {(recentAttendance as any)?.data?.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {(recentAttendance as any).data.slice(0, 5).map((record: any) => (
                    <div
                      key={record.id}
                      className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${
                          record.type === 'IN' ? 'bg-green-500' : 'bg-gray-400'
                        }`} />
                        <div>
                          <p className="text-sm font-medium text-gray-900 truncate max-w-[140px]">
                            {record.employee?.firstName} {record.employee?.lastName?.charAt(0)}.
                          </p>
                          <p className="text-xs text-gray-500">
                            {record.type === 'IN' ? 'Entrée' : 'Sortie'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {new Date(record.timestamp).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                        <p className="text-xs text-gray-400">
                          {formatDistanceToNow(new Date(record.timestamp), {
                            addSuffix: true,
                            locale: fr,
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center py-12 text-gray-400">
                  <div className="text-center">
                    <Activity className="h-10 w-10 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">Aucun pointage récent</p>
                  </div>
                </div>
              )}

              <div className="px-4 py-3 border-t border-gray-100">
                <Link
                  href="/attendance"
                  className="text-sm text-gray-600 hover:text-gray-900 font-medium flex items-center justify-center gap-1"
                >
                  Voir tous les pointages
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats rapides */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4 border border-gray-100 shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Total pointages</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats?.attendance?.total || 0}</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-100 shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Congés en attente</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats?.pendingApprovals?.leaves || 0}</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-100 shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Heures sup (période)</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {stats?.overtime?.totalHours ? Number(stats.overtime.totalHours).toFixed(0) : 0}h
            </p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-100 shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Anomalies</p>
            <p className={`text-2xl font-bold mt-1 ${
              (stats?.attendance?.anomalies || 0) > 0 ? 'text-red-600' : 'text-gray-900'
            }`}>
              {stats?.attendance?.anomalies || 0}
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
