import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { isPortalAdminRole } from '@/lib/portal-utils';
import {
  getPortalAuthUser,
  getPortalProfile,
  getViewAsCookieId,
  getClientPrimaryLogo,
  getWorkspaceClientLogo,
} from '@/lib/portal-cache';
import { PortalDashboardContent } from './portal-dashboard-content';
import { getClientWorkspaces } from '@/app/actions/portal-workspaces';
import type { ClientWorkspace } from '@/app/actions/portal-workspaces';
import { EmployeeDashboardContent } from './employee-dashboard-content';
import { AdminDashboardContent } from './admin-dashboard-content';
import { getCurrentWorkspaceId } from '@/app/actions/workspace';

export default async function PortalDashboard({
  searchParams,
}: {
  searchParams: Promise<{ workspace?: string; wname?: string }>;
}) {
  // H10 (OPTIMIZE.md): page used to re-run auth + profile + viewAs lookups
  // that the layout had already done, then chain clients → client_contacts →
  // profiles to resolve the portal user. With lib/portal-cache helpers the
  // first three are free cache hits, and the client/contact/profile chain
  // is collapsed into a single JOIN via select('contacts:client_contacts(...)').
  const { workspace: workspaceId } = await searchParams;

  const user = await getPortalAuthUser();
  if (!user) {
    redirect('/auth/login');
  }

  // These are free cache hits if the layout already ran this render pass.
  const [viewAsCookieId, profile] = await Promise.all([
    getViewAsCookieId(),
    getPortalProfile(user.id),
  ]);

  const realRole = profile?.role || null;

  let effectiveUserId = user.id;
  let effectiveRole = realRole;
  let effectiveDisplayName = profile?.full_name || user.email?.split('@')[0] || 'there';

  if (viewAsCookieId && realRole === 'admin') {
    const viewAsProfile = await getPortalProfile(viewAsCookieId);
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
      const [result, currentWorkspaceId] = await Promise.all([
        getClientWorkspaces(),
        getCurrentWorkspaceId(),
      ]);
      const workspaces = (result.success ? result.data : []) as ClientWorkspace[];

      return (
        <AdminDashboardContent
          workspaces={workspaces}
          displayName={displayName}
          workspaceId={currentWorkspaceId}
        />
      );
    }

    // Workspace selected: resolve client + primary contact email in ONE query
    // via a JOIN on client_contacts, eliminating the 3-step chain
    // (clients → client_contacts → profiles). The portal profile lookup that
    // follows is still needed because client_contacts only stores email.
    const supabase = await createClient();
    const { data: client } = await supabase
      .from('clients')
      .select('name, contacts:client_contacts!inner(email, is_primary)')
      .eq('id', workspaceId)
      .eq('contacts.is_primary', true)
      .maybeSingle();

    if (!client) {
      // Invalid workspace ID, or workspace has no primary contact yet.
      // Fall back to a plain clients lookup so admins can still see the shell
      // for clients that are mid-setup.
      const { data: rawClient } = await supabase
        .from('clients')
        .select('name')
        .eq('id', workspaceId)
        .maybeSingle();
      if (!rawClient) {
        redirect('/');
      }
      const logoUrl = await getWorkspaceClientLogo(workspaceId);
      return (
        <PortalDashboardContent
          clientId={workspaceId}
          displayName={displayName}
          companyName={rawClient.name}
          logoUrl={logoUrl}
          showWelcomeTour={false}
        />
      );
    }

    // Normalize the FK — Supabase returns contacts as an array.
    const contacts = Array.isArray(client.contacts) ? client.contacts : [client.contacts];
    const contactEmail = contacts[0]?.email?.trim().toLowerCase() || null;

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

    const clientId = portalUserId || workspaceId;
    const companyName = client?.name || null;
    const logoUrl = await getWorkspaceClientLogo(workspaceId);

    return (
      <PortalDashboardContent
        clientId={clientId}
        displayName={displayName}
        companyName={companyName}
        logoUrl={logoUrl}
        showWelcomeTour={false}
      />
    );
  }

  // Employee flow: show their assigned projects dashboard
  if (effectiveRole === 'employee') {
    return <EmployeeDashboardContent userId={effectiveUserId} displayName={displayName} />;
  }

  // Client: use the profile's full_name as the company/brand name.
  // Previously pulled from CRM `clients.name` via portal_project_mappings, but
  // that field often stores a contact person ("Mr. Morees Abawi") or stale
  // legal entity ("Alecci Media") that doesn't match the user's actual brand.
  // profiles.full_name is the curated, user-facing display name.
  const companyName = displayName;
  const logoUrl = await getClientPrimaryLogo(effectiveUserId);

  // Client: show their dashboard. Welcome tour is gated to the real user
  // (not admin impersonating), so it only triggers for actual clients on
  // their first login in a given browser.
  return (
    <PortalDashboardContent
      clientId={effectiveUserId}
      displayName={displayName}
      companyName={companyName}
      logoUrl={logoUrl}
      showWelcomeTour={realRole === 'client'}
    />
  );
}
