import { Suspense } from "react";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRecentActivities } from "@/app/actions";
import { ActivityFeed } from "@/components/activity-feed";
import Chat from "@/components/chat";
import { Folder, ListTodo, CheckCircle2, ArrowUpRight, Circle } from "lucide-react";

interface DashboardStats {
  activeProjects: number;
  totalIssues: number;
  completed: number;
}

async function getStats(): Promise<DashboardStats> {
  await connection();
  const supabase = await createClient();

  const { count: activeProjects } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'Active');

  const { count: totalIssues } = await supabase
    .from('issues')
    .select('*', { count: 'exact', head: true });

  const { count: completed } = await supabase
    .from('issues')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'Done');

  return {
    activeProjects: activeProjects || 0,
    totalIssues: totalIssues || 0,
    completed: completed || 0,
  };
}

async function StatsLoader() {
  const stats = await getStats();
  const completionRate = stats.totalIssues > 0
    ? Math.round((stats.completed / stats.totalIssues) * 100)
    : 0;

  const statItems = [
    {
      label: 'Active Projects',
      value: stats.activeProjects,
      icon: Folder,
      accent: 'primary',
      trend: '+2 this week'
    },
    {
      label: 'Total Issues',
      value: stats.totalIssues,
      icon: ListTodo,
      accent: 'violet',
      trend: 'Across all projects'
    },
    {
      label: 'Completed',
      value: stats.completed,
      icon: CheckCircle2,
      accent: 'emerald',
      trend: `${completionRate}% completion rate`
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {statItems.map((stat, index) => (
        <div
          key={stat.label}
          className="group relative surface-elevated rounded-xl p-5 transition-all duration-300 hover:shadow-md slide-up"
          style={{ animationDelay: `${index * 80}ms` }}
        >
          <div className="flex items-start justify-between">
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {stat.label}
              </p>
              <p className="text-4xl font-semibold text-foreground tracking-tight tabular-nums">
                {stat.value}
              </p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Circle className="w-1.5 h-1.5 fill-current" />
                {stat.trend}
              </p>
            </div>
            <div className={`p-2.5 rounded-lg transition-all duration-300 ${
              stat.accent === 'primary'
                ? 'bg-primary/10 text-primary group-hover:bg-primary/15'
                : stat.accent === 'violet'
                ? 'bg-violet-500/10 text-violet-500 group-hover:bg-violet-500/15'
                : 'bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500/15'
            }`}>
              <stat.icon className="w-5 h-5" />
            </div>
          </div>
        </div>
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

export default function Home() {
  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Header */}
        <header className="fade-in">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold text-foreground tracking-tight">
                Dashboard
              </h1>
              <p className="text-sm text-muted-foreground">
                Here&apos;s what&apos;s happening across your workspace
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

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Stats & Activity Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stats */}
            <Suspense fallback={<StatsSkeleton />}>
              <StatsLoader />
            </Suspense>

            {/* Activity Feed */}
            <div className="surface-elevated rounded-xl slide-up" style={{ animationDelay: '240ms' }}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-violet-500/10">
                    <ArrowUpRight className="w-4 h-4 text-violet-500" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">Recent Activity</h2>
                    <p className="text-xs text-muted-foreground">Latest updates from your team</p>
                  </div>
                </div>
              </div>
              <div className="p-4 min-h-[360px]">
                <Suspense fallback={<ActivitySkeleton />}>
                  <ActivityLoader />
                </Suspense>
              </div>
            </div>
          </div>

          {/* AI Assistant Column */}
          <div className="lg:col-span-1 slide-up" style={{ animationDelay: '320ms' }}>
            <div className="sticky top-6">
              <Chat />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
