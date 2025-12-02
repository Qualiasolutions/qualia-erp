import { Suspense } from 'react';
import { connection } from 'next/server';
import { ProjectList, Project } from '@/components/project-list';
import { createClient } from '@/lib/supabase/server';
import { NewProjectModal } from '@/components/new-project-modal';
import { getCurrentWorkspaceId } from '@/app/actions';
import { ProjectGroupTabs } from '@/components/project-group-tabs';
import { Folder } from 'lucide-react';

export type ProjectGroup =
  | 'salman_kuwait'
  | 'tasos_kyriakides'
  | 'inactive'
  | 'active'
  | 'demos'
  | 'other';

interface FilterParams {
  group?: ProjectGroup;
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
  let projects: Project[] = (rawProjects || []).map((p: Record<string, unknown>) => ({
    id: p.id,
    name: p.name,
    status: p.status,
    target_date: p.target_date,
    project_group: p.project_group,
    lead: p.lead_id
      ? {
          id: p.lead_id,
          full_name: p.lead_full_name,
          email: p.lead_email,
        }
      : null,
    issue_stats: {
      total: Number(p.total_issues),
      done: Number(p.done_issues),
    },
    roadmap_progress: p.roadmap_progress || 0,
  }));

  // Filter by project group (default to 'active')
  const group = filters.group || 'active';

  if (group === 'active') {
    // 'active' shows all active projects including salman, tasos, other subgroups
    projects = projects.filter(
      (p) =>
        p.project_group === 'active' ||
        p.project_group === 'salman_kuwait' ||
        p.project_group === 'tasos_kyriakides' ||
        p.project_group === 'other'
    );
  } else {
    projects = projects.filter((p) => p.project_group === group);
  }

  return <ProjectList projects={projects} />;
}

function ProjectListSkeleton() {
  const CardSkeleton = () => (
    <div className="surface flex items-center gap-3 rounded-lg px-3 py-2.5">
      <div className="h-7 w-7 animate-pulse rounded-md bg-muted" />
      <div className="h-4 flex-1 animate-pulse rounded bg-muted" />
      <div className="h-1 w-16 animate-pulse rounded-full bg-muted" />
      <div className="h-3 w-8 animate-pulse rounded bg-muted" />
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
            <div className="h-4 w-16 animate-pulse rounded bg-muted" />
            <div className="h-4 w-16 animate-pulse rounded bg-muted" />
            <div className="h-4 w-14 animate-pulse rounded bg-muted" />
          </div>
        </div>
        <div className="flex items-center gap-0.5 rounded-lg bg-secondary p-0.5">
          <div className="h-8 w-8 animate-pulse rounded bg-muted" />
          <div className="h-8 w-8 animate-pulse rounded bg-muted" />
        </div>
      </div>
      {/* Columns skeleton */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Active column */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <div className="h-2 w-2 rounded-full bg-violet-500" />
            <div className="h-4 w-12 animate-pulse rounded bg-muted" />
          </div>
          <div className="space-y-1.5">
            {[...Array(4)].map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        </div>
        {/* Salman column */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <div className="h-2 w-2 rounded-full bg-amber-500" />
            <div className="h-4 w-14 animate-pulse rounded bg-muted" />
          </div>
          <div className="space-y-1.5">
            {[...Array(5)].map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        </div>
        {/* Tasos column */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <div className="h-2 w-2 rounded-full bg-blue-500" />
            <div className="h-4 w-12 animate-pulse rounded bg-muted" />
          </div>
          <div className="space-y-1.5">
            {[...Array(4)].map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        </div>
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
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border bg-card px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-violet-500/10 p-2">
            <Folder className="h-4 w-4 text-violet-500" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-foreground">Projects</h1>
            <p className="text-xs text-muted-foreground">Manage your projects and track progress</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <NewProjectModal />
        </div>
      </header>

      {/* Group Tabs */}
      <div className="border-b border-border bg-background px-6 py-3">
        <ProjectGroupTabs currentGroup={filters.group} />
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
