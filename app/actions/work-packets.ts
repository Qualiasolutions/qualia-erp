'use server';

import { createClient } from '@/lib/supabase/server';
import { isUserAdmin } from './shared';

type SupabaseLike = Awaited<ReturnType<typeof createClient>>;

export type WorkPacketStatus =
  | 'active'
  | 'blocked'
  | 'review_requested'
  | 'approved'
  | 'completed'
  | 'superseded';

export type ProjectWorkPacket = {
  id: string;
  workspace_id: string;
  project_id: string;
  assignment_id: string | null;
  employee_id: string | null;
  deadline_date: string;
  current_milestone: number | null;
  current_milestone_name: string | null;
  current_phase: number | null;
  current_phase_name: string | null;
  next_command: string;
  definition_of_done: string | null;
  blockers: string[];
  repo_url: string | null;
  vercel_url: string | null;
  framework_status: string | null;
  verification: string | null;
  snapshot_generated_at: string | null;
  last_report_at: string | null;
  status: WorkPacketStatus;
  metadata: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  employee?: {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
};

export type ProjectMission = {
  project: {
    id: string;
    name: string;
    status: string;
    description: string | null;
    target_date: string | null;
    github_repo_url: string | null;
    workspace_id: string;
    client: { id: string; name: string | null } | null;
  };
  packets: ProjectWorkPacket[];
  latestReport: {
    id: string;
    status: string | null;
    verification: string | null;
    submitted_at: string | null;
    submitted_by: string | null;
    notes: string | null;
    tasks_done: number | null;
    tasks_total: number | null;
    gap_cycles: number | null;
    deployed_url: string | null;
  } | null;
  currentPhase: {
    id: string;
    name: string;
    status: string;
    milestone_number: number | null;
    sort_order: number | null;
    display_order: number | null;
    target_date: string | null;
    plans_completed: number | null;
    plan_count: number | null;
  } | null;
};

const ACTIVE_PACKET_STATUSES: WorkPacketStatus[] = ['active', 'blocked', 'review_requested'];

function metadataObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function snapshotCurrent(metadata: unknown): Record<string, unknown> {
  const metadataObj = metadataObject(metadata);
  return metadataObject(metadataObj.framework_current);
}

function snapshotGeneratedAt(metadata: unknown): string | null {
  const metadataObj = metadataObject(metadata);
  const snapshot = metadataObject(metadataObj.framework_snapshot);
  return typeof snapshot.generated_at === 'string' ? snapshot.generated_at : null;
}

function numberValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function defaultDefinitionOfDone(projectName: string): string {
  return [
    `${projectName} is built against the approved scope.`,
    'The current Framework phase verifies cleanly.',
    'The employee has submitted the assignment for owner review.',
    'The latest /qualia-report and project snapshot are visible in ERP.',
  ].join(' ');
}

function chooseNextCommand(input: {
  hasPlanning: boolean;
  status: string | null;
  verification: string | null;
  gapCycles: number | null;
  phase: number | null;
  totalPhases: number | null;
  projectStatus: string | null;
  repoUrl: string | null;
}): string {
  const status = (input.status ?? '').toLowerCase();
  const verification = (input.verification ?? '').toLowerCase();
  const projectStatus = (input.projectStatus ?? '').toLowerCase();

  if (verification === 'fail' || status === 'blocked' || (input.gapCycles ?? 0) > 0) {
    return '/qualia-fix';
  }
  if (!input.hasPlanning) {
    return input.repoUrl ? '/qualia-map' : '/qualia-new';
  }
  if (status === 'planned' || status === 'setup' || status === 'planning') return '/qualia-build';
  if (status === 'built' || verification === 'pending') return '/qualia-verify';
  if (
    verification === 'pass' &&
    input.phase &&
    input.totalPhases &&
    input.phase < input.totalPhases
  ) {
    return '/qualia-milestone';
  }
  if (verification === 'pass' && !['launched', 'done'].includes(projectStatus)) {
    return '/qualia-polish';
  }
  if (status === 'polished') return '/qualia-ship';
  if (status === 'shipped' || projectStatus === 'launched') return '/qualia-handoff';
  return '/qualia';
}

async function packetTelemetry(supabase: SupabaseLike, projectId: string) {
  const [projectRes, phaseRes, reportRes, integrationsRes] = await Promise.all([
    supabase
      .from('projects')
      .select('id, name, status, workspace_id, target_date, github_repo_url, metadata')
      .eq('id', projectId)
      .maybeSingle(),
    supabase
      .from('project_phases')
      .select(
        'id, name, status, sort_order, display_order, milestone_number, target_date, plans_completed, plan_count'
      )
      .eq('project_id', projectId)
      .in('status', ['in_progress', 'not_started'])
      .order('sort_order', { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('session_reports')
      .select(
        'id, status, verification, submitted_at, submitted_by, notes, tasks_done, tasks_total, gap_cycles, phase, phase_name, milestone, milestone_name, total_phases, deployed_url'
      )
      .eq('erp_project_id', projectId)
      .neq('dry_run', true)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('project_integrations')
      .select('service_type, external_url')
      .eq('project_id', projectId),
  ]);

  const project = projectRes.data as {
    id: string;
    name: string;
    status: string | null;
    workspace_id: string;
    target_date: string | null;
    github_repo_url: string | null;
    metadata: unknown;
  } | null;
  if (!project) return null;

  const phase = phaseRes.data as {
    id: string;
    name: string;
    status: string;
    milestone_number: number | null;
    sort_order: number | null;
    display_order: number | null;
    target_date: string | null;
    plans_completed: number | null;
    plan_count: number | null;
  } | null;
  const latestReport = reportRes.data as {
    id: string;
    status: string | null;
    verification: string | null;
    submitted_at: string | null;
    submitted_by: string | null;
    notes: string | null;
    tasks_done: number | null;
    tasks_total: number | null;
    gap_cycles: number | null;
    phase: number | null;
    phase_name: string | null;
    milestone: number | null;
    milestone_name: string | null;
    total_phases: number | null;
    deployed_url: string | null;
  } | null;

  const integrations = (
    (integrationsRes.data ?? []) as Array<{
      service_type: string;
      external_url: string | null;
    }>
  ).filter((integration) => integration.external_url);
  const githubUrl =
    project.github_repo_url ??
    integrations.find((integration) => integration.service_type === 'github')?.external_url ??
    null;
  const vercelUrl =
    latestReport?.deployed_url ??
    integrations.find((integration) => integration.service_type === 'vercel')?.external_url ??
    null;

  const current = snapshotCurrent(project.metadata);
  const snapshotPhase = numberValue(current.phase);
  const snapshotMilestone = numberValue(current.milestone);
  const snapshotTotalPhases = numberValue(current.total_phases);
  const reportPhase = latestReport?.phase ?? null;
  const reportMilestone = latestReport?.milestone ?? null;
  const phaseNumber = reportPhase ?? phase?.sort_order ?? phase?.display_order ?? snapshotPhase;
  const milestoneNumber = reportMilestone ?? phase?.milestone_number ?? snapshotMilestone;
  const totalPhases = latestReport?.total_phases ?? snapshotTotalPhases;
  const frameworkStatus = latestReport?.status ?? stringValue(current.status);
  const verification = latestReport?.verification ?? stringValue(current.verification);
  const gapCycles = latestReport?.gap_cycles ?? numberValue(current.gap_cycles);
  const hasPlanning = Boolean(phase || phaseNumber || snapshotPhase);

  return {
    project,
    phase,
    latestReport,
    values: {
      current_milestone: milestoneNumber,
      current_milestone_name: latestReport?.milestone_name ?? stringValue(current.milestone_name),
      current_phase: phaseNumber,
      current_phase_name:
        latestReport?.phase_name ?? phase?.name ?? stringValue(current.phase_name),
      next_command: chooseNextCommand({
        hasPlanning,
        status: frameworkStatus,
        verification,
        gapCycles,
        phase: phaseNumber,
        totalPhases,
        projectStatus: project.status,
        repoUrl: githubUrl,
      }),
      definition_of_done: defaultDefinitionOfDone(project.name),
      repo_url: githubUrl,
      vercel_url: vercelUrl,
      framework_status: frameworkStatus,
      verification,
      snapshot_generated_at: snapshotGeneratedAt(project.metadata),
      last_report_at: latestReport?.submitted_at ?? null,
      metadata: {
        framework_current: current,
        latest_report_id: latestReport?.id ?? null,
      },
    },
  };
}

export async function upsertWorkPacketForAssignment(
  supabase: SupabaseLike,
  assignmentId: string,
  actorId: string | null = null
): Promise<{ success: boolean; data?: ProjectWorkPacket; error?: string }> {
  const { data: assignment, error: assignmentError } = await supabase
    .from('project_assignments')
    .select(
      'id, workspace_id, project_id, employee_id, deadline_date, completion_requested_at, completed_at'
    )
    .eq('id', assignmentId)
    .maybeSingle();

  if (assignmentError || !assignment) {
    return { success: false, error: assignmentError?.message ?? 'Assignment not found' };
  }

  const telemetry = await packetTelemetry(supabase, assignment.project_id);
  if (!telemetry) return { success: false, error: 'Project not found' };

  const packetStatus: WorkPacketStatus = assignment.completed_at
    ? 'completed'
    : assignment.completion_requested_at
      ? 'review_requested'
      : 'active';

  const values = {
    workspace_id: assignment.workspace_id,
    project_id: assignment.project_id,
    assignment_id: assignment.id,
    employee_id: assignment.employee_id,
    deadline_date: assignment.deadline_date,
    status: packetStatus,
    blockers: [] as string[],
    ...telemetry.values,
    updated_at: new Date().toISOString(),
  };

  const { data: existing } = await supabase
    .from('project_work_packets')
    .select('id')
    .eq('assignment_id', assignment.id)
    .in('status', ACTIVE_PACKET_STATUSES)
    .maybeSingle();

  const query = existing?.id
    ? supabase.from('project_work_packets').update(values).eq('id', existing.id)
    : supabase.from('project_work_packets').insert({ ...values, created_by: actorId });

  const { data: packet, error } = await query.select('*').single();
  if (error || !packet) return { success: false, error: error?.message ?? 'Packet write failed' };
  return { success: true, data: packet as ProjectWorkPacket };
}

export async function refreshActiveWorkPacketsForProject(
  supabase: SupabaseLike,
  projectId: string
): Promise<{ success: boolean; refreshed: number; error?: string }> {
  const { data: assignments, error } = await supabase
    .from('project_assignments')
    .select('id')
    .eq('project_id', projectId)
    .is('removed_at', null);

  if (error) return { success: false, refreshed: 0, error: error.message };
  let refreshed = 0;
  for (const assignment of (assignments ?? []) as Array<{ id: string }>) {
    const result = await upsertWorkPacketForAssignment(supabase, assignment.id);
    if (result.success) refreshed += 1;
  }
  return { success: true, refreshed };
}

export async function getProjectMission(
  projectId: string
): Promise<{ success: boolean; data?: ProjectMission; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const isAdmin = await isUserAdmin(user.id);
  if (!isAdmin) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (profile?.role !== 'employee') return { success: false, error: 'Not authorized' };
    const { data: assignment } = await supabase
      .from('project_assignments')
      .select('id')
      .eq('project_id', projectId)
      .eq('employee_id', user.id)
      .is('removed_at', null)
      .maybeSingle();
    if (!assignment) return { success: false, error: 'Not authorized' };
  }

  const [projectRes, packetsRes, telemetry] = await Promise.all([
    supabase
      .from('projects')
      .select(
        'id, name, status, description, target_date, github_repo_url, workspace_id, client:clients(id, name)'
      )
      .eq('id', projectId)
      .maybeSingle(),
    supabase
      .from('project_work_packets')
      .select(
        '*, employee:profiles!project_work_packets_employee_id_fkey(id, full_name, email, avatar_url)'
      )
      .eq('project_id', projectId)
      .in('status', ACTIVE_PACKET_STATUSES)
      .order('deadline_date', { ascending: true }),
    packetTelemetry(supabase, projectId),
  ]);

  if (projectRes.error || !projectRes.data) {
    return { success: false, error: projectRes.error?.message ?? 'Project not found' };
  }
  const rawProject = projectRes.data as {
    id: string;
    name: string;
    status: string;
    description: string | null;
    target_date: string | null;
    github_repo_url: string | null;
    workspace_id: string;
    client: { id: string; name: string | null } | Array<{ id: string; name: string | null }> | null;
  };
  const client = Array.isArray(rawProject.client) ? rawProject.client[0] : rawProject.client;

  return {
    success: true,
    data: {
      project: {
        id: rawProject.id,
        name: rawProject.name,
        status: rawProject.status,
        description: rawProject.description,
        target_date: rawProject.target_date,
        github_repo_url: rawProject.github_repo_url,
        workspace_id: rawProject.workspace_id,
        client: client ?? null,
      },
      packets: ((packetsRes.data ?? []) as Array<ProjectWorkPacket & { employee?: unknown }>).map(
        (packet) => ({
          ...packet,
          employee: Array.isArray(packet.employee)
            ? (packet.employee[0] as ProjectWorkPacket['employee'])
            : (packet.employee as ProjectWorkPacket['employee']),
          metadata: metadataObject(packet.metadata),
        })
      ),
      latestReport: telemetry?.latestReport
        ? {
            id: telemetry.latestReport.id,
            status: telemetry.latestReport.status,
            verification: telemetry.latestReport.verification,
            submitted_at: telemetry.latestReport.submitted_at,
            submitted_by: telemetry.latestReport.submitted_by,
            notes: telemetry.latestReport.notes,
            tasks_done: telemetry.latestReport.tasks_done,
            tasks_total: telemetry.latestReport.tasks_total,
            gap_cycles: telemetry.latestReport.gap_cycles,
            deployed_url: telemetry.latestReport.deployed_url,
          }
        : null,
      currentPhase: telemetry?.phase ?? null,
    },
  };
}
