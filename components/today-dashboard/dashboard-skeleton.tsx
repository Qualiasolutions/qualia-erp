'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { Circle, Video, Folder, Sparkles } from 'lucide-react';

/**
 * Skeleton for TasksWidget
 */
export function TasksWidgetSkeleton() {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500/10">
              <Circle className="h-3 w-3 fill-amber-500 text-amber-500" />
            </div>
            <Skeleton className="h-4 w-12 bg-zinc-800" />
          </div>
          <Skeleton className="mt-1.5 h-3 w-24 bg-zinc-800" />
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-zinc-800/50 p-1">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-7 w-10 rounded-md bg-zinc-700/50" />
          ))}
        </div>
      </div>

      {/* Quick Add */}
      <div className="flex items-center gap-3 border-b border-white/[0.06] px-5 py-3">
        <Skeleton className="h-9 flex-1 rounded-lg bg-zinc-800/50" />
        <Skeleton className="h-9 w-9 rounded-lg bg-zinc-800/50" />
      </div>

      {/* Task List */}
      <div className="min-h-0 flex-1 overflow-hidden px-2 py-2">
        <div className="space-y-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <TaskItemSkeleton key={i} delay={i * 0.1} />
          ))}
        </div>
      </div>
    </div>
  );
}

function TaskItemSkeleton({ delay = 0 }: { delay?: number }) {
  return (
    <div
      className="mx-1 flex animate-pulse items-start gap-3 rounded-xl px-3 py-3"
      style={{ animationDelay: `${delay}s` }}
    >
      <Skeleton className="mt-0.5 h-5 w-5 shrink-0 rounded-md bg-zinc-700" />
      <div className="min-w-0 flex-1">
        <Skeleton className="h-4 w-3/4 bg-zinc-700" />
        <div className="mt-2 flex items-center gap-2">
          <Skeleton className="h-5 w-20 rounded-md bg-zinc-800/50" />
          <Skeleton className="h-5 w-16 rounded-md bg-zinc-800/50" />
        </div>
      </div>
      <Skeleton className="h-6 w-6 rounded-md bg-zinc-800/50" />
    </div>
  );
}

/**
 * Skeleton for MeetingsTimeline
 */
export function MeetingsTimelineSkeleton() {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/20">
            <Video className="h-4 w-4 text-violet-400" />
          </div>
          <div>
            <Skeleton className="h-4 w-16 bg-zinc-800" />
            <Skeleton className="mt-1 h-3 w-20 bg-zinc-800" />
          </div>
        </div>
        <Skeleton className="h-7 w-7 rounded bg-zinc-800" />
      </div>

      {/* Content */}
      <div className="min-h-0 flex-1 overflow-hidden px-4 py-3">
        <div className="space-y-4">
          {/* Day header */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-12 bg-zinc-700" />
            <div className="h-px flex-1 bg-white/5" />
          </div>

          {/* Meeting items */}
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <MeetingItemSkeleton key={i} delay={i * 0.15} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MeetingItemSkeleton({ delay = 0 }: { delay?: number }) {
  return (
    <div
      className="flex animate-pulse items-center gap-3 rounded-xl p-3"
      style={{ animationDelay: `${delay}s` }}
    >
      <Skeleton className="h-10 w-10 rounded-full bg-zinc-700" />
      <div className="min-w-0 flex-1">
        <Skeleton className="h-4 w-2/3 bg-zinc-700" />
        <Skeleton className="mt-1.5 h-3 w-1/2 bg-zinc-800" />
      </div>
      <Skeleton className="h-8 w-14 rounded-lg bg-zinc-800" />
    </div>
  );
}

/**
 * Skeleton for ProjectPulseSidebar
 */
export function ProjectPulseSidebarSkeleton() {
  return (
    <div className="flex h-full flex-col">
      {/* Active Projects Section */}
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/10">
                <Folder className="h-3 w-3 text-emerald-500" />
              </div>
              <Skeleton className="h-4 w-28 bg-zinc-800" />
            </div>
            <Skeleton className="mt-1.5 h-3 w-20 bg-zinc-800" />
          </div>
          <Skeleton className="h-8 w-8 rounded-lg bg-zinc-800" />
        </div>

        <div className="min-h-0 flex-1 overflow-hidden px-3 py-3">
          <div className="space-y-1">
            {[1, 2, 3, 4].map((i) => (
              <ProjectCardSkeleton key={i} delay={i * 0.1} />
            ))}
          </div>
        </div>
      </div>

      {/* Completed Projects Section */}
      <div className="border-t border-white/[0.06]">
        <div className="px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded-md bg-sky-500/10">
              <Sparkles className="h-3 w-3 text-sky-400" />
            </div>
            <Skeleton className="h-4 w-32 bg-zinc-800" />
          </div>
          <Skeleton className="mt-1.5 h-3 w-16 bg-zinc-800" />
        </div>
        <div className="px-3 pb-3">
          <div className="space-y-1">
            {[1, 2].map((i) => (
              <ProjectCardSkeleton key={i} compact delay={i * 0.1} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProjectCardSkeleton({
  compact = false,
  delay = 0,
}: {
  compact?: boolean;
  delay?: number;
}) {
  return (
    <div
      className="flex animate-pulse items-center gap-3 rounded-xl px-3 py-2.5"
      style={{ animationDelay: `${delay}s` }}
    >
      <Skeleton className="h-9 w-9 rounded-xl bg-zinc-700" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-4 w-2/3 bg-zinc-700" />
          <Skeleton className="h-2 w-2 rounded-full bg-zinc-700" />
        </div>
        {!compact && (
          <>
            <div className="mt-2 flex items-center gap-2">
              <Skeleton className="h-1.5 flex-1 rounded-full bg-zinc-800" />
              <Skeleton className="h-3 w-8 bg-zinc-800" />
            </div>
            <Skeleton className="mt-1.5 h-3 w-16 bg-zinc-800" />
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Full Dashboard Skeleton - combines all widget skeletons
 */
export function DashboardSkeleton() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-zinc-950">
      {/* Header Skeleton */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/[0.06] bg-zinc-950/80 px-5 backdrop-blur-xl lg:px-8">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-xl bg-zinc-800" />
            <div>
              <Skeleton className="h-4 w-28 bg-zinc-800" />
              <Skeleton className="mt-1 h-3 w-32 bg-zinc-800" />
            </div>
          </div>
          <div className="ml-6 hidden items-center gap-3 lg:flex">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-8 w-20 rounded-full bg-zinc-800" />
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="hidden h-9 w-24 rounded-lg bg-zinc-800 lg:block" />
          <Skeleton className="h-9 w-9 rounded-lg bg-zinc-800" />
          <div className="mx-2 h-5 w-px bg-white/10" />
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-9 w-9 rounded-lg bg-zinc-800" />
          ))}
        </div>
      </header>

      {/* Main Content */}
      <main className="min-h-0 flex-1 overflow-hidden p-4 lg:p-6">
        <div className="mx-auto grid h-full max-w-[1920px] grid-cols-1 gap-5 lg:grid-cols-3">
          {/* Tasks Card */}
          <div className="group relative flex flex-col overflow-hidden rounded-2xl bg-zinc-900/80 shadow-2xl ring-1 ring-white/[0.08] backdrop-blur-xl">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
            <TasksWidgetSkeleton />
          </div>

          {/* Meetings Card */}
          <div className="group relative flex flex-col overflow-hidden rounded-2xl bg-zinc-900/80 shadow-2xl ring-1 ring-white/[0.08] backdrop-blur-xl">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />
            <MeetingsTimelineSkeleton />
          </div>

          {/* Projects Card */}
          <div className="group relative flex flex-col overflow-hidden rounded-2xl bg-zinc-900/80 shadow-2xl ring-1 ring-white/[0.08] backdrop-blur-xl">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
            <ProjectPulseSidebarSkeleton />
          </div>
        </div>
      </main>
    </div>
  );
}
