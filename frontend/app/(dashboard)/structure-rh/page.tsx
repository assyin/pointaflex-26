'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, Briefcase, BarChart3 } from 'lucide-react';
import { DepartmentsTab } from '@/components/structure-rh/DepartmentsTab';
import { PositionsTab } from '@/components/structure-rh/PositionsTab';
import { StatisticsTab } from '@/components/structure-rh/StatisticsTab';

export default function StructureRHPage() {
  const [activeTab, setActiveTab] = useState('departments');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Structure RH</h1>
        <p className="text-muted-foreground">
          Gérez la structure organisationnelle de votre entreprise
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-[600px] grid-cols-3">
          <TabsTrigger value="departments" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Départements</span>
          </TabsTrigger>
          <TabsTrigger value="positions" className="flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            <span className="hidden sm:inline">Fonctions</span>
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Statistiques</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="departments" className="space-y-4">
          <DepartmentsTab />
        </TabsContent>

        <TabsContent value="positions" className="space-y-4">
          <PositionsTab />
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          <StatisticsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
