import { Suspense } from 'react';
import { connection } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId } from '@/app/actions';
import { NewProjectModal } from '@/components/new-project-modal';
import { Folder, Beaker, Briefcase } from 'lucide-react';
import { ProjectColumnView } from '@/components/project-column-view';
import type { ProjectType } from '@/types/database';

export interface ProjectData {
  id: string;
  name: string;
  status: string;
  start_date: string | null;
  target_date: string | null;
  project_group: string | null;
  project_type: ProjectType | null;
  deployment_platform: string | null;
  client_id: string | null;
  client_name: string | null;
  logo_url: string | null;
  lead: {
    id: string;
    full_name: string | null;
    email: string | null;
  } | null;
  issue_stats: {
    total: number;
    done: number;
  };
  roadmap_progress: number;
  metadata: { is_partnership?: boolean; partner_name?: string } | null;
}

async function ProjectListLoader() {
  await connection();
  const supabase = await createClient();
  const workspaceId = await getCurrentWorkspaceId();

  const { data: rawProjects, error } = await supabase.rpc('get_project_stats', {
    p_workspace_id: workspaceId,
  });

  if (error) {
    console.error('Error fetching projects:', error);
    return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <ProjectColumnView
          title="Projects"
          icon={<Briefcase className="h-4 w-4" />}
          projects={[]}
          emptyMessage="No projects yet"
        />
        <ProjectColumnView
          title="Demos"
          icon={<Beaker className="h-4 w-4" />}
          projects={[]}
          emptyMessage="No demos yet"
        />
      </div>
    );
  }

  // Map RPC result to Project interface
  const projects: ProjectData[] = (rawProjects || []).map((p: Record<string, unknown>) => ({
    id: p.id as string,
    name: p.name as string,
    status: p.status as string,
    start_date: p.start_date as string | null,
    target_date: p.target_date as string | null,
    project_group: p.project_group as string | null,
    project_type: p.project_type as ProjectType | null,
    deployment_platform: p.deployment_platform as string | null,
    client_id: p.client_id as string | null,
    client_name: p.client_name as string | null,
    logo_url: (p.logo_url as string | null) || null,
    lead: p.lead_id
      ? {
          id: p.lead_id as string,
          full_name: p.lead_full_name as string | null,
          email: p.lead_email as string | null,
        }
      : null,
    issue_stats: {
      total: Number(p.total_issues),
      done: Number(p.done_issues),
    },
    roadmap_progress: (p.roadmap_progress as number) || 0,
    metadata: p.metadata as { is_partnership?: boolean; partner_name?: string } | null,
  }));

  // Split projects: Demos status goes to demos column, rest to projects column
  const demos = projects.filter((p) => p.status === 'Demos');
  const activeProjects = projects.filter((p) => p.status !== 'Demos');

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
      <ProjectColumnView
        title="Projects"
        icon={<Briefcase className="h-4 w-4" />}
        projects={activeProjects}
        emptyMessage="No projects yet"
      />
      <ProjectColumnView
        title="Demos"
        icon={<Beaker className="h-4 w-4" />}
        projects={demos}
        emptyMessage="No demos yet"
      />
    </div>
  );
}

function ColumnSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <div className="h-4 w-4 animate-pulse rounded bg-muted" />
        <div className="h-5 w-24 animate-pulse rounded bg-muted" />
        <div className="ml-auto h-5 w-6 animate-pulse rounded-full bg-muted" />
      </div>
      <div className="divide-y divide-border">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <div className="h-8 w-8 animate-pulse rounded-lg bg-muted" />
            <div className="flex-1">
              <div className="h-4 w-32 animate-pulse rounded bg-muted" />
              <div className="mt-1 h-3 w-20 animate-pulse rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProjectColumnsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
      <ColumnSkeleton />
      <ColumnSkeleton />
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 sm:h-9 sm:w-9">
            <Folder className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
              Projects
            </h1>
            <p className="hidden text-xs text-muted-foreground sm:block">
              Demos and active projects
            </p>
          </div>
        </div>
        <NewProjectModal />
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <Suspense fallback={<ProjectColumnsSkeleton />}>
          <ProjectListLoader />
        </Suspense>
      </div>
    </div>
  );
}
