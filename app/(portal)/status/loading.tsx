import { Activity } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function StatusLoading() {
  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-border bg-card/80 px-4 py-3 backdrop-blur-xl sm:px-6 md:min-h-14 md:justify-end md:px-6 md:py-2">
        <div className="flex items-center gap-2.5 md:sr-only md:absolute md:h-px md:w-px md:overflow-hidden">
          <div className="h-[44px] w-[44px]" />
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
            <Activity className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="text-sm font-semibold text-foreground">System Status</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-30" />
            <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
          </span>
          Live
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="space-y-6 p-4 md:p-6 lg:p-8">
          <div className="grid grid-cols-2 divide-x divide-y divide-border/70 overflow-hidden rounded-xl border border-border bg-card md:grid-cols-5 md:divide-y-0">
            <div className="col-span-2 flex items-center gap-4 p-5">
              <Skeleton className="size-10 rounded-lg bg-muted/50" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-36 bg-muted/50" />
                <Skeleton className="h-3 w-24 bg-muted/40" />
              </div>
            </div>
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex flex-col justify-center px-5 py-4">
                <Skeleton className="h-2.5 w-16 bg-muted/45" />
                <Skeleton className="mt-2 h-6 w-12 bg-muted/50" />
              </div>
            ))}
          </div>

          {[1, 2].map((section) => (
            <section key={section} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-8 rounded-lg bg-muted/50" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-32 bg-muted/50" />
                    <Skeleton className="h-3 w-20 bg-muted/40" />
                  </div>
                </div>
                <Skeleton className="h-6 w-16 rounded-full bg-muted/45" />
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="overflow-hidden rounded-xl border border-border bg-card p-4"
                  >
                    <div className="mb-4 flex items-start justify-between">
                      <Skeleton className="size-10 rounded-lg bg-muted/50" />
                      <Skeleton className="size-2.5 rounded-full bg-muted/45" />
                    </div>
                    <Skeleton className="mb-1 h-4 w-3/4 bg-muted/50" />
                    <div className="mb-3 flex items-center gap-2">
                      <Skeleton className="h-3 w-16 bg-muted/40" />
                      <Skeleton className="h-3 w-10 bg-muted/40" />
                    </div>
                    <div className="flex items-center gap-0.5">
                      {[...Array(20)].map((_, j) => (
                        <Skeleton key={j} className="h-4 w-[3px] rounded-[1px] bg-muted/45" />
                      ))}
                      <Skeleton className="ml-1.5 h-3 w-10 bg-muted/40" />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
