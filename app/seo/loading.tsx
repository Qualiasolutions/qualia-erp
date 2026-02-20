import { Skeleton } from '@/components/ui/skeleton';
import { Search } from 'lucide-react';

export default function SeoLoading() {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="rounded-lg bg-cyan-500/10 p-1.5 sm:p-2">
            <Search className="h-3.5 w-3.5 text-cyan-500 sm:h-4 sm:w-4" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-foreground">SEO Tracking</h1>
            <p className="hidden text-xs text-muted-foreground sm:block">
              Monitor search performance
            </p>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="space-y-6">
          {/* Stats row */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="animate-scale-in rounded-xl border border-border bg-card p-4"
                style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'both' }}
              >
                <Skeleton className="mb-2 h-3 w-20" />
                <Skeleton className="h-7 w-16" />
                <Skeleton className="mt-1 h-3 w-12" />
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div
            className="flex animate-slide-up items-center gap-2"
            style={{ animationDelay: '250ms', animationFillMode: 'both' }}
          >
            <Skeleton className="h-9 w-28 rounded-md" />
            <Skeleton className="h-9 w-24 rounded-md" />
            <Skeleton className="h-9 w-20 rounded-md" />
          </div>

          {/* Table */}
          <div
            className="animate-slide-up overflow-hidden rounded-lg border border-border bg-card"
            style={{ animationDelay: '320ms', animationFillMode: 'both' }}
          >
            {/* Table header */}
            <div className="flex items-center gap-4 border-b border-border bg-secondary/50 px-4 py-3">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
            </div>
            {/* Rows */}
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 border-b border-border px-4 py-3 last:border-0"
                style={{ animationDelay: `${380 + i * 40}ms` }}
              >
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
