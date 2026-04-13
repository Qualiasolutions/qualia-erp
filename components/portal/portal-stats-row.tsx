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
        ? '\u20AC0'
        : v.toLocaleString('de-DE', {
            style: 'currency',
            currency: 'EUR',
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
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-3 h-8 w-14" />
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
          <div
            key={card.label}
            className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-all duration-200 hover:border-primary/20"
          >
            {/* Subtle left accent bar */}
            <div className="absolute inset-y-0 left-0 w-[3px] bg-primary/15 transition-colors duration-200 group-hover:bg-primary/40" />

            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {card.label}
                </span>
                <p className="mt-2 text-2xl font-bold tabular-nums text-foreground">
                  {displayValue}
                </p>
              </div>
              <Icon className="h-5 w-5 text-muted-foreground/20" aria-hidden="true" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
