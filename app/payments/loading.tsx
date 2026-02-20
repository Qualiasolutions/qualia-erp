import { Skeleton } from '@/components/ui/skeleton';
import { Wallet } from 'lucide-react';

export default function PaymentsLoading() {
  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 sm:h-9 sm:w-9">
            <Wallet className="h-4 w-4 text-emerald-500" />
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
              Payments
            </h1>
            <p className="hidden text-xs text-muted-foreground sm:block">
              Track income and expenses
            </p>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="space-y-6">
          {/* Summary skeleton */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="animate-scale-in rounded-xl border border-border bg-card p-4"
                style={{ animationDelay: `${i * 60}ms`, animationFillMode: 'both' }}
              >
                <Skeleton className="h-4 w-20" />
                <Skeleton className="mt-2 h-8 w-28" />
              </div>
            ))}
          </div>
          {/* List skeleton */}
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="animate-slide-up rounded-xl border border-border bg-card p-4"
                style={{ animationDelay: `${240 + i * 50}ms`, animationFillMode: 'both' }}
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-6 w-24" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
