'use client';

import Link from 'next/link';
import {
  Folder,
  Bot,
  Globe,
  Phone,
  TrendingUp,
  Megaphone,
  ChevronRight,
  Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { EntityAvatar } from '@/components/entity-avatar';
import type { ProjectType } from '@/types/database';

interface Project {
  id: string;
  name: string;
  status: string;
  project_type: ProjectType | null;
  target_date: string | null;
  logo_url: string | null;
  issue_stats: {
    total: number;
    done: number;
  };
}

interface ProjectPulseSidebarProps {
  activeProjects: Project[];
  finishedProjects: Project[];
}

const PROJECT_TYPE_CONFIG: Record<ProjectType, { icon: typeof Globe; color: string }> = {
  ai_agent: { icon: Bot, color: 'text-violet-500' },
  voice_agent: { icon: Phone, color: 'text-pink-500' },
  web_design: { icon: Globe, color: 'text-sky-500' },
  seo: { icon: TrendingUp, color: 'text-emerald-500' },
  ads: { icon: Megaphone, color: 'text-amber-500' },
};

const STATUS_COLORS: Record<string, string> = {
  Active: 'bg-emerald-500',
  Demos: 'bg-violet-500',
  Launched: 'bg-sky-500',
  Delayed: 'bg-amber-500',
};

export function ProjectPulseSidebar({
  activeProjects,
  finishedProjects,
}: ProjectPulseSidebarProps) {
  return (
    <div className="flex h-full flex-col">
      {/* Active Projects */}
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
          <div>
            <h3 className="text-sm font-medium">Active Projects</h3>
            <p className="text-xs text-muted-foreground">{activeProjects.length} in progress</p>
          </div>
          <Link
            href="/projects"
            className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {activeProjects.length === 0 ? (
            <div className="flex h-32 items-center justify-center px-4">
              <p className="text-sm text-muted-foreground">No active projects</p>
            </div>
          ) : (
            <div className="p-2">
              {activeProjects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Completed Projects */}
      {finishedProjects.length > 0 && (
        <div className="flex flex-col border-t border-border/50">
          <div className="px-4 py-3">
            <h3 className="text-sm font-medium">Recently Completed</h3>
            <p className="text-xs text-muted-foreground">{finishedProjects.length} launched</p>
          </div>
          <div className="max-h-[160px] overflow-y-auto p-2">
            {finishedProjects.slice(0, 3).map((project) => (
              <ProjectCard key={project.id} project={project} compact />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ProjectCard({ project, compact = false }: { project: Project; compact?: boolean }) {
  const typeConfig = project.project_type ? PROJECT_TYPE_CONFIG[project.project_type] : null;
  const TypeIcon = typeConfig?.icon || Folder;

  const progress =
    project.issue_stats.total > 0
      ? (project.issue_stats.done / project.issue_stats.total) * 100
      : 0;

  return (
    <Link
      href={`/projects/${project.id}`}
      className={cn(
        'group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors',
        'hover:bg-muted/50'
      )}
    >
      <EntityAvatar
        src={project.logo_url}
        fallbackIcon={<TypeIcon className="h-3.5 w-3.5" />}
        fallbackBgColor="bg-muted"
        fallbackIconColor={typeConfig?.color || 'text-muted-foreground'}
        size="sm"
        className="rounded-lg"
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium text-foreground group-hover:text-foreground">
            {project.name}
          </span>
          {!compact && (
            <span
              className={cn(
                'h-1.5 w-1.5 shrink-0 rounded-full',
                STATUS_COLORS[project.status] || 'bg-muted-foreground'
              )}
            />
          )}
        </div>

        {!compact && (
          <div className="mt-1.5 flex items-center gap-2">
            {/* Progress bar */}
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-foreground/20 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-[10px] tabular-nums text-muted-foreground">
              {Math.round(progress)}%
            </span>
          </div>
        )}

        {!compact && project.target_date && (
          <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {new Date(project.target_date).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            })}
          </div>
        )}
      </div>
    </Link>
  );
}
