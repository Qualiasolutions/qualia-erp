'use client';

import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';

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
    },
    {
      label: 'Pending requests',
      value: stats?.pendingRequests || 0,
      href: '/portal/requests',
    },
    {
      label: 'Unpaid invoices',
      value: stats?.unpaidInvoiceCount || 0,
      href: '/portal/billing',
      suffix: stats?.unpaidTotal
        ? stats.unpaidTotal.toLocaleString('en', { style: 'currency', currency: 'EUR' })
        : undefined,
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-border/40 bg-border/40">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-card px-5 py-4">
            <Skeleton className="h-8 w-10 rounded" />
            <Skeleton className="mt-1.5 h-3.5 w-20 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-border/40 bg-border/40">
      {metrics.map((metric) => (
        <Link
          key={metric.label}
          href={metric.href}
          className="group bg-card px-5 py-4 transition-colors duration-150 hover:bg-muted/30"
        >
          <p className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">
            {metric.value}
          </p>
          <p className="mt-0.5 text-[12px] text-muted-foreground/60 transition-colors group-hover:text-muted-foreground">
            {metric.label}
          </p>
          {metric.suffix && (
            <p className="mt-0.5 text-[11px] font-medium text-red-500/80">{metric.suffix}</p>
          )}
        </Link>
      ))}
    </div>
  );
}
