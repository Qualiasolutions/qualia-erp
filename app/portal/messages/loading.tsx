import { PortalActivitySkeleton } from '@/components/portal/portal-skeletons';

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-7 w-28 animate-pulse rounded bg-muted" />
        <div className="h-4 w-64 animate-pulse rounded bg-muted" />
      </div>
      <PortalActivitySkeleton />
    </div>
  );
}
