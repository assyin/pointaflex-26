'use client';

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar, Search, X } from 'lucide-react';
import { format } from 'date-fns';

interface ReportFiltersPanelProps {
  startDate: string;
  endDate: string;
  selectedEmployee: string;
  selectedSite: string;
  selectedDepartment: string;
  selectedTeam: string;
  employeeSearchQuery: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onEmployeeChange: (employeeId: string) => void;
  onSiteChange: (siteId: string) => void;
  onDepartmentChange: (departmentId: string) => void;
  onTeamChange: (teamId: string) => void;
  onEmployeeSearchChange: (query: string) => void;
  onReset: () => void;
  employees: any[];
  sites: any[];
  departments: any[];
  teams: any[];
  filteredEmployees: any[];
}

export function ReportFiltersPanel({
  startDate,
  endDate,
  selectedEmployee,
  selectedSite,
  selectedDepartment,
  selectedTeam,
  employeeSearchQuery,
  onStartDateChange,
  onEndDateChange,
  onEmployeeChange,
  onSiteChange,
  onDepartmentChange,
  onTeamChange,
  onEmployeeSearchChange,
  onReset,
  employees,
  sites,
  departments,
  teams,
  filteredEmployees,
}: ReportFiltersPanelProps) {
  const hasActiveFilters = selectedEmployee !== 'all' || selectedSite !== 'all' ||
    selectedDepartment !== 'all' || selectedTeam !== 'all' || employeeSearchQuery !== '';

  return (
    <div className="pt-4 border-t border-border-light space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label htmlFor="employee-filter">Employé</Label>
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
              <Input
                id="employee-search"
                type="text"
                placeholder="Rechercher un employé..."
                value={employeeSearchQuery}
                onChange={(e) => onEmployeeSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedEmployee} onValueChange={onEmployeeChange}>
              <SelectTrigger id="employee-filter">
                <SelectValue placeholder="Tous les employés" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les employés</SelectItem>
                {filteredEmployees.slice(0, 50).map((emp: any) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName} ({emp.matricule})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="site-filter">Site</Label>
          <Select value={selectedSite} onValueChange={onSiteChange}>
            <SelectTrigger id="site-filter">
              <SelectValue placeholder="Tous les sites" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les sites</SelectItem>
              {sites.map((site: any) => (
                <SelectItem key={site.id} value={site.id}>
                  {site.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="department-filter">Département</Label>
          <Select value={selectedDepartment} onValueChange={onDepartmentChange}>
            <SelectTrigger id="department-filter">
              <SelectValue placeholder="Tous les départements" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les départements</SelectItem>
              {departments.map((dept: any) => (
                <SelectItem key={dept.id} value={dept.id}>
                  {dept.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="team-filter">Équipe</Label>
          <Select value={selectedTeam} onValueChange={onTeamChange}>
            <SelectTrigger id="team-filter">
              <SelectValue placeholder="Toutes les équipes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les équipes</SelectItem>
              {teams.map((team: any) => (
                <SelectItem key={team.id} value={team.id}>
                  {team.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const today = format(new Date(), 'yyyy-MM-dd');
            onStartDateChange(today);
            onEndDateChange(today);
          }}
        >
          <Calendar className="h-4 w-4 mr-2" />
          Aujourd'hui
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const today = new Date();
            const weekStart = new Date(today.setDate(today.getDate() - today.getDay() + 1));
            onStartDateChange(format(weekStart, 'yyyy-MM-dd'));
            onEndDateChange(format(new Date(), 'yyyy-MM-dd'));
          }}
        >
          <Calendar className="h-4 w-4 mr-2" />
          Cette semaine
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const now = new Date();
            onStartDateChange(format(new Date(now.getFullYear(), now.getMonth(), 1), 'yyyy-MM-dd'));
            onEndDateChange(format(new Date(now.getFullYear(), now.getMonth() + 1, 0), 'yyyy-MM-dd'));
          }}
        >
          <Calendar className="h-4 w-4 mr-2" />
          Ce mois
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const now = new Date();
            const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
            onStartDateChange(format(quarterStart, 'yyyy-MM-dd'));
            onEndDateChange(format(new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 0), 'yyyy-MM-dd'));
          }}
        >
          <Calendar className="h-4 w-4 mr-2" />
          Ce trimestre
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const now = new Date();
            onStartDateChange(format(new Date(now.getFullYear(), 0, 1), 'yyyy-MM-dd'));
            onEndDateChange(format(new Date(now.getFullYear(), 11, 31), 'yyyy-MM-dd'));
          }}
        >
          <Calendar className="h-4 w-4 mr-2" />
          Cette année
        </Button>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="ml-auto"
          >
            <X className="h-4 w-4 mr-2" />
            Réinitialiser
          </Button>
        )}
      </div>
    </div>
  );
}

