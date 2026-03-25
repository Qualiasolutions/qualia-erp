'use client';

import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { FolderOpen, Clock, FileWarning } from 'lucide-react';

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
      value: stats?.projectCount ?? 0,
      href: '/portal/projects',
      icon: FolderOpen,
      accentBg: 'bg-primary/10',
      accentText: 'text-primary dark:text-primary',
      iconColor: 'text-primary',
    },
    {
      label: 'Pending requests',
      value: stats?.pendingRequests ?? 0,
      href: '/portal/requests',
      icon: Clock,
      accentBg: 'bg-amber-500/10',
      accentText: 'text-amber-600 dark:text-amber-400',
      iconColor: 'text-amber-500',
    },
    {
      label: 'Unpaid invoices',
      value: stats?.unpaidInvoiceCount ?? 0,
      href: '/portal/billing',
      icon: FileWarning,
      accentBg: 'bg-rose-500/10',
      accentText: 'text-rose-600 dark:text-rose-400',
      iconColor: 'text-rose-500',
      suffix: stats?.unpaidTotal
        ? stats.unpaidTotal.toLocaleString('en', { style: 'currency', currency: 'EUR' })
        : undefined,
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-border bg-background/50 px-4 py-3.5">
            <Skeleton className="h-3 w-16 rounded" />
            <Skeleton className="mt-2 h-7 w-10 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-3">
      {metrics.map((metric) => {
        const isEmpty = metric.value === 0;
        const Icon = metric.icon;

        return (
          <Link
            key={metric.label}
            href={metric.href}
            className={cn(
              'group rounded-xl border border-border bg-background/50 px-4 py-3.5 backdrop-blur-sm transition-all duration-200',
              'hover:border-border hover:bg-background/80 hover:shadow-sm'
            )}
          >
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'flex h-5 w-5 items-center justify-center rounded-md',
                  isEmpty ? 'bg-muted/40' : metric.accentBg
                )}
              >
                <Icon
                  className={cn('h-3 w-3', isEmpty ? 'text-muted-foreground/30' : metric.iconColor)}
                />
              </div>
              <p className="text-[11px] text-muted-foreground/60">{metric.label}</p>
            </div>
            <p
              className={cn(
                'mt-2 text-[22px] font-semibold tabular-nums leading-none tracking-tight',
                isEmpty ? 'text-muted-foreground/25' : 'text-foreground'
              )}
            >
              {metric.value}
            </p>
            {metric.suffix && !isEmpty && (
              <p className="mt-1 text-[11px] font-medium text-rose-500/70">{metric.suffix}</p>
            )}
          </Link>
        );
      })}
    </div>
  );
}
