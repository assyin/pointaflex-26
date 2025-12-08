'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useEmployees } from '@/lib/hooks/useEmployees';
import { X, Search, UserPlus, Users } from 'lucide-react';

interface AddMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (employeeIds: string[]) => void;
  existingMemberIds?: string[];
  isAdding?: boolean;
}

export function AddMembersModal({
  isOpen,
  onClose,
  onAdd,
  existingMemberIds = [],
  isAdding = false,
}: AddMembersModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const { data: employeesData, isLoading } = useEmployees();
  const employees = Array.isArray(employeesData) ? employeesData : [];

  // Filter employees: exclude already in team, filter by search
  const availableEmployees = useMemo(() => {
    return employees.filter((emp: any) => {
      const notInTeam = !existingMemberIds.includes(emp.id);
      const matchesSearch =
        searchQuery === '' ||
        emp.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.matricule?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.position?.toLowerCase().includes(searchQuery.toLowerCase());
      return notInTeam && matchesSearch;
    });
  }, [employees, existingMemberIds, searchQuery]);

  const handleToggle = (employeeId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(employeeId)) {
      newSelected.delete(employeeId);
    } else {
      newSelected.add(employeeId);
    }
    setSelectedIds(newSelected);
  };

  const handleAdd = () => {
    if (selectedIds.size > 0) {
      onAdd(Array.from(selectedIds));
      setSelectedIds(new Set());
      setSearchQuery('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl max-h-[80vh] flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Ajouter des membres à l'équipe
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
        <CardContent className="flex-1 flex flex-col overflow-hidden">
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
            <Input
              placeholder="Rechercher un employé..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Selected count */}
          {selectedIds.size > 0 && (
            <div className="mb-4 p-2 bg-primary/10 rounded-md">
              <p className="text-sm font-medium text-primary">
                {selectedIds.size} employé(s) sélectionné(s)
              </p>
            </div>
          )}

          {/* Employees list */}
          <div className="flex-1 overflow-y-auto border border-border rounded-md p-4">
            {isLoading ? (
              <div className="text-center py-8 text-text-secondary">
                Chargement des employés...
              </div>
            ) : availableEmployees.length === 0 ? (
              <div className="text-center py-8 text-text-secondary">
                {searchQuery
                  ? 'Aucun employé trouvé'
                  : 'Tous les employés sont déjà dans l\'équipe'}
              </div>
            ) : (
              <div className="space-y-2">
                {availableEmployees.map((emp: any) => (
                  <div
                    key={emp.id}
                    className={`flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                      selectedIds.has(emp.id)
                        ? 'bg-primary/10 border-primary'
                        : 'hover:bg-background-hover border-border'
                    }`}
                    onClick={() => handleToggle(emp.id)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(emp.id)}
                      onChange={() => handleToggle(emp.id)}
                      className="w-4 h-4"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-text-primary">
                        {emp.firstName} {emp.lastName}
                      </p>
                      <p className="text-sm text-text-secondary">
                        Matricule: {emp.matricule} {emp.position ? `• ${emp.position}` : ''}
                      </p>
                    </div>
                    {emp.site && (
                      <Badge variant="default">{emp.site.name || emp.site}</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-4 border-t mt-4">
            <Button variant="outline" onClick={onClose} disabled={isAdding}>
              Annuler
            </Button>
            <Button
              variant="primary"
              onClick={handleAdd}
              disabled={selectedIds.size === 0 || isAdding}
            >
              {isAdding ? 'Ajout...' : `Ajouter ${selectedIds.size} membre(s)`}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

