import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId, getCurrentUserProfile } from '@/app/actions';
import { getPortalAuthUser, getPortalProfile } from '@/lib/portal-cache';
import { NewProjectModal } from '@/components/new-project-modal';
import { Folder } from 'lucide-react';
import { ProjectsClient } from './projects-client';
import { PageHeader } from '@/components/page-header';
import type { ProjectType } from '@/types/database';

export interface ProjectTeamMember {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

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
  sort_order: number;
  team?: ProjectTeamMember[];
  has_github: boolean;
  is_assigned: boolean;
}

async function ProjectListLoader() {
  await connection();
  const supabase = await createClient();
  const [workspaceId, userProfile] = await Promise.all([
    getCurrentWorkspaceId(),
    getCurrentUserProfile(),
  ]);

  const { data: rawProjects, error } = await supabase.rpc('get_project_stats', {
    p_workspace_id: workspaceId,
  });

  if (error) {
    console.error('Error fetching projects:', error);
    return (
      <ProjectsClient
        demos={[]}
        building={[]}
        preProduction={[]}
        live={[]}
        done={[]}
        archived={[]}
      />
    );
  }

  // Fetch all active project assignments with employee profiles
  const { data: allAssignments } = await supabase
    .from('project_assignments')
    .select(
      'project_id, employee:profiles!project_assignments_employee_id_fkey (id, full_name, avatar_url)'
    )
    .eq('workspace_id', workspaceId)
    .is('removed_at', null);

  // Fetch GitHub integrations to identify linked projects
  const { data: githubIntegrations } = await supabase
    .from('project_integrations')
    .select('project_id')
    .eq('service_type', 'github');

  const githubProjectIds = new Set((githubIntegrations || []).map((i) => i.project_id));

  // Build a map of project_id -> team members
  const teamByProject = new Map<string, ProjectTeamMember[]>();
  for (const a of allAssignments || []) {
    const emp = Array.isArray(a.employee) ? a.employee[0] : a.employee;
    if (!emp?.id) continue;
    const existing = teamByProject.get(a.project_id) || [];
    existing.push({ id: emp.id, full_name: emp.full_name, avatar_url: emp.avatar_url });
    teamByProject.set(a.project_id, existing);
  }

  // Compute the current user's assigned project IDs so we can flag rows for the
  // "your projects" highlight in the UI. Admins see every project as assigned.
  const isAdmin = userProfile?.role === 'admin';
  const userAssignedIds = userProfile
    ? new Set(
        (allAssignments || [])
          .filter((a) => {
            const emp = Array.isArray(a.employee) ? a.employee[0] : a.employee;
            return emp?.id === userProfile.id;
          })
          .map((a) => a.project_id)
      )
    : new Set<string>();

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
    sort_order: (p.sort_order as number) || 0,
    team: teamByProject.get(p.id as string) || [],
    has_github: githubProjectIds.has(p.id as string),
    is_assigned: isAdmin ? true : userAssignedIds.has(p.id as string),
  }));

  // Employees see EVERY project but only assigned ones are clickable (UI-side gate).
  const visibleProjects = allProjects;

  const sortByOrder = (a: ProjectData, b: ProjectData) => a.sort_order - b.sort_order;

  // Pipeline stages (sorted by sort_order)
  const demos = visibleProjects.filter((p) => p.status === 'Demos').sort(sortByOrder);
  const activeDelayed = visibleProjects.filter((p) => ['Active', 'Delayed'].includes(p.status));
  const building = activeDelayed.filter((p) => !p.is_pre_production).sort(sortByOrder);
  const preProduction = activeDelayed.filter((p) => p.is_pre_production).sort(sortByOrder);
  const live = visibleProjects.filter((p) => p.status === 'Launched').sort(sortByOrder);
  // Done: show all Done projects to everyone (admins + employees). Employees get read-only view.
  const done = allProjects.filter((p) => p.status === 'Done').sort(sortByOrder);
  const archived = visibleProjects
    .filter((p) => ['Archived', 'Canceled'].includes(p.status))
    .sort(sortByOrder);

  return (
    <ProjectsClient
      demos={demos}
      building={building}
      preProduction={preProduction}
      live={live}
      done={done}
      archived={archived}
    />
  );
}

function ProjectsSkeleton() {
  return (
    <div className="flex h-full w-full flex-col gap-5 overflow-hidden p-5 md:p-6">
      {/* Stats strip skeleton */}
      <div className="flex shrink-0 items-center gap-2">
        {[80, 72, 64, 56].map((w, i) => (
          <div
            key={i}
            className="h-8 animate-pulse rounded-lg bg-muted"
            style={{ width: `${w}px` }}
          />
        ))}
      </div>

      {/* Four-column pipeline skeleton */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 lg:grid-cols-4">
        {[
          'border-violet-500/20',
          'border-emerald-500/20',
          'border-amber-500/20',
          'border-sky-500/20',
        ].map((borderColor, col) => (
          <div
            key={col}
            className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card"
          >
            <div
              className={`flex items-center gap-2.5 border-b ${borderColor} bg-muted/20 px-4 py-3`}
            >
              <div className="h-8 w-8 animate-pulse rounded-lg bg-muted" />
              <div className="h-4 w-20 animate-pulse rounded bg-muted" />
              <div className="ml-auto h-6 w-6 animate-pulse rounded-full bg-muted" />
            </div>
            <div className="flex-1 space-y-2 p-3">
              {[1, 2, 3].map((row) => (
                <div
                  key={row}
                  className="flex items-start gap-3 rounded-lg border border-border bg-card/40 px-3.5 py-2.5"
                >
                  <div className="h-8 w-8 shrink-0 animate-pulse rounded-lg bg-muted" />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="h-3.5 w-3/4 animate-pulse rounded bg-muted" />
                    <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function ProjectsPage() {
  const user = await getPortalAuthUser();
  if (!user) redirect('/auth/login');
  const profile = await getPortalProfile(user.id);
  if (profile?.role === 'client') redirect('/');

  const canCreate = profile?.role === 'admin';

  return (
    <div className="flex h-full flex-col bg-background">
      <PageHeader
        icon={<Folder className="h-3.5 w-3.5 text-primary" />}
        iconBg="bg-primary/10"
        title="Projects"
      >
        {canCreate && <NewProjectModal />}
      </PageHeader>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <Suspense fallback={<ProjectsSkeleton />}>
          <ProjectListLoader />
        </Suspense>
      </div>
    </div>
  );
}
