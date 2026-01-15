import apiClient from './client';

export type DeviceType = 'FINGERPRINT' | 'FACE_RECOGNITION' | 'RFID_BADGE' | 'QR_CODE' | 'PIN_CODE' | 'MOBILE_GPS' | 'MANUAL';
export type ConnectionStatus = 'ONLINE' | 'WARNING' | 'OFFLINE' | 'INACTIVE';
export type DeviceAction = 'CREATED' | 'UPDATED' | 'DELETED' | 'ACTIVATED' | 'DEACTIVATED' | 'SYNCED' | 'HEARTBEAT' | 'API_KEY_GENERATED' | 'API_KEY_ROTATED' | 'API_KEY_REVOKED' | 'IP_WHITELIST_UPDATED' | 'CONNECTION_FAILED' | 'CONNECTION_RESTORED';

export interface AttendanceDevice {
  id: string;
  name: string;
  deviceId: string;
  deviceType: DeviceType;
  ipAddress?: string;
  location?: string;
  isActive: boolean;
  connectionStatus?: ConnectionStatus;
  webhookUrl?: string;
  webhookHeaders?: Record<string, string>;
  lastSync?: string;
  lastHeartbeat?: string;
  heartbeatInterval: number;
  tenantId: string;
  siteId?: string;
  createdAt: string;
  updatedAt: string;
  site?: any;
  // Security fields
  hasApiKey?: boolean;
  apiKeyExpired?: boolean;
  apiKeyExpiresAt?: string;
  allowedIPs?: string[];
  enforceIPWhitelist?: boolean;
  // Stats
  totalSyncs?: number;
  failedSyncs?: number;
  avgResponseTime?: number;
}

export interface CreateDeviceDto {
  name: string;
  deviceId: string;
  deviceType: DeviceType;
  ipAddress?: string;
  location?: string;
  apiKey?: string;
  siteId?: string;
  isActive?: boolean;
  generateApiKey?: boolean;
}

export interface UpdateIPWhitelistDto {
  allowedIPs: string[];
  enforceIPWhitelist?: boolean;
}

export interface ApiKeyResponse {
  apiKey: string;
  expiresAt: string;
}

export interface DeviceAuditLog {
  id: string;
  createdAt: string;
  action: DeviceAction;
  performedBy?: string;
  performedByName?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: any;
  previousValue?: any;
  newValue?: any;
  device?: {
    name: string;
    deviceId: string;
  };
}

export interface AuditLogFilters {
  deviceId?: string;
  action?: DeviceAction;
  performedBy?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface DeviceStats {
  total: number;
  online: number;
  warning: number;
  offline: number;
  inactive: number;
  active: number;
  apiKeyExpiringSoon: number;
}

export const devicesApi = {
  // CRUD Operations
  getAll: async (filters?: any): Promise<AttendanceDevice[]> => {
    const response = await apiClient.get('/devices', { params: filters });
    return response.data;
  },

  getById: async (id: string): Promise<AttendanceDevice> => {
    const response = await apiClient.get(`/devices/${id}`);
    return response.data;
  },

  create: async (data: CreateDeviceDto): Promise<AttendanceDevice & { generatedApiKey?: string }> => {
    const response = await apiClient.post('/devices', data);
    return response.data;
  },

  update: async (id: string, data: Partial<CreateDeviceDto>): Promise<AttendanceDevice> => {
    const response = await apiClient.patch(`/devices/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/devices/${id}`);
  },

  sync: async (id: string): Promise<{ success: boolean; message: string; device: AttendanceDevice }> => {
    const response = await apiClient.post(`/devices/${id}/sync`);
    return response.data;
  },

  getStats: async (): Promise<DeviceStats> => {
    const response = await apiClient.get('/devices/stats');
    return response.data;
  },

  // Activation / Deactivation
  activate: async (id: string): Promise<AttendanceDevice> => {
    const response = await apiClient.post(`/devices/${id}/activate`);
    return response.data;
  },

  deactivate: async (id: string): Promise<AttendanceDevice> => {
    const response = await apiClient.post(`/devices/${id}/deactivate`);
    return response.data;
  },

  // API Key Management
  generateApiKey: async (id: string): Promise<ApiKeyResponse> => {
    const response = await apiClient.post(`/devices/${id}/api-key/generate`);
    return response.data;
  },

  rotateApiKey: async (id: string): Promise<ApiKeyResponse> => {
    const response = await apiClient.post(`/devices/${id}/api-key/rotate`);
    return response.data;
  },

  revokeApiKey: async (id: string): Promise<void> => {
    await apiClient.post(`/devices/${id}/api-key/revoke`);
  },

  // IP Whitelist
  updateIPWhitelist: async (id: string, data: UpdateIPWhitelistDto): Promise<AttendanceDevice> => {
    const response = await apiClient.patch(`/devices/${id}/ip-whitelist`, data);
    return response.data;
  },

  // Heartbeat & Connection Status
  getConnectionStatus: async (id: string): Promise<{
    deviceId: string;
    status: ConnectionStatus;
    lastHeartbeat?: string;
    heartbeatInterval: number;
    isActive: boolean;
  }> => {
    const response = await apiClient.get(`/devices/${id}/connection-status`);
    return response.data;
  },

  recordHeartbeat: async (id: string): Promise<{
    status: string;
    serverTime: string;
    nextHeartbeatExpected: string;
  }> => {
    const response = await apiClient.post(`/devices/${id}/heartbeat`);
    return response.data;
  },

  // Audit Logs
  getAuditLogs: async (filters?: AuditLogFilters): Promise<PaginatedResponse<DeviceAuditLog>> => {
    const response = await apiClient.get('/devices/audit-logs', { params: filters });
    return response.data;
  },

  getDeviceAuditLogs: async (id: string, filters?: AuditLogFilters): Promise<PaginatedResponse<DeviceAuditLog>> => {
    const response = await apiClient.get(`/devices/${id}/audit-logs`, { params: filters });
    return response.data;
  },
};
