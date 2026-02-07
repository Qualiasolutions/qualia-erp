'use client';

import { useState } from 'react';
import { Beaker, Trophy, Hammer } from 'lucide-react';
import { ProjectListView } from '@/components/project-list-view';
import { ProjectColumnView } from '@/components/project-column-view';
import { DemoSheet } from '@/components/demo-sheet';
import { useProjectStats, type ProjectStatsData } from '@/lib/swr';
import type { ProjectData } from './page';

interface ProjectsClientProps {
  projects: ProjectData[];
  demos: ProjectData[];
  finishedProjects: ProjectData[];
  archivedDemos: ProjectData[];
  archivedProjects: ProjectData[];
}

export function ProjectsClient({
  projects: initialProjects,
  demos: initialDemos,
  finishedProjects: initialFinishedProjects,
}: ProjectsClientProps) {
  const { projects, demos } = useProjectStats({
    projects: initialProjects as ProjectStatsData[],
    demos: initialDemos as ProjectStatsData[],
  });

  const [selectedDemo, setSelectedDemo] = useState<ProjectData | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const handleDemoClick = (demo: ProjectStatsData) => {
    setSelectedDemo(demo as ProjectData);
    setSheetOpen(true);
  };

  const finishedProjects = initialFinishedProjects;
  const hasFinishedProjects = finishedProjects.length > 0;
  const hasDemos = demos.length > 0;

  return (
    <div className="flex h-full w-full flex-col gap-5 overflow-hidden p-5 md:p-6">
      {/* Main area: Currently Building takes the stage */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 lg:grid-cols-[1fr_280px]">
        {/* Currently Building — the dominant section */}
        <div className="shadow-subtle flex flex-col overflow-hidden rounded-xl border border-border/60 bg-card">
          <div className="flex flex-shrink-0 items-center gap-2.5 border-b border-border/50 px-5 py-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
              <Hammer className="h-3.5 w-3.5 text-primary" />
            </div>
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              Currently Building
            </h2>
            <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {projects.length}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            <ProjectListView projects={projects as ProjectData[]} compact />
          </div>
        </div>

        {/* Demos — narrow sidebar column */}
        {hasDemos && (
          <ProjectColumnView
            title="Demos"
            icon={<Beaker className="h-3.5 w-3.5" />}
            projects={demos as ProjectData[]}
            emptyMessage="No demos yet"
            onProjectClick={handleDemoClick}
            className="h-full"
          />
        )}
      </div>

      {/* Completed Projects — compact bottom strip */}
      {hasFinishedProjects && (
        <div className="shadow-subtle flex min-h-0 flex-shrink-0 flex-col overflow-hidden rounded-xl border border-border/60 bg-card">
          <div className="flex flex-shrink-0 items-center gap-2.5 border-b border-border/50 px-5 py-2.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/10">
              <Trophy className="h-3 w-3 text-emerald-500" />
            </div>
            <h2 className="text-sm font-medium text-foreground">Completed</h2>
            <span className="ml-auto text-xs text-muted-foreground">{finishedProjects.length}</span>
          </div>
          <div className="overflow-x-auto px-4 py-3">
            <ProjectListView projects={finishedProjects} horizontal />
          </div>
        </div>
      )}

      {/* Demo Sheet */}
      {selectedDemo && (
        <DemoSheet open={sheetOpen} onOpenChange={setSheetOpen} demo={selectedDemo} />
      )}
    </div>
  );
}
