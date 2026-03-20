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
  },
  {
    label: 'View billing',
    description: 'Invoices & payments',
    href: '/portal/billing',
    icon: Receipt,
  },
  {
    label: 'Contact support',
    description: 'Get help from our team',
    href: 'mailto:support@qualiasolutions.net',
    icon: Headphones,
    external: true,
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
    <div className="space-y-12">
      {/* Welcome tour for first-time clients */}
      <PortalWelcomeTour displayName={displayName} companyName={companyName} />

      {/* Welcome + stats section */}
      <div className={cn(fadeInClasses)} style={getStaggerDelay(0)}>
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground/50">
          {now.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </p>
        <h1 className="mt-1.5 text-[26px] font-semibold tracking-tight text-foreground">
          {greeting}, {welcomeName}
        </h1>

        {/* Stats inline below greeting */}
        <div className="mt-6">
          <PortalDashboardStats stats={stats} isLoading={isLoading} />
        </div>
      </div>

      {/* What's next — project phase progress */}
      {(isLoading || projects.length > 0) && (
        <div className={cn(fadeInClasses)} style={getStaggerDelay(1)}>
          <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/50">
            What&apos;s next
          </h2>
          <WhatsNextWidget projects={projects} isLoading={isLoading} />
        </div>
      )}

      {/* Action items */}
      <div className={cn(fadeInClasses)} style={getStaggerDelay(2)}>
        <PortalActionItems clientId={clientId} />
      </div>

      {/* Projects overview */}
      <div className={cn(fadeInClasses)} style={getStaggerDelay(3)}>
        <PortalRecentActivity
          projects={projects}
          isLoading={isLoading}
          isValidating={isValidating}
        />
      </div>

      {/* Quick actions */}
      <div className={cn('flex flex-wrap gap-3', fadeInClasses)} style={getStaggerDelay(4)}>
        {quickActions.map((action) => {
          const Wrapper = action.external ? 'a' : Link;
          const Icon = action.icon;

          return (
            <Wrapper
              key={action.label}
              href={action.href}
              className="group flex items-center gap-3 rounded-lg border border-border/50 px-4 py-3 transition-all duration-150 hover:border-border hover:bg-muted/30"
            >
              <Icon className="h-3.5 w-3.5 text-muted-foreground/50 transition-colors group-hover:text-muted-foreground" />
              <div>
                <p className="text-[13px] font-medium text-foreground">{action.label}</p>
                <p className="text-[11px] text-muted-foreground/60">{action.description}</p>
              </div>
              <ArrowRight className="ml-2 h-3 w-3 text-muted-foreground/20 transition-all duration-150 group-hover:translate-x-0.5 group-hover:text-muted-foreground/50" />
            </Wrapper>
          );
        })}
      </div>
    </div>
  );
}
