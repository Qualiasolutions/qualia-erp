import { PortalProjectCardSkeleton } from '@/components/portal/portal-skeletons';
import { Skeleton } from '@/components/ui/skeleton';

export default function PortalLoading() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="space-y-1">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Grid of project cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <PortalProjectCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
