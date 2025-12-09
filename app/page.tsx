import { Suspense } from 'react';
import { connection } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId } from '@/app/actions';
import Link from 'next/link';
import { AlertCircle, Plus, Folder, Calendar, Users, ArrowRight, Zap, Target } from 'lucide-react';
import { format, differenceInDays, isPast } from 'date-fns';
import { DashboardAIInput } from '@/components/dashboard-ai-input';

// Get urgent items - overdue or due soon
async function getUrgentItems() {
  await connection();
  const supabase = await createClient();
  const workspaceId = await getCurrentWorkspaceId();

  const now = new Date();
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  // Get projects with upcoming or past target dates
  const { data: urgentProjects } = await supabase
    .from('projects')
    .select(
      `
      id,
      name,
      target_date,
      status,
      project_type,
      client:clients(name)
    `
    )
    .eq('workspace_id', workspaceId)
    .neq('status', 'completed')
    .not('target_date', 'is', null)
    .lte('target_date', threeDaysFromNow.toISOString())
    .order('target_date', { ascending: true })
    .limit(5);

  // Get upcoming meetings (next 48 hours)
  const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
  const { data: upcomingMeetings } = await supabase
    .from('meetings')
    .select(
      `
      id,
      title,
      start_time,
      client:clients(name)
    `
    )
    .eq('workspace_id', workspaceId)
    .gte('start_time', now.toISOString())
    .lte('start_time', twoDaysFromNow.toISOString())
    .order('start_time', { ascending: true })
    .limit(3);

  return {
    projects: urgentProjects || [],
    meetings: upcomingMeetings || [],
  };
}

// Get AI suggestions for what to focus on
async function getFocusSuggestions() {
  await connection();
  const supabase = await createClient();
  const workspaceId = await getCurrentWorkspaceId();

  // Get active projects sorted by activity
  const { data: activeProjects } = await supabase
    .from('projects')
    .select(
      `
      id,
      name,
      status,
      project_type,
      updated_at,
      roadmap_progress
    `
    )
    .eq('workspace_id', workspaceId)
    .eq('status', 'active')
    .order('updated_at', { ascending: false })
    .limit(3);

  return activeProjects || [];
}

// Urgent items component
async function UrgentAlerts() {
  const { projects, meetings } = await getUrgentItems();

  const hasUrgentItems = projects.length > 0 || meetings.length > 0;

  if (!hasUrgentItems) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
          <Target className="h-6 w-6 text-emerald-500" />
        </div>
        <p className="mt-3 text-sm font-medium text-foreground">All clear</p>
        <p className="mt-1 text-xs text-muted-foreground">No urgent deadlines or meetings</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Overdue/Due Soon Projects */}
      {projects.map((project) => {
        const targetDate = new Date(project.target_date);
        const isOverdue = isPast(targetDate);
        const daysUntil = differenceInDays(targetDate, new Date());
        const client = project.client as { name: string } | { name: string }[] | null;
        const clientName = Array.isArray(client) ? client[0]?.name : client?.name;

        return (
          <Link
            key={project.id}
            href={`/projects/${project.id}`}
            className={`group flex items-start gap-3 rounded-xl border p-4 transition-all hover:shadow-sm ${
              isOverdue
                ? 'border-red-500/30 bg-red-500/5 hover:border-red-500/50'
                : 'border-amber-500/30 bg-amber-500/5 hover:border-amber-500/50'
            }`}
          >
            <div
              className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg ${
                isOverdue ? 'bg-red-500/10' : 'bg-amber-500/10'
              }`}
            >
              <AlertCircle className={`h-4 w-4 ${isOverdue ? 'text-red-500' : 'text-amber-500'}`} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground group-hover:text-primary">
                {project.name}
              </p>
              <p
                className={`mt-0.5 text-xs font-medium ${isOverdue ? 'text-red-500' : 'text-amber-500'}`}
              >
                {isOverdue ? 'Overdue' : `Due in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`}
              </p>
              {clientName && <p className="mt-1 text-xs text-muted-foreground">{clientName}</p>}
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </Link>
        );
      })}

      {/* Upcoming Meetings */}
      {meetings.map((meeting) => {
        const client = meeting.client as { name: string } | { name: string }[] | null;
        const clientName = Array.isArray(client) ? client[0]?.name : client?.name;

        return (
          <Link
            key={meeting.id}
            href="/schedule"
            className="group flex items-start gap-3 rounded-xl border border-blue-500/30 bg-blue-500/5 p-4 transition-all hover:border-blue-500/50 hover:shadow-sm"
          >
            <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
              <Calendar className="h-4 w-4 text-blue-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground group-hover:text-primary">
                {meeting.title}
              </p>
              <p className="mt-0.5 text-xs font-medium text-blue-500">
                {format(new Date(meeting.start_time), "EEE, MMM d 'at' h:mm a")}
              </p>
              {clientName && <p className="mt-1 text-xs text-muted-foreground">{clientName}</p>}
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </Link>
        );
      })}
    </div>
  );
}

// Focus suggestions
async function FocusSuggestions() {
  const projects = await getFocusSuggestions();

  if (projects.length === 0) {
    return null;
  }

  const projectTypeLabels: Record<string, string> = {
    web_design: 'Website',
    ai_agent: 'AI Agent',
    seo: 'SEO',
    ads: 'Ads',
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Continue working on
      </p>
      <div className="space-y-2">
        {projects.map((project) => (
          <Link
            key={project.id}
            href={`/projects/${project.id}`}
            className="group flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-all hover:border-primary/30 hover:shadow-sm"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Folder className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground group-hover:text-primary">
                {project.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {projectTypeLabels[project.project_type || ''] || 'Project'}
                {project.roadmap_progress > 0 && ` • ${project.roadmap_progress}% complete`}
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </Link>
        ))}
      </div>
    </div>
  );
}

function AlertsSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(2)].map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 animate-pulse rounded-lg bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function FocusSkeleton() {
  return (
    <div className="space-y-2">
      <div className="h-3 w-32 animate-pulse rounded bg-muted" />
      {[...Array(2)].map((_, i) => (
        <div key={i} className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 animate-pulse rounded-lg bg-muted" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
              <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Quick Actions
function QuickActions() {
  const actions = [
    { label: 'New Project', href: '/projects', icon: Folder, color: 'bg-primary/10 text-primary' },
    {
      label: 'New Meeting',
      href: '/schedule',
      icon: Calendar,
      color: 'bg-amber-500/10 text-amber-500',
    },
    {
      label: 'New Client',
      href: '/clients',
      icon: Users,
      color: 'bg-violet-500/10 text-violet-500',
    },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => (
        <Link
          key={action.label}
          href={action.href}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-all hover:border-primary/30 hover:shadow-sm"
        >
          <Plus className="h-3.5 w-3.5" />
          {action.label}
        </Link>
      ))}
    </div>
  );
}

export default function Home() {
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-6 py-12">
        {/* Header */}
        <header className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{greeting}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{format(now, 'EEEE, MMMM d')}</p>
        </header>

        {/* AI Command Input - The main feature */}
        <section className="mb-10">
          <div className="relative">
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 opacity-50 blur-lg" />
            <div className="relative rounded-xl border border-primary/20 bg-card p-1">
              <DashboardAIInput />
            </div>
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Ask anything about your projects, create tasks, or get insights
          </p>
        </section>

        {/* Two column layout for alerts and focus */}
        <div className="grid gap-8 md:grid-cols-2">
          {/* Needs Attention */}
          <section>
            <div className="mb-4 flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              <h2 className="text-sm font-semibold text-foreground">Needs attention</h2>
            </div>
            <Suspense fallback={<AlertsSkeleton />}>
              <UrgentAlerts />
            </Suspense>
          </section>

          {/* Focus */}
          <section>
            <div className="mb-4 flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Focus</h2>
            </div>
            <Suspense fallback={<FocusSkeleton />}>
              <FocusSuggestions />
            </Suspense>
          </section>
        </div>

        {/* Quick Actions */}
        <section className="mt-10 border-t border-border pt-8">
          <div className="mb-4 flex items-center gap-2">
            <Plus className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Quick actions</h2>
          </div>
          <QuickActions />
        </section>
      </div>
    </div>
  );
}
