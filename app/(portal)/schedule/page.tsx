import { Suspense } from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { getMeetings, getProfiles } from '@/app/actions';
import { getCurrentWorkspaceId } from '@/app/actions/workspace';
import { getPortalAuthUser, getPortalProfile } from '@/lib/portal-cache';
import { NewMeetingModal } from '@/components/new-meeting-modal';
import { ScheduleContent } from '@/components/schedule-content';
import { ScheduleViewToggle } from '@/components/schedule-view-toggle';
import { Calendar } from 'lucide-react';
import { PageHeader } from '@/components/page-header';

export const metadata: Metadata = {
  title: 'Schedule | Qualia',
  description: 'Team schedule and calendar',
};

async function ScheduleLoader({
  view,
  scopeToUserId,
}: {
  view: string;
  scopeToUserId?: string | null;
}) {
  await connection();

  try {
    const workspaceId = await getCurrentWorkspaceId();
    const [meetings, profiles] = await Promise.all([
      getMeetings(undefined, scopeToUserId),
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
    <div className="flex h-full gap-5">
      {/* Sidebar skeleton — xl only, matches MeetingDaySidebar */}
      <div className="hidden w-80 shrink-0 overflow-hidden rounded-xl border border-border bg-card xl:block">
        <div className="px-5 pb-3 pt-5">
          <div className="h-4 w-28 animate-pulse rounded bg-muted" />
        </div>
        <div className="space-y-1 px-3 pb-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg px-3 py-2.5">
              <div className="size-8 shrink-0 animate-pulse rounded-full bg-muted" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-24 animate-pulse rounded bg-muted" />
                <div className="h-3 w-16 animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Calendar skeleton */}
      <div className="min-w-0 flex-1 overflow-hidden rounded-xl border border-border bg-card">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-6 py-4">
          <div className="h-6 w-40 animate-pulse rounded bg-muted" />
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 animate-pulse rounded-lg bg-muted" />
            <div className="h-8 w-20 animate-pulse rounded-lg bg-muted" />
            <div className="h-8 w-8 animate-pulse rounded-lg bg-muted" />
          </div>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-px border-t border-border bg-border">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="bg-muted/50 py-3 text-center">
              <div className="mx-auto h-3 w-8 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>

        {/* Calendar cells */}
        <div className="grid grid-cols-7 gap-px bg-border">
          {[...Array(35)].map((_, i) => (
            <div key={i} className="h-24 bg-card p-2">
              <div className="size-7 animate-pulse rounded-full bg-muted" />
              {i % 5 === 1 && <div className="mt-1.5 h-4 w-full animate-pulse rounded bg-muted" />}
              {i % 7 === 3 && (
                <div className="mt-1.5 space-y-1">
                  <div className="h-4 w-full animate-pulse rounded bg-muted" />
                  <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default async function PortalSchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const user = await getPortalAuthUser();
  if (!user) redirect('/auth/login');
  const profile = await getPortalProfile(user.id);
  if (profile?.role === 'client') redirect('/');

  const params = await searchParams;
  const view = params.view || 'week';

  // Scope meetings for employees so they only see their own relevant meetings
  const scopeToUserId = profile?.role === 'employee' ? user.id : null;

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

      <div className="flex-1 overflow-hidden px-4 py-3 sm:px-6 sm:py-4">
        <Suspense fallback={<ScheduleSkeleton />}>
          <ScheduleLoader view={view} scopeToUserId={scopeToUserId} />
        </Suspense>
      </div>
    </div>
  );
}
