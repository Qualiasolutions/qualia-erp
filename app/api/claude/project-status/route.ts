import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { safeCompare } from '@/lib/auth-utils';

/**
 * GET /api/claude/project-status
 *
 * Returns all projects with status, last deploy info, and health.
 * Used by session-context-loader.sh to inject project awareness into Claude sessions.
 *
 * Auth: X-API-Key header must match CLAUDE_API_KEY env var.
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

  // Fetch all projects with their phases and recent activity
  const { data: projects, error } = await supabase
    .from('projects')
    .select(
      `
      id, name, status, project_type,
      project_integrations(service_type, external_url),
      project_phases(name, status, sort_order, completed_at)
    `
    )
    .order('name');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get last activity per project
  const { data: recentActivity } = await supabase
    .from('activities')
    .select('project_id, created_at, metadata')
    .order('created_at', { ascending: false })
    .limit(100);

  const activityMap = new Map<string, { last_activity: string; last_action: string }>();
  for (const a of recentActivity || []) {
    if (!activityMap.has(a.project_id)) {
      activityMap.set(a.project_id, {
        last_activity: a.created_at,
        last_action: ((a.metadata as Record<string, unknown>)?.source as string) || 'unknown',
      });
    }
  }

  // Get recent sessions from claude_sessions
  const { data: recentSessions } = await supabase
    .from('claude_sessions')
    .select('project_name, session_timestamp, summary, files_changed')
    .order('session_timestamp', { ascending: false })
    .limit(50);

  const sessionMap = new Map<string, { last_session: string; summary: string }>();
  for (const s of recentSessions || []) {
    if (!sessionMap.has(s.project_name)) {
      sessionMap.set(s.project_name, {
        last_session: s.session_timestamp,
        summary: s.summary || '',
      });
    }
  }

  const result = (projects || []).map((p) => {
    const phases =
      (p.project_phases as Array<{ name: string; status: string; sort_order: number }>) || [];
    const completed = phases.filter((ph) => ph.status === 'completed').length;
    const total = phases.length;
    const currentPhase = phases
      .filter((ph) => ph.status === 'in_progress')
      .sort((a, b) => a.sort_order - b.sort_order)[0];

    const activity = activityMap.get(p.id);
    const session = sessionMap.get(p.name);

    return {
      name: p.name,
      status: p.status,
      type: p.project_type,
      phases: { completed, total, current: currentPhase?.name || null },
      last_activity: activity?.last_activity || null,
      last_session: session?.last_session || null,
      last_session_summary: session?.summary || null,
    };
  });

  return NextResponse.json({ projects: result, count: result.length });
}
