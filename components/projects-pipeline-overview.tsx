'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { UNIVERSAL_PIPELINE, getPipelinePhaseConfig } from '@/lib/pipeline-constants';
import { CheckCircle2, Clock, Circle } from 'lucide-react';
import Link from 'next/link';
import { getPendingReviews } from '@/app/actions/phase-reviews';

interface PipelineProject {
  id: string;
  name: string;
  phases: Array<{
    name: string;
    status: string;
    progress: number;
  }>;
}

interface ProjectsPipelineOverviewProps {
  projects: PipelineProject[];
}

export function ProjectsPipelineOverview({ projects }: ProjectsPipelineOverviewProps) {
  if (projects.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground">Pipeline Overview</h3>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50">
              <th className="pb-2 text-left text-xs font-medium text-muted-foreground">Project</th>
              {UNIVERSAL_PIPELINE.map((phase) => {
                const config = getPipelinePhaseConfig(phase.name);
                const Icon = config?.icon || Circle;
                return (
                  <th
                    key={phase.name}
                    className="pb-2 text-center text-xs font-medium text-muted-foreground"
                  >
                    <div className="flex flex-col items-center gap-1">
                      <Icon className={cn('h-3.5 w-3.5', config?.color)} />
                      <span className="text-[10px]">{phase.name}</span>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <tr key={project.id} className="border-b border-border/30 last:border-0">
                <td className="py-2 pr-4">
                  <Link
                    href={`/projects/${project.id}`}
                    className="text-sm font-medium hover:text-primary"
                  >
                    {project.name}
                  </Link>
                </td>
                {UNIVERSAL_PIPELINE.map((pipelinePhase) => {
                  const projectPhase = project.phases.find(
                    (p) => p.name.toUpperCase() === pipelinePhase.name
                  );
                  return (
                    <td key={pipelinePhase.name} className="py-2 text-center">
                      <PhaseStatusDot
                        status={projectPhase?.status || 'not_started'}
                        progress={projectPhase?.progress || 0}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PhaseStatusDot({ status, progress }: { status: string; progress: number }) {
  if (status === 'completed') {
    return <CheckCircle2 className="mx-auto h-4 w-4 text-emerald-500" />;
  }
  if (status === 'in_progress') {
    return (
      <div className="mx-auto flex h-5 w-5 items-center justify-center">
        <div className="relative h-4 w-4">
          <svg className="h-4 w-4 -rotate-90" viewBox="0 0 16 16">
            <circle
              cx="8"
              cy="8"
              r="6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-border/50"
            />
            <circle
              cx="8"
              cy="8"
              r="6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray={`${(progress / 100) * 37.7} 37.7`}
              className="text-primary"
            />
          </svg>
        </div>
      </div>
    );
  }
  if (status === 'skipped') {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  return <Circle className="mx-auto h-3 w-3 text-border/50" />;
}

/**
 * Badge showing pending review count for admin header
 */
export function PendingReviewsBadge() {
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getPendingReviews()
      .then((reviews) => setCount(reviews.length))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return null;
  if (count === 0) return null;

  return (
    <Link
      href="/admin/reviews"
      className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-600 transition-colors hover:bg-amber-500/20 dark:text-amber-400"
    >
      <Clock className="h-3 w-3" />
      {count} review{count !== 1 ? 's' : ''} pending
    </Link>
  );
}
