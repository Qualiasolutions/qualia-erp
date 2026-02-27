'use server';

import { createClient } from '@/lib/supabase/server';
import {
  createZohoInvoice,
  getZohoInvoices,
  sendZohoEmail,
  getZohoContacts,
} from '@/lib/integrations/zoho';
import type { ActionResult } from './shared';

/**
 * Get workspace ID for current user
 */
async function getWorkspaceId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('profile_id', user.id)
    .eq('is_default', true)
    .single();

  return data?.workspace_id || null;
}

// ============ INVOICE ACTIONS ============

/**
 * Create invoice in Zoho Books
 */
export async function createInvoice(
  clientName: string,
  items: { name: string; description?: string; rate: number; quantity: number }[],
  dueDate?: string
): Promise<ActionResult> {
  const workspaceId = await getWorkspaceId();
  if (!workspaceId) return { success: false, error: 'Not authenticated' };

  const result = await createZohoInvoice(workspaceId, {
    customer_name: clientName,
    items,
    due_date: dueDate,
  });

  return result;
}

/**
 * Fetch invoices from Zoho Books with optional filters
 */
export async function fetchInvoices(filters?: {
  status?: string;
  customer_name?: string;
}): Promise<ActionResult> {
  const workspaceId = await getWorkspaceId();
  if (!workspaceId) return { success: false, error: 'Not authenticated' };

  return getZohoInvoices(workspaceId, filters);
}

// ============ EMAIL ACTIONS ============

/**
 * Send email via Zoho Mail
 */
export async function sendEmail(
  to: string,
  subject: string,
  body: string,
  cc?: string
): Promise<ActionResult> {
  const workspaceId = await getWorkspaceId();
  if (!workspaceId) return { success: false, error: 'Not authenticated' };

  return sendZohoEmail(workspaceId, { to, subject, body, cc });
}

// ============ CONTACT ACTIONS ============

/**
 * Search Zoho CRM contacts
 */
export async function searchContacts(search?: string): Promise<ActionResult> {
  const workspaceId = await getWorkspaceId();
  if (!workspaceId) return { success: false, error: 'Not authenticated' };

  return getZohoContacts(workspaceId, search);
}

// ============ SYNC ACTIONS ============

/**
 * Sync Zoho contacts to ERP clients
 * Creates new client records for contacts that don't exist
 */
export async function syncZohoToERP(): Promise<ActionResult> {
  const workspaceId = await getWorkspaceId();
  if (!workspaceId) return { success: false, error: 'Not authenticated' };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  // Get Zoho contacts
  const contactsResult = await getZohoContacts(workspaceId);
  if (!contactsResult.success || !contactsResult.data) {
    return { success: false, error: contactsResult.error || 'Failed to fetch Zoho contacts' };
  }

  const zohoContacts = contactsResult.data as Array<{
    contact_name: string;
    email: string;
    phone: string;
    company_name: string;
  }>;

  let synced = 0;
  let skipped = 0;

  for (const contact of zohoContacts) {
    // Check if client already exists by name
    const { data: existing } = await supabase
      .from('clients')
      .select('id')
      .eq('workspace_id', workspaceId)
      .ilike('display_name', contact.contact_name)
      .limit(1);

    if (existing && existing.length > 0) {
      skipped++;
      continue;
    }

    // Create new client
    await supabase.from('clients').insert({
      name: contact.contact_name,
      display_name: contact.contact_name,
      phone: contact.phone || null,
      website: null,
      lead_status: 'active_client',
      created_by: user.id,
      workspace_id: workspaceId,
      notes: contact.company_name
        ? `Synced from Zoho - Company: ${contact.company_name}`
        : 'Synced from Zoho',
    });

    synced++;
  }

  return {
    success: true,
    data: { synced, skipped, total: zohoContacts.length },
  };
}
