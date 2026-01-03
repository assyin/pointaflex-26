'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, Settings, FileText, History, BarChart3 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { EmailConfigTab } from '@/components/email-admin/email-config-tab';
import { EmailTemplatesTab } from '@/components/email-admin/email-templates-tab';
import { EmailLogsTab } from '@/components/email-admin/email-logs-tab';
import { EmailStatsTab } from '@/components/email-admin/email-stats-tab';

export default function EmailAdminPage() {
  const [activeTab, setActiveTab] = useState('config');
  const [isMounted, setIsMounted] = useState(false);
  const { hasPermission, user, isLoading } = useAuth();
  
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // Attendre que le composant soit monté et le contexte chargé
  if (!isMounted || isLoading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-text-secondary">Chargement...</p>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }
  
  // Debug: Vérifier les permissions
  const hasAccess = hasPermission('tenant.update_settings');
  
  // Si pas de permission, afficher un message clair
  if (!hasAccess) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="p-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-yellow-800 mb-2">
                ⚠️ Accès refusé
              </h2>
              <p className="text-yellow-700 mb-4">
                Vous n'avez pas la permission nécessaire pour accéder à cette page.
              </p>
              <div className="bg-white rounded p-4 mt-4">
                <p className="text-sm font-semibold mb-2">Permission requise :</p>
                <code className="bg-gray-100 px-2 py-1 rounded text-sm">tenant.update_settings</code>
                <p className="text-sm text-gray-600 mt-4 mb-2">Vos permissions actuelles :</p>
                <ul className="list-disc list-inside text-sm text-gray-700">
                  {user?.permissions?.map((perm: string) => (
                    <li key={perm}>{perm}</li>
                  )) || <li>Aucune permission trouvée</li>}
                </ul>
                <p className="text-sm text-gray-600 mt-4">
                  Votre rôle : <strong>{user?.role || 'Non défini'}</strong>
                </p>
              </div>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
              <Mail className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Gestion des Emails
              </h1>
              <p className="text-sm text-gray-500">
                Configuration SMTP, templates et historique des notifications
              </p>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="config" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Configuration
              </TabsTrigger>
              <TabsTrigger value="templates" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Templates
              </TabsTrigger>
              <TabsTrigger value="logs" className="flex items-center gap-2">
                <History className="h-4 w-4" />
                Historique
              </TabsTrigger>
              <TabsTrigger value="stats" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Statistiques
              </TabsTrigger>
            </TabsList>

            <TabsContent value="config">
              <EmailConfigTab />
            </TabsContent>

            <TabsContent value="templates">
              <EmailTemplatesTab />
            </TabsContent>

            <TabsContent value="logs">
              <EmailLogsTab />
            </TabsContent>

            <TabsContent value="stats">
              <EmailStatsTab />
            </TabsContent>
          </Tabs>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

