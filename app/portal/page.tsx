import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { isPortalAdminRole } from '@/lib/portal-utils';
import { PortalDashboardContent } from './portal-dashboard-content';
import { PortalHub } from '@/components/portal/portal-hub';
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
    // Fetch all data directly in server component (has proper RLS/session context)
    const [crmClientsResult, projectsResult, portalProfilesResult] = await Promise.all([
      supabase.from('clients').select('id, name, contacts, lead_status').order('name'),
      supabase
        .from('projects')
        .select('id, name, status, project_type, client_id')
        .not('status', 'eq', 'Canceled')
        .order('name'),
      supabase.from('profiles').select('id, email, full_name').eq('role', 'client'),
    ]);

    // Build email -> portal profile map
    const emailToPortal = new Map<string, string>();
    for (const p of portalProfilesResult.data ?? []) {
      if (p.email) emailToPortal.set(p.email.toLowerCase(), p.id);
    }

    // Build client_id -> projects map
    const clientProjectsMap = new Map<
      string,
      Array<{ id: string; name: string; status: string | null; project_type: string | null }>
    >();
    for (const project of projectsResult.data ?? []) {
      if (!project.client_id) continue;
      const existing = clientProjectsMap.get(project.client_id) ?? [];
      existing.push({
        id: project.id,
        name: project.name,
        status: project.status,
        project_type: project.project_type,
      });
      clientProjectsMap.set(project.client_id, existing);
    }

    // Build hub clients
    const hubClients: PortalHubClient[] = (crmClientsResult.data ?? []).map((client) => {
      const contacts = client.contacts as Array<{ email?: string }> | null;
      const firstEmail = contacts?.[0]?.email?.trim().toLowerCase() || null;
      const portalUserId = firstEmail ? (emailToPortal.get(firstEmail) ?? null) : null;

      return {
        id: client.id,
        name: client.name,
        email: firstEmail,
        leadStatus: client.lead_status,
        projects: clientProjectsMap.get(client.id) ?? [],
        hasPortalAccess: !!portalUserId,
        portalUserId,
        lastSignIn: null, // Skip last sign-in for now (needs admin client)
      };
    });

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
