import { Skeleton } from '@/components/ui/skeleton';

/**
 * Schedule loading skeleton — mirrors the actual schedule page layout:
 * PageHeader + content area with sidebar (xl) + calendar grid.
 * Full-bleed: manages its own padding since the layout wrapper has none.
 */
export default function ScheduleLoading() {
  return (
    <div className="flex h-full flex-col">
      {/* PageHeader skeleton — matches PageHeader component */}
      <header className="flex items-center justify-between border-b border-border bg-card/80 px-6 py-4 backdrop-blur-xl sm:px-8">
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-7 w-7 rounded-lg" />
          <Skeleton className="h-5 w-20 rounded" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
      </header>

      {/* Content area — matches schedule page padding */}
      <div className="flex-1 overflow-hidden px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex h-full gap-5">
          {/* Sidebar skeleton — xl only, matches MeetingDaySidebar */}
          <div className="hidden w-80 shrink-0 overflow-hidden rounded-xl border border-border bg-card xl:block">
            <div className="px-5 pb-3 pt-5">
              <Skeleton className="h-4 w-28 rounded" />
            </div>
            <div className="space-y-1 px-3 pb-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg px-3 py-2.5">
                  <Skeleton className="size-8 shrink-0 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-24 rounded" />
                    <Skeleton className="h-3 w-16 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Calendar skeleton — matches CalendarView / WeeklyView */}
          <div className="min-w-0 flex-1 overflow-hidden rounded-xl border border-border bg-card">
            {/* Calendar toolbar */}
            <div className="flex items-center justify-between px-6 py-4">
              <Skeleton className="h-6 w-40 rounded" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <Skeleton className="h-8 w-20 rounded-lg" />
                <Skeleton className="h-8 w-8 rounded-lg" />
              </div>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 gap-px border-t border-border bg-border">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="bg-muted/50 py-3 text-center">
                  <Skeleton className="mx-auto h-3 w-8 rounded" />
                </div>
              ))}
            </div>

            {/* Calendar cells — 5 rows x 7 cols */}
            <div className="grid grid-cols-7 gap-px bg-border">
              {Array.from({ length: 35 }).map((_, i) => (
                <div key={i} className="h-24 bg-card p-2">
                  <Skeleton className="size-7 rounded-full" />
                  {/* Some cells show event placeholders */}
                  {i % 5 === 1 && <Skeleton className="mt-1.5 h-4 w-full rounded" />}
                  {i % 7 === 3 && (
                    <div className="mt-1.5 space-y-1">
                      <Skeleton className="h-4 w-full rounded" />
                      <Skeleton className="h-4 w-3/4 rounded" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
