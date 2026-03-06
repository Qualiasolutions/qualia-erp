'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Folder, Lightbulb, Receipt, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getStaggerDelay } from '@/lib/transitions';

interface StatCardData {
  label: string;
  value: number;
  icon: LucideIcon;
  href: string;
  color: string;
  subtitle?: string;
}

interface PortalDashboardStatsProps {
  projectCount: number;
  pendingRequests: number;
  unpaidInvoiceCount: number;
  unpaidTotal: number;
}

export function PortalDashboardStats({
  projectCount,
  pendingRequests,
  unpaidInvoiceCount,
  unpaidTotal,
}: PortalDashboardStatsProps) {
  const stats: StatCardData[] = [
    {
      label: 'Active Projects',
      value: projectCount,
      icon: Folder,
      href: '/portal/projects',
      color: 'text-blue-600 bg-blue-500/10',
    },
    {
      label: 'Pending Requests',
      value: pendingRequests,
      icon: Lightbulb,
      href: '/portal/requests',
      color: 'text-amber-600 bg-amber-500/10',
    },
    {
      label: 'Unpaid Invoices',
      value: unpaidInvoiceCount,
      icon: Receipt,
      href: '/portal/billing',
      color: 'text-red-600 bg-red-500/10',
      subtitle:
        unpaidTotal > 0
          ? `${unpaidTotal.toLocaleString('en', { style: 'currency', currency: 'EUR' })}`
          : undefined,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {stats.map((stat, index) => (
        <Link key={stat.label} href={stat.href}>
          <Card className="card-interactive h-full" style={getStaggerDelay(index)}>
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
