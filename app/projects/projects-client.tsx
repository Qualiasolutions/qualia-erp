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
    <div className="flex h-[100vh] flex-col overflow-hidden">
      {/* Main columns - Currently Building and Demos side by side */}
      <div className="grid h-full grid-cols-1 gap-6 overflow-hidden p-6 lg:grid-cols-[1fr_320px]">
        {/* Projects column with scrollable content */}
        <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <h2 className="font-semibold text-foreground">Currently Building</h2>
            <p className="text-xs text-muted-foreground">{projects.length} active projects</p>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <ProjectListView projects={projects as ProjectData[]} />
          </div>
        </div>

        {/* Demos column */}
        <ProjectColumnView
          title="Demos"
          icon={<Beaker className="h-4 w-4" />}
          projects={demos as ProjectData[]}
          emptyMessage="No demos yet"
          onProjectClick={handleDemoClick}
        />
      </div>

      {/* Demo Sheet */}
      {selectedDemo && (
        <DemoSheet open={sheetOpen} onOpenChange={setSheetOpen} demo={selectedDemo} />
      )}
    </div>
  );
}
