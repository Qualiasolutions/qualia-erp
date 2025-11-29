import { Suspense } from "react";
import Chat from "@/components/chat";
import { createClient } from "@/lib/supabase/server";

interface DashboardStats {
  activeProjects: number;
  myIssues: number;
  completed: number;
}

async function getStats(): Promise<DashboardStats> {
  const supabase = await createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();

  // Count active projects
  const { count: activeProjects } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'Active');

  // Count issues assigned to current user
  const { count: myIssues } = await supabase
    .from('issues')
    .select('*', { count: 'exact', head: true })
    .eq('assignee_id', user?.id || '');

  // Count completed issues
  const { count: completed } = await supabase
    .from('issues')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'Done');

  return {
    activeProjects: activeProjects || 0,
    myIssues: myIssues || 0,
    completed: completed || 0,
  };
}

async function StatsLoader() {
  const stats = await getStats();

  const statItems = [
    { label: 'Active Projects', value: stats.activeProjects },
    { label: 'My Issues', value: stats.myIssues },
    { label: 'Completed', value: stats.completed },
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
      {statItems.map((stat) => (
        <div key={stat.label} className="bg-[#1C1C1C] border border-[#2C2C2C] p-4 rounded-lg">
          <div className="text-sm text-gray-500">{stat.label}</div>
          <div className="text-2xl font-medium text-white mt-1">{stat.value}</div>
        </div>
      ))}
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-4 animate-pulse">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-[#1C1C1C] border border-[#2C2C2C] p-4 rounded-lg">
          <div className="w-20 h-4 bg-[#2C2C2C] rounded mb-2" />
          <div className="w-12 h-8 bg-[#2C2C2C] rounded" />
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
          <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
          <p className="text-gray-400">Welcome back to Qualia.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Stats / Overview */}
        <div className="col-span-2 space-y-6">
          <Suspense fallback={<StatsSkeleton />}>
            <StatsLoader />
          </Suspense>

          <div className="bg-[#1C1C1C] border border-[#2C2C2C] rounded-lg p-6 min-h-[400px]">
            <h3 className="text-lg font-medium text-white mb-4">Recent Activity</h3>
            <div className="text-center text-gray-500 py-10">
              No recent activity
            </div>
          </div>
        </div>

        {/* AI Assistant */}
        <div className="col-span-1">
          <Suspense fallback={
            <div className="flex flex-col h-[600px] w-full max-w-md border rounded-lg overflow-hidden bg-background shadow-xl animate-pulse">
              <div className="bg-muted p-4 border-b h-14" />
              <div className="flex-1 p-4" />
              <div className="p-4 border-t h-16" />
            </div>
          }>
            <Chat />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
