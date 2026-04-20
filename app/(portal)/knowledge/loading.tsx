import { Skeleton } from '@/components/ui/skeleton';

export default function KnowledgeLoading() {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header skeleton */}
      <div className="flex items-center justify-between border-b border-border px-6 py-4 sm:px-8">
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-7 w-7 rounded-lg" />
          <Skeleton className="h-5 w-32" />
        </div>
        <Skeleton className="h-7 w-20" />
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="space-y-6 p-6 lg:p-8">
          {/* Lifecycle pipeline skeleton */}
          <div className="animate-pulse rounded-xl border border-border bg-card p-4">
            <Skeleton className="mx-auto mb-3 h-3 w-24" />
            <div className="flex items-center justify-center gap-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="flex flex-col items-center gap-1">
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <Skeleton className="h-3 w-10" />
                  </div>
                  {i < 5 && <Skeleton className="h-px w-6" />}
                </div>
              ))}
            </div>
          </div>

          {/* Search + filters skeleton */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <Skeleton className="h-9 flex-1 rounded-lg" />
            <div className="flex gap-1.5">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-8 w-20 rounded-lg" />
              ))}
            </div>
          </div>

          {/* Category section skeleton */}
          {[...Array(2)].map((_, catIdx) => (
            <div key={catIdx} className="animate-pulse rounded-xl border border-border bg-card">
              <div className="border-b border-border px-5 py-4">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-7 w-7 rounded-lg" />
                  <div>
                    <Skeleton className="h-5 w-28" />
                    <Skeleton className="mt-1 h-3 w-44" />
                  </div>
                </div>
              </div>
              <div className="divide-y divide-border">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-4">
                    <Skeleton className="h-7 w-7 rounded-lg" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="mt-1 h-3 w-56" />
                    </div>
                    <Skeleton className="h-3 w-14" />
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
