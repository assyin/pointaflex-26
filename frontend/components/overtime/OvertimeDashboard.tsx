'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
} from 'recharts';
import { Clock, CheckCircle, XCircle, TrendingUp, Users, Building2 } from 'lucide-react';

// Types
interface OvertimeDashboardData {
  summary: {
    totalRecords: number;
    totalHours: number;
    totalApprovedHours: number;
    pendingCount: number;
    approvedCount: number;
    rejectedCount: number;
    paidCount: number;
    recoveredCount: number;
  };
  byType: Array<{ type: string; count: number; hours: number }>;
  byStatus: Array<{ status: string; count: number; hours: number }>;
  topEmployees: Array<{ id: string; name: string; hours: number; count: number }>;
  byDepartment: Array<{ id: string; name: string; hours: number; count: number }>;
  trend: Array<{ date: string; hours: number; count: number }>;
}

interface OvertimeDashboardProps {
  data?: OvertimeDashboardData;
  isLoading?: boolean;
}

// Colors
const TYPE_COLORS: Record<string, string> = {
  STANDARD: '#3B82F6',
  NIGHT: '#8B5CF6',
  HOLIDAY: '#F97316',
  EMERGENCY: '#EF4444',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#F59E0B',
  APPROVED: '#10B981',
  REJECTED: '#EF4444',
  PAID: '#3B82F6',
  RECOVERED: '#6B7280',
};

const TYPE_LABELS: Record<string, string> = {
  STANDARD: 'Standard',
  NIGHT: 'Nuit',
  HOLIDAY: 'Jour férié',
  EMERGENCY: 'Urgence',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'En attente',
  APPROVED: 'Approuvé',
  REJECTED: 'Rejeté',
  PAID: 'Payé',
  RECOVERED: 'Récupéré',
};

// Summary Cards Component
function SummaryCards({ data, isLoading }: { data?: OvertimeDashboardData['summary']; isLoading?: boolean }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-4 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!data) return null;

  const cards = [
    {
      title: 'Total Heures',
      value: `${data.totalHours.toFixed(1)}h`,
      subtitle: `${data.totalRecords} demandes`,
      icon: Clock,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      title: 'Heures Approuvées',
      value: `${data.totalApprovedHours.toFixed(1)}h`,
      subtitle: `${data.approvedCount} approuvées`,
      icon: CheckCircle,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      title: 'En Attente',
      value: data.pendingCount.toString(),
      subtitle: 'demandes',
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      title: 'Rejetées',
      value: data.rejectedCount.toString(),
      subtitle: 'demandes',
      icon: XCircle,
      color: 'text-red-600',
      bg: 'bg-red-50',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card, index) => (
        <Card key={index}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{card.value}</p>
                <p className="text-sm text-muted-foreground">{card.title}</p>
                <p className="text-xs text-muted-foreground">{card.subtitle}</p>
              </div>
              <div className={`p-3 rounded-full ${card.bg}`}>
                <card.icon className={`h-6 w-6 ${card.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Pie Chart Component for Type
function TypePieChart({ data, isLoading }: { data?: OvertimeDashboardData['byType']; isLoading?: boolean }) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Répartition par Type</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[250px] w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  const chartData = (data || []).map(item => ({
    name: TYPE_LABELS[item.type] || item.type,
    value: item.hours,
    count: item.count,
    color: TYPE_COLORS[item.type] || '#6B7280',
  }));

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Répartition par Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] flex items-center justify-center text-muted-foreground">
            Aucune donnée disponible
          </div>
        </CardContent>
      </Card>
    );
  }

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium" style={{ color: data.color }}>{data.name}</p>
          <p className="text-sm text-gray-600">{data.value.toFixed(1)}h ({data.count} demandes)</p>
          <p className="text-sm text-gray-500">{((data.value / total) * 100).toFixed(1)}%</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Répartition par Type</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                label={({ name, percent }) => percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''}
                labelLine={false}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                formatter={(value, entry: any) => (
                  <span style={{ color: entry.color }}>{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// Status Pie Chart
function StatusPieChart({ data, isLoading }: { data?: OvertimeDashboardData['byStatus']; isLoading?: boolean }) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Répartition par Statut</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[250px] w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  const chartData = (data || []).map(item => ({
    name: STATUS_LABELS[item.status] || item.status,
    value: item.count,
    hours: item.hours,
    color: STATUS_COLORS[item.status] || '#6B7280',
  }));

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Répartition par Statut</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] flex items-center justify-center text-muted-foreground">
            Aucune donnée disponible
          </div>
        </CardContent>
      </Card>
    );
  }

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium" style={{ color: data.color }}>{data.name}</p>
          <p className="text-sm text-gray-600">{data.value} demandes ({data.hours.toFixed(1)}h)</p>
          <p className="text-sm text-gray-500">{((data.value / total) * 100).toFixed(1)}%</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Répartition par Statut</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                label={({ name, percent }) => percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''}
                labelLine={false}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                formatter={(value, entry: any) => (
                  <span style={{ color: entry.color }}>{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// Top Employees Bar Chart
function TopEmployeesChart({ data, isLoading }: { data?: OvertimeDashboardData['topEmployees']; isLoading?: boolean }) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Top 10 Employés
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Top 10 Employés
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Aucune donnée disponible
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5" />
          Top 10 Employés
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 100, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" unit="h" />
              <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value: number) => [`${value.toFixed(1)}h`, 'Heures']}
                labelFormatter={(name) => name}
              />
              <Bar dataKey="hours" fill="#3B82F6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// Department Bar Chart
function DepartmentChart({ data, isLoading }: { data?: OvertimeDashboardData['byDepartment']; isLoading?: boolean }) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Par Département
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Par Département
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Aucune donnée disponible
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Par Département
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                angle={-45}
                textAnchor="end"
                height={80}
                tick={{ fontSize: 11 }}
              />
              <YAxis unit="h" />
              <Tooltip
                formatter={(value: number) => [`${value.toFixed(1)}h`, 'Heures']}
              />
              <Bar dataKey="hours" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// Trend Line Chart
function TrendChart({ data, isLoading }: { data?: OvertimeDashboardData['trend']; isLoading?: boolean }) {
  if (isLoading) {
    return (
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Tendance des Heures Supplémentaires
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Tendance des Heures Supplémentaires
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Aucune donnée disponible
          </div>
        </CardContent>
      </Card>
    );
  }

  // Format dates for display
  const chartData = data.map(item => ({
    ...item,
    displayDate: new Date(item.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
  }));

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Tendance des Heures Supplémentaires
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="displayDate" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="hours" orientation="left" unit="h" />
              <YAxis yAxisId="count" orientation="right" />
              <Tooltip
                formatter={(value: number, name: string) => [
                  name === 'hours' ? `${value.toFixed(1)}h` : value,
                  name === 'hours' ? 'Heures' : 'Demandes',
                ]}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Legend />
              <Line
                yAxisId="hours"
                type="monotone"
                dataKey="hours"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={{ fill: '#3B82F6' }}
                name="Heures"
              />
              <Line
                yAxisId="count"
                type="monotone"
                dataKey="count"
                stroke="#10B981"
                strokeWidth={2}
                dot={{ fill: '#10B981' }}
                name="Demandes"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// Main Dashboard Component
export function OvertimeDashboard({ data, isLoading }: OvertimeDashboardProps) {
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <SummaryCards data={data?.summary} isLoading={isLoading} />

      {/* Charts Row 1: Pie Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TypePieChart data={data?.byType} isLoading={isLoading} />
        <StatusPieChart data={data?.byStatus} isLoading={isLoading} />
      </div>

      {/* Trend Chart */}
      <TrendChart data={data?.trend} isLoading={isLoading} />

      {/* Charts Row 2: Bar Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TopEmployeesChart data={data?.topEmployees} isLoading={isLoading} />
        <DepartmentChart data={data?.byDepartment} isLoading={isLoading} />
      </div>
    </div>
  );
}

export default OvertimeDashboard;
