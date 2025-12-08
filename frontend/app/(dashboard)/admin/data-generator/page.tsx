'use client';

import { useState, useEffect } from 'react';
import { DataGeneratorAPI, GenerationStats } from '@/lib/api/data-generator';
import { DataGeneratorShiftsAPI, ShiftsStats } from '@/lib/api/data-generator-shifts';
import { DataGeneratorHolidaysAPI, HolidaysStats } from '@/lib/api/data-generator-holidays';
import { DataGeneratorLeavesAPI, LeavesStats } from '@/lib/api/data-generator-leaves';
import { DataGeneratorSchedulesAPI, SchedulesStats } from '@/lib/api/data-generator-schedules';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Database, Trash2, BarChart3, Calendar, Users, Clock, CalendarDays, CalendarCheck } from 'lucide-react';

type TabType = 'attendance' | 'shifts' | 'holidays' | 'leaves' | 'schedules';

export default function DataGeneratorPage() {
  const [activeTab, setActiveTab] = useState<TabType>('attendance');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<GenerationStats | null>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Formulaire génération rapide
  const [quickGenForm, setQuickGenForm] = useState({
    days: 30,
    normal: 70,
    late: 15,
    earlyLeave: 5,
    anomaly: 5,
    mission: 3,
    absence: 2,
    excludeHolidays: true,
    excludeWeekends: true,
    generateOvertime: false,
    overtimeThreshold: 30,
  });

  // Formulaire génération personnalisée
  const [customForm, setCustomForm] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    selectedEmployees: [] as string[],
    normal: 70,
    late: 15,
    earlyLeave: 5,
    anomaly: 5,
    mission: 3,
    absence: 2,
    excludeHolidays: true,
    excludeWeekends: true,
    generateOvertime: false,
    overtimeThreshold: 30,
  });

  useEffect(() => {
    loadStats();
    loadEmployees();
  }, []);

  const loadStats = async () => {
    try {
      const data = await DataGeneratorAPI.getStats();
      setStats(data);
    } catch (error: any) {
      console.error('Erreur lors du chargement des stats:', error);
    }
  };

  const loadEmployees = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1'}/employees`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      // Gérer différents formats de réponse
      if (Array.isArray(data)) {
        setEmployees(data);
      } else if (data.data && Array.isArray(data.data)) {
        setEmployees(data.data);
      } else if (data.employees && Array.isArray(data.employees)) {
        setEmployees(data.employees);
      } else {
        setEmployees([]);
      }
    } catch (error: any) {
      console.error('Erreur lors du chargement des employés:', error);
      setEmployees([]);
    }
  };

  const handleQuickGenerate = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + quickGenForm.days);

      const result = await DataGeneratorAPI.generateBulk({
        startDate: new Date().toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        distribution: {
          normal: quickGenForm.normal,
          late: quickGenForm.late,
          earlyLeave: quickGenForm.earlyLeave,
          anomaly: quickGenForm.anomaly,
          mission: quickGenForm.mission,
          absence: quickGenForm.absence,
        },
        excludeHolidays: quickGenForm.excludeHolidays,
        excludeWeekends: quickGenForm.excludeWeekends,
        generateOvertime: quickGenForm.generateOvertime,
        overtimeThreshold: quickGenForm.overtimeThreshold,
      } as any);

      let messageText = `✅ Génération réussie ! ${result.totalGenerated} pointages créés avec ${result.anomaliesDetected} anomalies détectées.`;
      if (result.holidaysIgnored) messageText += ` ${result.holidaysIgnored} jour(s) férié(s) ignoré(s).`;
      if (result.weekendsIgnored) messageText += ` ${result.weekendsIgnored} weekend(s) ignoré(s).`;
      if (result.leavesRespected) messageText += ` ${result.leavesRespected} congé(s) respecté(s).`;
      if (result.overtimeGenerated) messageText += ` ${result.overtimeGenerated} heure(s) supplémentaire(s) générée(s).`;

      setMessage({
        type: 'success',
        text: messageText,
      });

      await loadStats();
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: `❌ Erreur: ${error.message}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCustomGenerate = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const result = await DataGeneratorAPI.generateBulk({
        startDate: customForm.startDate,
        endDate: customForm.endDate,
        employeeIds: customForm.selectedEmployees.length > 0 ? customForm.selectedEmployees : undefined,
        distribution: {
          normal: customForm.normal,
          late: customForm.late,
          earlyLeave: customForm.earlyLeave,
          anomaly: customForm.anomaly,
          mission: customForm.mission,
          absence: customForm.absence,
        },
        excludeHolidays: customForm.excludeHolidays,
        excludeWeekends: customForm.excludeWeekends,
        generateOvertime: customForm.generateOvertime,
        overtimeThreshold: customForm.overtimeThreshold,
      } as any);

      let messageText = `✅ Génération personnalisée réussie ! ${result.totalGenerated} pointages créés.`;
      if (result.holidaysIgnored) messageText += ` ${result.holidaysIgnored} jour(s) férié(s) ignoré(s).`;
      if (result.weekendsIgnored) messageText += ` ${result.weekendsIgnored} weekend(s) ignoré(s).`;
      if (result.leavesRespected) messageText += ` ${result.leavesRespected} congé(s) respecté(s).`;
      if (result.overtimeGenerated) messageText += ` ${result.overtimeGenerated} heure(s) supplémentaire(s) générée(s).`;

      setMessage({
        type: 'success',
        text: messageText,
      });

      await loadStats();
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: `❌ Erreur: ${error.message}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCleanAll = async () => {
    if (!confirm('⚠️ Êtes-vous sûr de vouloir supprimer TOUTES les données générées ?')) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const result = await DataGeneratorAPI.cleanData({ deleteAll: true });
      setMessage({
        type: 'success',
        text: `🗑️ ${result.deletedCount} pointages générés supprimés.`,
      });
      await loadStats();
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: `❌ Erreur: ${error.message}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const totalDistribution = quickGenForm.normal + quickGenForm.late + quickGenForm.earlyLeave +
                             quickGenForm.anomaly + quickGenForm.mission + quickGenForm.absence;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Générateur de Données de Test</h1>
          <p className="text-muted-foreground mt-2">
            Générez des données virtuelles pour tester le système sans terminaux physiques
          </p>
        </div>
        <Database className="h-12 w-12 text-primary" />
      </div>

      {/* Onglets de navigation */}
      <Card>
        <CardContent className="p-0">
          <div className="flex border-b border-border">
            <button
              onClick={() => setActiveTab('attendance')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'attendance'
                  ? 'border-b-2 border-primary text-primary bg-primary/5'
                  : 'text-text-secondary hover:text-text-primary hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Calendar className="h-4 w-4" />
                Pointages
              </div>
            </button>
            <button
              onClick={() => setActiveTab('shifts')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'shifts'
                  ? 'border-b-2 border-primary text-primary bg-primary/5'
                  : 'text-text-secondary hover:text-text-primary hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Clock className="h-4 w-4" />
                Shifts
              </div>
            </button>
            <button
              onClick={() => setActiveTab('holidays')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'holidays'
                  ? 'border-b-2 border-primary text-primary bg-primary/5'
                  : 'text-text-secondary hover:text-text-primary hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <CalendarDays className="h-4 w-4" />
                Jours Fériés
              </div>
            </button>
            <button
              onClick={() => setActiveTab('leaves')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'leaves'
                  ? 'border-b-2 border-primary text-primary bg-primary/5'
                  : 'text-text-secondary hover:text-text-primary hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Users className="h-4 w-4" />
                Congés
              </div>
            </button>
            <button
              onClick={() => setActiveTab('schedules')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'schedules'
                  ? 'border-b-2 border-primary text-primary bg-primary/5'
                  : 'text-text-secondary hover:text-text-primary hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <CalendarCheck className="h-4 w-4" />
                Plannings
              </div>
            </button>
          </div>
        </CardContent>
      </Card>

      {message && (
        <Alert variant={message.type === 'error' ? 'danger' : 'info'}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* Contenu conditionnel selon l'onglet actif */}
      {activeTab === 'attendance' && (
        <div>

      {/* Statistiques */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Statistiques des Données Générées
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <div className="bg-primary/10 p-4 rounded-lg">
                <div className="text-sm text-muted-foreground">Total Généré</div>
                <div className="text-2xl font-bold">{stats.totalGenerated}</div>
              </div>
              <div className="bg-red-500/10 p-4 rounded-lg">
                <div className="text-sm text-muted-foreground">Anomalies</div>
                <div className="text-2xl font-bold text-red-600">{stats.anomaliesDetected}</div>
              </div>
              {(stats as any).holidaysIgnored !== undefined && (
                <div className="bg-orange-500/10 p-4 rounded-lg">
                  <div className="text-sm text-muted-foreground">Jours Fériés Ignorés</div>
                  <div className="text-2xl font-bold text-orange-600">{(stats as any).holidaysIgnored}</div>
                </div>
              )}
              {(stats as any).weekendsIgnored !== undefined && (
                <div className="bg-purple-500/10 p-4 rounded-lg">
                  <div className="text-sm text-muted-foreground">Weekends Ignorés</div>
                  <div className="text-2xl font-bold text-purple-600">{(stats as any).weekendsIgnored}</div>
                </div>
              )}
              {(stats as any).leavesRespected !== undefined && (
                <div className="bg-yellow-500/10 p-4 rounded-lg">
                  <div className="text-sm text-muted-foreground">Congés Respectés</div>
                  <div className="text-2xl font-bold text-yellow-600">{(stats as any).leavesRespected}</div>
                </div>
              )}
              {(stats as any).overtimeGenerated !== undefined && (
                <div className="bg-green-500/10 p-4 rounded-lg">
                  <div className="text-sm text-muted-foreground">Heures Sup Générées</div>
                  <div className="text-2xl font-bold text-green-600">{(stats as any).overtimeGenerated}</div>
                </div>
              )}
            </div>

            {stats.byScenario && Object.keys(stats.byScenario).length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold mb-2">Par Scénario</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {Object.entries(stats.byScenario).map(([scenario, count]) => (
                    <div key={scenario} className="border p-2 rounded text-sm">
                      <span className="font-medium">{scenario}:</span> {count}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Génération Rapide */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Génération Rapide
          </CardTitle>
          <CardDescription>
            Générez rapidement des données pour tous les employés actifs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="days">Nombre de jours</Label>
              <Input
                id="days"
                type="number"
                min="1"
                max="365"
                value={quickGenForm.days}
                onChange={(e) => setQuickGenForm({ ...quickGenForm, days: parseInt(e.target.value) })}
              />
            </div>
          </div>

          <div>
            <Label>Distribution des Scénarios (Total: {totalDistribution}%)</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
              <div>
                <Label htmlFor="normal" className="text-xs">Normal (%)</Label>
                <Input
                  id="normal"
                  type="number"
                  min="0"
                  max="100"
                  value={quickGenForm.normal}
                  onChange={(e) => setQuickGenForm({ ...quickGenForm, normal: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label htmlFor="late" className="text-xs">Retard (%)</Label>
                <Input
                  id="late"
                  type="number"
                  min="0"
                  max="100"
                  value={quickGenForm.late}
                  onChange={(e) => setQuickGenForm({ ...quickGenForm, late: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label htmlFor="earlyLeave" className="text-xs">Départ Anticipé (%)</Label>
                <Input
                  id="earlyLeave"
                  type="number"
                  min="0"
                  max="100"
                  value={quickGenForm.earlyLeave}
                  onChange={(e) => setQuickGenForm({ ...quickGenForm, earlyLeave: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label htmlFor="anomaly" className="text-xs">Anomalies (%)</Label>
                <Input
                  id="anomaly"
                  type="number"
                  min="0"
                  max="100"
                  value={quickGenForm.anomaly}
                  onChange={(e) => setQuickGenForm({ ...quickGenForm, anomaly: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label htmlFor="mission" className="text-xs">Missions (%)</Label>
                <Input
                  id="mission"
                  type="number"
                  min="0"
                  max="100"
                  value={quickGenForm.mission}
                  onChange={(e) => setQuickGenForm({ ...quickGenForm, mission: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label htmlFor="absence" className="text-xs">Absences (%)</Label>
                <Input
                  id="absence"
                  type="number"
                  min="0"
                  max="100"
                  value={quickGenForm.absence}
                  onChange={(e) => setQuickGenForm({ ...quickGenForm, absence: parseInt(e.target.value) })}
                />
              </div>
            </div>
            {totalDistribution !== 100 && (
              <p className="text-sm text-red-600 mt-2">
                ⚠️ La somme doit être égale à 100%
              </p>
            )}
          </div>

          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="excludeHolidays"
                checked={quickGenForm.excludeHolidays}
                onChange={(e) =>
                  setQuickGenForm({ ...quickGenForm, excludeHolidays: e.target.checked })
                }
                className="h-4 w-4"
              />
              <Label htmlFor="excludeHolidays" className="cursor-pointer">
                Exclure les jours fériés
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="excludeWeekends"
                checked={quickGenForm.excludeWeekends}
                onChange={(e) =>
                  setQuickGenForm({ ...quickGenForm, excludeWeekends: e.target.checked })
                }
                className="h-4 w-4"
              />
              <Label htmlFor="excludeWeekends" className="cursor-pointer">
                Exclure les weekends
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="generateOvertime"
                checked={quickGenForm.generateOvertime}
                onChange={(e) =>
                  setQuickGenForm({ ...quickGenForm, generateOvertime: e.target.checked })
                }
                className="h-4 w-4"
              />
              <Label htmlFor="generateOvertime" className="cursor-pointer">
                Générer les heures supplémentaires
              </Label>
            </div>
            {quickGenForm.generateOvertime && (
              <div>
                <Label htmlFor="overtimeThreshold" className="text-xs">
                  Seuil minimum (minutes) pour créer une heure sup
                </Label>
                <Input
                  id="overtimeThreshold"
                  type="number"
                  min="0"
                  value={quickGenForm.overtimeThreshold}
                  onChange={(e) =>
                    setQuickGenForm({ ...quickGenForm, overtimeThreshold: parseInt(e.target.value) || 30 })
                  }
                  className="mt-1"
                />
              </div>
            )}
          </div>

          <Button
            onClick={handleQuickGenerate}
            disabled={loading || totalDistribution !== 100}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Génération en cours...
              </>
            ) : (
              `Générer ${quickGenForm.days} jours de données`
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Informations Employés */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Employés Actifs ({employees.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-40 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {employees.map((emp) => (
                <div key={emp.id} className="border p-2 rounded text-sm">
                  <div className="font-medium">{emp.firstName} {emp.lastName}</div>
                  <div className="text-xs text-muted-foreground">Mat: {emp.matricule}</div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions Dangereuses */}
      <Card className="border-red-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <Trash2 className="h-5 w-5" />
            Zone Dangereuse
          </CardTitle>
          <CardDescription>
            Supprimez toutes les données générées (action irréversible)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="danger"
            onClick={handleCleanAll}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Suppression...
              </>
            ) : (
              'Supprimer toutes les données générées'
            )}
          </Button>
        </CardContent>
      </Card>
        </div>
      )}

      {activeTab === 'shifts' && <ShiftsGeneratorTab />}
      {activeTab === 'holidays' && <HolidaysGeneratorTab />}
      {activeTab === 'leaves' && <LeavesGeneratorTab />}
      {activeTab === 'schedules' && <SchedulesGeneratorTab />}
    </div>
  );
}

// Composant pour l'onglet Shifts
function ShiftsGeneratorTab() {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<ShiftsStats | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [formData, setFormData] = useState({
    createDefaultShifts: true,
    // Option createSchedules retirée - utilisez l'onglet Plannings séparé
  });
  const [distribution, setDistribution] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await DataGeneratorShiftsAPI.getStats();
      setStats(data);
      if (data.shifts.length > 0 && Object.keys(distribution).length === 0) {
        const defaultDist: { [key: string]: number } = {};
        const equalPercent = Math.floor(100 / data.shifts.length);
        data.shifts.forEach((shift, index) => {
          if (index === data.shifts.length - 1) {
            defaultDist[shift.id] = 100 - (equalPercent * (data.shifts.length - 1));
          } else {
            defaultDist[shift.id] = equalPercent;
          }
        });
        setDistribution(defaultDist);
      }
    } catch (error: any) {
      console.error('Erreur lors du chargement des stats:', error);
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    setMessage(null);
    try {
      if (stats && stats.shifts.length > 0 && Object.keys(distribution).length > 0) {
        const total = Object.values(distribution).reduce((sum, val) => sum + val, 0);
        if (Math.abs(total - 100) > 0.01) {
          setMessage({ type: 'error', text: '⚠️ La somme des pourcentages de distribution doit être égale à 100%' });
          setLoading(false);
          return;
        }
      }
      const dto: any = { createDefaultShifts: formData.createDefaultShifts };
      if (Object.keys(distribution).length > 0) dto.distribution = distribution;
      // La création de plannings est maintenant gérée par le générateur de plannings séparé
      const result = await DataGeneratorShiftsAPI.generateShifts(dto);
      setMessage({ type: 'success', text: `✅ Génération réussie ! ${result.shiftsCreated} shift(s) créé(s), ${result.shiftsAssigned} assignation(s), ${result.schedulesCreated} planning(s) créé(s).` });
      await loadStats();
    } catch (error: any) {
      setMessage({ type: 'error', text: `❌ Erreur: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const totalDistribution = Object.values(distribution).reduce((sum, val) => sum + val, 0);

  return (
    <>
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Statistiques des Shifts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-primary/10 p-4 rounded-lg">
                <div className="text-sm text-muted-foreground">Total Shifts</div>
                <div className="text-2xl font-bold">{stats.totalShifts}</div>
              </div>
              <div className="bg-blue-500/10 p-4 rounded-lg">
                <div className="text-sm text-muted-foreground">Employés avec Shift</div>
                <div className="text-2xl font-bold text-blue-600">{stats.employeesWithShift}</div>
              </div>
              <div className="bg-orange-500/10 p-4 rounded-lg">
                <div className="text-sm text-muted-foreground">Employés sans Shift</div>
                <div className="text-2xl font-bold text-orange-600">{stats.employeesWithoutShift}</div>
              </div>
              <div className="bg-green-500/10 p-4 rounded-lg">
                <div className="text-sm text-muted-foreground">Total Employés</div>
                <div className="text-2xl font-bold text-green-600">{stats.totalEmployees}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Génération de Shifts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <input type="checkbox" id="createDefaultShifts" checked={formData.createDefaultShifts} onChange={(e) => setFormData({ ...formData, createDefaultShifts: e.target.checked })} className="h-4 w-4" />
            <Label htmlFor="createDefaultShifts" className="cursor-pointer">Créer des shifts par défaut (Matin, Soir, Nuit) s'ils n'existent pas</Label>
          </div>
          {stats && stats.shifts.length > 0 && (
            <div>
              <Label>Distribution d'assignation (Total: {totalDistribution}%)</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                {stats.shifts.map((shift) => (
                  <div key={shift.id} className="space-y-1">
                    <Label htmlFor={`dist-${shift.id}`} className="text-xs">{shift.name} (%)</Label>
                    <Input id={`dist-${shift.id}`} type="number" min="0" max="100" value={distribution[shift.id] || 0} onChange={(e) => setDistribution({ ...distribution, [shift.id]: Math.max(0, Math.min(100, parseInt(e.target.value) || 0)) })} />
                  </div>
                ))}
              </div>
              {totalDistribution !== 100 && <p className="text-sm text-red-600 mt-2">⚠️ La somme doit être égale à 100%</p>}
            </div>
          )}
          <div className="border-t pt-4">
            <Alert variant="info">
              <AlertDescription>
                <strong>Note :</strong> Ce générateur crée uniquement les <strong>shifts</strong> et les <strong>assigne aux employés</strong>. 
                Pour créer des <strong>plannings</strong> (schedules), utilisez l'onglet <strong>"Plannings"</strong> séparé qui utilisera automatiquement les shifts déjà assignés.
              </AlertDescription>
            </Alert>
          </div>
          <Button onClick={handleGenerate} disabled={loading || Boolean(stats && stats.shifts.length > 0 && totalDistribution !== 100)} className="w-full">
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Génération en cours...</> : 'Générer shifts et assignations'}
          </Button>
        </CardContent>
      </Card>
    </>
  );
}

// Composant pour l'onglet Holidays
function HolidaysGeneratorTab() {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<HolidaysStats | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const currentYear = new Date().getFullYear();
  const [formData, setFormData] = useState({
    generateMoroccoHolidays: true,
    startYear: currentYear,
    endYear: currentYear + 2,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await DataGeneratorHolidaysAPI.getStats();
      setStats(data);
    } catch (error: any) {
      console.error('Erreur lors du chargement des stats:', error);
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    setMessage(null);
    try {
      if (formData.startYear > formData.endYear) {
        setMessage({ type: 'error', text: '⚠️ L\'année de début doit être inférieure ou égale à l\'année de fin' });
        setLoading(false);
        return;
      }
      const result = await DataGeneratorHolidaysAPI.generateHolidays({ generateMoroccoHolidays: formData.generateMoroccoHolidays, startYear: formData.startYear, endYear: formData.endYear });
      setMessage({ type: 'success', text: `✅ Génération réussie ! ${result.holidaysCreated} jour(s) férié(s) créé(s), ${result.holidaysSkipped} ignoré(s) (déjà existants).` });
      await loadStats();
    } catch (error: any) {
      setMessage({ type: 'error', text: `❌ Erreur: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleClean = async () => {
    if (!confirm('⚠️ Êtes-vous sûr de vouloir supprimer TOUS les jours fériés ?')) return;
    setLoading(true);
    setMessage(null);
    try {
      const result = await DataGeneratorHolidaysAPI.cleanHolidays();
      setMessage({ type: 'success', text: `🗑️ ${result.deletedCount} jour(s) férié(s) supprimé(s).` });
      await loadStats();
    } catch (error: any) {
      setMessage({ type: 'error', text: `❌ Erreur: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {message && (
        <Alert variant={message.type === 'error' ? 'danger' : 'info'}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Statistiques des Jours Fériés
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-primary/10 p-4 rounded-lg">
                <div className="text-sm text-muted-foreground">Total</div>
                <div className="text-2xl font-bold">{stats.totalHolidays}</div>
              </div>
              <div className="bg-blue-500/10 p-4 rounded-lg">
                <div className="text-sm text-muted-foreground">Récurrents</div>
                <div className="text-2xl font-bold text-blue-600">{stats.recurring}</div>
              </div>
              <div className="bg-orange-500/10 p-4 rounded-lg">
                <div className="text-sm text-muted-foreground">Non récurrents</div>
                <div className="text-2xl font-bold text-orange-600">{stats.nonRecurring}</div>
              </div>
              <div className="bg-green-500/10 p-4 rounded-lg">
                <div className="text-sm text-muted-foreground">Années couvertes</div>
                <div className="text-2xl font-bold text-green-600">{Object.keys(stats.byYear).length}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Génération de Jours Fériés
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <input type="checkbox" id="generateMoroccoHolidays" checked={formData.generateMoroccoHolidays} onChange={(e) => setFormData({ ...formData, generateMoroccoHolidays: e.target.checked })} className="h-4 w-4" />
            <Label htmlFor="generateMoroccoHolidays" className="cursor-pointer">Générer les jours fériés du Maroc</Label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startYear">Année de début</Label>
              <Input id="startYear" type="number" min="2020" max="2100" value={formData.startYear} onChange={(e) => setFormData({ ...formData, startYear: parseInt(e.target.value) || currentYear })} />
            </div>
            <div>
              <Label htmlFor="endYear">Année de fin</Label>
              <Input id="endYear" type="number" min="2020" max="2100" value={formData.endYear} onChange={(e) => setFormData({ ...formData, endYear: parseInt(e.target.value) || currentYear + 2 })} />
            </div>
          </div>
          <div className="flex gap-3">
            <Button onClick={handleGenerate} disabled={loading || formData.startYear > formData.endYear} className="flex-1">
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Génération en cours...</> : 'Générer les jours fériés'}
            </Button>
            {stats && stats.totalHolidays > 0 && (
              <Button variant="danger" onClick={handleClean} disabled={loading}>
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Suppression...</> : <><Trash2 className="mr-2 h-4 w-4" /> Supprimer tout</>}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}

// Composant pour l'onglet Leaves
function LeavesGeneratorTab() {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<LeavesStats | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [formData, setFormData] = useState({
    percentage: 30,
    averageDaysPerEmployee: 5,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    autoApprove: true,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await DataGeneratorLeavesAPI.getStats();
      setStats(data);
    } catch (error: any) {
      console.error('Erreur lors du chargement des stats:', error);
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    setMessage(null);
    try {
      if (new Date(formData.startDate) > new Date(formData.endDate)) {
        setMessage({ type: 'error', text: '⚠️ La date de début doit être avant la date de fin' });
        setLoading(false);
        return;
      }
      const result = await DataGeneratorLeavesAPI.generateLeaves({ percentage: formData.percentage, averageDaysPerEmployee: formData.averageDaysPerEmployee, startDate: formData.startDate, endDate: formData.endDate, autoApprove: formData.autoApprove });
      setMessage({ type: 'success', text: `✅ Génération réussie ! ${result.leavesCreated} congé(s) créé(s) pour ${result.employeesProcessed} employé(s), ${result.leavesSkipped} ignoré(s) (chevauchement).` });
      await loadStats();
    } catch (error: any) {
      setMessage({ type: 'error', text: `❌ Erreur: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {message && (
        <Alert variant={message.type === 'error' ? 'danger' : 'info'}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Statistiques des Congés
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-primary/10 p-4 rounded-lg">
                <div className="text-sm text-muted-foreground">Total Congés</div>
                <div className="text-2xl font-bold">{stats.totalLeaves}</div>
              </div>
              <div className="bg-blue-500/10 p-4 rounded-lg">
                <div className="text-sm text-muted-foreground">Total Jours</div>
                <div className="text-2xl font-bold text-blue-600">{stats.totalDays}</div>
              </div>
              <div className="bg-green-500/10 p-4 rounded-lg">
                <div className="text-sm text-muted-foreground">Types de Congés</div>
                <div className="text-2xl font-bold text-green-600">{stats.totalLeaveTypes}</div>
              </div>
              <div className="bg-orange-500/10 p-4 rounded-lg">
                <div className="text-sm text-muted-foreground">Moyenne par Type</div>
                <div className="text-2xl font-bold text-orange-600">{stats.totalLeaveTypes > 0 ? Math.round(stats.totalLeaves / stats.totalLeaveTypes) : 0}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Génération de Congés
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="percentage">Pourcentage d'employés (%)</Label>
              <Input id="percentage" type="number" min="0" max="100" value={formData.percentage} onChange={(e) => setFormData({ ...formData, percentage: parseInt(e.target.value) || 0 })} />
              <p className="text-xs text-muted-foreground mt-1">Pourcentage d'employés qui auront des congés</p>
            </div>
            <div>
              <Label htmlFor="averageDays">Jours moyens par employé</Label>
              <Input id="averageDays" type="number" min="1" max="30" value={formData.averageDaysPerEmployee} onChange={(e) => setFormData({ ...formData, averageDaysPerEmployee: parseInt(e.target.value) || 1 })} />
              <p className="text-xs text-muted-foreground mt-1">Nombre moyen de jours de congé par employé</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Date de début</Label>
              <Input id="startDate" type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="endDate">Date de fin</Label>
              <Input id="endDate" type="date" value={formData.endDate} min={formData.startDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="autoApprove" checked={formData.autoApprove} onChange={(e) => setFormData({ ...formData, autoApprove: e.target.checked })} className="h-4 w-4" />
            <Label htmlFor="autoApprove" className="cursor-pointer">Approuver automatiquement les congés générés (status APPROVED)</Label>
          </div>
          <Button onClick={handleGenerate} disabled={loading || new Date(formData.startDate) > new Date(formData.endDate)} className="w-full">
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Génération en cours...</> : 'Générer les congés'}
          </Button>
        </CardContent>
      </Card>
    </>
  );
}

// Composant pour l'onglet Schedules (Plannings)
function SchedulesGeneratorTab() {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<SchedulesStats | null>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formData, setFormData] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    employeeIds: [] as string[],
    shiftIds: [] as string[],
    excludeWeekends: true,
    excludeHolidays: true,
    workDaysPercentage: 80,
  });

  useEffect(() => {
    loadStats();
    loadEmployees();
    loadShifts();
  }, []);

  const loadStats = async () => {
    try {
      const data = await DataGeneratorSchedulesAPI.getStats();
      setStats(data);
    } catch (error: any) {
      console.error('Erreur lors du chargement des stats:', error);
    }
  };

  const loadEmployees = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1'}/employees`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (Array.isArray(data)) {
        setEmployees(data);
      } else if (data.data && Array.isArray(data.data)) {
        setEmployees(data.data);
      } else if (data.employees && Array.isArray(data.employees)) {
        setEmployees(data.employees);
      } else {
        setEmployees([]);
      }
    } catch (error: any) {
      console.error('Erreur lors du chargement des employés:', error);
      setEmployees([]);
    }
  };

  const loadShifts = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1'}/shifts`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (Array.isArray(data)) {
        setShifts(data);
      } else if (data.data && Array.isArray(data.data)) {
        setShifts(data.data);
      } else {
        setShifts([]);
      }
    } catch (error: any) {
      console.error('Erreur lors du chargement des shifts:', error);
      setShifts([]);
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const result = await DataGeneratorSchedulesAPI.generateSchedules({
        startDate: formData.startDate,
        endDate: formData.endDate,
        employeeIds: formData.employeeIds.length > 0 ? formData.employeeIds : undefined,
        shiftIds: formData.shiftIds.length > 0 ? formData.shiftIds : undefined,
        excludeWeekends: formData.excludeWeekends,
        excludeHolidays: formData.excludeHolidays,
        workDaysPercentage: formData.workDaysPercentage,
      });

      setMessage({
        type: 'success',
        text: `✅ ${result.schedulesCreated} plannings créés avec succès! ${result.schedulesSkipped > 0 ? `(${result.schedulesSkipped} ignorés)` : ''}`,
      });
      await loadStats();
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: `❌ Erreur: ${error.message}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClean = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer tous les plannings générés ?')) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const result = await DataGeneratorSchedulesAPI.cleanSchedules();
      setMessage({
        type: 'success',
        text: `🗑️ ${result.deletedCount} plannings supprimés.`,
      });
      await loadStats();
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: `❌ Erreur: ${error.message}`,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Générer des Plannings</CardTitle>
          <CardDescription>
            Créez automatiquement des plannings en utilisant les shifts déjà assignés aux employés pour une période donnée
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {message && (
            <Alert variant={message.type === 'success' ? 'success' : 'danger'}>
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}

          <Alert variant="info">
            <AlertDescription>
              <strong>Important :</strong> Ce générateur utilise les <strong>shifts déjà assignés</strong> aux employés (via le générateur de shifts). 
              Si un employé n'a pas de shift assigné, un shift sera choisi aléatoirement parmi les shifts disponibles.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Date de début *</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="endDate">Date de fin *</Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                min={formData.startDate}
              />
            </div>
          </div>

          <div>
            <Label>Employés (optionnel - tous si vide)</Label>
            <div className="max-h-40 overflow-y-auto border rounded p-2">
              {employees.length === 0 ? (
                <p className="text-sm text-text-secondary">Chargement...</p>
              ) : (
                <div className="space-y-1">
                  {employees.map((emp) => (
                    <label key={emp.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={formData.employeeIds.includes(emp.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({ ...formData, employeeIds: [...formData.employeeIds, emp.id] });
                          } else {
                            setFormData({ ...formData, employeeIds: formData.employeeIds.filter(id => id !== emp.id) });
                          }
                        }}
                      />
                      <span>{emp.firstName} {emp.lastName} ({emp.matricule})</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <Label>Shifts (optionnel - utilise les shifts assignés par défaut)</Label>
            <div className="max-h-40 overflow-y-auto border rounded p-2">
              {shifts.length === 0 ? (
                <p className="text-sm text-text-secondary">Aucun shift trouvé. Créez d'abord des shifts.</p>
              ) : (
                <div className="space-y-1">
                  {shifts.map((shift) => (
                    <label key={shift.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={formData.shiftIds.includes(shift.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({ ...formData, shiftIds: [...formData.shiftIds, shift.id] });
                          } else {
                            setFormData({ ...formData, shiftIds: formData.shiftIds.filter(id => id !== shift.id) });
                          }
                        }}
                      />
                      <span>{shift.name} ({shift.code}) - {shift.startTime} à {shift.endTime}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="workDaysPercentage">
              Pourcentage de jours travaillés: {formData.workDaysPercentage}%
            </Label>
            <Input
              id="workDaysPercentage"
              type="range"
              min="0"
              max="100"
              value={formData.workDaysPercentage}
              onChange={(e) => setFormData({ ...formData, workDaysPercentage: parseInt(e.target.value) })}
            />
            <p className="text-xs text-text-secondary mt-1">
              Probabilité qu'un employé travaille un jour donné
            </p>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.excludeWeekends}
                onChange={(e) => setFormData({ ...formData, excludeWeekends: e.target.checked })}
              />
              <span>Exclure les weekends</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.excludeHolidays}
                onChange={(e) => setFormData({ ...formData, excludeHolidays: e.target.checked })}
              />
              <span>Exclure les jours fériés</span>
            </label>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleGenerate}
              disabled={loading || !formData.startDate || !formData.endDate}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Génération...
                </>
              ) : (
                <>
                  <CalendarCheck className="h-4 w-4 mr-2" />
                  Générer les plannings
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleClean}
              disabled={loading}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Nettoyer
            </Button>
          </div>
        </CardContent>
      </Card>

      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Statistiques des Plannings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-primary/10 rounded-lg">
                <p className="text-sm text-text-secondary">Total plannings</p>
                <p className="text-2xl font-bold text-primary">{stats.totalSchedules}</p>
              </div>
              <div className="p-4 bg-success/10 rounded-lg">
                <p className="text-sm text-text-secondary">Employés avec plannings</p>
                <p className="text-2xl font-bold text-success">{stats.employeesWithSchedules}</p>
              </div>
              <div className="p-4 bg-info/10 rounded-lg">
                <p className="text-sm text-text-secondary">Moyenne par employé</p>
                <p className="text-2xl font-bold text-info">{stats.averageSchedulesPerEmployee}</p>
              </div>
            </div>

            {stats.byShift && stats.byShift.length > 0 && (
              <div className="mt-6">
                <h3 className="font-semibold mb-3">Répartition par shift</h3>
                <div className="space-y-2">
                  {stats.byShift.map((item) => (
                    <div key={item.shiftId} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div>
                        <p className="font-medium">{item.shiftName} ({item.shiftCode})</p>
                      </div>
                      <p className="text-lg font-bold text-primary">{item.count}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
