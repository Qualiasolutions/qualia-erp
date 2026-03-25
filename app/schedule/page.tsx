import { Suspense, use } from 'react';
import { connection } from 'next/server';
import { getMeetings, getProfiles } from '@/app/actions';
import { getCurrentWorkspaceId } from '@/app/actions/workspace';
import { NewMeetingModal } from '@/components/new-meeting-modal';
import { ScheduleContent } from '@/components/schedule-content';
import { ScheduleViewToggle } from '@/components/schedule-view-toggle';
import { Calendar } from 'lucide-react';
import { PageHeader } from '@/components/page-header';

async function ScheduleLoader({ view }: { view: string }) {
  await connection();

  try {
    const workspaceId = await getCurrentWorkspaceId();
    const [meetings, profiles] = await Promise.all([
      getMeetings(),
      getProfiles(workspaceId || undefined),
    ]);

    return <ScheduleContent view={view} initialMeetings={meetings} profiles={profiles} />;
  } catch (error) {
    console.error('Failed to load schedule data:', error);
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-foreground">Failed to load schedule</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Something went wrong loading your schedule. Try refreshing the page.
          </p>
        </div>
      </div>
    );
  }
}

function ScheduleSkeleton() {
  return (
    <div>
      <div className="flex gap-5">
        {/* Sidebar skeleton */}
        <div className="hidden w-80 shrink-0 overflow-hidden rounded-xl border border-border bg-card lg:block">
          <div className="px-5 pb-3 pt-5">
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
          </div>
          <div className="space-y-2 px-3 pb-4">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg px-3 py-2.5">
                <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
                <div className="h-4 w-20 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        </div>

        {/* Calendar skeleton */}
        <div className="flex-1 overflow-hidden rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="h-6 w-40 animate-pulse rounded bg-muted" />
            <div className="flex items-center gap-2">
              <div className="h-8 w-16 animate-pulse rounded-lg bg-muted" />
              <div className="h-8 w-8 animate-pulse rounded-lg bg-muted" />
              <div className="h-8 w-8 animate-pulse rounded-lg bg-muted" />
            </div>
          </div>
          <div className="grid grid-cols-7 gap-px border-t border-border bg-border">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="bg-secondary/50 py-3 text-center">
                <div className="mx-auto h-3 w-8 animate-pulse rounded bg-muted" />
              </div>
            ))}
            {[...Array(35)].map((_, i) => (
              <div key={i} className="h-24 bg-card p-2">
                <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
              </div>
            ))}
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
  const params = use(searchParams);
  const view = params.view || 'week';

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        icon={<Calendar className="h-3.5 w-3.5 text-violet-500" />}
        iconBg="bg-violet-500/10"
        title="Schedule"
      >
        <ScheduleViewToggle currentView={view} />
        <NewMeetingModal />
      </PageHeader>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <Suspense fallback={<ScheduleSkeleton />}>
          <ScheduleLoader view={view} />
        </Suspense>
      </div>
    </div>
  );
}
