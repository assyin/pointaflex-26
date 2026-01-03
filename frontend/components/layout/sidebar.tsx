'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  Users,
  Clock,
  Calendar,
  Briefcase,
  TrendingUp,
  FileText,
  Settings,
  UserCircle,
  Shield,
  Wifi,
  UsersRound,
  AlertTriangle,
  Building2,
  KeyRound,
  Mail,
} from 'lucide-react';

interface MenuItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string; // Permission unique requise
  permissions?: string[]; // Plusieurs permissions (au moins une requise)
  requireAll?: boolean; // Si true, nécessite toutes les permissions
  public?: boolean; // Si true, accessible à tous les utilisateurs authentifiés
}

const menuItems: MenuItem[] = [
  {
    label: 'Tableau de bord',
    href: '/dashboard',
    icon: LayoutDashboard,
    public: true, // Accessible à tous
  },
  {
    label: 'Employés',
    href: '/employees',
    icon: Users,
    permissions: ['employee.view_all', 'employee.view_own', 'employee.view_team', 'employee.view_department', 'employee.view_site'],
  },
  {
    label: 'Pointages',
    href: '/attendance',
    icon: Clock,
    permissions: ['attendance.view_all', 'attendance.view_own', 'attendance.view_team', 'attendance.view_department', 'attendance.view_site'],
  },
  {
    label: 'Shifts & Planning',
    href: '/shifts-planning',
    icon: Calendar,
    permissions: ['schedule.view_all', 'schedule.view_own', 'schedule.view_team', 'schedule.view_department', 'schedule.view_site'],
  },
  {
    label: 'Alertes de Conformité',
    href: '/schedule-alerts',
    icon: AlertTriangle,
    permission: 'attendance.view_anomalies',
  },
  {
    label: 'Équipes',
    href: '/teams',
    icon: UsersRound,
    permission: 'employee.view_team',
  },
  {
    label: 'Structure RH',
    href: '/structure-rh',
    icon: Building2,
    permissions: ['tenant.manage_departments', 'tenant.manage_positions', 'tenant.manage_teams'],
  },
  {
    label: 'Congés & Absences',
    href: '/leaves',
    icon: Briefcase,
    permissions: ['leave.view_all', 'leave.view_own', 'leave.view_team', 'leave.view_department', 'leave.view_site'],
  },
  {
    label: 'Heures supplémentaires',
    href: '/overtime',
    icon: TrendingUp,
    permissions: ['overtime.view_all', 'overtime.view_own', 'overtime.view_department', 'overtime.view_site'],
  },
  {
    label: 'Terminaux',
    href: '/terminals',
    icon: Wifi,
    permission: 'tenant.manage_devices',
  },
  {
    label: 'Rapports',
    href: '/reports',
    icon: FileText,
    permissions: ['reports.view_all', 'reports.view_attendance', 'reports.view_leaves', 'reports.view_overtime'],
  },
  {
    label: 'Audit',
    href: '/audit',
    icon: Shield,
    permission: 'audit.view_all',
  },
  {
    label: 'Gestion des accès',
    href: '/rbac',
    icon: KeyRound,
    permission: 'role.view_all',
  },
  {
    label: 'Paramètres',
    href: '/settings',
    icon: Settings,
    permissions: ['tenant.view_settings', 'tenant.update_settings'],
  },
  {
    label: 'Gestion des Emails',
    href: '/email-admin',
    icon: Mail,
    permission: 'tenant.update_settings',
  },
  {
    label: 'Profil',
    href: '/profile',
    icon: UserCircle,
    public: true, // Accessible à tous
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { hasPermission, hasAnyPermission, hasAllPermissions, user } = useAuth();

  // Filtrer les items de menu selon les permissions
  const visibleMenuItems = menuItems.filter((item) => {
    // Items publics accessibles à tous
    if (item.public) {
      return true;
    }

    // Vérifier une permission unique
    if (item.permission) {
      return hasPermission(item.permission);
    }

    // Vérifier plusieurs permissions
    if (item.permissions && item.permissions.length > 0) {
      if (item.requireAll) {
        return hasAllPermissions(item.permissions);
      } else {
        return hasAnyPermission(item.permissions);
      }
    }

    // Si aucune permission n'est spécifiée, masquer par défaut
    return false;
  });

  return (
    <aside className="w-sidebar h-screen bg-background-card border-r border-border-light flex flex-col fixed left-0 top-0 z-30">
      {/* Logo */}
      <div className="p-6 border-b border-border-light">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">PF</span>
          </div>
          <div>
            <h2 className="font-bold text-lg text-text-primary">PointageFlex</h2>
            <p className="text-small text-text-secondary">Entreprise - Casablanca</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-1">
          {visibleMenuItems.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
            const Icon = item.icon;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200',
                    'hover:bg-primary/10',
                    isActive
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'text-text-secondary hover:text-text-primary'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer info */}
      <div className="p-4 border-t border-border-light text-small text-text-secondary space-y-1">
        <p>
          Connecté comme{' '}
          <span className="font-semibold text-text-primary">
            {user?.firstName || 'Utilisateur'}
          </span>
        </p>
        <p className="text-xs">Dernière synchro biométrique : 08:42</p>
      </div>
    </aside>
  );
}
