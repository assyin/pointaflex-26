'use client';

import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Clock,
  CheckCircle,
  XCircle,
  Search,
  RefreshCw,
  Calendar,
  Undo2,
  RotateCcw,
} from 'lucide-react';
import {
  useSupplementaryDays,
  useApproveSupplementaryDay,
  useRejectSupplementaryDay,
  useConvertSupplementaryDayToRecovery,
  useRevokeSupplementaryDayApproval,
  useRevokeSupplementaryDayRejection,
  useDeleteSupplementaryDay,
} from '@/lib/hooks/useSupplementaryDays';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { SupplementaryDaysConversionModal } from './SupplementaryDaysConversionModal';

interface SupplementaryDaysTabProps {
  startDate: string;
  endDate: string;
}

export function SupplementaryDaysTab({ startDate, endDate }: SupplementaryDaysTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');

  // Dialogs state
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [revokeApprovalDialogOpen, setRevokeApprovalDialogOpen] = useState(false);
  const [revokeRejectionDialogOpen, setRevokeRejectionDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionReason, setActionReason] = useState('');
  const [approvedHours, setApprovedHours] = useState('');

  // Conversion modal state
  const [conversionModalOpen, setConversionModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<{ id: string; name: string } | null>(null);

  // Hooks
  const { data: supplementaryDaysData, isLoading, refetch } = useSupplementaryDays({
    startDate,
    endDate,
    status: selectedStatus !== 'all' ? selectedStatus as any : undefined,
    type: selectedType !== 'all' ? selectedType as any : undefined,
  });

  const approveMutation = useApproveSupplementaryDay();
  const rejectMutation = useRejectSupplementaryDay();
  const convertMutation = useConvertSupplementaryDayToRecovery();
  const revokeApprovalMutation = useRevokeSupplementaryDayApproval();
  const revokeRejectionMutation = useRevokeSupplementaryDayRejection();
  const deleteMutation = useDeleteSupplementaryDay();

  // Filtered records
  const filteredRecords = useMemo(() => {
    let records = supplementaryDaysData?.data || [];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      records = records.filter((record: any) => {
        const firstName = record.employee?.firstName?.toLowerCase() || '';
        const lastName = record.employee?.lastName?.toLowerCase() || '';
        const matricule = record.employee?.matricule?.toLowerCase() || '';
        return firstName.includes(query) || lastName.includes(query) || matricule.includes(query);
      });
    }

    return records;
  }, [supplementaryDaysData?.data, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    const records = supplementaryDaysData?.data || [];
    const totalHours = records.reduce((sum: number, r: any) => sum + Number(r.hours || 0), 0);
    const pending = records.filter((r: any) => r.status === 'PENDING').length;
    const approved = records.filter((r: any) => r.status === 'APPROVED').length;
    const recovered = records.filter((r: any) => r.status === 'RECOVERED').length;
    return { totalHours, pending, approved, recovered, total: records.length };
  }, [supplementaryDaysData?.data]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="warning" className="flex items-center gap-1"><Clock className="h-3 w-3" />En attente</Badge>;
      case 'APPROVED':
        return <Badge variant="success" className="flex items-center gap-1"><CheckCircle className="h-3 w-3" />Approuvé</Badge>;
      case 'REJECTED':
        return <Badge variant="danger" className="flex items-center gap-1"><XCircle className="h-3 w-3" />Rejeté</Badge>;
      case 'RECOVERED':
        return <Badge variant="info" className="flex items-center gap-1"><RefreshCw className="h-3 w-3" />Récupéré</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'WEEKEND_SATURDAY':
        return <Badge variant="secondary" className="text-xs">Samedi</Badge>;
      case 'WEEKEND_SUNDAY':
        return <Badge variant="warning" className="text-xs">Dimanche</Badge>;
      case 'HOLIDAY':
        return <Badge variant="danger" className="text-xs">Jour férié</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">{type}</Badge>;
    }
  };

  // Handlers
  const handleApproveClick = (record: any) => {
    setSelectedRecord(record);
    setApprovedHours(String(record.hours));
    setApproveDialogOpen(true);
  };

  const handleApproveConfirm = async () => {
    if (!selectedRecord) return;
    try {
      await approveMutation.mutateAsync({
        id: selectedRecord.id,
        approvedHours: parseFloat(approvedHours),
      });
      setApproveDialogOpen(false);
      setSelectedRecord(null);
    } catch (error) {}
  };

  const handleRejectClick = (record: any) => {
    setSelectedRecord(record);
    setRejectReason('');
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = async () => {
    if (!selectedRecord || !rejectReason.trim()) return;
    try {
      await rejectMutation.mutateAsync({
        id: selectedRecord.id,
        reason: rejectReason,
      });
      setRejectDialogOpen(false);
      setSelectedRecord(null);
      setRejectReason('');
    } catch (error) {}
  };

  const handleConvert = async (id: string) => {
    try {
      await convertMutation.mutateAsync(id);
    } catch (error) {}
  };

  const handleOpenConversionModal = (employee: { id: string; firstName: string; lastName: string }) => {
    setSelectedEmployee({
      id: employee.id,
      name: `${employee.firstName} ${employee.lastName}`,
    });
    setConversionModalOpen(true);
  };

  const handleCloseConversionModal = () => {
    setConversionModalOpen(false);
    setSelectedEmployee(null);
    refetch(); // Refresh data after conversion
  };

  const handleRevokeApprovalClick = (record: any) => {
    setSelectedRecord(record);
    setActionReason('');
    setRevokeApprovalDialogOpen(true);
  };

  const handleRevokeApprovalConfirm = async () => {
    if (!selectedRecord) return;
    try {
      await revokeApprovalMutation.mutateAsync({
        id: selectedRecord.id,
        reason: actionReason || undefined,
      });
      setRevokeApprovalDialogOpen(false);
      setSelectedRecord(null);
      setActionReason('');
    } catch (error) {}
  };

  const handleRevokeRejectionClick = (record: any) => {
    setSelectedRecord(record);
    setActionReason('');
    setRevokeRejectionDialogOpen(true);
  };

  const handleRevokeRejectionConfirm = async () => {
    if (!selectedRecord) return;
    try {
      await revokeRejectionMutation.mutateAsync({
        id: selectedRecord.id,
        reason: actionReason || undefined,
      });
      setRevokeRejectionDialogOpen(false);
      setSelectedRecord(null);
      setActionReason('');
    } catch (error) {}
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-secondary mb-1">Total jours supp.</p>
                <p className="text-3xl font-bold text-text-primary">{stats.total}</p>
                <p className="text-xs text-text-secondary">
                  ({Math.floor(stats.totalHours)}h{Math.round((stats.totalHours % 1) * 60).toString().padStart(2, '0')}min)
                </p>
              </div>
              <Calendar className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-secondary mb-1">Jours en attente</p>
                <p className="text-3xl font-bold text-warning">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-secondary mb-1">Jours approuvés</p>
                <p className="text-3xl font-bold text-success">{stats.approved}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-secondary mb-1">Jours récupérés</p>
                <p className="text-3xl font-bold text-info">{stats.recovered}</p>
              </div>
              <RefreshCw className="h-8 w-8 text-info" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-secondary mb-1">Taux conversion</p>
                <p className="text-3xl font-bold text-text-primary">
                  {stats.total > 0 ? Math.round((stats.recovered / stats.total) * 100) : 0}%
                </p>
              </div>
              <Calendar className="h-8 w-8 text-secondary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
              <Input
                placeholder="Rechercher par nom, prénom ou matricule..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="PENDING">En attente</SelectItem>
                <SelectItem value="APPROVED">Approuvé</SelectItem>
                <SelectItem value="REJECTED">Rejeté</SelectItem>
                <SelectItem value="RECOVERED">Récupéré</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="WEEKEND_SATURDAY">Samedi</SelectItem>
                <SelectItem value="WEEKEND_SUNDAY">Dimanche</SelectItem>
                <SelectItem value="HOLIDAY">Jour férié</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualiser
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-text-secondary">
              <Calendar className="h-12 w-12 mb-4" />
              <p>Aucun jour supplémentaire trouvé</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-background-secondary">
                  <tr>
                    <th className="text-left p-4 font-semibold text-text-secondary">Employé</th>
                    <th className="text-left p-4 font-semibold text-text-secondary">Site</th>
                    <th className="text-left p-4 font-semibold text-text-secondary">Date</th>
                    <th className="text-left p-4 font-semibold text-text-secondary">Heures</th>
                    <th className="text-left p-4 font-semibold text-text-secondary">Type</th>
                    <th className="text-left p-4 font-semibold text-text-secondary">Statut</th>
                    <th className="text-left p-4 font-semibold text-text-secondary">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredRecords.map((record: any) => (
                    <tr key={record.id} className="hover:bg-background-secondary/50">
                      <td className="p-4">
                        <div>
                          <p className="font-medium text-text-primary">
                            {record.employee?.firstName} {record.employee?.lastName}
                          </p>
                          <p className="text-sm text-text-secondary">{record.employee?.matricule}</p>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-text-secondary">
                        {record.employee?.site?.name || '-'}
                      </td>
                      <td className="p-4 text-sm">
                        {format(new Date(record.date), 'dd MMM yyyy', { locale: fr })}
                      </td>
                      <td className="p-4 font-semibold">
                        {Math.floor(Number(record.hours))}h{Math.round((Number(record.hours) % 1) * 60).toString().padStart(2, '0')}min
                      </td>
                      <td className="p-4">{getTypeBadge(record.type)}</td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1">
                          {getStatusBadge(record.status)}
                          {record.status === 'REJECTED' && record.rejectionReason && (
                            <span className="text-xs text-danger">{record.rejectionReason}</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          <PermissionGate permission="overtime.approve">
                            {record.status === 'PENDING' && (
                              <>
                                <Button
                                  variant="success"
                                  size="sm"
                                  onClick={() => handleApproveClick(record)}
                                  disabled={approveMutation.isPending}
                                  className="text-xs"
                                >
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Approuver
                                </Button>
                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={() => handleRejectClick(record)}
                                  disabled={rejectMutation.isPending}
                                  className="text-xs"
                                >
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Rejeter
                                </Button>
                              </>
                            )}

                            {record.status === 'APPROVED' && !record.convertedToRecovery && !record.convertedToRecoveryDays && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenConversionModal(record.employee)}
                                  className="text-xs"
                                >
                                  <RefreshCw className="h-3 w-3 mr-1" />
                                  Convertir en récup
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRevokeApprovalClick(record)}
                                  className="text-xs text-warning"
                                >
                                  <Undo2 className="h-3 w-3 mr-1" />
                                  Annuler
                                </Button>
                              </>
                            )}

                            {record.status === 'REJECTED' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRevokeRejectionClick(record)}
                                className="text-xs text-info"
                              >
                                <RotateCcw className="h-3 w-3 mr-1" />
                                Reconsidérer
                              </Button>
                            )}
                          </PermissionGate>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approuver le jour supplémentaire</DialogTitle>
            <DialogDescription>
              {selectedRecord && (
                <span>
                  {selectedRecord.employee?.firstName} {selectedRecord.employee?.lastName} -
                  {format(new Date(selectedRecord.date), ' dd/MM/yyyy')}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Heures approuvées</Label>
              <Input
                type="number"
                step="0.5"
                min="0.5"
                value={approvedHours}
                onChange={(e) => setApprovedHours(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>Annuler</Button>
            <Button variant="success" onClick={handleApproveConfirm} disabled={approveMutation.isPending}>
              {approveMutation.isPending ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
              Approuver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeter le jour supplémentaire</DialogTitle>
            <DialogDescription>
              {selectedRecord && (
                <span>
                  {selectedRecord.employee?.firstName} {selectedRecord.employee?.lastName} -
                  {format(new Date(selectedRecord.date), ' dd/MM/yyyy')}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Raison du rejet *</Label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Indiquez la raison du rejet..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Annuler</Button>
            <Button variant="danger" onClick={handleRejectConfirm} disabled={rejectMutation.isPending || !rejectReason.trim()}>
              {rejectMutation.isPending ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />}
              Rejeter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Approval Dialog */}
      <Dialog open={revokeApprovalDialogOpen} onOpenChange={setRevokeApprovalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-warning">Annuler l'approbation</DialogTitle>
            <DialogDescription>
              Le jour supplémentaire sera remis en statut "En attente"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Raison (optionnel)</Label>
              <Textarea
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="Raison de l'annulation..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeApprovalDialogOpen(false)}>Annuler</Button>
            <Button variant="warning" onClick={handleRevokeApprovalConfirm} disabled={revokeApprovalMutation.isPending}>
              {revokeApprovalMutation.isPending ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Undo2 className="h-4 w-4 mr-2" />}
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Rejection Dialog */}
      <Dialog open={revokeRejectionDialogOpen} onOpenChange={setRevokeRejectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-info">Reconsidérer le jour supplémentaire</DialogTitle>
            <DialogDescription>
              Le jour supplémentaire sera remis en statut "En attente" pour reconsidération
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Raison (optionnel)</Label>
              <Textarea
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="Raison de la reconsidération..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeRejectionDialogOpen(false)}>Annuler</Button>
            <Button variant="primary" onClick={handleRevokeRejectionConfirm} disabled={revokeRejectionMutation.isPending}>
              {revokeRejectionMutation.isPending ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <RotateCcw className="h-4 w-4 mr-2" />}
              Reconsidérer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Conversion Flexible Modal */}
      {selectedEmployee && (
        <SupplementaryDaysConversionModal
          isOpen={conversionModalOpen}
          onClose={handleCloseConversionModal}
          employeeId={selectedEmployee.id}
          employeeName={selectedEmployee.name}
        />
      )}
    </div>
  );
}
