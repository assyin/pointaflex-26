'use client';

import { useState, useEffect } from 'react';
import { DataGeneratorHolidaysAPI, HolidaysStats } from '@/lib/api/data-generator-holidays';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Calendar, Trash2, BarChart3, CheckCircle2 } from 'lucide-react';

export default function DataGeneratorHolidaysPage() {
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
        setMessage({
          type: 'error',
          text: '⚠️ L\'année de début doit être inférieure ou égale à l\'année de fin',
        });
        setLoading(false);
        return;
      }

      const result = await DataGeneratorHolidaysAPI.generateHolidays({
        generateMoroccoHolidays: formData.generateMoroccoHolidays,
        startYear: formData.startYear,
        endYear: formData.endYear,
      });

      setMessage({
        type: 'success',
        text: `✅ Génération réussie ! ${result.holidaysCreated} jour(s) férié(s) créé(s), ${result.holidaysSkipped} ignoré(s) (déjà existants).`,
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
    if (!confirm('⚠️ Êtes-vous sûr de vouloir supprimer TOUS les jours fériés ?')) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const result = await DataGeneratorHolidaysAPI.cleanHolidays();
      setMessage({
        type: 'success',
        text: `🗑️ ${result.deletedCount} jour(s) férié(s) supprimé(s).`,
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
          <h1 className="text-3xl font-bold">Générateur de Jours Fériés</h1>
          <p className="text-muted-foreground mt-2">
            Générez automatiquement les jours fériés du Maroc
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

            {Object.keys(stats.byYear).length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold mb-2">Par Année</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {Object.entries(stats.byYear).map(([year, count]) => (
                    <div key={year} className="border p-2 rounded text-sm">
                      <span className="font-medium">{year}:</span> {count} jour(s)
                    </div>
                  ))}
                </div>
              </div>
            )}

            {stats.holidays.length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold mb-2">Liste des Jours Fériés</h4>
                <div className="max-h-60 overflow-y-auto">
                  <div className="space-y-1">
                    {stats.holidays.map((holiday) => (
                      <div key={holiday.id} className="flex items-center justify-between border p-2 rounded text-sm">
                        <div>
                          <span className="font-medium">{holiday.name}</span>
                          <span className="text-muted-foreground ml-2">{holiday.date}</span>
                        </div>
                        {holiday.isRecurring && (
                          <span title="Récurrent">
                            <CheckCircle2 className="h-4 w-4 text-blue-600" />
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
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
            Génération de Jours Fériés
          </CardTitle>
          <CardDescription>
            Générez automatiquement les jours fériés du Maroc (fixes et islamiques)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="generateMoroccoHolidays"
              checked={formData.generateMoroccoHolidays}
              onChange={(e) =>
                setFormData({ ...formData, generateMoroccoHolidays: e.target.checked })
              }
              className="h-4 w-4"
            />
            <Label htmlFor="generateMoroccoHolidays" className="cursor-pointer">
              Générer les jours fériés du Maroc
            </Label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startYear">Année de début</Label>
              <Input
                id="startYear"
                type="number"
                min="2020"
                max="2100"
                value={formData.startYear}
                onChange={(e) =>
                  setFormData({ ...formData, startYear: parseInt(e.target.value) || currentYear })
                }
              />
            </div>
            <div>
              <Label htmlFor="endYear">Année de fin</Label>
              <Input
                id="endYear"
                type="number"
                min="2020"
                max="2100"
                value={formData.endYear}
                onChange={(e) =>
                  setFormData({ ...formData, endYear: parseInt(e.target.value) || currentYear + 2 })
                }
              />
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleGenerate}
              disabled={loading || formData.startYear > formData.endYear}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Génération en cours...
                </>
              ) : (
                'Générer les jours fériés'
              )}
            </Button>
            {stats && stats.totalHolidays > 0 && (
              <Button
                variant="danger"
                onClick={handleClean}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Suppression...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Supprimer tout
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

