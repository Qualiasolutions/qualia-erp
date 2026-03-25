'use client';

import { usePortalDashboard } from '@/lib/swr';
import { PortalDashboardStats } from '@/components/portal/portal-dashboard-stats';
import { PortalRecentActivity } from '@/components/portal/portal-recent-activity';
import { WhatsNextWidget } from '@/components/portal/portal-whats-next-widget';
import { PortalActionItems } from '@/components/portal/portal-action-items';
import { ArrowRight, Lightbulb, Receipt, Headphones } from 'lucide-react';
import Link from 'next/link';
import { PortalWelcomeTour } from '@/components/portal/portal-welcome-tour';
import { fadeInClasses, getStaggerDelay } from '@/lib/transitions';
import { cn } from '@/lib/utils';

interface PortalDashboardContentProps {
  clientId: string;
  displayName: string;
  companyName?: string | null;
}

interface DashboardStats {
  projectCount: number;
  pendingRequests: number;
  unpaidInvoiceCount: number;
  unpaidTotal: number;
  recentActivity: Array<{
    id: string;
    action_type: string;
    action_data: Record<string, unknown>;
    created_at: string;
    project: { id: string; name: string } | null;
  }>;
}

interface ProjectWithPhases {
  id: string;
  name: string;
  status: string;
  project_type: string | null;
  description: string | null;
  progress: number;
  totalPhases: number;
  completedPhases: number;
  currentPhase: { name: string; status: string } | null;
  nextPhase: { name: string } | null;
}

const quickActions = [
  {
    label: 'Submit a request',
    description: 'Feature idea or change',
    href: '/portal/requests',
    icon: Lightbulb,
    gradient: 'from-amber-500/10 to-orange-500/5',
    iconColor: 'text-amber-500',
  },
  {
    label: 'View billing',
    description: 'Invoices & payments',
    href: '/portal/billing',
    icon: Receipt,
    gradient: 'from-emerald-500/10 to-teal-500/5',
    iconColor: 'text-emerald-500',
  },
  {
    label: 'Contact support',
    description: 'Get help from our team',
    href: 'mailto:support@qualiasolutions.net',
    icon: Headphones,
    external: true,
    gradient: 'from-violet-500/10 to-indigo-500/5',
    iconColor: 'text-violet-500',
  },
];

export function PortalDashboardContent({
  clientId,
  displayName,
  companyName,
}: PortalDashboardContentProps) {
  const { data, isLoading, isValidating } = usePortalDashboard(clientId);

  const stats = (data.stats as DashboardStats | null) || null;
  const projects = (data.projects as ProjectWithPhases[]) || [];

  const now = new Date();
  const greeting =
    now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening';

  const firstName = displayName.split(' ')[0];
  const welcomeName = companyName || firstName;

  return (
    <div className="space-y-10">
      {/* Welcome tour for first-time clients */}
      <PortalWelcomeTour displayName={displayName} companyName={companyName} />

      {/* Hero greeting with date */}
      <div className={cn(fadeInClasses)} style={getStaggerDelay(0)}>
        <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card to-muted/20 px-8 py-8">
          {/* Subtle decorative accent */}
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/[0.03] blur-3xl" />
          <div className="absolute -bottom-32 -left-16 h-48 w-48 rounded-full bg-primary/[0.02] blur-2xl" />

          <div className="relative">
            <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground/40">
              {now.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </p>
            <h1 className="mt-2 text-[28px] font-semibold tracking-tight text-foreground sm:text-[32px]">
              {greeting}, {welcomeName}
            </h1>

            {/* Stats row inside hero */}
            <div className="mt-8">
              <PortalDashboardStats stats={stats} isLoading={isLoading} />
            </div>
          </div>
        </div>
      </div>

      {/* Two-column layout: What's Next + Action Items */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* What's next — wider */}
        {(isLoading || projects.length > 0) && (
          <div className={cn('lg:col-span-3', fadeInClasses)} style={getStaggerDelay(1)}>
            <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/50">
              What&apos;s next
            </h2>
            <WhatsNextWidget projects={projects} isLoading={isLoading} />
          </div>
        )}

        {/* Action items — narrower sidebar */}
        <div
          className={cn(
            isLoading || projects.length > 0 ? 'lg:col-span-2' : 'lg:col-span-5',
            fadeInClasses
          )}
          style={getStaggerDelay(2)}
        >
          <PortalActionItems clientId={clientId} />
        </div>
      </div>

      {/* Projects overview */}
      <div className={cn(fadeInClasses)} style={getStaggerDelay(3)}>
        <PortalRecentActivity
          projects={projects}
          isLoading={isLoading}
          isValidating={isValidating}
        />
      </div>

      {/* Quick actions — card style */}
      <div className={cn('grid gap-3 sm:grid-cols-3', fadeInClasses)} style={getStaggerDelay(4)}>
        {quickActions.map((action) => {
          const Wrapper = action.external ? 'a' : Link;
          const Icon = action.icon;

          return (
            <Wrapper
              key={action.label}
              href={action.href}
              className={cn(
                'group relative overflow-hidden rounded-xl border border-border bg-gradient-to-br px-5 py-4 transition-all duration-200',
                'hover:border-border/80 hover:shadow-md hover:shadow-black/[0.03]',
                action.gradient
              )}
            >
              <div className="flex items-center gap-3.5">
                <div
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background/80 shadow-sm transition-transform duration-200 group-hover:scale-105',
                    'border border-border'
                  )}
                >
                  <Icon className={cn('h-4 w-4', action.iconColor)} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-foreground">{action.label}</p>
                  <p className="text-[11px] text-muted-foreground/60">{action.description}</p>
                </div>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/20 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-muted-foreground/50" />
              </div>
            </Wrapper>
          );
        })}
      </div>
    </div>
  );
}
