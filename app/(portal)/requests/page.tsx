import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getClientFeatureRequests } from '@/app/actions/client-requests';
import { isUserManagerOrAbove } from '@/app/actions/shared';
import { assertAppEnabledForClient } from '@/lib/portal-utils';
import { getPortalAuthUser, getPortalProfile } from '@/lib/portal-cache';
import { PortalRequestList } from '@/components/portal/portal-request-list';
import { PortalRequestDialog } from '@/components/portal/portal-request-dialog';
import { Lightbulb } from 'lucide-react';

export const metadata: Metadata = { title: 'Requests' };

export default async function PortalRequestsPage() {
  const user = await getPortalAuthUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Employees don't submit/view feature requests — redirect
  const profile = await getPortalProfile(user.id);

  if (profile?.role === 'employee') {
    redirect('/');
  }

  // App Library guard: block clients if the "requests" app is disabled
  if (profile?.role === 'client') {
    const allowed = await assertAppEnabledForClient(user.id, 'requests', profile.role);
    if (!allowed) redirect('/');
  }

  // Parallelize the admin check + feature requests fetch (independent)
  const [isAdmin, requestsResult] = await Promise.all([
    isUserManagerOrAbove(user.id),
    getClientFeatureRequests(),
  ]);

  // Get project dropdown: admins see all active projects, clients see their linked projects
  const supabase = await createClient();
  let projectsData: { id: string; name: string }[] = [];
  if (isAdmin) {
    const { data } = await supabase
      .from('projects')
      .select('id, name')
      .not('status', 'eq', 'Canceled')
      .order('name');
    projectsData = (data || []).map((p) => ({ id: p.id, name: p.name }));
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
    <div className="space-y-6 p-6 lg:p-8">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Lightbulb className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Requests</h1>
            <p className="text-sm text-muted-foreground">Track your feature requests and changes</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <PortalRequestDialog projects={projects} />
        </div>
      </div>

      <PortalRequestList
        requests={requests}
        currentUserId={user.id}
        userRole={isAdmin ? 'admin' : profile?.role || 'client'}
      />
    </div>
  );
}
