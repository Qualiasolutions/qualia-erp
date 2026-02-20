import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles } from 'lucide-react';

export default function SkillsLoading() {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="rounded-lg bg-violet-500/10 p-1.5 sm:p-2">
            <Sparkles className="h-3.5 w-3.5 text-violet-500 sm:h-4 sm:w-4" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-foreground">Skills</h1>
            <p className="hidden text-xs text-muted-foreground sm:block">Track your growth</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Progress overview */}
          <div
            className="animate-scale-in rounded-xl border border-border bg-card p-6"
            style={{ animationFillMode: 'both' }}
          >
            <Skeleton className="mb-4 h-5 w-32" />
            <div className="grid grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="text-center">
                  <Skeleton className="mx-auto mb-2 h-12 w-12 rounded-full" />
                  <Skeleton className="mx-auto h-4 w-20" />
                </div>
              ))}
            </div>
          </div>

          {/* Skill cards */}
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="animate-slide-up rounded-xl border border-border bg-card p-5"
                style={{ animationDelay: `${100 + i * 70}ms`, animationFillMode: 'both' }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </div>
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-3 w-8" />
                  </div>
                  <Skeleton className="h-2 w-full rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
