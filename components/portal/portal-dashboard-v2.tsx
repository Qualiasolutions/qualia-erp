'use client';

import React from 'react';
import Link from 'next/link';
import {
  FolderKanban,
  Lightbulb,
  Receipt,
  PackageOpen,
  Activity,
  ArrowUpRight,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { PortalStatsRow } from '@/components/portal/portal-stats-row';
import { PortalActionItems } from '@/components/portal/portal-action-items';
import { cn } from '@/lib/utils';

interface PortalStatsData {
  projectCount: number;
  pendingRequests: number;
  unpaidInvoiceCount: number;
  unpaidTotal: number;
}

interface RecentActivityItem {
  id: string;
  action_type: string;
  action_data: Record<string, unknown>;
  created_at: string;
  actor?: { id: string; full_name: string | null; avatar_url: string | null } | null;
  project: { id: string; name: string } | null;
}

interface PortalProject {
  id: string;
  name: string;
  status: string;
  project_type: string;
  description?: string;
  progress: number;
  totalPhases: number;
  completedPhases: number;
  currentPhase?: string;
}

interface PortalDashboardV2Props {
  stats: PortalStatsData | null;
  projects: PortalProject[];
  recentActivity: RecentActivityItem[];
  isLoading: boolean;
  isError: boolean;
  clientId: string;
  displayName: string;
  companyName?: string;
}

const quickActions = [
  {
    title: 'Submit a request',
    description: 'Share a feature idea or request a change',
    href: '/requests',
    icon: Lightbulb,
  },
  {
    title: 'View all projects',
    description: 'See progress across all your projects',
    href: '/projects',
    icon: FolderKanban,
  },
  {
    title: 'View billing',
    description: 'Check invoices and payment history',
    href: '/billing',
    icon: Receipt,
  },
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function formatDate(): string {
  const now = new Date();
  return now
    .toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
    .toUpperCase();
}

function getStatusBadgeClasses(status: string): string {
  const s = status.toLowerCase();
  if (s === 'active' || s === 'in progress') {
    return 'bg-primary/10 text-primary';
  }
  if (s === 'done' || s === 'launched' || s === 'completed') {
    return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400';
  }
  if (s === 'delayed') {
    return 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400';
  }
  if (s === 'demos' || s === 'todo') {
    return 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400';
  }
  return 'bg-muted text-muted-foreground';
}

function formatProjectType(type: string): string {
  return type
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatActivityLabel(actionType: string): string {
  const map: Record<string, string> = {
    project_created: 'Project created',
    project_updated: 'Project updated',
    issue_created: 'Issue created',
    issue_updated: 'Issue updated',
    issue_completed: 'Issue completed',
    issue_assigned: 'Issue assigned',
    comment_added: 'Comment added',
    phase_updated: 'Phase updated',
    phase_completed: 'Phase completed',
    milestone_completed: 'Milestone completed',
  };
  return map[actionType] || actionType.replace(/_/g, ' ');
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ---------------------------------------------------------------------------
// Project card — each card has a distinct feel based on progress
// ---------------------------------------------------------------------------

const ProjectCard = React.memo(function ProjectCard({
  project,
  index,
}: {
  project: PortalProject;
  index: number;
}) {
  const progressPct = Math.round(project.progress);
  const hasPhases = project.totalPhases > 0;
  const isComplete = progressPct === 100;

  const ariaLabel = hasPhases
    ? `${project.name} — ${progressPct}% complete — view project`
    : `${project.name} — ${project.status} — view project`;

  return (
    <Link
      href={`/projects/${project.id}`}
      aria-label={ariaLabel}
      className={cn(
        'group relative block cursor-pointer overflow-hidden rounded-xl border border-border bg-card transition-all duration-200',
        'hover:border-primary/20 hover:shadow-sm',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
        // Vary padding based on position for visual variety
        index === 0 ? 'p-5' : 'p-4'
      )}
    >
      {/* Top row: name + status + type */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              'truncate font-medium text-foreground transition-colors duration-150 group-hover:text-primary',
              index === 0 ? 'text-base' : 'text-sm'
            )}
          >
            {project.name}
          </p>
          {project.project_type && (
            <span className="mt-1 inline-block rounded-md bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              {formatProjectType(project.project_type)}
            </span>
          )}
        </div>
        <span
          className={cn(
            'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium',
            getStatusBadgeClasses(project.status)
          )}
        >
          {project.status}
        </span>
      </div>

      {/* Phase info */}
      {hasPhases && (
        <p className="mt-2 text-xs text-muted-foreground">
          Phase {project.completedPhases}/{project.totalPhases}
          {project.currentPhase ? ` \u00B7 ${project.currentPhase}` : ''}
        </p>
      )}

      {/* Progress bar */}
      {hasPhases && (
        <div className="mt-3 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border/30">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                isComplete ? 'bg-emerald-500' : 'bg-primary'
              )}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="text-[11px] tabular-nums text-muted-foreground">{progressPct}%</span>
        </div>
      )}

      {/* Arrow hint on hover */}
      <ArrowUpRight
        className="absolute right-3 top-3 h-4 w-4 text-muted-foreground/0 transition-all duration-200 group-hover:text-muted-foreground/40"
        aria-hidden="true"
      />
    </Link>
  );
});

// ---------------------------------------------------------------------------
// Loading skeletons
// ---------------------------------------------------------------------------

function ProjectsLoading() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-start justify-between">
            <div>
              <Skeleton className="h-4 w-36" />
              <Skeleton className="mt-2 h-3 w-16 rounded-md" />
            </div>
            <Skeleton className="h-4 w-14 rounded-full" />
          </div>
          <Skeleton className="mt-3 h-3 w-48" />
          <div className="mt-3 flex items-center gap-3">
            <Skeleton className="h-1.5 flex-1 rounded-full" />
            <Skeleton className="h-3 w-8" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ActivityLoading() {
  return (
    <div className="space-y-1">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2.5">
          <Skeleton className="h-1.5 w-1.5 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="mt-1.5 h-2.5 w-20" />
          </div>
          <Skeleton className="h-2.5 w-12" />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Recent activity section
// ---------------------------------------------------------------------------

function RecentActivitySection({
  activity,
  isLoading,
}: {
  activity: RecentActivityItem[];
  isLoading: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Recent Activity
        </h2>
        <Link
          href="/activity"
          className="cursor-pointer text-xs font-medium text-muted-foreground transition-colors duration-150 hover:text-primary"
        >
          View all
        </Link>
      </div>

      {isLoading ? (
        <ActivityLoading />
      ) : activity.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
          <Activity className="mb-2 h-10 w-10 text-muted-foreground/20" aria-hidden="true" />
          <p className="text-sm font-medium text-foreground">No recent activity</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Updates will appear here as work progresses.
          </p>
        </div>
      ) : (
        <div className="space-y-0.5">
          {activity.slice(0, 8).map((item) => {
            const actorInitial = item.actor?.full_name
              ? item.actor.full_name.charAt(0).toUpperCase()
              : null;

            const inner = (
              <div
                className={cn(
                  'flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors duration-150 hover:bg-muted/30',
                  item.project ? 'cursor-pointer' : ''
                )}
              >
                {/* Actor initial or dot */}
                {actorInitial ? (
                  <span
                    className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary"
                    aria-hidden="true"
                  >
                    {actorInitial}
                  </span>
                ) : (
                  <span
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/40"
                    aria-hidden="true"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-foreground">
                    {formatActivityLabel(item.action_type)}
                  </p>
                  {item.project && (
                    <p className="truncate text-[11px] text-muted-foreground/50">
                      {item.project.name}
                    </p>
                  )}
                </div>
                <span className="shrink-0 text-[11px] text-muted-foreground/40">
                  {formatRelativeTime(item.created_at)}
                </span>
              </div>
            );

            if (item.project) {
              return (
                <Link key={item.id} href={`/projects/${item.project.id}`}>
                  {inner}
                </Link>
              );
            }

            return <div key={item.id}>{inner}</div>;
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main dashboard component
// ---------------------------------------------------------------------------

export function PortalDashboardV2({
  stats,
  projects,
  recentActivity,
  isLoading,
  isError,
  clientId,
  displayName,
  companyName,
}: PortalDashboardV2Props) {
  const firstName = displayName.split(' ')[0];
  const welcomeName = companyName || firstName;

  return (
    <div className="space-y-8">
      {/* Section 1: Greeting */}
      <section
        className="animate-fade-in-up"
        style={{ animationDelay: '0ms', animationFillMode: 'both' }}
      >
        <p className="mb-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
          {formatDate()}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          {getGreeting()}, <span className="text-primary">{welcomeName}</span>
        </h1>
      </section>

      {/* Error banner */}
      {isError && !isLoading && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          Something went wrong loading your dashboard. Data shown may be outdated.
        </div>
      )}

      {/* Section 2: Stats row */}
      <section
        className="animate-fade-in-up"
        style={{ animationDelay: '60ms', animationFillMode: 'both' }}
      >
        <PortalStatsRow stats={stats} isLoading={isLoading} />
      </section>

      {/* Section 3: Two-column layout — Projects (wider left) | Action items + Activity (right) */}
      <section
        className="animate-fade-in-up"
        style={{ animationDelay: '120ms', animationFillMode: 'both' }}
      >
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* Left column (3/5): Projects overview */}
          <div className="lg:col-span-3">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Your Projects</h2>
              {projects.length > 0 && (
                <Link
                  href="/projects"
                  className="cursor-pointer text-xs font-medium text-muted-foreground transition-colors duration-150 hover:text-primary"
                >
                  View all
                </Link>
              )}
            </div>
            {isLoading ? (
              <ProjectsLoading />
            ) : projects.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center">
                <PackageOpen
                  className="mb-3 h-10 w-10 text-muted-foreground/20"
                  aria-hidden="true"
                />
                <p className="text-sm font-medium text-foreground">No active projects</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Your projects will appear here once they begin.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {projects.map((project, index) => (
                  <ProjectCard key={project.id} project={project} index={index} />
                ))}
              </div>
            )}
          </div>

          {/* Right column (2/5): Action items + Recent activity */}
          <div className="space-y-6 lg:col-span-2">
            <PortalActionItems clientId={clientId} />
            <RecentActivitySection activity={recentActivity} isLoading={isLoading} />
          </div>
        </div>
      </section>

      {/* Section 4: Quick actions row */}
      <section
        className="animate-fade-in-up"
        style={{ animationDelay: '180ms', animationFillMode: 'both' }}
      >
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.title}
                href={action.href}
                aria-label={`${action.title} — ${action.description}`}
                className={cn(
                  'group flex items-center gap-4 rounded-xl border border-border bg-card p-5',
                  'cursor-pointer transition-all duration-200',
                  'hover:border-primary/20 hover:shadow-sm',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30'
                )}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors duration-150 group-hover:bg-primary/15">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{action.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{action.description}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
