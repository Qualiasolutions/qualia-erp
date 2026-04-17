import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { safeCompare } from '@/lib/auth-utils';
import { extractBearer, hashToken, TOKEN_PREFIX, LEGACY_DEPRECATION_HEADERS } from '@/lib/api-auth';

/**
 * POST /api/claude/report-upload
 *
 * Receives session reports from /qualia-report and stores them.
 * Links the report to the user's active work session.
 *
 * Auth (dual path, v3.4.2 compat):
 *   1. Authorization: Bearer qlt_* — per-user token, resolves to profile_id
 *      (preferred — employee_email in the form body is IGNORED in this case)
 *   2. X-API-Key: <CLAUDE_API_KEY> — legacy shared key, grandfathered
 *      (employee_email form field is required to resolve the profile)
 *
 * Body (multipart/form-data):
 *   - file: The report DOCX/MD file
 *   - employee_email: The employee's email (required only for legacy auth)
 *   - project_name: The project name (for context)
 */
export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // ── Auth: try Bearer token first, fall back to X-API-Key (legacy) ──────
  const bearer = extractBearer(request.headers.get('authorization'));
  let tokenProfileId: string | null = null;
  let isLegacyAuth = false;

  if (bearer && bearer.startsWith(TOKEN_PREFIX)) {
    const hash = hashToken(bearer);
    const { data: token } = await supabase
      .from('api_tokens')
      .select('id, profile_id, expires_at, revoked_at')
      .eq('token_hash', hash)
      .maybeSingle();

    if (!token) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    if (token.revoked_at) {
      return NextResponse.json({ error: 'Token revoked' }, { status: 401 });
    }
    if (new Date(token.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Token expired' }, { status: 401 });
    }
    tokenProfileId = token.profile_id;
    // Fire-and-forget last_used_at
    supabase
      .from('api_tokens')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', token.id)
      .then(() => {});
  } else {
    // Legacy X-API-Key path (sunset 2026-05-17)
    const apiKey = request.headers.get('x-api-key');
    const expectedKey = process.env.CLAUDE_API_KEY;
    if (!expectedKey || !safeCompare(apiKey, expectedKey)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    isLegacyAuth = true;
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  const employeeEmail = formData.get('employee_email') as string | null;
  const projectName = formData.get('project_name') as string | null;

  if (!file) {
    return NextResponse.json({ error: 'Missing file' }, { status: 400 });
  }

  // Resolve the profile: prefer the per-user token's owner. Only fall back
  // to the form-supplied email when using the legacy shared key.
  let profile: { id: string } | null = null;

  if (tokenProfileId) {
    profile = { id: tokenProfileId };
  } else {
    if (!employeeEmail) {
      return NextResponse.json(
        { error: 'Missing employee_email (required for legacy auth)' },
        { status: 400 }
      );
    }
    const emailNorm = employeeEmail.trim().toLowerCase();
    const { data: byEmail } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', emailNorm)
      .single();
    profile = byEmail;

    if (!profile) {
      // Fallback: extract local part and try @qualiasolutions.net
      const localPart = emailNorm.split('@')[0];
      const { data: fallback } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', `${localPart}@qualiasolutions.net`)
        .single();
      profile = fallback;
    }
  }

  if (!profile) {
    return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
  }

  // Find their active work session
  const { data: session } = await supabase
    .from('work_sessions')
    .select('id')
    .eq('profile_id', profile.id)
    .is('ended_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Upload file to storage — fall back to user-scoped path when no active session
  // so multiple uploads without a session don't collide under a shared 'no-session' key.
  const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16);
  const ext = file.name.split('.').pop() || 'docx';
  const sessionSegment = session?.id ? `session-${session.id}` : `user-${profile.id}`;
  const storagePath = `reports/${sessionSegment}/${dateStr}-report.${ext}`;

  // Determine MIME type — curl often sends application/octet-stream, so detect from extension
  const MIME_MAP: Record<string, string> = {
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    doc: 'application/msword',
    pdf: 'application/pdf',
    md: 'text/markdown',
    txt: 'text/plain',
  };
  const contentType =
    file.type && file.type !== 'application/octet-stream'
      ? file.type
      : MIME_MAP[ext] || 'application/octet-stream';

  const fileBuffer = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from('project-files')
    .upload(storagePath, fileBuffer, {
      contentType,
      upsert: true,
    });

  if (uploadError) {
    console.error('[report-upload] Storage error:', uploadError);
    return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 });
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from('project-files').getPublicUrl(storagePath);

  // If there's an active session, attach the report URL
  if (session) {
    await supabase.from('work_sessions').update({ report_url: publicUrl }).eq('id', session.id);
  }

  const responseHeaders = isLegacyAuth ? LEGACY_DEPRECATION_HEADERS : undefined;

  return NextResponse.json(
    {
      success: true,
      report_url: publicUrl,
      session_id: session?.id || null,
      project: projectName,
    },
    { headers: responseHeaders }
  );
}
