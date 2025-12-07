import { Suspense } from 'react';
import { connection } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getRecentActivities, getCurrentWorkspaceId } from '@/app/actions';
import Link from 'next/link';
import {
  Folder,
  Users,
  Calendar,
  MessageCircle,
  ArrowRight,
  Clock,
  Activity,
  CheckCircle2,
  Circle,
  Play,
  ExternalLink,
} from 'lucide-react';
import { DashboardActiveUsers } from '@/components/dashboard-active-users';
import { DashboardActivityFeed } from '@/components/dashboard-activity-feed';
import { formatDistanceToNow, format, isToday, isTomorrow } from 'date-fns';

// Get the most recently updated project
async function getLastProject() {
  await connection();
  const supabase = await createClient();
  const workspaceId = await getCurrentWorkspaceId();

  const { data: project } = await supabase
    .from('projects')
    .select(
      `
      id,
      name,
      status,
      project_type,
      updated_at,
      client:clients(name)
    `
    )
    .eq('workspace_id', workspaceId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();

  return project;
}

// Get upcoming meetings (next 7 days)
async function getUpcomingMeetings() {
  await connection();
  const supabase = await createClient();
  const workspaceId = await getCurrentWorkspaceId();

  const { data: meetings } = await supabase
    .from('meetings')
    .select(
      `
      id,
      title,
      start_time,
      client:clients(name),
      project:projects(name)
    `
    )
    .eq('workspace_id', workspaceId)
    .gte('start_time', new Date().toISOString())
    .order('start_time', { ascending: true })
    .limit(3);

  return meetings || [];
}

// Get recent tasks
async function getRecentTasks() {
  await connection();
  const supabase = await createClient();
  const workspaceId = await getCurrentWorkspaceId();

  const { data: tasks } = await supabase
    .from('issues')
    .select(
      `
      id,
      title,
      status,
      priority,
      project:projects(id, name)
    `
    )
    .eq('workspace_id', workspaceId)
    .in('status', ['Yet to Start', 'Todo', 'In Progress'])
    .order('updated_at', { ascending: false })
    .limit(5);

  return tasks || [];
}

// Continue where you left off - Hero card
async function ContinueCard() {
  const project = await getLastProject();

  if (!project) {
    return (
      <div className="bento-card p-8">
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Folder className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">No projects yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first project to get started
          </p>
          <Link
            href="/projects"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Create Project <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  const client = project.client as { name: string } | { name: string }[] | null;
  const clientName = Array.isArray(client) ? client[0]?.name : client?.name;

  const projectTypeLabels: Record<string, string> = {
    web_design: 'Website',
    ai_agent: 'AI Agent',
    seo: 'SEO',
    ads: 'Ads',
  };

  return (
    <Link href={`/projects/${project.id}`} className="bento-card group block p-6">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-primary">
          Continue where you left off
        </span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
          Open project <ExternalLink className="h-3 w-3" />
        </span>
      </div>

      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 transition-transform group-hover:scale-105">
          <Play className="h-6 w-6 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-xl font-bold text-foreground transition-colors group-hover:text-primary">
            {project.name}
          </h2>
          <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
            {clientName && <span>{clientName}</span>}
            {project.project_type && (
              <>
                {clientName && <span className="text-border">•</span>}
                <span>{projectTypeLabels[project.project_type] || project.project_type}</span>
              </>
            )}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Last updated {formatDistanceToNow(new Date(project.updated_at), { addSuffix: true })}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
          <div className="h-full w-1/3 rounded-full bg-primary" />
        </div>
        <span className="text-xs font-medium text-muted-foreground">In Progress</span>
      </div>
    </Link>
  );
}

function ContinueSkeleton() {
  return (
    <div className="bento-card animate-pulse p-6">
      <div className="mb-4 h-4 w-48 rounded bg-muted" />
      <div className="flex items-start gap-4">
        <div className="h-14 w-14 rounded-xl bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-6 w-3/4 rounded bg-muted" />
          <div className="h-4 w-1/2 rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}

// Upcoming meetings card
async function MeetingsCard() {
  const meetings = await getUpcomingMeetings();

  const formatMeetingDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return `Today, ${format(date, 'h:mm a')}`;
    if (isTomorrow(date)) return `Tomorrow, ${format(date, 'h:mm a')}`;
    return format(date, 'EEE, MMM d, h:mm a');
  };

  return (
    <div className="bento-card h-full">
      <div className="flex items-center justify-between border-b border-border/50 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10">
            <Calendar className="h-4 w-4 text-amber-500" />
          </div>
          <span className="font-semibold text-foreground">Upcoming</span>
        </div>
        <Link href="/schedule" className="text-xs font-medium text-primary hover:text-primary/80">
          View all
        </Link>
      </div>

      <div className="p-4">
        {meetings.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-sm text-muted-foreground">No upcoming meetings</p>
            <Link
              href="/schedule"
              className="mt-2 inline-block text-xs font-medium text-primary hover:underline"
            >
              Schedule one
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {meetings.map((meeting) => {
              const meetingClient = meeting.client as { name: string } | { name: string }[] | null;
              const meetingProject = meeting.project as
                | { name: string }
                | { name: string }[]
                | null;
              const clientName = Array.isArray(meetingClient)
                ? meetingClient[0]?.name
                : meetingClient?.name;
              const projectName = Array.isArray(meetingProject)
                ? meetingProject[0]?.name
                : meetingProject?.name;

              return (
                <div
                  key={meeting.id}
                  className="group rounded-lg p-3 transition-colors hover:bg-secondary/50"
                >
                  <p className="truncate text-sm font-medium text-foreground">{meeting.title}</p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{formatMeetingDate(meeting.start_time)}</span>
                  </div>
                  {(clientName || projectName) && (
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {clientName || projectName}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function MeetingsSkeleton() {
  return (
    <div className="bento-card h-full animate-pulse">
      <div className="border-b border-border/50 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-muted" />
          <div className="h-5 w-24 rounded bg-muted" />
        </div>
      </div>
      <div className="space-y-3 p-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-lg p-3">
            <div className="h-4 w-3/4 rounded bg-muted" />
            <div className="mt-2 h-3 w-1/2 rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Tasks card
async function TasksCard() {
  const tasks = await getRecentTasks();

  const statusIcons: Record<string, typeof Circle> = {
    'Yet to Start': Circle,
    Todo: Circle,
    'In Progress': Clock,
    Done: CheckCircle2,
  };

  const statusColors: Record<string, string> = {
    'Yet to Start': 'text-muted-foreground',
    Todo: 'text-blue-500',
    'In Progress': 'text-amber-500',
    Done: 'text-emerald-500',
  };

  return (
    <div className="bento-card h-full">
      <div className="flex items-center justify-between border-b border-border/50 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-500/10">
            <CheckCircle2 className="h-4 w-4 text-rose-500" />
          </div>
          <span className="font-semibold text-foreground">Open Tasks</span>
        </div>
        <Link href="/hub" className="text-xs font-medium text-primary hover:text-primary/80">
          View all
        </Link>
      </div>

      <div className="p-4">
        {tasks.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-sm text-muted-foreground">No open tasks</p>
            <Link
              href="/hub"
              className="mt-2 inline-block text-xs font-medium text-primary hover:underline"
            >
              Create one
            </Link>
          </div>
        ) : (
          <div className="space-y-1">
            {tasks.map((task) => {
              const Icon = statusIcons[task.status] || Circle;
              const color = statusColors[task.status] || 'text-muted-foreground';
              const taskProject = task.project as
                | { id: string; name: string }
                | { id: string; name: string }[]
                | null;
              const projectName = Array.isArray(taskProject)
                ? taskProject[0]?.name
                : taskProject?.name;

              return (
                <div
                  key={task.id}
                  className="group flex items-start gap-3 rounded-lg p-2 transition-colors hover:bg-secondary/50"
                >
                  <Icon className={`mt-0.5 h-4 w-4 flex-shrink-0 ${color}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-foreground">{task.title}</p>
                    {projectName && (
                      <p className="truncate text-xs text-muted-foreground">{projectName}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function TasksSkeleton() {
  return (
    <div className="bento-card h-full animate-pulse">
      <div className="border-b border-border/50 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-muted" />
          <div className="h-5 w-24 rounded bg-muted" />
        </div>
      </div>
      <div className="space-y-2 p-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-start gap-3 p-2">
            <div className="h-4 w-4 rounded bg-muted" />
            <div className="h-4 w-3/4 rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Quick navigation
function QuickNav() {
  const navItems = [
    {
      label: 'Projects',
      description: 'Manage all projects',
      href: '/projects',
      icon: Folder,
      color: 'bg-primary/10 text-primary',
    },
    {
      label: 'Schedule',
      description: 'Calendar & meetings',
      href: '/schedule',
      icon: Calendar,
      color: 'bg-amber-500/10 text-amber-500',
    },
    {
      label: 'Clients',
      description: 'CRM & leads',
      href: '/clients',
      icon: Users,
      color: 'bg-violet-500/10 text-violet-500',
    },
    {
      label: 'Hub',
      description: 'Tasks & collaboration',
      href: '/hub',
      icon: MessageCircle,
      color: 'bg-rose-500/10 text-rose-500',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {navItems.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          className="bento-card group flex items-center gap-3 p-4 transition-all hover:border-primary/30"
        >
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-lg ${item.color} transition-transform group-hover:scale-110`}
          >
            <item.icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{item.label}</p>
            <p className="truncate text-xs text-muted-foreground">{item.description}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}

async function ActivityLoader() {
  await connection();
  const activities = await getRecentActivities(8);
  return <DashboardActivityFeed activities={activities} />;
}

function ActivitySkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex animate-pulse items-start gap-3">
          <div className="h-10 w-10 rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 rounded bg-muted" />
            <div className="h-3 w-1/4 rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Noise texture overlay */}
      <div className="noise-overlay" />

      {/* Ambient gradient orbs */}
      <div className="ambient-orb ambient-orb-primary absolute -left-32 top-0 h-96 w-96" />
      <div
        className="ambient-orb ambient-orb-accent absolute -right-32 top-1/3 h-80 w-80"
        style={{ animationDelay: '-7s' }}
      />

      {/* Grid pattern background */}
      <div className="grid-pattern pointer-events-none absolute inset-0 opacity-30" />

      {/* Main content */}
      <div className="relative z-10 mx-auto max-w-7xl px-6 py-8">
        {/* Header */}
        <header className="mb-8">
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            {greeting}
          </h1>
          <p className="mt-1 text-muted-foreground">{format(now, 'EEEE, MMMM d, yyyy')}</p>
        </header>

        {/* Main grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left column - Continue & Quick Nav */}
          <div className="space-y-6 lg:col-span-2">
            {/* Continue where you left off */}
            <Suspense fallback={<ContinueSkeleton />}>
              <ContinueCard />
            </Suspense>

            {/* Quick Navigation */}
            <QuickNav />

            {/* Meetings & Tasks row */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Suspense fallback={<MeetingsSkeleton />}>
                <MeetingsCard />
              </Suspense>
              <Suspense fallback={<TasksSkeleton />}>
                <TasksCard />
              </Suspense>
            </div>
          </div>

          {/* Right column - Activity & Users */}
          <div className="space-y-6">
            {/* Active users */}
            <div className="bento-card p-5">
              <DashboardActiveUsers />
            </div>

            {/* Activity Feed */}
            <div className="bento-card">
              <div className="flex items-center justify-between border-b border-border/50 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10">
                    <Activity className="h-4 w-4 text-violet-500" />
                  </div>
                  <span className="font-semibold text-foreground">Activity</span>
                </div>
              </div>
              <div className="max-h-[400px] overflow-y-auto p-4">
                <Suspense fallback={<ActivitySkeleton />}>
                  <ActivityLoader />
                </Suspense>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
