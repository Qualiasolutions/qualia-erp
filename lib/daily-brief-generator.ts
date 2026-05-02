/**
 * Daily Brief Generator
 *
 * Pulls live signals from the ERP and writes them to `daily_brief_items` for
 * a given owner and date. Idempotent on `(owner_id, for_date, source_type,
 * source_id)` — calling the generator multiple times in a day produces the
 * same brief without duplicates.
 *
 * Sources covered (Phase 1 + 2):
 *   - overdue_task        tasks assigned to me, past due, not done
 *   - meeting_today       meetings I have today (Cyprus tz)
 *   - meeting_upcoming    meetings in the next 48h that need prep
 *   - stale_project       active projects with no updates 7+ days
 *   - overdue_invoice     financial_invoices past due
 *   - project_deadline    project_assignments due in next 3 days
 *   - framework_gap       session_reports with gap_cycles > 0
 *   - framework_stale     projects with no session_reports in 14+ days
 *
 * Phase 3 (qualia-memory) and Phase 4 (AI synthesis) layer on top later.
 */

import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

export const TIMEZONE = 'Asia/Nicosia';

type AdminClient = SupabaseClient<Database>;

type BriefItemInsert = Database['public']['Tables']['daily_brief_items']['Insert'];

interface GeneratorContext {
  supabase: AdminClient;
  ownerId: string;
  workspaceId: string;
  forDate: string;
}

export interface GenerationResult {
  ownerId: string;
  forDate: string;
  inserted: number;
  bySource: Record<string, number>;
}

export function cyprusToday(): string {
  return formatInTimeZone(new Date(), TIMEZONE, 'yyyy-MM-dd');
}

function dayBoundsUtc(forDate: string): { startUtc: string; endUtc: string } {
  const startUtc = fromZonedTime(`${forDate}T00:00:00`, TIMEZONE).toISOString();
  const endUtc = fromZonedTime(`${forDate}T23:59:59.999`, TIMEZONE).toISOString();
  return { startUtc, endUtc };
}

function shiftDays(forDate: string, days: number): string {
  const d = new Date(`${forDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function timeLabel(iso: string): string {
  return formatInTimeZone(iso, TIMEZONE, 'HH:mm');
}

/* ────────────────────────── Source pulls ────────────────────────── */

async function pullOverdueTasks(ctx: GeneratorContext): Promise<BriefItemInsert[]> {
  const { data, error } = await ctx.supabase
    .from('tasks')
    .select('id, title, due_date, priority, project_id, projects:project_id(name)')
    .eq('workspace_id', ctx.workspaceId)
    .eq('assignee_id', ctx.ownerId)
    .lt('due_date', ctx.forDate)
    .not('status', 'in', '(Done,Canceled)')
    .order('due_date', { ascending: true })
    .limit(20);

  if (error || !data) return [];

  return data.map((t) => {
    const projectName = Array.isArray(t.projects) ? t.projects[0]?.name : t.projects?.name;
    const daysOverdue = t.due_date
      ? Math.max(
          1,
          Math.floor(
            (new Date(`${ctx.forDate}T00:00:00Z`).getTime() -
              new Date(`${t.due_date}T00:00:00Z`).getTime()) /
              86_400_000
          )
        )
      : 0;
    const lead = projectName ? `${projectName}` : 'Task';
    const daysSuffix = daysOverdue === 1 ? '1 day overdue' : `${daysOverdue} days overdue`;
    return {
      owner_id: ctx.ownerId,
      workspace_id: ctx.workspaceId,
      for_date: ctx.forDate,
      source_type: 'overdue_task',
      source_id: t.id,
      source_metadata: { priority: t.priority, due_date: t.due_date },
      tag: 'ME',
      lead: `${lead}:`,
      body: ` ${t.title} — ${daysSuffix}.`,
      priority: t.priority === 'Urgent' ? 95 : t.priority === 'High' ? 80 : 65,
    };
  });
}

async function pullMeetingsToday(ctx: GeneratorContext): Promise<BriefItemInsert[]> {
  const { startUtc, endUtc } = dayBoundsUtc(ctx.forDate);
  const { data, error } = await ctx.supabase
    .from('meetings')
    .select(
      'id, title, start_time, end_time, meeting_link, client:client_id(display_name), project:project_id(name)'
    )
    .eq('workspace_id', ctx.workspaceId)
    .gte('start_time', startUtc)
    .lte('start_time', endUtc)
    .order('start_time', { ascending: true })
    .limit(10);

  if (error || !data) return [];

  return data.map((m) => {
    const counterparty = Array.isArray(m.client)
      ? m.client[0]?.display_name
      : m.client?.display_name;
    const projectName = Array.isArray(m.project) ? m.project[0]?.name : m.project?.name;
    const ctx_label = counterparty ?? projectName ?? m.title;
    const time = timeLabel(m.start_time);
    return {
      owner_id: ctx.ownerId,
      workspace_id: ctx.workspaceId,
      for_date: ctx.forDate,
      source_type: 'meeting_today',
      source_id: m.id,
      source_metadata: {
        start_time: m.start_time,
        end_time: m.end_time,
        meeting_link: m.meeting_link,
      },
      tag: 'ME',
      lead: `${time} · ${ctx_label}`,
      body: m.meeting_link ? ' — Meet link ready.' : ' — confirm details.',
      priority: 90,
    };
  });
}

async function pullMeetingsUpcoming(ctx: GeneratorContext): Promise<BriefItemInsert[]> {
  const { endUtc: todayEnd } = dayBoundsUtc(ctx.forDate);
  const { endUtc: plus2End } = dayBoundsUtc(shiftDays(ctx.forDate, 2));
  const { data, error } = await ctx.supabase
    .from('meetings')
    .select('id, title, start_time, client:client_id(display_name), project:project_id(name)')
    .eq('workspace_id', ctx.workspaceId)
    .gt('start_time', todayEnd)
    .lte('start_time', plus2End)
    .order('start_time', { ascending: true })
    .limit(10);

  if (error || !data) return [];

  return data.map((m) => {
    const counterparty = Array.isArray(m.client)
      ? m.client[0]?.display_name
      : m.client?.display_name;
    const projectName = Array.isArray(m.project) ? m.project[0]?.name : m.project?.name;
    const ctx_label = counterparty ?? projectName ?? m.title;
    const dayLabel = formatInTimeZone(m.start_time, TIMEZONE, 'EEE');
    const time = timeLabel(m.start_time);
    return {
      owner_id: ctx.ownerId,
      workspace_id: ctx.workspaceId,
      for_date: ctx.forDate,
      source_type: 'meeting_upcoming',
      source_id: m.id,
      source_metadata: { start_time: m.start_time },
      tag: 'TEAM',
      lead: `${dayLabel} ${time} · ${ctx_label}`,
      body: ' — prep before the call.',
      priority: 60,
    };
  });
}

async function pullStaleProjects(ctx: GeneratorContext): Promise<BriefItemInsert[]> {
  const cutoff = new Date(`${shiftDays(ctx.forDate, -7)}T00:00:00Z`).toISOString();
  const { data, error } = await ctx.supabase
    .from('projects')
    .select('id, name, updated_at, status, client:client_id(display_name)')
    .eq('workspace_id', ctx.workspaceId)
    .eq('is_finished', false)
    .lt('updated_at', cutoff)
    .order('updated_at', { ascending: true })
    .limit(8);

  if (error || !data) return [];

  return data.map((p) => {
    const clientName = Array.isArray(p.client) ? p.client[0]?.display_name : p.client?.display_name;
    const days = p.updated_at
      ? Math.floor(
          (new Date(`${ctx.forDate}T00:00:00Z`).getTime() - new Date(p.updated_at).getTime()) /
            86_400_000
        )
      : 0;
    return {
      owner_id: ctx.ownerId,
      workspace_id: ctx.workspaceId,
      for_date: ctx.forDate,
      source_type: 'stale_project',
      source_id: p.id,
      source_metadata: { updated_at: p.updated_at, status: p.status },
      tag: 'OWNER',
      lead: `${clientName ? `${clientName} — ` : ''}${p.name}:`,
      body: ` no activity for ${days} days.`,
      priority: 55,
    };
  });
}

async function pullOverdueInvoices(ctx: GeneratorContext): Promise<BriefItemInsert[]> {
  const { data, error } = await ctx.supabase
    .from('financial_invoices')
    .select('zoho_id, invoice_number, customer_name, balance, currency_code, due_date, status')
    .eq('is_hidden', false)
    .gt('balance', 0)
    .lt('due_date', ctx.forDate)
    .not('status', 'in', '(paid,void,cancelled,draft)')
    .order('due_date', { ascending: true })
    .limit(8);

  if (error || !data) return [];

  return data.map((inv) => {
    const days = inv.due_date
      ? Math.max(
          1,
          Math.floor(
            (new Date(`${ctx.forDate}T00:00:00Z`).getTime() -
              new Date(`${inv.due_date}T00:00:00Z`).getTime()) /
              86_400_000
          )
        )
      : 0;
    const currency = inv.currency_code || 'EUR';
    return {
      owner_id: ctx.ownerId,
      workspace_id: ctx.workspaceId,
      for_date: ctx.forDate,
      source_type: 'overdue_invoice',
      source_id: inv.zoho_id,
      source_metadata: { invoice_number: inv.invoice_number, balance: inv.balance },
      tag: 'OWNER',
      lead: `${inv.customer_name} (${inv.invoice_number}):`,
      body: ` ${currency} ${inv.balance} unpaid, ${days}d past due.`,
      priority: 75,
    };
  });
}

async function pullProjectDeadlines(ctx: GeneratorContext): Promise<BriefItemInsert[]> {
  const horizon = shiftDays(ctx.forDate, 3);
  const { data, error } = await ctx.supabase
    .from('project_assignments')
    .select(
      'id, deadline_date, employee_id, project:project_id(name), employee:profiles!project_assignments_employee_id_fkey(full_name)'
    )
    .eq('workspace_id', ctx.workspaceId)
    .is('completed_at', null)
    .is('removed_at', null)
    .gte('deadline_date', ctx.forDate)
    .lte('deadline_date', horizon)
    .order('deadline_date', { ascending: true })
    .limit(8);

  if (error || !data) return [];

  return data.map((a) => {
    const projectName = Array.isArray(a.project) ? a.project[0]?.name : a.project?.name;
    const employeeName = Array.isArray(a.employee)
      ? a.employee[0]?.full_name
      : a.employee?.full_name;
    const daysToDeadline = Math.floor(
      (new Date(`${a.deadline_date}T00:00:00Z`).getTime() -
        new Date(`${ctx.forDate}T00:00:00Z`).getTime()) /
        86_400_000
    );
    const when =
      daysToDeadline === 0
        ? 'due today'
        : daysToDeadline === 1
          ? 'due tomorrow'
          : `due in ${daysToDeadline}d`;
    return {
      owner_id: ctx.ownerId,
      workspace_id: ctx.workspaceId,
      for_date: ctx.forDate,
      source_type: 'project_deadline',
      source_id: a.id,
      source_metadata: { deadline_date: a.deadline_date, employee_id: a.employee_id },
      tag: 'TEAM',
      lead: `${projectName ?? 'Project'} (${employeeName ?? 'unassigned'}):`,
      body: ` ${when}.`,
      priority: daysToDeadline === 0 ? 88 : daysToDeadline === 1 ? 75 : 60,
    };
  });
}

async function pullFrameworkGaps(ctx: GeneratorContext): Promise<BriefItemInsert[]> {
  const sinceCutoff = new Date(`${shiftDays(ctx.forDate, -3)}T00:00:00Z`).toISOString();
  const { data, error } = await ctx.supabase
    .from('session_reports')
    .select('id, project_name, gap_cycles, phase, phase_name, submitted_at')
    .gt('gap_cycles', 0)
    .gte('submitted_at', sinceCutoff)
    .neq('dry_run', true)
    .order('submitted_at', { ascending: false })
    .limit(8);

  if (error || !data) return [];

  // Dedupe by project — keep latest report per project
  const seenProjects = new Set<string>();
  const items: BriefItemInsert[] = [];
  for (const r of data) {
    if (seenProjects.has(r.project_name)) continue;
    seenProjects.add(r.project_name);
    items.push({
      owner_id: ctx.ownerId,
      workspace_id: ctx.workspaceId,
      for_date: ctx.forDate,
      source_type: 'framework_gap',
      source_id: r.project_name,
      source_metadata: {
        phase: r.phase,
        phase_name: r.phase_name,
        gap_cycles: r.gap_cycles,
        latest_report: r.id,
      },
      tag: 'TEAM',
      lead: `${r.project_name} (Phase ${r.phase ?? '?'}):`,
      body: ` ${r.gap_cycles} gap cycle${r.gap_cycles === 1 ? '' : 's'} unresolved.`,
      priority: 70,
    });
  }
  return items;
}

async function pullFrameworkStale(ctx: GeneratorContext): Promise<BriefItemInsert[]> {
  // Projects in workspace that haven't had a session_report in 14+ days
  const cutoff = new Date(`${shiftDays(ctx.forDate, -14)}T00:00:00Z`).toISOString();
  const { data: projects, error } = await ctx.supabase
    .from('projects')
    .select('id, name, updated_at')
    .eq('workspace_id', ctx.workspaceId)
    .eq('is_finished', false)
    .lt('updated_at', cutoff)
    .limit(20);
  if (error || !projects?.length) return [];

  const projectNames = projects.map((p) => p.name);
  const { data: recentReports } = await ctx.supabase
    .from('session_reports')
    .select('project_name')
    .in('project_name', projectNames)
    .gte('submitted_at', cutoff)
    .neq('dry_run', true);

  const reportedRecently = new Set((recentReports ?? []).map((r) => r.project_name));
  return projects
    .filter((p) => !reportedRecently.has(p.name))
    .slice(0, 5)
    .map((p) => ({
      owner_id: ctx.ownerId,
      workspace_id: ctx.workspaceId,
      for_date: ctx.forDate,
      source_type: 'framework_stale' as const,
      source_id: p.id,
      source_metadata: { last_updated: p.updated_at },
      tag: 'OWNER',
      lead: `${p.name}:`,
      body: ` no Qualia session report in 14+ days.`,
      priority: 50,
    }));
}

/* ────────────────────────── Generator entry ────────────────────────── */

export async function generateDailyBrief(
  supabase: AdminClient,
  ownerId: string,
  workspaceId: string,
  forDate: string = cyprusToday()
): Promise<GenerationResult> {
  const ctx: GeneratorContext = { supabase, ownerId, workspaceId, forDate };

  const [
    overdueTasks,
    meetingsToday,
    meetingsUpcoming,
    staleProjects,
    overdueInvoices,
    projectDeadlines,
    frameworkGaps,
    frameworkStale,
  ] = await Promise.all([
    pullOverdueTasks(ctx),
    pullMeetingsToday(ctx),
    pullMeetingsUpcoming(ctx),
    pullStaleProjects(ctx),
    pullOverdueInvoices(ctx),
    pullProjectDeadlines(ctx),
    pullFrameworkGaps(ctx),
    pullFrameworkStale(ctx),
  ]);

  const all = [
    ...overdueTasks,
    ...meetingsToday,
    ...meetingsUpcoming,
    ...staleProjects,
    ...overdueInvoices,
    ...projectDeadlines,
    ...frameworkGaps,
    ...frameworkStale,
  ];

  const bySource: Record<string, number> = {};
  for (const item of all) bySource[item.source_type] = (bySource[item.source_type] ?? 0) + 1;

  if (all.length > 0) {
    const { error: upsertError } = await supabase.from('daily_brief_items').upsert(all, {
      onConflict: 'owner_id,for_date,source_type,source_id',
      ignoreDuplicates: false,
    });
    if (upsertError) {
      console.error('[daily-brief-generator] upsert failed:', upsertError.message);
      throw new Error(upsertError.message);
    }
  }

  return { ownerId, forDate, inserted: all.length, bySource };
}
