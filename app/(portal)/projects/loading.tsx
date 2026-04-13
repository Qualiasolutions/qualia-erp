import { Folder } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProjectsLoading() {
  return (
    <div className="flex h-full flex-col">
      {/* Header — matches PageHeader layout */}
      <header className="flex items-center justify-between border-b border-border bg-card/80 px-6 py-4 backdrop-blur-xl sm:px-8">
        <div className="flex items-center gap-2.5">
          {/* Hamburger placeholder on mobile */}
          <div className="mr-1 h-[44px] w-[44px] md:hidden" />
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
            <Folder className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
            Projects
          </span>
        </div>
        <Skeleton className="h-9 w-28 rounded-md" />
      </header>

      {/* Content area */}
      <div className="flex flex-1 flex-col gap-5 overflow-hidden p-5 md:p-6">
        {/* Stats strip skeleton */}
        <div className="flex shrink-0 items-center gap-2">
          {[80, 72, 64, 56].map((w, i) => (
            <Skeleton key={i} className="h-8 rounded-lg" style={{ width: `${w}px` }} />
          ))}
        </div>

        {/* Four-column pipeline skeleton */}
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 lg:grid-cols-4">
          {[
            { color: 'bg-violet-500/10', borderColor: 'border-violet-500/20' },
            { color: 'bg-emerald-500/10', borderColor: 'border-emerald-500/20' },
            { color: 'bg-amber-500/10', borderColor: 'border-amber-500/20' },
            { color: 'bg-sky-500/10', borderColor: 'border-sky-500/20' },
          ].map((stage, col) => (
            <div
              key={col}
              className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card"
            >
              {/* Column header */}
              <div
                className={`flex items-center gap-2.5 border-b ${stage.borderColor} bg-muted/20 px-4 py-3`}
              >
                <Skeleton className={`h-8 w-8 rounded-lg ${stage.color}`} />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="ml-auto h-6 w-6 rounded-full" />
              </div>

              {/* Project rows */}
              <div className="flex-1 space-y-2 p-3">
                {[1, 2, 3].map((row) => (
                  <div
                    key={row}
                    className="flex items-start gap-3 rounded-lg border border-border bg-card/40 px-3.5 py-2.5"
                  >
                    <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                    <div className="flex shrink-0 -space-x-1.5">
                      <Skeleton className="h-5 w-5 rounded-full" />
                      <Skeleton className="h-5 w-5 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
