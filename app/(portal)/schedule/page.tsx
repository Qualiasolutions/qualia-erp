import { Suspense } from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { startOfWeek, parseISO, isValid, formatISO, addDays } from 'date-fns';
import { getMeetings } from '@/app/actions';
import { getPortalAuthUser, getPortalProfile } from '@/lib/portal-cache';
import { QualiaScheduleWeek } from '@/components/portal/qualia-schedule-week';

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
    const weekStart = parseISO(weekStartISO);
    const dateRange = {
      start: weekStart.toISOString(),
      end: addDays(weekStart, 7).toISOString(),
    };
    const meetings = await getMeetings(undefined, scopeToUserId, dateRange);

    return (
      <QualiaScheduleWeek
        initialMeetings={meetings}
        weekStart={weekStartISO}
        currentUserId={userId}
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
          <div className="h-11 w-32 animate-pulse rounded-xl bg-muted" />
          <div className="h-11 w-24 animate-pulse rounded-xl bg-muted" />
        </div>
      </div>
      <div className="flex-1 rounded-2xl border border-border bg-card">
        <div className="grid grid-cols-8 gap-px border-b border-border bg-border/30">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-muted/20 p-3">
              <div className="mx-auto h-3 w-8 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-8 gap-px bg-border/30">
          {Array.from({ length: 8 * 12 }).map((_, i) => (
            <div key={i} className="h-12 bg-card" />
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
      <Suspense fallback={<ScheduleSkeleton />}>
        <ScheduleLoader
          weekStartISO={weekStartISO}
          userId={user.id}
          scopeToUserId={scopeToUserId}
        />
      </Suspense>
    </div>
  );
}
