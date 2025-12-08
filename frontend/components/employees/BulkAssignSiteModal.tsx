'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSites } from '@/lib/hooks/useSites';
import { employeesApi } from '@/lib/api/employees';
import { toast } from 'sonner';
import { X, Building2, Users } from 'lucide-react';

interface BulkAssignSiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  employeeCount?: number;
}

export function BulkAssignSiteModal({
  isOpen,
  onClose,
  onSuccess,
  employeeCount = 0,
}: BulkAssignSiteModalProps) {
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [isAssigning, setIsAssigning] = useState(false);
  const { data: sitesResponse, isLoading: sitesLoading } = useSites();

  const sites = sitesResponse?.data || sitesResponse || [];

  const handleAssign = async () => {
    if (!selectedSiteId) {
      toast.error('Veuillez sélectionner un site');
      return;
    }

    setIsAssigning(true);
    try {
      const result = await employeesApi.bulkAssignToSite(selectedSiteId);
      toast.success(result.message || `${result.count} employé(s) assigné(s) avec succès`);
      onSuccess?.();
      onClose();
      setSelectedSiteId('');
    } catch (error: any) {
      console.error('Error assigning employees to site:', error);
      toast.error(error.response?.data?.message || 'Erreur lors de l\'assignation des employés');
    } finally {
      setIsAssigning(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Assigner les employés à un site
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="info">
            <Users className="h-4 w-4" />
            <AlertDescription>
              {employeeCount > 0
                ? `Tous les ${employeeCount} employé(s) actuel(s) seront assignés au site sélectionné.`
                : 'Tous les employés seront assignés au site sélectionné.'}
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <label className="text-sm font-medium">Sélectionner un site</label>
            {sitesLoading ? (
              <div className="text-sm text-muted-foreground">Chargement des sites...</div>
            ) : sites.length === 0 ? (
              <div className="text-sm text-muted-foreground">Aucun site disponible</div>
            ) : (
              <select
                value={selectedSiteId}
                onChange={(e) => setSelectedSiteId(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
              >
                <option value="">-- Sélectionner un site --</option>
                {sites.map((site: any) => (
                  <option key={site.id} value={site.id}>
                    {site.name} {site.code ? `(${site.code})` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={onClose} disabled={isAssigning}>
              Annuler
            </Button>
            <Button
              variant="primary"
              onClick={handleAssign}
              disabled={isAssigning || !selectedSiteId || sites.length === 0}
            >
              {isAssigning ? 'Assignation...' : 'Assigner tous les employés'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

