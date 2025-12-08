'use client';

import React, { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Clock, AlertTriangle, Calendar, TrendingUp, Activity } from 'lucide-react';
import { useDashboardStats } from '@/lib/hooks/useDashboardStats';
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
} from 'recharts';

// Couleurs pour les graphiques
const COLORS = {
  primary: '#0052CC',
  success: '#28A745',
  warning: '#FFC107',
  danger: '#DC3545',
  info: '#17A2B8',
};

// Couleurs pour le pie chart (shifts)
const SHIFT_COLORS = ['#00A3FF', '#0052CC', '#212529', '#FFC107', '#DC3545'];

export default function DashboardPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('semaine');

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
    }

    return {
      startDate: startDate.toISOString(),
      endDate: today.toISOString(),
    };
  }, [selectedPeriod]);

  // Fetch dashboard stats
  const { data: stats, isLoading } = useDashboardStats(dateFilters);

  // Calculate attendance rate
  const attendanceRate = useMemo(() => {
    if (!stats?.employees?.total || stats.employees.total === 0) return 0;
    return (stats.employees.activeToday / stats.employees.total) * 100;
  }, [stats]);

  if (isLoading) {
    return (
      <DashboardLayout title="Tableau de Bord" subtitle="Chargement...">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Tableau de Bord" subtitle="Vue d'ensemble de la gestion des présences">
      <div className="space-y-6">
        {/* Period Selector */}
        <div className="flex items-center gap-4 bg-white p-4 rounded-lg shadow-sm">
          <label className="text-sm font-medium text-gray-700">Période:</label>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="aujourd-hui">Aujourd'hui</option>
            <option value="semaine">Cette semaine</option>
            <option value="mois">Ce mois</option>
          </select>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="hover:shadow-lg transition-shadow">
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
              <div className="flex items-center gap-2">
                <Badge variant="success">En temps réel</Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-600">Retards (7j)</p>
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="h-5 w-5 text-yellow-600" />
                </div>
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-2">
                0
              </h3>
              <p className="text-xs text-gray-500">Derniers 7 jours</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
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
              <p className="text-xs text-gray-500">Période sélectionnée</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-600">Heures sup</p>
                <div className="p-2 bg-purple-100 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                </div>
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-2">
                {stats?.overtime?.totalHours || 0}h
              </h3>
              <p className="text-xs text-gray-500">Approuvées</p>
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
                <BarChart data={[]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="day"
                    stroke="#6C757D"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis
                    stroke="#6C757D"
                    style={{ fontSize: '12px' }}
                  />
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
              {false ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
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
                <LineChart data={[]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="semaine"
                    stroke="#6C757D"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis
                    stroke="#6C757D"
                    style={{ fontSize: '12px' }}
                  />
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
      </div>
    </DashboardLayout>
  );
}
