'use client';

import { useState } from 'react';
import { useEmailLogs } from '@/lib/hooks/useEmailAdmin';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import type { EmailLogsQuery } from '@/types/email-admin';

export function EmailLogsTab() {
  const [query, setQuery] = useState<EmailLogsQuery>({
    page: 1,
    limit: 50,
  });

  const { data, isLoading } = useEmailLogs(query);

  const handleFilterChange = (key: keyof EmailLogsQuery, value: any) => {
    setQuery({ ...query, [key]: value, page: 1 });
  };

  const handlePageChange = (newPage: number) => {
    setQuery({ ...query, page: newPage });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge className="bg-green-100 text-green-800">Envoyé</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">Échec</Badge>;
      case 'queued':
        return <Badge className="bg-yellow-100 text-yellow-800">En attente</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-600" />
      </div>
    );
  }

  const logs = data?.data || [];
  const pagination = data?.pagination || { page: 1, limit: 50, total: 0, totalPages: 0 };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label htmlFor="type">Type</Label>
            <select
              id="type"
              value={query.type || ''}
              onChange={(e) => handleFilterChange('type', e.target.value || undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tous</option>
              <option value="MISSING_OUT">MISSING_OUT</option>
              <option value="MISSING_IN">MISSING_IN</option>
              <option value="TEST">TEST</option>
              <option value="CUSTOM">CUSTOM</option>
            </select>
          </div>

          <div>
            <Label htmlFor="status">Statut</Label>
            <select
              id="status"
              value={query.status || ''}
              onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tous</option>
              <option value="sent">Envoyé</option>
              <option value="failed">Échec</option>
              <option value="queued">En attente</option>
            </select>
          </div>

          <div>
            <Label htmlFor="startDate">Date début</Label>
            <Input
              id="startDate"
              type="date"
              value={query.startDate || ''}
              onChange={(e) => handleFilterChange('startDate', e.target.value || undefined)}
            />
          </div>

          <div>
            <Label htmlFor="endDate">Date fin</Label>
            <Input
              id="endDate"
              type="date"
              value={query.endDate || ''}
              onChange={(e) => handleFilterChange('endDate', e.target.value || undefined)}
            />
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Destinataire</TableHead>
                <TableHead>Sujet</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Erreur</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    Aucun log trouvé
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      {new Date(log.sentAt).toLocaleString('fr-FR')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="default">{log.type}</Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{log.to}</TableCell>
                    <TableCell className="max-w-xs truncate">{log.subject}</TableCell>
                    <TableCell>{getStatusBadge(log.status)}</TableCell>
                    <TableCell className="max-w-xs">
                      {log.error ? (
                        <span className="text-red-600 text-sm truncate block" title={log.error}>
                          {log.error}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t">
            <div className="text-sm text-gray-600">
              Page {pagination.page} sur {pagination.totalPages} ({pagination.total} résultats)
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
              >
                <ChevronLeft className="w-4 h-4" />
                Précédent
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
              >
                Suivant
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
