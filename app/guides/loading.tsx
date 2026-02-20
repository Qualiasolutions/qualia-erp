import { Skeleton } from '@/components/ui/skeleton';

export default function GuidesLoading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/50 bg-card/30">
        <div className="mx-auto max-w-5xl px-6 py-8">
          <Skeleton className="mb-4 h-4 w-36" />
          <Skeleton className="h-8 w-64" />
          <Skeleton className="mt-2 h-4 w-96" />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="border-b border-border/50">
        <div className="mx-auto max-w-5xl px-6">
          <div className="flex gap-1">
            {[1, 2, 3].map((i) => (
              <Skeleton
                key={i}
                className="h-10 w-36 animate-fade-in rounded-t-md"
                style={{ animationDelay: `${i * 60}ms`, animationFillMode: 'both' }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="space-y-6">
          {/* Section header */}
          <div
            className="animate-slide-up"
            style={{ animationDelay: '200ms', animationFillMode: 'both' }}
          >
            <Skeleton className="h-6 w-40" />
            <Skeleton className="mt-1 h-4 w-72" />
          </div>

          {/* Guide cards grid */}
          <div className="grid gap-4 sm:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="animate-slide-up rounded-xl border border-border/50 bg-card/50 p-5"
                style={{ animationDelay: `${280 + i * 70}ms`, animationFillMode: 'both' }}
              >
                <div className="mb-3 flex items-start justify-between">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
