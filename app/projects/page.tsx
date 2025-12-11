import { Suspense } from 'react';
import { connection } from 'next/server';
import { ProjectList, type Project } from '@/components/project-list';
import { createClient } from '@/lib/supabase/server';
import { NewProjectModal } from '@/components/new-project-modal';
import { getCurrentWorkspaceId } from '@/app/actions';
import { ProjectTypeTabs } from '@/components/project-type-tabs';
import { Folder } from 'lucide-react';
import type { ProjectType } from '@/types/database';

type FilterType = ProjectType | 'all';

interface FilterParams {
  type?: FilterType;
}

async function ProjectListLoader({ filters }: { filters: FilterParams }) {
  await connection();
  const supabase = await createClient();
  const workspaceId = await getCurrentWorkspaceId();

  const { data: rawProjects, error } = await supabase.rpc('get_project_stats', {
    p_workspace_id: workspaceId,
  });

  if (error) {
    console.error('Error fetching projects:', error);
    return <ProjectList projects={[]} />;
  }

  // Map RPC result to Project interface
  const projects: Project[] = (rawProjects || []).map((p: Record<string, unknown>) => ({
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

  // Get the filter type (default to 'all')
  const filterType = filters.type || 'all';

  return <ProjectList projects={projects} filterType={filterType} />;
}

function ProjectListSkeleton() {
  const CardSkeleton = () => (
    <div className="surface flex flex-col gap-2 rounded-lg p-3">
      <div className="flex items-center gap-3">
        <div className="h-7 w-7 animate-pulse rounded-md bg-muted" />
        <div className="h-4 flex-1 animate-pulse rounded bg-muted" />
        <div className="h-1 w-12 animate-pulse rounded-full bg-muted" />
        <div className="h-3 w-7 animate-pulse rounded bg-muted" />
      </div>
      <div className="flex items-center gap-3 pl-9">
        <div className="h-3 w-24 animate-pulse rounded bg-muted" />
        <div className="h-3 w-16 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Stats skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <div className="h-7 w-8 animate-pulse rounded bg-muted" />
            <div className="h-4 w-16 animate-pulse rounded bg-muted" />
          </div>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-4">
            <div className="h-4 w-8 animate-pulse rounded bg-muted" />
            <div className="h-4 w-8 animate-pulse rounded bg-muted" />
            <div className="h-4 w-8 animate-pulse rounded bg-muted" />
            <div className="h-4 w-8 animate-pulse rounded bg-muted" />
          </div>
        </div>
        <div className="flex items-center gap-0.5 rounded-lg bg-secondary p-0.5">
          <div className="h-8 w-8 animate-pulse rounded bg-muted" />
          <div className="h-8 w-8 animate-pulse rounded bg-muted" />
        </div>
      </div>
      {/* Grid skeleton */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(9)].map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<FilterParams>;
}) {
  const filters = await searchParams;

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Folder className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-foreground">Projects</h1>
            <p className="text-xs text-muted-foreground">Track progress and manage deliverables</p>
          </div>
        </div>
        <NewProjectModal />
      </header>

      {/* Type Tabs */}
      <div className="border-b border-border px-6 py-2.5">
        <ProjectTypeTabs currentType={filters.type} />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <Suspense fallback={<ProjectListSkeleton />}>
          <ProjectListLoader filters={filters} />
        </Suspense>
      </div>
    </div>
  );
}
