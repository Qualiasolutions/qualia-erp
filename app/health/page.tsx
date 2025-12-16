import { Suspense } from 'react';
import { connection } from 'next/server';
import { getCurrentWorkspaceId } from '@/app/actions';
import { ProjectHealthDashboard } from '@/components/project-health-dashboard';
import { Activity } from 'lucide-react';

function HealthSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-lg bg-muted/30" />
        ))}
      </div>
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-40 animate-pulse rounded-lg bg-muted/30" />
        ))}
      </div>
    </div>
  );
}

async function HealthDashboardLoader() {
  await connection();
  const workspaceId = await getCurrentWorkspaceId();

  return <ProjectHealthDashboard workspaceId={workspaceId || undefined} />;
}

export default function HealthPage() {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-qualia-500/10 sm:h-10 sm:w-10">
            <Activity className="h-4 w-4 text-qualia-500 sm:h-5 sm:w-5" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-foreground sm:text-base">Health Monitor</h1>
            <p className="hidden text-xs text-muted-foreground sm:block">
              Track project health and performance metrics
            </p>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <Suspense fallback={<HealthSkeleton />}>
          <HealthDashboardLoader />
        </Suspense>
      </div>
    </div>
  );
}
