import { Suspense } from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { startOfWeek, parseISO, isValid, formatISO, addDays } from 'date-fns';
import { getMeetings, getProfiles } from '@/app/actions';
import { getCurrentWorkspaceId } from '@/app/actions/workspace';
import { getPortalAuthUser, getPortalProfile } from '@/lib/portal-cache';
import { NewMeetingModal } from '@/components/new-meeting-modal';
import { QualiaSchedule } from '@/components/portal/qualia-schedule';
import { Calendar } from 'lucide-react';
import { PageHeader } from '@/components/page-header';

export const metadata: Metadata = {
  title: 'Schedule | Qualia',
  description: 'Team schedule and calendar',
};

function resolveWeekStart(weekParam?: string): Date {
  if (weekParam) {
    const parsed = parseISO(weekParam);
    if (isValid(parsed)) return startOfWeek(parsed, { weekStartsOn: 1 });
  }
  return startOfWeek(new Date(), { weekStartsOn: 1 });
}

async function ScheduleLoader({
  weekStartISO,
  userId,
  scopeToUserId,
}: {
  weekStartISO: string;
  userId: string;
  scopeToUserId?: string | null;
}) {
  await connection();

  try {
    const workspaceId = await getCurrentWorkspaceId();
    // Fetch only the displayed week — 7-day range.
    const weekStart = parseISO(weekStartISO);
    const dateRange = {
      start: weekStart.toISOString(),
      end: addDays(weekStart, 7).toISOString(),
    };
    const [meetings, profiles] = await Promise.all([
      getMeetings(undefined, scopeToUserId, dateRange),
      getProfiles(workspaceId || undefined),
    ]);

    return (
      <QualiaSchedule
        initialMeetings={meetings}
        profiles={profiles}
        currentUserId={userId}
        weekStart={weekStartISO}
      />
    );
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
    <div className="flex h-full flex-col gap-4 p-6 lg:p-8">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-3 w-40 animate-pulse rounded bg-muted" />
          <div className="h-7 w-36 animate-pulse rounded bg-muted" />
        </div>
        <div className="flex gap-3">
          <div className="h-10 w-20 animate-pulse rounded-lg bg-muted" />
          <div className="h-10 w-20 animate-pulse rounded-lg bg-muted" />
        </div>
      </div>
      <div className="flex-1 rounded-xl border border-border bg-card">
        <div className="grid grid-cols-8 gap-px border-b border-border bg-border/30">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-muted/20 p-3">
              <div className="mx-auto h-3 w-8 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-8 gap-px bg-border/30">
          {Array.from({ length: 8 * 12 }).map((_, i) => (
            <div key={i} className="h-14 bg-card" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default async function PortalSchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const user = await getPortalAuthUser();
  if (!user) redirect('/auth/login');
  const profile = await getPortalProfile(user.id);
  if (profile?.role === 'client') redirect('/');

  const params = await searchParams;
  const weekStart = resolveWeekStart(params.week);
  const weekStartISO = formatISO(weekStart, { representation: 'date' });

  const scopeToUserId = profile?.role === 'employee' ? user.id : null;

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        icon={<Calendar className="h-3.5 w-3.5 text-violet-500" />}
        iconBg="bg-violet-500/10"
        title="Schedule"
      >
        <NewMeetingModal />
      </PageHeader>

      <div className="flex-1 overflow-hidden">
        <Suspense fallback={<ScheduleSkeleton />}>
          <ScheduleLoader
            weekStartISO={weekStartISO}
            userId={user.id}
            scopeToUserId={scopeToUserId}
          />
        </Suspense>
      </div>
    </div>
  );
}
