import { PortalRoadmapSkeleton } from '@/components/portal/portal-skeletons';
import { Skeleton } from '@/components/ui/skeleton';

export default function PortalProjectLoading() {
  return (
    <div className="space-y-6">
      {/* Page header skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-full max-w-2xl" />
      </div>

      {/* Tabs skeleton */}
      <Skeleton className="h-10 w-full" />

      {/* Roadmap content */}
      <PortalRoadmapSkeleton />
    </div>
  );
}
