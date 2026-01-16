import { Suspense } from 'react';
import { connection } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId } from '@/app/actions';
import { NewProjectModal } from '@/components/new-project-modal';
import { Folder } from 'lucide-react';
import { ProjectsClient } from './projects-client';
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
    return <ProjectsClient projects={[]} demos={[]} />;
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

  return <ProjectsClient projects={activeProjects} demos={demos} />;
}

function ProjectsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Toolbar skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="h-9 w-64 animate-pulse rounded-lg bg-muted" />
        <div className="flex items-center gap-2">
          <div className="h-9 w-64 animate-pulse rounded-lg bg-muted" />
          <div className="h-9 w-20 animate-pulse rounded-lg bg-muted" />
          <div className="h-9 w-16 animate-pulse rounded-lg bg-muted" />
        </div>
      </div>
      {/* Grid skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 animate-pulse rounded-lg bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
                <div className="flex gap-2">
                  <div className="h-4 w-12 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                </div>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between">
                <div className="h-3 w-16 animate-pulse rounded bg-muted" />
                <div className="h-3 w-8 animate-pulse rounded bg-muted" />
              </div>
              <div className="h-1.5 animate-pulse rounded-full bg-muted" />
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-3">
              <div className="h-3 w-20 animate-pulse rounded bg-muted" />
              <div className="h-3 w-12 animate-pulse rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-qualia-500/10 sm:h-9 sm:w-9">
            <Folder className="h-4 w-4 text-qualia-500" />
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
              Projects
            </h1>
            <p className="hidden text-xs text-muted-foreground sm:block">
              Manage all your projects and demos
            </p>
          </div>
        </div>
        <NewProjectModal />
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <Suspense fallback={<ProjectsSkeleton />}>
          <ProjectListLoader />
        </Suspense>
      </div>
    </div>
  );
}
