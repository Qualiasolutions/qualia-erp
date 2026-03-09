import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { isPortalAdminRole } from '@/lib/portal-utils';
import { PortalDashboardContent } from './portal-dashboard-content';
import { PortalProjectsList } from '@/components/portal/portal-projects-list';
import { calculateProjectsProgress } from '@/app/actions/phases';
import { PortalAdminPanel } from '@/components/portal/portal-admin-panel';
import { getPortalAdminData } from '@/app/actions/client-portal';

export default async function PortalDashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single();

  const userRole = profile?.role || null;
  const displayName = profile?.full_name || user.email?.split('@')[0] || 'there';

  // Admin/Manager: show project picker + admin panel
  if (isPortalAdminRole(userRole)) {
    const { data: allProjects } = await supabase
      .from('projects')
      .select('id, name, description, project_type, status, start_date, end_date')
      .not('status', 'eq', 'Canceled')
      .order('name');

    const projectIds = (allProjects || []).map((p) => p.id);
    const progressMap = await calculateProjectsProgress(projectIds);

    const formatted = (allProjects || []).map((p) => ({
      id: p.id,
      project_id: p.id,
      access_level: 'admin' as string | null,
      invited_at: null as string | null,
      project: {
        id: p.id,
        name: p.name,
        description: p.description,
        project_type: p.project_type || 'web_design',
        project_status: p.status || 'Active',
        start_date: p.start_date,
        end_date: p.end_date,
      },
    }));

    // Also load admin data for client management
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
            client: { id: string; full_name: string | null; email: string | null } | null;
            project: {
              id: string;
              name: string;
              status: string | null;
              project_type: string | null;
            } | null;
          }>;
        })
      : null;

    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Client Portal Management</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Add clients to existing projects and manage their access.
          </p>
        </div>

        {/* Admin panel for managing clients */}
        {adminData && (
          <PortalAdminPanel
            projects={(allProjects || []).map((p) => ({
              id: p.id,
              name: p.name,
              status: p.status,
              project_type: p.project_type,
            }))}
            clients={adminData.clients}
            assignments={adminData.assignments}
          />
        )}

        {/* Project preview — browse as client would see it */}
        <div>
          <h2 className="mb-4 text-lg font-semibold text-foreground">
            Preview Projects (as client sees them)
          </h2>
          <PortalProjectsList projects={formatted} progressMap={progressMap} />
        </div>
      </div>
    );
  }

  // Client: show their dashboard
  return <PortalDashboardContent clientId={user.id} displayName={displayName} />;
}
