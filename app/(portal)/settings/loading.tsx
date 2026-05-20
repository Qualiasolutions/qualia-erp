import { Skeleton } from '@/components/ui/skeleton';

export default function PortalSettingsLoading() {
  return (
    <div className="space-y-4 px-4 pb-8 pt-16 md:px-6 md:pt-6">
      <header className="rounded-xl border border-border bg-card px-3 py-3 shadow-[0_1px_0_hsl(var(--border)/0.45)]">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-20 bg-muted/50" />
          <span className="hidden h-1 w-1 rounded-full bg-border sm:block" />
          <Skeleton className="h-4 w-56 max-w-[52vw] bg-muted/40" />
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <section key={i} className="rounded-xl border border-border bg-card p-5 md:p-6">
            <div className="mb-5 flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-lg bg-muted/50" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-32 bg-muted/50" />
                <Skeleton className="h-3 w-44 bg-muted/40" />
              </div>
            </div>
            <div className="space-y-4">
              <Skeleton className="h-10 w-full rounded-lg bg-muted/45" />
              <Skeleton className="h-10 w-full rounded-lg bg-muted/45" />
              <Skeleton className="h-10 w-32 rounded-lg bg-muted/50" />
            </div>
          </section>
        ))}

        <section className="overflow-hidden rounded-xl border border-border bg-card lg:col-span-2">
          <div className="p-5 pb-0 md:p-6 md:pb-0">
            <div className="mb-5 flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-lg bg-muted/50" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-40 bg-muted/50" />
                <Skeleton className="h-3 w-52 bg-muted/40" />
              </div>
            </div>
          </div>

          <div className="grid gap-px bg-border/50 p-px md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex min-h-[64px] items-center justify-between bg-card px-4 py-4 md:px-5"
              >
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-32 bg-muted/50" />
                  <Skeleton className="h-3 w-48 bg-muted/40" />
                </div>
                <Skeleton className="h-6 w-10 rounded-full bg-muted/50" />
              </div>
            ))}
          </div>

          <div className="border-t border-border bg-muted/20 px-5 py-4 md:px-6">
            <Skeleton className="h-10 w-36 rounded-lg bg-muted/50" />
          </div>
        </section>
      </div>
    </div>
  );
}
