'use client';

import Link from 'next/link';
import { Folder, ChevronRight, Hammer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EntityAvatar } from '@/components/entity-avatar';
import { PROJECT_TYPE_CONFIG } from '@/lib/project-type-config';
import type { ProjectType } from '@/types/database';

export interface PipelineProject {
  id: string;
  name: string;
  status: string;
  project_type: ProjectType | null;
  target_date: string | null;
  logo_url: string | null;
  issue_stats: { total: number; done: number };
}

interface BuildingProjectsRowProps {
  building: PipelineProject[];
}

export function BuildingProjectsRow({ building }: BuildingProjectsRowProps) {
  if (building.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border bg-muted/10 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="bg-emerald-500/12 flex h-7 w-7 items-center justify-center rounded-lg">
            <Hammer className="h-3.5 w-3.5 text-emerald-500" />
          </div>
          <h2 className="text-[13px] font-semibold tracking-tight text-foreground">
            Currently Building
          </h2>
          <span className="bg-emerald-500/8 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
            {building.length}
          </span>
        </div>
        <Link
          href="/projects"
          className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-muted-foreground/70 transition-all duration-200 hover:bg-muted/40 hover:text-foreground"
        >
          All projects
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="scrollbar-none flex gap-2 overflow-x-auto px-4 py-3">
        {building.map((project, i) => (
          <div
            key={project.id}
            className="animate-stagger-in"
            style={{ animationDelay: `${i * 30}ms` }}
          >
            <ProjectChip project={project} dotColor="bg-emerald-500" />
          </div>
        ))}
      </div>
    </div>
  );
}

function ProjectChip({ project, dotColor }: { project: PipelineProject; dotColor: string }) {
  const typeConfig = project.project_type ? PROJECT_TYPE_CONFIG[project.project_type] : null;
  const TypeIcon = typeConfig?.icon || Folder;
  const isDelayed = project.status === 'Delayed';
  const completionPct =
    project.issue_stats.total > 0
      ? Math.round((project.issue_stats.done / project.issue_stats.total) * 100)
      : 0;

  return (
    <Link
      href={`/projects/${project.id}`}
      className={cn(
        'group flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 transition-all duration-200',
        'border border-border bg-card',
        'hover:border-primary/50 hover:bg-muted/40 hover:shadow-sm'
      )}
    >
      <EntityAvatar
        src={project.logo_url}
        fallbackIcon={<TypeIcon className="h-3 w-3" />}
        fallbackBgColor="bg-muted"
        fallbackIconColor={typeConfig?.color || 'text-muted-foreground'}
        size="sm"
        className="h-6 w-6 rounded-md ring-1 ring-border transition-transform duration-200 group-hover:scale-105"
      />

      <div className="flex items-center gap-1.5">
        <span className="whitespace-nowrap text-xs font-medium text-foreground/70 transition-colors duration-200 group-hover:text-foreground">
          {project.name}
        </span>

        {project.issue_stats.total > 0 && (
          <span className="rounded-md bg-muted/50 px-1 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground/70">
            {completionPct}%
          </span>
        )}

        {isDelayed ? (
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500 shadow-[0_0_4px] shadow-amber-500/30" />
        ) : (
          <span
            className={cn(
              'h-1.5 w-1.5 shrink-0 rounded-full shadow-[0_0_4px]',
              dotColor,
              'shadow-emerald-500/30'
            )}
          />
        )}
      </div>
    </Link>
  );
}
