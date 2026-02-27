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
  Beaker,
  Hammer,
  Rocket,
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

const STAGE_CONFIG = [
  {
    key: 'demo' as const,
    title: 'Demo',
    icon: Beaker,
    color: 'text-violet-500',
    dotColor: 'bg-violet-500',
    bgColor: 'bg-violet-500/10',
  },
  {
    key: 'building' as const,
    title: 'Building',
    icon: Hammer,
    color: 'text-emerald-500',
    dotColor: 'bg-emerald-500',
    bgColor: 'bg-emerald-500/10',
  },
  {
    key: 'live' as const,
    title: 'Live',
    icon: Rocket,
    color: 'text-sky-500',
    dotColor: 'bg-sky-500',
    bgColor: 'bg-sky-500/10',
  },
] as const;

interface BuildingProjectsRowProps {
  demos: PipelineProject[];
  building: PipelineProject[];
  live: PipelineProject[];
}

export function BuildingProjectsRow({ demos, building, live }: BuildingProjectsRowProps) {
  const stages = [
    { config: STAGE_CONFIG[0], projects: demos },
    { config: STAGE_CONFIG[1], projects: building },
    { config: STAGE_CONFIG[2], projects: live },
  ];

  const totalCount = demos.length + building.length + live.length;

  return (
    <div className="rounded-xl border border-border/30 bg-card/50 dark:border-border/40">
      <div className="flex items-center justify-between px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10">
            <Folder className="h-3 w-3 text-primary" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">Project Pipeline</h3>
          <span className="text-xs text-muted-foreground">{totalCount} projects</span>
        </div>
        <Link
          href="/projects"
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
        >
          View all
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-px border-t border-border/20 bg-border/20">
        {stages.map(({ config, projects }) => {
          const Icon = config.icon;
          return (
            <div key={config.key} className="bg-card/50 px-3 py-2.5">
              {/* Stage label */}
              <div className="mb-2 flex items-center gap-1.5">
                <Icon className={cn('h-3 w-3', config.color)} />
                <span className={cn('text-xs font-semibold', config.color)}>{config.title}</span>
                <span className="text-xs text-muted-foreground/60">({projects.length})</span>
              </div>

              {/* Chips row */}
              <div className="scrollbar-none flex gap-1.5 overflow-x-auto">
                {projects.length === 0 ? (
                  <span className="text-xs text-muted-foreground/40">—</span>
                ) : (
                  projects.map((project) => (
                    <ProjectChip key={project.id} project={project} dotColor={config.dotColor} />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProjectChip({ project, dotColor }: { project: PipelineProject; dotColor: string }) {
  const typeConfig = project.project_type ? PROJECT_TYPE_CONFIG[project.project_type] : null;
  const TypeIcon = typeConfig?.icon || Folder;
  const isDelayed = project.status === 'Delayed';

  return (
    <Link
      href={`/projects/${project.id}`}
      className={cn(
        'group flex shrink-0 items-center gap-2 rounded-lg px-2.5 py-1.5 transition-all duration-200',
        'border border-border/20 bg-background/50 hover:border-border/50 hover:bg-muted/50'
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

        {isDelayed ? (
          <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" />
        ) : (
          <span className={cn('h-2 w-2 shrink-0 rounded-full', dotColor)} />
        )}
      </div>
    </Link>
  );
}
