import { Skeleton } from '@/components/ui/skeleton';

/**
 * Inbox loading skeleton — mirrors the actual InboxView layout:
 * header bar (h-14) + toolbar row + table header + skeleton task rows.
 * Full-bleed: manages its own padding since the layout wrapper has none.
 */
export default function InboxLoading() {
  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header — matches InboxView header: h-14, border-b, px-6 */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card/80 px-6 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          {/* Icon badge */}
          <Skeleton className="size-10 rounded-xl" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-16 rounded" />
            <Skeleton className="h-3 w-10 rounded" />
          </div>
        </div>
        {/* Stats pills */}
        <div className="hidden items-center gap-3 md:flex">
          <Skeleton className="h-8 w-20 rounded-full" />
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="h-8 w-16 rounded-full" />
        </div>
      </header>

      {/* Toolbar — matches InboxView: search + filters + quick-add */}
      <div className="flex flex-wrap items-center gap-4 border-b border-border px-6 py-3">
        <Skeleton className="h-9 w-full max-w-md flex-1 rounded-md sm:w-auto" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-32 rounded-md" />
          <Skeleton className="h-9 w-32 rounded-md" />
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <Skeleton className="h-9 w-full rounded-md sm:w-64" />
          <Skeleton className="h-9 w-16 rounded-md" />
        </div>
      </div>

      {/* Table header — matches InboxView column layout */}
      <div className="flex items-center border-b border-border bg-muted/50 px-6 py-2">
        <div className="w-5 shrink-0" />
        <div className="ml-4 flex-1">
          <Skeleton className="h-3 w-8 rounded" />
        </div>
        <div className="hidden w-40 shrink-0 md:block">
          <Skeleton className="h-3 w-12 rounded" />
        </div>
        <div className="hidden w-24 shrink-0 sm:block">
          <Skeleton className="h-3 w-6 rounded" />
        </div>
        <div className="w-20 shrink-0">
          <Skeleton className="h-3 w-12 rounded" />
        </div>
        <div className="w-24 shrink-0" />
      </div>

      {/* Task rows — skeleton rows matching the TaskRow structure */}
      <div className="min-h-0 flex-1 overflow-hidden">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-border px-6 py-4">
            {/* Checkbox */}
            <Skeleton className="size-5 shrink-0 rounded-md" />

            {/* Title + description */}
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-4 rounded" style={{ width: `${45 + ((i * 17) % 40)}%` }} />
              {i % 3 !== 2 && (
                <Skeleton className="h-3 rounded" style={{ width: `${25 + ((i * 13) % 30)}%` }} />
              )}
            </div>

            {/* Project */}
            <div className="hidden w-40 shrink-0 md:block">
              {i % 4 !== 3 && <Skeleton className="h-3 w-24 rounded" />}
            </div>

            {/* Due */}
            <div className="hidden w-24 shrink-0 sm:block">
              {i % 3 !== 0 && <Skeleton className="h-6 w-16 rounded-md" />}
            </div>

            {/* Priority */}
            <div className="w-20 shrink-0">
              {i % 3 !== 2 && <Skeleton className="h-6 w-16 rounded-md" />}
            </div>

            {/* Actions spacer */}
            <div className="w-24 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
