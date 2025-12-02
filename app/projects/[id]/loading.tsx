export default function ProjectDetailLoading() {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border bg-card px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 animate-pulse rounded-lg bg-muted" />
          <div>
            <div className="mb-1 h-5 w-40 animate-pulse rounded bg-muted" />
            <div className="h-3 w-24 animate-pulse rounded bg-muted" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-20 animate-pulse rounded-md bg-muted" />
          <div className="h-9 w-20 animate-pulse rounded-md bg-muted" />
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          {/* Stats skeleton */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="surface rounded-xl p-4">
                <div className="mb-2 h-3 w-16 animate-pulse rounded bg-muted" />
                <div className="h-8 w-12 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>

          {/* Progress skeleton */}
          <div className="surface rounded-xl p-6">
            <div className="mb-4 h-5 w-24 animate-pulse rounded bg-muted" />
            <div className="mb-2 h-2 w-full animate-pulse rounded-full bg-muted" />
            <div className="h-4 w-16 animate-pulse rounded bg-muted" />
          </div>

          {/* Roadmap link skeleton */}
          <div className="surface rounded-xl p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="h-5 w-24 animate-pulse rounded bg-muted" />
              <div className="h-8 w-28 animate-pulse rounded-md bg-muted" />
            </div>
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 rounded-lg bg-muted/30 p-3">
                  <div className="h-4 w-4 animate-pulse rounded-full bg-muted" />
                  <div className="flex-1">
                    <div className="mb-1 h-4 w-40 animate-pulse rounded bg-muted" />
                    <div className="h-3 w-24 animate-pulse rounded bg-muted" />
                  </div>
                  <div className="h-6 w-20 animate-pulse rounded-full bg-muted" />
                </div>
              ))}
            </div>
          </div>

          {/* Issues skeleton */}
          <div className="surface rounded-xl p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="h-5 w-20 animate-pulse rounded bg-muted" />
              <div className="h-8 w-24 animate-pulse rounded-md bg-muted" />
            </div>
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg bg-muted/30 p-3">
                  <div className="h-5 w-5 animate-pulse rounded bg-muted" />
                  <div className="flex-1">
                    <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                  </div>
                  <div className="h-6 w-16 animate-pulse rounded-full bg-muted" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
