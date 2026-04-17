'use client';

import { memo } from 'react';
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

interface ProjectRowProps {
  clientProjectId: string;
  project: Project;
  progress: number;
  index: number;
}

const ProjectRow = memo(function ProjectRow({
  clientProjectId,
  project,
  progress,
  index,
}: ProjectRowProps) {
  return (
    <Link
      key={clientProjectId}
      href={`/projects/${project.id}`}
      style={index < 10 ? getStaggerDelay(index) : undefined}
      className={cn(
        'group flex min-h-[44px] items-center gap-4 rounded-lg px-4 py-3 transition-all duration-150',
        'hover:bg-primary/[0.03]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
        'cursor-pointer',
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
              className="h-full rounded-full bg-primary transition-all duration-500"
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
          <span className="text-[11px] tabular-nums text-muted-foreground/50">{progress}%</span>
        </div>
      )}

      <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground/15 transition-all duration-150 group-hover:translate-x-0.5 group-hover:text-muted-foreground/40" />
    </Link>
  );
});

export function PortalProjectsList({ projects, progressMap = {} }: PortalProjectsListProps) {
  if (!projects || projects.length === 0) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center px-4 text-center">
        <Briefcase className="h-12 w-12 text-muted-foreground/30" />
        <h3 className="mt-4 text-base font-medium text-foreground">No projects yet</h3>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">
          Your active projects will appear here. Reach out to your Qualia team to get started.
        </p>
        <a
          href="mailto:support@qualiasolutions.net"
          className="mt-6 inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-primary/20 bg-primary/[0.06] px-5 text-sm font-medium text-primary transition-all hover:bg-primary/[0.10]"
        >
          Get in touch
        </a>
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
          <ProjectRow
            key={clientProject.id}
            clientProjectId={clientProject.id}
            project={project}
            progress={progress}
            index={index}
          />
        );
      })}
    </div>
  );
}
