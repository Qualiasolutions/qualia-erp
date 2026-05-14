import { Skeleton } from '@/components/ui/skeleton';

export default function RequestsLoading() {
  return (
    <div className="animate-fade-in-up px-[clamp(1.5rem,4vw,2.5rem)] pb-[clamp(2rem,4vw,3rem)] pt-16 md:pt-[clamp(2.5rem,4vw,3.5rem)]">
      {/* Eyebrow + heading */}
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-3">
          <Skeleton className="h-3 w-32 rounded-full" />
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-9 w-32 rounded-xl" />
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
            className="flex w-[300px] shrink-0 flex-col gap-2 rounded-2xl border border-border/70 bg-card/40 p-3"
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
