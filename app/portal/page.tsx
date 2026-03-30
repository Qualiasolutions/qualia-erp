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

  // Admin/Manager: show portal hub with all CRM clients
  if (isPortalAdminRole(userRole)) {
    // Fetch all data directly in server component (has proper RLS/session context)
    const [
      crmClientsResult,
      contactsResult,
      projectsResult,
      portalProfilesResult,
      assignmentsResult,
    ] = await Promise.all([
      supabase.from('clients').select('id, name, lead_status').order('name'),
      supabase.from('client_contacts').select('client_id, email, is_primary'),
      supabase
        .from('projects')
        .select('id, name, status, project_type, client_id')
        .not('status', 'eq', 'Canceled')
        .order('name'),
      supabase.from('profiles').select('id, email, full_name').eq('role', 'client'),
      supabase.from('client_projects').select('client_id, project_id'),
    ]);

    // Build client_id -> primary email map
    const clientEmailMap = new Map<string, string>();
    for (const contact of contactsResult.data ?? []) {
      if (!contact.email) continue;
      const email = contact.email.trim().toLowerCase();
      if (contact.is_primary || !clientEmailMap.has(contact.client_id)) {
        clientEmailMap.set(contact.client_id, email);
      }
    }

    // Build email -> portal profile map
    const emailToPortal = new Map<string, string>();
    for (const p of portalProfilesResult.data ?? []) {
      if (p.email) emailToPortal.set(p.email.toLowerCase(), p.id);
    }

    // Build portal user ID -> assigned project IDs
    const portalAssignments = new Map<string, Set<string>>();
    const allAssignedProjectIds: string[] = [];
    for (const a of assignmentsResult.data ?? []) {
      const existing = portalAssignments.get(a.client_id) ?? new Set();
      existing.add(a.project_id);
      portalAssignments.set(a.client_id, existing);
      allAssignedProjectIds.push(a.project_id);
    }

    // Build project ID -> project detail map
    const projectById = new Map<
      string,
      { id: string; name: string; status: string | null; project_type: string | null }
    >();
    for (const project of projectsResult.data ?? []) {
      projectById.set(project.id, {
        id: project.id,
        name: project.name,
        status: project.status,
        project_type: project.project_type,
      });
    }

    // Build client_id -> projects map (CRM FK)
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

    // Build hub clients — merge CRM projects + portal assignments
    const hubClients: PortalHubClient[] = (crmClientsResult.data ?? []).map((client) => {
      const firstEmail = clientEmailMap.get(client.id) ?? null;
      const portalUserId = firstEmail ? (emailToPortal.get(firstEmail) ?? null) : null;

      // Start with CRM-linked projects
      const projects = [...(clientProjectsMap.get(client.id) ?? [])];
      const projectIdSet = new Set(projects.map((p) => p.id));

      // Merge in portal-assigned projects
      if (portalUserId) {
        const assignedIds = portalAssignments.get(portalUserId);
        if (assignedIds) {
          for (const pid of assignedIds) {
            if (!projectIdSet.has(pid)) {
              const proj = projectById.get(pid);
              if (proj) {
                projects.push(proj);
                projectIdSet.add(pid);
              }
            }
          }
        }
      }

      return {
        id: client.id,
        name: client.name,
        email: firstEmail,
        leadStatus: client.lead_status,
        projects,
        hasPortalAccess: !!portalUserId,
        portalUserId,
        lastSignIn: null,
      };
    });

    const allProjects = (projectsResult.data || []).map((p) => ({
      id: p.id,
      name: p.name,
      status: p.status,
      project_type: p.project_type,
    }));

    return (
      <PortalHub
        clients={hubClients}
        allProjects={allProjects}
        assignedProjectIds={allAssignedProjectIds}
      />
    );
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
