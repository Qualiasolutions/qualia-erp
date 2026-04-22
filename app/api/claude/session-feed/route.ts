import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { safeCompare } from '@/lib/auth-utils';

/**
 * GET /api/claude/session-feed
 *
 * Returns recent Claude session activity across all projects.
 * Used by session-context-loader.sh for cross-session awareness.
 *
 * Auth: X-API-Key header must match CLAUDE_API_KEY env var.
 *
 * Query params:
 *   ?limit=20 (default 20, max 50)
 *   ?project=sakani (filter by project name)
 */
export async function GET(request: NextRequest) {
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

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20', 10), 1), 50);
  const projectRaw = searchParams.get('project');
  const project = projectRaw?.slice(0, 200) ?? null;

  let query = supabase
    .from('claude_sessions')
    .select('*')
    .order('session_timestamp', { ascending: false })
    .limit(limit);

  if (project) {
    query = query.eq('project_name', project);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ sessions: data, count: data?.length || 0 });
}
