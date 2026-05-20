'use server';

import { createAdminClient, createClient } from '@/lib/supabase/server';
import { isUserAdmin } from './shared';
import { getCurrentWorkspaceId } from './workspace';

export interface AdminHomeProject {
  id: string;
  name: string;
  clientName: string | null;
  logoUrl: string | null;
  status: string | null;
  href: string;
  phaseLabel: string | null;
  phaseName: string | null;
  phaseStatus: string | null;
  lastTouchedAt: string | null;
  sourceLabels: string[];
  note: string | null;
}

type ProjectPhaseRow = {
  project_id: string;
  name: string;
  status: string | null;
  milestone_number: number | null;
  sort_order: number | null;
  display_order: number | null;
};

function isCompletedPhase(status: string | null | undefined): boolean {
  const normalized = (status ?? '').toLowerCase();
  return normalized === 'completed' || normalized === 'done' || normalized.includes('complete');
}

function formatPhaseLabel(phase: ProjectPhaseRow | null | undefined): string | null {
  if (!phase) return null;
  const phaseNumber = phase.name.match(/^(\d+(?:\.\d+)?)/)?.[1];
  const phasePart = phaseNumber ? `P${phaseNumber}` : phase.name;
  return phase.milestone_number ? `M${phase.milestone_number} ${phasePart}` : phasePart;
}

function pickCurrentPhases(phases: ProjectPhaseRow[]): Map<string, ProjectPhaseRow> {
  const grouped = new Map<string, ProjectPhaseRow[]>();
  for (const phase of phases) {
    const list = grouped.get(phase.project_id) ?? [];
    list.push(phase);
    grouped.set(phase.project_id, list);
  }

  const result = new Map<string, ProjectPhaseRow>();
  for (const [projectId, rows] of grouped.entries()) {
    const sorted = rows.sort((a, b) => {
      const milestoneA = a.milestone_number ?? 999;
      const milestoneB = b.milestone_number ?? 999;
      if (milestoneA !== milestoneB) return milestoneA - milestoneB;
      return (a.sort_order ?? a.display_order ?? 9999) - (b.sort_order ?? b.display_order ?? 9999);
    });
    result.set(
      projectId,
      sorted.find((phase) => !isCompletedPhase(phase.status)) ?? sorted.at(-1)!
    );
  }
  return result;
}

function newer(a: string | null | undefined, b: string | null | undefined): string | null {
  if (!a) return b ?? null;
  if (!b) return a;
  return new Date(a).getTime() >= new Date(b).getTime() ? a : b;
}

export async function getMyAdminHomeProjects(): Promise<AdminHomeProject[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !(await isUserAdmin(user.id))) return [];

  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return [];

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('id', user.id)
    .maybeSingle();

  const admin = createAdminClient();
  const [assignmentsRes, leadProjectsRes, sessionsRes, reportsRes] = await Promise.all([
    supabase
      .from('project_assignments')
      .select(
        `
        assigned_at, deadline_date, completion_requested_at,
        project:projects!project_assignments_project_id_fkey(
          id, name, status, logo_url, updated_at,
          client:clients(display_name, name)
        )
      `
      )
      .eq('employee_id', user.id)
      .eq('workspace_id', workspaceId)
      .is('removed_at', null)
      .is('completed_at', null)
      .order('assigned_at', { ascending: false }),
    supabase
      .from('projects')
      .select('id, name, status, logo_url, updated_at, client:clients(display_name, name)')
      .eq('workspace_id', workspaceId)
      .eq('lead_id', user.id)
      .or('is_finished.is.null,is_finished.eq.false')
      .order('updated_at', { ascending: false })
      .limit(30),
    supabase
      .from('work_sessions')
      .select(
        'project_id, started_at, ended_at, summary, clock_in_note, project:projects!work_sessions_project_id_fkey(id, name, status, logo_url, updated_at, client:clients(display_name, name))'
      )
      .eq('profile_id', user.id)
      .eq('workspace_id', workspaceId)
      .not('project_id', 'is', null)
      .gte('started_at', new Date(Date.now() - 45 * 86_400_000).toISOString())
      .order('started_at', { ascending: false })
      .limit(30),
    admin
      .from('session_reports')
      .select('erp_project_id, project_name, status, notes, submitted_by, submitted_at')
      .neq('dry_run', true)
      .gte('submitted_at', new Date(Date.now() - 45 * 86_400_000).toISOString())
      .order('submitted_at', { ascending: false })
      .limit(100),
  ]);

  type ProjectRef = {
    id: string;
    name: string;
    status: string | null;
    logo_url: string | null;
    updated_at?: string | null;
    client:
      | { display_name: string | null; name: string | null }
      | Array<{ display_name: string | null; name: string | null }>
      | null;
  };

  const byId = new Map<
    string,
    {
      project: ProjectRef;
      sourceLabels: Set<string>;
      lastTouchedAt: string | null;
      note: string | null;
    }
  >();

  const upsert = (
    project: ProjectRef | ProjectRef[] | null,
    source: string,
    touched?: string | null,
    note?: string | null
  ) => {
    const normalized = Array.isArray(project) ? project[0] : project;
    if (!normalized?.id) return;
    const current = byId.get(normalized.id);
    if (!current) {
      byId.set(normalized.id, {
        project: normalized,
        sourceLabels: new Set([source]),
        lastTouchedAt: touched ?? normalized.updated_at ?? null,
        note: note ?? null,
      });
      return;
    }
    current.sourceLabels.add(source);
    current.lastTouchedAt = newer(current.lastTouchedAt, touched ?? normalized.updated_at);
    if (!current.note && note) current.note = note;
  };

  for (const row of assignmentsRes.data ?? []) {
    upsert(row.project as ProjectRef | ProjectRef[] | null, 'Assigned', row.assigned_at);
  }
  for (const project of (leadProjectsRes.data ?? []) as unknown as ProjectRef[]) {
    upsert(project, 'Lead', project.updated_at ?? null);
  }
  for (const row of sessionsRes.data ?? []) {
    upsert(
      row.project as ProjectRef | ProjectRef[] | null,
      row.ended_at ? 'Recent session' : 'Working now',
      row.ended_at ?? row.started_at,
      row.summary || row.clock_in_note || null
    );
  }

  const reportAuthors = [profile?.full_name, profile?.email]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.toLowerCase());
  const reportProjectIds = new Set<string>();
  const reportsByProject = new Map<string, { submitted_at: string | null; note: string | null }>();
  for (const report of reportsRes.data ?? []) {
    const author = (report.submitted_by ?? '').toLowerCase();
    if (!report.erp_project_id || !reportAuthors.some((candidate) => author.includes(candidate))) {
      continue;
    }
    reportProjectIds.add(report.erp_project_id);
    if (!reportsByProject.has(report.erp_project_id)) {
      reportsByProject.set(report.erp_project_id, {
        submitted_at: report.submitted_at,
        note: report.notes ?? report.status ?? null,
      });
    }
  }
  if (reportProjectIds.size > 0) {
    const { data: reportProjects } = await supabase
      .from('projects')
      .select('id, name, status, logo_url, updated_at, client:clients(display_name, name)')
      .in('id', Array.from(reportProjectIds));
    for (const project of (reportProjects ?? []) as unknown as ProjectRef[]) {
      const report = reportsByProject.get(project.id);
      upsert(project, 'Recent report', report?.submitted_at ?? null, report?.note ?? null);
    }
  }

  const projectIds = Array.from(byId.keys());
  const { data: phaseRows } =
    projectIds.length > 0
      ? await supabase
          .from('project_phases')
          .select('project_id, name, status, milestone_number, sort_order, display_order')
          .in('project_id', projectIds)
          .eq('phase_type', 'phase')
      : { data: [] };
  const phasesByProject = pickCurrentPhases((phaseRows ?? []) as ProjectPhaseRow[]);

  return Array.from(byId.entries())
    .map(([id, entry]) => {
      const client = Array.isArray(entry.project.client)
        ? entry.project.client[0]
        : entry.project.client;
      const phase = phasesByProject.get(id);
      return {
        id,
        name: entry.project.name,
        clientName: client?.display_name || client?.name || null,
        logoUrl: entry.project.logo_url,
        status: entry.project.status,
        href: `/projects/${id}/roadmap`,
        phaseLabel: formatPhaseLabel(phase),
        phaseName: phase?.name ?? null,
        phaseStatus: phase?.status ?? null,
        lastTouchedAt: entry.lastTouchedAt,
        sourceLabels: Array.from(entry.sourceLabels),
        note: entry.note,
      };
    })
    .sort(
      (a, b) => new Date(b.lastTouchedAt ?? 0).getTime() - new Date(a.lastTouchedAt ?? 0).getTime()
    )
    .slice(0, 12);
}
