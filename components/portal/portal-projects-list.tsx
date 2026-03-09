'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getProjectStatusColor } from '@/lib/portal-styles';
import { fadeInClasses, getStaggerDelay } from '@/lib/transitions';
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
      <div className="flex min-h-[350px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-muted/50">
            <Briefcase className="h-5 w-5 text-muted-foreground/40" />
          </div>
          <p className="text-sm font-medium text-foreground">No projects yet</p>
          <p className="mt-1 text-[13px] text-muted-foreground/60">
            Projects will appear here once you&apos;ve been granted access.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`divide-y divide-border/30 overflow-hidden rounded-lg border border-border/40 ${fadeInClasses}`}
    >
      {projects.map((clientProject, index) => {
        const project = Array.isArray(clientProject.project)
          ? clientProject.project[0]
          : clientProject.project;

        if (!project) return null;

        const progress = progressMap[project.id] ?? 0;

        return (
          <Link
            key={clientProject.id}
            href={`/portal/${project.id}`}
            style={index < 8 ? getStaggerDelay(index) : undefined}
            className={cn(
              'group flex items-center gap-4 bg-card px-5 py-4 transition-colors duration-150 hover:bg-muted/30',
              index < 8 && 'animate-fade-in-up fill-mode-both'
            )}
          >
            {/* Project info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2.5">
                <h3 className="truncate text-[13px] font-medium text-foreground">{project.name}</h3>
                <Badge
                  className={cn(
                    'shrink-0 px-1.5 py-0 text-[10px] leading-4',
                    getProjectStatusColor(project.project_status)
                  )}
                >
                  {project.project_status}
                </Badge>
              </div>
              {project.description && (
                <p className="mt-0.5 line-clamp-1 text-[12px] text-muted-foreground/50">
                  {project.description}
                </p>
              )}
            </div>

            {/* Type */}
            <span className="hidden text-[11px] capitalize text-muted-foreground/40 sm:block">
              {project.project_type?.replace(/_/g, ' ')}
            </span>

            {/* Progress bar */}
            <div className="hidden w-28 items-center gap-2 md:flex">
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-border/50">
                <div
                  className="h-full rounded-full bg-qualia-600 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="w-8 text-right text-[11px] tabular-nums text-muted-foreground/40">
                {progress}%
              </span>
            </div>

            <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground/20 transition-all duration-150 group-hover:translate-x-0.5 group-hover:text-muted-foreground/50" />
          </Link>
        );
      })}
    </div>
  );
}
