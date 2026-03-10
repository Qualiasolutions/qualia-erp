'use client';

import { usePortalDashboard } from '@/lib/swr';
import { PortalDashboardStats } from '@/components/portal/portal-dashboard-stats';
import { PortalRecentActivity } from '@/components/portal/portal-recent-activity';
import { WhatsNextWidget } from '@/components/portal/portal-whats-next-widget';
import { PortalActionItems } from '@/components/portal/portal-action-items';
import { ArrowRight, Lightbulb, Receipt, Headphones } from 'lucide-react';
import Link from 'next/link';

interface PortalDashboardContentProps {
  clientId: string;
  displayName: string;
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

export function PortalDashboardContent({ clientId, displayName }: PortalDashboardContentProps) {
  const { data, isLoading, isValidating } = usePortalDashboard(clientId);

  const stats = (data.stats as DashboardStats | null) || null;
  const projects = (data.projects as ProjectWithPhases[]) || [];

  const now = new Date();
  const greeting =
    now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening';

  const firstName = displayName.split(' ')[0];

  return (
    <div className="space-y-10">
      {/* Welcome — minimal, typographic */}
      <div>
        <p className="text-[13px] font-medium text-muted-foreground/60">
          {now.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
          {greeting}, {firstName}
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

      {/* Quick links — horizontal, minimal */}
      <div className="grid gap-px overflow-hidden rounded-lg border border-border/40 bg-border/40 sm:grid-cols-3">
        {quickActions.map((action) => {
          const Wrapper = action.external ? 'a' : Link;
          const wrapperProps = action.external ? { href: action.href } : { href: action.href };

          return (
            <Wrapper
              key={action.label}
              {...wrapperProps}
              className="group flex items-center gap-3 bg-card px-4 py-3.5 transition-colors duration-150 hover:bg-muted/30"
            >
              <action.icon className="h-4 w-4 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-qualia-600" />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-foreground">{action.label}</p>
                <p className="text-[11px] text-muted-foreground/60">{action.description}</p>
              </div>
              <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground/20 transition-all duration-150 group-hover:translate-x-0.5 group-hover:text-muted-foreground/50" />
            </Wrapper>
          );
        })}
      </div>
    </div>
  );
}
