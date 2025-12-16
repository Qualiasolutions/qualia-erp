import { Suspense } from 'react';
import { connection } from 'next/server';
import { getMeetings } from '@/app/actions';
import { NewMeetingModal } from '@/components/new-meeting-modal';
import { CalendarView } from '@/components/calendar-view';
import { WeeklyView } from '@/components/weekly-view';
import { DayView } from '@/components/day-view';
import { ScheduleViewToggle } from '@/components/schedule-view-toggle';
import { Calendar } from 'lucide-react';

async function ScheduleLoader({ view }: { view: string }) {
  await connection();
  const meetings = await getMeetings();

  if (view === 'day') {
    return <DayView meetings={meetings} />;
  }

  if (view === 'week') {
    return <WeeklyView meetings={meetings} />;
  }

  if (view === 'month') {
    return <CalendarView meetings={meetings} />;
  }

  // Default to day view
  return <DayView meetings={meetings} />;
}

function ScheduleSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="surface rounded-lg p-4">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 animate-pulse rounded-lg bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-48 animate-pulse rounded bg-muted" />
              <div className="h-3 w-32 animate-pulse rounded bg-muted" />
              <div className="flex gap-4 pt-1">
                <div className="h-3 w-20 animate-pulse rounded bg-muted" />
                <div className="h-3 w-16 animate-pulse rounded bg-muted" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const params = await searchParams;
  const view = params.view || 'day';

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex flex-col gap-3 border-b border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-0 sm:px-6 sm:py-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="rounded-lg bg-violet-500/10 p-1.5 sm:p-2">
            <Calendar className="h-3.5 w-3.5 text-violet-500 sm:h-4 sm:w-4" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-foreground sm:text-base">Schedule</h1>
            <p className="hidden text-xs text-muted-foreground sm:block">
              Manage your meetings and events
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ScheduleViewToggle currentView={view} />
          <NewMeetingModal />
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <Suspense fallback={<ScheduleSkeleton />}>
          <ScheduleLoader view={view} />
        </Suspense>
      </div>
    </div>
  );
}
