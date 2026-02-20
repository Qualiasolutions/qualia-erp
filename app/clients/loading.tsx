import { Skeleton } from '@/components/ui/skeleton';
import { Building2 } from 'lucide-react';

export default function ClientsLoading() {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="rounded-lg bg-emerald-500/10 p-1.5 sm:p-2">
            <Building2 className="h-3.5 w-3.5 text-emerald-500 sm:h-4 sm:w-4" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-foreground">Clients</h1>
            <p className="hidden text-xs text-muted-foreground sm:block">Manage your clients</p>
          </div>
        </div>
        <Skeleton className="h-9 w-24 rounded-md" />
      </header>

      {/* Content Skeleton */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="space-y-5">
          {/* Stats skeleton */}
          <div
            className="flex animate-fade-in items-center justify-between"
            style={{ animationFillMode: 'both' }}
          >
            <div className="flex items-center gap-5">
              <div className="flex items-center gap-2">
                <Skeleton className="h-7 w-8" />
                <Skeleton className="h-4 w-14" />
              </div>
              <div className="h-4 w-px bg-border" />
              <div className="flex items-center gap-4">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          </div>

          {/* Filter skeleton */}
          <div
            className="flex animate-slide-up gap-3"
            style={{ animationDelay: '60ms', animationFillMode: 'both' }}
          >
            <Skeleton className="h-9 w-48 rounded-lg" />
            <Skeleton className="h-9 w-32 rounded-lg" />
            <Skeleton className="h-9 w-36 rounded-lg" />
          </div>

          {/* Table skeleton */}
          <div
            className="animate-slide-up overflow-hidden rounded-lg border border-border bg-card"
            style={{ animationDelay: '120ms', animationFillMode: 'both' }}
          >
            {/* Header */}
            <div className="flex items-center gap-4 border-b border-border bg-secondary/50 px-4 py-3">
              <Skeleton className="h-4 w-8" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
            </div>
            {/* Rows with stagger */}
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="flex animate-fade-in items-center gap-4 border-b border-border px-4 py-3 last:border-0"
                style={{ animationDelay: `${180 + i * 40}ms`, animationFillMode: 'both' }}
              >
                <Skeleton className="h-4 w-6" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-4 w-28" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-4 w-8" />
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
