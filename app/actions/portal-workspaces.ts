'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import type { ActionResult } from './shared';
import { isUserManagerOrAbove } from './shared';

export interface ClientWorkspace {
  id: string;
  name: string;
  email: string | null;
  projectCount: number;
  projects: Array<{
    id: string;
    name: string;
    status: string | null;
    project_type: string | null;
  }>;
  portalUserId: string | null;
  lastActivity: string | null;
}

/**
 * Get all CRM clients that have at least one project, formatted as workspace cards.
 * Used by the admin workspace grid on /portal.
 */
export async function getClientWorkspaces(): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    if (!(await isUserManagerOrAbove(user.id))) {
      return { success: false, error: 'Admin access required' };
    }

    // Fetch all needed data in parallel
    const [clientsResult, contactsResult, projectsResult, portalProfilesResult, assignmentsResult] =
      await Promise.all([
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

    if (clientsResult.error) {
      return { success: false, error: clientsResult.error.message };
    }

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
    for (const a of assignmentsResult.data ?? []) {
      const existing = portalAssignments.get(a.client_id) ?? new Set();
      existing.add(a.project_id);
      portalAssignments.set(a.client_id, existing);
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

    // Try to get last sign-in data (optional — fails gracefully)
    // Paginate to handle >1000 users
    const signInMap = new Map<string, string | null>();
    try {
      const adminClient = createAdminClient();
      let page = 1;
      let hasMore = true;
      while (hasMore) {
        const { data: authUsersResult } = await adminClient.auth.admin.listUsers({
          perPage: 1000,
          page,
        });
        const users = authUsersResult?.users ?? [];
        for (const authUser of users) {
          const email = authUser.email?.toLowerCase();
          if (email) {
            signInMap.set(email, authUser.last_sign_in_at ?? null);
          }
        }
        hasMore = users.length === 1000;
        page++;
      }
    } catch {
      // No service role key — skip last sign-in data
    }

    // Build workspace cards — only include clients with projects
    const workspaces: ClientWorkspace[] = [];

    for (const client of clientsResult.data ?? []) {
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

      // Only include clients that have projects
      if (projects.length === 0) continue;

      const lastActivity = firstEmail ? (signInMap.get(firstEmail) ?? null) : null;

      workspaces.push({
        id: client.id,
        name: client.name,
        email: firstEmail,
        projectCount: projects.length,
        projects,
        portalUserId,
        lastActivity,
      });
    }

    return { success: true, data: workspaces };
  } catch (error) {
    console.error('[getClientWorkspaces] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load workspaces',
    };
  }
}
