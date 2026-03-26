'use client';

import { useState, useMemo, useTransition } from 'react';
import {
  Beaker,
  Hammer,
  Rocket,
  Archive,
  CheckCircle2,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Folder,
  ClipboardCheck,
} from 'lucide-react';
import { ProjectListView } from '@/components/project-list-view';
import { DemoSheet } from '@/components/demo-sheet';
import { useProjectStats, invalidateProjectStats, type ProjectStatsData } from '@/lib/swr';
import { reorderProject } from '@/app/actions';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { useAdminContext } from '@/components/admin-provider';
import type { ProjectData } from './page';

interface ProjectsClientProps {
  demos: ProjectData[];
  building: ProjectData[];
  preProduction: ProjectData[];
  live: ProjectData[];
  done: ProjectData[];
  archived: ProjectData[];
}

const STAGE_CONFIG = {
  demo: {
    title: 'Demo',
    icon: Beaker,
    color: 'text-violet-500',
    bgColor: 'bg-violet-500/10',
    badgeColor: 'bg-violet-500/10 text-violet-500',
    borderColor: 'border-violet-500/20',
  },
  building: {
    title: 'Building',
    icon: Hammer,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    badgeColor: 'bg-emerald-500/10 text-emerald-500',
    borderColor: 'border-emerald-500/20',
  },
  preProduction: {
    title: 'Pre-Production',
    icon: ClipboardCheck,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    badgeColor: 'bg-amber-500/10 text-amber-500',
    borderColor: 'border-amber-500/20',
  },
  live: {
    title: 'Live',
    icon: Rocket,
    color: 'text-sky-500',
    bgColor: 'bg-sky-500/10',
    badgeColor: 'bg-sky-500/10 text-sky-500',
    borderColor: 'border-sky-500/20',
  },
} as const;

function StageColumn({
  stage,
  projects,
  onDemoClick,
  onReorder,
  isReordering,
}: {
  stage: keyof typeof STAGE_CONFIG;
  projects: ProjectStatsData[];
  onDemoClick?: (demo: ProjectStatsData) => void;
  onReorder?: (projectId: string, direction: 'up' | 'down') => void;
  isReordering?: boolean;
}) {
  const config = STAGE_CONFIG[stage];
  const Icon = config.icon;
  const { isSuperAdmin } = useAdminContext();

  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-elevation-1">
      {/* Column header */}
      <div
        className={cn(
          'flex flex-shrink-0 items-center gap-2.5 border-b bg-muted/20 px-4 py-3',
          config.borderColor
        )}
      >
        <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', config.bgColor)}>
          <Icon className={cn('h-4 w-4', config.color)} />
        </div>
        <h2 className="text-sm font-semibold tracking-tight text-foreground">{config.title}</h2>
        <span
          className={cn(
            'ml-auto flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
            config.badgeColor
          )}
        >
          {projects.length}
        </span>
      </div>

      {/* Scrollable project list */}
      <div className="flex-1 overflow-y-auto p-3">
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className={cn('mb-3 rounded-xl p-4', config.bgColor)}>
              <Icon className={cn('h-6 w-6', config.color)} />
            </div>
            <p className="text-sm text-muted-foreground">
              No {config.title.toLowerCase()} projects
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {projects.map((project, idx) => {
              const isDelayed = project.status === 'Delayed';
              return (
                <div key={project.id} className="group/row relative flex items-center gap-1">
                  {/* Reorder arrows — admin only */}
                  {isSuperAdmin && onReorder && (
                    <div className="flex shrink-0 flex-col opacity-0 transition-opacity group-hover/row:opacity-100">
                      <button
                        type="button"
                        disabled={idx === 0 || isReordering}
                        onClick={(e) => {
                          e.stopPropagation();
                          onReorder(project.id, 'up');
                        }}
                        className="flex h-4 w-4 items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
                      >
                        <ChevronUp className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === projects.length - 1 || isReordering}
                        onClick={(e) => {
                          e.stopPropagation();
                          onReorder(project.id, 'down');
                        }}
                        className="flex h-4 w-4 items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
                      >
                        <ChevronDown className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    {isDelayed && (
                      <span className="absolute -top-1 right-2 z-10 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-500">
                        Delayed
                      </span>
                    )}
                    <ProjectListView
                      projects={[project as ProjectData]}
                      compact
                      onProjectClick={stage === 'demo' ? () => onDemoClick?.(project) : undefined}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function ProjectsClient({
  demos: initialDemos,
  building: initialBuilding,
  preProduction: initialPreProduction,
  live: initialLive,
  done: initialDone,
  archived: initialArchived,
}: ProjectsClientProps) {
  const { demos, building, preProduction, live, done, archived } = useProjectStats({
    demos: initialDemos as ProjectStatsData[],
    building: initialBuilding as ProjectStatsData[],
    preProduction: initialPreProduction as ProjectStatsData[],
    live: initialLive as ProjectStatsData[],
    done: initialDone as ProjectStatsData[],
    archived: initialArchived as ProjectStatsData[],
  });

  const [selectedDemo, setSelectedDemo] = useState<ProjectData | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [doneOpen, setDoneOpen] = useState(false);
  const [archivedOpen, setArchivedOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleDemoClick = (demo: ProjectStatsData) => {
    setSelectedDemo(demo as ProjectData);
    setSheetOpen(true);
  };

  const handleReorder = (
    projectId: string,
    direction: 'up' | 'down',
    stageProjects: ProjectStatsData[]
  ) => {
    startTransition(async () => {
      const ids = stageProjects.map((p) => p.id);
      const result = await reorderProject(projectId, direction, ids);
      if (result.success) {
        invalidateProjectStats(true);
      }
    });
  };

  // Compute stats
  const totalProjects =
    demos.length + building.length + preProduction.length + live.length + done.length;
  const avgCompletion = useMemo(() => {
    const allActive = [...building, ...preProduction, ...live];
    if (allActive.length === 0) return 0;
    const total = allActive.reduce((sum, p) => {
      const stats = (p as ProjectData).issue_stats;
      if (!stats || stats.total === 0) return sum;
      return sum + (stats.done / stats.total) * 100;
    }, 0);
    return Math.round(total / allActive.length);
  }, [building, preProduction, live]);

  return (
    <div className="flex h-full w-full flex-col gap-5 overflow-hidden p-5 md:p-6">
      {/* Stats strip */}
      <div className="flex shrink-0 items-center gap-2 overflow-x-auto">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card/60 px-3 py-1.5">
          <Folder className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm font-semibold tabular-nums text-foreground">
            {totalProjects}
          </span>
          <span className="text-xs text-muted-foreground">total</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card/60 px-3 py-1.5">
          <Hammer className="h-3.5 w-3.5 text-emerald-500" />
          <span className="text-sm font-semibold tabular-nums text-foreground">
            {building.length}
          </span>
          <span className="text-xs text-muted-foreground">building</span>
        </div>
        {preProduction.length > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card/60 px-3 py-1.5">
            <ClipboardCheck className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-sm font-semibold tabular-nums text-foreground">
              {preProduction.length}
            </span>
            <span className="text-xs text-muted-foreground">pre-prod</span>
          </div>
        )}
        {done.length > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-border/30 bg-card/60 px-3 py-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-teal-500" />
            <span className="text-sm font-semibold tabular-nums text-foreground">
              {done.length}
            </span>
            <span className="text-xs text-muted-foreground">done</span>
          </div>
        )}
        {avgCompletion > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card/60 px-3 py-1.5">
            <span className="text-sm font-semibold tabular-nums text-foreground">
              {avgCompletion}%
            </span>
            <span className="text-xs text-muted-foreground">avg completion</span>
          </div>
        )}
      </div>

      {/* Four-column pipeline */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 lg:grid-cols-4">
        <StageColumn
          stage="demo"
          projects={demos}
          onDemoClick={handleDemoClick}
          onReorder={(id, dir) => handleReorder(id, dir, demos)}
          isReordering={isPending}
        />
        <StageColumn
          stage="building"
          projects={building}
          onReorder={(id, dir) => handleReorder(id, dir, building)}
          isReordering={isPending}
        />
        <StageColumn
          stage="preProduction"
          projects={preProduction}
          onReorder={(id, dir) => handleReorder(id, dir, preProduction)}
          isReordering={isPending}
        />
        <StageColumn
          stage="live"
          projects={live}
          onReorder={(id, dir) => handleReorder(id, dir, live)}
          isReordering={isPending}
        />
      </div>

      {/* Done — collapsible */}
      {done.length > 0 && (
        <Collapsible open={doneOpen} onOpenChange={setDoneOpen}>
          <CollapsibleTrigger className="group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground">
            <ChevronRight
              className={cn(
                'h-3.5 w-3.5 transition-transform duration-200',
                doneOpen && 'rotate-90'
              )}
            />
            <CheckCircle2 className="h-3.5 w-3.5 text-teal-500" />
            <span className="font-medium">Done</span>
            <span className="rounded-full bg-teal-500/10 px-2 py-0.5 text-xs text-teal-500">
              {done.length}
            </span>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 rounded-xl border border-teal-500/20 bg-teal-500/5 p-3">
              <div className="scrollbar-none flex gap-2 overflow-x-auto pb-1">
                {done.map((project) => (
                  <div key={project.id} className="w-[220px] flex-shrink-0">
                    <ProjectListView projects={[project as ProjectData]} compact />
                  </div>
                ))}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Archived — collapsible */}
      {archived.length > 0 && (
        <Collapsible open={archivedOpen} onOpenChange={setArchivedOpen}>
          <CollapsibleTrigger className="group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground">
            <ChevronRight
              className={cn(
                'h-3.5 w-3.5 transition-transform duration-200',
                archivedOpen && 'rotate-90'
              )}
            />
            <Archive className="h-3.5 w-3.5" />
            <span className="font-medium">Archived</span>
            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">{archived.length}</span>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 rounded-xl border border-border bg-card/50 p-3">
              <div className="scrollbar-none flex gap-2 overflow-x-auto pb-1">
                {archived.map((project) => (
                  <div key={project.id} className="w-[220px] flex-shrink-0">
                    <ProjectListView projects={[project as ProjectData]} compact />
                  </div>
                ))}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Demo Sheet */}
      {selectedDemo && (
        <DemoSheet open={sheetOpen} onOpenChange={setSheetOpen} demo={selectedDemo} />
      )}
    </div>
  );
}
