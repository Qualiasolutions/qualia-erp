'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Folder, Loader2 } from 'lucide-react';
import { ProjectRoadmap } from '@/components/roadmap/project-roadmap';
import { getProjectById } from '@/app/actions';
import type { ProjectType } from '@/lib/phase-templates';

interface Project {
  id: string;
  name: string;
  project_type: ProjectType | null;
  workspace_id: string;
}

export default function RoadmapPage() {
  const params = useParams();
  const id = params.id as string;
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProject() {
      setLoading(true);
      const data = await getProjectById(id);
      if (data) {
        setProject({
          id: data.id,
          name: data.name,
          project_type: data.project_type as ProjectType | null,
          workspace_id: data.workspace_id,
        });
      } else {
        setError('Project not found');
      }
      setLoading(false);
    }
    loadProject();
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-full flex-col">
        <header className="flex items-center gap-4 border-b border-border bg-background px-6 py-4">
          <div className="h-6 w-32 animate-pulse rounded bg-muted" />
        </header>
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
        <p>{error || 'Project not found'}</p>
        <Link href="/projects" className="mt-2 text-qualia-400 hover:underline">
          Back to Projects
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex items-center gap-4 border-b border-border bg-background px-6 py-4">
        <Link href={`/projects/${id}`} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-muted text-muted-foreground">
            <Folder className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-sm font-medium">{project.name}</h1>
            <p className="text-xs text-muted-foreground">Roadmap</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-4xl">
          <ProjectRoadmap
            projectId={project.id}
            projectType={project.project_type}
            workspaceId={project.workspace_id}
          />
        </div>
      </div>
    </div>
  );
}
