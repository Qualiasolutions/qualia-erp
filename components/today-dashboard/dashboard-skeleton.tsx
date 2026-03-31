'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { Clock } from 'lucide-react';

/**
 * Schedule Grid Skeleton - matches DailyScheduleGrid layout
 */
function ScheduleGridSkeleton() {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-2.5">
          <Clock className="size-3.5 text-foreground/15" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-3.5 w-20" />
        </div>
        <div className="flex items-center gap-1">
          <Skeleton className="size-7 rounded-md" />
          <Skeleton className="size-7 rounded-md" />
        </div>
      </div>

      {/* Column Headers */}
      <div className="flex shrink-0 border-b border-border" style={{ height: 36 }}>
        <div className="shrink-0 border-r border-border" style={{ width: 56 }} />
        <div className="flex flex-1 items-center gap-2 border-r border-dashed border-border px-3">
          <Skeleton className="size-[7px] rounded-full" />
          <Skeleton className="h-3 w-10" />
        </div>
        <div className="flex flex-1 items-center gap-2 px-3">
          <Skeleton className="size-[7px] rounded-full" />
          <Skeleton className="h-3 w-12" />
        </div>
      </div>

      {/* Time Grid */}
      <div className="min-h-0 flex-1 overflow-hidden">
        <div className="relative" style={{ height: 720 }}>
          {Array.from({ length: 10 }, (_, i) => (
            <div
              key={i}
              className="absolute left-0 right-0 border-b border-border"
              style={{ top: i * 72, height: 72 }}
            >
              <div
                className="absolute top-0 flex items-start justify-end border-r border-border pr-3 pt-2"
                style={{ width: 56 }}
              >
                <Skeleton className="h-2.5 w-6" />
              </div>
              <div
                className="absolute bottom-0 top-0 border-l border-dashed border-border/15"
                style={{ left: 'calc(50% + 28px)' }}
              />
            </div>
          ))}

          <div className="pointer-events-none absolute inset-y-0 right-0" style={{ left: 56 }}>
            <div className="relative h-full w-full">
              <Skeleton
                className="absolute left-[3px] right-[3px] rounded-lg opacity-30"
                style={{ top: 72, height: 54 }}
              />
              <Skeleton
                className="absolute left-[3px] right-[calc(50%+1.5px)] rounded-md opacity-20"
                style={{ top: 180, height: 40 }}
              />
              <Skeleton
                className="absolute left-[calc(50%+1.5px)] right-[3px] rounded-md opacity-20"
                style={{ top: 252, height: 40 }}
              />
              <Skeleton
                className="absolute left-[3px] right-[3px] rounded-lg opacity-25"
                style={{ top: 360, height: 72 }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Stat Card Skeleton
 */
function StatCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card/50 px-4 py-3">
      <div className="flex items-center gap-2">
        <Skeleton className="size-7 rounded-lg" />
        <Skeleton className="h-3 w-14" />
      </div>
      <Skeleton className="mt-2 h-7 w-12" />
    </div>
  );
}

/**
 * Inbox Widget Skeleton
 */
function InboxSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-2.5">
          <Skeleton className="size-4 rounded" />
          <Skeleton className="h-4 w-10" />
          <Skeleton className="h-5 w-8 rounded-full" />
        </div>
        <div className="flex items-center gap-0.5 rounded-lg bg-muted p-0.5">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-6 w-10 rounded-md" />
          ))}
        </div>
      </div>
      <div className="border-b border-border px-4 py-2">
        <Skeleton className="h-9 w-full rounded-md" />
      </div>
      <div className="flex-1 px-4 py-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="flex items-center gap-3 border-b border-border py-3">
            <Skeleton className="size-5 rounded-md" />
            <div className="flex-1">
              <Skeleton className="h-3.5 w-3/4" />
              <Skeleton className="mt-1.5 h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Meetings Skeleton
 */
function MeetingsSkeleton() {
  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <Skeleton className="size-8 rounded-lg" />
          <div>
            <Skeleton className="h-4 w-16" />
            <Skeleton className="mt-1 h-3 w-20" />
          </div>
        </div>
        <Skeleton className="size-7 rounded-md" />
      </div>
      <div className="px-4 py-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl p-3">
            <Skeleton className="size-10 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-3.5 w-3/4" />
              <Skeleton className="mt-1 h-3 w-1/2" />
            </div>
            <Skeleton className="h-8 w-14 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Projects Skeleton
 */
function ProjectsSkeleton() {
  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <div className="flex items-center gap-2">
            <Skeleton className="size-6 rounded-lg" />
            <Skeleton className="h-4 w-28" />
          </div>
          <Skeleton className="mt-1 h-3 w-20" />
        </div>
        <Skeleton className="size-8 rounded-lg" />
      </div>
      <div className="px-3 py-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl px-3 py-2.5">
            <Skeleton className="size-8 rounded-xl" />
            <div className="flex-1">
              <Skeleton className="h-3.5 w-3/4" />
              <Skeleton className="mt-2 h-1.5 w-full rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Full Dashboard Skeleton - matches TodayDashboard layout
 */
export function DashboardSkeleton() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* Top Bar */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-5">
        <div className="flex items-center gap-3">
          <Skeleton className="size-8 rounded-md lg:hidden" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-28" />
            <div className="h-3 w-px bg-foreground/10" />
            <Skeleton className="h-3.5 w-20" />
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="size-8 rounded-md" />
          ))}
        </div>
      </header>

      {/* Content */}
      <main className="min-h-0 flex-1 overflow-y-auto">
        <div className="px-5 py-5 sm:px-6 lg:px-8">
          {/* Stats Row */}
          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>

          {/* Two-column Grid */}
          <div className="grid gap-5 lg:grid-cols-5 xl:grid-cols-12">
            {/* Left Column */}
            <div className="space-y-5 lg:col-span-3 xl:col-span-7">
              <div className="overflow-hidden rounded-xl border border-border bg-card/50">
                <div className="h-[640px]">
                  <ScheduleGridSkeleton />
                </div>
              </div>
              <div className="overflow-hidden rounded-xl border border-border bg-card/50">
                <div className="max-h-[440px]">
                  <MeetingsSkeleton />
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-5 lg:col-span-2 xl:col-span-5">
              <div className="overflow-hidden rounded-xl border border-border bg-card/50">
                <div className="h-[640px]">
                  <InboxSkeleton />
                </div>
              </div>
              <div className="overflow-hidden rounded-xl border border-border bg-card/50">
                <div className="max-h-[440px]">
                  <ProjectsSkeleton />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export { ScheduleGridSkeleton };
