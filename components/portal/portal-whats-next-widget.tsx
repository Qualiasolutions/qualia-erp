'use client';

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

function ProjectPhaseSkeleton() {
  return (
    <div className="space-y-3 rounded-lg border border-border/40 bg-card px-5 py-4">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-8 w-16" />
      <Skeleton className="h-1 w-full rounded-full" />
      <div className="flex justify-between">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-8 w-28" />
      </div>
    </div>
  );
}

function ProjectPhaseCard({ project }: { project: ProjectWithPhases }) {
  const progressPct = Math.round(project.progress);
  const hasPhases = project.totalPhases > 0;

  return (
    <div className="rounded-lg border border-border/40 bg-card px-5 py-4">
      {/* Project name */}
      <p className="mb-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
        {project.name}
      </p>

      {!hasPhases ? (
        <p className="text-[13px] text-muted-foreground">No phases configured</p>
      ) : (
        <>
          {/* Hero progress number */}
          <p className="mb-3 text-3xl font-semibold tabular-nums leading-none text-foreground">
            {progressPct}%
          </p>

          {/* Progress bar */}
          <div className="mb-3 h-1 w-full overflow-hidden rounded-full bg-border/50">
            <div
              className="h-full rounded-full bg-qualia-600 transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          {/* Now / Next columns */}
          <div className="flex items-start justify-between gap-4">
            {/* Current phase */}
            <div className="min-w-0 flex-1">
              <p className="mb-0.5 text-[11px] text-muted-foreground/60">Now</p>
              {project.currentPhase ? (
                <p className="truncate text-[13px] font-medium text-foreground">
                  {project.currentPhase.name}
                </p>
              ) : (
                <span className="inline-flex items-center gap-1 text-[13px] font-medium text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  Complete
                </span>
              )}
            </div>

            {/* Next phase */}
            <div className="min-w-0 flex-1 text-right">
              <p className="mb-0.5 text-[11px] text-muted-foreground/60">Next</p>
              <p
                className={cn(
                  'truncate text-[13px]',
                  project.nextPhase ? 'text-muted-foreground' : 'text-muted-foreground/40'
                )}
              >
                {project.nextPhase ? project.nextPhase.name : '—'}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function WhatsNextWidget({ projects, isLoading }: WhatsNextWidgetProps) {
  if (!isLoading && projects.length === 0) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <ProjectPhaseSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {projects.map((project) => (
        <ProjectPhaseCard key={project.id} project={project} />
      ))}
    </div>
  );
}
