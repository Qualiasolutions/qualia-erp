import { Skeleton } from '@/components/ui/skeleton';

export default function PortalSettingsLoading() {
  return (
    <div className="space-y-10">
      <div>
        <Skeleton className="h-7 w-24" />
        <Skeleton className="mt-2 h-4 w-56" />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-5">
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <div>
              <Skeleton className="h-4 w-32" />
              <Skeleton className="mt-1 h-3 w-40" />
            </div>
          </div>
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      ))}
    </div>
  );
}
