import { Skeleton } from '@/components/ui/skeleton';

export default function ResearchLoading() {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header skeleton */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-7 w-7 rounded-lg" />
          <Skeleton className="h-5 w-24" />
        </div>
        <Skeleton className="h-8 w-28 rounded-lg" />
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {/* Search + filter skeleton */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <Skeleton className="h-9 flex-1" />
          <Skeleton className="h-9 w-36" />
        </div>

        {/* Research cards skeleton */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="mt-2 h-5 w-44" />
                  <Skeleton className="mt-1.5 h-4 w-32" />
                </div>
              </div>
              <Skeleton className="mt-3 h-12 w-full" />
              <div className="mt-3 flex items-center gap-3">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
