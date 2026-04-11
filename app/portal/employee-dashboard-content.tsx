'use client';

import Link from 'next/link';
import { FolderKanban, Inbox, Calendar, Clock } from 'lucide-react';
import { useEmployeeAssignments } from '@/lib/swr';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

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

const STATUS_COLORS: Record<string, string> = {
  Active: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  Demos: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  Launched: 'bg-primary/10 text-primary',
  Delayed: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  Done: 'bg-muted text-muted-foreground',
};

const quickActions = [
  {
    title: 'Go to Inbox',
    description: 'View your tasks and action items',
    href: '/portal/inbox',
    icon: Inbox,
  },
  {
    title: 'View Schedule',
    description: 'Check your calendar and meetings',
    href: '/portal/schedule',
    icon: Calendar,
  },
  {
    title: 'All Projects',
    description: 'See all your assigned projects',
    href: '/portal/projects',
    icon: FolderKanban,
  },
];

export function EmployeeDashboardContent({ userId, displayName }: EmployeeDashboardContentProps) {
  const { data: assignments, isLoading } = useEmployeeAssignments(userId);
  const typedAssignments = (assignments || []) as Assignment[];

  const activeProjects = typedAssignments.filter(
    (a) => a.project && a.project.status !== 'Archived' && a.project.status !== 'Canceled'
  );

  const greeting = getGreeting();

  const formatDate = () => {
    const now = new Date();
    return now
      .toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
      .toUpperCase();
  };

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <section
        className="animate-fade-in-up"
        style={{ animationDelay: '0ms', animationFillMode: 'both' }}
      >
        <p className="mb-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
          {formatDate()}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          {greeting}, <span className="text-primary">{displayName}</span>
        </h1>
      </section>

      {/* Stats row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Assigned Projects"
          value={isLoading ? null : activeProjects.length}
          icon={FolderKanban}
        />
        <StatCard
          label="Active"
          value={
            isLoading ? null : activeProjects.filter((a) => a.project?.status === 'Active').length
          }
          icon={Clock}
        />
        <StatCard
          label="Total Assigned"
          value={isLoading ? null : typedAssignments.length}
          icon={FolderKanban}
        />
      </div>

      {/* Quick actions */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.06em] text-muted-foreground/60">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className={cn(
                'group flex items-center gap-3 rounded-xl border border-border/50 p-4',
                'transition-all duration-150',
                'hover:border-primary/30 hover:bg-primary/[0.03] hover:shadow-sm',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
                'cursor-pointer'
              )}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors duration-150 group-hover:bg-primary/15">
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
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.06em] text-muted-foreground/60">
          Your Projects
        </h2>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : activeProjects.length === 0 ? (
          <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-dashed border-border/50">
            <div className="text-center">
              <FolderKanban
                className="mx-auto h-10 w-10 text-muted-foreground/30"
                aria-hidden="true"
              />
              <p className="mt-3 text-sm font-medium text-foreground">No projects assigned yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Projects will appear here once you are assigned to them.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {activeProjects.map((assignment) => {
              const project = assignment.project;
              if (!project) return null;

              return (
                <Link
                  key={assignment.id}
                  href={`/portal/${project.id}`}
                  className={cn(
                    'group flex items-center justify-between rounded-xl border border-border/50 px-5 py-4',
                    'transition-all duration-150',
                    'hover:border-primary/30 hover:bg-primary/[0.03] hover:shadow-sm',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
                    'cursor-pointer'
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground group-hover:text-primary">
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
                        STATUS_COLORS[project.status] || 'bg-muted text-muted-foreground'
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

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number | null;
  icon: typeof FolderKanban;
}) {
  return (
    <div className="rounded-xl border border-border/50 px-5 py-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          {value === null ? (
            <Skeleton className="mb-1 h-6 w-8" />
          ) : (
            <p className="text-xl font-semibold text-foreground">{value}</p>
          )}
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
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
