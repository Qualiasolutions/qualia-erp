export default function CommandCenterLoading() {
  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      {/* Header Skeleton */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="h-8 w-64 animate-pulse rounded-lg bg-muted" />
          <div className="h-4 w-40 animate-pulse rounded bg-muted" />
        </div>
        <div className="flex gap-3">
          <div className="h-10 w-32 animate-pulse rounded-xl bg-muted" />
          <div className="hidden h-10 w-24 animate-pulse rounded-xl bg-muted sm:block" />
        </div>
      </div>

      {/* Grid Skeleton */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column */}
        <div className="space-y-6 lg:col-span-8">
          {/* Section Header */}
          <div className="flex items-center justify-between">
            <div className="h-6 w-40 animate-pulse rounded bg-muted" />
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
          </div>

          {/* Metric Cards Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="rounded-2xl border border-border/60 bg-card p-5"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className="h-10 w-10 animate-pulse rounded-xl bg-muted" />
                  <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-muted" />
                </div>
                <div className="mb-2 h-8 w-16 animate-pulse rounded bg-muted" />
                <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>

          {/* Tasks Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 animate-pulse rounded bg-muted" />
              <div className="h-5 w-32 animate-pulse rounded bg-muted" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="rounded-xl border border-l-4 border-border/60 border-l-muted bg-card p-4"
                  style={{ animationDelay: `${i * 75}ms` }}
                >
                  <div className="mb-2 h-4 w-3/4 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-3">
            <div className="h-5 w-28 animate-pulse rounded bg-muted" />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-xl border border-border/60 bg-card px-4 py-3"
                >
                  <div className="h-4 w-4 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6 lg:col-span-4">
          {/* Progress Ring */}
          <div className="flex flex-col items-center rounded-2xl border border-border/60 bg-card p-6">
            <div className="h-4 w-28 animate-pulse rounded bg-muted" />
            <div className="my-4 h-[120px] w-[120px] animate-pulse rounded-full bg-muted" />
            <div className="grid w-full grid-cols-2 gap-4 border-t border-border/60 pt-4">
              <div className="text-center">
                <div className="mx-auto mb-1 h-6 w-8 animate-pulse rounded bg-muted" />
                <div className="mx-auto h-3 w-16 animate-pulse rounded bg-muted" />
              </div>
              <div className="text-center">
                <div className="mx-auto mb-1 h-6 w-8 animate-pulse rounded bg-muted" />
                <div className="mx-auto h-3 w-16 animate-pulse rounded bg-muted" />
              </div>
            </div>
          </div>

          {/* Meetings */}
          <div className="rounded-2xl border border-border/60 bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="h-3 w-12 animate-pulse rounded bg-muted" />
            </div>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="rounded-xl border border-border/60 bg-card p-4"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <div className="mb-2 h-4 w-3/4 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
                </div>
              ))}
            </div>
          </div>

          {/* AI Widget */}
          <div className="rounded-2xl border border-qualia-500/30 bg-qualia-500/5 p-5">
            <div className="mb-3 flex items-center gap-2">
              <div className="h-8 w-8 animate-pulse rounded-lg bg-qualia-500/20" />
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            </div>
            <div className="mb-4 h-8 w-full animate-pulse rounded bg-muted/50" />
            <div className="h-12 w-full animate-pulse rounded-xl bg-qualia-500/10" />
          </div>
        </div>
      </div>
    </div>
  );
}
