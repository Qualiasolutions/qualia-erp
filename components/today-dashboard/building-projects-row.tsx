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
  Hammer,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { EntityAvatar } from '@/components/entity-avatar';
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

const PROJECT_TYPE_CONFIG: Record<ProjectType, { icon: typeof Globe; color: string }> = {
  ai_agent: { icon: Bot, color: 'text-violet-500' },
  voice_agent: { icon: Phone, color: 'text-pink-500' },
  ai_platform: { icon: Sparkles, color: 'text-indigo-500' },
  web_design: { icon: Globe, color: 'text-sky-500' },
  seo: { icon: TrendingUp, color: 'text-emerald-500' },
  ads: { icon: Megaphone, color: 'text-amber-500' },
};

interface BuildingProjectsRowProps {
  building: PipelineProject[];
}

export function BuildingProjectsRow({ building }: BuildingProjectsRowProps) {
  if (building.length === 0) return null;

  return (
    <div className="rounded-xl border border-border/50 bg-card shadow-elevation-1">
      <div className="flex items-center justify-between border-b border-border/30 bg-muted/20 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/15">
            <Hammer className="h-3.5 w-3.5 text-emerald-500" />
          </div>
          <h3 className="text-[13px] font-semibold text-foreground">Currently Building</h3>
          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-emerald-500">
            {building.length}
          </span>
        </div>
        <Link
          href="/projects"
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
        >
          All projects
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="scrollbar-none flex gap-2 overflow-x-auto px-4 py-3">
        {building.map((project) => (
          <ProjectChip key={project.id} project={project} dotColor="bg-emerald-500" />
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
        'group flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 transition-colors duration-150',
        'border border-border/30 bg-muted/30',
        'hover:border-border/60 hover:bg-muted/60'
      )}
    >
      <EntityAvatar
        src={project.logo_url}
        fallbackIcon={<TypeIcon className="h-3 w-3" />}
        fallbackBgColor="bg-muted"
        fallbackIconColor={typeConfig?.color || 'text-muted-foreground'}
        size="sm"
        className="h-6 w-6 rounded-md ring-1 ring-border/20"
      />

      <div className="flex items-center gap-1.5">
        <span className="whitespace-nowrap text-xs font-medium text-foreground/80 group-hover:text-foreground">
          {project.name}
        </span>

        {project.issue_stats.total > 0 && (
          <span className="rounded bg-muted/60 px-1 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
            {completionPct}%
          </span>
        )}

        {isDelayed ? (
          <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" />
        ) : (
          <span className={cn('h-2 w-2 shrink-0 rounded-full', dotColor)} />
        )}
      </div>
    </Link>
  );
}
