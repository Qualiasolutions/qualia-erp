import { Building2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function ClientsLoading() {
  return (
    <div className="flex h-full flex-col">
      {/* Header — matches PageHeader layout */}
      <header className="flex items-center justify-between border-b border-border bg-card/80 px-6 py-4 backdrop-blur-xl sm:px-8">
        <div className="flex items-center gap-2.5">
          {/* Hamburger placeholder on mobile */}
          <div className="mr-1 h-[44px] w-[44px] md:hidden" />
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10">
            <Building2 className="h-3.5 w-3.5 text-emerald-500" />
          </div>
          <span className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
            Clients
          </span>
        </div>
        <Skeleton className="h-9 w-28 rounded-md" />
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 sm:p-8">
        <div className="space-y-4">
          {/* Stats bar skeleton */}
          <div className="flex items-center gap-2">
            {[64, 80, 80].map((w, i) => (
              <Skeleton key={i} className="h-8 rounded-lg" style={{ width: `${w}px` }} />
            ))}
            <div className="ml-auto flex items-center gap-0.5 rounded-lg border border-border bg-secondary/50 p-0.5">
              <Skeleton className="h-7 w-7 rounded-md" />
              <Skeleton className="h-7 w-7 rounded-md" />
            </div>
          </div>

          {/* Filter bar skeleton */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <Skeleton className="h-9 w-full sm:max-w-xs sm:flex-1" />
            <Skeleton className="h-9 w-[130px]" />
            <Skeleton className="h-9 w-[140px]" />
            <Skeleton className="ml-auto h-4 w-24" />
          </div>

          {/* Table skeleton */}
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            {/* Table header */}
            <div className="flex items-center border-b border-border/40 bg-muted/50 px-4 py-3">
              <div className="w-14">
                <Skeleton className="h-3 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <Skeleton className="h-3 w-24" />
              </div>
              <div className="w-28 px-4">
                <Skeleton className="h-3 w-14" />
              </div>
              <div className="w-20 px-4">
                <Skeleton className="h-3 w-16" />
              </div>
              <div className="w-28 px-4">
                <Skeleton className="h-3 w-16" />
              </div>
              <div className="w-28 px-4">
                <Skeleton className="h-3 w-20" />
              </div>
              <div className="w-32 px-4">
                <Skeleton className="h-3 w-14" />
              </div>
              <div className="w-28 px-4">
                <Skeleton className="h-3 w-12" />
              </div>
              <div className="w-10" />
            </div>

            {/* Table rows */}
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="flex items-center border-b border-border px-4 py-3 last:border-0"
              >
                <div className="w-14">
                  <Skeleton className="h-4 w-6" />
                </div>
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                <div className="w-28 px-4">
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <div className="w-20 px-4">
                  <Skeleton className="h-4 w-4" />
                </div>
                <div className="w-28 px-4">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-6 w-6 rounded-full" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                </div>
                <div className="w-28 px-4">
                  <Skeleton className="h-3 w-16" />
                </div>
                <div className="w-32 px-4">
                  <Skeleton className="h-3 w-20" />
                </div>
                <div className="w-28 px-4">
                  <Skeleton className="h-3 w-16" />
                </div>
                <div className="w-10" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
