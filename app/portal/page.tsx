import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { isPortalAdminRole } from '@/lib/portal-utils';
import { PortalDashboardContent } from './portal-dashboard-content';
import { PortalHub } from '@/components/portal/portal-hub';
import { getPortalHubData } from '@/app/actions/client-portal';
import type { PortalHubClient } from '@/app/actions/client-portal';

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

  // Admin/Employee: show portal hub with all CRM clients
  if (isPortalAdminRole(userRole) || userRole === 'employee') {
    const [hubResult, projectsResult] = await Promise.all([
      getPortalHubData(),
      supabase
        .from('projects')
        .select('id, name, status, project_type')
        .not('status', 'eq', 'Canceled')
        .order('name'),
    ]);

    const hubClients = hubResult.success
      ? (hubResult.data as { clients: PortalHubClient[] }).clients
      : [];

    const allProjects = (projectsResult.data || []).map((p) => ({
      id: p.id,
      name: p.name,
      status: p.status,
      project_type: p.project_type,
    }));

    return <PortalHub clients={hubClients} allProjects={allProjects} />;
  }

  // Client: fetch company name for personalization
  let companyName: string | null = null;
  const { data: companyMapping } = await supabase
    .from('portal_project_mappings')
    .select('erp_company_name')
    .eq('portal_client_id', user.id)
    .not('erp_company_name', 'is', null)
    .limit(1)
    .maybeSingle();
  companyName = companyMapping?.erp_company_name || null;

  // Client: show their dashboard
  return (
    <PortalDashboardContent
      clientId={user.id}
      displayName={displayName}
      companyName={companyName}
    />
  );
}
