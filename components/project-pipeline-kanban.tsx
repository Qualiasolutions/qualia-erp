'use client';

import React, { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Wrench,
  FileText,
  Layers,
  Database,
  Rocket,
  CheckCircle2,
  Beaker,
  Bot,
  Globe,
  Phone,
  TrendingUp,
  Megaphone,
  Folder,
  Calendar,
  MoreHorizontal,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import { EntityAvatar } from '@/components/entity-avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  advanceProjectPhase,
  regressProjectPhase,
  setProjectPhase,
} from '@/app/actions/project-pipeline';
import type { ProjectPipelineData, ProjectsByPhase } from '@/app/actions/project-pipeline';
import type { ProjectType } from '@/types/database';

// Phase configuration
const PHASES = [
  {
    key: 'setup' as const,
    name: 'Setup',
    icon: Wrench,
    color: 'bg-slate-500',
    lightColor: 'bg-slate-500/10',
    textColor: 'text-slate-500',
    borderColor: 'border-slate-500/30',
  },
  {
    key: 'plan' as const,
    name: 'Plan',
    icon: FileText,
    color: 'bg-blue-500',
    lightColor: 'bg-blue-500/10',
    textColor: 'text-blue-500',
    borderColor: 'border-blue-500/30',
  },
  {
    key: 'frontend' as const,
    name: 'Frontend',
    icon: Layers,
    color: 'bg-violet-500',
    lightColor: 'bg-violet-500/10',
    textColor: 'text-violet-500',
    borderColor: 'border-violet-500/30',
  },
  {
    key: 'backend' as const,
    name: 'Backend',
    icon: Database,
    color: 'bg-emerald-500',
    lightColor: 'bg-emerald-500/10',
    textColor: 'text-emerald-500',
    borderColor: 'border-emerald-500/30',
  },
  {
    key: 'ship' as const,
    name: 'Ship',
    icon: Rocket,
    color: 'bg-orange-500',
    lightColor: 'bg-orange-500/10',
    textColor: 'text-orange-500',
    borderColor: 'border-orange-500/30',
  },
];

const EXTRA_COLUMNS = [
  {
    key: 'launched' as const,
    name: 'Launched',
    icon: CheckCircle2,
    color: 'bg-qualia-500',
    lightColor: 'bg-qualia-500/10',
    textColor: 'text-qualia-500',
    borderColor: 'border-qualia-500/30',
  },
  {
    key: 'demos' as const,
    name: 'Demos',
    icon: Beaker,
    color: 'bg-purple-500',
    lightColor: 'bg-purple-500/10',
    textColor: 'text-purple-500',
    borderColor: 'border-purple-500/30',
  },
];

// Project type icons
const PROJECT_TYPE_CONFIG: Record<
  ProjectType,
  { icon: typeof Globe; color: string; bgColor: string; label: string }
> = {
  ai_agent: { icon: Bot, color: 'text-violet-400', bgColor: 'bg-violet-500/10', label: 'AI' },
  voice_agent: { icon: Phone, color: 'text-pink-400', bgColor: 'bg-pink-500/10', label: 'Voice' },
  web_design: { icon: Globe, color: 'text-sky-400', bgColor: 'bg-sky-500/10', label: 'Web' },
  seo: { icon: TrendingUp, color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', label: 'SEO' },
  ads: { icon: Megaphone, color: 'text-amber-400', bgColor: 'bg-amber-500/10', label: 'Ads' },
};

// Project Card Component
const ProjectCard = React.memo(function ProjectCard({
  project,
  showPhaseActions = true,
}: {
  project: ProjectPipelineData;
  showPhaseActions?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const typeConfig = project.project_type ? PROJECT_TYPE_CONFIG[project.project_type] : null;
  const TypeIcon = typeConfig?.icon || Folder;

  const handleAdvance = () => {
    startTransition(async () => {
      await advanceProjectPhase(project.id);
      router.refresh();
    });
  };

  const handleRegress = () => {
    startTransition(async () => {
      await regressProjectPhase(project.id);
      router.refresh();
    });
  };

  const handleSetPhase = (phaseName: string) => {
    startTransition(async () => {
      await setProjectPhase(project.id, phaseName);
      router.refresh();
    });
  };

  // Calculate phase index for progress dots
  const currentPhaseIndex = PHASES.findIndex((p) => p.name === project.current_phase_name);

  return (
    <div
      className={cn(
        'group relative rounded-lg border bg-card p-3 transition-all hover:shadow-md',
        isPending && 'pointer-events-none opacity-60',
        project.is_live && 'border-emerald-500/40'
      )}
    >
      {/* Live indicator */}
      {project.is_live && (
        <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center">
          <span className="absolute h-3 w-3 animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative h-2 w-2 rounded-full bg-emerald-500" />
        </div>
      )}

      {/* Header: Logo + Name + Type */}
      <Link href={`/projects/${project.id}`} className="block">
        <div className="flex items-start gap-2.5">
          <EntityAvatar
            src={project.logo_url}
            fallbackIcon={<TypeIcon className="h-3.5 w-3.5" />}
            fallbackBgColor={typeConfig?.bgColor || 'bg-muted'}
            fallbackIconColor={typeConfig?.color || 'text-muted-foreground'}
            size="sm"
          />
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-medium leading-tight text-foreground group-hover:text-qualia-500">
              {project.name}
            </h3>
            {project.client_name && (
              <p className="truncate text-xs text-muted-foreground">{project.client_name}</p>
            )}
          </div>
        </div>
      </Link>

      {/* Progress bar */}
      <div className="mt-3">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            {project.completed_tasks}/{project.total_tasks} tasks
          </span>
          <span className="font-medium text-foreground">{project.overall_progress}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              project.overall_progress === 100
                ? 'bg-emerald-500'
                : project.overall_progress > 50
                  ? 'bg-qualia-500'
                  : 'bg-blue-500'
            )}
            style={{ width: `${project.overall_progress}%` }}
          />
        </div>
      </div>

      {/* Phase dots progress indicator */}
      {currentPhaseIndex >= 0 && (
        <div className="mt-2.5 flex items-center justify-center gap-1">
          {PHASES.map((phase, i) => {
            const isComplete = i < currentPhaseIndex;
            const isCurrent = i === currentPhaseIndex;
            return (
              <div
                key={phase.key}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  isComplete
                    ? 'w-3 bg-emerald-500'
                    : isCurrent
                      ? cn('w-4', phase.color)
                      : 'w-1.5 bg-muted'
                )}
                title={phase.name}
              />
            );
          })}
        </div>
      )}

      {/* Footer: Due date + Actions */}
      <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-2">
        {project.target_date ? (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {formatDate(project.target_date)}
          </span>
        ) : (
          <span />
        )}

        {showPhaseActions && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 opacity-0 transition-opacity group-hover:opacity-100"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleAdvance} disabled={isPending}>
                <ArrowRight className="mr-2 h-4 w-4 text-emerald-500" />
                <span>Complete Phase</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleRegress} disabled={isPending}>
                <ArrowLeft className="mr-2 h-4 w-4 text-amber-500" />
                <span>Go Back</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {PHASES.map((phase) => (
                <DropdownMenuItem
                  key={phase.key}
                  onClick={() => handleSetPhase(phase.name)}
                  disabled={isPending || phase.name === project.current_phase_name}
                  className={cn(phase.name === project.current_phase_name && 'bg-muted')}
                >
                  <phase.icon className={cn('mr-2 h-4 w-4', phase.textColor)} />
                  <span>{phase.name}</span>
                  {phase.name === project.current_phase_name && (
                    <span className="ml-auto text-xs text-muted-foreground">Current</span>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
});

// Phase Column Component
function PhaseColumn({
  phase,
  projects,
  showPhaseActions = true,
}: {
  phase: (typeof PHASES)[0] | (typeof EXTRA_COLUMNS)[0];
  projects: ProjectPipelineData[];
  showPhaseActions?: boolean;
}) {
  const Icon = phase.icon;

  return (
    <div className="flex h-full min-w-[260px] flex-col rounded-lg border border-border bg-card/50">
      {/* Column header */}
      <div
        className={cn(
          'flex items-center gap-2 border-b px-3 py-2.5',
          phase.borderColor,
          phase.lightColor
        )}
      >
        <div className={cn('rounded-md p-1.5', phase.lightColor)}>
          <Icon className={cn('h-4 w-4', phase.textColor)} />
        </div>
        <h3 className="font-medium text-foreground">{phase.name}</h3>
        <span
          className={cn(
            'ml-auto rounded-full px-2 py-0.5 text-xs font-medium',
            phase.lightColor,
            phase.textColor
          )}
        >
          {projects.length}
        </span>
      </div>

      {/* Projects list */}
      <div className="flex-1 space-y-2 overflow-y-auto p-2">
        {projects.length === 0 ? (
          <div className="flex h-24 items-center justify-center">
            <p className="text-xs text-muted-foreground">No projects</p>
          </div>
        ) : (
          projects.map((project) => (
            <ProjectCard key={project.id} project={project} showPhaseActions={showPhaseActions} />
          ))
        )}
      </div>
    </div>
  );
}

// Main Pipeline Kanban Component
interface ProjectPipelineKanbanProps {
  projectsByPhase: ProjectsByPhase;
}

export function ProjectPipelineKanban({ projectsByPhase }: ProjectPipelineKanbanProps) {
  const allPhases = [...PHASES, ...EXTRA_COLUMNS];

  // Calculate total projects
  const totalProjects = Object.values(projectsByPhase).flat().length;
  const activeProjects =
    projectsByPhase.setup.length +
    projectsByPhase.plan.length +
    projectsByPhase.frontend.length +
    projectsByPhase.backend.length +
    projectsByPhase.ship.length;

  return (
    <div className="flex h-full flex-col">
      {/* Stats bar */}
      <div className="mb-4 flex items-center gap-4 text-sm text-muted-foreground">
        <span>
          <strong className="text-foreground">{totalProjects}</strong> total projects
        </span>
        <span className="h-1 w-1 rounded-full bg-border" />
        <span>
          <strong className="text-foreground">{activeProjects}</strong> in progress
        </span>
        <span className="h-1 w-1 rounded-full bg-border" />
        <span>
          <strong className="text-foreground">{projectsByPhase.launched.length}</strong> launched
        </span>
      </div>

      {/* Kanban board */}
      <div className="flex gap-3 overflow-x-auto pb-4">
        {allPhases.map((phase) => (
          <PhaseColumn
            key={phase.key}
            phase={phase}
            projects={projectsByPhase[phase.key]}
            showPhaseActions={!['launched', 'demos'].includes(phase.key)}
          />
        ))}
      </div>
    </div>
  );
}
