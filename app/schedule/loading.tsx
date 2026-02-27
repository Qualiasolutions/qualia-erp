import { Calendar } from 'lucide-react';

export default function ScheduleLoading() {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border/20 bg-background px-6 py-3.5">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <h1 className="text-[15px] font-medium text-foreground">Schedule</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-32 animate-pulse rounded-md bg-muted" />
          <div className="h-9 w-28 animate-pulse rounded-md bg-muted" />
        </div>
      </header>

      {/* Content Skeleton */}
      <div className="flex-1 overflow-y-auto p-6">
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
      </div>
    </div>
  );
}
