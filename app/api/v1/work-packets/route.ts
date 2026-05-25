import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { authenticateRequest, hasScope } from '@/lib/api-auth';
import { apiRateLimiter } from '@/lib/rate-limit';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ACTIVE_PACKET_STATUSES = ['active', 'blocked', 'review_requested'];

function errorResponse(status: number, body: Record<string, unknown>, extraHeaders?: HeadersInit) {
  return NextResponse.json({ ok: false, ...body }, { status, headers: extraHeaders });
}

function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.ok) {
    return errorResponse(401, { error: auth.error, message: auth.message });
  }
  if (
    !hasScope(auth, 'reports:write') &&
    !hasScope(auth, 'projects:read') &&
    !hasScope(auth, 'projects:write')
  ) {
    return errorResponse(403, {
      error: 'INSUFFICIENT_SCOPE',
      message: 'Token must include reports:write, projects:read, or projects:write scope',
    });
  }

  const rateLimitResult = await apiRateLimiter(`v1:work-packets:${auth.profileId}`);
  if (!rateLimitResult.success) {
    const retryAfter = Math.ceil((rateLimitResult.reset - Date.now()) / 1000);
    return errorResponse(
      429,
      { error: 'RATE_LIMITED', message: 'Rate limit exceeded', retryAfter },
      { 'Retry-After': retryAfter.toString() }
    );
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('project_id')?.trim() ?? '';
  if (!UUID_REGEX.test(projectId)) {
    return errorResponse(400, {
      error: 'INVALID_PROJECT_ID',
      message: 'project_id query parameter must be an ERP project UUID',
    });
  }

  const supabase = createAdminClient();
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', auth.profileId)
    .maybeSingle();

  if (profileError || !profile) {
    return errorResponse(403, {
      error: 'PROFILE_NOT_FOUND',
      message: 'Token profile is no longer available',
    });
  }

  const isAdmin = profile.role === 'admin' || hasScope(auth, '*') || hasScope(auth, 'admin');
  let query = supabase
    .from('project_work_packets')
    .select(
      `
      id,
      workspace_id,
      project_id,
      assignment_id,
      employee_id,
      deadline_date,
      current_milestone,
      current_milestone_name,
      current_phase,
      current_phase_name,
      next_command,
      definition_of_done,
      blockers,
      repo_url,
      vercel_url,
      framework_status,
      verification,
      snapshot_generated_at,
      last_report_at,
      status,
      metadata,
      updated_at,
      employee:profiles!project_work_packets_employee_id_fkey(id, full_name, email),
      project:projects!project_work_packets_project_id_fkey(id, name, client:clients(id, name))
    `
    )
    .eq('project_id', projectId)
    .in('status', ACTIVE_PACKET_STATUSES)
    .order('deadline_date', { ascending: true })
    .limit(1);

  if (!isAdmin) {
    query = query.eq('employee_id', auth.profileId);
  }

  const { data, error } = await query.maybeSingle();
  if (error) {
    console.error('[api/v1/work-packets] Query failed:', error);
    return errorResponse(500, {
      error: 'QUERY_FAILED',
      message: error.message,
    });
  }
  if (!data) {
    return errorResponse(404, {
      error: 'WORK_PACKET_NOT_FOUND',
      message: isAdmin
        ? 'No active work packet found for this ERP project'
        : 'No active work packet found for this ERP project and token profile',
    });
  }

  const packet = data as typeof data & {
    employee:
      | { id: string; full_name: string | null; email: string | null }
      | Array<{ id: string; full_name: string | null; email: string | null }>
      | null;
    project:
      | {
          id: string;
          name: string;
          client:
            | { id: string; name: string | null }
            | Array<{ id: string; name: string | null }>
            | null;
        }
      | Array<{
          id: string;
          name: string;
          client:
            | { id: string; name: string | null }
            | Array<{ id: string; name: string | null }>
            | null;
        }>
      | null;
  };
  const project = one(packet.project);
  const employee = one(packet.employee);
  const client = project ? one(project.client) : null;
  const origin = new URL(request.url).origin;

  return NextResponse.json({
    ok: true,
    work_packet: {
      id: packet.id,
      workspace_id: packet.workspace_id,
      project_id: packet.project_id,
      assignment_id: packet.assignment_id,
      employee_id: packet.employee_id,
      deadline_date: packet.deadline_date,
      current_milestone: packet.current_milestone,
      current_milestone_name: packet.current_milestone_name,
      current_phase: packet.current_phase,
      current_phase_name: packet.current_phase_name,
      next_command: packet.next_command,
      definition_of_done: packet.definition_of_done,
      blockers: packet.blockers ?? [],
      repo_url: packet.repo_url,
      vercel_url: packet.vercel_url,
      framework_status: packet.framework_status,
      verification: packet.verification,
      snapshot_generated_at: packet.snapshot_generated_at,
      last_report_at: packet.last_report_at,
      status: packet.status,
      updated_at: packet.updated_at,
      employee: employee
        ? {
            id: employee.id,
            name: employee.full_name ?? employee.email ?? null,
            email: employee.email,
          }
        : null,
      project: project
        ? {
            id: project.id,
            name: project.name,
            client: client ? { id: client.id, name: client.name } : null,
          }
        : null,
      mission_url: `${origin}/projects/${packet.project_id}/mission`,
    },
  });
}
