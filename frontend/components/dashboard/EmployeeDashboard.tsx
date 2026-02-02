'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Clock,
  Calendar,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Users,
  BarChart3,
  Activity,
} from 'lucide-react';
import { useDashboardStats } from '@/lib/hooks/useDashboardStats';
import { useAttendance } from '@/lib/hooks/useAttendance';
import { useLeaves } from '@/lib/hooks/useLeaves';
import { useSchedules } from '@/lib/hooks/useSchedules';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import Link from 'next/link';

export function EmployeeDashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState('mois');
  const [activeTab, setActiveTab] = useState('overview');

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
      scope: 'personal' as const,
    };
  }, [selectedPeriod]);

  const { data: stats, isLoading } = useDashboardStats(dateFilters);
  const { data: recentAttendance } = useAttendance({ limit: 5 });
  const { data: leaves } = useLeaves({ status: 'PENDING' });
  const { data: schedules } = useSchedules({});

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const personal = stats?.personal;

  return (
    <div className="space-y-6">
      {/* Filtre Période */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Période</h3>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="aujourd-hui">Aujourd'hui</option>
              <option value="semaine">Cette semaine</option>
              <option value="mois">Ce mois</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white p-1 border rounded-lg shadow-sm">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Mon Tableau de Bord
          </TabsTrigger>
          <TabsTrigger value="attendance" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Mes Pointages
          </TabsTrigger>
          <TabsTrigger value="leaves" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Mes Congés
          </TabsTrigger>
          <TabsTrigger value="schedule" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Mon Planning
          </TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-6">
          {/* KPIs Personnels */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <Card className="hover:shadow-lg transition-shadow border-t-4 border-t-blue-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-600">Jours travaillés</p>
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Calendar className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-2">
                  {personal?.workedDays || 0}
                </h3>
                <p className="text-xs text-gray-500">Ce mois</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow border-t-4 border-t-green-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-600">Heures travaillées</p>
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Clock className="h-5 w-5 text-green-600" />
                  </div>
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-2">
                  {personal?.totalHours || 0}h
                </h3>
                <p className="text-xs text-gray-500">Ce mois</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow border-t-4 border-t-yellow-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-600">Retards</p>
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  </div>
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-2">
                  {personal?.lateCount || 0}
                </h3>
                <p className="text-xs text-gray-500">Ce mois</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow border-t-4 border-t-purple-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-600">Heures sup</p>
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-purple-600" />
                  </div>
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-2">
                  {personal?.overtimeHours ? Number(personal.overtimeHours).toFixed(2) : 0}h
                </h3>
                <p className="text-xs text-gray-500">Ce mois</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow border-t-4 border-t-orange-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-600">Congés pris</p>
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Calendar className="h-5 w-5 text-orange-600" />
                  </div>
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-2">
                  {personal?.leaveDays || 0}j
                </h3>
                <p className="text-xs text-gray-500">Ce mois</p>
              </CardContent>
            </Card>
          </div>

          {/* Widgets */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Mes derniers pointages */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Mes Derniers Pointages
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(recentAttendance as any)?.data && (recentAttendance as any).data.length > 0 ? (
                  <div className="space-y-3">
                    {(recentAttendance as any).data.slice(0, 5).map((record: any) => (
                      <div
                        key={record.id}
                        className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors border border-gray-100"
                      >
                        <div className="flex items-center gap-3">
                          <Badge
                            variant={record.type === 'IN' ? 'success' : 'default'}
                            className="min-w-[70px] justify-center"
                          >
                            {record.type === 'IN' ? '↓ Entrée' : '↑ Sortie'}
                          </Badge>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {new Date(record.timestamp).toLocaleDateString('fr-FR')}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatDistanceToNow(new Date(record.timestamp), {
                                addSuffix: true,
                                locale: fr,
                              })}
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
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Clock className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                    <p>Aucun pointage récent</p>
                  </div>
                )}
                <div className="mt-4">
                  <Link href="/attendance">
                    <Button variant="outline" size="sm" className="w-full">
                      Voir tous mes pointages
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Mes demandes en attente */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-primary" />
                  Mes Demandes en Attente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-8 w-8 text-yellow-600" />
                      <div>
                        <p className="font-semibold text-gray-900">Congés</p>
                        <p className="text-sm text-gray-600">
                          {stats?.pendingApprovals?.leaves || 0} demande(s) en attente
                        </p>
                      </div>
                    </div>
                    <Link href="/leaves">
                      <Button size="sm" variant="outline">
                        Voir
                      </Button>
                    </Link>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="h-8 w-8 text-purple-600" />
                      <div>
                        <p className="font-semibold text-gray-900">Heures supplémentaires</p>
                        <p className="text-sm text-gray-600">
                          {stats?.pendingApprovals?.overtime || 0} demande(s) en attente
                        </p>
                      </div>
                    </div>
                    <Link href="/overtime">
                      <Button size="sm" variant="outline">
                        Voir
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Graphique - Mes heures travaillées */}
          {stats?.weeklyAttendance && stats.weeklyAttendance.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Mes Heures Travaillées (7 derniers jours)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stats.weeklyAttendance}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="day" stroke="#6C757D" style={{ fontSize: '12px' }} />
                    <YAxis stroke="#6C757D" style={{ fontSize: '12px' }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="present" fill="#28A745" name="Présent" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="late" fill="#FFC107" name="En retard" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ATTENDANCE TAB */}
        <TabsContent value="attendance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Mes Pointages</CardTitle>
            </CardHeader>
            <CardContent>
              <Link href="/attendance">
                <Button variant="outline" className="w-full">
                  Voir tous mes pointages
                </Button>
              </Link>
            </CardContent>
          </Card>
        </TabsContent>

        {/* LEAVES TAB */}
        <TabsContent value="leaves" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Mes Congés</CardTitle>
            </CardHeader>
            <CardContent>
              <Link href="/leaves">
                <Button variant="outline" className="w-full">
                  Voir mes congés
                </Button>
              </Link>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SCHEDULE TAB */}
        <TabsContent value="schedule" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Mon Planning</CardTitle>
            </CardHeader>
            <CardContent>
              <Link href="/shifts-planning">
                <Button variant="outline" className="w-full">
                  Voir mon planning
                </Button>
              </Link>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

