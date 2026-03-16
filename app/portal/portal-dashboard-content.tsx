'use client';

import { usePortalDashboard } from '@/lib/swr';
import { PortalDashboardStats } from '@/components/portal/portal-dashboard-stats';
import { PortalRecentActivity } from '@/components/portal/portal-recent-activity';
import { WhatsNextWidget } from '@/components/portal/portal-whats-next-widget';
import { PortalActionItems } from '@/components/portal/portal-action-items';
import { ArrowRight, Lightbulb, Receipt, Headphones } from 'lucide-react';
import Link from 'next/link';
import { PortalWelcomeTour } from '@/components/portal/portal-welcome-tour';

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
    accent: 'group-hover:text-amber-500',
  },
  {
    label: 'View billing',
    description: 'Invoices & payments',
    href: '/portal/billing',
    icon: Receipt,
    accent: 'group-hover:text-qualia-500',
  },
  {
    label: 'Contact support',
    description: 'Get help from our team',
    href: 'mailto:support@qualiasolutions.net',
    icon: Headphones,
    external: true,
    accent: 'group-hover:text-blue-500',
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

      {/* Welcome */}
      <div>
        <p className="text-[13px] font-medium tracking-wide text-muted-foreground">
          {now.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
          {greeting}, {welcomeName}
        </h1>
      </div>

      {/* Stats */}
      <PortalDashboardStats stats={stats} isLoading={isLoading} />

      {/* What's next */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-foreground">What&apos;s next</h2>
        <WhatsNextWidget projects={projects} isLoading={isLoading} />
      </div>

      {/* Action items */}
      <div className="space-y-3">
        <PortalActionItems clientId={clientId} />
      </div>

      {/* Projects */}
      <PortalRecentActivity projects={projects} isLoading={isLoading} isValidating={isValidating} />

      {/* Quick links */}
      <div className="grid gap-3 sm:grid-cols-3">
        {quickActions.map((action) => {
          const Wrapper = action.external ? 'a' : Link;
          const wrapperProps = action.external ? { href: action.href } : { href: action.href };

          return (
            <Wrapper
              key={action.label}
              {...wrapperProps}
              className="group flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-4 transition-all duration-200 hover:border-border/60 hover:shadow-elevation-1"
            >
              <action.icon
                className={`h-4 w-4 shrink-0 text-muted-foreground/70 transition-colors duration-200 ${action.accent}`}
              />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-foreground">{action.label}</p>
                <p className="text-[11px] text-muted-foreground">{action.description}</p>
              </div>
              <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground/15 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-muted-foreground/70" />
            </Wrapper>
          );
        })}
      </div>
    </div>
  );
}
