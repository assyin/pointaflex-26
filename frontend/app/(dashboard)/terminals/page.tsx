'use client';

import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Wifi,
  WifiOff,
  Plus,
  Search,
  RefreshCw,
  Activity,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Edit,
  Trash2,
  Zap,
  Copy,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useDevices, useCreateDevice, useUpdateDevice, useDeleteDevice, useSyncDevice } from '@/lib/hooks/useDevices';
import { toast } from 'sonner';

export default function TerminalsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showWebhookInfo, setShowWebhookInfo] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    deviceId: '',
    deviceType: 'FINGERPRINT' as 'FINGERPRINT' | 'FACE_RECOGNITION' | 'RFID_BADGE' | 'QR_CODE' | 'PIN_CODE' | 'MOBILE_GPS' | 'MANUAL',
    ipAddress: '',
    siteId: '',
  });

  // Fetch devices
  const { data: devicesData, isLoading, error, refetch } = useDevices();

  // Mutations
  const createMutation = useCreateDevice();
  const updateMutation = useUpdateDevice();
  const deleteMutation = useDeleteDevice();
  const syncMutation = useSyncDevice();

  const getConnectionStatus = (device: any) => {
    if (!device.isActive) {
      return {
        status: 'INACTIVE',
        badge: (
          <Badge variant="default" className="flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            Inactif
          </Badge>
        )
      };
    }

    // Vérifier si le terminal a synchronisé récemment (dans les 5 dernières minutes)
    if (device.lastSync) {
      const lastSyncDate = new Date(device.lastSync);
      const now = new Date();
      const diffMinutes = (now.getTime() - lastSyncDate.getTime()) / (1000 * 60);

      if (diffMinutes <= 5) {
        return {
          status: 'ONLINE',
          badge: (
            <Badge variant="success" className="flex items-center gap-1">
              <Wifi className="h-3 w-3" />
              En ligne
            </Badge>
          )
        };
      } else if (diffMinutes <= 30) {
        return {
          status: 'WARNING',
          badge: (
            <Badge variant="warning" className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Lente
            </Badge>
          )
        };
      }
    }

    // Terminal activé mais jamais synchronisé ou hors ligne
    return {
      status: 'OFFLINE',
      badge: (
        <Badge variant="danger" className="flex items-center gap-1">
          <WifiOff className="h-3 w-3" />
          Hors ligne
        </Badge>
      )
    };
  };

  const handleCreateDevice = async () => {
    if (!formData.name || !formData.deviceId) {
      toast.error('Veuillez remplir les champs obligatoires');
      return;
    }

    // Clean up empty optional fields - only include if non-empty
    const payload: any = {
      name: formData.name,
      deviceId: formData.deviceId,
      deviceType: formData.deviceType,
    };

    if (formData.ipAddress?.trim()) {
      payload.ipAddress = formData.ipAddress.trim();
    }

    if (formData.siteId?.trim()) {
      payload.siteId = formData.siteId.trim();
    }

    await createMutation.mutateAsync(payload);
    setShowCreateModal(false);
    setFormData({ name: '', deviceId: '', deviceType: 'FINGERPRINT', ipAddress: '', siteId: '' });
  };

  const handleSync = async (deviceId: string) => {
    await syncMutation.mutateAsync(deviceId);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce terminal ?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    await updateMutation.mutateAsync({ id, data: { isActive: !currentStatus } });
  };

  const handleTestWebhook = async () => {
    // Simulate webhook test
    const webhookUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/v1/attendance/webhook`;

    const testPayload = {
      employeeId: 'test-employee-id',
      type: 'IN',
      timestamp: new Date().toISOString(),
      deviceType: 'FINGERPRINT',
    };

    const headers = {
      'Content-Type': 'application/json',
      'X-Device-ID': 'TEST-DEVICE-001',
      'X-Tenant-ID': 'your-tenant-id',
      'X-API-Key': 'test-api-key',
    };

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(testPayload),
      });

      if (response.ok) {
        toast.success('Webhook testé avec succès!');
      } else {
        const error = await response.json();
        toast.error(`Erreur webhook: ${error.message || 'Unknown error'}`);
      }
    } catch (err: any) {
      toast.error(`Erreur de connexion: ${err.message}`);
    }
  };

  const copyWebhookUrl = () => {
    const webhookUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/v1/attendance/webhook`;
    navigator.clipboard.writeText(webhookUrl);
    toast.success('URL du webhook copiée!');
  };

  const filteredDevices = Array.isArray(devicesData) ? devicesData.filter((device: any) => {
    const matchesSearch =
      searchQuery === '' ||
      device.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      device.deviceId?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'ACTIVE' && device.isActive) ||
      (statusFilter === 'INACTIVE' && !device.isActive);

    return matchesSearch && matchesStatus;
  }) : [];

  const getDeviceStatus = (device: any) => {
    if (!device.isActive) return 'INACTIVE';
    if (!device.lastSync) return 'OFFLINE';

    const lastSyncDate = new Date(device.lastSync);
    const now = new Date();
    const diffMinutes = (now.getTime() - lastSyncDate.getTime()) / (1000 * 60);

    if (diffMinutes <= 5) return 'ONLINE';
    return 'OFFLINE';
  };

  const stats = {
    total: Array.isArray(devicesData) ? devicesData.length : 0,
    active: Array.isArray(devicesData) ? devicesData.filter((d: any) => getDeviceStatus(d) === 'ONLINE').length : 0,
    offline: Array.isArray(devicesData) ? devicesData.filter((d: any) => getDeviceStatus(d) === 'OFFLINE').length : 0,
    maintenance: Array.isArray(devicesData) ? devicesData.filter((d: any) => getDeviceStatus(d) === 'INACTIVE').length : 0,
  };

  return (
    <ProtectedRoute permission="tenant.manage_devices">
      <DashboardLayout
        title="Gestion des Terminaux"
        subtitle="Configuration et surveillance des terminaux biométriques"
      >
      <div className="space-y-6">
        {/* Webhook Info Alert */}
        {showWebhookInfo && (
          <Alert variant="info">
            <Activity className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-semibold">Configuration Webhook</p>
                <div className="bg-gray-50 p-3 rounded font-mono text-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">URL:</span>
                    <Button variant="outline" size="sm" onClick={copyWebhookUrl}>
                      <Copy className="h-3 w-3 mr-1" />
                      Copier
                    </Button>
                  </div>
                  <code className="block">{process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/v1/attendance/webhook</code>

                  <div className="mt-3 space-y-1">
                    <p className="font-semibold">Headers requis:</p>
                    <code>X-Device-ID: [ID de votre terminal]</code>
                    <code>X-Tenant-ID: [ID de votre entreprise]</code>
                    <code>X-API-Key: [Clé API du terminal]</code>
                  </div>

                  <div className="mt-3">
                    <p className="font-semibold mb-1">Payload exemple:</p>
                    <code className="block whitespace-pre">
{`{
  "employeeId": "emp-123",
  "type": "IN",
  "timestamp": "2025-01-15T08:30:00Z",
  "deviceType": "FINGERPRINT"
}`}
                    </code>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button variant="primary" size="sm" onClick={handleTestWebhook}>
                    <Zap className="h-3 w-3 mr-1" />
                    Tester le Webhook
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowWebhookInfo(false)}>
                    Fermer
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-secondary">Total terminaux</p>
                  <p className="text-2xl font-bold text-text-primary mt-1">{stats.total}</p>
                </div>
                <Activity className="h-10 w-10 text-primary opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-secondary">Actifs</p>
                  <p className="text-2xl font-bold text-success mt-1">{stats.active}</p>
                </div>
                <Wifi className="h-10 w-10 text-success opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-secondary">Hors ligne</p>
                  <p className="text-2xl font-bold text-danger mt-1">{stats.offline}</p>
                </div>
                <WifiOff className="h-10 w-10 text-danger opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-secondary">Maintenance</p>
                  <p className="text-2xl font-bold text-warning mt-1">{stats.maintenance}</p>
                </div>
                <AlertTriangle className="h-10 w-10 text-warning opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
              <Input
                type="text"
                placeholder="Rechercher terminal..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-64"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-border rounded-lg text-sm"
            >
              <option value="all">Tous les statuts</option>
              <option value="ACTIVE">Actifs</option>
              <option value="OFFLINE">Hors ligne</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="INACTIVE">Inactifs</option>
            </select>
          </div>

          <div className="flex gap-2">
            <PermissionGate permission="tenant.manage_devices">
              <Button variant="outline" size="sm" onClick={() => setShowWebhookInfo(!showWebhookInfo)}>
                <Activity className="h-4 w-4 mr-2" />
                Config Webhook
              </Button>
            </PermissionGate>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
            <PermissionGate permission="tenant.manage_devices">
              <Button variant="primary" onClick={() => setShowCreateModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nouveau Terminal
              </Button>
            </PermissionGate>
          </div>
        </div>

        {/* Devices Table */}
        <Card>
          <CardHeader>
            <CardTitle>Liste des terminaux biométriques</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-3 text-text-secondary">Chargement...</span>
              </div>
            ) : error ? (
              <Alert variant="danger">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  Erreur lors du chargement des terminaux.
                </AlertDescription>
              </Alert>
            ) : filteredDevices.length === 0 ? (
              <div className="text-center py-12 text-text-secondary">
                <Activity className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>Aucun terminal trouvé.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-table-header text-left text-sm font-semibold text-text-primary">
                      <th className="p-3">Nom du terminal</th>
                      <th className="p-3">ID Terminal</th>
                      <th className="p-3">IP</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Statut</th>
                      <th className="p-3">Dernière synchro</th>
                      <th className="p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-table-border">
                    {filteredDevices.map((device: any) => (
                      <tr key={device.id} className="hover:bg-table-hover transition-colors">
                        <td className="p-3">
                          <div className="font-medium text-text-primary">{device.name}</div>
                          <div className="text-xs text-text-secondary">{device.site?.name || '—'}</div>
                        </td>
                        <td className="p-3 font-mono text-sm text-text-secondary">
                          {device.deviceId}
                        </td>
                        <td className="p-3 font-mono text-xs text-text-secondary">
                          {device.ipAddress || '—'}
                        </td>
                        <td className="p-3 text-sm text-text-secondary">
                          {device.deviceType}
                        </td>
                        <td className="p-3">{getConnectionStatus(device).badge}</td>
                        <td className="p-3 text-xs text-text-secondary">
                          {device.lastSync
                            ? new Date(device.lastSync).toLocaleString('fr-FR')
                            : 'Jamais'}
                        </td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            <PermissionGate permission="tenant.manage_devices">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSync(device.id)}
                                disabled={syncMutation.isPending}
                              >
                                <RefreshCw className="h-3 w-3 mr-1" />
                                Sync
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDelete(device.id)}
                                disabled={deleteMutation.isPending}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
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

        {/* Create Device Modal (simplified) */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Ajouter un terminal</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Nom du terminal *</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Terminal Entrée Principale"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">ID Terminal *</label>
                  <Input
                    value={formData.deviceId}
                    onChange={(e) => setFormData({ ...formData, deviceId: e.target.value })}
                    placeholder="CAS-ENTREE-001"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Type de terminal *</label>
                  <select
                    value={formData.deviceType}
                    onChange={(e) => setFormData({ ...formData, deviceType: e.target.value as any })}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                  >
                    <option value="FINGERPRINT">Empreinte digitale</option>
                    <option value="FACE_RECOGNITION">Reconnaissance faciale</option>
                    <option value="RFID_BADGE">Badge RFID</option>
                    <option value="QR_CODE">QR Code</option>
                    <option value="PIN_CODE">Code PIN</option>
                    <option value="MOBILE_GPS">Mobile GPS</option>
                    <option value="MANUAL">Saisie manuelle</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Adresse IP</label>
                  <Input
                    value={formData.ipAddress}
                    onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
                    placeholder="192.168.1.100 (optionnel)"
                  />
                </div>

                <div className="flex gap-2 justify-end pt-4">
                  <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                    Annuler
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleCreateDevice}
                    disabled={createMutation.isPending}
                  >
                    {createMutation.isPending ? 'Création...' : 'Créer'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
    </ProtectedRoute>
  );
}
