'use client';

import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface SkeletonCardProps {
  className?: string;
}

/**
 * Skeleton for TaskCard component
 */
export function TaskCardSkeleton({ className }: SkeletonCardProps) {
  return (
    <div className={cn('rounded-lg border border-border bg-card p-4', className)}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-start justify-between gap-2">
            <Skeleton className="h-4 w-3/4" />
            <div className="flex gap-1">
              <Skeleton className="h-7 w-7 rounded" />
              <Skeleton className="h-7 w-7 rounded" />
            </div>
          </div>
          <Skeleton className="mb-2 h-3 w-full" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-16 rounded" />
            <Skeleton className="h-5 w-14 rounded" />
            <Skeleton className="ml-auto h-6 w-6 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for dashboard widget (meetings, notes, leads)
 */
export function WidgetSkeleton({ className }: SkeletonCardProps) {
  return (
    <div className={cn('rounded-xl border border-border bg-card p-4', className)}>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-5 w-24" />
        </div>
        <Skeleton className="h-8 w-8 rounded" />
      </div>

      {/* Content items */}
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton for project overview card
 */
export function ProjectOverviewSkeleton({ className }: SkeletonCardProps) {
  return (
    <div className={cn('rounded-xl border border-border bg-card p-6', className)}>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>

      {/* Stats grid */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="text-center">
            <Skeleton className="mx-auto mb-1 h-8 w-12" />
            <Skeleton className="mx-auto h-3 w-16" />
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-8" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
      </div>
    </div>
  );
}

/**
 * Skeleton for kanban column
 */
export function KanbanColumnSkeleton({ className }: SkeletonCardProps) {
  return (
    <div className={cn('min-w-[300px] flex-shrink-0', className)}>
      {/* Column header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-8 rounded-full" />
        </div>
        <Skeleton className="h-6 w-6 rounded" />
      </div>

      {/* Task cards */}
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <TaskCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton for meeting list item
 */
export function MeetingItemSkeleton({ className }: SkeletonCardProps) {
  return (
    <div className={cn('flex items-center gap-3 p-3', className)}>
      <Skeleton className="h-12 w-12 rounded-lg" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-6 w-16 rounded" />
    </div>
  );
}

/**
 * Skeleton for client/lead card
 */
export function ClientCardSkeleton({ className }: SkeletonCardProps) {
  return (
    <div className={cn('rounded-lg border border-border bg-card p-4', className)}>
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-1" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}

/**
 * Skeleton for activity feed item
 */
export function ActivityItemSkeleton({ className }: SkeletonCardProps) {
  return (
    <div className={cn('flex gap-3 py-3', className)}>
      <Skeleton className="h-8 w-8 rounded-full" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}
