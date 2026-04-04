'use client';

import { usePortalDashboard } from '@/lib/swr';
import { PortalDashboardStats } from '@/components/portal/portal-dashboard-stats';
import { PortalRecentActivity } from '@/components/portal/portal-recent-activity';
import { WhatsNextWidget } from '@/components/portal/portal-whats-next-widget';
import { PortalActionItems } from '@/components/portal/portal-action-items';
import { ArrowRight, Folder, Headphones, Lightbulb } from 'lucide-react';
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
    iconBg: 'bg-primary/20 text-primary',
  },
  {
    label: 'View projects',
    description: 'See all your projects',
    href: '/portal/projects',
    icon: Folder,
    iconBg: 'bg-qualia-500/20 text-qualia-600 dark:text-qualia-400',
  },
  {
    label: 'Contact support',
    description: 'Get help from our team',
    href: 'mailto:support@qualiasolutions.net',
    icon: Headphones,
    external: true,
    iconBg: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
  },
];

export function PortalDashboardContent({
  clientId,
  displayName,
  companyName,
}: PortalDashboardContentProps) {
  const { data, isLoading, isValidating, isError } = usePortalDashboard(clientId);

  const stats = (data.stats as DashboardStats | null) || null;
  const projects = (data.projects as ProjectWithPhases[]) || [];

  const now = new Date();
  const greeting =
    now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening';

  const firstName = displayName.split(' ')[0];
  const welcomeName = companyName || firstName;

  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
  const monthName = now.toLocaleDateString('en-US', { month: 'long' });
  const dayNum = now.getDate();

  return (
    <div className="space-y-0">
      {/* Welcome tour for first-time clients */}
      <PortalWelcomeTour displayName={displayName} companyName={companyName} />

      {/* Header — clean greeting with gradient name */}
      <div className={cn('mb-10', fadeInClasses)} style={getStaggerDelay(0)}>
        <p className="mb-2 text-sm font-medium uppercase tracking-widest text-muted-foreground">
          {dayName}, {monthName} {dayNum}
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-foreground">
          {greeting},{' '}
          <span className="bg-gradient-to-r from-primary to-qualia-400 bg-clip-text text-transparent">
            {welcomeName}
          </span>
        </h1>
      </div>

      {/* Error banner */}
      {isError && !isLoading && (
        <div className="mb-6 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Something went wrong loading your dashboard. Data shown may be outdated.
        </div>
      )}

      {/* Stats Grid — big cards with gradient orbs */}
      <div className={cn('mb-10', fadeInClasses)} style={getStaggerDelay(1)}>
        <PortalDashboardStats stats={stats} isLoading={isLoading} />
      </div>

      {/* Two Column Layout — Action Items + Projects */}
      <div
        className={cn('mb-6 grid grid-cols-1 gap-6 lg:grid-cols-5', fadeInClasses)}
        style={getStaggerDelay(2)}
      >
        {/* Action items — left column */}
        <div className="lg:col-span-2">
          <PortalActionItems clientId={clientId} />
        </div>

        {/* What's next / Projects — right column */}
        <div className="lg:col-span-3">
          {isLoading || projects.length > 0 ? (
            <div>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Your Projects
              </h2>
              <WhatsNextWidget projects={projects} isLoading={isLoading} />
            </div>
          ) : (
            <PortalRecentActivity
              projects={projects}
              isLoading={isLoading}
              isValidating={isValidating}
            />
          )}
        </div>
      </div>

      {/* Projects overview — only show if there are projects and we showed WhatsNext above */}
      {projects.length > 0 && (
        <div className={cn('mb-6', fadeInClasses)} style={getStaggerDelay(3)}>
          <PortalRecentActivity
            projects={projects}
            isLoading={isLoading}
            isValidating={isValidating}
          />
        </div>
      )}

      {/* Quick Actions — 3-column cards with chevron arrows */}
      <div
        className={cn('grid grid-cols-1 gap-5 sm:grid-cols-3', fadeInClasses)}
        style={getStaggerDelay(4)}
      >
        {quickActions.map((action) => {
          const Wrapper = action.external ? 'a' : Link;
          const Icon = action.icon;

          return (
            <Wrapper
              key={action.label}
              href={action.href}
              {...(action.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-border bg-card p-5 text-left transition-all hover:border-primary/30 hover:shadow-lg"
            >
              <div
                className={cn(
                  'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl',
                  action.iconBg
                )}
              >
                <Icon className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground">{action.label}</p>
                <p className="text-sm text-muted-foreground">{action.description}</p>
              </div>
              <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" />
            </Wrapper>
          );
        })}
      </div>
    </div>
  );
}
