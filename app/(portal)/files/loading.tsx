import { Skeleton } from '@/components/ui/skeleton';

export default function FilesLoading() {
  return (
    <div className="space-y-4 px-4 pb-6 pt-16 md:px-6 md:pt-6">
      <header className="rounded-xl border border-border bg-card px-3 py-3 shadow-[0_1px_0_hsl(var(--border)/0.45)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-16 bg-muted/50" />
            <span className="hidden h-1 w-1 rounded-full bg-border sm:block" />
            <Skeleton className="h-4 w-56 max-w-[52vw] bg-muted/40" />
          </div>
          <Skeleton className="h-6 w-16 rounded-md bg-muted/50" />
        </div>
      </header>

      <Skeleton className="h-12 w-full rounded-lg bg-muted/45" />
      <Skeleton className="h-10 w-full rounded-lg bg-muted/45" />

      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="flex items-center gap-3 px-5 py-3.5">
              <Skeleton className="h-4 w-4 rounded bg-muted/50" />
              <Skeleton className="h-4 w-4 rounded bg-muted/50" />
              <Skeleton className="h-4 w-40 bg-muted/50" />
              <Skeleton className="ml-auto h-5 w-14 rounded-full bg-muted/45" />
            </div>
            <div className="border-t border-border/30">
              {[1, 2].map((row) => (
                <div
                  key={row}
                  className="flex items-center gap-4 border-b border-border/30 px-5 py-4 last:border-b-0"
                >
                  <Skeleton className="h-5 w-5 rounded bg-muted/50" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-4 w-56 max-w-full bg-muted/50" />
                    <Skeleton className="h-3 w-40 bg-muted/40" />
                  </div>
                  <Skeleton className="h-9 w-9 rounded-lg bg-muted/45" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
