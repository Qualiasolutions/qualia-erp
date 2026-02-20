import { Skeleton } from '@/components/ui/skeleton';

export default function ProjectDetailLoading() {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border bg-card px-6 py-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div>
            <Skeleton className="mb-1 h-5 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-20 rounded-md" />
          <Skeleton className="h-9 w-20 rounded-md" />
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          {/* Stats skeleton - staggered */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="animate-scale-in rounded-xl border border-border bg-card p-4"
                style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'both' }}
              >
                <Skeleton className="mb-2 h-3 w-16" />
                <Skeleton className="h-8 w-12" />
              </div>
            ))}
          </div>

          {/* Progress skeleton */}
          <div
            className="animate-slide-up rounded-xl border border-border bg-card p-6"
            style={{ animationDelay: '200ms', animationFillMode: 'both' }}
          >
            <Skeleton className="mb-4 h-5 w-24" />
            <Skeleton className="mb-2 h-2 w-full rounded-full" />
            <Skeleton className="h-4 w-16" />
          </div>

          {/* Roadmap skeleton */}
          <div
            className="animate-slide-up rounded-xl border border-border bg-card p-6"
            style={{ animationDelay: '280ms', animationFillMode: 'both' }}
          >
            <div className="mb-4 flex items-center justify-between">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-8 w-28 rounded-md" />
            </div>
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="flex animate-fade-in items-center gap-4 rounded-lg bg-muted/30 p-3"
                  style={{ animationDelay: `${340 + i * 50}ms`, animationFillMode: 'both' }}
                >
                  <Skeleton className="h-4 w-4 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="mb-1 h-4 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              ))}
            </div>
          </div>

          {/* Issues skeleton */}
          <div
            className="animate-slide-up rounded-xl border border-border bg-card p-6"
            style={{ animationDelay: '400ms', animationFillMode: 'both' }}
          >
            <div className="mb-4 flex items-center justify-between">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-8 w-24 rounded-md" />
            </div>
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="flex animate-fade-in items-center gap-3 rounded-lg bg-muted/30 p-3"
                  style={{ animationDelay: `${460 + i * 40}ms`, animationFillMode: 'both' }}
                >
                  <Skeleton className="h-5 w-5" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
