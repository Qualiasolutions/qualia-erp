import { Skeleton } from '@/components/ui/skeleton';
import { FlaskConical } from 'lucide-react';

export default function ResearchLoading() {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="rounded-lg bg-amber-500/10 p-1.5 sm:p-2">
            <FlaskConical className="h-3.5 w-3.5 text-amber-500 sm:h-4 sm:w-4" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-foreground">Research</h1>
            <p className="hidden text-xs text-muted-foreground sm:block">
              Explore and document findings
            </p>
          </div>
        </div>
        <Skeleton className="h-9 w-28 rounded-md" />
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="space-y-5">
          {/* Filter bar */}
          <div
            className="flex animate-slide-up items-center gap-3"
            style={{ animationFillMode: 'both' }}
          >
            <Skeleton className="h-9 w-64 rounded-lg" />
            <Skeleton className="h-9 w-32 rounded-lg" />
            <div className="flex-1" />
            <Skeleton className="h-9 w-20 rounded-lg" />
          </div>

          {/* Research entries */}
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="animate-slide-up rounded-xl border border-border bg-card p-5"
                style={{ animationDelay: `${80 + i * 60}ms`, animationFillMode: 'both' }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                  <Skeleton className="ml-4 h-6 w-20 rounded-full" />
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
