import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { isPortalAdminRole } from '@/lib/portal-utils';
import { PortalDashboardContent } from './portal-dashboard-content';
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

  // Admin/Manager: show simplified client management
  if (isPortalAdminRole(userRole)) {
    const { data: allProjects } = await supabase
      .from('projects')
      .select('id, name, status, project_type')
      .not('status', 'eq', 'Canceled')
      .order('name');

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
      <div className="space-y-10">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Client Portal</h1>
          <p className="mt-1 text-[13px] text-muted-foreground/60">
            Manage client access to your projects
          </p>
        </div>

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
      </div>
    );
  }

  // Client: show their dashboard
  return <PortalDashboardContent clientId={user.id} displayName={displayName} />;
}
