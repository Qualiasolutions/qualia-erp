'use client';

import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton for portal roadmap phases (matches portal-roadmap.tsx)
 */
export function PortalRoadmapSkeleton() {
  return (
    <div className="space-y-6">
      {/* Project header skeleton */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-6 w-48 bg-muted/50" />
          <Skeleton className="h-6 w-20 shrink-0 rounded-lg bg-muted/50" />
        </div>
        <div className="mt-3 space-y-2">
          <Skeleton className="h-3 w-full bg-muted/50" />
          <Skeleton className="h-3 w-4/5 bg-muted/50" />
        </div>
      </div>

      {/* Roadmap section */}
      <div className="rounded-xl border border-border bg-card p-6">
        <Skeleton className="mb-6 h-6 w-48 bg-muted/50" />

        <div className="relative space-y-8">
          {/* Vertical connecting line */}
          <div className="absolute bottom-6 left-4 top-6 w-0.5 bg-muted/50" />

          {/* Phase card skeletons */}
          {[1, 2, 3].map((i) => (
            <div key={i} className="relative flex gap-6">
              {/* Status indicator */}
              <div className="relative z-10 flex shrink-0 flex-col items-center">
                <Skeleton className="h-8 w-8 rounded-full bg-muted/50" />
              </div>

              {/* Phase content */}
              <div className="flex-1 pb-8">
                <div className="rounded-xl border border-border bg-muted/30 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-48 bg-muted/50" />
                      <Skeleton className="h-3 w-full bg-muted/50" />
                      <Skeleton className="h-3 w-4/5 bg-muted/50" />
                    </div>
                    <Skeleton className="h-6 w-20 shrink-0 rounded-lg bg-muted/50" />
                  </div>

                  {/* Dates */}
                  <div className="mt-3 flex flex-wrap gap-4">
                    <Skeleton className="h-3 w-32 bg-muted/50" />
                    <Skeleton className="h-3 w-32 bg-muted/50" />
                  </div>

                  {/* Comments section */}
                  <div className="mt-4 border-t border-border/50 pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-4 rounded bg-muted/50" />
                        <Skeleton className="h-4 w-24 bg-muted/50" />
                      </div>
                      <Skeleton className="h-4 w-4 rounded bg-muted/50" />
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
            <Skeleton className="h-4 w-24 bg-muted/50" />
            <div className="h-px flex-1 bg-muted/50" />
          </div>

          {/* Timeline */}
          <div className="relative space-y-6 pl-6">
            {/* Connecting line */}
            <div className="absolute left-2.5 top-2 h-[calc(100%-1rem)] w-px bg-muted/50" />

            {/* Activity items */}
            {[1, 2, 3].map((i) => (
              <div key={i} className="relative">
                {/* Icon */}
                <div className="absolute -left-6 flex h-5 w-5 items-center justify-center rounded-full bg-card">
                  <Skeleton className="h-5 w-5 rounded-full bg-muted/50" />
                </div>

                {/* Content card */}
                <div className="rounded-xl border border-border bg-card p-4">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full bg-muted/50" />
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-3 w-32 bg-muted/50" />
                      <Skeleton className="h-3 w-12 bg-muted/50" />
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
 * Skeleton for portal dashboard — matches admin/employee dashboard structure:
 * greeting + stat cards + inbox widget + content grid
 */
export function PortalDashboardSkeleton() {
  return (
    <div className="space-y-8 px-[clamp(1.5rem,4vw,2.5rem)] pb-[clamp(1.5rem,3vw,2.5rem)] pt-16 md:pt-[clamp(1.5rem,3vw,2.5rem)]">
      {/* Greeting skeleton */}
      <div>
        <Skeleton className="h-3 w-36 bg-muted/50" />
        <Skeleton className="mt-3 h-8 w-64 bg-muted/50" />
      </div>

      {/* Stat cards — 4-col grid matching admin, falls back to 2x2 on mobile */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="relative overflow-hidden rounded-xl border border-border/60 bg-card"
          >
            {/* Left accent shimmer */}
            <div className="absolute left-0 top-0 h-full w-[3px] bg-muted/40" />
            <div className="flex items-center justify-between px-5 py-5 pl-6">
              <div>
                <Skeleton className="h-3 w-16 bg-muted/50" />
                <Skeleton className="mt-2 h-7 w-10 bg-muted/50" />
              </div>
              <Skeleton className="h-5 w-5 rounded bg-muted/30" />
            </div>
          </div>
        ))}
      </div>

      {/* Inbox widget skeleton */}
      <div className="rounded-xl border border-border/60 bg-card">
        <div className="flex items-center justify-between border-b border-border/40 px-5 py-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded bg-muted/50" />
            <Skeleton className="h-4 w-16 bg-muted/50" />
          </div>
          <Skeleton className="h-4 w-20 bg-muted/50" />
        </div>
        <div className="divide-y divide-border/30">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-3">
              <Skeleton className="h-4 w-4 shrink-0 rounded-full bg-muted/40" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-3/4 bg-muted/50" />
                <Skeleton className="h-3 w-1/3 bg-muted/40" />
              </div>
              <Skeleton className="h-5 w-14 shrink-0 rounded-md bg-muted/40" />
            </div>
          ))}
        </div>
      </div>

      {/* Content grid skeleton (workspace cards / project list) */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <Skeleton className="h-3 w-24 bg-muted/50" />
          <Skeleton className="h-8 w-48 rounded-lg bg-muted/40" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-border/60 bg-card p-5">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 shrink-0 rounded-lg bg-muted/50" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-32 bg-muted/50" />
                  <Skeleton className="h-3 w-20 bg-muted/40" />
                </div>
                <Skeleton className="h-5 w-5 rounded bg-muted/30" />
              </div>
              <div className="mt-4 space-y-2">
                <Skeleton className="h-3 w-full bg-muted/40" />
                <Skeleton className="h-3 w-4/5 bg-muted/40" />
              </div>
            </div>
          ))}
        </div>
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
        <Skeleton className="h-7 w-24 bg-muted/50" />
        <Skeleton className="h-4 w-64 bg-muted/50" />
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-20 bg-muted/50" />
              <Skeleton className="h-4 w-4 rounded bg-muted/50" />
            </div>
            <Skeleton className="mt-2 h-7 w-24 bg-muted/50" />
          </div>
        ))}
      </div>

      {/* Invoice table */}
      <div className="overflow-hidden rounded-xl border border-border">
        <div className="bg-muted/30 px-5 py-3">
          <Skeleton className="h-3 w-full bg-muted/50" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="border-b border-border/50 px-5 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-24 bg-muted/50" />
                  <Skeleton className="h-5 w-16 rounded-lg bg-muted/50" />
                </div>
                <Skeleton className="h-3 w-48 bg-muted/50" />
              </div>
              <Skeleton className="h-5 w-20 bg-muted/50" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
