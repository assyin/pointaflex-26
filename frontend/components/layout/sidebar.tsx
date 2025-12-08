'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
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
} from 'lucide-react';

const menuItems = [
  {
    label: 'Tableau de bord',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Employés',
    href: '/employees',
    icon: Users,
  },
  {
    label: 'Pointages',
    href: '/attendance',
    icon: Clock,
  },
  {
    label: 'Shifts & Planning',
    href: '/shifts-planning',
    icon: Calendar,
  },
  {
    label: 'Alertes de Conformité',
    href: '/schedule-alerts',
    icon: AlertTriangle,
  },
  {
    label: 'Équipes',
    href: '/teams',
    icon: UsersRound,
  },
  {
    label: 'Structure RH',
    href: '/structure-rh',
    icon: Building2,
  },
  {
    label: 'Congés & Absences',
    href: '/leaves',
    icon: Briefcase,
  },
  {
    label: 'Heures supplémentaires',
    href: '/overtime',
    icon: TrendingUp,
  },
  {
    label: 'Terminaux',
    href: '/terminals',
    icon: Wifi,
  },
  {
    label: 'Rapports',
    href: '/reports',
    icon: FileText,
  },
  {
    label: 'Audit',
    href: '/audit',
    icon: Shield,
  },
  {
    label: 'Paramètres',
    href: '/settings',
    icon: Settings,
  },
  {
    label: 'Profil',
    href: '/profile',
    icon: UserCircle,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-sidebar h-screen bg-background-card border-r border-border-light flex flex-col fixed left-0 top-0">
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
          {menuItems.map((item) => {
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
        <p>Connecté comme <span className="font-semibold text-text-primary">Admin</span></p>
        <p className="text-xs">Dernière synchro biométrique : 08:42</p>
      </div>
    </aside>
  );
}
