import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { isUserManagerOrAbove } from '@/app/actions/shared';
import { getZohoInvoicePdf } from '@/lib/integrations/zoho';

async function getClientWorkspaceAndCrmClientIds(userId: string) {
  const supabase = await createClient();
  const { data: links } = await supabase
    .from('client_projects')
    .select('project:projects!inner(client_id, workspace_id)')
    .eq('client_id', userId);

  const crmClientIds = new Set<string>();
  let workspaceId: string | null = null;

  for (const link of links || []) {
    const project = Array.isArray(link.project) ? link.project[0] : link.project;
    if (!project) continue;
    if (!workspaceId) workspaceId = project.workspace_id;
    if (project.client_id) crmClientIds.add(project.client_id);
  }

  return { workspaceId, crmClientIds };
}

async function getInternalWorkspaceId(userId: string) {
  const supabase = await createClient();
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('profile_id', userId)
    .eq('is_default', true)
    .maybeSingle();

  if (membership?.workspace_id) return membership.workspace_id;

  const { data: fallback } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('profile_id', userId)
    .limit(1)
    .maybeSingle();

  return fallback?.workspace_id ?? null;
}

export async function GET(_request: NextRequest, context: { params: Promise<{ zohoId: string }> }) {
  const { zohoId } = await context.params;
  if (!zohoId || zohoId.length > 128) {
    return NextResponse.json({ error: 'Invalid invoice ID' }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const adminClient = createAdminClient();
  const { data: invoice, error } = await adminClient
    .from('financial_invoices')
    .select('zoho_id, invoice_number, client_id, is_hidden, source')
    .eq('zoho_id', zohoId)
    .maybeSingle();

  if (error) {
    console.error('[invoice-pdf] invoice lookup failed:', error);
    return NextResponse.json({ error: 'Failed to load invoice' }, { status: 500 });
  }

  if (!invoice || invoice.is_hidden) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  }

  const isInternal = await isUserManagerOrAbove(user.id);
  let workspaceId: string | null = null;

  if (isInternal) {
    workspaceId = await getInternalWorkspaceId(user.id);
  } else {
    const clientScope = await getClientWorkspaceAndCrmClientIds(user.id);
    workspaceId = clientScope.workspaceId;
    if (!invoice.client_id || !clientScope.crmClientIds.has(invoice.client_id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  if (!workspaceId) {
    return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
  }

  if (invoice.source !== 'zoho') {
    return NextResponse.json({ error: 'No Zoho PDF available' }, { status: 404 });
  }

  const pdf = await getZohoInvoicePdf(workspaceId, invoice.zoho_id);
  if (!pdf.success || !pdf.data) {
    return NextResponse.json({ error: pdf.error || 'Failed to download invoice' }, { status: 502 });
  }

  const filename = `${invoice.invoice_number || invoice.zoho_id}.pdf`.replace(
    /[^a-zA-Z0-9._-]/g,
    '_'
  );

  return new NextResponse(new Uint8Array(pdf.data), {
    status: 200,
    headers: {
      'Content-Type': pdf.contentType || 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
