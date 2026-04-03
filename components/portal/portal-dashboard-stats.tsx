'use client';

import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { FolderKanban, FileText, Receipt } from 'lucide-react';

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
      icon: FolderKanban,
      iconBg: 'bg-primary/15 text-primary',
      orbColor: 'from-primary/10 to-transparent',
      hoverBorder: 'hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5',
    },
    {
      label: 'Pending requests',
      value: stats?.pendingRequests ?? 0,
      href: '/portal/requests',
      icon: FileText,
      iconBg: 'bg-amber-500/15 text-amber-500',
      orbColor: 'from-amber-500/10 to-transparent',
      hoverBorder: 'hover:border-amber-500/30 hover:shadow-lg hover:shadow-amber-500/5',
    },
    {
      label: 'Unpaid invoices',
      value: stats?.unpaidInvoiceCount ?? 0,
      href: '/portal/billing',
      icon: Receipt,
      iconBg: 'bg-rose-500/15 text-rose-500',
      orbColor: 'from-rose-500/10 to-transparent',
      hoverBorder: 'hover:border-rose-500/30 hover:shadow-lg hover:shadow-rose-500/5',
      suffix: stats?.unpaidTotal
        ? stats.unpaidTotal.toLocaleString('en', { style: 'currency', currency: 'EUR' })
        : undefined,
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-6">
            <div className="mb-4 flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <Skeleton className="h-4 w-24 rounded" />
            </div>
            <Skeleton className="h-10 w-12 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
      {metrics.map((metric) => {
        const Icon = metric.icon;

        return (
          <Link
            key={metric.label}
            href={metric.href}
            className={cn(
              'group relative overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all',
              metric.hoverBorder
            )}
          >
            {/* Decorative gradient orb */}
            <div
              className={cn(
                'absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br',
                metric.orbColor
              )}
            />
            <div className="relative">
              <div className="mb-4 flex items-center gap-3">
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-xl',
                    metric.iconBg
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">{metric.label}</span>
              </div>
              <p className="text-4xl font-semibold tabular-nums text-foreground">{metric.value}</p>
              {metric.suffix && metric.value > 0 && (
                <p className="mt-1 text-sm font-medium text-rose-500/70">{metric.suffix}</p>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
