'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  useDepartmentStats,
} from '@/lib/hooks/useDepartments';
import {
  usePositionStats,
} from '@/lib/hooks/usePositions';
import { Building2, Briefcase, Users, AlertCircle } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export function StatisticsTab() {
  const { data: departmentStats, isLoading: loadingDeptStats } = useDepartmentStats();
  const { data: positionStats, isLoading: loadingPosStats } = usePositionStats();

  const isLoading = loadingDeptStats || loadingPosStats;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card className="p-6">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Chargement des statistiques...</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Statistiques</h2>
        <p className="text-muted-foreground">
          Vue d'ensemble de la structure organisationnelle
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-lg">
              <Building2 className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Départements</p>
              <p className="text-2xl font-bold">{departmentStats?.totalDepartments || 0}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-500/10 rounded-lg">
              <Briefcase className="h-6 w-6 text-purple-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Fonctions</p>
              <p className="text-2xl font-bold">{positionStats?.totalPositions || 0}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-500/10 rounded-lg">
              <Users className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Employés (Dept.)</p>
              <p className="text-2xl font-bold">{departmentStats?.totalEmployees || 0}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-500/10 rounded-lg">
              <AlertCircle className="h-6 w-6 text-orange-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Sans fonction</p>
              <p className="text-2xl font-bold">
                {positionStats?.employeesWithoutPosition || 0}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Departments Distribution */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Distribution par Département
            </h3>
            <div className="space-y-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Département</TableHead>
                    <TableHead className="text-right">Employés</TableHead>
                    <TableHead className="text-right">%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departmentStats?.departments && departmentStats.departments.length > 0 ? (
                    departmentStats.departments.map((dept) => (
                      <TableRow key={dept.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{dept.name}</span>
                            {dept.code && (
                              <Badge variant="secondary" className="text-xs">
                                {dept.code}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {dept.employeeCount}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline">{dept.percentage}%</Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        Aucun département
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </Card>

        {/* Positions Distribution */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Distribution par Fonction
            </h3>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fonction</TableHead>
                    <TableHead className="text-right">Employés</TableHead>
                    <TableHead className="text-right">%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {positionStats?.positions && positionStats.positions.length > 0 ? (
                    positionStats.positions.slice(0, 10).map((pos) => (
                      <TableRow key={pos.id}>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="font-medium">{pos.name}</span>
                            {pos.category && (
                              <Badge variant="secondary" className="text-xs w-fit">
                                {pos.category}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {pos.employeeCount}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline">{pos.percentage}%</Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        Aucune fonction
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            {positionStats && positionStats.positions && positionStats.positions.length > 10 && (
              <p className="text-sm text-muted-foreground mt-4 text-center">
                Affichage des 10 fonctions les plus utilisées sur {positionStats.positions.length}
              </p>
            )}
          </div>
        </Card>
      </div>

      {/* Categories Breakdown */}
      {positionStats?.categories && positionStats.categories.length > 0 && (
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">
              Répartition par Catégorie de Fonction
            </h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {positionStats.categories.map((cat) => (
                <Card key={cat.category} className="p-4 border">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-lg">{cat.category}</p>
                      <p className="text-sm text-muted-foreground">
                        {cat.count} fonction{cat.count > 1 ? 's' : ''}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-lg">
                      {cat.employeeCount}
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Alerts */}
      {(departmentStats?.employeesWithoutDepartment || 0) > 0 ||
        (positionStats?.employeesWithoutPosition || 0) > 0 ? (
        <Card className="border-orange-500/50 bg-orange-500/5">
          <div className="p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5" />
              <div className="space-y-2">
                <h3 className="font-semibold text-orange-500">Attention requise</h3>
                <div className="space-y-1 text-sm">
                  {departmentStats && departmentStats.employeesWithoutDepartment > 0 && (
                    <p>
                      <strong>{departmentStats.employeesWithoutDepartment}</strong> employé(s)
                      n'ont pas de département assigné
                    </p>
                  )}
                  {positionStats && positionStats.employeesWithoutPosition > 0 && (
                    <p>
                      <strong>{positionStats.employeesWithoutPosition}</strong> employé(s)
                      n'ont pas de fonction assignée
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
