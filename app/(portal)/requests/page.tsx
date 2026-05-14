import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getClientFeatureRequests } from '@/app/actions/client-requests';
import { getRequestCommentCounts } from '@/app/actions/request-comments';
import { getTeamMembers } from '@/app/actions/admin';
import { isUserAdmin } from '@/app/actions/shared';
import { assertAppEnabledForClient } from '@/lib/portal-utils';
import { getPortalAuthUser, getPortalProfile } from '@/lib/portal-cache';
import { PortalRequestList } from '@/components/portal/portal-request-list';
import { PortalRequestDialog } from '@/components/portal/portal-request-dialog';
import { AdminRequestsBoard } from '@/components/portal/admin-requests-board';

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

  // Comment counts are surfaced as a chip on each kanban card; the client list
  // fetches its own counts inline, so this is staff-only.
  const commentCounts =
    isStaff && requests.length > 0 ? await getRequestCommentCounts(requests.map((r) => r.id)) : {};

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
    <div
      className={
        isStaff
          ? 'flex h-full animate-fade-in-up flex-col px-[clamp(1rem,3vw,2rem)] pb-[clamp(1.5rem,3vw,2rem)] pt-16 md:pt-[clamp(2rem,3vw,2.5rem)]'
          : 'animate-fade-in-up px-[clamp(1.5rem,4vw,2.5rem)] pb-[clamp(2rem,4vw,3rem)] pt-16 md:pt-[clamp(2.5rem,4vw,3.5rem)]'
      }
    >
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
            <span className="inline-block h-px w-6 bg-primary/60" aria-hidden />
            <span>{isStaff ? 'Triage queue' : 'Conversations'}</span>
          </div>
          <h1 className="mt-3 text-[clamp(1.5rem,1rem+1.6vw,2rem)] font-semibold leading-tight tracking-tight text-foreground">
            Requests
          </h1>
          <p className="mt-1.5 max-w-[520px] text-sm text-muted-foreground">
            {isAdmin
              ? `${requests.length} request${requests.length === 1 ? '' : 's'} across all clients — drag a card between columns to move it through the pipeline.`
              : isEmployee
                ? 'Client requests on your assigned projects — drag a card between columns to move it through the pipeline.'
                : 'Ideas, changes, and questions — track every thread you’ve opened with us.'}
          </p>
        </div>
        {!isEmployee && <PortalRequestDialog projects={projects} />}
      </header>

      {isStaff ? (
        <AdminRequestsBoard
          requests={requests}
          commentCounts={commentCounts}
          currentUserId={user.id}
          userRole={isAdmin ? 'admin' : 'employee'}
          staffOptions={staffOptions}
        />
      ) : (
        <PortalRequestList
          requests={requests}
          currentUserId={user.id}
          userRole={profile?.role || 'client'}
        />
      )}
    </div>
  );
}
