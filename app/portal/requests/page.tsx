import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getClientFeatureRequests } from '@/app/actions/client-requests';
import { getClientProjects } from '@/app/actions/client-portal';
import { getUserRole, isPortalAdminRole } from '@/lib/portal-utils';
import { PortalRequestDialog } from '@/components/portal/portal-request-dialog';
import { PortalRequestList } from '@/components/portal/portal-request-list';
import { fadeInClasses } from '@/lib/transitions';

export default async function PortalRequestsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const userRole = await getUserRole(user.id);
  const isAdmin = isPortalAdminRole(userRole);

  // Get feature requests
  const requestsResult = await getClientFeatureRequests();
  const requests = (requestsResult.success ? requestsResult.data : []) as Array<{
    id: string;
    title: string;
    description: string | null;
    priority: string;
    status: string;
    admin_response: string | null;
    created_at: string;
    project: { id: string; name: string } | null;
  }>;

  // Get projects for the form dropdown (clients: their projects, admins: all)
  let projects: Array<{ id: string; name: string }> = [];
  if (isAdmin) {
    const { data } = await supabase
      .from('projects')
      .select('id, name')
      .not('status', 'eq', 'Canceled')
      .order('name');
    projects = data || [];
  } else {
    const projectsResult = await getClientProjects(user.id);
    if (projectsResult.success) {
      projects = (
        (projectsResult.data || []) as Array<{
          project: { id: string; name: string } | Array<{ id: string; name: string }>;
        }>
      )
        .map((cp) => {
          const p = Array.isArray(cp.project) ? cp.project[0] : cp.project;
          return p ? { id: p.id, name: p.name } : null;
        })
        .filter((p): p is { id: string; name: string } => p !== null);
    }
  }

  return (
    <div className={`space-y-6 ${fadeInClasses}`}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[clamp(1.25rem,3vw,1.5rem)] font-bold tracking-tight text-foreground">
            Requests
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Submit and track your feature requests and changes
          </p>
        </div>
        {!isAdmin && <PortalRequestDialog projects={projects} />}
      </div>

      <PortalRequestList requests={requests} />
    </div>
  );
}
