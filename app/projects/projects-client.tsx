'use client';

import { useState } from 'react';
import { Briefcase, Beaker } from 'lucide-react';
import { ProjectColumnView } from '@/components/project-column-view';
import { DemoSheet } from '@/components/demo-sheet';
import type { ProjectData } from './page';

interface ProjectsClientProps {
  projects: ProjectData[];
  demos: ProjectData[];
}

export function ProjectsClient({ projects, demos }: ProjectsClientProps) {
  const [selectedDemo, setSelectedDemo] = useState<ProjectData | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const handleDemoClick = (demo: ProjectData) => {
    setSelectedDemo(demo);
    setSheetOpen(true);
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <ProjectColumnView
          title="Projects"
          icon={<Briefcase className="h-4 w-4" />}
          projects={projects}
          emptyMessage="No projects yet"
        />
        <ProjectColumnView
          title="Demos"
          icon={<Beaker className="h-4 w-4" />}
          projects={demos}
          emptyMessage="No demos yet"
          onProjectClick={handleDemoClick}
        />
      </div>

      <DemoSheet demo={selectedDemo} open={sheetOpen} onOpenChange={setSheetOpen} />
    </>
  );
}
