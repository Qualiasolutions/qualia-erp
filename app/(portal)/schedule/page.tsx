import { Suspense } from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import {
  addDays,
  addWeeks,
  endOfMonth,
  formatISO,
  isValid,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import dynamic from 'next/dynamic';
import { getMeetings } from '@/app/actions';
import { getPortalAuthUser, getPortalProfile } from '@/lib/portal-cache';

const QualiaScheduleWeek = dynamic(
  () =>
    import('@/components/portal/qualia-schedule-week').then((m) => ({
      default: m.QualiaScheduleWeek,
    })),
  {
    loading: () => (
      <div className="flex h-full flex-col gap-4 p-6 lg:p-8">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-3 w-40 animate-pulse rounded bg-muted" />
            <div className="h-7 w-36 animate-pulse rounded bg-muted" />
          </div>
        </div>
        <div className="flex-1 rounded-xl border border-border bg-card" />
      </div>
    ),
  }
);

export const metadata: Metadata = {
  title: 'Schedule | Qualia',
  description: 'Team schedule and calendar',
};

type ScheduleView = 'day' | 'week' | 'month';

function resolveView(viewParam?: string): ScheduleView {
  if (viewParam === 'day' || viewParam === 'week' || viewParam === 'month') return viewParam;
  return 'week';
}

function resolveAnchor(anchorParam: string | undefined, view: ScheduleView): Date {
  const candidate = anchorParam ? parseISO(anchorParam) : null;
  const base = candidate && isValid(candidate) ? candidate : new Date();
  if (view === 'day') return base;
  if (view === 'week') return startOfWeek(base, { weekStartsOn: 1 });
  return startOfMonth(base);
}

function rangeForView(anchor: Date, view: ScheduleView): { start: Date; end: Date } {
  if (view === 'day') {
    return { start: anchor, end: addDays(anchor, 1) };
  }
  if (view === 'week') {
    return { start: anchor, end: addDays(anchor, 7) };
  }
  // Month: cover the full 6-row grid (Monday-anchored).
  const gridStart = startOfWeek(anchor, { weekStartsOn: 1 });
  const gridEnd = addWeeks(gridStart, 6);
  // also ensure the month's natural end is included if it extends past gridEnd (rare)
  const monthEnd = endOfMonth(anchor);
  return {
    start: gridStart,
    end: gridEnd > monthEnd ? gridEnd : addDays(monthEnd, 1),
  };
}

async function ScheduleLoader({
  anchorISO,
  view,
  userId,
}: {
  anchorISO: string;
  view: ScheduleView;
  userId: string;
}) {
  await connection();

  let meetings;
  try {
    const anchor = parseISO(anchorISO);
    const range = rangeForView(anchor, view);
    meetings = await getMeetings(undefined, null, {
      start: range.start.toISOString(),
      end: range.end.toISOString(),
    });
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

  return (
    <QualiaScheduleWeek
      initialMeetings={meetings}
      anchor={anchorISO}
      view={view}
      currentUserId={userId}
    />
  );
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
          <div className="h-11 w-32 animate-pulse rounded-lg bg-muted" />
          <div className="h-11 w-24 animate-pulse rounded-lg bg-muted" />
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
  searchParams: Promise<{ week?: string; anchor?: string; view?: string }>;
}) {
  const user = await getPortalAuthUser();
  if (!user) redirect('/auth/login');
  const profile = await getPortalProfile(user.id);
  if (profile?.role === 'client') redirect('/dashboard');

  const params = await searchParams;
  const view = resolveView(params.view);
  // Backwards-compat: old `?week=` links still work as an anchor when view=week.
  const anchor = resolveAnchor(params.anchor ?? params.week, view);
  const anchorISO = formatISO(anchor, { representation: 'date' });

  return (
    <div className="flex h-full flex-col">
      <Suspense fallback={<ScheduleSkeleton />}>
        <ScheduleLoader anchorISO={anchorISO} view={view} userId={user.id} />
      </Suspense>
    </div>
  );
}
