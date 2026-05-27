import { Skeleton } from '@/components/ui/skeleton';

export default function NotificationsLoading() {
  return (
    <div className="space-y-4 px-4 pb-8 pt-16 md:px-6 md:pt-6">
      <header className="rounded-xl border border-border bg-card px-3 py-3 shadow-[0_1px_0_hsl(var(--border)/0.45)]">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-28 bg-muted/50" />
          <span className="hidden h-1 w-1 rounded-full bg-border sm:block" />
          <Skeleton className="h-4 w-56 max-w-[52vw] bg-muted/40" />
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <section className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="p-5 pb-0">
            <div className="mb-4 flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-lg bg-muted/50" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-40 bg-muted/50" />
                <Skeleton className="h-3 w-64 max-w-full bg-muted/40" />
              </div>
            </div>
          </div>
          <div className="grid gap-px bg-border/50 p-px md:grid-cols-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex min-h-[64px] items-center justify-between bg-card px-4 py-4"
              >
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-32 bg-muted/50" />
                  <Skeleton className="h-3 w-48 bg-muted/40" />
                </div>
                <Skeleton className="h-6 w-10 rounded-full bg-muted/50" />
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-lg bg-muted/50" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-36 bg-muted/50" />
              <Skeleton className="h-3 w-44 bg-muted/40" />
            </div>
          </div>
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-[72px] w-full rounded-lg bg-muted/45" />
            ))}
          </div>
          <Skeleton className="mt-4 h-10 w-36 rounded-lg bg-muted/50" />
        </section>
      </div>
    </div>
  );
}
