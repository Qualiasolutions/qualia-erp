'use client';

import { useState } from 'react';
import { Briefcase, Beaker, Archive, ChevronDown } from 'lucide-react';
import { ProjectColumnView } from '@/components/project-column-view';
import { DemoSheet } from '@/components/demo-sheet';
import { useProjectStats, type ProjectStatsData } from '@/lib/swr';
import { cn } from '@/lib/utils';
import type { ProjectData } from './page';

interface ProjectsClientProps {
  projects: ProjectData[];
  demos: ProjectData[];
  archivedDemos: ProjectData[];
  archivedProjects: ProjectData[];
}

export function ProjectsClient({
  projects: initialProjects,
  demos: initialDemos,
  archivedDemos: initialArchivedDemos,
  archivedProjects: initialArchivedProjects,
}: ProjectsClientProps) {
  // Use SWR for real-time updates, with server data as initial/fallback
  const { projects, demos } = useProjectStats({
    projects: initialProjects as ProjectStatsData[],
    demos: initialDemos as ProjectStatsData[],
  });

  const [selectedDemo, setSelectedDemo] = useState<ProjectData | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [showArchivedDemos, setShowArchivedDemos] = useState(false);
  const [showArchivedProjects, setShowArchivedProjects] = useState(false);

  const handleDemoClick = (demo: ProjectStatsData) => {
    setSelectedDemo(demo as ProjectData);
    setSheetOpen(true);
  };

  // Use initial data for archived items (no SWR for these)
  const archivedDemos = initialArchivedDemos;
  const archivedProjects = initialArchivedProjects;

  const hasArchivedDemos = archivedDemos.length > 0;
  const hasArchivedProjects = archivedProjects.length > 0;

  return (
    <div className="space-y-6">
      {/* Main columns */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <ProjectColumnView
          title="Projects"
          icon={<Briefcase className="h-4 w-4" />}
          projects={projects as ProjectData[]}
          emptyMessage="No projects yet"
        />
        <ProjectColumnView
          title="Demos"
          icon={<Beaker className="h-4 w-4" />}
          projects={demos as ProjectData[]}
          emptyMessage="No demos yet"
          onProjectClick={handleDemoClick}
        />
      </div>

      {/* Archived Sections */}
      {(hasArchivedDemos || hasArchivedProjects) && (
        <div className="space-y-4">
          {/* Archived Demos */}
          {hasArchivedDemos && (
            <div className="rounded-lg border border-border bg-card">
              <button
                onClick={() => setShowArchivedDemos(!showArchivedDemos)}
                className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center gap-2">
                  <Archive className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Archived Demos</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {archivedDemos.length}
                  </span>
                </div>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 text-muted-foreground transition-transform',
                    showArchivedDemos && 'rotate-180'
                  )}
                />
              </button>
              {showArchivedDemos && (
                <div className="border-t border-border p-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {archivedDemos.map((demo) => (
                      <div
                        key={demo.id}
                        onClick={() => handleDemoClick(demo as ProjectStatsData)}
                        className="cursor-pointer rounded-lg border border-border/50 bg-muted/30 p-3 transition-colors hover:bg-muted/50"
                      >
                        <p className="truncate font-medium text-muted-foreground">{demo.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground/70">
                          {demo.status} • {demo.client_name || 'No client'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Archived Projects */}
          {hasArchivedProjects && (
            <div className="rounded-lg border border-border bg-card">
              <button
                onClick={() => setShowArchivedProjects(!showArchivedProjects)}
                className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center gap-2">
                  <Archive className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Archived Projects</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {archivedProjects.length}
                  </span>
                </div>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 text-muted-foreground transition-transform',
                    showArchivedProjects && 'rotate-180'
                  )}
                />
              </button>
              {showArchivedProjects && (
                <div className="border-t border-border p-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {archivedProjects.map((project) => (
                      <div
                        key={project.id}
                        onClick={() => (window.location.href = `/projects/${project.id}`)}
                        className="cursor-pointer rounded-lg border border-border/50 bg-muted/30 p-3 transition-colors hover:bg-muted/50"
                      >
                        <p className="truncate font-medium text-muted-foreground">{project.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground/70">
                          {project.status} • {project.client_name || 'No client'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <DemoSheet demo={selectedDemo} open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  );
}
