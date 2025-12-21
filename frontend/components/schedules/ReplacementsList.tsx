'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, Check, X, Eye, Calendar, User, AlertTriangle } from 'lucide-react';
import { useReplacements, useApproveReplacement, useRejectReplacement } from '@/lib/hooks/useSchedules';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { PermissionGate } from '@/components/auth/PermissionGate';

export function ReplacementsList() {
  const [statusFilter, setStatusFilter] = useState<string>('PENDING');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const { data: replacements, isLoading, error } = useReplacements({
    status: statusFilter || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  const approveMutation = useApproveReplacement();
  const rejectMutation = useRejectReplacement();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300">En attente</Badge>;
      case 'APPROVED':
        return <Badge className="bg-green-100 text-green-700 border-green-300">Approuvé</Badge>;
      case 'REJECTED':
        return <Badge className="bg-red-100 text-red-700 border-red-300">Rejeté</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const handleApprove = async (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir approuver ce remplacement ?')) {
      await approveMutation.mutateAsync(id);
    }
  };

  const handleReject = async (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir rejeter ce remplacement ?')) {
      await rejectMutation.mutateAsync(id);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestion des Remplacements</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Filtres */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div>
            <Label htmlFor="status">Statut</Label>
            <select
              id="status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">Tous</option>
              <option value="PENDING">En attente</option>
              <option value="APPROVED">Approuvés</option>
              <option value="REJECTED">Rejetés</option>
            </select>
          </div>
          <div>
            <Label htmlFor="startDate">Date début</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="endDate">Date fin</Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate}
            />
          </div>
          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={() => {
                setStatusFilter('');
                setStartDate('');
                setEndDate('');
              }}
            >
              Réinitialiser
            </Button>
          </div>
        </div>

        {/* Liste des remplacements */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <Alert variant="danger">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Erreur lors du chargement des remplacements
            </AlertDescription>
          </Alert>
        ) : !replacements || replacements.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            Aucun remplacement trouvé
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Employé Original</TableHead>
                  <TableHead>Employé Remplaçant</TableHead>
                  <TableHead>Shift</TableHead>
                  <TableHead>Raison</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {replacements.map((replacement: any) => (
                  <TableRow key={replacement.id}>
                    <TableCell>
                      {format(new Date(replacement.date), 'dd/MM/yyyy', { locale: fr })}
                    </TableCell>
                    <TableCell>
                      {replacement.originalEmployee
                        ? `${replacement.originalEmployee.firstName} ${replacement.originalEmployee.lastName}`
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {replacement.replacementEmployee
                        ? `${replacement.replacementEmployee.firstName} ${replacement.replacementEmployee.lastName}`
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {replacement.shift?.name || replacement.shiftId}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {replacement.reason || '-'}
                    </TableCell>
                    <TableCell>{getStatusBadge(replacement.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {replacement.status === 'PENDING' && (
                          <>
                            <PermissionGate permissions={['schedule.approve']}>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleApprove(replacement.id)}
                                disabled={approveMutation.isPending}
                                title="Approuver"
                              >
                                <Check className="h-4 w-4 text-green-600" />
                              </Button>
                            </PermissionGate>
                            <PermissionGate permissions={['schedule.approve']}>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleReject(replacement.id)}
                                disabled={rejectMutation.isPending}
                                title="Rejeter"
                              >
                                <X className="h-4 w-4 text-red-600" />
                              </Button>
                            </PermissionGate>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
