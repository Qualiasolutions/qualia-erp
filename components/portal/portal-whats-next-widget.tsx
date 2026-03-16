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
    <div className="space-y-3 rounded-lg border border-border bg-card px-5 py-4">
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
    <div className="rounded-xl border border-border bg-card px-5 py-5 transition-all duration-200 hover:border-border/60 hover:shadow-elevation-1">
      {/* Project name */}
      <p className="mb-3 text-[11px] font-medium uppercase tracking-widest text-muted-foreground/60">
        {project.name}
      </p>

      {!hasPhases ? (
        <p className="text-[13px] text-muted-foreground/60">No phases configured yet</p>
      ) : (
        <>
          {/* Hero progress number */}
          <p className="mb-3 text-[30px] font-semibold tabular-nums leading-none tracking-tight text-foreground [font-variant-numeric:tabular-nums]">
            {progressPct}
            <span className="text-lg font-normal text-muted-foreground/50">%</span>
          </p>

          {/* Progress bar with subtle shimmer highlight */}
          <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-border/30 dark:bg-border/20">
            <div
              className="relative h-full rounded-full bg-gradient-to-r from-qualia-600 to-qualia-400 transition-all duration-700 ease-out"
              style={{ width: `${progressPct}%` }}
            >
              {progressPct > 0 && progressPct < 100 && (
                <span
                  className="absolute inset-0 rounded-full"
                  style={{
                    background:
                      'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.18) 50%, transparent 100%)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 2.5s ease-in-out infinite',
                  }}
                />
              )}
            </div>
          </div>

          {/* Now / Next columns */}
          <div className="flex items-start justify-between gap-4">
            {/* Current phase */}
            <div className="min-w-0 flex-1">
              <div className="mb-0.5 flex items-center gap-1.5">
                {project.currentPhase && (
                  <span className="relative flex h-1.5 w-1.5 shrink-0">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-qualia-500 opacity-60" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-qualia-500" />
                  </span>
                )}
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                  Now
                </p>
              </div>
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
              <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                Next
              </p>
              <p
                className={cn(
                  'truncate text-[13px]',
                  project.nextPhase ? 'text-muted-foreground' : 'text-muted-foreground/25'
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
