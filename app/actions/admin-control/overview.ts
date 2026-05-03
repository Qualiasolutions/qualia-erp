'use server';

import { createClient } from '@/lib/supabase/server';
import { getFinancialSummary } from '@/app/actions/financials';
import { isUserAdmin } from '@/app/actions/shared';
import { getCurrentWorkspaceId } from '@/app/actions/workspace';
import { loadPlanningHealth, type PlanningHealthPayload } from './planning-health';
import { loadCommandCenter, type CommandCenterPayload } from './command-center';

export type OverviewKpi = {
  label: string;
  value: string;
  delta: string | null;
  positive: boolean;
};

export type OverviewPayload = {
  kpis: OverviewKpi[];
  week: { label: string; value: string; kind: 'ok' | 'accent' | 'warn' | 'neutral' }[];
  activity: Array<{
    id: string;
    actor_name: string | null;
    actor_avatar_url: string | null;
    action_type: string;
    target_name: string | null;
    created_at: string;
  }>;
  planningHealth: PlanningHealthPayload;
  commandCenter: CommandCenterPayload;
};

function eurCompact(amount: number): string {
  if (amount >= 1000) return `€${(amount / 1000).toFixed(1)}k`;
  return `€${Math.round(amount)}`;
}

function signedDelta(value: number, unit = '', prefix = ''): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${prefix}${value}${unit}`;
}

export async function loadOverviewTab(): Promise<OverviewPayload> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !(await isUserAdmin(user.id))) {
    return {
      kpis: [],
      week: [],
      activity: [],
      planningHealth: { rows: [], totalIssues: 0 },
      commandCenter: {
        today: { clockedIn: [], notIn: [], todaysReports: [], blockers: [] },
        thisMonth: { summary: { total: 0, onTrack: 0, atRisk: 0, overdue: 0 }, projects: [] },
        moneyRisk: {
          overdueInvoices: [],
          projectsNoDeadline: [],
          staleClientActions: [],
          unbilledHours: { totalHours: 0, sessionCount: 0 },
        },
      },
    };
  }

  const workspaceId = await getCurrentWorkspaceId();

  // PH-H1: Merged two sequential Promise.all batches into one
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);

  const now = new Date();

  const [
    finSummary,
    activityDirect,
    projectsRes,
    openTasksRes,
    overdueTasksRes,
    deploymentsRes,
    sessionsRes,
    activityWeekRes,
    planningHealth,
    commandCenter,
  ] = await Promise.all([
    getFinancialSummary(),
    // Activity feed: recent task completions — the activity_log table is not
    // wired up, so instead we read from the tasks table (which actually has
    // data). Each row tells the operator "{actor} completed {target}".
    supabase
      .from('tasks')
      .select(
        `
        id,
        title,
        completed_at,
        assignee:profiles!tasks_assignee_id_fkey (id, full_name, avatar_url),
        project:projects!tasks_project_id_fkey (id, name)
      `
      )
      .eq('status', 'Done')
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(10),
    supabase
      .from('projects')
      .select('id, status', { count: 'exact', head: false })
      .in('status', ['Active', 'Delayed'])
      .eq('workspace_id', workspaceId ?? ''),
    // Item 17: head-only count for open tasks (no row data needed)
    supabase
      .from('issues')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId ?? '')
      .neq('status', 'Done'),
    // Item 17: head-only count for overdue tasks
    supabase
      .from('issues')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId ?? '')
      .neq('status', 'Done')
      .lt('due_date', now.toISOString()),
    supabase.from('project_deployments').select('id').gte('created_at', weekStart.toISOString()),
    supabase
      .from('work_sessions')
      .select('duration_seconds')
      .gte('started_at', weekStart.toISOString()),
    supabase.from('activity_log').select('action_type').gte('created_at', weekStart.toISOString()),
    loadPlanningHealth(),
    loadCommandCenter(),
  ]);

  const activeProjectsCount = projectsRes.data?.length ?? 0;
  const attentionCount =
    projectsRes.data?.filter((p: { status: string }) => p.status === 'Delayed').length ?? 0;

  const openTasksCount = openTasksRes.count ?? 0;
  const overdue = overdueTasksRes.count ?? 0;

  const mrr = finSummary?.thisMonthCollected ?? 0;
  const mrrDelta = finSummary ? finSummary.thisMonthCollected - finSummary.lastMonthCollected : 0;

  const kpis: OverviewKpi[] = [
    {
      label: 'Active projects',
      value: String(activeProjectsCount),
      delta: attentionCount > 0 ? `${attentionCount} attention` : null,
      positive: attentionCount === 0,
    },
    {
      label: 'MRR',
      value: eurCompact(mrr),
      delta: signedDelta(Math.round(mrrDelta), '', '€'),
      positive: mrrDelta >= 0,
    },
    {
      label: 'Open tasks',
      value: String(openTasksCount),
      delta: overdue > 0 ? `${overdue} overdue` : null,
      positive: overdue === 0,
    },
    {
      label: 'Outstanding',
      value: eurCompact(finSummary?.totalOutstanding ?? 0),
      delta: finSummary ? `${finSummary.overdueInvoices.length} overdue` : null,
      positive: (finSummary?.overdueInvoices.length ?? 0) === 0,
    },
  ];

  const hoursLogged =
    (sessionsRes.data ?? []).reduce(
      (sum: number, s: { duration_seconds: number | null }) => sum + (s.duration_seconds ?? 0),
      0
    ) / 3600;

  const activityTypes = (activityWeekRes.data ?? []).map(
    (a: { action_type: string }) => a.action_type
  );
  const tasksShipped = activityTypes.filter((t) => t === 'task_completed').length;
  const requestsCount = activityTypes.filter((t) => t === 'feature_request').length;

  const week = [
    {
      label: 'Tasks shipped',
      value: String(tasksShipped),
      kind: 'ok' as const,
    },
    {
      label: 'Hours logged',
      value: hoursLogged.toFixed(1),
      kind: 'neutral' as const,
    },
    {
      label: 'Deploys',
      value: String(deploymentsRes.data?.length ?? 0),
      kind: 'accent' as const,
    },
    {
      label: 'New requests',
      value: String(requestsCount),
      kind: 'warn' as const,
    },
  ];

  const activityList: OverviewPayload['activity'] = (activityDirect.data ?? []).map((row) => {
    const r = row as unknown as {
      id: string;
      title: string | null;
      completed_at: string | null;
      assignee:
        | { full_name: string | null; avatar_url: string | null }
        | null
        | Array<{ full_name: string | null; avatar_url: string | null }>;
      project: { name: string | null } | null | Array<{ name: string | null }>;
    };
    const assignee = Array.isArray(r.assignee) ? r.assignee[0] : r.assignee;
    const project = Array.isArray(r.project) ? r.project[0] : r.project;
    return {
      id: r.id,
      actor_name: assignee?.full_name ?? null,
      actor_avatar_url: assignee?.avatar_url ?? null,
      action_type: 'completed',
      target_name: r.title
        ? project?.name
          ? `${r.title} · ${project.name}`
          : r.title
        : (project?.name ?? null),
      created_at: r.completed_at ?? new Date(0).toISOString(),
    };
  });

  return { kpis, week, activity: activityList, planningHealth, commandCenter };
}
