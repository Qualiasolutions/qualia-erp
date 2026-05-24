'use server';

import { createClient } from '@/lib/supabase/server';
import { isUserAdmin } from '@/app/actions/shared';
import { getCurrentWorkspaceId } from '@/app/actions/workspace';

export type DeliverySeverity = 'critical' | 'high' | 'medium' | 'low';

export type DeliveryExceptionRow = {
  id: string;
  projectId: string;
  projectName: string;
  clientName: string | null;
  employeeName: string | null;
  employeeId: string | null;
  deadlineDate: string | null;
  nextCommand: string | null;
  status: string | null;
  verification: string | null;
  lastReportAt: string | null;
  snapshotGeneratedAt: string | null;
  detail: string;
  href: string;
  severity: DeliverySeverity;
};

export type DeliveryQueue = {
  key:
    | 'overdue'
    | 'due_today'
    | 'due_soon'
    | 'no_deadline'
    | 'no_employee'
    | 'no_packet'
    | 'stale_report'
    | 'stale_snapshot'
    | 'failed_verification'
    | 'gap_cycles'
    | 'waiting_review';
  label: string;
  description: string;
  rows: DeliveryExceptionRow[];
};

export type DeliveryPayload = {
  generatedAt: string;
  summary: {
    totalExceptions: number;
    critical: number;
    dueSoon: number;
    waitingReview: number;
    staleProof: number;
  };
  queues: DeliveryQueue[];
};

type SupabaseLike = Awaited<ReturnType<typeof createClient>>;

const ACTIVE_PROJECT_STATUSES = ['Active', 'Demos', 'Launched', 'Delayed'];
const ACTIVE_PACKET_STATUSES = ['active', 'blocked', 'review_requested'];
const STALE_PROOF_DAYS = 7;

const EMPTY: DeliveryPayload = {
  generatedAt: new Date(0).toISOString(),
  summary: { totalExceptions: 0, critical: 0, dueSoon: 0, waitingReview: 0, staleProof: 0 },
  queues: [],
};

function startOfToday(): Date {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return today;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function dateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function daysBetweenDateOnly(date: string | null, today: Date): number | null {
  if (!date) return null;
  const target = new Date(`${date.slice(0, 10)}T00:00:00.000Z`);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function daysSince(iso: string | null, now: Date): number | null {
  if (!iso) return null;
  return Math.floor((now.getTime() - new Date(iso).getTime()) / 86400000);
}

function metadataObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function snapshotGeneratedAt(metadata: unknown): string | null {
  const snapshot = metadataObject(metadataObject(metadata).framework_snapshot);
  return typeof snapshot.generated_at === 'string' ? snapshot.generated_at : null;
}

function clientNameFromRelation(
  value: { id: string; name: string | null } | Array<{ id: string; name: string | null }> | null
): string | null {
  const client = Array.isArray(value) ? value[0] : value;
  return client?.name ?? null;
}

function profileNameFromRelation(
  value:
    | { id: string; full_name: string | null; email: string | null }
    | Array<{ id: string; full_name: string | null; email: string | null }>
    | null
): { id: string | null; name: string | null } {
  const profile = Array.isArray(value) ? value[0] : value;
  return { id: profile?.id ?? null, name: profile?.full_name ?? profile?.email ?? null };
}

function packetRow(input: {
  id: string;
  projectId: string;
  projectName: string;
  clientName: string | null;
  employeeId: string | null;
  employeeName: string | null;
  deadlineDate: string | null;
  nextCommand: string | null;
  status: string | null;
  verification: string | null;
  lastReportAt: string | null;
  snapshotGeneratedAt: string | null;
  detail: string;
  severity: DeliverySeverity;
}): DeliveryExceptionRow {
  return {
    ...input,
    href: `/projects/${input.projectId}/mission`,
  };
}

export async function loadDeliveryControl(): Promise<DeliveryPayload> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !(await isUserAdmin(user.id))) return EMPTY;

  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return EMPTY;

  return loadDeliveryControlFor(supabase, workspaceId);
}

export async function loadDeliveryControlFor(
  supabase: SupabaseLike,
  workspaceId: string
): Promise<DeliveryPayload> {
  const now = new Date();
  const today = startOfToday();
  const todayDate = dateOnly(today);
  const soonDate = dateOnly(addDays(today, 3));
  const staleProofCutoffDays = STALE_PROOF_DAYS;

  const [projectsRes, assignmentsRes, packetsRes, reportsRes] = await Promise.all([
    supabase
      .from('projects')
      .select(
        'id, name, status, target_date, metadata, client:clients!projects_client_id_fkey(id, name)'
      )
      .eq('workspace_id', workspaceId)
      .in('status', ACTIVE_PROJECT_STATUSES)
      .limit(250),
    supabase
      .from('project_assignments')
      .select(
        'id, project_id, employee_id, deadline_date, completion_requested_at, completed_at, removed_at, employee:profiles!project_assignments_employee_id_fkey(id, full_name, email)'
      )
      .eq('workspace_id', workspaceId)
      .is('removed_at', null)
      .is('completed_at', null)
      .limit(300),
    supabase
      .from('project_work_packets')
      .select(
        'id, project_id, assignment_id, employee_id, deadline_date, next_command, status, verification, framework_status, snapshot_generated_at, last_report_at, employee:profiles!project_work_packets_employee_id_fkey(id, full_name, email)'
      )
      .eq('workspace_id', workspaceId)
      .in('status', ACTIVE_PACKET_STATUSES)
      .limit(300),
    supabase
      .from('session_reports')
      .select(
        'id, erp_project_id, project_name, submitted_at, verification, gap_cycles, status, submitted_by'
      )
      .neq('dry_run', true)
      .not('erp_project_id', 'is', null)
      .order('submitted_at', { ascending: false })
      .limit(500),
  ]);

  type ProjectRaw = {
    id: string;
    name: string;
    status: string | null;
    target_date: string | null;
    metadata: unknown;
    client: { id: string; name: string | null } | Array<{ id: string; name: string | null }> | null;
  };
  type AssignmentRaw = {
    id: string;
    project_id: string;
    employee_id: string | null;
    deadline_date: string | null;
    completion_requested_at: string | null;
    employee:
      | { id: string; full_name: string | null; email: string | null }
      | Array<{ id: string; full_name: string | null; email: string | null }>
      | null;
  };
  type PacketRaw = {
    id: string;
    project_id: string;
    assignment_id: string | null;
    employee_id: string | null;
    deadline_date: string | null;
    next_command: string | null;
    status: string | null;
    verification: string | null;
    framework_status: string | null;
    snapshot_generated_at: string | null;
    last_report_at: string | null;
    employee:
      | { id: string; full_name: string | null; email: string | null }
      | Array<{ id: string; full_name: string | null; email: string | null }>
      | null;
  };
  type ReportRaw = {
    id: string;
    erp_project_id: string | null;
    submitted_at: string | null;
    verification: string | null;
    gap_cycles: number | null;
    status: string | null;
    submitted_by: string | null;
  };

  const projects = ((projectsRes.data as ProjectRaw[] | null) ?? []).map((project) => ({
    id: project.id,
    name: project.name,
    status: project.status,
    targetDate: project.target_date,
    snapshotGeneratedAt: snapshotGeneratedAt(project.metadata),
    clientName: clientNameFromRelation(project.client),
  }));
  const projectById = new Map(projects.map((project) => [project.id, project]));

  const assignments = ((assignmentsRes.data as AssignmentRaw[] | null) ?? []).map((assignment) => {
    const employee = profileNameFromRelation(assignment.employee);
    return {
      id: assignment.id,
      projectId: assignment.project_id,
      employeeId: assignment.employee_id ?? employee.id,
      employeeName: employee.name,
      deadlineDate: assignment.deadline_date,
      completionRequestedAt: assignment.completion_requested_at,
    };
  });

  const reportsByProjectId = new Map<string, ReportRaw>();
  for (const report of (reportsRes.data as ReportRaw[] | null) ?? []) {
    if (report.erp_project_id && !reportsByProjectId.has(report.erp_project_id)) {
      reportsByProjectId.set(report.erp_project_id, report);
    }
  }

  const packets = ((packetsRes.data as PacketRaw[] | null) ?? []).map((packet) => {
    const project = projectById.get(packet.project_id);
    const employee = profileNameFromRelation(packet.employee);
    const latestReport = reportsByProjectId.get(packet.project_id);
    return {
      id: packet.id,
      projectId: packet.project_id,
      assignmentId: packet.assignment_id,
      projectName: project?.name ?? 'Unknown project',
      clientName: project?.clientName ?? null,
      employeeId: packet.employee_id ?? employee.id,
      employeeName: employee.name,
      deadlineDate: packet.deadline_date,
      nextCommand: packet.next_command,
      status: packet.status,
      verification: packet.verification ?? latestReport?.verification ?? null,
      lastReportAt: packet.last_report_at ?? latestReport?.submitted_at ?? null,
      snapshotGeneratedAt: packet.snapshot_generated_at ?? project?.snapshotGeneratedAt ?? null,
      latestGapCycles: latestReport?.gap_cycles ?? 0,
      latestReportStatus: latestReport?.status ?? packet.framework_status ?? null,
    };
  });

  const packetAssignmentIds = new Set(
    packets.map((packet) => packet.assignmentId).filter((id): id is string => Boolean(id))
  );
  const assignedProjectIds = new Set(assignments.map((assignment) => assignment.projectId));

  const overdueRows = packets
    .filter((packet) => {
      const days = daysBetweenDateOnly(packet.deadlineDate, today);
      return days !== null && days < 0;
    })
    .map((packet) => {
      const days = Math.abs(daysBetweenDateOnly(packet.deadlineDate, today) ?? 0);
      return packetRow({
        ...packet,
        detail: `${days} day${days === 1 ? '' : 's'} overdue`,
        severity: 'critical',
      });
    });

  const dueTodayRows = packets
    .filter((packet) => packet.deadlineDate === todayDate)
    .map((packet) =>
      packetRow({
        ...packet,
        detail: 'Due today',
        severity: 'high',
      })
    );

  const dueSoonRows = packets
    .filter((packet) => {
      const date = packet.deadlineDate;
      return Boolean(date && date > todayDate && date <= soonDate);
    })
    .map((packet) => {
      const days = daysBetweenDateOnly(packet.deadlineDate, today) ?? 0;
      return packetRow({
        ...packet,
        detail: `Due in ${days} day${days === 1 ? '' : 's'}`,
        severity: 'medium',
      });
    });

  const noDeadlineRows = projects
    .filter((project) => !project.targetDate)
    .map((project) =>
      packetRow({
        id: `project-${project.id}-no-deadline`,
        projectId: project.id,
        projectName: project.name,
        clientName: project.clientName,
        employeeId: null,
        employeeName: null,
        deadlineDate: null,
        nextCommand: null,
        status: project.status,
        verification: null,
        lastReportAt: reportsByProjectId.get(project.id)?.submitted_at ?? null,
        snapshotGeneratedAt: project.snapshotGeneratedAt,
        detail: 'Project has no target date',
        severity: 'medium',
      })
    );

  const noEmployeeRows = projects
    .filter((project) => !assignedProjectIds.has(project.id))
    .map((project) =>
      packetRow({
        id: `project-${project.id}-no-employee`,
        projectId: project.id,
        projectName: project.name,
        clientName: project.clientName,
        employeeId: null,
        employeeName: null,
        deadlineDate: project.targetDate,
        nextCommand: null,
        status: project.status,
        verification: null,
        lastReportAt: reportsByProjectId.get(project.id)?.submitted_at ?? null,
        snapshotGeneratedAt: project.snapshotGeneratedAt,
        detail: 'No active employee assignment',
        severity: 'high',
      })
    );

  const noPacketRows = assignments
    .filter((assignment) => !packetAssignmentIds.has(assignment.id))
    .map((assignment) => {
      const project = projectById.get(assignment.projectId);
      return packetRow({
        id: `assignment-${assignment.id}-no-packet`,
        projectId: assignment.projectId,
        projectName: project?.name ?? 'Unknown project',
        clientName: project?.clientName ?? null,
        employeeId: assignment.employeeId,
        employeeName: assignment.employeeName,
        deadlineDate: assignment.deadlineDate,
        nextCommand: null,
        status: null,
        verification: null,
        lastReportAt: reportsByProjectId.get(assignment.projectId)?.submitted_at ?? null,
        snapshotGeneratedAt: project?.snapshotGeneratedAt ?? null,
        detail: 'Assignment is missing a work packet',
        severity: 'critical',
      });
    });

  const staleReportRows = packets
    .filter((packet) => {
      const age = daysSince(packet.lastReportAt, now);
      return age === null || age > staleProofCutoffDays;
    })
    .map((packet) => {
      const age = daysSince(packet.lastReportAt, now);
      return packetRow({
        ...packet,
        detail: age === null ? 'No /qualia-report yet' : `Last report ${age} days ago`,
        severity: age === null || age > 14 ? 'high' : 'medium',
      });
    });

  const staleSnapshotRows = packets
    .filter((packet) => {
      const age = daysSince(packet.snapshotGeneratedAt, now);
      return age === null || age > staleProofCutoffDays;
    })
    .map((packet) => {
      const age = daysSince(packet.snapshotGeneratedAt, now);
      return packetRow({
        ...packet,
        detail: age === null ? 'No project snapshot uploaded' : `Project snapshot ${age} days old`,
        severity: age === null || age > 14 ? 'high' : 'medium',
      });
    });

  const failedVerificationRows = packets
    .filter((packet) => (packet.verification ?? '').toLowerCase() === 'fail')
    .map((packet) =>
      packetRow({
        ...packet,
        detail: 'Latest verification failed',
        severity: 'critical',
      })
    );

  const gapCycleRows = packets
    .filter((packet) => packet.latestGapCycles > 0)
    .map((packet) =>
      packetRow({
        ...packet,
        detail: `${packet.latestGapCycles} gap cycle${packet.latestGapCycles === 1 ? '' : 's'}`,
        severity: packet.latestGapCycles > 1 ? 'critical' : 'high',
      })
    );

  const waitingReviewRows = packets
    .filter((packet) => packet.status === 'review_requested')
    .map((packet) =>
      packetRow({
        ...packet,
        detail: 'Employee submitted for owner review',
        severity: 'high',
      })
    );

  const queues: DeliveryQueue[] = [
    {
      key: 'overdue',
      label: 'Overdue projects',
      description: 'Committed assignment deadlines that already passed.',
      rows: overdueRows,
    },
    {
      key: 'due_today',
      label: 'Due today',
      description: 'Work packets that need same-day attention.',
      rows: dueTodayRows,
    },
    {
      key: 'due_soon',
      label: 'Due within 3 days',
      description: 'Near-term commitments before they become overdue.',
      rows: dueSoonRows,
    },
    {
      key: 'waiting_review',
      label: 'Waiting owner review',
      description: 'Employee submissions waiting for approval or changes.',
      rows: waitingReviewRows,
    },
    {
      key: 'failed_verification',
      label: 'Failed verification',
      description: 'Framework proof says the work is not passing.',
      rows: failedVerificationRows,
    },
    {
      key: 'gap_cycles',
      label: 'Gap cycles',
      description: 'Reports with unresolved verifier gap cycles.',
      rows: gapCycleRows,
    },
    {
      key: 'stale_report',
      label: 'Stale reports',
      description: `No recent /qualia-report in ${STALE_PROOF_DAYS} days.`,
      rows: staleReportRows,
    },
    {
      key: 'stale_snapshot',
      label: 'Stale snapshots',
      description: `No recent Framework project snapshot in ${STALE_PROOF_DAYS} days.`,
      rows: staleSnapshotRows,
    },
    {
      key: 'no_packet',
      label: 'Missing work packet',
      description: 'Assignments that need the ERP mission object created.',
      rows: noPacketRows,
    },
    {
      key: 'no_employee',
      label: 'No employee',
      description: 'Active delivery projects with nobody assigned.',
      rows: noEmployeeRows,
    },
    {
      key: 'no_deadline',
      label: 'No project deadline',
      description: 'Active projects missing an owner-visible target date.',
      rows: noDeadlineRows,
    },
  ];

  const totalExceptions = queues.reduce((sum, queue) => sum + queue.rows.length, 0);
  const critical = queues.reduce(
    (sum, queue) => sum + queue.rows.filter((row) => row.severity === 'critical').length,
    0
  );
  const staleProof = staleReportRows.length + staleSnapshotRows.length;

  return {
    generatedAt: now.toISOString(),
    summary: {
      totalExceptions,
      critical,
      dueSoon: overdueRows.length + dueTodayRows.length + dueSoonRows.length,
      waitingReview: waitingReviewRows.length,
      staleProof,
    },
    queues,
  };
}
