/**
 * Zoho Integration
 *
 * Client library for Zoho Books/Mail API integration
 * Handles OAuth token management, API calls, and data transformations
 */

import { createClient } from '@/lib/supabase/server';

const ZOHO_API_BASE = 'https://www.zohoapis.com';

// ============ TYPES ============

export type CreateInvoiceParams = {
  customer_name: string;
  items: {
    name: string;
    description?: string;
    rate: number;
    quantity: number;
  }[];
  due_date?: string;
  notes?: string;
};

export type ZohoInvoice = {
  invoice_id: string;
  invoice_number: string;
  customer_name: string;
  total: number;
  status: string;
  due_date: string;
  created_time: string;
};

export type ZohoContact = {
  contact_id: string;
  contact_name: string;
  email: string;
  phone: string;
  company_name: string;
};

export type ZohoEmailParams = {
  to: string;
  subject: string;
  body: string;
  cc?: string;
};

type ActionResult = {
  success: boolean;
  error?: string;
  data?: unknown;
};

// ============ TOKEN MANAGEMENT ============

/**
 * Get valid Zoho access token for a workspace
 * Refreshes token if expired
 */
async function getAccessToken(workspaceId: string): Promise<string | null> {
  const supabase = await createClient();

  const { data: integration } = await supabase
    .from('integrations')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('provider', 'zoho')
    .single();

  if (!integration) return null;

  // Check if token is expired (with 5 min buffer)
  const expiresAt = new Date(integration.token_expires_at);
  const now = new Date();
  const bufferMs = 5 * 60 * 1000; // 5 minutes

  if (expiresAt.getTime() - now.getTime() > bufferMs) {
    return integration.access_token;
  }

  // Token expired - refresh it
  const refreshed = await refreshAccessToken(workspaceId, integration.refresh_token);
  return refreshed;
}

/**
 * Refresh Zoho access token using refresh token
 */
async function refreshAccessToken(
  workspaceId: string,
  refreshToken: string
): Promise<string | null> {
  const supabase = await createClient();

  const clientId = process.env.ZOHO_CLIENT_ID;
  const clientSecret = process.env.ZOHO_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('[Zoho] Missing client credentials');
    return null;
  }

  try {
    const response = await fetch('https://accounts.zoho.com/oauth/v2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      console.error('[Zoho] Token refresh failed:', await response.text());
      return null;
    }

    const data = await response.json();

    // Update stored token
    await supabase
      .from('integrations')
      .update({
        access_token: data.access_token,
        token_expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
      })
      .eq('workspace_id', workspaceId)
      .eq('provider', 'zoho');

    return data.access_token;
  } catch (error) {
    console.error('[Zoho] Token refresh error:', error);
    return null;
  }
}

// ============ API HELPERS ============

/**
 * Make authenticated request to Zoho API
 */
async function zohoRequest<T>(
  workspaceId: string,
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; error?: string }> {
  const token = await getAccessToken(workspaceId);

  if (!token) {
    return { success: false, error: 'Zoho not connected. Please authenticate first.' };
  }

  try {
    const response = await fetch(`${ZOHO_API_BASE}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('[Zoho] API error:', text);
      return { success: false, error: `Zoho API error: ${response.status}` };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error('[Zoho] Request failed:', error);
    return { success: false, error: 'Failed to connect to Zoho' };
  }
}

// ============ ZOHO RESPONSE TYPES ============

export type ZohoPayment = {
  payment_id: string;
  payment_number: string;
  customer_name: string;
  customer_id: string;
  date: string;
  amount: number;
  currency_code: string;
  payment_mode: string;
  description: string;
  invoices: { invoice_number: string }[];
};

export type ZohoInvoiceDetail = {
  invoice_id: string;
  invoice_number: string;
  customer_name: string;
  customer_id: string;
  status: string;
  date: string;
  due_date: string;
  total: number;
  balance: number;
  currency_code: string;
  last_payment_date: string;
};

// ============ PAGINATED FETCHERS ============

/**
 * Fetch ALL invoices from Zoho Books (paginated, all statuses)
 */
export async function getZohoAllInvoices(
  workspaceId: string
): Promise<{ success: boolean; data?: ZohoInvoiceDetail[]; error?: string }> {
  const allInvoices: ZohoInvoiceDetail[] = [];
  let page = 1;
  const perPage = 200;

  while (true) {
    const result = await zohoRequest<{
      invoices: ZohoInvoiceDetail[];
      page_context: { has_more_page: boolean };
    }>(workspaceId, `/books/v3/invoices?page=${page}&per_page=${perPage}`);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    const invoices = result.data?.invoices ?? [];
    allInvoices.push(...invoices);

    if (!result.data?.page_context?.has_more_page || invoices.length === 0) {
      break;
    }

    page++;
  }

  return { success: true, data: allInvoices };
}

/**
 * Fetch ALL customer payments from Zoho Books (paginated)
 */
export async function getZohoPayments(
  workspaceId: string
): Promise<{ success: boolean; data?: ZohoPayment[]; error?: string }> {
  const allPayments: ZohoPayment[] = [];
  let page = 1;
  const perPage = 200;

  while (true) {
    const result = await zohoRequest<{
      customerpayments: ZohoPayment[];
      page_context: { has_more_page: boolean };
    }>(workspaceId, `/books/v3/customerpayments?page=${page}&per_page=${perPage}`);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    const payments = result.data?.customerpayments ?? [];
    allPayments.push(...payments);

    if (!result.data?.page_context?.has_more_page || payments.length === 0) {
      break;
    }

    page++;
  }

  return { success: true, data: allPayments };
}

// ============ INVOICES ============

/**
 * Create invoice in Zoho Books
 */
export async function createZohoInvoice(
  workspaceId: string,
  params: CreateInvoiceParams
): Promise<ActionResult> {
  const payload = {
    customer_name: params.customer_name,
    line_items: params.items.map((item) => ({
      name: item.name,
      description: item.description || '',
      rate: item.rate,
      quantity: item.quantity,
    })),
    due_date: params.due_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    notes: params.notes || '',
  };

  const result = await zohoRequest(workspaceId, '/books/v3/invoices', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return { success: true, data: result.data };
}

/**
 * Get invoices from Zoho Books
 */
export async function getZohoInvoices(
  workspaceId: string,
  filters?: { status?: string; customer_name?: string }
): Promise<ActionResult> {
  let endpoint = '/books/v3/invoices';

  if (filters) {
    const params = new URLSearchParams();
    if (filters.status) params.set('status', filters.status);
    if (filters.customer_name) params.set('customer_name', filters.customer_name);
    endpoint += `?${params.toString()}`;
  }

  const result = await zohoRequest<{ invoices: ZohoInvoice[] }>(workspaceId, endpoint);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return { success: true, data: result.data?.invoices || [] };
}

// ============ MAIL ============

/**
 * Send email via Zoho Mail
 */
export async function sendZohoEmail(
  workspaceId: string,
  params: ZohoEmailParams
): Promise<ActionResult> {
  const payload = {
    toAddress: params.to,
    subject: params.subject,
    content: params.body,
    ccAddress: params.cc || '',
  };

  const result = await zohoRequest(workspaceId, '/mail/v1/messages', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return { success: true, data: result.data };
}

// ============ CRM / CONTACTS ============

/**
 * Get contacts from Zoho CRM
 */
export async function getZohoContacts(workspaceId: string, search?: string): Promise<ActionResult> {
  let endpoint = '/crm/v3/Contacts';

  if (search) {
    const params = new URLSearchParams({ criteria: `(Full_Name:contains:${search})` });
    endpoint += `?${params.toString()}`;
  }

  const result = await zohoRequest<{ data: ZohoContact[] }>(workspaceId, endpoint);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return { success: true, data: result.data?.data || [] };
}

/**
 * Check if workspace has Zoho integration enabled
 */
export async function isZohoConnected(workspaceId: string): Promise<boolean> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('workspace_integrations')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('provider', 'zoho')
    .eq('is_connected', true)
    .single();

  return !!data;
}

/**
 * Test Zoho connection by making a lightweight API call
 */
export async function testZohoConnection(
  workspaceId: string
): Promise<{ valid: boolean; error?: string }> {
  const token = await getAccessToken(workspaceId);
  if (!token) {
    return { valid: false, error: 'No valid Zoho token found. Please re-authenticate.' };
  }

  try {
    const response = await fetch(`${ZOHO_API_BASE}/books/v3/organizations`, {
      headers: { Authorization: `Zoho-oauthtoken ${token}` },
    });

    if (response.ok) {
      return { valid: true };
    }
    return { valid: false, error: `Zoho API returned ${response.status}` };
  } catch {
    return { valid: false, error: 'Failed to connect to Zoho API' };
  }
}

// Client cache (for consistency with other integrations)
const _zohoCache = new Map<string, boolean>();

/**
 * Clear cached Zoho client state for a workspace
 */
export function clearZohoClientCache(workspaceId: string): void {
  _zohoCache.delete(workspaceId);
}
