'use client';

import { useState, useMemo } from 'react';
import { Beaker, Hammer, Rocket, Archive, ChevronRight, Folder } from 'lucide-react';
import { ProjectListView } from '@/components/project-list-view';
import { DemoSheet } from '@/components/demo-sheet';
import { useProjectStats, type ProjectStatsData } from '@/lib/swr';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import type { ProjectData } from './page';

interface ProjectsClientProps {
  demos: ProjectData[];
  building: ProjectData[];
  live: ProjectData[];
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
}: {
  stage: keyof typeof STAGE_CONFIG;
  projects: ProjectStatsData[];
  onDemoClick?: (demo: ProjectStatsData) => void;
}) {
  const config = STAGE_CONFIG[stage];
  const Icon = config.icon;

  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border/40 bg-card shadow-elevation-1">
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
            {projects.map((project) => {
              const isDelayed = project.status === 'Delayed';
              return (
                <div
                  key={project.id}
                  className={cn('relative', stage === 'building' && 'card-interactive rounded-lg')}
                >
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
  live: initialLive,
  archived: initialArchived,
}: ProjectsClientProps) {
  const { demos, building, live, archived } = useProjectStats({
    demos: initialDemos as ProjectStatsData[],
    building: initialBuilding as ProjectStatsData[],
    live: initialLive as ProjectStatsData[],
    archived: initialArchived as ProjectStatsData[],
  });

  const [selectedDemo, setSelectedDemo] = useState<ProjectData | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [archivedOpen, setArchivedOpen] = useState(false);

  const handleDemoClick = (demo: ProjectStatsData) => {
    setSelectedDemo(demo as ProjectData);
    setSheetOpen(true);
  };

  // Compute stats
  const totalProjects = demos.length + building.length + live.length;
  const avgCompletion = useMemo(() => {
    const allActive = [...building, ...live];
    if (allActive.length === 0) return 0;
    const total = allActive.reduce((sum, p) => {
      const stats = (p as ProjectData).issue_stats;
      if (!stats || stats.total === 0) return sum;
      return sum + (stats.done / stats.total) * 100;
    }, 0);
    return Math.round(total / allActive.length);
  }, [building, live]);

  return (
    <div className="flex h-full w-full flex-col gap-5 overflow-hidden p-5 md:p-6">
      {/* Stats strip */}
      <div className="flex shrink-0 items-center gap-2 overflow-x-auto">
        <div className="flex items-center gap-2 rounded-lg border border-border/30 bg-card/60 px-3 py-1.5">
          <Folder className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm font-semibold tabular-nums text-foreground">
            {totalProjects}
          </span>
          <span className="text-xs text-muted-foreground">total</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border/30 bg-card/60 px-3 py-1.5">
          <Hammer className="h-3.5 w-3.5 text-emerald-500" />
          <span className="text-sm font-semibold tabular-nums text-foreground">
            {building.length}
          </span>
          <span className="text-xs text-muted-foreground">active</span>
        </div>
        {avgCompletion > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-border/30 bg-card/60 px-3 py-1.5">
            <span className="text-sm font-semibold tabular-nums text-foreground">
              {avgCompletion}%
            </span>
            <span className="text-xs text-muted-foreground">avg completion</span>
          </div>
        )}
      </div>

      {/* Three-column pipeline — Building gets 2x width */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 lg:grid-cols-[1fr_2fr_1fr]">
        <StageColumn stage="demo" projects={demos} onDemoClick={handleDemoClick} />
        <StageColumn stage="building" projects={building} />
        <StageColumn stage="live" projects={live} />
      </div>

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
            <div className="mt-2 rounded-xl border border-border/40 bg-card/50 p-3">
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
