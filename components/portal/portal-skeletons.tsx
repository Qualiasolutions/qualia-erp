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
    <div className="flex flex-col">
      {/* Greeting skeleton — mirrors the new hub header */}
      <div className="px-[clamp(1.5rem,4vw,2.5rem)] pb-8 pt-12 md:pt-14">
        <Skeleton className="h-3 w-32 bg-muted/50" />
        <Skeleton className="mt-3 h-9 w-72 bg-muted/50" />
        <Skeleton className="mt-3 h-3 w-96 max-w-full bg-muted/40" />
      </div>

      {/* Stat strip — flat divider-driven, mirrors PulseMetric */}
      <div className="border-y border-border/70 bg-card/40">
        <div className="grid grid-cols-2 divide-x divide-border/70 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="px-[clamp(1.25rem,3vw,2rem)] py-5">
              <Skeleton className="h-2.5 w-20 bg-muted/50" />
              <Skeleton className="mt-2.5 h-7 w-12 bg-muted/50" />
            </div>
          ))}
        </div>
      </div>

      {/* Body grid — engagements + sidebar */}
      <div className="px-[clamp(1.5rem,4vw,2.5rem)] pb-16 pt-10">
        <div className="grid grid-cols-1 gap-x-12 gap-y-10 lg:grid-cols-[2fr_1fr]">
          {/* Engagements */}
          <div>
            <Skeleton className="h-3 w-24 bg-muted/50" />
            <Skeleton className="mt-2 h-5 w-40 bg-muted/50" />
            <div className="mt-6 space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="rounded-2xl border border-border/60 bg-card/40 p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3 w-28 bg-muted/50" />
                      <Skeleton className="h-4 w-48 bg-muted/50" />
                      <Skeleton className="h-3 w-32 bg-muted/40" />
                    </div>
                    <Skeleton className="h-7 w-12 bg-muted/40" />
                  </div>
                  <Skeleton className="mt-4 h-1 w-full bg-muted/30" />
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar — invoices + thread */}
          <div className="space-y-8">
            <div>
              <Skeleton className="h-3 w-24 bg-muted/50" />
              <div className="mt-3 rounded-2xl border border-border bg-card/60 p-4">
                <Skeleton className="h-4 w-20 bg-muted/50" />
                <Skeleton className="mt-1 h-3 w-28 bg-muted/40" />
              </div>
            </div>
            <div>
              <Skeleton className="h-3 w-24 bg-muted/50" />
              <div className="mt-3 rounded-2xl border border-border bg-card/60 p-5">
                <Skeleton className="h-3 w-full bg-muted/40" />
                <Skeleton className="mt-2 h-3 w-3/4 bg-muted/40" />
                <Skeleton className="mt-4 h-10 w-full rounded-xl bg-muted/40" />
              </div>
            </div>
          </div>
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
    <div className="space-y-8 px-[clamp(1.5rem,4vw,2.5rem)] pb-[clamp(2rem,4vw,3rem)] pt-16 md:pt-[clamp(2.5rem,4vw,3.5rem)]">
      <div>
        <Skeleton className="h-3 w-24 bg-muted/50" />
        <Skeleton className="mt-3 h-7 w-32 bg-muted/50" />
        <Skeleton className="mt-2 h-3 w-72 max-w-full bg-muted/40" />
      </div>

      {/* Summary tiles — divider-driven */}
      <div className="grid grid-cols-3 divide-x divide-border/70 overflow-hidden rounded-2xl border border-border bg-card">
        {[1, 2, 3].map((i) => (
          <div key={i} className="px-[clamp(1rem,3vw,2rem)] py-5">
            <Skeleton className="h-2.5 w-20 bg-muted/50" />
            <Skeleton className="mt-2 h-7 w-24 bg-muted/50" />
            <Skeleton className="mt-2 h-2.5 w-12 bg-muted/40" />
          </div>
        ))}
      </div>

      {/* Invoice table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="border-b border-border bg-muted/20 px-5 py-3">
          <Skeleton className="h-3 w-full bg-muted/50" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="border-b border-border/40 px-5 py-4 last:border-0">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-24 bg-muted/50" />
                  <Skeleton className="h-5 w-16 rounded-lg bg-muted/50" />
                </div>
                <Skeleton className="h-3 w-48 bg-muted/40" />
              </div>
              <Skeleton className="h-5 w-20 bg-muted/50" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
