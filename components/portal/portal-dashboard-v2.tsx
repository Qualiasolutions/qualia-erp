'use client';

import Link from 'next/link';
import { FolderKanban, Lightbulb, Receipt, PackageOpen } from 'lucide-react';
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
    href: '/portal/requests',
    icon: Lightbulb,
  },
  {
    title: 'View all projects',
    description: 'See progress across all your projects',
    href: '/portal/projects',
    icon: FolderKanban,
  },
  {
    title: 'View billing',
    description: 'Check invoices and payment history',
    href: '/portal/billing',
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

function ProjectCard({ project }: { project: PortalProject }) {
  const progressPct = Math.round(project.progress);
  const hasPhases = project.totalPhases > 0;

  return (
    <Link
      href={`/portal/${project.id}`}
      className="block cursor-pointer rounded-lg border border-border bg-card p-4 transition-colors duration-200 hover:border-primary/20"
    >
      {/* Top row: name + status */}
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 truncate text-sm font-medium text-foreground">{project.name}</p>
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
        <p className="mt-1.5 text-xs text-muted-foreground">
          Phase {project.completedPhases}/{project.totalPhases}
          {project.currentPhase ? ` \u00B7 ${project.currentPhase}` : ''}
        </p>
      )}

      {/* Progress bar */}
      {hasPhases && (
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-border/30">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              progressPct === 100 ? 'bg-emerald-500' : 'bg-primary'
            )}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      )}
    </Link>
  );
}

function ProjectsLoading() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-14 rounded-full" />
          </div>
          <Skeleton className="mt-2 h-3 w-44" />
          <Skeleton className="mt-3 h-1.5 w-full rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function PortalDashboardV2({
  stats,
  projects,
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
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
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

      {/* Section 3: Two-column layout */}
      <section
        className="animate-fade-in-up"
        style={{ animationDelay: '120ms', animationFillMode: 'both' }}
      >
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* Left column (2/5): Action Items */}
          <div className="lg:col-span-2">
            <h2 className="mb-4 text-sm font-semibold text-foreground">Action Items</h2>
            <PortalActionItems clientId={clientId} />
          </div>

          {/* Right column (3/5): Projects overview */}
          <div className="lg:col-span-3">
            <h2 className="mb-4 text-sm font-semibold text-foreground">Your Projects</h2>
            {isLoading ? (
              <ProjectsLoading />
            ) : projects.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card px-6 py-12 text-center">
                <PackageOpen className="mb-3 h-12 w-12 text-muted-foreground/30" />
                <p className="text-base font-medium text-foreground">No active projects</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your projects will appear here once they begin.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {projects.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Section 4: Quick actions row */}
      <section
        className="animate-fade-in-up"
        style={{ animationDelay: '180ms', animationFillMode: 'both' }}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.title}
                href={action.href}
                className="cursor-pointer rounded-xl border border-border bg-card p-5 transition-all duration-200 hover:border-primary/20 hover:shadow-md"
              >
                <Icon className="mb-3 h-8 w-8 text-primary/60" />
                <p className="text-sm font-medium text-foreground">{action.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{action.description}</p>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
