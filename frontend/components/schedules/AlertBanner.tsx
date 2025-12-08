'use client';

import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, X } from 'lucide-react';
import { LegalAlert } from '@/lib/api/schedules';

interface AlertBannerProps {
  alerts: LegalAlert[];
  onDismiss?: (alertId: string) => void;
}

export function AlertBanner({ alerts, onDismiss }: AlertBannerProps) {
  if (!alerts || alerts.length === 0) {
    return null;
  }

  // Séparer les alertes par type
  const criticalAlerts = alerts.filter((a) => a.type === 'CRITICAL');
  const warningAlerts = alerts.filter((a) => a.type === 'WARNING');

  return (
    <div className="space-y-3">
      {/* Critical Alerts */}
      {criticalAlerts.length > 0 && (
        <Alert variant="danger" className="border-red-500 bg-red-50">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="danger" className="bg-red-600">
                    CRITIQUE
                  </Badge>
                  <span className="text-sm font-semibold text-red-900">
                    {criticalAlerts.length} alerte(s) critique(s)
                  </span>
                </div>
                <div className="space-y-2">
                  {criticalAlerts.map((alert) => (
                    <AlertDescription
                      key={alert.id}
                      className="text-sm text-red-800 flex items-center justify-between"
                    >
                      <span>
                        {alert.employeeName && (
                          <strong>{alert.employeeName}: </strong>
                        )}
                        {alert.message}
                        {alert.date && (
                          <span className="text-red-600 ml-2">({alert.date})</span>
                        )}
                      </span>
                      {onDismiss && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 w-6 p-0 text-red-600 hover:text-red-800 hover:bg-red-100 ml-2"
                          onClick={() => onDismiss(alert.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </AlertDescription>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Alert>
      )}

      {/* Warning Alerts */}
      {warningAlerts.length > 0 && (
        <Alert className="border-yellow-500 bg-yellow-50">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="warning" className="bg-yellow-100 text-yellow-800 border-yellow-500">
                    AVERTISSEMENT
                  </Badge>
                  <span className="text-sm font-semibold text-yellow-900">
                    {warningAlerts.length} alerte(s) d'avertissement
                  </span>
                </div>
                <div className="space-y-2">
                  {warningAlerts.map((alert) => (
                    <AlertDescription
                      key={alert.id}
                      className="text-sm text-yellow-800 flex items-center justify-between"
                    >
                      <span>
                        {alert.employeeName && (
                          <strong>{alert.employeeName}: </strong>
                        )}
                        {alert.message}
                        {alert.date && (
                          <span className="text-yellow-600 ml-2">({alert.date})</span>
                        )}
                      </span>
                      {onDismiss && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 w-6 p-0 text-yellow-600 hover:text-yellow-800 hover:bg-yellow-100 ml-2"
                          onClick={() => onDismiss(alert.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </AlertDescription>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Alert>
      )}
    </div>
  );
}

