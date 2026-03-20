'use client';

import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
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
      value: stats?.projectCount ?? 0,
      href: '/portal/projects',
      accent: 'text-qualia-600 dark:text-qualia-400',
      dotColor: 'bg-qualia-500',
    },
    {
      label: 'Pending requests',
      value: stats?.pendingRequests ?? 0,
      href: '/portal/requests',
      accent: 'text-amber-600 dark:text-amber-400',
      dotColor: 'bg-amber-500',
    },
    {
      label: 'Unpaid invoices',
      value: stats?.unpaidInvoiceCount ?? 0,
      href: '/portal/billing',
      accent: 'text-rose-600 dark:text-rose-400',
      dotColor: 'bg-rose-500',
      suffix: stats?.unpaidTotal
        ? stats.unpaidTotal.toLocaleString('en', { style: 'currency', currency: 'EUR' })
        : undefined,
    },
  ];

  if (isLoading) {
    return (
      <div className="flex gap-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-8 w-10 rounded" />
            <Skeleton className="h-3 w-20 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-x-10 gap-y-4">
      {metrics.map((metric) => {
        const isEmpty = metric.value === 0;

        return (
          <Link
            key={metric.label}
            href={metric.href}
            className="group flex items-start gap-3 transition-opacity hover:opacity-80"
          >
            <span
              className={cn(
                'mt-2.5 h-2 w-2 shrink-0 rounded-full transition-transform duration-150 group-hover:scale-125',
                isEmpty ? 'bg-muted-foreground/20' : metric.dotColor
              )}
            />
            <div>
              <p
                className={cn(
                  'text-2xl font-semibold tabular-nums leading-none tracking-tight',
                  isEmpty ? 'text-muted-foreground/30' : 'text-foreground'
                )}
              >
                {isEmpty ? '0' : metric.value}
              </p>
              <p className="mt-1 text-[12px] text-muted-foreground">{metric.label}</p>
              {metric.suffix && !isEmpty && (
                <p className="mt-0.5 text-[11px] font-medium text-rose-500/70">{metric.suffix}</p>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
