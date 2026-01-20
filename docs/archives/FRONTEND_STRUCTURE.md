# Structure Frontend Next.js - PointageFlex

## Architecture Next.js App Router

```
frontend/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── register/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── employees/
│   │   │   ├── page.tsx
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx
│   │   │   └── new/
│   │   │       └── page.tsx
│   │   ├── attendance/
│   │   │   ├── page.tsx
│   │   │   └── anomalies/
│   │   │       └── page.tsx
│   │   ├── shifts/
│   │   │   └── page.tsx
│   │   ├── teams/
│   │   │   └── page.tsx
│   │   ├── schedules/
│   │   │   ├── page.tsx
│   │   │   ├── week/
│   │   │   │   └── page.tsx
│   │   │   └── month/
│   │   │       └── page.tsx
│   │   ├── leaves/
│   │   │   └── page.tsx
│   │   ├── overtime/
│   │   │   └── page.tsx
│   │   ├── reports/
│   │   │   └── page.tsx
│   │   ├── settings/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── api/
│   │   └── auth/
│   │       └── [...nextauth]/
│   │           └── route.ts
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── ui/ (shadcn/ui components)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── table.tsx
│   │   ├── dialog.tsx
│   │   ├── select.tsx
│   │   ├── input.tsx
│   │   ├── badge.tsx
│   │   └── ...
│   ├── layout/
│   │   ├── sidebar.tsx
│   │   ├── header.tsx
│   │   ├── navbar.tsx
│   │   └── footer.tsx
│   ├── dashboard/
│   │   ├── stats-card.tsx
│   │   ├── recent-activity.tsx
│   │   └── quick-actions.tsx
│   ├── employees/
│   │   ├── employee-table.tsx
│   │   ├── employee-form.tsx
│   │   └── employee-card.tsx
│   ├── attendance/
│   │   ├── attendance-table.tsx
│   │   ├── clock-in-widget.tsx
│   │   └── anomaly-badge.tsx
│   ├── schedules/
│   │   ├── calendar-view.tsx
│   │   ├── week-view.tsx
│   │   ├── shift-card.tsx
│   │   └── alert-banner.tsx
│   └── shared/
│       ├── loading.tsx
│       ├── error-boundary.tsx
│       ├── pagination.tsx
│       └── search-input.tsx
├── lib/
│   ├── api/
│   │   ├── client.ts
│   │   ├── auth.ts
│   │   ├── employees.ts
│   │   ├── attendance.ts
│   │   ├── shifts.ts
│   │   ├── schedules.ts
│   │   ├── leaves.ts
│   │   └── reports.ts
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useEmployees.ts
│   │   ├── useAttendance.ts
│   │   ├── useSchedules.ts
│   │   └── useAlerts.ts
│   ├── utils/
│   │   ├── date.ts
│   │   ├── format.ts
│   │   └── validation.ts
│   └── types/
│       ├── auth.ts
│       ├── employee.ts
│       ├── attendance.ts
│       └── schedule.ts
├── providers/
│   ├── react-query-provider.tsx
│   ├── auth-provider.tsx
│   └── theme-provider.tsx
├── public/
├── .env.local
├── tailwind.config.ts
├── next.config.js
├── package.json
└── tsconfig.json
```

---

## Configuration

### package.json
```json
{
  "name": "pointageflex-frontend",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@tanstack/react-query": "^5.0.0",
    "axios": "^1.6.0",
    "zod": "^3.22.0",
    "react-hook-form": "^7.48.0",
    "@hookform/resolvers": "^3.3.0",
    "date-fns": "^3.0.0",
    "lucide-react": "^0.300.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.2.0"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "typescript": "^5",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8",
    "eslint": "^8",
    "eslint-config-next": "^14.0.0"
  }
}
```

### tailwind.config.ts
```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
    },
  },
  plugins: [],
};

export default config;
```

### .env.local
```
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
NEXT_PUBLIC_APP_NAME=PointageFlex
```

---

## API Client

### lib/api/client.ts
```typescript
import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor pour ajouter le token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const tenantId = localStorage.getItem('tenantId');
    if (tenantId) {
      config.headers['X-Tenant-ID'] = tenantId;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor pour gérer les erreurs
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expiré, tenter refresh
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`, {
            refreshToken,
          });

          const { accessToken } = response.data;
          localStorage.setItem('accessToken', accessToken);

          // Retry la requête originale
          error.config.headers.Authorization = `Bearer ${accessToken}`;
          return apiClient(error.config);
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.clear();
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
```

### lib/api/employees.ts
```typescript
import apiClient from './client';
import { Employee, CreateEmployeeDto } from '@/lib/types/employee';

export const employeesApi = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
  }) => {
    const response = await apiClient.get('/employees', { params });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiClient.get(`/employees/${id}`);
    return response.data;
  },

  create: async (data: CreateEmployeeDto) => {
    const response = await apiClient.post('/employees', data);
    return response.data;
  },

  update: async (id: string, data: Partial<CreateEmployeeDto>) => {
    const response = await apiClient.patch(`/employees/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/employees/${id}`);
    return response.data;
  },

  setBiometric: async (id: string, type: string, data: string) => {
    const response = await apiClient.post(`/employees/${id}/biometric`, {
      type,
      data,
    });
    return response.data;
  },
};
```

---

## React Query Hooks

### lib/hooks/useEmployees.ts
```typescript
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeesApi } from '@/lib/api/employees';
import { CreateEmployeeDto } from '@/lib/types/employee';

export const useEmployees = (params?: any) => {
  return useQuery({
    queryKey: ['employees', params],
    queryFn: () => employeesApi.getAll(params),
  });
};

export const useEmployee = (id: string) => {
  return useQuery({
    queryKey: ['employee', id],
    queryFn: () => employeesApi.getById(id),
    enabled: !!id,
  });
};

export const useCreateEmployee = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateEmployeeDto) => employeesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
};

export const useUpdateEmployee = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateEmployeeDto> }) =>
      employeesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
};
```

---

## Components Exemples

### components/dashboard/stats-card.tsx
```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export function StatsCard({ title, value, icon: Icon, description, trend }: StatsCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
        {trend && (
          <p className={`text-xs ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {trend.isPositive ? '+' : ''}{trend.value}% par rapport au mois dernier
          </p>
        )}
      </CardContent>
    </Card>
  );
}
```

### app/(dashboard)/dashboard/page.tsx
```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import { Users, Clock, AlertTriangle, Calendar } from 'lucide-react';
import { StatsCard } from '@/components/dashboard/stats-card';
import apiClient from '@/lib/api/client';

export default function DashboardPage() {
  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const response = await apiClient.get('/reports/dashboard');
      return response.data;
    },
  });

  if (isLoading) {
    return <div>Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Tableau de Bord</h1>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Employés"
          value={dashboard.today.totalEmployees}
          icon={Users}
        />
        <StatsCard
          title="Présents Aujourd'hui"
          value={dashboard.today.present}
          icon={Clock}
          description={`${dashboard.today.absent} absents`}
        />
        <StatsCard
          title="Retards"
          value={dashboard.today.late}
          icon={AlertTriangle}
        />
        <StatsCard
          title="En Congé"
          value={dashboard.today.onLeave}
          icon={Calendar}
        />
      </div>

      {/* Shifts du jour */}
      <Card>
        <CardHeader>
          <CardTitle>Shifts du Jour</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {dashboard.currentShifts.map((shift: any) => (
              <div key={shift.shift} className="flex justify-between items-center">
                <span className="font-medium">{shift.shift}</span>
                <span className="text-muted-foreground">
                  {shift.present}/{shift.planned} présents
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

### components/schedules/alert-banner.tsx
```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Info } from 'lucide-react';
import apiClient from '@/lib/api/client';

export function AlertBanner({ startDate, endDate }: { startDate?: string; endDate?: string }) {
  const { data: alerts } = useQuery({
    queryKey: ['schedule-alerts', startDate, endDate],
    queryFn: async () => {
      const response = await apiClient.get('/schedules/alerts', {
        params: { startDate, endDate },
      });
      return response.data;
    },
  });

  if (!alerts || alerts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {alerts.map((alert: any, index: number) => (
        <Alert
          key={index}
          variant={alert.severity === 'CRITICAL' ? 'destructive' : 'default'}
        >
          {alert.severity === 'CRITICAL' ? (
            <AlertTriangle className="h-4 w-4" />
          ) : (
            <Info className="h-4 w-4" />
          )}
          <AlertTitle>{alert.type.replace(/_/g, ' ')}</AlertTitle>
          <AlertDescription>
            {alert.employeeName && <strong>{alert.employeeName}:</strong>} {alert.message}
            <p className="text-xs text-muted-foreground mt-1">
              Note: Cette alerte est informative et ne bloque aucune opération
            </p>
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
}
```

---

## Providers

### providers/react-query-provider.tsx
```typescript
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function ReactQueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
```

### app/layout.tsx
```typescript
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ReactQueryProvider } from '@/providers/react-query-provider';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'PointageFlex - Gestion de Présence',
  description: 'Solution SaaS de gestion de présence et pointage',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className={inter.className}>
        <ReactQueryProvider>{children}</ReactQueryProvider>
      </body>
    </html>
  );
}
```

---

## Points Clés Frontend

1. **Next.js App Router** : Structure moderne avec layouts groupés
2. **React Query** : Gestion d'état et cache pour les données API
3. **Tailwind + shadcn/ui** : UI cohérente et professionnelle
4. **TypeScript** : Type-safety complet
5. **Auto-refresh tokens** : Gestion transparente de l'authentification
6. **Responsive** : Mobile-first design
7. **Alertes non bloquantes** : Affichage informatif des contraintes légales

## Installation shadcn/ui

```bash
npx shadcn-ui@latest init
npx shadcn-ui@latest add button card table dialog select input badge alert
```
