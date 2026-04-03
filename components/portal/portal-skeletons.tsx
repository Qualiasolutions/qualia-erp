'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/**
 * Skeleton for portal project card (matches portal-projects-list.tsx)
 */
export function PortalProjectCardSkeleton() {
  return (
    <Card
      className={cn(
        'h-full transition-all duration-200',
        'shadow-elevation-1 hover:-translate-y-1 hover:shadow-elevation-2'
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-6 w-16 shrink-0 rounded" />
        </div>
        <div className="mt-2 space-y-1.5">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <div className="mb-1 flex items-center justify-between text-xs">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-8" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
        <div className="flex items-center justify-between text-xs">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-24" />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Skeleton for portal roadmap phases (matches portal-roadmap.tsx)
 */
export function PortalRoadmapSkeleton() {
  return (
    <div className="space-y-6">
      {/* Project header skeleton */}
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-6 w-20 shrink-0 rounded" />
        </div>
        <div className="mt-3 space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
        </div>
      </div>

      {/* Roadmap section */}
      <div className="rounded-lg border border-border bg-card p-6">
        <Skeleton className="mb-6 h-6 w-48" />

        <div className="relative space-y-8">
          {/* Vertical connecting line */}
          <div className="absolute bottom-6 left-4 top-6 w-0.5 bg-muted" />

          {/* Phase card skeletons */}
          {[1, 2, 3].map((i) => (
            <div key={i} className="relative flex gap-6">
              {/* Status indicator */}
              <div className="relative z-10 flex shrink-0 flex-col items-center">
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>

              {/* Phase content */}
              <div className="flex-1 pb-8">
                <div className="rounded-lg border border-border bg-muted/50 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-48" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-4/5" />
                    </div>
                    <Skeleton className="h-6 w-20 shrink-0 rounded" />
                  </div>

                  {/* Dates */}
                  <div className="mt-3 flex flex-wrap gap-4">
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-3 w-32" />
                  </div>

                  {/* Comments section */}
                  <div className="mt-4 border-t border-border pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-4 rounded" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                      <Skeleton className="h-4 w-4 rounded" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for portal activity feed (matches portal-activity-feed.tsx)
 */
export function PortalActivitySkeleton() {
  return (
    <div className="space-y-8">
      {/* Date group 1 */}
      {[1, 2].map((groupIndex) => (
        <div key={groupIndex}>
          {/* Date header */}
          <div className="mb-4 flex items-center gap-3">
            <Skeleton className="h-4 w-24" />
            <div className="h-px flex-1 bg-muted" />
          </div>

          {/* Timeline */}
          <div className="relative space-y-6 pl-6">
            {/* Connecting line */}
            <div className="absolute left-2.5 top-2 h-[calc(100%-1rem)] w-px bg-muted" />

            {/* Activity items */}
            {[1, 2, 3].map((i) => (
              <div key={i} className="relative">
                {/* Icon */}
                <div className="absolute -left-6 flex h-5 w-5 items-center justify-center rounded-full bg-card">
                  <Skeleton className="h-5 w-5 rounded-full" />
                </div>

                {/* Content card */}
                <div className="rounded-lg border border-border bg-card p-4 shadow-elevation-1">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-3 w-32" />
                      <Skeleton className="h-3 w-12" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton for portal dashboard
 */
export function PortalDashboardSkeleton() {
  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div className="space-y-2">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-48" />
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="flex items-center gap-4 p-5">
              <Skeleton className="h-12 w-12 rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-12" />
                <Skeleton className="h-3 w-24" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Project roadmaps */}
      <div>
        <Skeleton className="mb-4 h-5 w-40" />
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardContent className="space-y-4 p-5">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-5 w-16 rounded" />
                </div>
                <Skeleton className="h-1.5 w-full rounded-full" />
                <Skeleton className="h-3 w-40" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid gap-3 sm:grid-cols-2">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="flex items-center gap-3 p-4">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton for portal billing page
 */
export function PortalBillingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="flex items-center gap-4 p-5">
              <Skeleton className="h-11 w-11 rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-3 w-16" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-5 w-16 rounded" />
                </div>
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-6 w-20" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * Skeleton for portal admin panel tables (matches portal-admin-panel.tsx)
 */
export function PortalAdminPanelSkeleton() {
  return (
    <div className="space-y-6">
      {/* Tabs skeleton */}
      <Skeleton className="h-10 w-full" />

      {/* Table container */}
      <div className="rounded-lg border border-border">
        {/* Table header */}
        <div className="border-b border-border bg-muted/50 p-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="ml-auto h-4 w-20" />
          </div>
        </div>

        {/* Table rows */}
        <div className="divide-y divide-border">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-4">
              <div className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-64" />
                </div>
                <Skeleton className="h-6 w-16 rounded" />
                <Skeleton className="h-8 w-20 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
