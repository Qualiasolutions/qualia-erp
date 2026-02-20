import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen } from 'lucide-react';

export default function KnowledgeLoading() {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="rounded-lg bg-indigo-500/10 p-1.5 sm:p-2">
            <BookOpen className="h-3.5 w-3.5 text-indigo-500 sm:h-4 sm:w-4" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-foreground">Knowledge</h1>
            <p className="hidden text-xs text-muted-foreground sm:block">Guides and resources</p>
          </div>
        </div>
        <Skeleton className="h-9 w-32 rounded-md" />
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="space-y-6">
          {/* Tabs skeleton */}
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((i) => (
              <Skeleton
                key={i}
                className="h-9 w-28 animate-slide-up rounded-lg"
                style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'both' }}
              />
            ))}
          </div>

          {/* Cards grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="animate-slide-up rounded-xl border border-border/50 bg-card/50 p-5"
                style={{ animationDelay: `${150 + i * 60}ms`, animationFillMode: 'both' }}
              >
                <div className="mb-3 flex items-start justify-between">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <Skeleton className="h-5 w-5 rounded-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
                <Skeleton className="mt-3 h-3 w-20" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
