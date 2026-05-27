import { Skeleton } from '@/components/ui/skeleton';

export default function RequestsLoading() {
  return (
    <div className="flex h-full animate-fade-in-up flex-col px-[clamp(0.75rem,2vw,1.5rem)] pb-[clamp(1rem,2vw,1.5rem)] pt-14 md:pt-[clamp(1rem,2vw,1.25rem)]">
      {/* Compact page toolbar skeleton */}
      <header className="mb-4 rounded-xl border border-border bg-card px-3 py-3 shadow-[0_1px_0_hsl(var(--border)/0.45)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-20" />
            <span className="hidden h-1 w-1 rounded-full bg-border sm:block" />
            <Skeleton className="h-4 w-36" />
          </div>
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>
      </header>

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Skeleton className="h-9 w-64 rounded-xl" />
        <Skeleton className="h-7 w-20 rounded-full" />
        <Skeleton className="h-7 w-16 rounded-full" />
        <Skeleton className="h-7 w-16 rounded-full" />
        <Skeleton className="h-7 w-16 rounded-full" />
      </div>

      {/* Kanban / list area */}
      <div className="flex gap-3 overflow-x-hidden">
        {[1, 2, 3, 4, 5].map((col) => (
          <div
            key={col}
            className="flex w-[300px] shrink-0 flex-col gap-2 rounded-xl border border-border/70 bg-card p-3"
          >
            <div className="mb-2 flex items-center justify-between px-1">
              <div className="space-y-1">
                <Skeleton className="h-2.5 w-12" />
                <Skeleton className="h-4 w-20" />
              </div>
              <Skeleton className="h-5 w-6 rounded-full" />
            </div>
            {Array.from({ length: col === 1 ? 3 : col === 2 ? 2 : 1 }).map((_, i) => (
              <div key={i} className="space-y-2 rounded-xl border border-border/70 bg-card p-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <div className="flex gap-1.5 pt-1">
                  <Skeleton className="h-4 w-12 rounded-full" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
