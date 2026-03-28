'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getProjectStatusColor } from '@/lib/portal-styles';
import { getStaggerDelay } from '@/lib/transitions';
import { Briefcase, ArrowRight } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  description: string | null;
  project_type: string;
  project_status: string;
  start_date: string | null;
  end_date: string | null;
}

interface ClientProject {
  id: string;
  project_id: string;
  access_level: string | null;
  invited_at: string | null;
  project: Project | Project[];
}

interface PortalProjectsListProps {
  projects: ClientProject[];
  progressMap?: Record<string, number>;
}

export function PortalProjectsList({ projects, progressMap = {} }: PortalProjectsListProps) {
  if (!projects || projects.length === 0) {
    return (
      <div className="flex flex-col items-center py-20 text-center">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted/40">
          <Briefcase className="h-4 w-4 text-muted-foreground/40" />
        </div>
        <p className="text-[13px] font-medium text-foreground">No projects yet</p>
        <p className="mt-1 text-[12px] text-muted-foreground/60">
          Projects will appear here once you&apos;ve been granted access.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {projects.map((clientProject, index) => {
        const project = Array.isArray(clientProject.project)
          ? clientProject.project[0]
          : clientProject.project;

        if (!project) return null;

        const progress = progressMap[clientProject.project_id] ?? progressMap[project.id] ?? 0;

        return (
          <Link
            key={clientProject.id}
            href={`/portal/${project.id}`}
            style={index < 10 ? getStaggerDelay(index) : undefined}
            className={cn(
              'group flex items-center gap-4 rounded-lg px-4 py-4 transition-all duration-150',
              'hover:bg-primary/[0.03]',
              index < 10 && 'animate-fade-in-up fill-mode-both'
            )}
          >
            {/* Project info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2.5">
                <h3 className="min-w-0 truncate text-[13px] font-medium text-foreground">
                  {project.name}
                </h3>
                <Badge
                  className={cn(
                    'shrink-0 border px-1.5 py-0 text-[10px] leading-4',
                    getProjectStatusColor(project.project_status)
                  )}
                >
                  {project.project_status}
                </Badge>
              </div>
              {project.description && (
                <p className="mt-0.5 line-clamp-1 text-[12px] text-muted-foreground/60">
                  {project.description}
                </p>
              )}
            </div>

            {/* Type */}
            <span className="hidden text-[11px] capitalize text-muted-foreground/50 sm:block">
              {project.project_type?.replace(/_/g, ' ')}
            </span>

            {/* Progress */}
            <div className="hidden w-28 items-center gap-2 md:flex">
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-primary/10">
                {progress > 0 && (
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      progress === 100 ? 'bg-primary' : 'bg-primary'
                    )}
                    style={{ width: `${progress}%` }}
                  />
                )}
              </div>
              <span className="w-7 text-right text-[11px] tabular-nums text-muted-foreground/50">
                {progress > 0 ? `${progress}%` : '--'}
              </span>
            </div>

            {/* Mobile progress */}
            {progress > 0 && (
              <div className="flex items-center gap-2 md:hidden">
                <span className="text-[11px] tabular-nums text-muted-foreground/50">
                  {progress}%
                </span>
              </div>
            )}

            <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground/15 transition-all duration-150 group-hover:translate-x-0.5 group-hover:text-muted-foreground/40" />
          </Link>
        );
      })}
    </div>
  );
}
