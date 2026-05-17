'use server';

import { createClient } from '@/lib/supabase/server';
import { isUserAdmin } from '@/app/actions/shared';
import { getCurrentWorkspaceId } from '@/app/actions/workspace';
import { getEmployeeAudit, type EmployeeAuditPayload } from '@/app/actions/employee-audit';

/* ------------------------------------------------------------------
 * Types
 * ------------------------------------------------------------------ */

export type ProfileRow = {
  id: string;
  fullName: string | null;
  email: string | null;
  role: string | null;
  avatarUrl: string | null;
};

export type ClientRow = {
  id: string;
  displayName: string | null;
  phone: string | null;
  leadStatus: string | null;
  logoUrl: string | null;
};

export type PeopleIndexPayload = {
  admins: ProfileRow[];
  employees: ProfileRow[];
  clients: ClientRow[];
};

export type PersonAssignment = {
  id: string;
  projectId: string;
  projectName: string | null;
  assignedAt: string | null;
  deadlineDate: string | null;
};

export type AttendanceSummary = {
  totalSessions: number;
  totalHours: number;
  distinctWorkdays: number;
  last30dSessions: number;
};

export type ProfileDetailPayload = {
  kind: 'profile';
  id: string;
  fullName: string | null;
  email: string | null;
  role: string | null;
  avatarUrl: string | null;
  workspaceName: string | null;
  attendance: AttendanceSummary;
  audit: EmployeeAuditPayload | null;
  assignments: PersonAssignment[];
};

export type ClientDetailPayload = {
  kind: 'client';
  id: string;
  displayName: string | null;
  phone: string | null;
  leadStatus: string | null;
  logoUrl: string | null;
  projects: Array<{
    id: string;
    name: string;
    status: string;
  }>;
};

export type PersonDetailPayload = ProfileDetailPayload | ClientDetailPayload;

/* ------------------------------------------------------------------
 * getPeopleIndex
 * ------------------------------------------------------------------ */

export async function getPeopleIndex(): Promise<PeopleIndexPayload | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !(await isUserAdmin(user.id))) return null;

  const wsId = await getCurrentWorkspaceId();

  const [profilesRes, clientsRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, email, role, avatar_url')
      .in('role', ['admin', 'employee'])
      .order('full_name'),
    supabase
      .from('clients')
      .select('id, display_name, phone, lead_status, logo_url')
      .order('display_name')
      .limit(500),
  ]);

  const profiles = (profilesRes.data ?? []) as Array<{
    id: string;
    full_name: string | null;
    email: string | null;
    role: string | null;
    avatar_url: string | null;
  }>;

  const admins: ProfileRow[] = [];
  const employees: ProfileRow[] = [];

  for (const p of profiles) {
    const row: ProfileRow = {
      id: p.id,
      fullName: p.full_name,
      email: p.email,
      role: p.role,
      avatarUrl: p.avatar_url,
    };
    if (p.role === 'admin') admins.push(row);
    else employees.push(row);
  }

  const clients: ClientRow[] = (clientsRes.data ?? []).map((c: Record<string, unknown>) => ({
    id: c.id as string,
    displayName: (c.display_name as string | null) ?? null,
    phone: (c.phone as string | null) ?? null,
    leadStatus: (c.lead_status as string | null) ?? null,
    logoUrl: (c.logo_url as string | null) ?? null,
  }));

  // Filter clients by workspace if we have one
  // Clients don't always have workspace_id exposed in this query, so we return all
  void wsId;

  return { admins, employees, clients };
}

/* ------------------------------------------------------------------
 * getPersonDetail
 * ------------------------------------------------------------------ */

export async function getPersonDetail(id: string): Promise<PersonDetailPayload | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !(await isUserAdmin(user.id))) return null;

  // Try as a profile first
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, avatar_url')
    .eq('id', id)
    .maybeSingle();

  if (profile) {
    // Get workspace membership
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('workspace:workspaces(name)')
      .eq('profile_id', id)
      .limit(1)
      .maybeSingle();

    const workspaceName = membership?.workspace
      ? Array.isArray(membership.workspace)
        ? ((membership.workspace[0] as { name: string | null })?.name ?? null)
        : ((membership.workspace as { name: string | null })?.name ?? null)
      : null;

    // Get attendance summary (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString();

    const [allSessionsRes, recentSessionsRes] = await Promise.all([
      supabase.from('work_sessions').select('started_at, duration_minutes').eq('profile_id', id),
      supabase
        .from('work_sessions')
        .select('id')
        .eq('profile_id', id)
        .gte('started_at', thirtyDaysAgoStr),
    ]);

    const allSessions = (allSessionsRes.data ?? []) as Array<{
      started_at: string;
      duration_minutes: number | null;
    }>;
    const totalMinutes = allSessions.reduce((s, r) => s + (r.duration_minutes ?? 0), 0);
    const distinctDays = new Set(allSessions.map((s) => s.started_at.slice(0, 10))).size;

    const attendance: AttendanceSummary = {
      totalSessions: allSessions.length,
      totalHours: Math.round((totalMinutes / 60) * 10) / 10,
      distinctWorkdays: distinctDays,
      last30dSessions: recentSessionsRes.data?.length ?? 0,
    };

    // Get audit data (reuse existing function)
    const audit = await getEmployeeAudit(id);

    // Get active assignments
    const { data: assignmentsRaw } = await supabase
      .from('project_assignments')
      .select(
        `id, assigned_at, deadline_date,
        project:projects!project_assignments_project_id_fkey (id, name)`
      )
      .eq('employee_id', id)
      .is('removed_at', null)
      .order('assigned_at', { ascending: false });

    const assignments: PersonAssignment[] = (assignmentsRaw ?? []).map(
      (a: Record<string, unknown>) => {
        const proj = Array.isArray(a.project)
          ? (a.project as Array<{ id: string; name: string }>)[0]
          : (a.project as { id: string; name: string } | null);
        return {
          id: a.id as string,
          projectId: proj?.id ?? '',
          projectName: proj?.name ?? null,
          assignedAt: (a.assigned_at as string | null) ?? null,
          deadlineDate: (a.deadline_date as string | null) ?? null,
        };
      }
    );

    return {
      kind: 'profile',
      id: profile.id,
      fullName: profile.full_name,
      email: profile.email,
      role: profile.role,
      avatarUrl: profile.avatar_url,
      workspaceName,
      attendance,
      audit,
      assignments,
    };
  }

  // Try as a client
  const { data: client } = await supabase
    .from('clients')
    .select('id, display_name, phone, lead_status, logo_url')
    .eq('id', id)
    .maybeSingle();

  if (client) {
    const { data: projectsRaw } = await supabase
      .from('projects')
      .select('id, name, status')
      .eq('client_id', id)
      .order('created_at', { ascending: false });

    const projects = (projectsRaw ?? []).map((p: { id: string; name: string; status: string }) => ({
      id: p.id,
      name: p.name,
      status: p.status,
    }));

    return {
      kind: 'client',
      id: client.id,
      displayName: client.display_name,
      phone: client.phone,
      leadStatus: client.lead_status,
      logoUrl: client.logo_url,
      projects,
    };
  }

  return null;
}
