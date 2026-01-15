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
  Trash2,
  Zap,
  Copy,
  Eye,
  EyeOff,
  Key,
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldOff,
  RotateCw,
  History,
  Settings,
  Power,
  PowerOff,
  ChevronDown,
  ChevronUp,
  Clock,
  Edit,
} from 'lucide-react';
import {
  useDevices,
  useCreateDevice,
  useUpdateDevice,
  useDeleteDevice,
  useSyncDevice,
  useDeviceStats,
  useActivateDevice,
  useDeactivateDevice,
  useGenerateApiKey,
  useRotateApiKey,
  useRevokeApiKey,
  useUpdateIPWhitelist,
  useDeviceAuditLogs,
} from '@/lib/hooks/useDevices';
import { toast } from 'sonner';
import type { AttendanceDevice, DeviceAuditLog } from '@/lib/api/devices';

export default function TerminalsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingDevice, setEditingDevice] = useState<AttendanceDevice | null>(null);
  const [showWebhookInfo, setShowWebhookInfo] = useState(false);
  const [showAuditLogs, setShowAuditLogs] = useState(false);
  const [expandedDevice, setExpandedDevice] = useState<string | null>(null);
  const [generatedApiKey, setGeneratedApiKey] = useState<{ deviceId: string; key: string; expiresAt: string } | null>(null);
  const [ipWhitelistForm, setIpWhitelistForm] = useState<{ deviceId: string; ips: string; enforce: boolean } | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    deviceId: '',
    deviceType: 'FINGERPRINT' as 'FINGERPRINT' | 'FACE_RECOGNITION' | 'RFID_BADGE' | 'QR_CODE' | 'PIN_CODE' | 'MOBILE_GPS' | 'MANUAL',
    ipAddress: '',
    siteId: '',
    generateApiKey: false,
  });

  const [editFormData, setEditFormData] = useState({
    name: '',
    deviceId: '',
    deviceType: 'FINGERPRINT' as 'FINGERPRINT' | 'FACE_RECOGNITION' | 'RFID_BADGE' | 'QR_CODE' | 'PIN_CODE' | 'MOBILE_GPS' | 'MANUAL',
    ipAddress: '',
    siteId: '',
    heartbeatInterval: 300,
  });

  // Fetch data
  const { data: devicesData, isLoading, error, refetch } = useDevices();
  const { data: statsData } = useDeviceStats();
  const { data: auditLogsData } = useDeviceAuditLogs(showAuditLogs ? { limit: 50 } : undefined);

  // Mutations
  const createMutation = useCreateDevice();
  const updateMutation = useUpdateDevice();
  const deleteMutation = useDeleteDevice();
  const syncMutation = useSyncDevice();
  const activateMutation = useActivateDevice();
  const deactivateMutation = useDeactivateDevice();
  const generateApiKeyMutation = useGenerateApiKey();
  const rotateApiKeyMutation = useRotateApiKey();
  const revokeApiKeyMutation = useRevokeApiKey();
  const updateIPWhitelistMutation = useUpdateIPWhitelist();

  const getConnectionStatusBadge = (device: AttendanceDevice) => {
    const status = device.connectionStatus || 'OFFLINE';

    switch (status) {
      case 'ONLINE':
        return (
          <Badge variant="success" className="flex items-center gap-1">
            <Wifi className="h-3 w-3" />
            En ligne
          </Badge>
        );
      case 'WARNING':
        return (
          <Badge variant="warning" className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Lente
          </Badge>
        );
      case 'OFFLINE':
        return (
          <Badge variant="danger" className="flex items-center gap-1">
            <WifiOff className="h-3 w-3" />
            Hors ligne
          </Badge>
        );
      case 'INACTIVE':
        return (
          <Badge variant="default" className="flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            Inactif
          </Badge>
        );
      default:
        return (
          <Badge variant="default" className="flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            Inconnu
          </Badge>
        );
    }
  };

  const getApiKeyStatusBadge = (device: AttendanceDevice) => {
    if (!device.hasApiKey) {
      return (
        <Badge variant="default" className="flex items-center gap-1 text-xs">
          <ShieldOff className="h-3 w-3" />
          Sans clé
        </Badge>
      );
    }
    if (device.apiKeyExpired) {
      return (
        <Badge variant="danger" className="flex items-center gap-1 text-xs">
          <ShieldAlert className="h-3 w-3" />
          Expirée
        </Badge>
      );
    }
    return (
      <Badge variant="success" className="flex items-center gap-1 text-xs">
        <ShieldCheck className="h-3 w-3" />
        Active
      </Badge>
    );
  };

  const handleCreateDevice = async () => {
    if (!formData.name || !formData.deviceId) {
      toast.error('Veuillez remplir les champs obligatoires');
      return;
    }

    const payload: any = {
      name: formData.name,
      deviceId: formData.deviceId,
      deviceType: formData.deviceType,
      generateApiKey: formData.generateApiKey,
    };

    if (formData.ipAddress?.trim()) {
      payload.ipAddress = formData.ipAddress.trim();
    }

    if (formData.siteId?.trim()) {
      payload.siteId = formData.siteId.trim();
    }

    const result = await createMutation.mutateAsync(payload);

    if (result.generatedApiKey) {
      setGeneratedApiKey({
        deviceId: result.id,
        key: result.generatedApiKey,
        expiresAt: result.apiKeyExpiresAt || '',
      });
    }

    setShowCreateModal(false);
    setFormData({ name: '', deviceId: '', deviceType: 'FINGERPRINT', ipAddress: '', siteId: '', generateApiKey: false });
  };

  const handleSync = async (deviceId: string) => {
    await syncMutation.mutateAsync(deviceId);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce terminal ?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const handleToggleActive = async (device: AttendanceDevice) => {
    if (device.isActive) {
      await deactivateMutation.mutateAsync(device.id);
    } else {
      await activateMutation.mutateAsync(device.id);
    }
  };

  const handleGenerateApiKey = async (deviceId: string) => {
    const result = await generateApiKeyMutation.mutateAsync(deviceId);
    setGeneratedApiKey({
      deviceId,
      key: result.apiKey,
      expiresAt: result.expiresAt,
    });
  };

  const handleRotateApiKey = async (deviceId: string) => {
    if (confirm('Cette action va invalider l\'ancienne clé API. Continuer ?')) {
      const result = await rotateApiKeyMutation.mutateAsync(deviceId);
      setGeneratedApiKey({
        deviceId,
        key: result.apiKey,
        expiresAt: result.expiresAt,
      });
    }
  };

  const handleRevokeApiKey = async (deviceId: string) => {
    if (confirm('Cette action va révoquer la clé API. Le terminal ne pourra plus s\'authentifier. Continuer ?')) {
      await revokeApiKeyMutation.mutateAsync(deviceId);
    }
  };

  const handleUpdateIPWhitelist = async () => {
    if (!ipWhitelistForm) return;

    const ips = ipWhitelistForm.ips.split(',').map(ip => ip.trim()).filter(ip => ip);

    await updateIPWhitelistMutation.mutateAsync({
      id: ipWhitelistForm.deviceId,
      data: {
        allowedIPs: ips,
        enforceIPWhitelist: ipWhitelistForm.enforce,
      },
    });

    setIpWhitelistForm(null);
  };

  const handleOpenEditModal = (device: AttendanceDevice) => {
    setEditingDevice(device);
    setEditFormData({
      name: device.name || '',
      deviceId: device.deviceId || '',
      deviceType: device.deviceType || 'FINGERPRINT',
      ipAddress: device.ipAddress || '',
      siteId: device.siteId || '',
      heartbeatInterval: device.heartbeatInterval || 300,
    });
    setShowEditModal(true);
  };

  const handleUpdateDevice = async () => {
    if (!editingDevice) return;

    if (!editFormData.name) {
      toast.error('Le nom du terminal est obligatoire');
      return;
    }

    await updateMutation.mutateAsync({
      id: editingDevice.id,
      data: {
        name: editFormData.name,
        deviceType: editFormData.deviceType,
        ipAddress: editFormData.ipAddress || undefined,
        siteId: editFormData.siteId || undefined,
        heartbeatInterval: editFormData.heartbeatInterval,
      },
    });

    setShowEditModal(false);
    setEditingDevice(null);
  };

  const copyWebhookUrl = () => {
    const webhookUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/v1/attendance/webhook`;
    navigator.clipboard.writeText(webhookUrl);
    toast.success('URL du webhook copiée!');
  };

  const copyApiKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success('Clé API copiée!');
  };

  const filteredDevices = Array.isArray(devicesData) ? devicesData.filter((device: AttendanceDevice) => {
    const matchesSearch =
      searchQuery === '' ||
      device.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      device.deviceId?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'ACTIVE' && device.isActive) ||
      (statusFilter === 'INACTIVE' && !device.isActive) ||
      (statusFilter === 'ONLINE' && device.connectionStatus === 'ONLINE') ||
      (statusFilter === 'OFFLINE' && device.connectionStatus === 'OFFLINE');

    return matchesSearch && matchesStatus;
  }) : [];

  const stats = statsData || {
    total: 0,
    online: 0,
    warning: 0,
    offline: 0,
    inactive: 0,
    active: 0,
    apiKeyExpiringSoon: 0,
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      CREATED: 'Création',
      UPDATED: 'Modification',
      DELETED: 'Suppression',
      ACTIVATED: 'Activation',
      DEACTIVATED: 'Désactivation',
      SYNCED: 'Synchronisation',
      HEARTBEAT: 'Heartbeat',
      API_KEY_GENERATED: 'Clé API générée',
      API_KEY_ROTATED: 'Clé API renouvelée',
      API_KEY_REVOKED: 'Clé API révoquée',
      IP_WHITELIST_UPDATED: 'IP Whitelist MAJ',
      CONNECTION_FAILED: 'Échec connexion',
      CONNECTION_RESTORED: 'Connexion restaurée',
    };
    return labels[action] || action;
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
                  <Button variant="outline" size="sm" onClick={() => setShowWebhookInfo(false)}>
                    Fermer
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* API Key Generated Modal */}
        {generatedApiKey && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-lg">
              <CardHeader className="bg-warning/10">
                <CardTitle className="flex items-center gap-2 text-warning">
                  <Key className="h-5 w-5" />
                  Clé API Générée
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <Alert variant="warning">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>IMPORTANT:</strong> Copiez cette clé maintenant. Elle ne sera plus affichée!
                  </AlertDescription>
                </Alert>

                <div className="bg-gray-100 p-4 rounded-lg">
                  <p className="text-xs text-text-secondary mb-1">Clé API:</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-sm font-mono break-all">{generatedApiKey.key}</code>
                    <Button variant="outline" size="sm" onClick={() => copyApiKey(generatedApiKey.key)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <Clock className="h-4 w-4" />
                  Expire le: {new Date(generatedApiKey.expiresAt).toLocaleDateString('fr-FR')}
                </div>

                <div className="flex justify-end pt-4">
                  <Button variant="primary" onClick={() => setGeneratedApiKey(null)}>
                    J'ai copié la clé
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* IP Whitelist Modal */}
        {ipWhitelistForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Gérer la liste blanche IP
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Adresses IP autorisées (séparées par des virgules)</label>
                  <Input
                    value={ipWhitelistForm.ips}
                    onChange={(e) => setIpWhitelistForm({ ...ipWhitelistForm, ips: e.target.value })}
                    placeholder="192.168.1.100, 10.0.0.50"
                  />
                  <p className="text-xs text-text-secondary mt-1">Ex: 192.168.1.100, 10.0.0.50</p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="enforceWhitelist"
                    checked={ipWhitelistForm.enforce}
                    onChange={(e) => setIpWhitelistForm({ ...ipWhitelistForm, enforce: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="enforceWhitelist" className="text-sm">
                    Activer la vérification IP
                  </label>
                </div>

                <Alert variant="info">
                  <Shield className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Si activé, seules les connexions depuis ces IPs seront autorisées.
                  </AlertDescription>
                </Alert>

                <div className="flex gap-2 justify-end pt-4">
                  <Button variant="outline" onClick={() => setIpWhitelistForm(null)}>
                    Annuler
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleUpdateIPWhitelist}
                    disabled={updateIPWhitelistMutation.isPending}
                  >
                    {updateIPWhitelistMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-secondary">Total</p>
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
                  <p className="text-sm font-medium text-text-secondary">En ligne</p>
                  <p className="text-2xl font-bold text-success mt-1">{stats.online}</p>
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
                  <p className="text-sm font-medium text-text-secondary">Inactifs</p>
                  <p className="text-2xl font-bold text-warning mt-1">{stats.inactive}</p>
                </div>
                <PowerOff className="h-10 w-10 text-warning opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-secondary">Clés expirant</p>
                  <p className="text-2xl font-bold text-warning mt-1">{stats.apiKeyExpiringSoon}</p>
                </div>
                <Key className="h-10 w-10 text-warning opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions Bar */}
        <div className="flex items-center justify-between flex-wrap gap-4">
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
              <option value="ONLINE">En ligne</option>
              <option value="OFFLINE">Hors ligne</option>
              <option value="INACTIVE">Inactifs</option>
            </select>
          </div>

          <div className="flex gap-2 flex-wrap">
            <PermissionGate permission="tenant.manage_devices">
              <Button variant="outline" size="sm" onClick={() => setShowAuditLogs(!showAuditLogs)}>
                <History className="h-4 w-4 mr-2" />
                Audit
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowWebhookInfo(!showWebhookInfo)}>
                <Activity className="h-4 w-4 mr-2" />
                Webhook
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

        {/* Audit Logs Section */}
        {showAuditLogs && auditLogsData?.data && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Journal d'audit des terminaux
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto max-h-64 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white">
                    <tr className="text-left text-text-secondary border-b">
                      <th className="p-2">Date</th>
                      <th className="p-2">Terminal</th>
                      <th className="p-2">Action</th>
                      <th className="p-2">Utilisateur</th>
                      <th className="p-2">IP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {auditLogsData.data.map((log: DeviceAuditLog) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="p-2 text-xs">
                          {new Date(log.createdAt).toLocaleString('fr-FR')}
                        </td>
                        <td className="p-2">
                          {log.device?.name || '-'}
                        </td>
                        <td className="p-2">
                          <Badge variant="default" className="text-xs">
                            {getActionLabel(log.action)}
                          </Badge>
                        </td>
                        <td className="p-2 text-xs">
                          {log.performedByName || 'Système'}
                        </td>
                        <td className="p-2 font-mono text-xs">
                          {log.ipAddress || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

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
              <div className="space-y-2">
                {filteredDevices.map((device: AttendanceDevice) => (
                  <div key={device.id} className="border rounded-lg overflow-hidden">
                    {/* Device Row */}
                    <div
                      className="p-4 flex items-center justify-between hover:bg-gray-50 cursor-pointer"
                      onClick={() => setExpandedDevice(expandedDevice === device.id ? null : device.id)}
                    >
                      <div className="flex items-center gap-4">
                        <div>
                          <div className="font-medium text-text-primary flex items-center gap-2">
                            {device.name}
                            {getConnectionStatusBadge(device)}
                            {getApiKeyStatusBadge(device)}
                          </div>
                          <div className="text-xs text-text-secondary flex items-center gap-2 mt-1">
                            <span className="font-mono">{device.deviceId}</span>
                            {device.ipAddress && <span>• {device.ipAddress}</span>}
                            {device.site?.name && <span>• {device.site.name}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-xs text-text-secondary text-right">
                          <div>Type: {device.deviceType}</div>
                          <div>
                            Sync: {device.lastSync ? new Date(device.lastSync).toLocaleString('fr-FR') : 'Jamais'}
                          </div>
                        </div>
                        {expandedDevice === device.id ? (
                          <ChevronUp className="h-4 w-4 text-text-secondary" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-text-secondary" />
                        )}
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {expandedDevice === device.id && (
                      <div className="border-t bg-gray-50 p-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Actions Rapides */}
                          <div className="space-y-2">
                            <h4 className="text-sm font-semibold text-text-secondary">Actions</h4>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); handleOpenEditModal(device); }}
                              >
                                <Edit className="h-3 w-3 mr-1" />
                                Modifier
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); handleSync(device.id); }}
                                disabled={syncMutation.isPending}
                              >
                                <RefreshCw className="h-3 w-3 mr-1" />
                                Sync
                              </Button>
                              <Button
                                variant={device.isActive ? 'outline' : 'primary'}
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); handleToggleActive(device); }}
                                disabled={activateMutation.isPending || deactivateMutation.isPending}
                              >
                                {device.isActive ? (
                                  <>
                                    <PowerOff className="h-3 w-3 mr-1" />
                                    Désactiver
                                  </>
                                ) : (
                                  <>
                                    <Power className="h-3 w-3 mr-1" />
                                    Activer
                                  </>
                                )}
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); handleDelete(device.id); }}
                                disabled={deleteMutation.isPending}
                              >
                                <Trash2 className="h-3 w-3 mr-1" />
                                Supprimer
                              </Button>
                            </div>
                          </div>

                          {/* Gestion Clé API */}
                          <div className="space-y-2">
                            <h4 className="text-sm font-semibold text-text-secondary">Clé API</h4>
                            <div className="flex flex-wrap gap-2">
                              {!device.hasApiKey ? (
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={(e) => { e.stopPropagation(); handleGenerateApiKey(device.id); }}
                                  disabled={generateApiKeyMutation.isPending}
                                >
                                  <Key className="h-3 w-3 mr-1" />
                                  Générer
                                </Button>
                              ) : (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => { e.stopPropagation(); handleRotateApiKey(device.id); }}
                                    disabled={rotateApiKeyMutation.isPending}
                                  >
                                    <RotateCw className="h-3 w-3 mr-1" />
                                    Renouveler
                                  </Button>
                                  <Button
                                    variant="danger"
                                    size="sm"
                                    onClick={(e) => { e.stopPropagation(); handleRevokeApiKey(device.id); }}
                                    disabled={revokeApiKeyMutation.isPending}
                                  >
                                    <ShieldOff className="h-3 w-3 mr-1" />
                                    Révoquer
                                  </Button>
                                </>
                              )}
                            </div>
                            {device.apiKeyExpiresAt && (
                              <p className="text-xs text-text-secondary">
                                Expire: {new Date(device.apiKeyExpiresAt).toLocaleDateString('fr-FR')}
                              </p>
                            )}
                          </div>

                          {/* Sécurité IP */}
                          <div className="space-y-2">
                            <h4 className="text-sm font-semibold text-text-secondary">Sécurité IP</h4>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setIpWhitelistForm({
                                  deviceId: device.id,
                                  ips: device.allowedIPs?.join(', ') || '',
                                  enforce: device.enforceIPWhitelist || false,
                                });
                              }}
                            >
                              <Shield className="h-3 w-3 mr-1" />
                              Gérer IP Whitelist
                            </Button>
                            {device.enforceIPWhitelist && (
                              <p className="text-xs text-success flex items-center gap-1">
                                <ShieldCheck className="h-3 w-3" />
                                Whitelist activée ({device.allowedIPs?.length || 0} IPs)
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Stats du terminal */}
                        <div className="mt-4 pt-4 border-t grid grid-cols-4 gap-4 text-center">
                          <div>
                            <p className="text-lg font-semibold">{device.totalSyncs || 0}</p>
                            <p className="text-xs text-text-secondary">Synchronisations</p>
                          </div>
                          <div>
                            <p className="text-lg font-semibold">{device.failedSyncs || 0}</p>
                            <p className="text-xs text-text-secondary">Échecs</p>
                          </div>
                          <div>
                            <p className="text-lg font-semibold">{device.heartbeatInterval || 300}s</p>
                            <p className="text-xs text-text-secondary">Intervalle Heartbeat</p>
                          </div>
                          <div>
                            <p className="text-lg font-semibold">
                              {device.lastHeartbeat ? new Date(device.lastHeartbeat).toLocaleTimeString('fr-FR') : '-'}
                            </p>
                            <p className="text-xs text-text-secondary">Dernier Heartbeat</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create Device Modal */}
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

                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                  <input
                    type="checkbox"
                    id="generateApiKey"
                    checked={formData.generateApiKey}
                    onChange={(e) => setFormData({ ...formData, generateApiKey: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="generateApiKey" className="text-sm">
                    <span className="font-medium">Générer une clé API sécurisée</span>
                    <p className="text-xs text-text-secondary">Recommandé pour la sécurité des communications</p>
                  </label>
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

        {/* Edit Device Modal */}
        {showEditModal && editingDevice && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Edit className="h-5 w-5" />
                  Modifier le terminal
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Nom du terminal *</label>
                  <Input
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    placeholder="Terminal Entrée Principale"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">ID Terminal</label>
                  <Input
                    value={editFormData.deviceId}
                    disabled
                    className="bg-gray-100 cursor-not-allowed"
                  />
                  <p className="text-xs text-text-secondary mt-1">L'ID du terminal ne peut pas être modifié</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Type de terminal</label>
                  <select
                    value={editFormData.deviceType}
                    onChange={(e) => setEditFormData({ ...editFormData, deviceType: e.target.value as any })}
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
                    value={editFormData.ipAddress}
                    onChange={(e) => setEditFormData({ ...editFormData, ipAddress: e.target.value })}
                    placeholder="192.168.1.100 (optionnel)"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Intervalle Heartbeat (secondes)</label>
                  <Input
                    type="number"
                    value={editFormData.heartbeatInterval}
                    onChange={(e) => setEditFormData({ ...editFormData, heartbeatInterval: parseInt(e.target.value) || 300 })}
                    min={60}
                    max={3600}
                  />
                  <p className="text-xs text-text-secondary mt-1">Fréquence des pings de vérification (60-3600s)</p>
                </div>

                <div className="flex gap-2 justify-end pt-4">
                  <Button variant="outline" onClick={() => { setShowEditModal(false); setEditingDevice(null); }}>
                    Annuler
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleUpdateDevice}
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
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
