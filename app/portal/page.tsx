import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getClientProjects, getPortalAdminData } from '@/app/actions/client-portal';
import { calculateProjectsProgress } from '@/app/actions/phases';
import { getUserRole } from '@/lib/portal-utils';
import { PortalProjectsList } from '@/components/portal/portal-projects-list';
import { PortalAdminPanel } from '@/components/portal/portal-admin-panel';

export default async function PortalPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const userRole = await getUserRole(user.id);
  const isAdmin = userRole === 'admin';

  // Admin view: management panel + project preview
  if (isAdmin) {
    // Get all projects for the management panel
    const { data: allProjects } = await supabase
      .from('projects')
      .select('id, name, status, project_type')
      .not('status', 'eq', 'Canceled')
      .order('name');

    // Get admin data (clients + assignments)
    const adminResult = await getPortalAdminData();
    const adminData = adminResult.success
      ? (adminResult.data as {
          clients: Array<{
            id: string;
            full_name: string | null;
            email: string | null;
            role: string;
            created_at: string;
          }>;
          assignments: Array<{
            id: string;
            client_id: string;
            project_id: string;
            access_level: string | null;
            invited_at: string | null;
            invited_by: string | null;
            client: { id: string; full_name: string | null; email: string | null } | null;
            project: {
              id: string;
              name: string;
              status: string | null;
              project_type: string | null;
            } | null;
          }>;
        })
      : { clients: [], assignments: [] };

    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Portal Management</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage client access, invite clients, and share project credentials
          </p>
        </div>

        <PortalAdminPanel
          projects={allProjects || []}
          clients={adminData.clients}
          assignments={adminData.assignments}
        />
      </div>
    );
  }

  // Client view: their assigned projects
  const result = await getClientProjects(user.id);
  if (!result.success) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-foreground">Error Loading Projects</h2>
          <p className="mt-2 text-sm text-muted-foreground">{result.error}</p>
        </div>
      </div>
    );
  }

  type ClientProjectRow = {
    id: string;
    project_id: string;
    access_level: string | null;
    invited_at: string | null;
    project:
      | {
          id: string;
          name: string;
          description: string | null;
          project_type: string;
          project_status: string;
          start_date: string | null;
          end_date: string | null;
        }
      | Array<{
          id: string;
          name: string;
          description: string | null;
          project_type: string;
          project_status: string;
          start_date: string | null;
          end_date: string | null;
        }>;
  };

  const projects = (result.data || []) as ClientProjectRow[];

  // Calculate real progress from phases
  const projectIds = projects
    .map((cp) => {
      const p = Array.isArray(cp.project) ? cp.project[0] : cp.project;
      return p?.id;
    })
    .filter((id): id is string => !!id);

  const progressMap = await calculateProjectsProgress(projectIds);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Your Projects</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          View the status and progress of your active projects
        </p>
      </div>

      <PortalProjectsList projects={projects} progressMap={progressMap} />
    </div>
  );
}
