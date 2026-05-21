import { Skeleton } from '@/components/ui/skeleton';

export default function IntegrationsLoading() {
  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-border bg-card/80 px-4 py-3 backdrop-blur-xl sm:px-6 md:min-h-14 md:justify-end md:px-6 md:py-2">
        <div className="flex items-center gap-2.5 md:sr-only md:absolute md:h-px md:w-px md:overflow-hidden">
          <div className="mr-1 h-[44px] w-[44px] md:hidden" />
          <Skeleton className="h-8 w-8 rounded-xl bg-muted/50" />
          <Skeleton className="h-5 w-28 bg-muted/50" />
        </div>
        <Skeleton className="h-7 w-20 rounded-full bg-muted/50" />
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 pb-8 pt-4 md:px-6 lg:px-8">
        <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border/50">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-card p-4 md:p-5">
              <div className="flex items-start gap-3">
                <Skeleton className="h-9 w-9 rounded-lg bg-muted/60" />
                <div className="flex-1 space-y-2 pt-0.5">
                  <Skeleton className="h-4 w-32 bg-muted/60" />
                  <Skeleton className="h-3 w-56 max-w-full bg-muted/45" />
                </div>
                <Skeleton className="h-8 w-20 rounded-lg bg-muted/55" />
              </div>
            </div>
          ))}
        </div>

        <Skeleton className="h-36 w-full rounded-xl bg-muted/45" />
      </div>
    </div>
  );
}
