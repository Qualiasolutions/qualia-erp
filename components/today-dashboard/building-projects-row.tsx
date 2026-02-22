'use client';

import Link from 'next/link';
import {
  Folder,
  Bot,
  Globe,
  Phone,
  TrendingUp,
  Megaphone,
  Sparkles,
  ChevronRight,
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
  is_building?: boolean;
  issue_stats: { total: number; done: number };
}

const PROJECT_TYPE_CONFIG: Record<ProjectType, { icon: typeof Globe; color: string }> = {
  ai_agent: { icon: Bot, color: 'text-violet-500' },
  voice_agent: { icon: Phone, color: 'text-pink-500' },
  ai_platform: { icon: Sparkles, color: 'text-indigo-500' },
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

export function BuildingProjectsRow({ projects }: { projects: Project[] }) {
  const buildingProjects = projects.filter((p) => p.is_building);
  const displayProjects = buildingProjects.length > 0 ? buildingProjects : projects;

  return (
    <div className="rounded-xl border border-border/30 bg-card/50 dark:border-border/40">
      <div className="flex items-center justify-between px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/10">
            <Folder className="h-3 w-3 text-emerald-500" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">Currently Building</h3>
          <span className="text-xs text-muted-foreground">{displayProjects.length} active</span>
        </div>
        <Link
          href="/projects"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="scrollbar-none flex gap-2 overflow-x-auto px-4 pb-3">
        {displayProjects.length === 0 ? (
          <div className="flex w-full items-center justify-center py-3 text-sm text-muted-foreground">
            No active projects
          </div>
        ) : (
          displayProjects.map((project) => <ProjectChip key={project.id} project={project} />)
        )}
      </div>
    </div>
  );
}

function ProjectChip({ project }: { project: Project }) {
  const typeConfig = project.project_type ? PROJECT_TYPE_CONFIG[project.project_type] : null;
  const TypeIcon = typeConfig?.icon || Folder;
  const progress =
    project.issue_stats.total > 0
      ? Math.round((project.issue_stats.done / project.issue_stats.total) * 100)
      : 0;

  return (
    <Link
      href={`/projects/${project.id}`}
      className={cn(
        'group flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 transition-all duration-200',
        'border border-border/20 bg-background/50 hover:border-border/50 hover:bg-muted/50'
      )}
    >
      <EntityAvatar
        src={project.logo_url}
        fallbackIcon={<TypeIcon className="h-3.5 w-3.5" />}
        fallbackBgColor="bg-muted"
        fallbackIconColor={typeConfig?.color || 'text-muted-foreground'}
        size="sm"
        className="h-7 w-7 rounded-lg ring-1 ring-border/20"
      />

      <div className="flex items-center gap-3">
        <span className="whitespace-nowrap text-sm font-medium text-foreground/80 group-hover:text-foreground">
          {project.name}
        </span>

        <div className="flex items-center gap-2">
          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                progress >= 80
                  ? 'bg-emerald-500'
                  : progress >= 50
                    ? 'bg-amber-500'
                    : 'bg-muted-foreground/30'
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs tabular-nums text-muted-foreground">{progress}%</span>
        </div>

        <span
          className={cn(
            'h-2 w-2 shrink-0 rounded-full',
            STATUS_COLORS[project.status] || 'bg-muted-foreground/50'
          )}
        />
      </div>
    </Link>
  );
}
