'use client';

import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Folder, Lightbulb, Receipt } from 'lucide-react';

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
      accent: 'text-qualia-600 dark:text-qualia-400',
      bar: 'from-qualia-600 to-qualia-400',
      icon: Folder,
      iconBg: 'bg-qualia-500/8 dark:bg-qualia-500/10',
      iconColor: 'text-qualia-500/60 dark:text-qualia-400/70',
    },
    {
      label: 'Pending requests',
      value: stats?.pendingRequests ?? 0,
      href: '/portal/requests',
      accent: 'text-amber-600 dark:text-amber-400',
      bar: 'from-amber-500 to-amber-400',
      icon: Lightbulb,
      iconBg: 'bg-amber-500/8 dark:bg-amber-500/10',
      iconColor: 'text-amber-500/60 dark:text-amber-400/70',
    },
    {
      label: 'Unpaid invoices',
      value: stats?.unpaidInvoiceCount ?? 0,
      href: '/portal/billing',
      accent: 'text-rose-600 dark:text-rose-400',
      bar: 'from-rose-600 to-rose-400',
      icon: Receipt,
      iconBg: 'bg-rose-500/8 dark:bg-rose-500/10',
      iconColor: 'text-rose-500/60 dark:text-rose-400/70',
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
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <Skeleton className="h-9 w-12 rounded" />
                <Skeleton className="h-3 w-24 rounded" />
              </div>
              <Skeleton className="h-7 w-7 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        const isEmpty = metric.value === 0;

        return (
          <Link
            key={metric.label}
            href={metric.href}
            className={cn(
              'group relative overflow-hidden rounded-xl border border-border bg-card px-5 py-5',
              'transition-all duration-200 hover:border-border/60 hover:shadow-elevation-1'
            )}
          >
            {/* Thicker gradient top bar */}
            <div
              className={cn(
                'absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r opacity-50',
                metric.bar
              )}
            />

            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {/* Value */}
                <p
                  className={cn(
                    'text-[30px] font-semibold tabular-nums leading-none tracking-tight',
                    isEmpty ? 'text-muted-foreground/30' : 'text-foreground'
                  )}
                >
                  {isEmpty ? '—' : metric.value}
                </p>
                <p
                  className={cn(
                    'mt-1.5 text-[12px]',
                    isEmpty ? 'text-muted-foreground/40' : 'text-muted-foreground'
                  )}
                >
                  {metric.label}
                </p>
                {metric.suffix && !isEmpty && (
                  <p className="mt-1 text-[11px] font-medium text-rose-500/80">{metric.suffix}</p>
                )}
              </div>

              {/* Icon */}
              <div
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
                  metric.iconBg
                )}
              >
                <Icon className={cn('h-3.5 w-3.5', metric.iconColor)} />
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
