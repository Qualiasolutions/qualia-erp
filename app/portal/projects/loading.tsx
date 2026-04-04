import { Skeleton } from '@/components/ui/skeleton';

export default function PortalProjectsLoading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-7 w-32" />
        <Skeleton className="mt-2 h-4 w-48" />
      </div>
      <div className="space-y-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 rounded-lg px-4 py-4">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-64" />
            </div>
            <Skeleton className="hidden h-1 w-28 md:block" />
          </div>
        ))}
      </div>
    </div>
  );
}
