import { Suspense } from "react";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRecentActivities, getCurrentWorkspaceId } from "@/app/actions";
import { ActivityFeed } from "@/components/activity-feed";
import Link from "next/link";
import {
  Folder,
  ArrowUpRight,
  Circle,
  Users,
  Calendar,
  Briefcase,
} from "lucide-react";

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
      trend: 'Across all groups'
    },
    {
      label: 'Active Clients',
      value: stats.clientsActive,
      icon: Users,
      accent: 'blue',
      href: '/clients',
      trend: 'Engaged clients'
    },
    {
      label: 'This Week',
      value: stats.meetingsThisWeek,
      icon: Calendar,
      accent: 'violet',
      href: '/schedule',
      trend: 'Scheduled meetings'
    },
  ];

  const accentClasses: Record<string, string> = {
    primary: 'bg-primary/10 text-primary',
    blue: 'bg-blue-500/10 text-blue-500',
    violet: 'bg-violet-500/10 text-violet-500',
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {primaryStats.map((stat, index) => (
        <Link
          key={stat.label}
          href={stat.href}
          className="group relative surface-elevated rounded-xl p-5 transition-all duration-300 hover:shadow-md hover:border-primary/20 slide-up"
          style={{ animationDelay: `${index * 80}ms` }}
        >
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {stat.label}
              </p>
              <p className="text-3xl font-semibold text-foreground tracking-tight tabular-nums">
                {stat.value}
              </p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Circle className="w-1.5 h-1.5 fill-current" />
                {stat.trend}
              </p>
            </div>
            <div className={`p-2.5 rounded-lg transition-all duration-300 ${accentClasses[stat.accent]} group-hover:scale-110`}>
              <stat.icon className="w-5 h-5" />
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="surface-elevated rounded-xl p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-3">
              <div className="w-24 h-3 bg-muted rounded animate-pulse" />
              <div className="w-16 h-10 bg-muted rounded animate-pulse" />
              <div className="w-28 h-3 bg-muted rounded animate-pulse" />
            </div>
            <div className="w-10 h-10 bg-muted rounded-lg animate-pulse" />
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
        <div key={i} className="flex items-center gap-3 py-3 px-3 rounded-lg">
          <div className="w-8 h-8 bg-muted rounded-lg animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 bg-muted rounded w-3/4 animate-pulse" />
            <div className="h-2.5 bg-muted rounded w-1/4 animate-pulse" />
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
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {navItems.map((item, index) => (
        <Link
          key={item.label}
          href={item.href}
          className="group flex items-center gap-3 surface rounded-lg p-3 transition-all duration-200 hover:shadow-sm hover:border-primary/20 slide-up"
          style={{ animationDelay: `${(index + 6) * 60}ms` }}
        >
          <div className={`p-2 rounded-md ${item.color} transition-transform group-hover:scale-110`}>
            <item.icon className="w-4 h-4" />
          </div>
          <span className="text-sm font-medium text-foreground truncate">{item.label}</span>
        </Link>
      ))}
    </div>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <header className="fade-in">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold text-foreground tracking-tight">
                Dashboard
              </h1>
              <p className="text-sm text-muted-foreground">
                Overview of your projects, clients, and team workload
              </p>
            </div>
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
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
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Quick Access</h2>
          <QuickNav />
        </div>

        {/* Activity Feed - Full Width */}
        <div className="surface-elevated rounded-xl slide-up" style={{ animationDelay: '400ms' }}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-violet-500/10">
                <ArrowUpRight className="w-4 h-4 text-violet-500" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">Recent Activity</h2>
                <p className="text-xs text-muted-foreground">Latest updates across all projects</p>
              </div>
            </div>
            <Link
              href="/issues"
              className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
            >
              View all issues →
            </Link>
          </div>
          <div className="p-4 max-h-[400px] overflow-y-auto">
            <Suspense fallback={<ActivitySkeleton />}>
              <ActivityLoader />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
