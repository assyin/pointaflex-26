'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  useTeams,
  useTeam,
  useCreateTeam,
  useUpdateTeam,
  useDeleteTeam,
  useAddTeamMembersBulk,
  useRemoveTeamMembersBulk,
  useTeamStats,
} from '@/lib/hooks/useTeams';
import { useEmployees } from '@/lib/hooks/useEmployees';
import { AddMembersModal } from '@/components/teams/AddMembersModal';
import {
  Users, Plus, Search, Filter, Download, Edit, Trash2,
  RotateCw, UserPlus, UserMinus, Calendar, Clock,
  TrendingUp, UserCheck, Loader2, X
} from 'lucide-react';
import { toast } from 'sonner';

export default function TeamsPage() {
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [rotationFilter, setRotationFilter] = useState<string>('');
  const [editingTeam, setEditingTeam] = useState<any>(null);
  const [isMounted, setIsMounted] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    managerId: '',
    rotationEnabled: false,
    rotationCycleDays: 14,
  });

  // API hooks
  const { data: teamsResponse, isLoading: teamsLoading, refetch: refetchTeams } = useTeams({
    search: searchQuery || undefined,
    rotationEnabled: rotationFilter === 'active' ? true : rotationFilter === 'inactive' ? false : undefined,
  });
  
  const teams = teamsResponse?.data || [];
  const { data: selectedTeamData } = useTeam(selectedTeamId || '');
  const { data: teamStats } = useTeamStats(selectedTeamId || '');
  const { data: employeesData } = useEmployees();
  
  const employees = Array.isArray(employeesData) ? employeesData : [];
  
  // Mutations
  const createMutation = useCreateTeam();
  const updateMutation = useUpdateTeam();
  const deleteMutation = useDeleteTeam();
  const addMembersMutation = useAddTeamMembersBulk();
  const removeMembersMutation = useRemoveTeamMembersBulk();

  // Fix hydration error
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Mock data - à remplacer par des appels API
  const teamsOld = [
    {
      id: '1',
      name: 'Équipe A – Matin',
      code: 'A',
      members: 14,
      manager: 'Youssef Karim',
      rotation: 'Activée',
      rotationDays: 14,
      isActive: true,
    },
    {
      id: '2',
      name: 'Équipe B – Soir',
      code: 'B',
      members: 9,
      manager: 'Sara El Amrani',
      rotation: 'Désactivée',
      rotationDays: null,
      isActive: false,
    },
    {
      id: '3',
      name: 'Équipe C – Nuit',
      code: 'C',
      members: 7,
      manager: 'Amine L.',
      rotation: 'Activée',
      rotationDays: 7,
      isActive: true,
    },
  ];

  const teamMembers = [
    {
      id: '1',
      name: 'Yasmine Benali',
      matricule: '00421',
      site: 'Site Casablanca',
      shift: 'Matin',
      shiftTime: '08h00 – 16h00',
      photo: null,
    },
    {
      id: '2',
      name: 'Amine Laaroussi',
      matricule: '00317',
      site: 'Site Casablanca',
      shift: 'Nuit',
      shiftTime: '00h00 – 08h00',
      photo: null,
    },
    {
      id: '3',
      name: 'Rachid El Idrissi',
      matricule: '00203',
      site: 'Site Rabat',
      shift: 'Soir',
      shiftTime: '16h00 – 00h00',
      photo: null,
    },
    {
      id: '4',
      name: 'Omar Chami',
      matricule: '00158',
      site: 'Site Tanger',
      shift: 'Matin',
      shiftTime: '07h00 – 15h00',
      photo: null,
    },
  ];

  return (
    <DashboardLayout title="Équipes"  subtitle="Gestion des équipes">
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-text-primary mb-2">
                Gestion des équipes
              </h1>
              <p className="text-text-secondary">
                Créer, structurer et suivre les équipes, leurs membres et rotations
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="gap-2">
                <UserPlus className="w-4 h-4" />
                Assigner des employés
              </Button>
              <Button 
                className="gap-2"
                onClick={() => {
                  setEditingTeam(null);
                  setFormData({
                    name: '',
                    code: '',
                    description: '',
                    managerId: '',
                    rotationEnabled: false,
                    rotationCycleDays: 14,
                  });
                  setShowForm(true);
                }}
              >
                <Plus className="w-4 h-4" />
                Nouvelle équipe
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Section principale - Liste des équipes */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Équipes de travail
                </CardTitle>
                <p className="text-sm text-text-secondary mt-1">
                  Vue globale des équipes par site, rotation et responsable
                </p>
              </CardHeader>
              <CardContent>
                {/* Filtres */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div>
                    <Label>Recherche</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-secondary" />
                      <Input
                        placeholder="Nom ou code d'équipe (A, B, C...)"
                        className="pl-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Rotation</Label>
                    <select
                      value={rotationFilter}
                      onChange={(e) => setRotationFilter(e.target.value)}
                      className="w-full border border-border rounded-md px-3 py-2 text-sm"
                    >
                      <option value="">Toutes les équipes</option>
                      <option value="active">Rotation activée</option>
                      <option value="inactive">Rotation désactivée</option>
                    </select>
                  </div>
                  <div>
                    <Label>Nombre de membres</Label>
                    <select className="w-full border border-border rounded-md px-3 py-2 text-sm">
                      <option value="">Tout effectif</option>
                      <option value="small">&lt; 10 membres</option>
                      <option value="medium">10-20 membres</option>
                      <option value="large">&gt; 20 membres</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Filter className="w-4 h-4" />
                    Filtres avancés
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Download className="w-4 h-4" />
                    Exporter CSV
                  </Button>
                </div>

                {/* Tableau des équipes */}
                <div className="border border-border-light rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-background-hover">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-text-primary">Nom équipe</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-text-primary">Code</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-text-primary">Membres</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-text-primary">Responsable</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-text-primary">Rotation</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-text-primary">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-light">
                      {!isMounted || teamsLoading ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center">
                            {isMounted && <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />}
                            {!isMounted && <span className="text-text-secondary">Chargement...</span>}
                          </td>
                        </tr>
                      ) : teams.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-text-secondary">
                            Aucune équipe trouvée
                          </td>
                        </tr>
                      ) : (
                        teams.map((team: any) => (
                          <tr
                            key={team.id}
                            className={`hover:bg-background-hover cursor-pointer transition-colors ${
                              selectedTeamId === team.id ? 'bg-primary/5' : ''
                            }`}
                            onClick={() => setSelectedTeamId(team.id)}
                          >
                            <td className="px-4 py-3 text-sm text-text-primary font-medium">
                              {team.name}
                            </td>
                            <td className="px-4 py-3 text-sm text-text-secondary">
                              {team.code}
                            </td>
                            <td className="px-4 py-3 text-sm text-text-secondary">
                              {team._count?.employees || team.employees?.length || 0}
                            </td>
                            <td className="px-4 py-3 text-sm text-text-secondary">
                              {team.manager 
                                ? `${team.manager.firstName} ${team.manager.lastName}` 
                                : team.managerId 
                                ? 'Manager assigné' 
                                : '-'}
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant={team.rotationEnabled ? 'success' : 'default'}>
                                {team.rotationEnabled ? 'Activée' : 'Désactivée'}
                              </Badge>
                            </td>
                            <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center gap-2">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="gap-1"
                                  onClick={() => {
                                    setEditingTeam(team);
                                    setFormData({
                                      name: team.name,
                                      code: team.code,
                                      description: team.description || '',
                                      managerId: team.managerId || '',
                                      rotationEnabled: team.rotationEnabled || false,
                                      rotationCycleDays: team.rotationCycleDays || 14,
                                    });
                                    setShowForm(true);
                                  }}
                                >
                                  <Edit className="w-4 h-4" />
                                  Modifier
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="gap-1 text-danger hover:text-danger"
                                  onClick={async () => {
                                    if (confirm(`Êtes-vous sûr de vouloir supprimer l'équipe "${team.name}" ?`)) {
                                      await deleteMutation.mutateAsync(team.id);
                                      if (selectedTeamId === team.id) {
                                        setSelectedTeamId(null);
                                      }
                                    }
                                  }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Supprimer
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {teamsResponse?.meta && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-text-secondary">
                      Affichage de {((teamsResponse.meta.page - 1) * teamsResponse.meta.limit) + 1}-
                      {Math.min(teamsResponse.meta.page * teamsResponse.meta.limit, teamsResponse.meta.total)} sur {teamsResponse.meta.total} équipes
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-text-secondary">{teamsResponse.meta.limit} / page</span>
                      <Button 
                        variant="outline" 
                        size="sm"
                        disabled={teamsResponse.meta.page === 1}
                      >
                        Préc.
                      </Button>
                      <Button variant="outline" size="sm" className="bg-primary text-white">
                        {teamsResponse.meta.page}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        disabled={teamsResponse.meta.page >= teamsResponse.meta.totalPages}
                      >
                        Suiv.
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Section membres de l'équipe sélectionnée */}
            {selectedTeamData && (
              <Card className="mt-6">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Membres de l'équipe sélectionnée
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="gap-2"
                        onClick={() => setShowAddMembersModal(true)}
                      >
                        <UserPlus className="w-4 h-4" />
                        Assigner des employés
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-text-secondary mt-1">
                    Gérer les affectations, remplacements et retraits
                  </p>
                </CardHeader>
                <CardContent>
                  {selectedTeamData.employees && selectedTeamData.employees.length > 0 ? (
                    <div className="grid grid-cols-2 gap-4">
                      {selectedTeamData.employees.map((member: any) => (
                      <Card key={member.id} className="border-2 hover:border-primary transition-colors">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            {/* Photo */}
                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                              {member.firstName?.[0]}{member.lastName?.[0]}
                            </div>

                            {/* Info */}
                            <div className="flex-1">
                              <h4 className="font-semibold text-text-primary">
                                {member.firstName} {member.lastName}
                              </h4>
                              <p className="text-sm text-text-secondary">
                                Matricule: {member.matricule}
                                {member.position && ` • ${member.position}`}
                              </p>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 mt-4">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex-1 text-xs"
                              onClick={async () => {
                                if (confirm(`Retirer ${member.firstName} ${member.lastName} de l'équipe ?`)) {
                                  await removeMembersMutation.mutateAsync({
                                    teamId: selectedTeamId!,
                                    employeeIds: [member.id],
                                  });
                                }
                              }}
                            >
                              <UserMinus className="w-3 h-3 mr-1" />
                              Retirer
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-text-secondary">
                      Aucun membre dans cette équipe
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
            
            {/* Add Members Modal */}
            <AddMembersModal
              isOpen={showAddMembersModal}
              onClose={() => setShowAddMembersModal(false)}
              onAdd={async (employeeIds) => {
                await addMembersMutation.mutateAsync({
                  teamId: selectedTeamId!,
                  employeeIds,
                });
                setShowAddMembersModal(false);
              }}
              existingMemberIds={selectedTeamData?.employees?.map((e: any) => e.id) || []}
              isAdding={addMembersMutation.isPending}
            />
          </div>

          {/* Section Formulaire - En dessous de la liste */}
          {showForm && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  {editingTeam ? 'Modifier l\'équipe' : 'Nouvelle équipe'}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowForm(false);
                    setEditingTeam(null);
                    setFormData({
                      name: '',
                      code: '',
                      description: '',
                      managerId: '',
                      rotationEnabled: false,
                      rotationCycleDays: 14,
                    });
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-text-secondary mb-6">
                  {editingTeam ? 'Modifier les informations de l\'équipe' : 'Créer une nouvelle équipe de travail'}
                </p>

                <div className="space-y-4">
                  {/* Nom de l'équipe */}
                  <div>
                    <Label>Nom de l'équipe</Label>
                    <Input 
                      placeholder="Ex : Équipe Alpha" 
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  {/* Code */}
                  <div>
                    <Label>Code</Label>
                    <Input 
                      placeholder="A" 
                      maxLength={3}
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    />
                  </div>

                  {/* Responsable */}
                  <div>
                    <Label>Responsable d'équipe (optionnel)</Label>
                    <select
                      value={formData.managerId}
                      onChange={(e) => setFormData({ ...formData, managerId: e.target.value })}
                      className="w-full border border-border rounded-md px-3 py-2 text-sm"
                    >
                      <option value="">Sélectionner un employé</option>
                      {employees.map((emp: any) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.firstName} {emp.lastName} ({emp.matricule})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Description */}
                  <div>
                    <Label>Description</Label>
                    <textarea
                      className="w-full px-3 py-2 border border-border-light rounded-input text-sm resize-none"
                      rows={3}
                      placeholder="Ex : Équipe du shift matin pour le site Casablanca – Back-office."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>

                  {/* Rotation activée */}
                  <div className="flex items-center justify-between p-4 border border-border-light rounded-lg">
                    <div>
                      <p className="font-medium text-text-primary">Rotation activée</p>
                      <p className="text-sm text-text-secondary">
                        Cycle automatique entre équipes A/B/C selon les jours
                      </p>
                    </div>
                    <button
                      onClick={() => setFormData({ ...formData, rotationEnabled: !formData.rotationEnabled })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        formData.rotationEnabled ? 'bg-primary' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          formData.rotationEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Cycle de rotation */}
                  {formData.rotationEnabled && (
                    <div>
                      <Label>Cycle de rotation (jours)</Label>
                      <Input 
                        type="number" 
                        placeholder="14 jours" 
                        value={formData.rotationCycleDays}
                        onChange={(e) => setFormData({ ...formData, rotationCycleDays: parseInt(e.target.value) || 14 })}
                      />
                      <p className="text-xs text-text-secondary mt-1">
                        Options typiques : 7, 14, 21 ou 28 jours.
                      </p>
                    </div>
                  )}

                  {/* Membres de l'équipe */}
                  {editingTeam && selectedTeamData && (
                    <div>
                      <Label>Membres de l'équipe ({selectedTeamData.employees?.length || 0})</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {selectedTeamData.employees?.map((member: any) => (
                          <Badge key={member.id} variant="default" className="gap-1">
                            {member.firstName} {member.lastName} - {member.matricule}
                          </Badge>
                        ))}
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full mt-3 gap-2"
                        onClick={() => setShowAddMembersModal(true)}
                      >
                        <UserPlus className="w-4 h-4" />
                        Ajouter des employés...
                      </Button>
                    </div>
                  )}

                  {/* Boutons d'action */}
                  <div className="flex gap-3 pt-6 border-t border-border-light mt-6">
                    {editingTeam && (
                      <Button 
                        variant="outline" 
                        className="flex-1 text-danger"
                        onClick={async () => {
                          if (confirm(`Êtes-vous sûr de vouloir supprimer l'équipe "${editingTeam.name}" ?`)) {
                            await deleteMutation.mutateAsync(editingTeam.id);
                            setEditingTeam(null);
                            setShowForm(false);
                            setSelectedTeamId(null);
                          }
                        }}
                        disabled={deleteMutation.isPending}
                      >
                        {deleteMutation.isPending ? 'Suppression...' : 'Supprimer'}
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => {
                        setShowForm(false);
                        setEditingTeam(null);
                        setFormData({
                          name: '',
                          code: '',
                          description: '',
                          managerId: '',
                          rotationEnabled: false,
                          rotationCycleDays: 14,
                        });
                      }}
                    >
                      Annuler
                    </Button>
                    <Button 
                      className="flex-1"
                      onClick={async () => {
                        if (!formData.name || !formData.code) {
                          toast.error('Veuillez remplir le nom et le code de l\'équipe');
                          return;
                        }
                        
                        try {
                          if (editingTeam) {
                            await updateMutation.mutateAsync({
                              id: editingTeam.id,
                              data: formData,
                            });
                          } else {
                            await createMutation.mutateAsync({
                              ...formData,
                              code: formData.code.toUpperCase(),
                            });
                          }
                          setShowForm(false);
                          setEditingTeam(null);
                          setFormData({
                            name: '',
                            code: '',
                            description: '',
                            managerId: '',
                            rotationEnabled: false,
                            rotationCycleDays: 14,
                          });
                        } catch (error) {
                          // Error handled by mutation
                        }
                      }}
                      disabled={createMutation.isPending || updateMutation.isPending}
                    >
                      {createMutation.isPending || updateMutation.isPending
                        ? 'Enregistrement...'
                        : editingTeam
                        ? 'Modifier'
                        : 'Créer'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Section Statistiques - En dessous du formulaire ou à côté si équipe sélectionnée */}
          {selectedTeamData && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Statistiques équipe */}
              <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Statistiques équipe</CardTitle>
                  <Button variant="outline" size="sm">Stats</Button>
                </div>
                <p className="text-sm text-text-secondary mt-1">
                  Photo rapide de l'effectif et des shifts assignés
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Nombre total */}
                  {teamStats ? (
                    <>
                      <div className="flex items-center justify-between p-3 bg-background-hover rounded-lg">
                        <div>
                          <p className="text-sm text-text-secondary">Nombre total de membres</p>
                          <p className="text-2xl font-bold text-text-primary mt-1">
                            {teamStats.members.total}
                          </p>
                        </div>
                        <UserCheck className="w-8 h-8 text-primary" />
                      </div>

                      {/* Présence du jour */}
                      <div className="flex items-center justify-between p-3 bg-background-hover rounded-lg">
                        <div>
                          <p className="text-sm text-text-secondary">Présence du jour</p>
                          <p className="text-2xl font-bold text-text-primary mt-1">
                            {teamStats.members.presentToday} / {teamStats.members.total}
                          </p>
                          <p className="text-xs text-text-secondary mt-1">
                            {teamStats.members.absentToday} absent(s) ou en congé
                          </p>
                        </div>
                        <TrendingUp className="w-8 h-8 text-success" />
                      </div>

                      {/* Répartition des shifts */}
                      {teamStats.shiftDistribution && teamStats.shiftDistribution.length > 0 && (
                        <div>
                          <p className="text-sm text-text-secondary mb-2">Répartition des shifts assignés</p>
                          <div className="space-y-2">
                            {teamStats.shiftDistribution.map((shift: any) => (
                              <div key={shift.shiftId}>
                                <div className="flex items-center justify-between text-xs mb-1">
                                  <span>{shift.shiftName} - {shift.percentage}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div 
                                    className="bg-primary h-2 rounded-full" 
                                    style={{ width: `${shift.percentage}%` }}
                                  ></div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : selectedTeamId ? (
                    <div className="text-center py-4 text-text-secondary">
                      Chargement des statistiques...
                    </div>
                  ) : (
                    <div className="text-center py-4 text-text-secondary">
                      Sélectionnez une équipe pour voir les statistiques
                    </div>
                  )}

                  {/* Rotation et affectation */}
                  <div className="space-y-3 pt-3 border-t border-border-light">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-text-secondary">Rotation mise à jour</span>
                      <Button variant="outline" size="sm" className="text-xs">Détail</Button>
                    </div>
                    <p className="text-xs text-text-secondary">
                      Admin RH - 14/04/2024 - Cycle passé de 7 à 14 jours
                    </p>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-text-secondary">Affectation en masse</span>
                    </div>
                    <p className="text-xs text-text-secondary">
                      Manager - 10/04/2024 - 4 employés ajoutés à l'équipe
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
