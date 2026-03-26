import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { safeCompare } from '@/lib/auth-utils';

/**
 * POST /api/claude/session-log
 *
 * Receives session summaries from save-session-state.sh and stores them.
 * This is the "write" side — every Claude session end pushes a summary here.
 *
 * Auth: X-API-Key header must match CLAUDE_API_KEY env var.
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

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.project || typeof body.project !== 'string') {
    return NextResponse.json({ error: 'Missing or invalid "project" field' }, { status: 400 });
  }

  const git = (body.git as Record<string, unknown>) || {};

  const { error } = await supabase.from('claude_sessions').insert({
    project_name: body.project,
    branch: typeof git.branch === 'string' ? git.branch : null,
    files_changed: typeof git.files_changed === 'number' ? git.files_changed : 0,
    summary: typeof body.summary === 'string' ? body.summary.slice(0, 500) : null,
    working_directory: typeof body.working_directory === 'string' ? body.working_directory : null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
