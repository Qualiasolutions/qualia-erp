'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { parseFormData, createClientSchema, updateClientSchema } from '@/lib/validation';
import { notifyClientCreated } from '@/lib/email';
import { getCurrentWorkspaceId } from './workspace';
import { canDeleteClient, type ActionResult, type ProfileRef } from './shared';

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
      name: display_name.trim(), // Required NOT NULL column
      display_name: display_name.trim(),
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
  revalidatePath('/'); // Revalidate Today dashboard
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
            assigned:profiles!clients_assigned_to_fkey (id, full_name, email),
            projects:projects!projects_client_id_fkey (id)
        `
    )
    .order('created_at', { ascending: false });

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

  return (clients || []).map((client) => ({
    ...client,
    creator: Array.isArray(client.creator) ? client.creator[0] || null : client.creator,
    assigned: Array.isArray(client.assigned) ? client.assigned[0] || null : client.assigned,
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
      ...(display_name && { display_name: display_name.trim() }),
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
  revalidatePath(`/clients/${id}`);
  revalidatePath('/'); // Revalidate Today dashboard
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

  const { error } = await supabase.from('clients').delete().eq('id', id);

  if (error) {
    console.error('Error deleting client:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/clients');
  revalidatePath('/'); // Revalidate Today dashboard
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
    await supabase
      .from('clients')
      .update({ last_contacted_at: new Date().toISOString() })
      .eq('id', clientId);
  }

  revalidatePath(`/clients/${clientId}`);
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

  const { error } = await supabase
    .from('clients')
    .update({
      lead_status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', clientId);

  if (error) {
    console.error('Error updating client status:', error);
    return { success: false, error: error.message };
  }

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

  revalidatePath('/');
  revalidatePath('/clients');
  revalidatePath(`/clients/${clientId}`);
  return { success: true };
}
