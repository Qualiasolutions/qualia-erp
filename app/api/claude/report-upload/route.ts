import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { safeCompare } from '@/lib/auth-utils';

/**
 * POST /api/claude/report-upload
 *
 * Receives session reports from /qualia-report and stores them.
 * Links the report to the user's active work session.
 * Auth: X-API-Key header must match CLAUDE_API_KEY env var.
 *
 * Body (multipart/form-data):
 *   - file: The report DOCX/MD file
 *   - employee_email: The employee's email
 *   - project_name: The project name (for context)
 */
export async function POST(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key');
  const expectedKey = process.env.CLAUDE_API_KEY;

  if (!expectedKey || !safeCompare(apiKey, expectedKey)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

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

  if (!employeeEmail) {
    return NextResponse.json({ error: 'Missing employee_email' }, { status: 400 });
  }

  // Find the employee profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', employeeEmail.trim().toLowerCase())
    .single();

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

  // Upload file to storage
  const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16);
  const ext = file.name.split('.').pop() || 'docx';
  const sessionId = session?.id || 'no-session';
  const storagePath = `reports/${sessionId}/${dateStr}-report.${ext}`;

  const fileBuffer = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from('project-files')
    .upload(storagePath, fileBuffer, {
      contentType: file.type || 'application/octet-stream',
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

  return NextResponse.json({
    success: true,
    report_url: publicUrl,
    session_id: session?.id || null,
    project: projectName,
  });
}
