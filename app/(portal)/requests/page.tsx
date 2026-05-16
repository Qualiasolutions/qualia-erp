import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getClientFeatureRequests } from '@/app/actions/client-requests';
import { getRequestCommentCounts } from '@/app/actions/request-comments';
import { getTeamMembers } from '@/app/actions/admin';
import { isUserAdmin } from '@/app/actions/shared';
import { assertAppEnabledForClient } from '@/lib/portal-utils';
import { getPortalAuthUser, getPortalProfile } from '@/lib/portal-cache';
import dynamic from 'next/dynamic';
import { PortalRequestDialog } from '@/components/portal/portal-request-dialog';

const AdminRequestsBoard = dynamic(
  () =>
    import('@/components/portal/admin-requests-board').then((m) => ({
      default: m.AdminRequestsBoard,
    })),
  {
    loading: () => (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        Loading board&hellip;
      </div>
    ),
  }
);

export const metadata: Metadata = { title: 'Requests' };

export default async function PortalRequestsPage() {
  const user = await getPortalAuthUser();

  if (!user) {
    redirect('/auth/login');
  }

  const profile = await getPortalProfile(user.id);

  // App Library guard: block clients if the "requests" app is disabled
  if (profile?.role === 'client') {
    const allowed = await assertAppEnabledForClient(user.id, 'requests', profile.role);
    if (!allowed) redirect('/dashboard');
  }

  // Parallelize the admin check + feature requests fetch (independent)
  const [isAdmin, requestsResult] = await Promise.all([
    isUserAdmin(user.id),
    getClientFeatureRequests(),
  ]);

  const isEmployee = profile?.role === 'employee';

  // Get project dropdown: admins see all active projects; clients see their linked projects;
  // employees see assigned projects (read-only on requests).
  const supabase = await createClient();
  let projectsData: { id: string; name: string }[] = [];
  if (isAdmin) {
    const { data } = await supabase
      .from('projects')
      .select('id, name')
      .not('status', 'eq', 'Canceled')
      .order('name');
    projectsData = (data || []).map((p) => ({ id: p.id, name: p.name }));
  } else if (isEmployee) {
    const { data } = await supabase
      .from('project_assignments')
      .select('project:projects!project_assignments_project_id_fkey(id, name)')
      .eq('employee_id', user.id)
      .is('removed_at', null);
    projectsData = (data ?? [])
      .map((row) => {
        const p = Array.isArray(row.project) ? row.project[0] : row.project;
        return p ? { id: p.id, name: p.name } : null;
      })
      .filter((p): p is { id: string; name: string } => p !== null);
  } else {
    const { data } = await supabase
      .from('client_projects')
      .select('project:projects!client_projects_project_id_fkey(id, name)')
      .eq('client_id', user.id);
    projectsData = (data ?? [])
      .map((row) => {
        const p = Array.isArray(row.project) ? row.project[0] : row.project;
        return p ? { id: p.id, name: p.name } : null;
      })
      .filter((p): p is { id: string; name: string } => p !== null);
  }

  const requests = (requestsResult.success ? requestsResult.data : []) as Array<{
    id: string;
    title: string;
    description: string | null;
    priority: string;
    status: string;
    admin_response: string | null;
    created_at: string;
    attachments?: Array<{
      name: string;
      path: string;
      size: number;
      type: string;
      uploaded_at: string;
    }> | null;
    project: { id: string; name: string } | null;
    assigned_to: string | null;
    assignee: { id: string; full_name: string | null; avatar_url: string | null } | null;
  }>;

  const projects = projectsData;
  const isStaff = isAdmin || isEmployee;

  // Comment counts surface as a chip on each kanban card for every role.
  const commentCounts =
    requests.length > 0 ? await getRequestCommentCounts(requests.map((r) => r.id)) : {};

  // Team members feed the assignee picker (Sheet) + filter (toolbar). Admin-only
  // server action — employees see assignment via the joined `assignee` field on
  // each request and don't get the dropdown.
  let staffOptions: Array<{ id: string; full_name: string | null; avatar_url: string | null }> = [];
  if (isAdmin) {
    const teamResult = await getTeamMembers();
    if (teamResult.success && Array.isArray(teamResult.data)) {
      staffOptions = (
        teamResult.data as Array<{
          id: string;
          full_name: string | null;
          avatar_url: string | null;
        }>
      ).map((m) => ({ id: m.id, full_name: m.full_name, avatar_url: m.avatar_url }));
    }
  }

  return (
    <div className="flex h-full animate-fade-in-up flex-col px-[clamp(0.75rem,2vw,1.5rem)] pb-[clamp(1rem,2vw,1.5rem)] pt-14 md:pt-[clamp(1.25rem,2vw,1.75rem)]">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            <span className="inline-block h-px w-5 bg-primary/60" aria-hidden />
            <span>{isStaff ? 'Triage queue' : 'My requests'}</span>
          </div>
          <h1 className="mt-1.5 text-[clamp(1.25rem,0.9rem+1.2vw,1.75rem)] font-semibold leading-tight tracking-tight text-foreground">
            Requests
          </h1>
          <p className="mt-1 hidden max-w-[560px] text-xs text-muted-foreground sm:block">
            {isAdmin
              ? `${requests.length} request${requests.length === 1 ? '' : 's'} across all clients — drag between columns to move through the pipeline.`
              : isEmployee
                ? 'Client requests on your assigned projects — drag between columns to move through the pipeline.'
                : 'Ideas, changes, and questions — every thread you’ve opened with us, grouped by stage.'}
          </p>
        </div>
        {!isEmployee && <PortalRequestDialog projects={projects} />}
      </header>

      <AdminRequestsBoard
        requests={requests}
        commentCounts={commentCounts}
        currentUserId={user.id}
        userRole={isAdmin ? 'admin' : isEmployee ? 'employee' : 'client'}
        staffOptions={staffOptions}
      />
    </div>
  );
}
