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
      iconColor: 'text-qualia-600',
    },
    {
      label: 'Pending Requests',
      value: stats?.pendingRequests || 0,
      icon: Lightbulb,
      href: '/portal/requests',
      iconColor: 'text-amber-500',
    },
    {
      label: 'Unpaid Invoices',
      value: stats?.unpaidInvoiceCount || 0,
      icon: Receipt,
      href: '/portal/billing',
      iconColor: 'text-red-500',
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
          <Card className="card-interactive group relative h-full overflow-hidden border-b-2 border-transparent transition-colors duration-300 hover:border-qualia-500/30">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent" />
              <div
                className={cn(
                  'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl',
                  'bg-gradient-to-br from-qualia-500/15 to-qualia-600/5 ring-1 ring-qualia-500/10',
                  stat.iconColor
                )}
              >
                <stat.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-3xl font-bold tabular-nums tracking-tight text-foreground">
                  {stat.value}
                </p>
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
