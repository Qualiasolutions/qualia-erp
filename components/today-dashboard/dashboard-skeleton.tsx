'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { Clock, Hammer } from 'lucide-react';

/**
 * Schedule Grid Skeleton - matches DailyScheduleGrid layout
 */
function ScheduleGridSkeleton() {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border/40 px-4">
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
      <div className="flex shrink-0 border-b border-border/30" style={{ height: 36 }}>
        <div className="shrink-0 border-r border-border/30" style={{ width: 56 }} />
        <div className="flex flex-1 items-center gap-2 border-r border-dashed border-border/25 px-3">
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
              className="absolute left-0 right-0 border-b border-border/20"
              style={{ top: i * 72, height: 72 }}
            >
              {/* Time label */}
              <div
                className="absolute top-0 flex items-start justify-end border-r border-border/30 pr-3 pt-2"
                style={{ width: 56 }}
              >
                <Skeleton className="h-2.5 w-6" />
              </div>
              {/* Column divider */}
              <div
                className="absolute bottom-0 top-0 border-l border-dashed border-border/15"
                style={{ left: 'calc(50% + 28px)' }}
              />
            </div>
          ))}

          {/* Mock schedule items */}
          <div className="pointer-events-none absolute inset-y-0 right-0" style={{ left: 56 }}>
            <div className="relative h-full w-full">
              {/* Spanning meeting placeholder */}
              <Skeleton
                className="absolute left-[3px] right-[3px] rounded-lg opacity-30"
                style={{ top: 72, height: 54 }}
              />
              {/* Task placeholder (left column) */}
              <Skeleton
                className="absolute left-[3px] right-[calc(50%+1.5px)] rounded-md opacity-20"
                style={{ top: 180, height: 40 }}
              />
              {/* Task placeholder (right column) */}
              <Skeleton
                className="absolute left-[calc(50%+1.5px)] right-[3px] rounded-md opacity-20"
                style={{ top: 252, height: 40 }}
              />
              {/* Another spanning meeting */}
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
 * Building Projects Sidebar Skeleton
 */
function BuildingSidebarSkeleton() {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border/40 px-4">
        <div className="flex items-center gap-2">
          <Hammer className="size-3.5 text-foreground/15" />
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-5 w-5 rounded-full" />
        </div>
        <Skeleton className="size-7 rounded-md" />
      </div>

      {/* Project list */}
      <div className="flex-1 px-3 py-3">
        {/* Type header */}
        <div className="mb-1.5 px-1">
          <Skeleton className="h-2.5 w-16" />
        </div>
        {/* Project rows */}
        <div className="space-y-px">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex items-center gap-2.5 rounded-lg px-2 py-[7px]"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <Skeleton className="size-6 rounded-md" />
              <Skeleton className="h-3.5 flex-1" />
            </div>
          ))}
        </div>

        {/* Second type group */}
        <div className="mb-1.5 mt-4 px-1">
          <Skeleton className="h-2.5 w-12" />
        </div>
        <div className="space-y-px">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="flex items-center gap-2.5 rounded-lg px-2 py-[7px]"
              style={{ animationDelay: `${(i + 4) * 0.1}s` }}
            >
              <Skeleton className="size-6 rounded-md" />
              <Skeleton className="h-3.5 flex-1" />
            </div>
          ))}
        </div>
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
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border/40 bg-background px-4 lg:px-5">
        <div className="flex items-center gap-3">
          <Skeleton className="size-8 rounded-md lg:hidden" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-28" />
            <div className="h-3 w-px bg-foreground/10" />
            <Skeleton className="h-3.5 w-20" />
          </div>
          <div className="ml-3 hidden items-center gap-1.5 lg:flex">
            <Skeleton className="h-7 w-20 rounded-full" />
            <Skeleton className="h-7 w-24 rounded-full" />
            <Skeleton className="h-7 w-20 rounded-full" />
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="size-8 rounded-md" />
          ))}
        </div>
      </header>

      {/* Content */}
      <div className="flex min-h-0 flex-1">
        {/* Building Projects Sidebar */}
        <aside className="hidden w-[260px] shrink-0 border-r border-border/40 lg:block">
          <BuildingSidebarSkeleton />
        </aside>

        {/* Schedule Grid */}
        <section className="min-w-0 flex-1">
          <ScheduleGridSkeleton />
        </section>
      </div>
    </div>
  );
}

// Re-export individual skeletons for use elsewhere
export { ScheduleGridSkeleton, BuildingSidebarSkeleton };
