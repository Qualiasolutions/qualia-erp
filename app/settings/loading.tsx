import { Skeleton } from '@/components/ui/skeleton';

export default function SettingsLoading() {
  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-border bg-background px-6 py-4">
        <Skeleton className="h-6 w-20" />
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl space-y-6">
          {/* Account Section */}
          <div
            className="animate-slide-up rounded-lg border border-border bg-card p-6"
            style={{ animationDelay: '0ms', animationFillMode: 'both' }}
          >
            <Skeleton className="mb-4 h-5 w-20" />
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 border-t border-border pt-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i}>
                  <Skeleton className="mb-1 h-3 w-12" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))}
            </div>
          </div>

          {/* Learning Section */}
          <div
            className="animate-slide-up rounded-lg border border-border bg-card p-6"
            style={{ animationDelay: '80ms', animationFillMode: 'both' }}
          >
            <Skeleton className="mb-4 h-5 w-40" />
            <div className="space-y-3">
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>

          {/* Appearance Section */}
          <div
            className="animate-slide-up rounded-lg border border-border bg-card p-6"
            style={{ animationDelay: '160ms', animationFillMode: 'both' }}
          >
            <Skeleton className="mb-4 h-5 w-28" />
            <Skeleton className="h-4 w-64" />
          </div>

          {/* Danger Zone */}
          <div
            className="animate-slide-up rounded-lg border border-red-900/50 bg-card p-6"
            style={{ animationDelay: '240ms', animationFillMode: 'both' }}
          >
            <Skeleton className="mb-4 h-5 w-28" />
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-3 w-36" />
              </div>
              <Skeleton className="h-9 w-24 rounded-md" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
