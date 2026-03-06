'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Folder, Lightbulb, Receipt } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardStats {
  projectCount: number;
  pendingRequests: number;
  unpaidInvoiceCount: number;
  unpaidTotal: number;
}

interface PortalDashboardStatsProps {
  stats: DashboardStats | null;
  isLoading: boolean;
}

export function PortalDashboardStats({ stats, isLoading }: PortalDashboardStatsProps) {
  const statCards = [
    {
      label: 'Active Projects',
      value: stats?.projectCount || 0,
      icon: Folder,
      href: '/portal/projects',
      color: 'text-blue-600 bg-blue-500/10',
    },
    {
      label: 'Pending Requests',
      value: stats?.pendingRequests || 0,
      icon: Lightbulb,
      href: '/portal/requests',
      color: 'text-amber-600 bg-amber-500/10',
    },
    {
      label: 'Unpaid Invoices',
      value: stats?.unpaidInvoiceCount || 0,
      icon: Receipt,
      href: '/portal/billing',
      color: 'text-red-600 bg-red-500/10',
      subtitle: stats?.unpaidTotal
        ? stats.unpaidTotal.toLocaleString('en', { style: 'currency', currency: 'EUR' })
        : undefined,
    },
  ];

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-5">
              <Skeleton className="h-12 w-12 rounded-xl" />
              <Skeleton className="mt-4 h-7 w-16" />
              <Skeleton className="mt-1.5 h-4 w-28" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {statCards.map((stat) => (
        <Link key={stat.label} href={stat.href}>
          <Card className="card-interactive h-full">
            <CardContent className="flex items-center gap-4 p-5">
              <div
                className={cn(
                  'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl',
                  stat.color
                )}
              >
                <stat.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                {stat.subtitle && (
                  <p className="mt-0.5 text-xs font-medium text-red-600">{stat.subtitle}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
