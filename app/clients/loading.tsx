import { Building2 } from 'lucide-react';

export default function ClientsLoading() {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border/20 bg-background px-6 py-3.5">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <h1 className="text-[15px] font-medium text-foreground">Clients</h1>
        </div>
        <div className="h-9 w-24 animate-pulse rounded-md bg-muted" />
      </header>

      {/* Content Skeleton */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-5">
          {/* Stats skeleton */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-5">
              <div className="flex items-center gap-2">
                <div className="h-7 w-8 animate-pulse rounded bg-muted" />
                <div className="h-4 w-14 animate-pulse rounded bg-muted" />
              </div>
              <div className="h-4 w-px bg-border" />
              <div className="flex items-center gap-4">
                <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              </div>
            </div>
          </div>

          {/* Tabs skeleton */}
          <div className="flex w-fit items-center gap-1 rounded-lg bg-muted/50 p-1">
            <div className="h-9 w-20 animate-pulse rounded-md bg-muted" />
            <div className="h-9 w-24 animate-pulse rounded-md bg-muted" />
            <div className="h-9 w-28 animate-pulse rounded-md bg-muted" />
          </div>

          {/* Search skeleton */}
          <div className="h-10 w-full animate-pulse rounded-md bg-muted" />

          {/* Grid skeleton */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="surface rounded-xl p-5">
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 animate-pulse rounded-lg bg-muted" />
                    <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-3.5 w-3.5 animate-pulse rounded bg-muted" />
                    <div className="h-3 w-24 animate-pulse rounded bg-muted" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3.5 w-3.5 animate-pulse rounded bg-muted" />
                    <div className="h-3 w-32 animate-pulse rounded bg-muted" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
