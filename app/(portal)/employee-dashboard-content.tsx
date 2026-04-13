'use client';

import Link from 'next/link';
import { FolderKanban, Calendar, Clock, TrendingUp } from 'lucide-react';
import { useEmployeeAssignments } from '@/lib/swr';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { InboxWidget } from '@/components/portal/inbox-widget';
import { PROJECT_STATUS_COLORS, type ProjectStatusKey } from '@/lib/color-constants';

interface EmployeeDashboardContentProps {
  userId: string;
  displayName: string;
}

interface AssignmentProject {
  id: string;
  name: string;
  status: string;
  project_type: string | null;
  client: { id: string; name: string } | null;
}

interface Assignment {
  id: string;
  assigned_at: string;
  notes: string | null;
  project: AssignmentProject | null;
}

const quickActions = [
  {
    title: 'View Schedule',
    description: 'Check your calendar and meetings',
    href: '/schedule',
    icon: Calendar,
  },
  {
    title: 'All Projects',
    description: 'See all your assigned projects',
    href: '/projects',
    icon: FolderKanban,
  },
];

/* ------------------------------------------------------------------ */
/* Stat Card — left-accent treatment matching admin dashboard          */
/* ------------------------------------------------------------------ */

function StatCard({
  label,
  value,
  icon: Icon,
  accentColor,
}: {
  label: string;
  value: number | null;
  icon: typeof FolderKanban;
  accentColor: string;
}) {
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border border-border/60 bg-card',
        'transition-all duration-200 hover:border-border hover:shadow-sm'
      )}
    >
      {/* Left accent */}
      <div
        className={cn(
          'absolute left-0 top-0 h-full w-[3px] transition-all duration-200',
          accentColor,
          'group-hover:w-[4px]'
        )}
      />

      <div className="flex items-center justify-between px-5 py-5 pl-6">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground/70">
            {label}
          </p>
          {value === null ? (
            <Skeleton className="mt-1.5 h-7 w-10" />
          ) : (
            <p className="mt-1.5 text-2xl font-bold tabular-nums tracking-tight text-foreground">
              {value}
            </p>
          )}
        </div>
        <Icon
          className="h-5 w-5 text-muted-foreground/15 transition-colors duration-200 group-hover:text-muted-foreground/25"
          strokeWidth={1.5}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Employee Dashboard                                                  */
/* ------------------------------------------------------------------ */

export function EmployeeDashboardContent({ userId, displayName }: EmployeeDashboardContentProps) {
  const { data: assignments, isLoading } = useEmployeeAssignments(userId);
  const typedAssignments = (assignments || []) as Assignment[];

  const activeProjects = typedAssignments.filter(
    (a) => a.project && a.project.status !== 'Archived' && a.project.status !== 'Canceled'
  );

  const greeting = getGreeting();

  const formatDate = () => {
    const now = new Date();
    return now.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-8 px-[clamp(1.5rem,4vw,2.5rem)] pb-[clamp(1.5rem,3vw,2.5rem)] pt-16 md:pt-[clamp(1.5rem,3vw,2.5rem)]">
      {/* Greeting */}
      <section
        className="animate-fade-in-up"
        style={{ animationDelay: '0ms', animationFillMode: 'both' }}
      >
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground/60">
          {formatDate()}
        </p>
        <h1 className="mt-2 text-[clamp(1.5rem,1.2rem+1.5vw,2.25rem)] font-semibold tracking-tight text-foreground">
          {greeting}, <span className="text-primary">{displayName}</span>
        </h1>
      </section>

      {/* Stats */}
      <section
        className="animate-fade-in-up"
        style={{ animationDelay: '60ms', animationFillMode: 'both' }}
      >
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <StatCard
            label="Assigned Projects"
            value={isLoading ? null : activeProjects.length}
            icon={FolderKanban}
            accentColor="bg-primary/40"
          />
          <StatCard
            label="Active"
            value={
              isLoading ? null : activeProjects.filter((a) => a.project?.status === 'Active').length
            }
            icon={TrendingUp}
            accentColor="bg-emerald-500/40"
          />
          <StatCard
            label="Total Assigned"
            value={isLoading ? null : typedAssignments.length}
            icon={Clock}
            accentColor="bg-primary/30"
          />
        </div>
      </section>

      {/* Inbox preview */}
      <section
        className="animate-fade-in-up"
        style={{ animationDelay: '120ms', animationFillMode: 'both' }}
      >
        <InboxWidget />
      </section>

      {/* Quick actions */}
      <section
        className="animate-fade-in-up"
        style={{ animationDelay: '180ms', animationFillMode: 'both' }}
      >
        <h2 className="mb-3 text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground/60">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className={cn(
                'group flex items-center gap-3 rounded-xl border border-border/60 bg-card p-4',
                'transition-all duration-200',
                'hover:border-primary/20 hover:shadow-sm',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
                'cursor-pointer'
              )}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors duration-200 group-hover:bg-primary/15">
                <action.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{action.title}</p>
                <p className="text-xs text-muted-foreground">{action.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Assigned projects list */}
      <section
        className="animate-fade-in-up"
        style={{ animationDelay: '240ms', animationFillMode: 'both' }}
      >
        <h2 className="mb-3 text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground/60">
          Your Projects
        </h2>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-[68px] w-full rounded-xl" />
            ))}
          </div>
        ) : activeProjects.length === 0 ? (
          <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-dashed border-border/60">
            <div className="text-center">
              <FolderKanban
                className="mx-auto h-12 w-12 text-muted-foreground/30"
                aria-hidden="true"
              />
              <p className="mt-3 text-base font-medium text-foreground">No projects assigned yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Projects will appear here once you are assigned to them.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {activeProjects.map((assignment) => {
              const project = assignment.project;
              if (!project) return null;

              const statusColors =
                PROJECT_STATUS_COLORS[project.status as ProjectStatusKey] || null;

              return (
                <Link
                  key={assignment.id}
                  href={`/projects/${project.id}`}
                  className={cn(
                    'group flex items-center justify-between rounded-xl border border-border/60 bg-card px-5 py-4',
                    'transition-all duration-200',
                    'hover:border-primary/20 hover:shadow-sm',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
                    'cursor-pointer'
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground transition-colors duration-150 group-hover:text-primary">
                      {project.name}
                    </p>
                    {project.client && (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {project.client.name}
                      </p>
                    )}
                  </div>
                  <div className="ml-4 flex shrink-0 items-center gap-2">
                    {project.project_type && (
                      <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {formatProjectType(project.project_type)}
                      </span>
                    )}
                    <span
                      className={cn(
                        'rounded-md px-2 py-0.5 text-[10px] font-medium',
                        statusColors
                          ? `${statusColors.bg} ${statusColors.text}`
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {project.status}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function formatProjectType(type: string): string {
  return type
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
