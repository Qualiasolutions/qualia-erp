import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getRecentActivities } from "@/app/actions";
import { ActivityFeed } from "@/components/activity-feed";
import Chat from "@/components/chat";

export const dynamic = 'force-dynamic';

interface DashboardStats {
  activeProjects: number;
  totalIssues: number;
  completed: number;
}

async function getStats(): Promise<DashboardStats> {
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

  const statItems = [
    { label: 'Active Projects', value: stats.activeProjects },
    { label: 'Total Issues', value: stats.totalIssues },
    { label: 'Completed', value: stats.completed },
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
      {statItems.map((stat) => (
        <div key={stat.label} className="bg-card border border-border p-4 rounded-lg">
          <div className="text-sm text-muted-foreground">{stat.label}</div>
          <div className="text-2xl font-medium text-foreground mt-1">{stat.value}</div>
        </div>
      ))}
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-4 animate-pulse">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-card border border-border p-4 rounded-lg">
          <div className="w-20 h-4 bg-muted rounded mb-2" />
          <div className="w-12 h-8 bg-muted rounded" />
        </div>
      ))}
    </div>
  );
}

async function ActivityLoader() {
  const activities = await getRecentActivities(15);
  return <ActivityFeed activities={activities} />;
}

function ActivitySkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-start gap-3 py-3 px-4">
          <div className="w-8 h-8 bg-muted rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-3 bg-muted rounded w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back to Qualia.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stats & Activity */}
        <div className="lg:col-span-2 space-y-6">
          <Suspense fallback={<StatsSkeleton />}>
            <StatsLoader />
          </Suspense>

          <div className="bg-card border border-border rounded-lg p-6 min-h-[400px]">
            <h3 className="text-lg font-medium text-foreground mb-4">Recent Activity</h3>
            <Suspense fallback={<ActivitySkeleton />}>
              <ActivityLoader />
            </Suspense>
          </div>
        </div>

        {/* AI Assistant */}
        <div className="lg:col-span-1">
          <Chat />
        </div>
      </div>
    </div>
  );
}
