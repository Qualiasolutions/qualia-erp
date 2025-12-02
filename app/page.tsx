import { Suspense } from 'react';
import { connection } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getRecentActivities, getCurrentWorkspaceId } from '@/app/actions';
import { ActivityFeed } from '@/components/activity-feed';
import Link from 'next/link';
import {
  Folder,
  ArrowUpRight,
  Circle,
  Users,
  Calendar,
  Briefcase,
  MessageCircle,
} from 'lucide-react';
import { DashboardActiveUsers } from '@/components/dashboard-active-users';

interface DashboardStats {
  activeProjects: number;
  clientsActive: number;
  meetingsThisWeek: number;
}

async function getStats(): Promise<DashboardStats> {
  await connection();
  const supabase = await createClient();
  const workspaceId = await getCurrentWorkspaceId();

  const { count: activeProjects } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .in('project_group', ['active', 'salman_kuwait', 'tasos_kyriakides', 'other']);

  const { count: clientsActive } = await supabase
    .from('clients')
    .select('*', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .eq('lead_status', 'active_client');

  // Meetings this week
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 7);

  const { count: meetingsThisWeek } = await supabase
    .from('meetings')
    .select('*', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .gte('start_time', startOfWeek.toISOString())
    .lt('start_time', endOfWeek.toISOString());

  return {
    activeProjects: activeProjects || 0,
    clientsActive: clientsActive || 0,
    meetingsThisWeek: meetingsThisWeek || 0,
  };
}

async function StatsLoader() {
  const stats = await getStats();

  // Primary stats (top row)
  const primaryStats = [
    {
      label: 'Active Projects',
      value: stats.activeProjects,
      icon: Folder,
      accent: 'primary',
      href: '/projects',
      trend: 'Across all groups',
    },
    {
      label: 'Active Clients',
      value: stats.clientsActive,
      icon: Users,
      accent: 'blue',
      href: '/clients',
      trend: 'Engaged clients',
    },
    {
      label: 'This Week',
      value: stats.meetingsThisWeek,
      icon: Calendar,
      accent: 'violet',
      href: '/schedule',
      trend: 'Scheduled meetings',
    },
  ];

  const accentClasses: Record<string, string> = {
    primary: 'bg-primary/10 text-primary',
    blue: 'bg-blue-500/10 text-blue-500',
    violet: 'bg-violet-500/10 text-violet-500',
  };

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {primaryStats.map((stat, index) => (
        <Link
          key={stat.label}
          href={stat.href}
          className="surface-elevated slide-up group relative rounded-xl p-5 transition-all duration-300 hover:border-primary/20 hover:shadow-md"
          style={{ animationDelay: `${index * 80}ms` }}
        >
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {stat.label}
              </p>
              <p className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
                {stat.value}
              </p>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Circle className="h-1.5 w-1.5 fill-current" />
                {stat.trend}
              </p>
            </div>
            <div
              className={`rounded-lg p-2.5 transition-all duration-300 ${accentClasses[stat.accent]} group-hover:scale-110`}
            >
              <stat.icon className="h-5 w-5" />
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="surface-elevated rounded-xl p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-3">
              <div className="h-3 w-24 animate-pulse rounded bg-muted" />
              <div className="h-10 w-16 animate-pulse rounded bg-muted" />
              <div className="h-3 w-28 animate-pulse rounded bg-muted" />
            </div>
            <div className="h-10 w-10 animate-pulse rounded-lg bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

async function ActivityLoader() {
  await connection();
  const activities = await getRecentActivities(15);
  return <ActivityFeed activities={activities} />;
}

function ActivitySkeleton() {
  return (
    <div className="space-y-2">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg px-3 py-3">
          <div className="h-8 w-8 animate-pulse rounded-lg bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-2.5 w-1/4 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Quick navigation for workload distribution
function QuickNav() {
  const navItems = [
    {
      label: 'Active Projects',
      href: '/projects?group=active',
      icon: Folder,
      color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    },
    {
      label: 'All Clients',
      href: '/clients',
      icon: Users,
      color: 'bg-violet-500/10 text-violet-500',
    },
    {
      label: 'Schedule',
      href: '/schedule',
      icon: Calendar,
      color: 'bg-primary/10 text-primary',
    },
    {
      label: 'Issues',
      href: '/issues',
      icon: Briefcase,
      color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {navItems.map((item, index) => (
        <Link
          key={item.label}
          href={item.href}
          className="surface slide-up group flex items-center gap-3 rounded-lg p-3 transition-all duration-200 hover:border-primary/20 hover:shadow-sm"
          style={{ animationDelay: `${(index + 6) * 60}ms` }}
        >
          <div
            className={`rounded-md p-2 ${item.color} transition-transform group-hover:scale-110`}
          >
            <item.icon className="h-4 w-4" />
          </div>
          <span className="truncate text-sm font-medium text-foreground">{item.label}</span>
        </Link>
      ))}
    </div>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl space-y-6 px-6 py-8">
        {/* Header */}
        <header className="fade-in">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                Overview of your projects, clients, and team workload
              </p>
            </div>
            <div className="hidden items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 md:flex">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                All systems operational
              </span>
            </div>
          </div>
        </header>

        {/* Stats */}
        <Suspense fallback={<StatsSkeleton />}>
          <StatsLoader />
        </Suspense>

        {/* Quick Navigation - Workload Distribution */}
        <div className="pt-2">
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Quick Access
          </h2>
          <QuickNav />
        </div>

        {/* Activity Feed and Active Users */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Activity Feed */}
          <div
            className="surface-elevated slide-up rounded-xl lg:col-span-2"
            style={{ animationDelay: '400ms' }}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-violet-500/10 p-2">
                  <ArrowUpRight className="h-4 w-4 text-violet-500" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Recent Activity</h2>
                  <p className="text-xs text-muted-foreground">
                    Latest updates across all projects
                  </p>
                </div>
              </div>
              <Link
                href="/issues"
                className="text-xs font-medium text-primary transition-colors hover:text-primary/80"
              >
                View all issues →
              </Link>
            </div>
            <div className="max-h-[400px] overflow-y-auto p-4">
              <Suspense fallback={<ActivitySkeleton />}>
                <ActivityLoader />
              </Suspense>
            </div>
          </div>

          {/* Active Users & Team Chat */}
          <div className="space-y-4">
            <div
              className="surface-elevated slide-up rounded-xl p-4"
              style={{ animationDelay: '480ms' }}
            >
              <DashboardActiveUsers />
            </div>
            <div
              className="surface-elevated slide-up rounded-xl p-4"
              style={{ animationDelay: '560ms' }}
            >
              <div className="mb-3 flex items-center gap-2">
                <div className="rounded-md bg-primary/10 p-1.5">
                  <MessageCircle className="h-3.5 w-3.5 text-primary" />
                </div>
                <span className="text-xs font-medium text-foreground">Team Chat</span>
              </div>
              <p className="mb-3 text-xs text-muted-foreground">
                Click the chat button in the bottom right corner to start chatting with your team.
              </p>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <Circle className="h-1.5 w-1.5 fill-emerald-500 text-emerald-500" />
                <span>Real-time messaging enabled</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
