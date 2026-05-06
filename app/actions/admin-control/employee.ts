'use server';

import { createClient } from '@/lib/supabase/server';
import { isUserAdmin } from '@/app/actions/shared';
import { getCurrentWorkspaceId } from '@/app/actions/workspace';
import { hueFromId } from '@/lib/color-constants';
import type { Database } from '@/types/database';

type TaskRow = Database['public']['Tables']['tasks']['Row'];
type TaskStatus = Database['public']['Enums']['task_status'];
type TaskPriority = Database['public']['Enums']['task_priority'];

const ACTIVE_STATUSES: TaskStatus[] = ['Todo', 'In Progress'];

/* ------------------------------------------------------------------ *
 * Period helpers — period bounds are computed in UTC (no TZ headache).
 * ------------------------------------------------------------------ */

export type Period = 'this_week' | 'last_7d' | 'this_month' | 'last_30d';

function periodBounds(period: Period, now = new Date()): { start: Date; end: Date } {
  const end = new Date(now);
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  switch (period) {
    case 'this_week': {
      const day = start.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      start.setDate(start.getDate() + diff);
      break;
    }
    case 'last_7d':
      start.setDate(start.getDate() - 6);
      break;
    case 'this_month':
      start.setDate(1);
      break;
    case 'last_30d':
      start.setDate(start.getDate() - 29);
      break;
  }
  return { start, end };
}

/* ------------------------------------------------------------------ *
 * Public payload shapes
 * ------------------------------------------------------------------ */

export type EmployeeTaskStub = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  projectId: string | null;
  projectName: string | null;
  dueDate: string | null;
  updatedAt: string;
  completedAt: string | null;
  isOverdue: boolean;
  ageDays: number;
};

export type EmployeeSummary = {
  hoursThisPeriod: number;
  tasksCompleted: number;
  tasksTotal: number; // assigned during the period (completed + still-open created in period)
  completionPct: number | null;
  carryoverPct: number | null;
  averageMood: number | null; // 1-5
  averageEnergy: number | null;
  hoursDeltaPct: number | null; // vs previous equivalent period
  tasksDeltaPct: number | null;
};

export type EmployeeProjectSplit = {
  projectId: string | null;
  projectName: string;
  hours: number;
  hue: number;
};

export type HoursHeatmapWeek = {
  weekStart: string; // ISO date (Mon)
  hoursByDay: number[]; // 7 entries Mon..Sun
};

export type LatestCheckin = {
  date: string;
  mood: number | null;
  energy: number | null;
  blockers: string | null;
  wins: string | null;
  tomorrowPlan: string | null;
};

export type EmployeeProfilePayload = {
  profile: {
    id: string;
    fullName: string | null;
    email: string | null;
    avatarUrl: string | null;
    role: string | null;
  };
  isOnline: boolean;
  liveSessionStartedAt: string | null;
  liveSessionProjectName: string | null;
  period: Period;
  periodLabel: string;
  summary: EmployeeSummary;
  inProgress: EmployeeTaskStub[];
  todo: EmployeeTaskStub[];
  doneInPeriod: EmployeeTaskStub[];
  overdue: EmployeeTaskStub[];
  projectSplit: EmployeeProjectSplit[];
  hoursHeatmap: HoursHeatmapWeek[]; // last 12 weeks
  latestCheckin: LatestCheckin | null;
};

/* ------------------------------------------------------------------ *
 * Trends tab payload (8-week history)
 * ------------------------------------------------------------------ */

export type WeeklyPoint = {
  weekStart: string;
  value: number;
};

export type EmployeeTrendsPayload = {
  velocityWeekly: WeeklyPoint[]; // tasks-done per week, 8 weeks
  hoursWeekly: WeeklyPoint[]; // hours per week, 8 weeks
  completionRateWeekly: WeeklyPoint[]; // % complete per week, 8 weeks (0-100)
  moodSparkline: number[]; // last 30 daily_checkins (oldest -> newest)
  energySparkline: number[]; // last 30 daily_checkins
  averageDaysToClose: number | null; // for the 8-week window
  hoursPerCompletedTask: number | null;
};

/* ------------------------------------------------------------------ *
 * History tab payload (paged session feed enriched with reports)
 * ------------------------------------------------------------------ */

export type SessionFeedRow = {
  sessionId: string;
  startedAt: string;
  endedAt: string | null;
  durationMinutes: number;
  projectId: string | null;
  projectName: string | null;
  summary: string | null;
  hue: number;
  // session_reports enrichment (matched by submitted_by full_name OR email + same day)
  report: {
    id: string;
    commitsCount: number;
    tasksDone: number | null;
    tasksTotal: number | null;
    deployCount: number | null;
    gapCycles: number | null;
    milestone: string | null;
    verification: string | null;
    notes: string | null;
  } | null;
};

export type EmployeeHistoryPayload = {
  rows: SessionFeedRow[];
  hasMore: boolean;
};

/* ================================================================== *
 *  Profile (Tasks tab) loader
 * ================================================================== */

async function ensureAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !(await isUserAdmin(user.id))) return null;
  return user;
}

export async function getEmployeeProfile(
  profileId: string,
  period: Period = 'this_week'
): Promise<EmployeeProfilePayload | null> {
  const user = await ensureAdmin();
  if (!user) return null;
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return null;

  const supabase = await createClient();
  const { start: periodStart, end: periodEnd } = periodBounds(period);
  const periodMs = periodEnd.getTime() - periodStart.getTime();
  const prevStart = new Date(periodStart.getTime() - periodMs);

  // 12-week heatmap window (Mon-aligned)
  const heatmapStart = new Date();
  heatmapStart.setHours(0, 0, 0, 0);
  const dow = heatmapStart.getDay();
  heatmapStart.setDate(heatmapStart.getDate() + (dow === 0 ? -6 : 1 - dow));
  heatmapStart.setDate(heatmapStart.getDate() - 7 * 11);

  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);

  const [profileRes, tasksRes, sessionsRes, prevSessionsRes, prevTasksRes, checkinRes, liveRes] =
    await Promise.all([
      supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, role')
        .eq('id', profileId)
        .maybeSingle(),
      supabase
        .from('tasks')
        .select(
          `id, title, status, priority, project_id, due_date, updated_at, completed_at, created_at,
           project:projects!tasks_project_id_fkey (id, name)`
        )
        .eq('workspace_id', workspaceId)
        .eq('assignee_id', profileId)
        .or(
          `status.in.(${ACTIVE_STATUSES.join(',')}),and(status.eq.Done,completed_at.gte.${periodStart.toISOString()})`
        )
        .order('due_date', { ascending: true, nullsFirst: false })
        .order('priority', { ascending: false }),
      supabase
        .from('work_sessions')
        .select(
          'id, project_id, started_at, ended_at, duration_minutes, project:projects!work_sessions_project_id_fkey (id, name)'
        )
        .eq('workspace_id', workspaceId)
        .eq('profile_id', profileId)
        .gte('started_at', heatmapStart.toISOString()),
      supabase
        .from('work_sessions')
        .select('id, duration_minutes, started_at, ended_at')
        .eq('workspace_id', workspaceId)
        .eq('profile_id', profileId)
        .gte('started_at', prevStart.toISOString())
        .lt('started_at', periodStart.toISOString()),
      supabase
        .from('tasks')
        .select('id, status, completed_at, created_at')
        .eq('workspace_id', workspaceId)
        .eq('assignee_id', profileId)
        .or(`completed_at.gte.${prevStart.toISOString()},created_at.gte.${prevStart.toISOString()}`)
        .lt('created_at', periodStart.toISOString()),
      supabase
        .from('daily_checkins')
        .select('checkin_date, mood, energy_level, blockers, wins, tomorrow_plan')
        .eq('workspace_id', workspaceId)
        .eq('profile_id', profileId)
        .order('checkin_date', { ascending: false })
        .limit(30),
      supabase
        .from('work_sessions')
        .select('id, started_at, project:projects!work_sessions_project_id_fkey (id, name)')
        .eq('workspace_id', workspaceId)
        .eq('profile_id', profileId)
        .is('ended_at', null)
        .order('started_at', { ascending: false })
        .limit(1),
    ]);

  if (!profileRes.data) return null;
  const profile = profileRes.data;

  type RawTask = TaskRow & {
    project:
      | { id: string; name: string | null }
      | Array<{ id: string; name: string | null }>
      | null;
  };
  const rawTasks = (tasksRes.data as RawTask[] | null) ?? [];

  const stub = (t: RawTask): EmployeeTaskStub => {
    const project = Array.isArray(t.project) ? t.project[0] : t.project;
    const ageDays = Math.max(
      0,
      Math.floor((Date.now() - new Date(t.created_at).getTime()) / 86_400_000)
    );
    const isOverdue =
      !!t.due_date &&
      new Date(`${t.due_date}T00:00:00`) < todayMidnight &&
      ACTIVE_STATUSES.includes(t.status);
    return {
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      projectId: t.project_id,
      projectName: project?.name ?? null,
      dueDate: t.due_date,
      updatedAt: t.updated_at,
      completedAt: t.completed_at,
      isOverdue,
      ageDays,
    };
  };

  const inProgress = rawTasks.filter((t) => t.status === 'In Progress').map(stub);
  const todo = rawTasks.filter((t) => t.status === 'Todo').map(stub);
  const doneInPeriod = rawTasks
    .filter((t) => t.status === 'Done' && t.completed_at && new Date(t.completed_at) >= periodStart)
    .map(stub);
  const overdue = rawTasks.filter((t) => stub(t).isOverdue).map(stub);

  // Sessions in period for hours total
  type RawSession = {
    id: string;
    project_id: string | null;
    started_at: string;
    ended_at: string | null;
    duration_minutes: number | null;
    project:
      | { id: string; name: string | null }
      | Array<{ id: string; name: string | null }>
      | null;
  };
  const allSessions = (sessionsRes.data as RawSession[] | null) ?? [];

  const minutesIn = (s: RawSession): number => {
    if (s.duration_minutes != null) return s.duration_minutes;
    if (!s.ended_at) {
      return Math.max(0, Math.round((Date.now() - new Date(s.started_at).getTime()) / 60000));
    }
    return Math.max(
      0,
      Math.round((new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 60000)
    );
  };

  const sessionsThisPeriod = allSessions.filter((s) => new Date(s.started_at) >= periodStart);
  const hoursThisPeriod = sessionsThisPeriod.reduce((sum, s) => sum + minutesIn(s), 0) / 60;

  const prevSessions = (prevSessionsRes.data as RawSession[] | null) ?? [];
  const prevHours = prevSessions.reduce((sum, s) => sum + (s.duration_minutes ?? 0), 0) / 60;

  // Project split (hours per project, this period)
  const projectHours = new Map<string, { hours: number; name: string | null; id: string | null }>();
  for (const s of sessionsThisPeriod) {
    const project = Array.isArray(s.project) ? s.project[0] : s.project;
    const key = s.project_id ?? '__none__';
    const existing = projectHours.get(key) ?? {
      hours: 0,
      name: project?.name ?? null,
      id: s.project_id,
    };
    existing.hours += minutesIn(s) / 60;
    projectHours.set(key, existing);
  }
  const projectSplit: EmployeeProjectSplit[] = Array.from(projectHours.entries())
    .map(([key, v]) => ({
      projectId: v.id,
      projectName: v.name ?? 'Untracked',
      hours: Math.round(v.hours * 10) / 10,
      hue: hueFromId(key),
    }))
    .sort((a, b) => b.hours - a.hours);

  // Heatmap — 12 weeks × 7 days
  const weeks: HoursHeatmapWeek[] = [];
  for (let w = 0; w < 12; w++) {
    const ws = new Date(heatmapStart);
    ws.setDate(ws.getDate() + 7 * w);
    weeks.push({ weekStart: ws.toISOString().slice(0, 10), hoursByDay: [0, 0, 0, 0, 0, 0, 0] });
  }
  const weekIndex = (d: Date) =>
    Math.floor((d.getTime() - heatmapStart.getTime()) / (7 * 86_400_000));
  const dayIndex = (d: Date) => {
    const dd = d.getDay();
    return dd === 0 ? 6 : dd - 1; // Mon..Sun => 0..6
  };
  for (const s of allSessions) {
    const d = new Date(s.started_at);
    const wi = weekIndex(d);
    if (wi < 0 || wi >= weeks.length) continue;
    const di = dayIndex(d);
    weeks[wi].hoursByDay[di] += minutesIn(s) / 60;
  }
  for (const w of weeks) w.hoursByDay = w.hoursByDay.map((h) => Math.round(h * 10) / 10);

  // Period delta % vs previous equivalent window
  const tasksCompleted = doneInPeriod.length;
  const tasksOpenedInPeriod = rawTasks.filter((t) => new Date(t.created_at) >= periodStart).length;
  const tasksTotal = tasksCompleted + tasksOpenedInPeriod;
  const completionPct = tasksTotal > 0 ? Math.round((tasksCompleted / tasksTotal) * 100) : null;

  // Carryover %: tasks created in previous period that didn't complete in that period
  const prevTasks =
    (prevTasksRes.data as Array<{
      id: string;
      status: string;
      completed_at: string | null;
      created_at: string;
    }> | null) ?? [];
  const prevTasksCreated = prevTasks.filter(
    (t) => new Date(t.created_at) >= prevStart && new Date(t.created_at) < periodStart
  );
  const prevTasksCarriedOver = prevTasksCreated.filter(
    (t) => !t.completed_at || new Date(t.completed_at) >= periodStart
  );
  const carryoverPct =
    prevTasksCreated.length > 0
      ? Math.round((prevTasksCarriedOver.length / prevTasksCreated.length) * 100)
      : null;

  const checkinRows =
    (checkinRes.data as Array<{
      checkin_date: string;
      mood: number | null;
      energy_level: number | null;
      blockers: string | null;
      wins: string | null;
      tomorrow_plan: string | null;
    }> | null) ?? [];
  const moodValues = checkinRows.map((c) => c.mood).filter((m): m is number => m != null);
  const energyValues = checkinRows.map((c) => c.energy_level).filter((e): e is number => e != null);
  const averageMood =
    moodValues.length > 0
      ? Math.round((moodValues.reduce((a, b) => a + b, 0) / moodValues.length) * 10) / 10
      : null;
  const averageEnergy =
    energyValues.length > 0
      ? Math.round((energyValues.reduce((a, b) => a + b, 0) / energyValues.length) * 10) / 10
      : null;

  const latestCheckin: LatestCheckin | null = checkinRows[0]
    ? {
        date: checkinRows[0].checkin_date,
        mood: checkinRows[0].mood,
        energy: checkinRows[0].energy_level,
        blockers: checkinRows[0].blockers,
        wins: checkinRows[0].wins,
        tomorrowPlan: checkinRows[0].tomorrow_plan,
      }
    : null;

  // Live status from a peeking work_session
  const liveRow = (
    liveRes.data as Array<{
      id: string;
      started_at: string;
      project:
        | { id: string; name: string | null }
        | Array<{ id: string; name: string | null }>
        | null;
    }> | null
  )?.[0];
  const liveProject = liveRow
    ? Array.isArray(liveRow.project)
      ? liveRow.project[0]
      : liveRow.project
    : null;

  // Previous period delta %
  const prevTasksCompletedCount = prevTasks.filter(
    (t) =>
      t.completed_at &&
      new Date(t.completed_at) >= prevStart &&
      new Date(t.completed_at) < periodStart
  ).length;
  const hoursDeltaPct =
    prevHours > 0.5 ? Math.round(((hoursThisPeriod - prevHours) / prevHours) * 1000) / 10 : null;
  const tasksDeltaPct =
    prevTasksCompletedCount > 0
      ? Math.round(((tasksCompleted - prevTasksCompletedCount) / prevTasksCompletedCount) * 1000) /
        10
      : null;

  return {
    profile: {
      id: profile.id,
      fullName: profile.full_name,
      email: profile.email,
      avatarUrl: profile.avatar_url,
      role: profile.role,
    },
    isOnline: !!liveRow,
    liveSessionStartedAt: liveRow?.started_at ?? null,
    liveSessionProjectName: liveProject?.name ?? null,
    period,
    periodLabel: labelFor(period, periodStart, periodEnd),
    summary: {
      hoursThisPeriod: Math.round(hoursThisPeriod * 10) / 10,
      tasksCompleted,
      tasksTotal,
      completionPct,
      carryoverPct,
      averageMood,
      averageEnergy,
      hoursDeltaPct,
      tasksDeltaPct,
    },
    inProgress,
    todo,
    doneInPeriod,
    overdue,
    projectSplit,
    hoursHeatmap: weeks,
    latestCheckin,
  };
}

function labelFor(period: Period, start: Date, end: Date): string {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  switch (period) {
    case 'this_week':
      return `This week · ${start.toLocaleDateString('en-IE', opts)} – ${end.toLocaleDateString('en-IE', opts)}`;
    case 'last_7d':
      return `Last 7 days`;
    case 'this_month':
      return `${start.toLocaleDateString('en-IE', { month: 'long', year: 'numeric' })}`;
    case 'last_30d':
      return `Last 30 days`;
  }
}

/* ================================================================== *
 *  Trends tab loader (8-week history)
 * ================================================================== */

export async function getEmployeeTrends(profileId: string): Promise<EmployeeTrendsPayload | null> {
  const user = await ensureAdmin();
  if (!user) return null;
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return null;

  const supabase = await createClient();

  const eightWeeksAgo = new Date();
  eightWeeksAgo.setHours(0, 0, 0, 0);
  const dow = eightWeeksAgo.getDay();
  eightWeeksAgo.setDate(eightWeeksAgo.getDate() + (dow === 0 ? -6 : 1 - dow));
  eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 7 * 7);

  const [tasksRes, sessionsRes, checkinRes] = await Promise.all([
    supabase
      .from('tasks')
      .select('id, status, completed_at, created_at')
      .eq('workspace_id', workspaceId)
      .eq('assignee_id', profileId)
      .or(
        `completed_at.gte.${eightWeeksAgo.toISOString()},created_at.gte.${eightWeeksAgo.toISOString()}`
      ),
    supabase
      .from('work_sessions')
      .select('id, started_at, ended_at, duration_minutes')
      .eq('workspace_id', workspaceId)
      .eq('profile_id', profileId)
      .gte('started_at', eightWeeksAgo.toISOString()),
    supabase
      .from('daily_checkins')
      .select('checkin_date, mood, energy_level')
      .eq('workspace_id', workspaceId)
      .eq('profile_id', profileId)
      .order('checkin_date', { ascending: true })
      .limit(30),
  ]);

  // Build 8 weekly buckets (Mon-aligned)
  const buckets: { weekStart: Date; tasksDone: number; tasksOpened: number; minutes: number }[] =
    [];
  for (let w = 0; w < 8; w++) {
    const ws = new Date(eightWeeksAgo);
    ws.setDate(ws.getDate() + 7 * w);
    buckets.push({ weekStart: ws, tasksDone: 0, tasksOpened: 0, minutes: 0 });
  }
  const bucketIndex = (d: Date) =>
    Math.floor((d.getTime() - eightWeeksAgo.getTime()) / (7 * 86_400_000));

  const tasks =
    (tasksRes.data as Array<{
      id: string;
      status: string;
      completed_at: string | null;
      created_at: string;
    }> | null) ?? [];
  for (const t of tasks) {
    if (t.completed_at && t.status === 'Done') {
      const idx = bucketIndex(new Date(t.completed_at));
      if (idx >= 0 && idx < buckets.length) buckets[idx].tasksDone += 1;
    }
    if (t.created_at) {
      const idx = bucketIndex(new Date(t.created_at));
      if (idx >= 0 && idx < buckets.length) buckets[idx].tasksOpened += 1;
    }
  }
  const sessions =
    (sessionsRes.data as Array<{
      started_at: string;
      ended_at: string | null;
      duration_minutes: number | null;
    }> | null) ?? [];
  for (const s of sessions) {
    const idx = bucketIndex(new Date(s.started_at));
    if (idx < 0 || idx >= buckets.length) continue;
    let minutes = s.duration_minutes ?? 0;
    if (!minutes && !s.ended_at) {
      minutes = Math.max(0, Math.round((Date.now() - new Date(s.started_at).getTime()) / 60000));
    }
    if (!minutes && s.ended_at) {
      minutes = Math.max(
        0,
        Math.round((new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 60000)
      );
    }
    buckets[idx].minutes += minutes;
  }

  const velocityWeekly: WeeklyPoint[] = buckets.map((b) => ({
    weekStart: b.weekStart.toISOString().slice(0, 10),
    value: b.tasksDone,
  }));
  const hoursWeekly: WeeklyPoint[] = buckets.map((b) => ({
    weekStart: b.weekStart.toISOString().slice(0, 10),
    value: Math.round((b.minutes / 60) * 10) / 10,
  }));
  const completionRateWeekly: WeeklyPoint[] = buckets.map((b) => {
    const total = b.tasksDone + b.tasksOpened;
    return {
      weekStart: b.weekStart.toISOString().slice(0, 10),
      value: total > 0 ? Math.round((b.tasksDone / total) * 100) : 0,
    };
  });

  const checkins =
    (checkinRes.data as Array<{
      checkin_date: string;
      mood: number | null;
      energy_level: number | null;
    }> | null) ?? [];
  const moodSparkline = checkins.map((c) => c.mood).filter((m): m is number => m != null);
  const energySparkline = checkins.map((c) => c.energy_level).filter((e): e is number => e != null);

  const completedTasks = tasks.filter((t) => t.completed_at && t.status === 'Done');
  const daysToCloseValues = completedTasks.map(
    (t) => (new Date(t.completed_at!).getTime() - new Date(t.created_at).getTime()) / 86_400_000
  );
  const averageDaysToClose =
    daysToCloseValues.length > 0
      ? Math.round((daysToCloseValues.reduce((a, b) => a + b, 0) / daysToCloseValues.length) * 10) /
        10
      : null;
  const totalHours = sessions.reduce((sum, s) => sum + (s.duration_minutes ?? 0) / 60, 0);
  const hoursPerCompletedTask =
    completedTasks.length > 0 ? Math.round((totalHours / completedTasks.length) * 10) / 10 : null;

  return {
    velocityWeekly,
    hoursWeekly,
    completionRateWeekly,
    moodSparkline,
    energySparkline,
    averageDaysToClose,
    hoursPerCompletedTask,
  };
}

/* ================================================================== *
 *  History tab loader — paginated session feed
 * ================================================================== */

export async function getEmployeeHistory(
  profileId: string,
  page: number = 0,
  pageSize: number = 30
): Promise<EmployeeHistoryPayload | null> {
  const user = await ensureAdmin();
  if (!user) return null;
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return null;

  const supabase = await createClient();
  const from = page * pageSize;
  const to = from + pageSize; // fetch one extra to know hasMore

  const [sessionsRes, profileRes] = await Promise.all([
    supabase
      .from('work_sessions')
      .select(
        `id, started_at, ended_at, duration_minutes, project_id, summary,
         project:projects!work_sessions_project_id_fkey (id, name)`
      )
      .eq('workspace_id', workspaceId)
      .eq('profile_id', profileId)
      .order('started_at', { ascending: false })
      .range(from, to),
    supabase.from('profiles').select('full_name, email').eq('id', profileId).maybeSingle(),
  ]);

  type RawSession = {
    id: string;
    started_at: string;
    ended_at: string | null;
    duration_minutes: number | null;
    project_id: string | null;
    summary: string | null;
    project:
      | { id: string; name: string | null }
      | Array<{ id: string; name: string | null }>
      | null;
  };
  const sessions = (sessionsRes.data as RawSession[] | null) ?? [];
  const hasMore = sessions.length > pageSize;
  const pageSessions = hasMore ? sessions.slice(0, pageSize) : sessions;

  // Try to enrich with session_reports — match by submitted_by ≈ profile name/email + same calendar day
  const profile = profileRes.data;
  const lookupName = (profile?.full_name ?? '').trim().toLowerCase();
  const lookupEmail = (profile?.email ?? '').trim().toLowerCase();

  let reports: Array<{
    id: string;
    submitted_at: string | null;
    submitted_by: string | null;
    commits: string[] | null;
    tasks_done: number | null;
    tasks_total: number | null;
    deploy_count: number | null;
    gap_cycles: number | null;
    milestone: string | null;
    verification: string | null;
    notes: string | null;
  }> = [];
  if (pageSessions.length > 0) {
    const oldest = pageSessions[pageSessions.length - 1].started_at;
    const newest = pageSessions[0].started_at;
    const reportsRes = await supabase
      .from('session_reports')
      .select(
        'id, submitted_at, submitted_by, commits, tasks_done, tasks_total, deploy_count, gap_cycles, milestone, verification, notes'
      )
      .neq('dry_run', true)
      .gte('submitted_at', oldest)
      .lte('submitted_at', new Date(new Date(newest).getTime() + 86_400_000).toISOString())
      .order('submitted_at', { ascending: false });
    reports = reportsRes.data ?? [];
  }

  const matchReport = (s: RawSession) => {
    const sessionDay = s.started_at.slice(0, 10);
    return (
      reports.find((r) => {
        if (!r.submitted_at) return false;
        if (r.submitted_at.slice(0, 10) !== sessionDay) return false;
        const sb = (r.submitted_by ?? '').trim().toLowerCase();
        return (
          sb === lookupName ||
          sb === lookupEmail ||
          (lookupName.length > 0 && sb.includes(lookupName))
        );
      }) ?? null
    );
  };

  const rows: SessionFeedRow[] = pageSessions.map((s) => {
    const project = Array.isArray(s.project) ? s.project[0] : s.project;
    const minutes =
      s.duration_minutes ??
      (s.ended_at
        ? Math.max(
            0,
            Math.round((new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 60000)
          )
        : Math.max(0, Math.round((Date.now() - new Date(s.started_at).getTime()) / 60000)));
    const r = matchReport(s);
    return {
      sessionId: s.id,
      startedAt: s.started_at,
      endedAt: s.ended_at,
      durationMinutes: minutes,
      projectId: s.project_id,
      projectName: project?.name ?? null,
      summary: s.summary,
      hue: hueFromId(s.project_id ?? s.id),
      report: r
        ? {
            id: r.id,
            commitsCount: Array.isArray(r.commits) ? r.commits.length : 0,
            tasksDone: r.tasks_done,
            tasksTotal: r.tasks_total,
            deployCount: r.deploy_count,
            gapCycles: r.gap_cycles,
            milestone: r.milestone,
            verification: r.verification,
            notes: r.notes,
          }
        : null,
    };
  });

  return { rows, hasMore };
}
