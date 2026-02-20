import { Skeleton } from '@/components/ui/skeleton';

export default function ClientDetailLoading() {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex items-center gap-4 border-b border-border bg-background px-6 py-4">
        <Skeleton className="h-8 w-32 rounded-md" />
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Client header */}
          <div
            className="flex animate-slide-up items-center gap-4"
            style={{ animationFillMode: 'both' }}
          >
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>

          {/* Info cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="animate-slide-up rounded-xl border border-border bg-card p-5"
                style={{ animationDelay: `${60 + i * 60}ms`, animationFillMode: 'both' }}
              >
                <Skeleton className="mb-3 h-5 w-28" />
                <div className="space-y-3">
                  {[1, 2, 3].map((j) => (
                    <div key={j} className="flex items-center gap-3">
                      <Skeleton className="h-4 w-4" />
                      <Skeleton className="h-4 w-40" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Activity / Projects */}
          <div
            className="animate-slide-up rounded-xl border border-border bg-card p-5"
            style={{ animationDelay: '240ms', animationFillMode: 'both' }}
          >
            <Skeleton className="mb-4 h-5 w-24" />
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="flex animate-fade-in items-center gap-3 rounded-lg bg-muted/30 p-3"
                  style={{ animationDelay: `${300 + i * 40}ms`, animationFillMode: 'both' }}
                >
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
