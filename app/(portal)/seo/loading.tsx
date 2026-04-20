import { Skeleton } from '@/components/ui/skeleton';

export default function SeoLoading() {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header skeleton */}
      <div className="flex items-center justify-between border-b border-border px-6 py-4 sm:px-8">
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-7 w-7 rounded-lg" />
          <Skeleton className="h-5 w-36" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="space-y-6 p-6 lg:p-8">
          {/* Stats row skeleton */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse rounded-xl border border-border bg-card p-5">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="mt-2 h-7 w-10" />
              </div>
            ))}
          </div>

          {/* Today's task banner skeleton */}
          <Skeleton className="h-16 w-full rounded-xl" />

          {/* Project stats skeleton */}
          <div>
            <Skeleton className="mb-3 h-6 w-36" />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse rounded-xl border border-border bg-card p-5">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-8" />
                  </div>
                  <Skeleton className="mt-2 h-1.5 w-full rounded-full" />
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {[...Array(3)].map((_, j) => (
                      <div key={j} className="flex flex-col items-center gap-1">
                        <Skeleton className="h-5 w-6" />
                        <Skeleton className="h-3 w-14" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Daily log skeleton */}
          <div>
            <Skeleton className="mb-3 h-6 w-44" />
            <div className="rounded-xl border border-border bg-card">
              <div className="border-b border-border bg-muted/30 px-4 py-2">
                <Skeleton className="h-4 w-full" />
              </div>
              {[...Array(5)].map((_, i) => (
                <div key={i} className="border-b border-border px-4 py-2.5 last:border-b-0">
                  <Skeleton className="h-4 w-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
