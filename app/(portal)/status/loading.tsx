import { Activity } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function StatusLoading() {
  return (
    <div className="flex h-full flex-col">
      {/* Mobile header skeleton */}
      <header className="flex items-center justify-between border-b border-border bg-card/80 px-6 py-4 backdrop-blur-xl sm:px-8 md:hidden">
        <div className="flex items-center gap-2.5">
          <div className="h-[44px] w-[44px]" />
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
            <Activity className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="text-sm font-semibold text-foreground">System Status</span>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="space-y-10 p-6 lg:p-8">
          {/* Desktop header skeleton */}
          <div className="hidden items-end justify-between md:flex">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
                  <Activity className="size-5 text-primary" />
                </div>
                <span className="text-2xl font-bold tracking-tight text-foreground">
                  System Status
                </span>
              </div>
              <div className="ml-[52px]">
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/40">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-30" />
                <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
              </span>
              Live
            </div>
          </div>

          {/* Stats bar skeleton */}
          <div className="overflow-hidden rounded-xl border border-emerald-500/15 bg-card">
            <div className="bg-gradient-to-r from-emerald-500/[0.04] via-transparent to-emerald-500/[0.02]">
              <div className="grid grid-cols-5 divide-x divide-border/20">
                {/* Status */}
                <div className="col-span-2 flex items-center gap-4 p-6">
                  <Skeleton className="size-12 rounded-xl" />
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-36" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                {/* Metrics */}
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex flex-col justify-center px-6 py-5">
                    <Skeleton className="h-2.5 w-16" />
                    <Skeleton className="mt-2 h-6 w-12" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section skeleton */}
          {[1, 2].map((section) => (
            <div key={section} className="space-y-4">
              {/* Section header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-8 rounded-xl" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>

              {/* Monitor cards grid */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="overflow-hidden rounded-xl border border-border bg-card p-5"
                  >
                    {/* Top row */}
                    <div className="mb-4 flex items-start justify-between">
                      <Skeleton className="size-14 rounded-xl" />
                      <Skeleton className="size-2.5 rounded-full" />
                    </div>
                    {/* Name */}
                    <Skeleton className="mb-1 h-4 w-3/4" />
                    {/* Status label */}
                    <div className="mb-3 flex items-center gap-2">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-3 w-10" />
                    </div>
                    {/* Uptime bar */}
                    <div className="flex items-center gap-0.5">
                      {[...Array(20)].map((_, j) => (
                        <Skeleton key={j} className="h-4 w-[3px] rounded-[1px]" />
                      ))}
                      <Skeleton className="ml-1.5 h-3 w-10" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
