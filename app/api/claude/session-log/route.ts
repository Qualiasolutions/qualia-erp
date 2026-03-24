import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

  if (!expectedKey || apiKey !== expectedKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const body = await request.json();

  const { error } = await supabase.from('claude_sessions').insert({
    project_name: body.project || 'unknown',
    branch: body.git?.branch || null,
    files_changed: body.git?.files_changed || 0,
    summary: body.summary || null,
    working_directory: body.working_directory || null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
