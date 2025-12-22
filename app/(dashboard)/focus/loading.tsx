export default function FocusModeLoading() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/40 px-6 py-4">
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 animate-pulse rounded-lg bg-muted" />
          <div className="h-8 w-8 animate-pulse rounded-lg bg-muted" />
        </div>
      </div>

      {/* Main Content */}
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-8">
        {/* Timer Circle */}
        <div className="relative mb-8">
          <div className="h-[280px] w-[280px] animate-pulse rounded-full border-[6px] border-muted bg-transparent" />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="mb-2 h-12 w-32 animate-pulse rounded bg-muted" />
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
          </div>
        </div>

        {/* Controls */}
        <div className="mb-8 flex items-center gap-4">
          <div className="h-12 w-12 animate-pulse rounded-full bg-muted" />
          <div className="h-16 w-16 animate-pulse rounded-full bg-qualia-500/20" />
          <div className="h-12 w-12 animate-pulse rounded-full bg-muted" />
        </div>

        {/* Active Task */}
        <div className="mb-6 w-full max-w-md rounded-xl border border-qualia-500/30 bg-qualia-500/5 px-6 py-4">
          <div className="mx-auto mb-2 h-3 w-32 animate-pulse rounded bg-muted" />
          <div className="mx-auto h-5 w-48 animate-pulse rounded bg-muted" />
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 animate-pulse rounded bg-muted" />
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 animate-pulse rounded bg-muted" />
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          </div>
        </div>
      </main>

      {/* Task List Drawer */}
      <div className="border-t border-border/40 bg-card/80">
        <div className="flex w-full items-center justify-center py-4">
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}
