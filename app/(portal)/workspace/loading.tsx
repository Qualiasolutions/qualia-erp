import { Skeleton } from '@/components/ui/skeleton';

export default function AdminLoading() {
  return (
    <div className="space-y-4 px-4 pb-6 pt-16 md:px-6 md:pt-6">
      <header className="rounded-xl border border-border bg-card px-3 py-3 shadow-[0_1px_0_hsl(var(--border)/0.45)]">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-24 bg-muted/50" />
          <span className="hidden h-1 w-1 rounded-full bg-border sm:block" />
          <Skeleton className="h-4 w-56 max-w-[52vw] bg-muted/40" />
        </div>
      </header>

      {/* Tabs skeleton */}
      <div className="flex flex-wrap gap-2 border-b border-border">
        {[72, 96, 82, 92].map((width) => (
          <Skeleton key={width} className="h-10 rounded-t-lg bg-muted/45" style={{ width }} />
        ))}
      </div>

      {/* Content area skeleton */}
      <section className="rounded-xl border border-border bg-card p-5 md:p-6">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-36 bg-muted/50" />
            <Skeleton className="h-3 w-64 max-w-full bg-muted/40" />
          </div>
          <Skeleton className="h-9 w-28 rounded-lg bg-muted/50" />
        </div>
        <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border/50 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-card p-4">
              <Skeleton className="h-8 w-8 rounded-lg bg-muted/50" />
              <Skeleton className="mt-3 h-4 w-32 bg-muted/50" />
              <Skeleton className="mt-2 h-3 w-full bg-muted/40" />
              <Skeleton className="mt-4 h-6 w-16 rounded-full bg-muted/45" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
