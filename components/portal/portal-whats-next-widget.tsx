'use client';

import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface ProjectWithPhases {
  id: string;
  name: string;
  status: string;
  project_type: string | null;
  description: string | null;
  progress: number;
  totalPhases: number;
  completedPhases: number;
  currentPhase: { name: string; status: string } | null;
  nextPhase: { name: string } | null;
}

interface WhatsNextWidgetProps {
  projects: ProjectWithPhases[];
  isLoading: boolean;
}

function ProjectPhaseCard({ project }: { project: ProjectWithPhases }) {
  const progressPct = Math.round(project.progress);
  const hasPhases = project.totalPhases > 0;

  return (
    <Link
      href={`/portal/${project.id}`}
      className="group block rounded-xl border border-border/50 bg-card px-5 py-5 transition-all duration-150 hover:border-border hover:shadow-sm"
    >
      {/* Project name */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/50">
          {project.name}
        </p>
        {hasPhases && (
          <span className="text-[20px] font-semibold tabular-nums leading-none text-foreground">
            {progressPct}
            <span className="text-sm font-normal text-muted-foreground/40">%</span>
          </span>
        )}
      </div>

      {!hasPhases ? (
        <p className="mt-2 text-[13px] text-muted-foreground/50">No phases configured yet</p>
      ) : (
        <>
          {/* Progress bar */}
          <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-border/30">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-700 ease-out',
                progressPct === 100 ? 'bg-emerald-500' : 'bg-qualia-500'
              )}
              style={{ width: `${progressPct}%` }}
            />
          </div>

          {/* Now / Next row */}
          <div className="mt-4 flex items-start gap-6">
            <div className="min-w-0 flex-1">
              <div className="mb-0.5 flex items-center gap-1.5">
                {project.currentPhase && (
                  <span className="relative flex h-1.5 w-1.5 shrink-0">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-qualia-500 opacity-50" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-qualia-500" />
                  </span>
                )}
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/45">
                  Now
                </p>
              </div>
              {project.currentPhase ? (
                <p className="truncate text-[13px] font-medium text-foreground">
                  {project.currentPhase.name}
                </p>
              ) : (
                <span className="inline-flex items-center gap-1 text-[13px] font-medium text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  Complete
                </span>
              )}
            </div>

            {project.nextPhase && (
              <div className="min-w-0 flex-1 text-right">
                <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/45">
                  Next
                </p>
                <p className="truncate text-[13px] text-muted-foreground/70">
                  {project.nextPhase.name}
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </Link>
  );
}

export function WhatsNextWidget({ projects, isLoading }: WhatsNextWidgetProps) {
  if (!isLoading && projects.length === 0) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-border/50 bg-card px-5 py-5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-3 h-6 w-12" />
          <Skeleton className="mt-3 h-1 w-full rounded-full" />
          <div className="mt-4 flex justify-between">
            <Skeleton className="h-7 w-28" />
            <Skeleton className="h-7 w-28" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {projects.map((project) => (
        <ProjectPhaseCard key={project.id} project={project} />
      ))}
    </div>
  );
}
