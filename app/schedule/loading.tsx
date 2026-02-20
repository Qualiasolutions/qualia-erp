import { Skeleton } from '@/components/ui/skeleton';
import { Calendar } from 'lucide-react';

export default function ScheduleLoading() {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="rounded-lg bg-violet-500/10 p-1.5 sm:p-2">
            <Calendar className="h-3.5 w-3.5 text-violet-500 sm:h-4 sm:w-4" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-foreground">Schedule</h1>
            <p className="hidden text-xs text-muted-foreground sm:block">
              Manage your meetings and events
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-32 rounded-md" />
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>
      </header>

      {/* Content Skeleton */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="space-y-4">
          {/* Stats skeleton */}
          <div
            className="flex animate-fade-in items-center gap-5"
            style={{ animationFillMode: 'both' }}
          >
            <div className="flex items-center gap-2">
              <Skeleton className="h-7 w-8" />
              <Skeleton className="h-4 w-12" />
            </div>
            <div className="h-5 w-px bg-border" />
            <div className="flex items-center gap-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>

          {/* Calendar skeleton */}
          <div
            className="animate-slide-up overflow-hidden rounded-lg border border-border bg-card"
            style={{ animationDelay: '80ms', animationFillMode: 'both' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border bg-secondary/50 px-4 py-3">
              <div className="flex items-center gap-4">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-6 w-24" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-7 w-14" />
                <Skeleton className="h-7 w-7" />
                <Skeleton className="h-7 w-7" />
              </div>
            </div>
            {/* Time grid skeleton */}
            <div className="grid grid-cols-[80px_1fr]">
              <div className="space-y-0">
                {[...Array(10)].map((_, i) => (
                  <div
                    key={i}
                    className="flex h-[55px] items-start justify-end border-b border-border/50 pr-2"
                  >
                    <Skeleton className="h-3 w-8" />
                  </div>
                ))}
              </div>
              <div className="relative border-l border-border">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="h-[55px] border-b border-border/50" />
                ))}
                {/* Meeting placeholders with animation */}
                <div
                  className="absolute left-2 right-2 top-[55px] h-[82px] animate-scale-in rounded-md bg-violet-500/10"
                  style={{ animationDelay: '200ms', animationFillMode: 'both' }}
                />
                <div
                  className="absolute left-2 right-2 top-[220px] h-[55px] animate-scale-in rounded-md bg-violet-500/10"
                  style={{ animationDelay: '280ms', animationFillMode: 'both' }}
                />
                <div
                  className="absolute left-2 right-2 top-[385px] h-[55px] animate-scale-in rounded-md bg-emerald-500/10"
                  style={{ animationDelay: '360ms', animationFillMode: 'both' }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
