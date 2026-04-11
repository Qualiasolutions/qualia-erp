import { Skeleton } from '@/components/ui/skeleton';

export default function MessagesLoading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-7 w-32" />
        <Skeleton className="mt-1 h-4 w-48" />
      </div>
      <div className="flex h-[500px] gap-4">
        <Skeleton className="h-full w-72 rounded-xl" />
        <Skeleton className="h-full flex-1 rounded-xl" />
      </div>
    </div>
  );
}
