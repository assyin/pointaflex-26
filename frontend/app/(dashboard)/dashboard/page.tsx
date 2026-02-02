'use client';

import React, { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { useAuth } from '@/contexts/AuthContext';
import { EmployeeDashboard } from '@/components/dashboard/EmployeeDashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users,
  Clock,
  AlertTriangle,
  Calendar,
  TrendingUp,
  TrendingDown,
  Activity,
  CheckCircle,
  XCircle,
  Download,
  FileSpreadsheet,
  Mail,
  Settings,
  Filter,
  Trophy,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  Minus,
  BarChart3,
  PieChart as PieChartIcon,
  Building2,
  MapPin,
} from 'lucide-react';
import { useDashboardStats } from '@/lib/hooks/useDashboardStats';
import { useDepartments } from '@/lib/hooks/useDepartments';
import { useEmployees } from '@/lib/hooks/useEmployees';
import { useAttendance } from '@/lib/hooks/useAttendance';
import { useSites } from '@/lib/hooks/useSites';
import { useTeams } from '@/lib/hooks/useTeams';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

// Couleurs pour les graphiques
const COLORS = {
  primary: '#0052CC',
  success: '#28A745',
  warning: '#FFC107',
  danger: '#DC3545',
  info: '#17A2B8',
  purple: '#6F42C1',
  orange: '#FD7E14',
  teal: '#20C997',
};

const SHIFT_COLORS = ['#0052CC', '#17A2B8', '#28A745', '#FFC107', '#FD7E14'];

export default function DashboardPage() {
  const { user, hasRole } = useAuth();
  
  // Router vers le bon dashboard selon le profil
  // Vérifier d'abord SUPER_ADMIN, puis ADMIN_RH, puis MANAGER, puis EMPLOYEE
  const isSuperAdmin = hasRole('SUPER_ADMIN');
  const isAdminRH = !isSuperAdmin && hasRole('ADMIN_RH');
  const isManager = !isSuperAdmin && !isAdminRH && hasRole('MANAGER');
  const isEmployee = !isSuperAdmin && !isAdminRH && !isManager && hasRole('EMPLOYEE');

  // Si c'est un employé, afficher le dashboard employé
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

  // Pour les autres profils, continuer avec le dashboard actuel
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedPeriod, setSelectedPeriod] = useState('semaine');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedSite, setSelectedSite] = useState<string>('all');
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Calculate date filters
  const dateFilters = useMemo(() => {
    const today = new Date();
    const startDate = new Date();

    if (selectedPeriod === 'aujourd-hui') {
      startDate.setHours(0, 0, 0, 0);
    } else if (selectedPeriod === 'semaine') {
      startDate.setDate(today.getDate() - 7);
    } else if (selectedPeriod === 'mois') {
      startDate.setDate(1);
    } else if (selectedPeriod === 'trimestre') {
      startDate.setMonth(today.getMonth() - 3);
    }

    return {
      startDate: startDate.toISOString(),
      endDate: today.toISOString(),
    };
  }, [selectedPeriod]);

  // Déterminer le scope selon le profil
  const scope = useMemo(() => {
    if (isSuperAdmin) return 'platform';
    if (isAdminRH) return 'tenant';
    if (isManager) return 'team';
    return 'tenant'; // Par défaut
  }, [isManager, isAdminRH, isSuperAdmin]);

  // Fetch data avec le bon scope
  const { data: stats, isLoading } = useDashboardStats({
    ...dateFilters,
    scope: scope as any,
  });
  const { data: departments } = useDepartments();
  const { data: sites } = useSites();
  const { data: teams } = useTeams();
  
  // Charger TOUS les employés pour les stats par département/site (sans filtres)
  const { data: allEmployees } = useEmployees({});
  
  // Fetch stats by department and site (only for admins and managers)
  const { data: statsByDepartment } = useDashboardStats({
    ...dateFilters,
    scope: 'department' as any,
  });
  const { data: statsBySite } = useDashboardStats({
    ...dateFilters,
    scope: 'site' as any,
  });
  const { data: employees } = useEmployees({
    departmentId: selectedDepartment !== 'all' ? selectedDepartment : undefined,
    siteId: selectedSite !== 'all' ? selectedSite : undefined,
    teamId: selectedTeam !== 'all' ? selectedTeam : undefined,
  });

  // Fetch recent attendance for real-time widget
  const { data: recentAttendance } = useAttendance({
    limit: 10,
  });

  // Calculate metrics
  const attendanceRate = useMemo(() => {
    if (!stats?.employees?.total || stats.employees.total === 0) return 0;
    return (stats.employees.activeToday / stats.employees.total) * 100;
  }, [stats]);

  // Calculate trends - Only show trends when there's actual data
  // When no data exists, trends should be 0 (no comparison possible)
  const trends = useMemo(() => {
    const hasData = (stats?.attendance?.total || 0) > 0 || (stats?.employees?.total || 0) > 0;

    if (!hasData) {
      // No data = no trends to show
      return {
        attendanceRate: 0,
        lates: 0,
        totalPointages: 0,
        overtimeHours: 0,
      };
    }

    // When we have data, use the previous period data from API (if available)
    // For now, show 0 since we don't have real previous period data from API
    return {
      attendanceRate: 0,
      lates: 0,
      totalPointages: 0,
      overtimeHours: 0,
    };
  }, [stats]);

  // Top performers (mock data - replace with real API)
  const topPerformers = useMemo(() => {
    const empList = employees?.data || [];
    return empList.slice(0, 5).map((emp: any) => ({
      id: emp.id,
      name: `${emp.firstName} ${emp.lastName}`,
      department: emp.department?.name || 'N/A',
      photo: emp.photo,
      score: 100,
    }));
  }, [employees]);

  // Department performance data
  const departmentPerformance = useMemo(() => {
    if (!departments) return [];
    return (departments as any[]).slice(0, 5).map((dept: any) => ({
      department: dept.name,
      attendance: 85 + Math.random() * 15,
      punctuality: 80 + Math.random() * 20,
      overtime: 70 + Math.random() * 30,
    }));
  }, [departments]);

  if (isLoading) {
    return (
      <DashboardLayout title="Tableau de Bord" subtitle="Chargement...">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  // Check if we have any real data to show trends
  const hasRealData = (stats?.attendance?.total || 0) > 0 || (stats?.employees?.total || 0) > 0;

  const TrendBadge = ({ value, inverse = false }: { value: number; inverse?: boolean }) => {
    // Don't show trend badge if there's no data or value is 0
    if (!hasRealData || value === 0) {
      return null;
    }

    const isPositive = inverse ? value < 0 : value > 0;
    const isNegative = inverse ? value > 0 : value < 0;

    return (
      <Badge variant={isPositive ? 'success' : isNegative ? 'danger' : 'default'}>
        {isPositive && <ArrowUp className="h-3 w-3 inline mr-1" />}
        {isNegative && <ArrowDown className="h-3 w-3 inline mr-1" />}
        {value === 0 && <Minus className="h-3 w-3 inline mr-1" />}
        {Math.abs(value).toFixed(1)}%
      </Badge>
    );
  };

  return (
    <DashboardLayout
      title="Tableau de Bord"
      subtitle="Vue d'ensemble de la gestion des présences et des performances"
    >
      <div className="space-y-6">
        {/* Advanced Filters Panel */}
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-gray-900">Filtres avancés</h3>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                {showFilters ? 'Masquer' : 'Afficher'}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Period Filter */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Période
                </label>
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="aujourd-hui">Aujourd'hui</option>
                  <option value="semaine">Cette semaine</option>
                  <option value="mois">Ce mois</option>
                  <option value="trimestre">Ce trimestre</option>
                </select>
              </div>

              {showFilters && (
                <>
                  {/* Department Filter */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                      Département
                    </label>
                    <select
                      value={selectedDepartment}
                      onChange={(e) => setSelectedDepartment(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="all">Tous les départements</option>
                      {(departments as any[] || []).map((dept: any) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Site Filter */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                      Site
                    </label>
                    <select
                      value={selectedSite}
                      onChange={(e) => setSelectedSite(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="all">Tous les sites</option>
                      {(sites as any[] || []).map((site: any) => (
                        <option key={site.id} value={site.id}>
                          {site.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Team Filter */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                      Équipe
                    </label>
                    <select
                      value={selectedTeam}
                      onChange={(e) => setSelectedTeam(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="all">Toutes les équipes</option>
                      {(teams as any[] || []).map((team: any) => (
                        <option key={team.id} value={team.id}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </div>

            {showFilters && (
              <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                <Button size="sm" variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Exporter PDF
                </Button>
                <Button size="sm" variant="outline">
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Exporter Excel
                </Button>
                <Button size="sm" variant="outline">
                  <Mail className="h-4 w-4 mr-2" />
                  Rapport Email
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabs Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white p-1 border rounded-lg shadow-sm">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Vue d'ensemble
            </TabsTrigger>
            <TabsTrigger value="attendance" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Présences
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Performance
            </TabsTrigger>
            <TabsTrigger value="alerts" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Alertes
              {(stats?.pendingApprovals?.leaves || 0) + (stats?.pendingApprovals?.overtime || 0) > 0 && (
                <Badge variant="danger" className="ml-1">
                  {(stats?.pendingApprovals?.leaves || 0) + (stats?.pendingApprovals?.overtime || 0)}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="realtime" className="flex items-center gap-2">
              <Activity className="h-4 w-4 animate-pulse" />
              Temps Réel
            </TabsTrigger>
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="space-y-6">
            {/* Enhanced KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Attendance Rate */}
              <Card className="hover:shadow-lg transition-shadow border-t-4 border-t-green-500">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-600">Taux de présence</p>
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Users className="h-5 w-5 text-green-600" />
                    </div>
                  </div>
                  <h3 className="text-3xl font-bold text-gray-900 mb-2">
                    {attendanceRate.toFixed(1)}%
                  </h3>
                  {hasRealData && trends.attendanceRate !== 0 && (
                    <div className="flex items-center gap-2">
                      <TrendBadge value={trends.attendanceRate} />
                      <span className="text-xs text-gray-500">vs période préc.</span>
                    </div>
                  )}
                  <div className="mt-3 h-8">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full transition-all"
                        style={{ width: `${attendanceRate}%` }}
                      ></div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Lates */}
              <Card className="hover:shadow-lg transition-shadow border-t-4 border-t-yellow-500">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-600">Retards (7j)</p>
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <Clock className="h-5 w-5 text-yellow-600" />
                    </div>
                  </div>
                  <h3 className="text-3xl font-bold text-gray-900 mb-2">
                    {stats?.attendance?.anomalies || 0}
                  </h3>
                  {hasRealData && trends.lates !== 0 && (
                    <div className="flex items-center gap-2">
                      <TrendBadge value={trends.lates} inverse />
                      <span className="text-xs text-gray-500">vs période préc.</span>
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-3">
                    Derniers 7 jours
                  </p>
                </CardContent>
              </Card>

              {/* Total Pointages */}
              <Card className="hover:shadow-lg transition-shadow border-t-4 border-t-blue-500">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-600">Total pointages</p>
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Activity className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                  <h3 className="text-3xl font-bold text-gray-900 mb-2">
                    {stats?.attendance?.total || 0}
                  </h3>
                  {hasRealData && trends.totalPointages !== 0 && (
                    <div className="flex items-center gap-2">
                      <TrendBadge value={trends.totalPointages} />
                      <span className="text-xs text-gray-500">vs période préc.</span>
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-3">Période sélectionnée</p>
                </CardContent>
              </Card>

              {/* Overtime Hours */}
              <Card className="hover:shadow-lg transition-shadow border-t-4 border-t-purple-500">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-600">Heures sup</p>
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <TrendingUp className="h-5 w-5 text-purple-600" />
                    </div>
                  </div>
                  <h3 className="text-3xl font-bold text-gray-900 mb-2">
                    {stats?.overtime?.totalHours ? Number(stats.overtime.totalHours).toFixed(2) : 0}h
                  </h3>
                  {hasRealData && trends.overtimeHours !== 0 && (
                    <div className="flex items-center gap-2">
                      <TrendBadge value={trends.overtimeHours} inverse />
                      <span className="text-xs text-gray-500">vs période préc.</span>
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-3">Approuvées</p>
                </CardContent>
              </Card>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Bar Chart - Retards & Absences */}
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="border-b">
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    Retards & Absences (7 derniers jours)
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stats?.weeklyAttendance || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis
                        dataKey="day"
                        stroke="#6C757D"
                        style={{ fontSize: '12px' }}
                      />
                      <YAxis stroke="#6C757D" style={{ fontSize: '12px' }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#fff',
                          border: '1px solid #e0e0e0',
                          borderRadius: '8px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        }}
                      />
                      <Legend />
                      <Bar
                        dataKey="retards"
                        fill={COLORS.warning}
                        name="Retards"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="absences"
                        fill={COLORS.danger}
                        name="Absences"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Pie Chart - Distribution des Shifts */}
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="border-b">
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    Répartition des Shifts
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  {stats?.shiftDistribution && stats.shiftDistribution.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={stats.shiftDistribution}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value }) => `${name}: ${value}`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {stats.shiftDistribution.map((entry: any, index: number) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={SHIFT_COLORS[index % SHIFT_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-gray-500">
                      <div className="text-center">
                        <Users className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                        <p>Aucun shift configuré</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Line Chart - Heures Supplémentaires */}
              <Card className="lg:col-span-2 hover:shadow-lg transition-shadow">
                <CardHeader className="border-b">
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Évolution des Heures Supplémentaires (4 dernières semaines)
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={stats?.overtimeTrend || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis
                        dataKey="semaine"
                        stroke="#6C757D"
                        style={{ fontSize: '12px' }}
                      />
                      <YAxis stroke="#6C757D" style={{ fontSize: '12px' }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#fff',
                          border: '1px solid #e0e0e0',
                          borderRadius: '8px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="heures"
                        stroke={COLORS.primary}
                        strokeWidth={3}
                        dot={{ fill: COLORS.primary, r: 6 }}
                        activeDot={{ r: 8 }}
                        name="Heures sup"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-blue-500">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Employés actifs</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">
                        {stats?.employees?.total || 0}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {stats?.employees?.activeToday || 0} présents aujourd'hui
                      </p>
                    </div>
                    <Users className="h-12 w-12 text-blue-500 opacity-30" />
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-green-500">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Congés en cours</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">
                        {stats?.leaves?.totalRequests || 0}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {stats?.pendingApprovals?.leaves || 0} en attente
                      </p>
                    </div>
                    <Calendar className="h-12 w-12 text-green-500 opacity-30" />
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-red-500">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Anomalies détectées</p>
                      <p className="text-3xl font-bold text-red-600 mt-2">
                        {stats?.attendance?.anomalies || 0}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {stats?.attendance?.anomalyRate || 0}% du total
                      </p>
                    </div>
                    <AlertTriangle className="h-12 w-12 text-red-500 opacity-30" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ATTENDANCE TAB */}
          <TabsContent value="attendance" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Area Chart - Daily Attendance Trend */}
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="border-b">
                  <CardTitle>Tendance quotidienne des présences</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={stats?.weeklyAttendance || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="retards"
                        stackId="1"
                        stroke={COLORS.warning}
                        fill={COLORS.warning}
                        fillOpacity={0.6}
                        name="Retards"
                      />
                      <Area
                        type="monotone"
                        dataKey="absences"
                        stackId="1"
                        stroke={COLORS.danger}
                        fill={COLORS.danger}
                        fillOpacity={0.6}
                        name="Absences"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Attendance by Type */}
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="border-b">
                  <CardTitle>Statistiques détaillées</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-8 w-8 text-blue-600" />
                        <div>
                          <p className="font-semibold text-gray-900">Entrées</p>
                          <p className="text-sm text-gray-600">Total enregistré</p>
                        </div>
                      </div>
                      <p className="text-2xl font-bold text-blue-600">
                        {Math.floor((stats?.attendance?.total || 0) / 2)}
                      </p>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <XCircle className="h-8 w-8 text-purple-600" />
                        <div>
                          <p className="font-semibold text-gray-900">Sorties</p>
                          <p className="text-sm text-gray-600">Total enregistré</p>
                        </div>
                      </div>
                      <p className="text-2xl font-bold text-purple-600">
                        {Math.floor((stats?.attendance?.total || 0) / 2)}
                      </p>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <AlertCircle className="h-8 w-8 text-orange-600" />
                        <div>
                          <p className="font-semibold text-gray-900">Anomalies</p>
                          <p className="text-sm text-gray-600">Nécessite attention</p>
                        </div>
                      </div>
                      <p className="text-2xl font-bold text-orange-600">
                        {stats?.attendance?.anomalies || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* PERFORMANCE TAB */}
          <TabsContent value="performance" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Performers */}
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="border-b bg-gradient-to-r from-green-50 to-blue-50">
                  <CardTitle className="flex items-center gap-2 text-green-700">
                    <Trophy className="h-5 w-5" />
                    Top Ponctualité (Ce mois)
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  {topPerformers.length > 0 ? (
                    <div className="space-y-3">
                      {topPerformers.map((emp: any, idx: number) => (
                        <div
                          key={emp.id}
                          className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors"
                        >
                          <Badge
                            variant={idx === 0 ? 'success' : 'default'}
                            className="text-lg font-bold min-w-[40px] justify-center"
                          >
                            #{idx + 1}
                          </Badge>
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold">
                            {emp.name.split(' ').map((n: string) => n[0]).join('')}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{emp.name}</p>
                            <p className="text-xs text-gray-500">{emp.department}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-green-600">
                              {emp.score}%
                            </p>
                            <CheckCircle className="h-4 w-4 text-green-600 inline" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                      <p>Aucune donnée disponible</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Department Performance Radar */}
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="border-b">
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    Performance par Département
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  {departmentPerformance.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <RadarChart data={departmentPerformance}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="department" style={{ fontSize: '11px' }} />
                        <PolarRadiusAxis angle={90} domain={[0, 100]} />
                        <Radar
                          name="Présence"
                          dataKey="attendance"
                          stroke={COLORS.success}
                          fill={COLORS.success}
                          fillOpacity={0.3}
                        />
                        <Radar
                          name="Ponctualité"
                          dataKey="punctuality"
                          stroke={COLORS.info}
                          fill={COLORS.info}
                          fillOpacity={0.3}
                        />
                        <Legend />
                        <Tooltip />
                      </RadarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-gray-500">
                      <div className="text-center">
                        <BarChart3 className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                        <p>Données insuffisantes</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Stats by Department and Site - Only for Admins and Managers */}
            {(isAdminRH || isSuperAdmin || isManager) && (
              <>
                {/* Stats by Department */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                  <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-blue-500">
                    <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50">
                      <CardTitle className="flex items-center gap-2 text-blue-700">
                        <Building2 className="h-5 w-5" />
                        Statistiques par Département
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                      {departments && (departments as any[]).length > 0 ? (
                        <div className="space-y-4">
                          {(departments as any[]).slice(0, 5).map((dept: any) => {
                            // Calculer les stats pour ce département - utiliser allEmployees pour avoir tous les employés
                            const employeesList = allEmployees?.data || employees?.data || [];
                            const deptEmployees = employeesList.filter((emp: any) => 
                              emp.departmentId === dept.id || emp.department?.id === dept.id
                            );
                            const activeEmployees = deptEmployees.filter((emp: any) => 
                              emp.isActive !== false && emp.status !== 'INACTIVE' && emp.status !== 'TERMINATED'
                            );
                            const deptStats = {
                              total: deptEmployees.length,
                              activeToday: activeEmployees.length,
                              attendanceRate: deptEmployees.length > 0 
                                ? ((activeEmployees.length / deptEmployees.length) * 100).toFixed(1)
                                : 0,
                            };
                            
                            return (
                              <div
                                key={dept.id}
                                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <Building2 className="h-4 w-4 text-blue-600" />
                                    <h4 className="font-semibold text-gray-900">{dept.name}</h4>
                                  </div>
                                  <Badge variant="default">{deptStats.total} employés</Badge>
                                </div>
                                <div className="grid grid-cols-3 gap-4 mt-3">
                                  <div>
                                    <p className="text-xs text-gray-500">Taux de présence</p>
                                    <p className="text-lg font-bold text-blue-600">{deptStats.attendanceRate}%</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500">Actifs aujourd'hui</p>
                                    <p className="text-lg font-bold text-green-600">{deptStats.activeToday}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500">Total</p>
                                    <p className="text-lg font-bold text-gray-900">{deptStats.total}</p>
                                  </div>
                                </div>
                                <div className="mt-3 h-2 bg-gray-200 rounded-full">
                                  <div
                                    className="bg-blue-600 h-2 rounded-full transition-all"
                                    style={{ width: `${deptStats.attendanceRate}%` }}
                                  ></div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <Building2 className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                          <p>Aucun département disponible</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Stats by Site */}
                  <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-green-500">
                    <CardHeader className="border-b bg-gradient-to-r from-green-50 to-emerald-50">
                      <CardTitle className="flex items-center gap-2 text-green-700">
                        <MapPin className="h-5 w-5" />
                        Statistiques par Site
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                      {sites && (sites as any[]).length > 0 ? (
                        <div className="space-y-4">
                          {(sites as any[]).slice(0, 5).map((site: any) => {
                            // Calculer les stats pour ce site - utiliser allEmployees pour avoir tous les employés
                            const employeesList = allEmployees?.data || employees?.data || [];
                            const siteEmployees = employeesList.filter((emp: any) => 
                              emp.siteId === site.id || emp.site?.id === site.id
                            );
                            const activeEmployees = siteEmployees.filter((emp: any) => 
                              emp.isActive !== false && emp.status !== 'INACTIVE' && emp.status !== 'TERMINATED'
                            );
                            const siteStats = {
                              total: siteEmployees.length,
                              activeToday: activeEmployees.length,
                              attendanceRate: siteEmployees.length > 0 
                                ? ((activeEmployees.length / siteEmployees.length) * 100).toFixed(1)
                                : 0,
                            };
                            
                            return (
                              <div
                                key={site.id}
                                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-green-600" />
                                    <h4 className="font-semibold text-gray-900">{site.name}</h4>
                                  </div>
                                  <Badge variant="default">{siteStats.total} employés</Badge>
                                </div>
                                <div className="grid grid-cols-3 gap-4 mt-3">
                                  <div>
                                    <p className="text-xs text-gray-500">Taux de présence</p>
                                    <p className="text-lg font-bold text-green-600">{siteStats.attendanceRate}%</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500">Actifs aujourd'hui</p>
                                    <p className="text-lg font-bold text-blue-600">{siteStats.activeToday}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500">Total</p>
                                    <p className="text-lg font-bold text-gray-900">{siteStats.total}</p>
                                  </div>
                                </div>
                                <div className="mt-3 h-2 bg-gray-200 rounded-full">
                                  <div
                                    className="bg-green-600 h-2 rounded-full transition-all"
                                    style={{ width: `${siteStats.attendanceRate}%` }}
                                  ></div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <MapPin className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                          <p>Aucun site disponible</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Charts for Department and Site Stats */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                  {/* Department Attendance Chart */}
                  <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader className="border-b">
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-blue-600" />
                        Présence par Département
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                      {departments && (departments as any[]).length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart
                            data={(departments as any[]).slice(0, 5).map((dept: any) => {
                              const employeesList = allEmployees?.data || employees?.data || [];
                              const deptEmployees = employeesList.filter((emp: any) => 
                                emp.departmentId === dept.id || emp.department?.id === dept.id
                              );
                              const activeEmployees = deptEmployees.filter((emp: any) => 
                                emp.isActive !== false && emp.status !== 'INACTIVE' && emp.status !== 'TERMINATED'
                              );
                              return {
                                name: dept.name.length > 15 ? dept.name.substring(0, 15) + '...' : dept.name,
                                'Employés actifs': activeEmployees.length,
                                'Total employés': deptEmployees.length,
                              };
                            })}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis
                              dataKey="name"
                              stroke="#6C757D"
                              style={{ fontSize: '12px' }}
                              angle={-45}
                              textAnchor="end"
                              height={80}
                            />
                            <YAxis stroke="#6C757D" style={{ fontSize: '12px' }} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: '#fff',
                                border: '1px solid #e0e0e0',
                                borderRadius: '8px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                              }}
                            />
                            <Legend />
                            <Bar
                              dataKey="Employés actifs"
                              fill={COLORS.success}
                              radius={[4, 4, 0, 0]}
                            />
                            <Bar
                              dataKey="Total employés"
                              fill={COLORS.info}
                              radius={[4, 4, 0, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-[300px] text-gray-500">
                          <div className="text-center">
                            <Building2 className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                            <p>Aucune donnée disponible</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Site Attendance Chart */}
                  <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader className="border-b">
                      <CardTitle className="flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-green-600" />
                        Présence par Site
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                      {sites && (sites as any[]).length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart
                            data={(sites as any[]).slice(0, 5).map((site: any) => {
                              const employeesList = allEmployees?.data || employees?.data || [];
                              const siteEmployees = employeesList.filter((emp: any) => 
                                emp.siteId === site.id || emp.site?.id === site.id
                              );
                              const activeEmployees = siteEmployees.filter((emp: any) => 
                                emp.isActive !== false && emp.status !== 'INACTIVE' && emp.status !== 'TERMINATED'
                              );
                              return {
                                name: site.name.length > 15 ? site.name.substring(0, 15) + '...' : site.name,
                                'Employés actifs': activeEmployees.length,
                                'Total employés': siteEmployees.length,
                              };
                            })}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis
                              dataKey="name"
                              stroke="#6C757D"
                              style={{ fontSize: '12px' }}
                              angle={-45}
                              textAnchor="end"
                              height={80}
                            />
                            <YAxis stroke="#6C757D" style={{ fontSize: '12px' }} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: '#fff',
                                border: '1px solid #e0e0e0',
                                borderRadius: '8px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                              }}
                            />
                            <Legend />
                            <Bar
                              dataKey="Employés actifs"
                              fill={COLORS.success}
                              radius={[4, 4, 0, 0]}
                            />
                            <Bar
                              dataKey="Total employés"
                              fill={COLORS.info}
                              radius={[4, 4, 0, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-[300px] text-gray-500">
                          <div className="text-center">
                            <MapPin className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                            <p>Aucune donnée disponible</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>

          {/* ALERTS TAB */}
          <TabsContent value="alerts" className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              {/* Critical Alerts */}
              {(stats?.attendance?.anomalies || 0) > 0 && (
                <Alert variant="danger">
                  <AlertTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    {stats?.attendance?.anomalies} anomalies détectées
                  </AlertTitle>
                  <AlertDescription>
                    <p className="mb-2">
                      Des anomalies ont été détectées dans les pointages. Action requise.
                    </p>
                    <Button size="sm" variant="outline">
                      Voir les détails
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {/* Pending Approvals */}
              {((stats?.pendingApprovals?.leaves || 0) + (stats?.pendingApprovals?.overtime || 0)) > 0 && (
                <Alert variant="warning">
                  <AlertTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    {(stats?.pendingApprovals?.leaves || 0) + (stats?.pendingApprovals?.overtime || 0)}{' '}
                    demandes en attente d'approbation
                  </AlertTitle>
                  <AlertDescription>
                    <div className="space-y-2">
                      <p>
                        {stats?.pendingApprovals?.leaves || 0} demandes de congés •{' '}
                        {stats?.pendingApprovals?.overtime || 0} heures supplémentaires
                      </p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          Traiter les congés
                        </Button>
                        <Button size="sm" variant="outline">
                          Traiter les heures sup
                        </Button>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Late Pattern Alert */}
              {(stats?.attendance?.anomalies || 0) > 10 && (
                <Alert variant="warning">
                  <AlertTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Retards répétés détectés
                  </AlertTitle>
                  <AlertDescription>
                    <p className="mb-2">
                      {stats?.attendance?.anomalies} retards enregistrés cette semaine. Plusieurs employés ont accumulé
                      3+ retards.
                    </p>
                    <Button size="sm" variant="outline">
                      Voir la liste
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {/* Success Message */}
              {(stats?.attendance?.anomalies || 0) === 0 &&
                ((stats?.pendingApprovals?.leaves || 0) + (stats?.pendingApprovals?.overtime || 0)) === 0 && (
                  <Alert variant="success">
                    <AlertTitle className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5" />
                      Tout est en ordre
                    </AlertTitle>
                    <AlertDescription>
                      Aucune alerte ou action requise pour le moment. Tous les indicateurs sont au vert.
                    </AlertDescription>
                  </Alert>
                )}
            </div>
          </TabsContent>

          {/* REAL-TIME TAB */}
          <TabsContent value="realtime" className="space-y-6">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-purple-50">
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-blue-600 animate-pulse" />
                  Activité en temps réel
                  <Badge variant="success" className="ml-2">Live</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {(recentAttendance as any)?.data && (recentAttendance as any).data.length > 0 ? (
                  <div className="space-y-3">
                    {(recentAttendance as any).data.slice(0, 10).map((record: any) => (
                      <div
                        key={record.id}
                        className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg transition-colors border border-gray-100"
                      >
                        <div className="flex items-center gap-3">
                          <Badge
                            variant={record.type === 'IN' ? 'success' : 'default'}
                            className="min-w-[70px] justify-center"
                          >
                            {record.type === 'IN' ? '↓ Entrée' : '↑ Sortie'}
                          </Badge>
                          <div>
                            <p className="font-medium text-gray-900">
                              {record.employee?.firstName} {record.employee?.lastName}
                            </p>
                            <p className="text-xs text-gray-500">
                              {record.site?.name || 'Site principal'}
                              {record.hasAnomaly && (
                                <span className="ml-2 text-orange-600">
                                  <AlertCircle className="inline h-3 w-3" /> Anomalie
                                </span>
                              )}
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
                          <p className="text-xs text-gray-500">
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
                  <div className="text-center py-12 text-gray-500">
                    <Activity className="h-16 w-16 mx-auto mb-3 text-gray-400" />
                    <p className="text-lg font-medium">Aucune activité récente</p>
                    <p className="text-sm">Les pointages apparaîtront ici en temps réel</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
