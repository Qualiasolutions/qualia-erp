import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getClientFeatureRequests } from '@/app/actions/client-requests';
import { PortalRequestList } from '@/components/portal/portal-request-list';
import { PortalRequestDialog } from '@/components/portal/portal-request-dialog';
import { fadeInClasses } from '@/lib/transitions';

export default async function PortalRequestsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Get feature requests and client projects in parallel
  const [requestsResult, projectsResult] = await Promise.all([
    getClientFeatureRequests(),
    supabase
      .from('client_projects')
      .select('project:projects!client_projects_project_id_fkey(id, name)')
      .eq('client_id', user.id),
  ]);

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

  const projects = (projectsResult.data ?? [])
    .map((row) => {
      const p = Array.isArray(row.project) ? row.project[0] : row.project;
      return p ? { id: p.id, name: p.name } : null;
    })
    .filter((p): p is { id: string; name: string } => p !== null);

  return (
    <div className={`space-y-6 ${fadeInClasses}`}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[clamp(1.25rem,3vw,1.5rem)] font-bold tracking-tight text-foreground">
            Requests
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Track your feature requests and changes
          </p>
        </div>
        <PortalRequestDialog projects={projects} />
      </div>

      <PortalRequestList requests={requests} />
    </div>
  );
}
