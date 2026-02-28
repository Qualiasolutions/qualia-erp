import { Suspense, use } from 'react';
import { connection } from 'next/server';
import { getMeetings } from '@/app/actions';
import { getScheduledTasks } from '@/app/actions/inbox';
import { NewMeetingModal } from '@/components/new-meeting-modal';
import { ScheduleContent } from '@/components/schedule-content';
import { ScheduleViewToggle } from '@/components/schedule-view-toggle';
import { Calendar } from 'lucide-react';

async function ScheduleLoader({ view }: { view: string }) {
  await connection();
  const [meetings, tasks] = await Promise.all([getMeetings(), getScheduledTasks()]);

  return <ScheduleContent view={view} initialMeetings={meetings} initialTasks={tasks} />;
}

function ScheduleSkeleton() {
  return (
    <div className="space-y-4">
      {/* Stats skeleton */}
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-2">
          <div className="h-7 w-8 animate-pulse rounded bg-muted" />
          <div className="h-4 w-12 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-5 w-px bg-border" />
        <div className="flex items-center gap-4">
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        </div>
      </div>

      {/* Calendar skeleton */}
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-secondary/50 px-4 py-3">
          <div className="flex items-center gap-4">
            <div className="h-4 w-40 animate-pulse rounded bg-muted" />
            <div className="h-6 w-24 animate-pulse rounded bg-muted" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-7 w-14 animate-pulse rounded bg-muted" />
            <div className="h-7 w-7 animate-pulse rounded bg-muted" />
            <div className="h-7 w-7 animate-pulse rounded bg-muted" />
          </div>
        </div>
        {/* Single-column meetings grid skeleton */}
        <div className="grid grid-cols-[80px_1fr]">
          <div className="space-y-0">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="flex h-[55px] items-start justify-end border-b border-border/50 pr-2"
              >
                <div className="h-3 w-8 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
          <div className="relative border-l border-border">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="h-[55px] border-b border-border/50" />
            ))}
            {/* Meeting placeholders */}
            <div className="absolute left-2 right-2 top-[165px] h-[82px] animate-pulse rounded-md bg-violet-500/10" />
            <div className="absolute left-2 right-2 top-[385px] h-[55px] animate-pulse rounded-md bg-violet-500/10" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  // React 19: Use the use() hook to unwrap promises directly
  const params = use(searchParams);
  const view = params.view || 'day';

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex flex-col gap-3 border-b border-border/40 bg-card/80 px-5 py-3.5 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:gap-0 sm:px-8">
        <div className="flex items-center gap-2.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-500/10">
            <Calendar className="h-3 w-3 text-violet-500" />
          </div>
          <h1 className="text-sm font-semibold text-foreground">Schedule</h1>
        </div>
        <div className="flex items-center gap-2">
          <ScheduleViewToggle currentView={view} />
          <NewMeetingModal />
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 sm:p-8">
        <Suspense fallback={<ScheduleSkeleton />}>
          <ScheduleLoader view={view} />
        </Suspense>
      </div>
    </div>
  );
}
