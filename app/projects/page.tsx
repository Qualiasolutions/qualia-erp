import { Suspense } from 'react';
import { connection } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId } from '@/app/actions';
import { NewProjectModal } from '@/components/new-project-modal';
import { PendingReviewsBadge } from '@/components/projects-pipeline-overview';
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
  is_pre_production: boolean;
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
    return <ProjectsClient demos={[]} building={[]} preProduction={[]} live={[]} archived={[]} />;
  }

  // Map RPC result to Project interface
  const allProjects: ProjectData[] = (rawProjects || []).map((p: Record<string, unknown>) => ({
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
    is_pre_production: (p.is_pre_production as boolean) || false,
    metadata: p.metadata as { is_partnership?: boolean; partner_name?: string } | null,
  }));

  // Pipeline stages
  const demos = allProjects.filter((p) => p.status === 'Demos');
  const activeDelayed = allProjects.filter((p) => ['Active', 'Delayed'].includes(p.status));
  const building = activeDelayed.filter((p) => !p.is_pre_production);
  const preProduction = activeDelayed.filter((p) => p.is_pre_production);
  const live = allProjects.filter((p) => p.status === 'Launched');
  const archived = allProjects.filter((p) => ['Archived', 'Canceled'].includes(p.status));

  return (
    <ProjectsClient
      demos={demos}
      building={building}
      preProduction={preProduction}
      live={live}
      archived={archived}
    />
  );
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
      <header className="flex items-center justify-between border-b border-border/40 bg-card/80 px-6 py-4 backdrop-blur-xl sm:px-8">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
            <Folder className="h-3.5 w-3.5 text-primary" />
          </div>
          <h1 className="text-sm font-semibold text-foreground">Projects</h1>
        </div>
        <div className="flex items-center gap-3">
          <PendingReviewsBadge />
          <NewProjectModal />
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <Suspense fallback={<ProjectsSkeleton />}>
          <ProjectListLoader />
        </Suspense>
      </div>
    </div>
  );
}
