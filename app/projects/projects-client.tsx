'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Beaker, Archive, ChevronDown, CheckCircle2, Trophy } from 'lucide-react';
import { ProjectListView } from '@/components/project-list-view';
import { ProjectColumnView } from '@/components/project-column-view';
import { DemoSheet } from '@/components/demo-sheet';
import { EntityAvatar } from '@/components/entity-avatar';
import { useProjectStats, type ProjectStatsData } from '@/lib/swr';
import { cn } from '@/lib/utils';
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
  archivedDemos: initialArchivedDemos,
  archivedProjects: initialArchivedProjects,
}: ProjectsClientProps) {
  const router = useRouter();

  // Use SWR for real-time updates, with server data as initial/fallback
  const { projects, demos } = useProjectStats({
    projects: initialProjects as ProjectStatsData[],
    demos: initialDemos as ProjectStatsData[],
  });

  const [selectedDemo, setSelectedDemo] = useState<ProjectData | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [showFinishedProjects, setShowFinishedProjects] = useState(true);
  const [showArchivedDemos, setShowArchivedDemos] = useState(false);
  const [showArchivedProjects, setShowArchivedProjects] = useState(false);

  const handleDemoClick = (demo: ProjectStatsData) => {
    setSelectedDemo(demo as ProjectData);
    setSheetOpen(true);
  };

  // Use initial data for finished/archived items (no SWR for these)
  const finishedProjects = initialFinishedProjects;
  const archivedDemos = initialArchivedDemos;
  const archivedProjects = initialArchivedProjects;

  const hasFinishedProjects = finishedProjects.length > 0;
  const hasArchivedDemos = archivedDemos.length > 0;
  const hasArchivedProjects = archivedProjects.length > 0;

  return (
    <div className="flex h-screen w-full flex-col gap-6 overflow-hidden p-6 md:p-8">
      {/* Top Section: Currently Building + Demos */}
      <div className="grid min-h-0 flex-[3] grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        {/* Active Projects */}
        <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-card">
          <div className="flex flex-shrink-0 items-center gap-2 border-b border-border px-4 py-3">
            <Beaker className="h-4 w-4 text-primary" />
            <h2 className="font-semibold text-foreground">Currently Building</h2>
            <span className="ml-auto text-xs text-muted-foreground">{projects.length} active</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <ProjectListView projects={projects as ProjectData[]} />
          </div>
        </div>

        {/* Demos Column */}
        <ProjectColumnView
          title="Demos"
          icon={<Beaker className="h-4 w-4" />} // Using Beaker for Demos too as per previous code, or maybe TestTube/Bot? Previous was Beaker.
          projects={demos as ProjectData[]}
          emptyMessage="No demos yet"
          onProjectClick={handleDemoClick}
          className="h-full"
        />
      </div>

      {/* Bottom Section: Completed Projects */}
      {hasFinishedProjects && (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card">
          <div className="flex flex-shrink-0 items-center gap-2 border-b border-border px-4 py-3">
            <Trophy className="h-4 w-4 text-emerald-500" />
            <h2 className="font-semibold text-foreground">Recently Completed</h2>
            <span className="ml-auto text-xs text-muted-foreground">
              {finishedProjects.length} completed
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <ProjectListView projects={finishedProjects} />
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
