import { Skeleton } from '@/components/ui/skeleton';

export default function ActivityLoading() {
  return (
    <div className="space-y-4 px-4 pb-6 pt-16 md:px-6 md:pt-6">
      <header className="rounded-xl border border-border bg-card px-3 py-3 shadow-[0_1px_0_hsl(var(--border)/0.45)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-20 bg-muted/50" />
            <span className="hidden h-1 w-1 rounded-full bg-border sm:block" />
            <Skeleton className="h-4 w-64 max-w-[52vw] bg-muted/40" />
          </div>
          <Skeleton className="h-6 w-20 rounded-md bg-muted/50" />
        </div>
      </header>

      {/* Activity feed skeleton */}
      <div className="space-y-5">
        {[1, 2].map((group) => (
          <section key={group}>
            <div className="mb-3 flex items-center gap-3">
              <Skeleton className="h-3 w-20 bg-muted/50" />
              <div className="h-px flex-1 bg-border/40" />
            </div>
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 border-b border-border/40 px-4 py-3.5 last:border-b-0"
                >
                  <Skeleton className="h-7 w-7 rounded-full bg-muted/60" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-3.5 w-48 bg-muted/50" />
                    <Skeleton className="h-3 w-24 bg-muted/40" />
                  </div>
                  <Skeleton className="h-3 w-12 bg-muted/40" />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
