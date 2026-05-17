'use server';

import { createClient } from '@/lib/supabase/server';
import { isUserAdmin } from '@/app/actions/shared';
import { getCurrentWorkspaceId } from '@/app/actions/workspace';

/**
 * Command Center — the dense ops bridge that replaces the Overview vanity KPIs.
 *
 * Three columns:
 *   TODAY        — clock-in status, today's reports, open blockers
 *   THIS MONTH   — every active project with deadline, health, progress
 *   MONEY & RISK — overdue invoices, projects without deadlines, stale client actions
 *
 * Owner-only data is loaded server-side; component stays read-only.
 */

export type ClockedInRow = {
  id: string;
  profileId: string | null;
  name: string | null;
  avatarUrl: string | null;
  projectName: string | null;
  projectId: string | null;
  plannedDurationMin: number | null;
  clockInNote: string | null;
  startedAt: string;
  elapsedMin: number;
};

export type AbsentEmployeeRow = {
  id: string;
  name: string | null;
  avatarUrl: string | null;
};

export type DoneTodayRow = {
  id: string;
  name: string | null;
  avatarUrl: string | null;
  lastEndedAt: string;
  totalMinutes: number;
  projectName: string | null;
};

export type TodayReportRow = {
  id: string;
  projectName: string;
  submittedBy: string | null;
  status: string;
  verification: string | null;
  tasksDone: number | null;
  tasksTotal: number | null;
  submittedAt: string;
  deployedUrl: string | null;
};

export type BlockerRow = {
  id: string;
  projectName: string;
  submittedBy: string | null;
  gapCycles: number;
  notes: string | null;
  submittedAt: string;
};

export type MonthProjectRow = {
  id: string;
  name: string;
  clientName: string | null;
  targetDate: string | null;
  daysToTarget: number | null;
  health: 'green' | 'amber' | 'red' | 'unknown';
  progress: number;
  lastReportAt: string | null;
};

export type OverdueInvoiceRow = {
  id: string;
  invoiceNumber: string;
  customerName: string;
  balance: number;
  currency: string;
  daysOverdue: number;
  pdfUrl: string | null;
};

export type ProjectNoDeadlineRow = {
  id: string;
  name: string;
  clientName: string | null;
};

export type StaleActionRow = {
  id: string;
  title: string;
  clientName: string | null;
  projectName: string | null;
  daysStale: number;
};

export type CommandCenterPayload = {
  today: {
    clockedIn: ClockedInRow[];
    notIn: AbsentEmployeeRow[];
    doneToday: DoneTodayRow[];
    todaysReports: TodayReportRow[];
    blockers: BlockerRow[];
  };
  thisMonth: {
    summary: { total: number; onTrack: number; atRisk: number; overdue: number };
    projects: MonthProjectRow[];
  };
  moneyRisk: {
    overdueInvoices: OverdueInvoiceRow[];
    projectsNoDeadline: ProjectNoDeadlineRow[];
    staleClientActions: StaleActionRow[];
    unbilledHours: { totalHours: number; sessionCount: number };
  };
};

const STALE_DAYS_THRESHOLD = 7;
const ACTIVE_PROJECT_STATUSES = ['Active', 'Demos', 'Launched', 'Delayed'];

const EMPTY: CommandCenterPayload = {
  today: { clockedIn: [], notIn: [], doneToday: [], todaysReports: [], blockers: [] },
  thisMonth: { summary: { total: 0, onTrack: 0, atRisk: 0, overdue: 0 }, projects: [] },
  moneyRisk: {
    overdueInvoices: [],
    projectsNoDeadline: [],
    staleClientActions: [],
    unbilledHours: { totalHours: 0, sessionCount: 0 },
  },
};

function startOfDayISO(): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

function startOfMonthISO(): string {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
}

function daysBetween(a: Date, b: Date): number {
  const ms = a.getTime() - b.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

function classifyHealth(
  targetDate: string | null,
  progress: number,
  lastReportAt: string | null
): MonthProjectRow['health'] {
  if (!targetDate) return 'unknown';
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const target = new Date(targetDate);
  const daysToTarget = daysBetween(target, today);

  // Past deadline and not finished → red
  if (daysToTarget < 0 && progress < 100) return 'red';

  // Within 7 days and significantly behind → amber
  if (daysToTarget <= 7 && progress < 80) return 'amber';

  // No activity in 14 days on a project with a deadline → amber
  if (lastReportAt) {
    const reportAge = daysBetween(today, new Date(lastReportAt));
    if (reportAge > 14 && daysToTarget < 30) return 'amber';
  }

  return 'green';
}

/**
 * Internal variant — caller has already verified admin auth and resolved
 * workspace. Skips redundant DB round trips. Use this when called from
 * another server action that already authenticated.
 *
 * Multi-tenancy note: `session_reports` and `client_activities` lack a
 * `workspace_id` column. Today, single-tenant deployment makes this a
 * non-issue. If tenancy is ever added, scope these via `erp_project_id`
 * and `client_id` joins respectively.
 */
export async function loadCommandCenterFor(workspaceId: string): Promise<CommandCenterPayload> {
  const supabase = await createClient();
  return loadCommandCenterInternal(supabase, workspaceId);
}

export async function loadCommandCenter(): Promise<CommandCenterPayload> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !(await isUserAdmin(user.id))) return EMPTY;

  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return EMPTY;
  return loadCommandCenterInternal(supabase, workspaceId);
}

async function loadCommandCenterInternal(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workspaceId: string
): Promise<CommandCenterPayload> {
  const todayISO = startOfDayISO();
  const monthStartISO = startOfMonthISO();
  const staleThresholdISO = new Date(
    Date.now() - STALE_DAYS_THRESHOLD * 24 * 60 * 60 * 1000
  ).toISOString();

  const [
    clockedInRes,
    todaysSessionsRes,
    employeesRes,
    todaysReportsRes,
    blockersRes,
    activeProjectsRes,
    overdueInvoicesRes,
    projectsNoDeadlineRes,
    staleActionsRes,
    monthSessionsRes,
  ] = await Promise.all([
    // Clocked in right now (started today, not ended)
    supabase
      .from('work_sessions')
      .select(
        `
        id, started_at, planned_duration_minutes, clock_in_note, project_id,
        profile:profiles!work_sessions_profile_id_fkey (id, full_name, avatar_url),
        project:projects!work_sessions_project_id_fkey (id, name)
      `
      )
      .eq('workspace_id', workspaceId)
      .gte('started_at', todayISO)
      .is('ended_at', null)
      .order('started_at', { ascending: true }),

    // All work sessions today (for "did clock in" + "done today" derivation)
    supabase
      .from('work_sessions')
      .select(
        `
        profile_id, started_at, ended_at, duration_minutes,
        project:projects!work_sessions_project_id_fkey (id, name)
      `
      )
      .eq('workspace_id', workspaceId)
      .gte('started_at', todayISO),

    // All active employees (to compute "not in")
    supabase
      .from('profiles')
      .select('id, full_name, avatar_url, email')
      .eq('role', 'employee')
      .order('full_name'),

    // Today's session reports — most recent 10
    supabase
      .from('session_reports')
      .select(
        'id, project_name, submitted_by, status, verification, tasks_done, tasks_total, submitted_at, deployed_url'
      )
      .neq('dry_run', true)
      .gte('submitted_at', todayISO)
      .order('submitted_at', { ascending: false })
      .limit(10),

    // Open blockers — failed verification with gap cycles, last 5
    supabase
      .from('session_reports')
      .select('id, project_name, submitted_by, gap_cycles, notes, submitted_at')
      .neq('dry_run', true)
      .eq('verification', 'fail')
      .gt('gap_cycles', 0)
      .order('submitted_at', { ascending: false })
      .limit(5),

    // Active projects (this month view)
    supabase
      .from('projects')
      .select(
        `
        id, name, target_date, progress,
        client:clients!projects_client_id_fkey (id, name)
      `
      )
      .eq('workspace_id', workspaceId)
      .in('status', ACTIVE_PROJECT_STATUSES)
      .order('target_date', { ascending: true, nullsFirst: false })
      .limit(50),

    // Overdue invoices
    supabase
      .from('financial_invoices')
      .select(
        'zoho_id, invoice_number, customer_name, balance, currency_code, due_date, pdf_url, status'
      )
      .gt('balance', 0)
      .neq('is_hidden', true)
      .or(`status.eq.overdue,due_date.lt.${todayISO.slice(0, 10)}`)
      .order('due_date', { ascending: true })
      .limit(20),

    // Active projects without a target date
    supabase
      .from('projects')
      .select(
        `
        id, name,
        client:clients!projects_client_id_fkey (id, name)
      `
      )
      .eq('workspace_id', workspaceId)
      .in('status', ACTIVE_PROJECT_STATUSES)
      .is('target_date', null)
      .limit(20),

    // Stale client action items (uncompleted + older than 7d)
    supabase
      .from('client_action_items')
      .select(
        `
        id, title, created_at, due_date,
        client:clients!client_action_items_client_id_fkey (id, name),
        project:projects!client_action_items_project_id_fkey (id, name)
      `
      )
      .is('completed_at', null)
      .lt('created_at', staleThresholdISO)
      .order('created_at', { ascending: true })
      .limit(20),

    // Total work session minutes this month — for unbilled hours
    supabase
      .from('work_sessions')
      .select('duration_minutes', { count: 'exact', head: false })
      .eq('workspace_id', workspaceId)
      .gte('started_at', monthStartISO)
      .not('duration_minutes', 'is', null),
  ]);

  /* ------------------------------------------------------------------ */
  /*  TODAY                                                              */
  /* ------------------------------------------------------------------ */

  const now = Date.now();
  type ClockedInRaw = {
    id: string;
    started_at: string;
    planned_duration_minutes: number | null;
    clock_in_note: string | null;
    project_id: string | null;
    profile:
      | { id: string; full_name: string | null; avatar_url: string | null }
      | Array<{ id: string; full_name: string | null; avatar_url: string | null }>
      | null;
    project:
      | { id: string; name: string | null }
      | Array<{ id: string; name: string | null }>
      | null;
  };
  const clockedIn: ClockedInRow[] = ((clockedInRes.data as ClockedInRaw[] | null) ?? []).map(
    (row) => {
      const profile = Array.isArray(row.profile) ? row.profile[0] : row.profile;
      const project = Array.isArray(row.project) ? row.project[0] : row.project;
      const startedMs = new Date(row.started_at).getTime();
      return {
        id: row.id,
        profileId: profile?.id ?? null,
        name: profile?.full_name ?? null,
        avatarUrl: profile?.avatar_url ?? null,
        projectName: project?.name ?? null,
        projectId: project?.id ?? null,
        plannedDurationMin: row.planned_duration_minutes,
        clockInNote: row.clock_in_note,
        startedAt: row.started_at,
        elapsedMin: Math.max(0, Math.round((now - startedMs) / 60000)),
      };
    }
  );

  // Profiles currently on the clock (active session right now).
  const currentlyClockedInIds = new Set<string>(
    ((clockedInRes.data as ClockedInRaw[] | null) ?? [])
      .map((r) => (Array.isArray(r.profile) ? r.profile[0]?.id : r.profile?.id))
      .filter((id): id is string => Boolean(id))
  );

  // Aggregate today's sessions per profile so we can split absent vs done-today.
  type TodaySessionRaw = {
    profile_id: string | null;
    started_at: string | null;
    ended_at: string | null;
    duration_minutes: number | null;
    project:
      | { id: string; name: string | null }
      | Array<{ id: string; name: string | null }>
      | null;
  };
  const sessionsTodayRaw = (todaysSessionsRes.data as TodaySessionRaw[] | null) ?? [];
  const allTodayProfileIds = new Set<string>(
    sessionsTodayRaw.map((s) => s.profile_id).filter((id): id is string => Boolean(id))
  );

  const doneTodayAgg = new Map<
    string,
    { lastEndedAt: string; totalMinutes: number; projectName: string | null }
  >();
  for (const s of sessionsTodayRaw) {
    if (!s.profile_id || !s.ended_at) continue;
    if (currentlyClockedInIds.has(s.profile_id)) continue;
    const project = Array.isArray(s.project) ? s.project[0] : s.project;
    const existing = doneTodayAgg.get(s.profile_id);
    const totalMinutes = (existing?.totalMinutes ?? 0) + (s.duration_minutes ?? 0);
    const isLater = !existing || new Date(s.ended_at) > new Date(existing.lastEndedAt);
    doneTodayAgg.set(s.profile_id, {
      lastEndedAt: isLater ? s.ended_at : existing!.lastEndedAt,
      totalMinutes,
      projectName: isLater ? (project?.name ?? null) : (existing?.projectName ?? null),
    });
  }

  type EmployeeRow = { id: string; full_name: string | null; avatar_url: string | null };
  const employees = (employeesRes.data as EmployeeRow[] | null) ?? [];

  const notIn: AbsentEmployeeRow[] = employees
    .filter((emp) => !allTodayProfileIds.has(emp.id))
    .map((emp) => ({ id: emp.id, name: emp.full_name, avatarUrl: emp.avatar_url }));

  const doneToday: DoneTodayRow[] = employees
    .filter((emp) => doneTodayAgg.has(emp.id))
    .map((emp) => {
      const agg = doneTodayAgg.get(emp.id)!;
      return {
        id: emp.id,
        name: emp.full_name,
        avatarUrl: emp.avatar_url,
        lastEndedAt: agg.lastEndedAt,
        totalMinutes: agg.totalMinutes,
        projectName: agg.projectName,
      };
    })
    .sort((a, b) => new Date(b.lastEndedAt).getTime() - new Date(a.lastEndedAt).getTime());

  type ReportRaw = {
    id: string;
    project_name: string | null;
    submitted_by: string | null;
    status: string | null;
    verification: string | null;
    tasks_done: number | null;
    tasks_total: number | null;
    submitted_at: string | null;
    deployed_url: string | null;
  };
  const todaysReports: TodayReportRow[] = ((todaysReportsRes.data as ReportRaw[] | null) ?? []).map(
    (r) => ({
      id: r.id,
      projectName: r.project_name ?? '—',
      submittedBy: r.submitted_by,
      status: r.status ?? '—',
      verification: r.verification,
      tasksDone: r.tasks_done,
      tasksTotal: r.tasks_total,
      submittedAt: r.submitted_at ?? new Date(0).toISOString(),
      deployedUrl: r.deployed_url,
    })
  );

  type BlockerRaw = {
    id: string;
    project_name: string | null;
    submitted_by: string | null;
    gap_cycles: number | null;
    notes: string | null;
    submitted_at: string | null;
  };
  const blockers: BlockerRow[] = ((blockersRes.data as BlockerRaw[] | null) ?? []).map((r) => ({
    id: r.id,
    projectName: r.project_name ?? '—',
    submittedBy: r.submitted_by,
    gapCycles: r.gap_cycles ?? 0,
    notes: r.notes,
    submittedAt: r.submitted_at ?? new Date(0).toISOString(),
  }));

  /* ------------------------------------------------------------------ */
  /*  THIS MONTH                                                         */
  /* ------------------------------------------------------------------ */

  type ProjectRaw = {
    id: string;
    name: string;
    target_date: string | null;
    progress: number | null;
    client: { id: string; name: string | null } | Array<{ id: string; name: string | null }> | null;
  };
  const projectIds = ((activeProjectsRes.data as ProjectRaw[] | null) ?? []).map((p) => p.id);

  // Pull last report timestamp per project (single grouped query)
  const lastReportByProjectId = new Map<string, string>();
  if (projectIds.length > 0) {
    const lastReportsRes = await supabase
      .from('session_reports')
      .select('erp_project_id, submitted_at')
      .in('erp_project_id', projectIds)
      .neq('dry_run', true)
      .order('submitted_at', { ascending: false })
      .limit(200);
    for (const row of (lastReportsRes.data as Array<{
      erp_project_id: string | null;
      submitted_at: string | null;
    }> | null) ?? []) {
      if (
        row.erp_project_id &&
        row.submitted_at &&
        !lastReportByProjectId.has(row.erp_project_id)
      ) {
        lastReportByProjectId.set(row.erp_project_id, row.submitted_at);
      }
    }
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const monthProjects: MonthProjectRow[] = (
    (activeProjectsRes.data as ProjectRaw[] | null) ?? []
  ).map((p) => {
    const client = Array.isArray(p.client) ? p.client[0] : p.client;
    const lastReportAt = lastReportByProjectId.get(p.id) ?? null;
    const progress = p.progress ?? 0;
    const daysToTarget = p.target_date ? daysBetween(new Date(p.target_date), today) : null;
    const health = classifyHealth(p.target_date, progress, lastReportAt);
    return {
      id: p.id,
      name: p.name,
      clientName: client?.name ?? null,
      targetDate: p.target_date,
      daysToTarget,
      health,
      progress,
      lastReportAt,
    };
  });

  const summary = monthProjects.reduce(
    (acc, p) => {
      acc.total += 1;
      if (p.health === 'green') acc.onTrack += 1;
      else if (p.health === 'amber') acc.atRisk += 1;
      else if (p.health === 'red') acc.overdue += 1;
      return acc;
    },
    { total: 0, onTrack: 0, atRisk: 0, overdue: 0 }
  );

  /* ------------------------------------------------------------------ */
  /*  MONEY & RISK                                                       */
  /* ------------------------------------------------------------------ */

  type InvoiceRaw = {
    zoho_id: string;
    invoice_number: string | null;
    customer_name: string | null;
    balance: number | null;
    currency_code: string | null;
    due_date: string | null;
    pdf_url: string | null;
  };
  const overdueInvoices: OverdueInvoiceRow[] = (
    (overdueInvoicesRes.data as InvoiceRaw[] | null) ?? []
  )
    .filter((inv) => (inv.balance ?? 0) > 0)
    .map((inv) => {
      const due = inv.due_date ? new Date(inv.due_date) : null;
      const daysOverdue = due ? Math.max(0, daysBetween(today, due)) : 0;
      return {
        id: inv.zoho_id,
        invoiceNumber: inv.invoice_number ?? '—',
        customerName: inv.customer_name ?? '—',
        balance: inv.balance ?? 0,
        currency: inv.currency_code ?? 'EUR',
        daysOverdue,
        pdfUrl: inv.pdf_url,
      };
    });

  type PNDRaw = {
    id: string;
    name: string;
    client: { id: string; name: string | null } | Array<{ id: string; name: string | null }> | null;
  };
  const projectsNoDeadline: ProjectNoDeadlineRow[] = (
    (projectsNoDeadlineRes.data as PNDRaw[] | null) ?? []
  ).map((p) => {
    const client = Array.isArray(p.client) ? p.client[0] : p.client;
    return { id: p.id, name: p.name, clientName: client?.name ?? null };
  });

  type StaleRaw = {
    id: string;
    title: string;
    created_at: string;
    due_date: string | null;
    client: { id: string; name: string | null } | Array<{ id: string; name: string | null }> | null;
    project:
      | { id: string; name: string | null }
      | Array<{ id: string; name: string | null }>
      | null;
  };
  const staleClientActions: StaleActionRow[] = (
    (staleActionsRes.data as StaleRaw[] | null) ?? []
  ).map((row) => {
    const client = Array.isArray(row.client) ? row.client[0] : row.client;
    const project = Array.isArray(row.project) ? row.project[0] : row.project;
    const daysStale = daysBetween(today, new Date(row.created_at));
    return {
      id: row.id,
      title: row.title,
      clientName: client?.name ?? null,
      projectName: project?.name ?? null,
      daysStale,
    };
  });

  const totalMinutes = (
    (monthSessionsRes.data as Array<{ duration_minutes: number | null }> | null) ?? []
  ).reduce((sum, s) => sum + (s.duration_minutes ?? 0), 0);

  return {
    today: { clockedIn, notIn, doneToday, todaysReports, blockers },
    thisMonth: { summary, projects: monthProjects },
    moneyRisk: {
      overdueInvoices,
      projectsNoDeadline,
      staleClientActions,
      unbilledHours: {
        totalHours: Math.round((totalMinutes / 60) * 10) / 10,
        sessionCount: monthSessionsRes.count ?? 0,
      },
    },
  };
}
