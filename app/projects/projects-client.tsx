'use client';

import { useState } from 'react';
import { Beaker, Trophy } from 'lucide-react';
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
  // Use SWR for real-time updates, with server data as initial/fallback
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

  // Use initial data for finished items (no SWR for these)
  const finishedProjects = initialFinishedProjects;
  const hasFinishedProjects = finishedProjects.length > 0;

  return (
    <div className="flex h-[90vh] w-full flex-col gap-6 overflow-hidden p-6 md:p-8">
      {/* Top Section: Currently Building + Demos */}
      <div className="grid min-h-0 flex-[3] grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        {/* Active Projects */}
        <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-card">
          <div className="flex flex-shrink-0 items-center gap-2 border-b border-border px-4 py-2.5">
            <Beaker className="h-4 w-4 text-primary" />
            <h2 className="font-semibold text-foreground">Currently Building</h2>
            <span className="ml-auto text-xs text-muted-foreground">{projects.length} active</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            <ProjectListView projects={projects as ProjectData[]} compact />
          </div>
        </div>

        {/* Demos Column */}
        <ProjectColumnView
          title="Demos"
          icon={<Beaker className="h-4 w-4" />}
          projects={demos as ProjectData[]}
          emptyMessage="No demos yet"
          onProjectClick={handleDemoClick}
          className="h-full"
        />
      </div>

      {/* Bottom Section: Completed Projects */}
      {hasFinishedProjects && (
        <div className="flex min-h-0 flex-shrink-0 flex-col overflow-hidden rounded-lg border border-border bg-card">
          <div className="flex flex-shrink-0 items-center gap-2 border-b border-border px-4 py-3">
            <Trophy className="h-4 w-4 text-emerald-500" />
            <h2 className="font-semibold text-foreground">Recently Completed</h2>
            <span className="ml-auto text-xs text-muted-foreground">
              {finishedProjects.length} completed
            </span>
          </div>
          <div className="overflow-x-auto p-4">
            <ProjectListView projects={finishedProjects} horizontal={true} />
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
