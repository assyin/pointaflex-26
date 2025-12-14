'use client';

import { useState } from 'react';
import { DataGeneratorAllAPI, GenerationStats, CleanupResult } from '@/lib/api/data-generator-all';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Database, Trash2, Play, CheckCircle2, XCircle, AlertTriangle, Info, Building2, Users, Clock, Calendar, CalendarDays, Briefcase, Smartphone, RefreshCw, Bell, Settings, User, Copy, Eye, EyeOff } from 'lucide-react';

export default function DataGeneratorAllPage() {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<GenerationStats | null>(null);
  const [cleanupResult, setCleanupResult] = useState<CleanupResult | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState('structure');

  // Configuration complète - Valeurs par défaut pour hiérarchie Manager
  // Structure hiérarchique:
  // 1. Directeur de département: Gère tous les sites de son département depuis la direction (ex: Casablanca)
  //    - Voit tous les employés de son département dans tous les sites
  // 2. Manager régional: Gère uniquement les employés de son département dans son site spécifique
  //    - Un site peut avoir plusieurs employés de différents départements
  //    - Un département peut être dans plusieurs sites
  //    - Un site peut avoir un seul Manager Régional par département (limitation du schéma actuel)
  //
  // Exemple avec 2 départements et 3 sites:
  // - 2 directeurs (1 par département)
  // - 3 managers régionaux (1 par site, idéalement 1 par département par site = 6, mais limité à 1/site)
  // - Total: 2 + 3 = 5 managers (ou idéalement 2 + 6 = 8 si le schéma permettait plusieurs managers/site)
  const [config, setConfig] = useState({
    structure: {
      sitesCount: 3, // 3 sites (Casablanca, Rabat, Marrakech)
      departmentsCount: 2, // 2 départements (Transport de fonds "CIT", RH)
      positionsCount: 6, // Plus de positions pour variété
      teamsCount: 3, // 3 équipes pour mieux répartir
      assignManagers: true, // Active la hiérarchie: 1 directeur/département + 1 manager régional/département/site
    },
    rbac: {
      usersPerRole: {
        SUPER_ADMIN: 1,
        ADMIN_RH: 1,
        MANAGER: 8, // 2 directeurs + 6 managers régionaux (1 par département par site = 2*3)
        EMPLOYEE: 36, // 6 employés par département par site (2 départements * 3 sites * 6 = 36)
      },
    },
    employees: {
      count: 36, // 6 employés par département par site pour un bon scénario de test
      linkToUsers: true,
      assignToStructures: true,
      dataOptions: {
        generateRealisticNames: true,
        generateEmails: true,
        generatePhones: true,
        generateAddresses: true,
      },
    },
    shifts: {
      createDefault: true,
      assignToEmployees: true,
    },
    holidays: {
      generateMoroccoHolidays: true,
      startYear: 2024,
      endYear: 2025,
    },
    schedules: {
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      coverage: 100,
      excludeHolidays: true,
      excludeWeekends: true,
    },
    leaves: {
      percentage: 35, // Plus de congés pour tester les approbations par managers
      averageDaysPerEmployee: 4, // Légèrement plus pour tester
      workflow: {
        autoApprove: false,
        approvalDistribution: {
          PENDING: 25, // Plus de pending pour tester les workflows managers
          MANAGER_APPROVED: 35,
          APPROVED: 40,
          REJECTED: 0,
        },
      },
    },
    attendance: {
      startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 semaines de données
      endDate: new Date().toISOString().split('T')[0],
      distribution: {
        normal: 70,
        late: 15,
        earlyLeave: 5,
        anomalies: 5,
        mission: 3,
        absence: 2,
      },
      excludeHolidays: true,
      excludeWeekends: true,
      generateOvertime: true,
    },
    overtime: {
      count: 8, // Plus d'overtime pour tester les approbations
      averageHours: 2.5,
      statusDistribution: {
        PENDING: 30,
        APPROVED: 60,
        REJECTED: 10,
      },
    },
    recovery: {
      count: 5, // Plus de recovery pour tester
      convertFromOvertime: true,
      conversionRate: 25,
    },
    devices: {
      perSite: 2, // 2 terminaux par site pour plus de réalisme
    },
    replacements: {
      count: 6, // Plus de remplacements pour tester
      statusDistribution: {
        PENDING: 25,
        APPROVED: 65,
        REJECTED: 10,
      },
    },
    notifications: {
      count: 15, // Plus de notifications pour tester
    },
    options: {
      markAsGenerated: true,
      useTransactions: true,
      stopOnError: false,
    },
  });

  const handleGenerate = async () => {
    setLoading(true);
    setMessage(null);
    setStats(null);

    try {
      const result = await DataGeneratorAllAPI.generateAll(config);
      setStats(result);
      setMessage({
        type: 'success',
        text: `Génération terminée avec succès ! ${result.totalEntities} entités créées en ${result.duration}s`,
      });
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || 'Erreur lors de la génération';
      setMessage({
        type: 'error',
        text: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCleanup = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer toutes les données générées ? Cette action est irréversible.')) {
      return;
    }

    setLoading(true);
    setMessage(null);
    setCleanupResult(null);

    try {
      const result = await DataGeneratorAllAPI.cleanupAll();
      setCleanupResult(result);
      setMessage({
        type: 'success',
        text: `Nettoyage terminé : ${result.total} entités supprimées`,
      });
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || 'Erreur lors du nettoyage';
      setMessage({
        type: 'error',
        text: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Générateur de Données Complet</h1>
          <p className="text-gray-600 mt-2">Générer toutes les données du système en une seule fois</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="destructive"
            onClick={handleCleanup}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Nettoyage...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Nettoyer tout
              </>
            )}
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={loading}
            className="min-w-[150px]"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Génération...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Générer tout
              </>
            )}
          </Button>
        </div>
      </div>

      {message && (
        <Alert variant={message.type === 'error' ? 'danger' : message.type === 'success' ? 'success' : 'info'}>
          {message.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="structure">
            <Building2 className="mr-2 h-4 w-4" />
            Structure
          </TabsTrigger>
          <TabsTrigger value="horaires">
            <Clock className="mr-2 h-4 w-4" />
            Horaires
          </TabsTrigger>
          <TabsTrigger value="absences">
            <CalendarDays className="mr-2 h-4 w-4" />
            Absences
          </TabsTrigger>
          <TabsTrigger value="pointages">
            <Calendar className="mr-2 h-4 w-4" />
            Pointages
          </TabsTrigger>
          <TabsTrigger value="equipements">
            <Smartphone className="mr-2 h-4 w-4" />
            Équipements
          </TabsTrigger>
          <TabsTrigger value="options">
            <Settings className="mr-2 h-4 w-4" />
            Options
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Structure & Organisation */}
        <TabsContent value="structure" className="space-y-6">
          {/* Information sur la hiérarchie Manager */}
          <Alert variant="info">
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="font-semibold mb-2">Hiérarchie Manager générée :</div>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li><strong>Directeur de département</strong> : Gère tous les sites de son département depuis la direction (ex: Casablanca). Voit tous les employés de son département dans tous les sites.</li>
                <li><strong>Manager régional</strong> : Gère uniquement les employés de son département dans son site spécifique. Un site peut avoir plusieurs managers régionaux (un par département présent dans le site).</li>
                <li><strong>Structure</strong> : Avec {config.structure.departmentsCount} départements et {config.structure.sitesCount} sites, vous aurez {config.structure.departmentsCount} directeurs + {config.structure.departmentsCount * config.structure.sitesCount} managers régionaux = {config.structure.departmentsCount + (config.structure.departmentsCount * config.structure.sitesCount)} managers au total.</li>
                <li><strong>Employés</strong> : {config.employees.count} employés répartis entre les départements et sites ({Math.round(config.employees.count / (config.structure.departmentsCount * config.structure.sitesCount))} par département par site en moyenne).</li>
                <li><strong>✅ Nouveau système</strong> : Le système supporte maintenant plusieurs managers par site (un par département). Chaque manager régional voit uniquement les employés de son département dans son site.</li>
              </ul>
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Structure Organisationnelle</CardTitle>
                <CardDescription>Sites, Départements, Positions, Équipes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Sites</Label>
                    <Input
                      type="number"
                      value={config.structure.sitesCount}
                      onChange={(e) => setConfig({
                        ...config,
                        structure: { ...config.structure, sitesCount: parseInt(e.target.value) || 0 },
                      })}
                    />
                  </div>
                  <div>
                    <Label>Départements</Label>
                    <Input
                      type="number"
                      value={config.structure.departmentsCount}
                      onChange={(e) => setConfig({
                        ...config,
                        structure: { ...config.structure, departmentsCount: parseInt(e.target.value) || 0 },
                      })}
                    />
                  </div>
                  <div>
                    <Label>Positions</Label>
                    <Input
                      type="number"
                      value={config.structure.positionsCount}
                      onChange={(e) => setConfig({
                        ...config,
                        structure: { ...config.structure, positionsCount: parseInt(e.target.value) || 0 },
                      })}
                    />
                  </div>
                  <div>
                    <Label>Équipes</Label>
                    <Input
                      type="number"
                      value={config.structure.teamsCount}
                      onChange={(e) => setConfig({
                        ...config,
                        structure: { ...config.structure, teamsCount: parseInt(e.target.value) || 0 },
                      })}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={config.structure.assignManagers}
                    onChange={(e) => setConfig({
                      ...config,
                      structure: { ...config.structure, assignManagers: e.target.checked },
                    })}
                    className="rounded"
                  />
                  <Label>Assigner des managers</Label>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>RBAC - Utilisateurs</CardTitle>
                <CardDescription>Répartition par rôle</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>SUPER_ADMIN</Label>
                    <Input
                      type="number"
                      value={config.rbac.usersPerRole.SUPER_ADMIN}
                      onChange={(e) => setConfig({
                        ...config,
                        rbac: {
                          ...config.rbac,
                          usersPerRole: {
                            ...config.rbac.usersPerRole,
                            SUPER_ADMIN: parseInt(e.target.value) || 0,
                          },
                        },
                      })}
                    />
                  </div>
                  <div>
                    <Label>ADMIN_RH</Label>
                    <Input
                      type="number"
                      value={config.rbac.usersPerRole.ADMIN_RH}
                      onChange={(e) => setConfig({
                        ...config,
                        rbac: {
                          ...config.rbac,
                          usersPerRole: {
                            ...config.rbac.usersPerRole,
                            ADMIN_RH: parseInt(e.target.value) || 0,
                          },
                        },
                      })}
                    />
                  </div>
                  <div>
                    <Label>MANAGER</Label>
                    <Input
                      type="number"
                      value={config.rbac.usersPerRole.MANAGER}
                      onChange={(e) => setConfig({
                        ...config,
                        rbac: {
                          ...config.rbac,
                          usersPerRole: {
                            ...config.rbac.usersPerRole,
                            MANAGER: parseInt(e.target.value) || 0,
                          },
                        },
                      })}
                    />
                  </div>
                  <div>
                    <Label>EMPLOYEE</Label>
                    <Input
                      type="number"
                      value={config.rbac.usersPerRole.EMPLOYEE}
                      onChange={(e) => setConfig({
                        ...config,
                        rbac: {
                          ...config.rbac,
                          usersPerRole: {
                            ...config.rbac.usersPerRole,
                            EMPLOYEE: parseInt(e.target.value) || 0,
                          },
                        },
                      })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Employés</CardTitle>
                <CardDescription>Nombre et options de génération</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Nombre d'employés</Label>
                    <Input
                      type="number"
                      value={config.employees.count}
                      onChange={(e) => setConfig({
                        ...config,
                        employees: { ...config.employees, count: parseInt(e.target.value) || 0 },
                      })}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={config.employees.linkToUsers}
                      onChange={(e) => setConfig({
                        ...config,
                        employees: { ...config.employees, linkToUsers: e.target.checked },
                      })}
                      className="rounded"
                    />
                    <Label>Lier aux utilisateurs RBAC</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={config.employees.assignToStructures}
                      onChange={(e) => setConfig({
                        ...config,
                        employees: { ...config.employees, assignToStructures: e.target.checked },
                      })}
                      className="rounded"
                    />
                    <Label>Assigner aux structures</Label>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 2: Horaires & Planning */}
        <TabsContent value="horaires" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Shifts (Horaires)</CardTitle>
                <CardDescription>Créer et assigner les horaires</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={config.shifts.createDefault}
                    onChange={(e) => setConfig({
                      ...config,
                      shifts: { ...config.shifts, createDefault: e.target.checked },
                    })}
                    className="rounded"
                  />
                  <Label>Créer shifts par défaut (Matin, Soir, Nuit)</Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={config.shifts.assignToEmployees}
                    onChange={(e) => setConfig({
                      ...config,
                      shifts: { ...config.shifts, assignToEmployees: e.target.checked },
                    })}
                    className="rounded"
                  />
                  <Label>Assigner aux employés</Label>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Jours Fériés</CardTitle>
                <CardDescription>Générer les jours fériés</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={config.holidays.generateMoroccoHolidays}
                    onChange={(e) => setConfig({
                      ...config,
                      holidays: { ...config.holidays, generateMoroccoHolidays: e.target.checked },
                    })}
                    className="rounded"
                  />
                  <Label>Générer jours fériés marocains</Label>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Année de début</Label>
                    <Input
                      type="number"
                      value={config.holidays.startYear}
                      onChange={(e) => setConfig({
                        ...config,
                        holidays: { ...config.holidays, startYear: parseInt(e.target.value) || new Date().getFullYear() },
                      })}
                    />
                  </div>
                  <div>
                    <Label>Année de fin</Label>
                    <Input
                      type="number"
                      value={config.holidays.endYear}
                      onChange={(e) => setConfig({
                        ...config,
                        holidays: { ...config.holidays, endYear: parseInt(e.target.value) || new Date().getFullYear() + 1 },
                      })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Plannings (Schedules)</CardTitle>
                <CardDescription>Générer les plannings pour les employés</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Date de début</Label>
                    <Input
                      type="date"
                      value={config.schedules.startDate}
                      onChange={(e) => setConfig({
                        ...config,
                        schedules: { ...config.schedules, startDate: e.target.value },
                      })}
                    />
                  </div>
                  <div>
                    <Label>Date de fin</Label>
                    <Input
                      type="date"
                      value={config.schedules.endDate}
                      onChange={(e) => setConfig({
                        ...config,
                        schedules: { ...config.schedules, endDate: e.target.value },
                      })}
                    />
                  </div>
                  <div>
                    <Label>Couverture (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={config.schedules.coverage}
                      onChange={(e) => setConfig({
                        ...config,
                        schedules: { ...config.schedules, coverage: parseInt(e.target.value) || 100 },
                      })}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={config.schedules.excludeHolidays}
                      onChange={(e) => setConfig({
                        ...config,
                        schedules: { ...config.schedules, excludeHolidays: e.target.checked },
                      })}
                      className="rounded"
                    />
                    <Label>Exclure jours fériés</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={config.schedules.excludeWeekends}
                      onChange={(e) => setConfig({
                        ...config,
                        schedules: { ...config.schedules, excludeWeekends: e.target.checked },
                      })}
                      className="rounded"
                    />
                    <Label>Exclure weekends</Label>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 3: Absences & Congés */}
        <TabsContent value="absences" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Congés (Leaves)</CardTitle>
              <CardDescription>Générer les types de congés et les demandes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Pourcentage d'employés avec congés</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={config.leaves.percentage}
                    onChange={(e) => setConfig({
                      ...config,
                      leaves: { ...config.leaves, percentage: parseInt(e.target.value) || 0 },
                    })}
                  />
                </div>
                <div>
                  <Label>Nombre moyen de jours par employé</Label>
                  <Input
                    type="number"
                    min="1"
                    value={config.leaves.averageDaysPerEmployee}
                    onChange={(e) => setConfig({
                      ...config,
                      leaves: { ...config.leaves, averageDaysPerEmployee: parseInt(e.target.value) || 5 },
                    })}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.leaves.workflow.autoApprove}
                  onChange={(e) => setConfig({
                    ...config,
                    leaves: {
                      ...config.leaves,
                      workflow: { ...config.leaves.workflow, autoApprove: e.target.checked },
                    },
                  })}
                  className="rounded"
                />
                <Label>Approbation automatique</Label>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label>PENDING (%)</Label>
                  <Input
                    type="number"
                    value={config.leaves.workflow.approvalDistribution.PENDING}
                    onChange={(e) => setConfig({
                      ...config,
                      leaves: {
                        ...config.leaves,
                        workflow: {
                          ...config.leaves.workflow,
                          approvalDistribution: {
                            ...config.leaves.workflow.approvalDistribution,
                            PENDING: parseInt(e.target.value) || 0,
                          },
                        },
                      },
                    })}
                  />
                </div>
                <div>
                  <Label>MANAGER_APPROVED (%)</Label>
                  <Input
                    type="number"
                    value={config.leaves.workflow.approvalDistribution.MANAGER_APPROVED}
                    onChange={(e) => setConfig({
                      ...config,
                      leaves: {
                        ...config.leaves,
                        workflow: {
                          ...config.leaves.workflow,
                          approvalDistribution: {
                            ...config.leaves.workflow.approvalDistribution,
                            MANAGER_APPROVED: parseInt(e.target.value) || 0,
                          },
                        },
                      },
                    })}
                  />
                </div>
                <div>
                  <Label>APPROVED (%)</Label>
                  <Input
                    type="number"
                    value={config.leaves.workflow.approvalDistribution.APPROVED}
                    onChange={(e) => setConfig({
                      ...config,
                      leaves: {
                        ...config.leaves,
                        workflow: {
                          ...config.leaves.workflow,
                          approvalDistribution: {
                            ...config.leaves.workflow.approvalDistribution,
                            APPROVED: parseInt(e.target.value) || 0,
                          },
                        },
                      },
                    })}
                  />
                </div>
                <div>
                  <Label>REJECTED (%)</Label>
                  <Input
                    type="number"
                    value={config.leaves.workflow.approvalDistribution.REJECTED}
                    onChange={(e) => setConfig({
                      ...config,
                      leaves: {
                        ...config.leaves,
                        workflow: {
                          ...config.leaves.workflow,
                          approvalDistribution: {
                            ...config.leaves.workflow.approvalDistribution,
                            REJECTED: parseInt(e.target.value) || 0,
                          },
                        },
                      },
                    })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Pointages & Temps */}
        <TabsContent value="pointages" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Pointages</CardTitle>
                <CardDescription>Générer les pointages quotidiens</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Date de début</Label>
                    <Input
                      type="date"
                      value={config.attendance.startDate}
                      onChange={(e) => setConfig({
                        ...config,
                        attendance: { ...config.attendance, startDate: e.target.value },
                      })}
                    />
                  </div>
                  <div>
                    <Label>Date de fin</Label>
                    <Input
                      type="date"
                      value={config.attendance.endDate}
                      onChange={(e) => setConfig({
                        ...config,
                        attendance: { ...config.attendance, endDate: e.target.value },
                      })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs">Normal (%)</Label>
                    <Input
                      type="number"
                      value={config.attendance.distribution.normal}
                      onChange={(e) => setConfig({
                        ...config,
                        attendance: {
                          ...config.attendance,
                          distribution: {
                            ...config.attendance.distribution,
                            normal: parseInt(e.target.value) || 0,
                          },
                        },
                      })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Retard (%)</Label>
                    <Input
                      type="number"
                      value={config.attendance.distribution.late}
                      onChange={(e) => setConfig({
                        ...config,
                        attendance: {
                          ...config.attendance,
                          distribution: {
                            ...config.attendance.distribution,
                            late: parseInt(e.target.value) || 0,
                          },
                        },
                      })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Départ anticipé (%)</Label>
                    <Input
                      type="number"
                      value={config.attendance.distribution.earlyLeave}
                      onChange={(e) => setConfig({
                        ...config,
                        attendance: {
                          ...config.attendance,
                          distribution: {
                            ...config.attendance.distribution,
                            earlyLeave: parseInt(e.target.value) || 0,
                          },
                        },
                      })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Anomalies (%)</Label>
                    <Input
                      type="number"
                      value={config.attendance.distribution.anomalies}
                      onChange={(e) => setConfig({
                        ...config,
                        attendance: {
                          ...config.attendance,
                          distribution: {
                            ...config.attendance.distribution,
                            anomalies: parseInt(e.target.value) || 0,
                          },
                        },
                      })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Mission (%)</Label>
                    <Input
                      type="number"
                      value={config.attendance.distribution.mission}
                      onChange={(e) => setConfig({
                        ...config,
                        attendance: {
                          ...config.attendance,
                          distribution: {
                            ...config.attendance.distribution,
                            mission: parseInt(e.target.value) || 0,
                          },
                        },
                      })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Absence (%)</Label>
                    <Input
                      type="number"
                      value={config.attendance.distribution.absence}
                      onChange={(e) => setConfig({
                        ...config,
                        attendance: {
                          ...config.attendance,
                          distribution: {
                            ...config.attendance.distribution,
                            absence: parseInt(e.target.value) || 0,
                          },
                        },
                      })}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={config.attendance.excludeHolidays}
                      onChange={(e) => setConfig({
                        ...config,
                        attendance: { ...config.attendance, excludeHolidays: e.target.checked },
                      })}
                      className="rounded"
                    />
                    <Label>Exclure jours fériés</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={config.attendance.excludeWeekends}
                      onChange={(e) => setConfig({
                        ...config,
                        attendance: { ...config.attendance, excludeWeekends: e.target.checked },
                      })}
                      className="rounded"
                    />
                    <Label>Exclure weekends</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={config.attendance.generateOvertime}
                      onChange={(e) => setConfig({
                        ...config,
                        attendance: { ...config.attendance, generateOvertime: e.target.checked },
                      })}
                      className="rounded"
                    />
                    <Label>Générer heures sup (via pointages)</Label>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Heures Supplémentaires (Directes)</CardTitle>
                <CardDescription>Générer des heures sup indépendantes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Nombre d'overtime</Label>
                  <Input
                    type="number"
                    value={config.overtime.count}
                    onChange={(e) => setConfig({
                      ...config,
                      overtime: { ...config.overtime, count: parseInt(e.target.value) || 0 },
                    })}
                  />
                </div>
                <div>
                  <Label>Nombre moyen d'heures</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={config.overtime.averageHours}
                    onChange={(e) => setConfig({
                      ...config,
                      overtime: { ...config.overtime, averageHours: parseFloat(e.target.value) || 2 },
                    })}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs">PENDING (%)</Label>
                    <Input
                      type="number"
                      value={config.overtime.statusDistribution.PENDING}
                      onChange={(e) => setConfig({
                        ...config,
                        overtime: {
                          ...config.overtime,
                          statusDistribution: {
                            ...config.overtime.statusDistribution,
                            PENDING: parseInt(e.target.value) || 0,
                          },
                        },
                      })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">APPROVED (%)</Label>
                    <Input
                      type="number"
                      value={config.overtime.statusDistribution.APPROVED}
                      onChange={(e) => setConfig({
                        ...config,
                        overtime: {
                          ...config.overtime,
                          statusDistribution: {
                            ...config.overtime.statusDistribution,
                            APPROVED: parseInt(e.target.value) || 0,
                          },
                        },
                      })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">REJECTED (%)</Label>
                    <Input
                      type="number"
                      value={config.overtime.statusDistribution.REJECTED}
                      onChange={(e) => setConfig({
                        ...config,
                        overtime: {
                          ...config.overtime,
                          statusDistribution: {
                            ...config.overtime.statusDistribution,
                            REJECTED: parseInt(e.target.value) || 0,
                          },
                        },
                      })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Récupération</CardTitle>
                <CardDescription>Générer des heures de récupération</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Nombre de recovery</Label>
                  <Input
                    type="number"
                    value={config.recovery.count}
                    onChange={(e) => setConfig({
                      ...config,
                      recovery: { ...config.recovery, count: parseInt(e.target.value) || 0 },
                    })}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={config.recovery.convertFromOvertime}
                    onChange={(e) => setConfig({
                      ...config,
                      recovery: { ...config.recovery, convertFromOvertime: e.target.checked },
                    })}
                    className="rounded"
                  />
                  <Label>Convertir depuis overtime</Label>
                </div>
                {config.recovery.convertFromOvertime && (
                  <div>
                    <Label>Taux de conversion (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={config.recovery.conversionRate}
                      onChange={(e) => setConfig({
                        ...config,
                        recovery: { ...config.recovery, conversionRate: parseInt(e.target.value) || 20 },
                      })}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 5: Équipements & Autres */}
        <TabsContent value="equipements" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Terminaux (Devices)</CardTitle>
                <CardDescription>Générer les terminaux biométriques</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Nombre par site</Label>
                  <Input
                    type="number"
                    value={config.devices.perSite}
                    onChange={(e) => setConfig({
                      ...config,
                      devices: { ...config.devices, perSite: parseInt(e.target.value) || 0 },
                    })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Remplacements</CardTitle>
                <CardDescription>Générer des remplacements de shift</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Nombre de remplacements</Label>
                  <Input
                    type="number"
                    value={config.replacements.count}
                    onChange={(e) => setConfig({
                      ...config,
                      replacements: { ...config.replacements, count: parseInt(e.target.value) || 0 },
                    })}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs">PENDING (%)</Label>
                    <Input
                      type="number"
                      value={config.replacements.statusDistribution.PENDING}
                      onChange={(e) => setConfig({
                        ...config,
                        replacements: {
                          ...config.replacements,
                          statusDistribution: {
                            ...config.replacements.statusDistribution,
                            PENDING: parseInt(e.target.value) || 0,
                          },
                        },
                      })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">APPROVED (%)</Label>
                    <Input
                      type="number"
                      value={config.replacements.statusDistribution.APPROVED}
                      onChange={(e) => setConfig({
                        ...config,
                        replacements: {
                          ...config.replacements,
                          statusDistribution: {
                            ...config.replacements.statusDistribution,
                            APPROVED: parseInt(e.target.value) || 0,
                          },
                        },
                      })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">REJECTED (%)</Label>
                    <Input
                      type="number"
                      value={config.replacements.statusDistribution.REJECTED}
                      onChange={(e) => setConfig({
                        ...config,
                        replacements: {
                          ...config.replacements,
                          statusDistribution: {
                            ...config.replacements.statusDistribution,
                            REJECTED: parseInt(e.target.value) || 0,
                          },
                        },
                      })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>Générer des notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Nombre de notifications</Label>
                  <Input
                    type="number"
                    value={config.notifications.count}
                    onChange={(e) => setConfig({
                      ...config,
                      notifications: { ...config.notifications, count: parseInt(e.target.value) || 0 },
                    })}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 6: Options Globales */}
        <TabsContent value="options" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Options Globales</CardTitle>
              <CardDescription>Configuration générale de la génération</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.options.markAsGenerated}
                  onChange={(e) => setConfig({
                    ...config,
                    options: { ...config.options, markAsGenerated: e.target.checked },
                  })}
                  className="rounded"
                />
                <Label>Marquer toutes les données comme générées</Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.options.useTransactions}
                  onChange={(e) => setConfig({
                    ...config,
                    options: { ...config.options, useTransactions: e.target.checked },
                  })}
                  className="rounded"
                />
                <Label>Utiliser des transactions (cohérence garantie)</Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.options.stopOnError}
                  onChange={(e) => setConfig({
                    ...config,
                    options: { ...config.options, stopOnError: e.target.checked },
                  })}
                  className="rounded"
                />
                <Label>Arrêter en cas d'erreur (sinon continue)</Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Statistiques */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle>Résultats de la Génération</CardTitle>
            <CardDescription>Statistiques détaillées</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{stats.totalEntities}</div>
                <div className="text-sm text-gray-600">Entités créées</div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{stats.duration}s</div>
                <div className="text-sm text-gray-600">Durée</div>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{stats.steps.filter(s => s.status === 'completed').length}</div>
                <div className="text-sm text-gray-600">Étapes complétées</div>
              </div>
            </div>

            {Object.keys(stats.entitiesByType).length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Par type d'entité</h3>
                <div className="grid grid-cols-4 gap-2">
                  {Object.entries(stats.entitiesByType).map(([type, count]) => (
                    <div key={type} className="p-2 bg-gray-50 rounded text-sm">
                      <span className="font-medium">{type}:</span> {count}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {stats.errors.length > 0 && (
              <Alert variant="danger">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-semibold mb-2">{stats.errors.length} erreur(s)</div>
                  {stats.errors.map((error, idx) => (
                    <div key={idx} className="text-sm">
                      <strong>{error.step}:</strong> {error.error}
                    </div>
                  ))}
                </AlertDescription>
              </Alert>
            )}

            {stats.warnings.length > 0 && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-semibold mb-2">{stats.warnings.length} avertissement(s)</div>
                  {stats.warnings.map((warning, idx) => (
                    <div key={idx} className="text-sm">
                      <strong>{warning.step}:</strong> {warning.warning}
                    </div>
                  ))}
                </AlertDescription>
              </Alert>
            )}

            {/* Comptes Utilisateurs Créés */}
            {stats.createdUsers && stats.createdUsers.length > 0 && (
              <div className="border-t pt-4 mt-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <User className="h-5 w-5 text-primary" />
                      Comptes Utilisateurs Créés ({stats.createdUsers.length})
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Voici les identifiants des utilisateurs générés. Copiez-les pour vous connecter.
                    </p>
                  </div>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div className="text-sm text-yellow-800">
                      <strong>Important :</strong> Ces identifiants ne seront affichés qu'une seule fois. 
                      Assurez-vous de les copier avant de fermer cette page.
                    </div>
                  </div>
                </div>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {stats.createdUsers.map((user, idx) => (
                    <UserCredentialsCard key={idx} user={user} />
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="font-semibold mb-2">Détail des étapes</h3>
              <div className="space-y-2">
                {stats.steps.map((step, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm">{step.name}</span>
                    <div className="flex items-center gap-2">
                      {step.status === 'completed' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                      {step.status === 'failed' && <XCircle className="h-4 w-4 text-red-600" />}
                      {step.status === 'running' && <Loader2 className="h-4 w-4 animate-spin" />}
                      {step.duration && <span className="text-xs text-gray-500">{step.duration}s</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Résultat du nettoyage */}
      {cleanupResult && (
        <Card>
          <CardHeader>
            <CardTitle>Résultat du Nettoyage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{cleanupResult.total}</div>
              <div className="text-sm text-gray-600">Entités supprimées</div>
            </div>
            {Object.keys(cleanupResult.deleted).length > 0 && (
              <div className="mt-4">
                <h3 className="font-semibold mb-2">Détail par type</h3>
                <div className="grid grid-cols-4 gap-2">
                  {Object.entries(cleanupResult.deleted).map(([type, count]) => (
                    <div key={type} className="p-2 bg-gray-50 rounded text-sm">
                      <span className="font-medium">{type}:</span> {count}
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

// Composant pour afficher les identifiants d'un utilisateur
function UserCredentialsCard({ user }: { user: { email: string; password: string; role: string; firstName?: string; lastName?: string } }) {
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyCredentials = () => {
    const credentials = `Email: ${user.email}\nMot de passe: ${user.password}`;
    copyToClipboard(credentials);
  };

  return (
    <Card className="border-l-4 border-l-primary">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <User className="h-4 w-4 text-gray-500" />
              <span className="font-semibold text-gray-900">
                {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email}
              </span>
              <Badge variant="outline" className="ml-2">
                {user.role}
              </Badge>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 w-20">Email:</span>
                <code className="flex-1 px-2 py-1 bg-gray-100 rounded text-sm font-mono">{user.email}</code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(user.email)}
                  className="h-8 w-8 p-0"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 w-20">Mot de passe:</span>
                <code className="flex-1 px-2 py-1 bg-gray-100 rounded text-sm font-mono">
                  {showPassword ? user.password : '••••••••'}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPassword(!showPassword)}
                  className="h-8 w-8 p-0"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(user.password)}
                  className="h-8 w-8 p-0"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={copyCredentials}
            className="ml-4"
          >
            {copied ? (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
                Copié
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copier tout
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

