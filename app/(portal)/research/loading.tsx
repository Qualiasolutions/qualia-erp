import { Skeleton } from '@/components/ui/skeleton';

export default function ResearchLoading() {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header skeleton */}
      <div className="flex items-center justify-between border-b border-border px-6 py-4 sm:px-8">
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-7 w-7 rounded-lg" />
          <Skeleton className="h-5 w-24" />
        </div>
        <Skeleton className="h-8 w-28 rounded-lg" />
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="space-y-6 p-6 lg:p-8">
          {/* Stats row skeleton */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse rounded-xl border border-border bg-card p-5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="mt-2 h-7 w-12" />
              </div>
            ))}
          </div>

          {/* Search + filter skeleton */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Skeleton className="h-9 flex-1 rounded-lg" />
            <Skeleton className="h-9 w-48 rounded-lg" />
          </div>

          {/* Category pills skeleton */}
          <div className="flex flex-wrap gap-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-7 w-24 rounded-full" />
            ))}
          </div>

          {/* Research cards skeleton */}
          <div className="grid gap-4 md:grid-cols-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse rounded-xl border border-border bg-card">
                <div className="h-0.5 rounded-t-xl bg-muted" />
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    <Skeleton className="h-10 w-10 rounded-xl" />
                    <div className="flex-1">
                      <Skeleton className="h-5 w-20 rounded-full" />
                      <Skeleton className="mt-2 h-5 w-44" />
                      <Skeleton className="mt-1.5 h-4 w-32" />
                      <Skeleton className="mt-3 h-10 w-full rounded-lg" />
                      <div className="mt-3 flex items-center gap-3">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
