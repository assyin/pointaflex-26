'use client';

import { useState, useEffect } from 'react';
import { DataGeneratorLeavesAPI, LeavesStats } from '@/lib/api/data-generator-leaves';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Calendar, BarChart3, CheckCircle2 } from 'lucide-react';

export default function DataGeneratorLeavesPage() {
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
        setMessage({
          type: 'error',
          text: '⚠️ La date de début doit être avant la date de fin',
        });
        setLoading(false);
        return;
      }

      const result = await DataGeneratorLeavesAPI.generateLeaves({
        percentage: formData.percentage,
        averageDaysPerEmployee: formData.averageDaysPerEmployee,
        startDate: formData.startDate,
        endDate: formData.endDate,
        autoApprove: formData.autoApprove,
      });

      setMessage({
        type: 'success',
        text: `✅ Génération réussie ! ${result.leavesCreated} congé(s) créé(s) pour ${result.employeesProcessed} employé(s), ${result.leavesSkipped} ignoré(s) (chevauchement).`,
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
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Générateur de Congés</h1>
          <p className="text-muted-foreground mt-2">
            Générez automatiquement des congés pour les employés
          </p>
        </div>
        <Calendar className="h-12 w-12 text-primary" />
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
                <div className="text-2xl font-bold text-orange-600">
                  {stats.totalLeaveTypes > 0 ? Math.round(stats.totalLeaves / stats.totalLeaveTypes) : 0}
                </div>
              </div>
            </div>

            {Object.keys(stats.byStatus).length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold mb-2">Par Statut</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {Object.entries(stats.byStatus).map(([status, count]) => (
                    <div key={status} className="border p-2 rounded text-sm">
                      <span className="font-medium">{status}:</span> {count}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {stats.leaveTypes.length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold mb-2">Par Type de Congé</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {stats.leaveTypes.map((lt) => (
                    <div key={lt.id} className="border p-3 rounded">
                      <div className="font-medium">{lt.name} ({lt.code})</div>
                      <div className="text-sm text-muted-foreground">
                        {lt.leavesCount} congé(s) • {lt.isPaid ? 'Payé' : 'Non payé'}
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
            Génération de Congés
          </CardTitle>
          <CardDescription>
            Générez automatiquement des congés pour un pourcentage d'employés
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="percentage">Pourcentage d'employés (%)</Label>
              <Input
                id="percentage"
                type="number"
                min="0"
                max="100"
                value={formData.percentage}
                onChange={(e) =>
                  setFormData({ ...formData, percentage: parseInt(e.target.value) || 0 })
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                Pourcentage d'employés qui auront des congés
              </p>
            </div>
            <div>
              <Label htmlFor="averageDays">Jours moyens par employé</Label>
              <Input
                id="averageDays"
                type="number"
                min="1"
                max="30"
                value={formData.averageDaysPerEmployee}
                onChange={(e) =>
                  setFormData({ ...formData, averageDaysPerEmployee: parseInt(e.target.value) || 1 })
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                Nombre moyen de jours de congé par employé
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Date de début</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) =>
                  setFormData({ ...formData, startDate: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="endDate">Date de fin</Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate}
                min={formData.startDate}
                onChange={(e) =>
                  setFormData({ ...formData, endDate: e.target.value })
                }
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="autoApprove"
              checked={formData.autoApprove}
              onChange={(e) =>
                setFormData({ ...formData, autoApprove: e.target.checked })
              }
              className="h-4 w-4"
            />
            <Label htmlFor="autoApprove" className="cursor-pointer">
              Approuver automatiquement les congés générés (status APPROVED)
            </Label>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={loading || new Date(formData.startDate) > new Date(formData.endDate)}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Génération en cours...
              </>
            ) : (
              'Générer les congés'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

