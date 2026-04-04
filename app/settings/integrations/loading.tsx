import { Skeleton } from '@/components/ui/skeleton';

export default function IntegrationsLoading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-7 w-32" />
        <Skeleton className="mt-2 h-4 w-48" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
