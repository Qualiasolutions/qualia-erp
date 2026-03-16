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
        <div className="divide-y divide-border/20 overflow-hidden rounded-xl border border-border">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 bg-card px-5 py-4">
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
      <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-muted/50">
          <Folder className="h-5 w-5 text-muted-foreground/70" />
        </div>
        <p className="text-sm font-medium text-foreground">No projects yet</p>
        <p className="mt-1 text-[13px] text-muted-foreground">
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
          className="flex items-center gap-1 text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="divide-y divide-border/20 overflow-hidden rounded-xl border border-border">
        {projects.map((project) => (
          <Link
            key={project.id}
            href={`/portal/${project.id}`}
            className="group relative flex items-center gap-4 bg-card px-5 py-4 transition-all duration-200 hover:bg-muted/20"
          >
            {/* Left border highlight on hover */}
            <span className="absolute inset-y-0 left-0 w-[2px] rounded-r-full bg-qualia-500 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />

            {/* Project type indicator dot */}
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted/60 transition-colors duration-200 group-hover:bg-muted">
              <Folder className="h-3 w-3 text-muted-foreground/50 transition-colors duration-200 group-hover:text-qualia-500/70" />
            </div>

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
                <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
                  {project.currentPhase.name}
                </p>
              )}
            </div>

            {/* Progress */}
            {project.totalPhases > 0 && (
              <div className="hidden w-32 shrink-0 items-center gap-2 sm:flex">
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-border/50">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-qualia-600 to-qualia-400 transition-all duration-500"
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
                <span className="w-8 text-right text-[11px] tabular-nums text-muted-foreground [font-variant-numeric:tabular-nums]">
                  {project.progress}%
                </span>
              </div>
            )}

            <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground/20 transition-all duration-150 group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
          </Link>
        ))}
      </div>
    </div>
  );
}
