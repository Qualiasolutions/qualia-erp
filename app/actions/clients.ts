'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

import { parseFormData, createClientSchema, updateClientSchema } from '@/lib/validation';
import { notifyClientCreated } from '@/lib/email';
import { getCurrentWorkspaceId } from './workspace';
import { canDeleteClient, isUserAdmin, type ActionResult, type ProfileRef } from './shared';

// ============ CLIENT/PROJECT LINKAGE NOTE ============
// Two columns/tables represent client↔project linkage and they mean different
// things. Code here treats them as DISTINCT and reconciles them via
// `getClientAccessDrift()`.
//
//   projects.client_id      → ownership: this project belongs to that client
//                             (CRM-side fact, drives invoicing + reports).
//   client_projects (table) → portal access: that client may LOG IN and view
//                             this project from /portal (auth-side fact).
//
// The two are intentionally decoupled (a project can be owned by Client A but
// shared with Client B's portal account, or owned with no portal access yet),
// but drift between them usually signals a bug. The drift detector below
// surfaces three error classes: ownership without portal access, portal
// access pointing at someone else's project, and access to non-active
// projects. Keep this comment in sync with the helper if you change either
// column's meaning.

// ============ LEGACY NAME HELPER ============

/**
 * clients.name is a legacy NOT NULL column. We keep it in lockstep with
 * display_name. Never expose `name` to callers — always derive it here.
 */
function clientNameFields(displayName: string): { name: string; display_name: string } {
  const trimmed = displayName.trim();
  return { name: trimmed, display_name: trimmed };
}

// ============ CLIENT TYPES ============

export type LeadStatus =
  | 'dropped'
  | 'cold'
  | 'hot'
  | 'active_client'
  | 'inactive_client'
  | 'dead_lead';

// For Supabase responses where FK can be array or single object
type FKResponse<T> = T | T[] | null;

// Client activity from Supabase response
type ClientActivityResponse = {
  id: string;
  type: string;
  description: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  created_by: FKResponse<ProfileRef>;
};

// ============ CLIENT ACTIONS ============

/**
 * Create a new client record
 */
export async function createClientRecord(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Validate input
  const validation = parseFormData(createClientSchema, formData);
  if (!validation.success) {
    return { success: false, error: validation.error };
  }

  const { display_name, phone, website, billing_address, lead_status, notes, workspace_id } =
    validation.data;

  // Get workspace ID from form or from user's default
  let wsId = workspace_id;
  if (!wsId) {
    wsId = await getCurrentWorkspaceId();
  }

  if (!wsId) {
    return { success: false, error: 'Workspace is required' };
  }

  const { data, error } = await supabase
    .from('clients')
    .insert({
      ...clientNameFields(display_name),
      phone: phone?.trim() || null,
      website: website?.trim() || null,
      billing_address: billing_address?.trim() || null,
      lead_status,
      notes: notes?.trim() || null,
      workspace_id: wsId,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating client:', error);
    return { success: false, error: error.message };
  }

  // Send email notification to other admins (fire and forget)
  notifyClientCreated(user.id, display_name.trim(), data.id, lead_status || undefined).catch(
    (err) => console.error('[createClientRecord] Failed to send email notification:', err)
  );

  revalidatePath('/clients');
  revalidatePath('/admin');
  return { success: true, data };
}

/**
 * Get all clients for a workspace
 */
export async function getClients(workspaceId?: string | null, leadStatus?: LeadStatus | null) {
  const supabase = await createClient();

  // Get workspace ID from parameter or user's default
  let wsId = workspaceId;
  if (!wsId) {
    wsId = await getCurrentWorkspaceId();
  }

  let query = supabase
    .from('clients')
    .select(
      `
            id,
            display_name,
            phone,
            website,
            billing_address,
            lead_status,
            notes,
            last_contacted_at,
            created_at,
            logo_url,
            creator:profiles!clients_created_by_fkey (id, full_name, email),
            assigned:profiles!clients_assigned_to_fkey (id, full_name, email)
        `
    )
    .order('created_at', { ascending: false })
    .limit(500);

  if (wsId) {
    query = query.eq('workspace_id', wsId);
  }

  if (leadStatus) {
    query = query.eq('lead_status', leadStatus);
  }

  const { data: clients, error } = await query;

  if (error) {
    console.error('Error fetching clients:', error);
    return [];
  }

  const normalizedClients = (clients || []).map((client) => ({
    ...client,
    creator: Array.isArray(client.creator) ? client.creator[0] || null : client.creator,
    assigned: Array.isArray(client.assigned) ? client.assigned[0] || null : client.assigned,
  }));

  const clientIds = normalizedClients.map((client) => client.id);
  if (clientIds.length === 0) return normalizedClients;

  const [directProjects, portalLinks] = await Promise.all([
    supabase.from('projects').select('id, client_id').in('client_id', clientIds),
    supabase.from('client_projects').select('client_id, project_id').in('client_id', clientIds),
  ]);

  if (directProjects.error) {
    console.error('Error fetching client project links:', directProjects.error);
  }
  if (portalLinks.error) {
    console.error('Error fetching portal project links:', portalLinks.error);
  }

  const projectsByClient = new Map<string, Set<string>>();
  const ensureSet = (clientId: string) => {
    let set = projectsByClient.get(clientId);
    if (!set) {
      set = new Set<string>();
      projectsByClient.set(clientId, set);
    }
    return set;
  };

  for (const project of directProjects.data || []) {
    if (project.client_id) ensureSet(project.client_id).add(project.id);
  }
  for (const link of portalLinks.data || []) {
    ensureSet(link.client_id).add(link.project_id);
  }

  return normalizedClients.map((client) => ({
    ...client,
    projects: Array.from(projectsByClient.get(client.id) || []).map((id) => ({ id })),
  }));
}

/**
 * Get a client by ID with contacts and activities
 */
export async function getClientById(id: string) {
  const supabase = await createClient();

  const { data: client, error } = await supabase
    .from('clients')
    .select(
      `
            *,
            creator:profiles!clients_created_by_fkey (id, full_name, email),
            assigned:profiles!clients_assigned_to_fkey (id, full_name, email),
            contacts:client_contacts (
                id,
                name,
                email,
                phone,
                position,
                is_primary
            ),
            activities:client_activities (
                id,
                type,
                description,
                metadata,
                created_at,
                created_by:profiles (id, full_name, email)
            )
        `
    )
    .eq('id', id)
    // Paginate client_activities: latest 50 only
    // Note: Supabase PostgREST does not support .order()/.limit() on
    // embedded foreign-table resources via the query builder. The ordering
    // and limiting below use the foreignTable option which is supported in
    // recent versions of @supabase/postgrest-js.
    .order('created_at', { ascending: false, referencedTable: 'client_activities' })
    .limit(50, { referencedTable: 'client_activities' })
    .single();

  if (error) {
    console.error('Error fetching client:', error);
    return null;
  }

  return {
    ...client,
    creator: Array.isArray(client.creator) ? client.creator[0] || null : client.creator,
    assigned: Array.isArray(client.assigned) ? client.assigned[0] || null : client.assigned,
    activities: (client.activities || []).map((a: ClientActivityResponse) => ({
      ...a,
      created_by: Array.isArray(a.created_by) ? a.created_by[0] || null : a.created_by,
    })),
  };
}

/**
 * Update a client record
 */
export async function updateClientRecord(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Validate input
  const validation = parseFormData(updateClientSchema, formData);
  if (!validation.success) {
    return { success: false, error: validation.error };
  }

  const { id, display_name, phone, website, billing_address, lead_status, notes } = validation.data;

  // Get old status before update for activity logging
  const { data: oldClient } = await supabase
    .from('clients')
    .select('lead_status')
    .eq('id', id)
    .single();

  const { data, error } = await supabase
    .from('clients')
    .update({
      ...(display_name && clientNameFields(display_name)),
      ...(phone !== undefined && { phone: phone?.trim() || null }),
      ...(website !== undefined && { website: website?.trim() || null }),
      ...(billing_address !== undefined && { billing_address: billing_address?.trim() || null }),
      ...(lead_status !== undefined && { lead_status }),
      ...(notes !== undefined && { notes: notes?.trim() || null }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating client:', error);
    return { success: false, error: error.message };
  }

  // Log status change activity if status changed
  if (oldClient && lead_status && oldClient.lead_status !== lead_status) {
    await supabase.from('client_activities').insert({
      client_id: id,
      type: 'status_change',
      description: `Status changed from ${oldClient.lead_status} to ${lead_status}`,
      metadata: { old_status: oldClient.lead_status, new_status: lead_status },
      created_by: user.id,
    });
  }

  revalidatePath('/clients');
  revalidatePath('/admin');
  return { success: true, data };
}

/**
 * Delete a client record
 */
export async function deleteClientRecord(id: string): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Authorization check: only admin or workspace admin can delete
  const canDelete = await canDeleteClient(user.id, id);
  if (!canDelete) {
    return { success: false, error: 'You do not have permission to delete this client' };
  }

  const { data, error } = await supabase.from('clients').delete().eq('id', id).select().single();

  if (error) {
    console.error('Error deleting client:', error);
    return { success: false, error: error.message };
  }
  if (!data) return { success: false, error: 'Not found or permission denied' };

  revalidatePath('/clients');
  revalidatePath('/admin');
  return { success: true };
}

/**
 * Log a client activity
 */
export async function logClientActivity(
  clientId: string,
  type: 'call' | 'email' | 'meeting' | 'note' | 'status_change',
  description: string,
  metadata?: Record<string, unknown>
): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { data, error } = await supabase
    .from('client_activities')
    .insert({
      client_id: clientId,
      type,
      description,
      metadata: metadata || {},
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error('Error logging client activity:', error);
    return { success: false, error: error.message };
  }

  // Update last_contacted_at if it's a contact activity
  if (['call', 'email', 'meeting'].includes(type)) {
    const { error: touchError } = await supabase
      .from('clients')
      .update({ last_contacted_at: new Date().toISOString() })
      .eq('id', clientId)
      .select('id')
      .single();
    if (touchError) {
      console.error('Error updating last_contacted_at:', touchError);
    }
  }

  return { success: true, data };
}

/**
 * Toggle client lead status
 */
export async function toggleClientStatus(
  clientId: string,
  newStatus: LeadStatus
): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Get current status for activity log
  const { data: currentClient } = await supabase
    .from('clients')
    .select('lead_status, display_name')
    .eq('id', clientId)
    .single();

  if (!currentClient) {
    return { success: false, error: 'Client not found' };
  }

  const { data, error } = await supabase
    .from('clients')
    .update({
      lead_status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', clientId)
    .select('id')
    .single();

  if (error) {
    console.error('Error updating client status:', error);
    return { success: false, error: error.message };
  }
  if (!data) return { success: false, error: 'Not found or permission denied' };

  // Log the status change
  const statusLabels: Record<LeadStatus, string> = {
    hot: 'Hot Lead',
    cold: 'Cold Lead',
    dropped: 'Dropped',
    active_client: 'Active Client',
    inactive_client: 'Inactive Client',
    dead_lead: 'Dead Lead',
  };
  const statusLabel = statusLabels[newStatus] || newStatus;
  await logClientActivity(clientId, 'status_change', `Status changed to ${statusLabel}`, {
    old_status: currentClient.lead_status,
    new_status: newStatus,
  });

  revalidatePath('/clients');
  revalidatePath('/admin');
  return { success: true };
}

// ============ CLIENT ACCESS DRIFT (admin-only diagnostic) ============

/**
 * Drift kinds — see top-of-file note for the meaning of `projects.client_id`
 * vs the `client_projects` table. These three classes match the
 * 2026-04-28 ops diagnosis recommendation and are the only conditions
 * surfaced to admins for now.
 */
export type ClientAccessDriftKind =
  | 'project_owned_no_portal_access'
  | 'portal_access_owner_mismatch'
  | 'portal_access_to_archived_project';

export interface ClientAccessDriftRow {
  kind: ClientAccessDriftKind;
  /** Free-form description rendered in the warning banner. */
  detail: string;
  projectId: string;
  projectName: string;
  /** When applicable, the client whose ownership/portal access is involved. */
  clientId?: string;
  clientName?: string;
}

export interface ClientAccessDriftReport {
  rows: ClientAccessDriftRow[];
  total: number;
  /** True only if the caller is an admin. Non-admins always see total: 0. */
  authorized: boolean;
}

/**
 * Compute drift between `projects.client_id` (ownership) and
 * `client_projects` (portal access). Admin-only — non-admins get an
 * empty report (no data leak).
 */
export async function getClientAccessDrift(): Promise<ClientAccessDriftReport> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { rows: [], total: 0, authorized: false };
  if (!(await isUserAdmin(user.id))) {
    return { rows: [], total: 0, authorized: false };
  }

  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { rows: [], total: 0, authorized: true };

  const [projectsRes, accessRes, clientsRes] = await Promise.all([
    supabase.from('projects').select('id, name, status, client_id').eq('workspace_id', workspaceId),
    supabase.from('client_projects').select('client_id, project_id'),
    supabase.from('clients').select('id, display_name, name').eq('workspace_id', workspaceId),
  ]);

  const projects = projectsRes.data ?? [];
  const access = accessRes.data ?? [];
  const clients = clientsRes.data ?? [];

  const clientName = new Map<string, string>();
  for (const c of clients) {
    clientName.set(c.id, c.display_name || c.name || 'Unknown client');
  }

  const projectsById = new Map<string, (typeof projects)[number]>();
  for (const p of projects) projectsById.set(p.id, p);

  const accessByProject = new Map<string, Set<string>>();
  for (const row of access) {
    if (!row.project_id || !row.client_id) continue;
    if (!accessByProject.has(row.project_id)) accessByProject.set(row.project_id, new Set());
    accessByProject.get(row.project_id)!.add(row.client_id);
  }

  const rows: ClientAccessDriftRow[] = [];
  const ARCHIVED_STATUSES = new Set(['Archived', 'Canceled']);

  // Kind 1: project ownership exists but no portal access row at all.
  for (const project of projects) {
    if (!project.client_id) continue;
    const portalSet = accessByProject.get(project.id);
    if (!portalSet || portalSet.size === 0) {
      rows.push({
        kind: 'project_owned_no_portal_access',
        projectId: project.id,
        projectName: project.name,
        clientId: project.client_id,
        clientName: clientName.get(project.client_id) ?? 'Unknown client',
        detail: `Owned by ${clientName.get(project.client_id) ?? 'a client'} but no portal access granted.`,
      });
    }
  }

  // Kind 2 + 3: walk every portal-access row.
  for (const row of access) {
    if (!row.project_id || !row.client_id) continue;
    const project = projectsById.get(row.project_id);
    if (!project) continue;

    if (project.client_id && project.client_id !== row.client_id) {
      rows.push({
        kind: 'portal_access_owner_mismatch',
        projectId: project.id,
        projectName: project.name,
        clientId: row.client_id,
        clientName: clientName.get(row.client_id) ?? 'Unknown client',
        detail: `Portal access points to ${clientName.get(row.client_id) ?? 'a client'} but project is owned by ${
          clientName.get(project.client_id) ?? 'a different client'
        }.`,
      });
    }

    if (project.status && ARCHIVED_STATUSES.has(project.status)) {
      rows.push({
        kind: 'portal_access_to_archived_project',
        projectId: project.id,
        projectName: project.name,
        clientId: row.client_id,
        clientName: clientName.get(row.client_id) ?? 'Unknown client',
        detail: `Active portal access to a ${project.status} project — revoke or unarchive.`,
      });
    }
  }

  return { rows, total: rows.length, authorized: true };
}
