'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { FolderKanban, CircleCheck, MessageSquare, Receipt } from 'lucide-react';

interface PortalStatsRowProps {
  stats: {
    projectCount: number;
    pendingRequests: number;
    unpaidInvoiceCount: number;
    unpaidTotal: number;
  } | null;
  isLoading: boolean;
}

const statCards = [
  {
    label: 'Active Projects',
    key: 'projectCount' as const,
    icon: FolderKanban,
    format: (v: number) => String(v),
  },
  {
    label: 'Pending Tasks',
    key: 'pendingRequests' as const,
    icon: CircleCheck,
    format: (v: number) => String(v),
  },
  {
    label: 'Messages',
    key: null,
    icon: MessageSquare,
    format: () => '0',
  },
  {
    label: 'Outstanding',
    key: 'unpaidTotal' as const,
    icon: Receipt,
    format: (v: number) =>
      v === 0
        ? '$0'
        : v.toLocaleString('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }),
  },
];

export function PortalStatsRow({ stats, isLoading }: PortalStatsRowProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-5 w-5 rounded" />
            </div>
            <Skeleton className="mt-3 h-7 w-16" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {statCards.map((card) => {
        const Icon = card.icon;
        const rawValue = card.key ? (stats?.[card.key] ?? 0) : 0;
        const displayValue = card.format(rawValue);

        return (
          <div key={card.label} className="relative rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {card.label}
              </span>
              <Icon className="h-5 w-5 text-muted-foreground/20" />
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums text-foreground">{displayValue}</p>
          </div>
        );
      })}
    </div>
  );
}
