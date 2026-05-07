import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getClientFeatureRequests } from '@/app/actions/client-requests';
import { isUserAdmin } from '@/app/actions/shared';
import { assertAppEnabledForClient } from '@/lib/portal-utils';
import { getPortalAuthUser, getPortalProfile } from '@/lib/portal-cache';
import { PortalRequestList } from '@/components/portal/portal-request-list';
import { PortalRequestDialog } from '@/components/portal/portal-request-dialog';

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
    if (!allowed) redirect('/');
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
  }>;

  const projects = projectsData;

  return (
    <div className="animate-fade-in-up space-y-6 px-[clamp(1.5rem,4vw,2.5rem)] pb-[clamp(1.5rem,3vw,2.5rem)] pt-16 md:pt-[clamp(1.5rem,3vw,2.5rem)]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Requests</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isEmployee
              ? 'Client requests on your assigned projects'
              : 'Track your feature requests and changes'}
          </p>
        </div>
        {!isEmployee && <PortalRequestDialog projects={projects} />}
      </div>

      <PortalRequestList
        requests={requests}
        currentUserId={user.id}
        userRole={isAdmin ? 'admin' : profile?.role || 'client'}
      />
    </div>
  );
}
