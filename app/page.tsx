import { Suspense } from "react";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRecentActivities } from "@/app/actions";
import { ActivityFeed } from "@/components/activity-feed";
import Chat from "@/components/chat";
import { Folder, ListTodo, CheckCircle2, TrendingUp, Activity, Sparkles } from "lucide-react";

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
      color: 'qualia',
      description: 'Currently in progress'
    },
    {
      label: 'Total Issues',
      value: stats.totalIssues,
      icon: ListTodo,
      color: 'purple',
      description: 'Across all projects'
    },
    {
      label: 'Completed',
      value: stats.completed,
      icon: CheckCircle2,
      color: 'green',
      description: `${completionRate}% completion rate`
    },
  ];

  const colorClasses = {
    qualia: {
      bg: 'bg-qualia-500/10',
      border: 'border-qualia-500/20',
      text: 'text-qualia-400',
      glow: 'shadow-[0_0_20px_-5px_rgba(0,255,209,0.3)]'
    },
    purple: {
      bg: 'bg-neon-purple/10',
      border: 'border-neon-purple/20',
      text: 'text-neon-purple',
      glow: 'shadow-[0_0_20px_-5px_rgba(139,92,246,0.3)]'
    },
    green: {
      bg: 'bg-neon-green/10',
      border: 'border-neon-green/20',
      text: 'text-neon-green',
      glow: 'shadow-[0_0_20px_-5px_rgba(16,185,129,0.3)]'
    },
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {statItems.map((stat, index) => {
        const colors = colorClasses[stat.color as keyof typeof colorClasses];
        return (
          <div
            key={stat.label}
            className={`glass-card rounded-2xl p-5 transition-all duration-300 hover:scale-[1.02] hover:${colors.glow} group`}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                <p className="text-3xl font-bold text-foreground tracking-tight">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </div>
              <div className={`p-3 rounded-xl ${colors.bg} border ${colors.border} transition-all duration-300 group-hover:scale-110`}>
                <stat.icon className={`w-5 h-5 ${colors.text}`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="glass-card rounded-2xl p-5 animate-pulse">
          <div className="flex items-start justify-between">
            <div className="space-y-3">
              <div className="w-24 h-3 bg-white/10 rounded" />
              <div className="w-16 h-8 bg-white/10 rounded" />
              <div className="w-32 h-3 bg-white/10 rounded" />
            </div>
            <div className="w-11 h-11 bg-white/10 rounded-xl" />
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
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-start gap-3 py-3 px-4 rounded-xl bg-white/[0.02] animate-pulse">
          <div className="w-9 h-9 bg-white/10 rounded-xl" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-white/10 rounded w-3/4" />
            <div className="h-3 bg-white/10 rounded w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  return (
    <div className="relative min-h-screen">
      {/* Background effects */}
      <div className="fixed inset-0 bg-grid opacity-40 pointer-events-none" />
      <div className="fixed inset-0 bg-radial-glow pointer-events-none" />

      <div className="relative z-10 p-8 max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex items-center justify-between animate-fade-in">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-foreground tracking-tight">
                Dashboard
              </h1>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-qualia-500/10 border border-qualia-500/20">
                <span className="w-2 h-2 rounded-full bg-qualia-500 animate-pulse" />
                <span className="text-xs font-medium text-qualia-400">Live</span>
              </div>
            </div>
            <p className="text-muted-foreground">
              Welcome back. Here&apos;s what&apos;s happening across your workspace.
            </p>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl glass border-white/10 text-sm text-muted-foreground">
              <TrendingUp className="w-4 h-4 text-neon-green" />
              <span>All systems operational</span>
            </div>
          </div>
        </header>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Stats & Activity Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stats */}
            <div className="animate-slide-up" style={{ animationDelay: '100ms' }}>
              <Suspense fallback={<StatsSkeleton />}>
                <StatsLoader />
              </Suspense>
            </div>

            {/* Activity Feed */}
            <div
              className="glass-card rounded-2xl p-6 min-h-[400px] animate-slide-up"
              style={{ animationDelay: '200ms' }}
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-neon-purple/10 border border-neon-purple/20">
                    <Activity className="w-4 h-4 text-neon-purple" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Recent Activity</h3>
                    <p className="text-xs text-muted-foreground">Latest updates from your team</p>
                  </div>
                </div>
              </div>
              <Suspense fallback={<ActivitySkeleton />}>
                <ActivityLoader />
              </Suspense>
            </div>
          </div>

          {/* AI Assistant Column */}
          <div
            className="lg:col-span-1 animate-slide-up"
            style={{ animationDelay: '300ms' }}
          >
            <div className="sticky top-8">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-xl bg-qualia-500/10 border border-qualia-500/20">
                  <Sparkles className="w-4 h-4 text-qualia-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">AI Assistant</h3>
                  <p className="text-xs text-muted-foreground">Powered by Gemini</p>
                </div>
              </div>
              <Chat />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
