import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { isPortalAdminRole } from '@/lib/portal-utils';
import { PortalDashboardContent } from './portal-dashboard-content';
import { PortalWorkspaceGrid } from '@/components/portal/portal-workspace-grid';
import { getClientWorkspaces } from '@/app/actions/portal-workspaces';
import type { ClientWorkspace } from '@/app/actions/portal-workspaces';
import { EmployeeDashboardContent } from './employee-dashboard-content';

export default async function PortalDashboard({
  searchParams,
}: {
  searchParams: Promise<{ workspace?: string; wname?: string }>;
}) {
  const params = await searchParams;
  const workspaceId = params.workspace;

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

  // Admin/Manager flow
  if (isPortalAdminRole(userRole)) {
    // No workspace selected -> show workspace grid
    if (!workspaceId) {
      const result = await getClientWorkspaces();
      const workspaces = (result.success ? result.data : []) as ClientWorkspace[];

      return <PortalWorkspaceGrid workspaces={workspaces} />;
    }

    // Workspace selected -> show that client's dashboard
    // Look up the CRM client name for display
    const { data: client } = await supabase
      .from('clients')
      .select('name')
      .eq('id', workspaceId)
      .single();

    // Find the portal user ID for this CRM client (via contact email -> profile)
    const { data: contact } = await supabase
      .from('client_contacts')
      .select('email')
      .eq('client_id', workspaceId)
      .eq('is_primary', true)
      .maybeSingle();

    const contactEmail = contact?.email?.trim().toLowerCase();
    let portalUserId: string | null = null;

    if (contactEmail) {
      const { data: portalProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', contactEmail)
        .eq('role', 'client')
        .maybeSingle();

      portalUserId = portalProfile?.id ?? null;
    }

    // If no portal user found, try to get projects via CRM client_id directly
    // and show an admin view of the dashboard
    const clientId = portalUserId || workspaceId;
    const companyName = client?.name || null;

    return (
      <PortalDashboardContent
        clientId={clientId}
        displayName={displayName}
        companyName={companyName}
      />
    );
  }

  // Employee flow: show their assigned projects dashboard
  if (userRole === 'employee') {
    return <EmployeeDashboardContent userId={user.id} displayName={displayName} />;
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
