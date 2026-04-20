'use server';

import { createClient } from '@/lib/supabase/server';
import { getTeamMembers } from '@/app/actions/admin';
import { getTeamStatus } from '@/app/actions/work-sessions';
import { isUserAdmin } from '@/app/actions/shared';
import { getCurrentWorkspaceId } from '@/app/actions/workspace';
import type { AdminProfile } from '@/app/actions/admin';
import type { TeamMemberStatus } from '@/app/actions/work-sessions';

export type AssignmentProject = {
  id: string;
  name: string;
  client_id: string | null;
  client_name: string | null;
};

export type TeamPayload = {
  members: AdminProfile[];
  liveStatus: TeamMemberStatus[];
  assignments: {
    employees: Array<{ id: string; full_name: string | null; avatar_url: string | null }>;
    projects: AssignmentProject[];
    /** Employee id → set of project ids they're assigned to */
    matrix: Record<string, string[]>;
  };
};

export async function loadTeamTab(): Promise<TeamPayload> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !(await isUserAdmin(user.id))) {
    return {
      members: [],
      liveStatus: [],
      assignments: { employees: [], projects: [], matrix: {} },
    };
  }

  const workspaceId = await getCurrentWorkspaceId();

  const [membersRes, liveStatus, assignmentsData] = await Promise.all([
    getTeamMembers(),
    workspaceId ? getTeamStatus(workspaceId) : Promise.resolve([]),
    loadAssignmentMatrix(workspaceId),
  ]);

  const members = (membersRes.success ? (membersRes.data as AdminProfile[]) : []) ?? [];

  return {
    members,
    liveStatus,
    assignments: assignmentsData,
  };
}

async function loadAssignmentMatrix(workspaceId: string | null) {
  const supabase = await createClient();

  const { data: assignments } = await supabase
    .from('project_assignments')
    .select(
      `
      project_id,
      employee_id,
      employee:profiles!project_assignments_employee_id_fkey (id, full_name, avatar_url),
      project:projects!project_assignments_project_id_fkey (id, name, client_id, client:clients (id, name, display_name))
    `
    )
    .eq('workspace_id', workspaceId ?? '')
    .is('removed_at', null);

  const employeesMap = new Map<
    string,
    { id: string; full_name: string | null; avatar_url: string | null }
  >();
  const projectsMap = new Map<string, AssignmentProject>();
  const matrix: Record<string, string[]> = {};

  for (const a of assignments ?? []) {
    const emp = Array.isArray(a.employee) ? a.employee[0] : a.employee;
    const proj = Array.isArray(a.project) ? a.project[0] : a.project;
    if (!emp || !proj) continue;

    employeesMap.set(emp.id, {
      id: emp.id,
      full_name: emp.full_name,
      avatar_url: emp.avatar_url,
    });

    if (!projectsMap.has(proj.id)) {
      const clientRel = Array.isArray(proj.client) ? proj.client[0] : proj.client;
      projectsMap.set(proj.id, {
        id: proj.id,
        name: proj.name,
        client_id: proj.client_id ?? null,
        client_name: clientRel?.display_name ?? clientRel?.name ?? null,
      });
    }

    matrix[emp.id] = matrix[emp.id] ?? [];
    if (!matrix[emp.id].includes(proj.id)) matrix[emp.id].push(proj.id);
  }

  return {
    employees: Array.from(employeesMap.values()).sort((a, b) =>
      (a.full_name ?? '').localeCompare(b.full_name ?? '')
    ),
    projects: Array.from(projectsMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
    matrix,
  };
}
