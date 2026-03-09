'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRight, Folder } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getProjectStatusColor } from '@/lib/portal-styles';

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

interface PortalRecentActivityProps {
  projects: ProjectWithPhases[];
  isLoading: boolean;
  isValidating: boolean;
}

export function PortalRecentActivity({
  projects,
  isLoading,
  isValidating,
}: PortalRecentActivityProps) {
  if (isLoading) {
    return (
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-foreground">Projects</h2>
        </div>
        <div className="divide-y divide-border/30 overflow-hidden rounded-lg border border-border/40">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 bg-card px-4 py-3.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="ml-auto h-3 w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/50 px-6 py-12 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-muted/50">
          <Folder className="h-5 w-5 text-muted-foreground/40" />
        </div>
        <p className="text-sm font-medium text-foreground">No projects yet</p>
        <p className="mt-1 text-[13px] text-muted-foreground/60">
          Your projects will appear here once your team gets started.
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      {isValidating && (
        <div className="absolute -top-1 right-0 h-0.5 w-12 animate-pulse rounded-full bg-qualia-500/40" />
      )}

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium text-foreground">Projects</h2>
        <Link
          href="/portal/projects"
          className="flex items-center gap-1 text-[12px] font-medium text-muted-foreground/60 transition-colors hover:text-foreground"
        >
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="divide-y divide-border/30 overflow-hidden rounded-lg border border-border/40">
        {projects.map((project) => (
          <Link
            key={project.id}
            href={`/portal/${project.id}`}
            className="group flex items-center gap-4 bg-card px-4 py-3.5 transition-colors duration-150 hover:bg-muted/30"
          >
            {/* Name + current phase */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-[13px] font-medium text-foreground">{project.name}</p>
                <Badge
                  className={cn(
                    'shrink-0 px-1.5 py-0 text-[10px] leading-4',
                    getProjectStatusColor(project.status)
                  )}
                >
                  {project.status}
                </Badge>
              </div>
              {project.currentPhase && (
                <p className="mt-0.5 truncate text-[12px] text-muted-foreground/60">
                  {project.currentPhase.name}
                </p>
              )}
            </div>

            {/* Progress */}
            {project.totalPhases > 0 && (
              <div className="hidden w-32 shrink-0 items-center gap-2 sm:flex">
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-border/50">
                  <div
                    className="h-full rounded-full bg-qualia-600 transition-all duration-500"
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
                <span className="w-8 text-right text-[11px] tabular-nums text-muted-foreground/50">
                  {project.progress}%
                </span>
              </div>
            )}

            <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground/20 transition-all duration-150 group-hover:translate-x-0.5 group-hover:text-muted-foreground/50" />
          </Link>
        ))}
      </div>
    </div>
  );
}
