'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, Briefcase, BarChart3, UserCog } from 'lucide-react';
import { DepartmentsTab } from '@/components/structure-rh/DepartmentsTab';
import { PositionsTab } from '@/components/structure-rh/PositionsTab';
import { StatisticsTab } from '@/components/structure-rh/StatisticsTab';
import { ManagersTab } from '@/components/structure-rh/ManagersTab';
import { Card } from '@/components/ui/card';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

export default function StructureRHPage() {
  const [activeTab, setActiveTab] = useState('departments');

  return (
    <ProtectedRoute permissions={['tenant.manage_departments', 'tenant.manage_positions', 'tenant.manage_sites']}>
      <DashboardLayout
        title="Structure RH"
        subtitle="Gérez la structure organisationnelle de votre entreprise"
      >
      <div className="space-y-6">

      {/* Tabs Section */}
      <Card className="border-0 shadow-md">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="border-b border-gray-200 bg-gray-50/50 px-6">
            <TabsList className="grid w-full max-w-3xl grid-cols-4 bg-transparent h-auto p-0 gap-2">
              <TabsTrigger
                value="departments"
                className="flex items-center gap-3 px-6 py-4 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-gray-900 data-[state=active]:font-semibold text-gray-600 hover:text-gray-900 transition-all duration-200"
              >
                <Building2 className="h-5 w-5" />
                <span className="hidden sm:inline">Départements</span>
                <span className="sm:hidden">Dépt.</span>
              </TabsTrigger>
              <TabsTrigger
                value="positions"
                className="flex items-center gap-3 px-6 py-4 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-gray-900 data-[state=active]:font-semibold text-gray-600 hover:text-gray-900 transition-all duration-200"
              >
                <Briefcase className="h-5 w-5" />
                <span className="hidden sm:inline">Fonctions</span>
                <span className="sm:hidden">Fct.</span>
              </TabsTrigger>
              <TabsTrigger
                value="managers"
                className="flex items-center gap-3 px-6 py-4 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-gray-900 data-[state=active]:font-semibold text-gray-600 hover:text-gray-900 transition-all duration-200"
              >
                <UserCog className="h-5 w-5" />
                <span className="hidden sm:inline">Managers</span>
                <span className="sm:hidden">Mgrs</span>
              </TabsTrigger>
              <TabsTrigger
                value="stats"
                className="flex items-center gap-3 px-6 py-4 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-gray-900 data-[state=active]:font-semibold text-gray-600 hover:text-gray-900 transition-all duration-200"
              >
                <BarChart3 className="h-5 w-5" />
                <span>Statistiques</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="p-6">
            <TabsContent value="departments" className="mt-0 space-y-6">
              <DepartmentsTab />
            </TabsContent>

            <TabsContent value="positions" className="mt-0 space-y-6">
              <PositionsTab />
            </TabsContent>

            <TabsContent value="managers" className="mt-0 space-y-6">
              <ManagersTab />
            </TabsContent>

            <TabsContent value="stats" className="mt-0 space-y-6">
              <StatisticsTab />
            </TabsContent>

            <TabsContent value="managers" className="mt-0 space-y-6">
              <ManagersTab />
            </TabsContent>
          </div>
        </Tabs>
      </Card>
      </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
