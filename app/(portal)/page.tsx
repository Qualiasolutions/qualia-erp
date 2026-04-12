import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { isPortalAdminRole } from '@/lib/portal-utils';
import { PortalDashboardContent } from './portal-dashboard-content';
import { getClientWorkspaces } from '@/app/actions/portal-workspaces';
import type { ClientWorkspace } from '@/app/actions/portal-workspaces';
import { EmployeeDashboardContent } from './employee-dashboard-content';
import { AdminDashboardContent } from './admin-dashboard-content';

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

  const realRole = profile?.role || null;

  // --- View-as impersonation: resolve effective user ---
  const cookieStore = await cookies();
  const viewAsUserId = cookieStore.get('view-as-user-id')?.value;

  let effectiveUserId = user.id;
  let effectiveRole = realRole;
  let effectiveDisplayName = profile?.full_name || user.email?.split('@')[0] || 'there';

  if (viewAsUserId && realRole === 'admin') {
    const { data: viewAsProfile } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .eq('id', viewAsUserId)
      .single();

    if (viewAsProfile) {
      effectiveUserId = viewAsProfile.id;
      effectiveRole = viewAsProfile.role || 'client';
      effectiveDisplayName = viewAsProfile.full_name || 'there';
    }
  }

  const displayName = effectiveDisplayName;

  // Admin/Manager flow (use effective role so view-as routes correctly)
  if (isPortalAdminRole(effectiveRole)) {
    // No workspace selected -> show admin dashboard with workspace grid
    if (!workspaceId) {
      const result = await getClientWorkspaces();
      const workspaces = (result.success ? result.data : []) as ClientWorkspace[];

      return <AdminDashboardContent workspaces={workspaces} displayName={displayName} />;
    }

    // Workspace selected -> validate client exists before proceeding (IDOR protection)
    const { data: client } = await supabase
      .from('clients')
      .select('name')
      .eq('id', workspaceId)
      .single();

    if (!client) {
      // Invalid workspace ID — redirect to workspace grid
      redirect('/');
    }

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
  if (effectiveRole === 'employee') {
    return <EmployeeDashboardContent userId={effectiveUserId} displayName={displayName} />;
  }

  // Client: fetch company name for personalization
  let companyName: string | null = null;
  const { data: companyMapping } = await supabase
    .from('portal_project_mappings')
    .select('erp_company_name')
    .eq('portal_client_id', effectiveUserId)
    .not('erp_company_name', 'is', null)
    .limit(1)
    .maybeSingle();
  companyName = companyMapping?.erp_company_name || null;

  // Client: show their dashboard
  return (
    <PortalDashboardContent
      clientId={effectiveUserId}
      displayName={displayName}
      companyName={companyName}
    />
  );
}
