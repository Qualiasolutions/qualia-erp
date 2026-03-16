'use client';

import Link from 'next/link';
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
  const metrics = [
    {
      label: 'Active projects',
      value: stats?.projectCount || 0,
      href: '/portal/projects',
      icon: Folder,
      accent: 'text-qualia-600 dark:text-qualia-400',
      iconBg: 'bg-qualia-500/8 dark:bg-qualia-500/15',
    },
    {
      label: 'Pending requests',
      value: stats?.pendingRequests || 0,
      href: '/portal/requests',
      icon: Lightbulb,
      accent: 'text-amber-600 dark:text-amber-400',
      iconBg: 'bg-amber-500/8 dark:bg-amber-500/15',
    },
    {
      label: 'Unpaid invoices',
      value: stats?.unpaidInvoiceCount || 0,
      href: '/portal/billing',
      icon: Receipt,
      accent: 'text-rose-600 dark:text-rose-400',
      iconBg: 'bg-rose-500/8 dark:bg-rose-500/15',
      suffix: stats?.unpaidTotal
        ? stats.unpaidTotal.toLocaleString('en', { style: 'currency', currency: 'EUR' })
        : undefined,
    },
  ];

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-border bg-card px-5 py-5">
            <Skeleton className="mb-3 h-8 w-8 rounded-lg" />
            <Skeleton className="h-8 w-12 rounded" />
            <Skeleton className="mt-1.5 h-3.5 w-24 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {metrics.map((metric) => (
        <Link
          key={metric.label}
          href={metric.href}
          className={cn(
            'group relative overflow-hidden rounded-xl border border-border bg-card px-5 py-5',
            'transition-all duration-200 hover:border-border/60 hover:shadow-elevation-1'
          )}
        >
          <div
            className={cn(
              'mb-3 flex h-8 w-8 items-center justify-center rounded-lg',
              metric.iconBg
            )}
          >
            <metric.icon className={cn('h-4 w-4', metric.accent)} />
          </div>
          <p className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">
            {metric.value}
          </p>
          <p className="mt-0.5 text-[12px] text-muted-foreground transition-colors group-hover:text-muted-foreground">
            {metric.label}
          </p>
          {metric.suffix && (
            <p className="mt-1 text-[11px] font-medium text-rose-500/80">{metric.suffix}</p>
          )}
        </Link>
      ))}
    </div>
  );
}
