'use server';

import { createClient } from '@/lib/supabase/server';
import { isUserAdmin } from '@/app/actions/shared';
import { getCurrentWorkspaceId } from '@/app/actions/workspace';

/**
 * Planning health — admin visibility for "missing deadline / needs planning"
 * surfaces flagged in the 2026-04-28 operations diagnosis.
 *
 * The point is to make orphan/un-dated work obvious to admins without
 * resurrecting the previously-deleted "Unphased" pseudo-bucket. Counts only —
 * detail drilldowns live on the linked routes.
 */

export type PlanningHealthRow = {
  /** Stable identifier for the row, used as React key. */
  key: string;
  /** Short label shown in the admin panel. */
  label: string;
  /** What this row measures, plain language for hovercards. */
  description: string;
  /** Live count from the workspace. */
  count: number;
  /** Internal route that drills into the underlying list (best-effort filter). */
  href: string;
};

export type PlanningHealthPayload = {
  rows: PlanningHealthRow[];
  /** Total of every row — used to decide whether to surface the panel at all. */
  totalIssues: number;
};

const ACTIVE_PROJECT_STATUSES = ['Active', 'Demos', 'Launched', 'Delayed'] as const;
const ACTIVE_PHASE_STATUSES = ['not_started', 'in_progress'] as const;
const OPEN_TASK_STATUSES_BLACKLIST = ['Done', 'Canceled'] as const;

export async function loadPlanningHealth(): Promise<PlanningHealthPayload> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !(await isUserAdmin(user.id))) {
    return { rows: [], totalIssues: 0 };
  }

  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) {
    return { rows: [], totalIssues: 0 };
  }

  // All four checks fan out in parallel — each is a head-only count so the
  // payload is tiny.
  const [projectsRes, phasesRes, tasksNoPhaseRes, tasksNoDueRes] = await Promise.all([
    supabase
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .in('status', ACTIVE_PROJECT_STATUSES as unknown as string[])
      .is('target_date', null),
    supabase
      .from('project_phases')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .in('status', ACTIVE_PHASE_STATUSES as unknown as string[])
      .or('start_date.is.null,target_date.is.null'),
    supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .not('project_id', 'is', null)
      .is('phase_id', null)
      .not('status', 'in', `("${OPEN_TASK_STATUSES_BLACKLIST.join('","')}")`),
    supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .is('due_date', null)
      .not('status', 'in', `("${OPEN_TASK_STATUSES_BLACKLIST.join('","')}")`),
  ]);

  const rows: PlanningHealthRow[] = [
    {
      key: 'projects-no-target',
      label: 'Active projects · no target date',
      description: 'Projects in Active/Demos/Launched/Delayed without a committed delivery date.',
      count: projectsRes.count ?? 0,
      href: '/projects?missing=target_date',
    },
    {
      key: 'phases-no-dates',
      label: 'Active phases · missing dates',
      description: 'In-progress or queued phases missing start or target date.',
      count: phasesRes.count ?? 0,
      href: '/projects?missing=phase_dates',
    },
    {
      key: 'tasks-no-phase',
      label: 'Open project tasks · no phase',
      description:
        'Tasks attached to a project but not pinned to a phase — needs planning, not the old "unphased" bucket.',
      count: tasksNoPhaseRes.count ?? 0,
      href: '/tasks?scope=all&missing=phase',
    },
    {
      key: 'tasks-no-due',
      label: 'Open tasks · no due date',
      description: 'Open tasks (not Done/Canceled) without a due date.',
      count: tasksNoDueRes.count ?? 0,
      href: '/tasks?scope=all&missing=due_date',
    },
  ];

  const totalIssues = rows.reduce((sum, r) => sum + r.count, 0);

  return { rows, totalIssues };
}
