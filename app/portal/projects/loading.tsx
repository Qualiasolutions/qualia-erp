import { Folder } from 'lucide-react';

export default function ProjectsLoading() {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border bg-card/80 px-6 py-4 backdrop-blur-xl sm:px-8">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
            <Folder className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="h-5 w-20 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-9 w-28 animate-pulse rounded-md bg-muted" />
      </header>

      {/* Content Skeleton */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-8">
          {/* Stage sections */}
          {[1, 2, 3].map((section) => (
            <div key={section} className="space-y-4">
              {/* Stage header */}
              <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                <div className="h-8 w-8 animate-pulse rounded-lg bg-muted" />
                <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                <div className="ml-auto h-6 w-6 animate-pulse rounded-full bg-muted" />
              </div>

              {/* Project cards */}
              <div className="space-y-2 pl-2">
                {[1, 2, 3].map((card) => (
                  <div
                    key={card}
                    className="flex items-center gap-4 rounded-lg border border-border bg-card p-4"
                  >
                    <div className="h-10 w-10 animate-pulse rounded-lg bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-48 animate-pulse rounded bg-muted" />
                      <div className="flex items-center gap-3">
                        <div className="h-3 w-20 animate-pulse rounded bg-muted" />
                        <div className="h-3 w-16 animate-pulse rounded bg-muted" />
                      </div>
                    </div>
                    <div className="flex -space-x-2">
                      {[1, 2].map((avatar) => (
                        <div
                          key={avatar}
                          className="h-7 w-7 animate-pulse rounded-full bg-muted ring-2 ring-background"
                        />
                      ))}
                    </div>
                    <div className="h-4 w-12 animate-pulse rounded bg-muted" />
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
