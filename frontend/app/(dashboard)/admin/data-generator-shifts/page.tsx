'use client';

import { useState, useEffect } from 'react';
import { DataGeneratorShiftsAPI, ShiftsStats } from '@/lib/api/data-generator-shifts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Clock, Users, Calendar, CheckCircle2, BarChart3 } from 'lucide-react';

export default function DataGeneratorShiftsPage() {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<ShiftsStats | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formData, setFormData] = useState({
    createDefaultShifts: true,
    createSchedules: false,
    scheduleStartDate: new Date().toISOString().split('T')[0],
    scheduleEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });

  const [distribution, setDistribution] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await DataGeneratorShiftsAPI.getStats();
      setStats(data);
      
      // Initialiser la distribution si des shifts existent
      if (data.shifts.length > 0 && Object.keys(distribution).length === 0) {
        const defaultDist: { [key: string]: number } = {};
        const equalPercent = Math.floor(100 / data.shifts.length);
        data.shifts.forEach((shift, index) => {
          if (index === data.shifts.length - 1) {
            // Le dernier prend le reste pour faire 100%
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
      // Vérifier la distribution si des shifts existent
      if (stats && stats.shifts.length > 0 && Object.keys(distribution).length > 0) {
        const total = Object.values(distribution).reduce((sum, val) => sum + val, 0);
        if (Math.abs(total - 100) > 0.01) {
          setMessage({
            type: 'error',
            text: '⚠️ La somme des pourcentages de distribution doit être égale à 100%',
          });
          setLoading(false);
          return;
        }
      }

      const dto: any = {
        createDefaultShifts: formData.createDefaultShifts,
      };

      if (Object.keys(distribution).length > 0) {
        dto.distribution = distribution;
      }

      if (formData.createSchedules) {
        dto.createSchedules = true;
        dto.scheduleStartDate = formData.scheduleStartDate;
        dto.scheduleEndDate = formData.scheduleEndDate;
      }

      const result = await DataGeneratorShiftsAPI.generateShifts(dto);

      setMessage({
        type: 'success',
        text: `✅ Génération réussie ! ${result.shiftsCreated} shift(s) créé(s), ${result.shiftsAssigned} assignation(s), ${result.schedulesCreated} planning(s) créé(s).`,
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

  const updateDistribution = (shiftId: string, value: number) => {
    setDistribution({
      ...distribution,
      [shiftId]: Math.max(0, Math.min(100, value)),
    });
  };

  const totalDistribution = Object.values(distribution).reduce((sum, val) => sum + val, 0);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Générateur de Shifts</h1>
          <p className="text-muted-foreground mt-2">
            Créez des shifts et assignez-les aux employés automatiquement
          </p>
        </div>
        <Clock className="h-12 w-12 text-primary" />
      </div>

      {message && (
        <Alert variant={message.type === 'error' ? 'danger' : 'info'}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* Statistiques */}
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

            {stats.shifts.length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold mb-2">Détails par Shift</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {stats.shifts.map((shift) => (
                    <div key={shift.id} className="border p-3 rounded">
                      <div className="font-medium">{shift.name} ({shift.code})</div>
                      <div className="text-sm text-muted-foreground">
                        {shift.startTime} - {shift.endTime}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {shift.employeesCount} employé(s) • {shift.schedulesCount} planning(s)
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Formulaire de génération */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Génération de Shifts
          </CardTitle>
          <CardDescription>
            Créez des shifts par défaut et assignez-les aux employés
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="createDefaultShifts"
              checked={formData.createDefaultShifts}
              onChange={(e) =>
                setFormData({ ...formData, createDefaultShifts: e.target.checked })
              }
              className="h-4 w-4"
            />
            <Label htmlFor="createDefaultShifts" className="cursor-pointer">
              Créer des shifts par défaut (Matin, Soir, Nuit) s'ils n'existent pas
            </Label>
          </div>

          {/* Distribution des shifts */}
          {stats && stats.shifts.length > 0 && (
            <div>
              <Label>Distribution d'assignation (Total: {totalDistribution}%)</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                {stats.shifts.map((shift) => (
                  <div key={shift.id} className="space-y-1">
                    <Label htmlFor={`dist-${shift.id}`} className="text-xs">
                      {shift.name} (%)
                    </Label>
                    <Input
                      id={`dist-${shift.id}`}
                      type="number"
                      min="0"
                      max="100"
                      value={distribution[shift.id] || 0}
                      onChange={(e) =>
                        updateDistribution(shift.id, parseInt(e.target.value) || 0)
                      }
                    />
                  </div>
                ))}
              </div>
              {totalDistribution !== 100 && (
                <p className="text-sm text-red-600 mt-2">
                  ⚠️ La somme doit être égale à 100%
                </p>
              )}
            </div>
          )}

          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                id="createSchedules"
                checked={formData.createSchedules}
                onChange={(e) =>
                  setFormData({ ...formData, createSchedules: e.target.checked })
                }
                className="h-4 w-4"
              />
              <Label htmlFor="createSchedules" className="cursor-pointer">
                Créer des plannings pour une période
              </Label>
            </div>

            {formData.createSchedules && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="scheduleStartDate">Date de début</Label>
                  <Input
                    id="scheduleStartDate"
                    type="date"
                    value={formData.scheduleStartDate}
                    onChange={(e) =>
                      setFormData({ ...formData, scheduleStartDate: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="scheduleEndDate">Date de fin</Label>
                  <Input
                    id="scheduleEndDate"
                    type="date"
                    value={formData.scheduleEndDate}
                    min={formData.scheduleStartDate}
                    onChange={(e) =>
                      setFormData({ ...formData, scheduleEndDate: e.target.value })
                    }
                  />
                </div>
              </div>
            )}
          </div>

          <Button
            onClick={handleGenerate}
            disabled={loading || Boolean(stats && stats.shifts.length > 0 && totalDistribution !== 100)}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Génération en cours...
              </>
            ) : (
              'Générer shifts et assignations'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

