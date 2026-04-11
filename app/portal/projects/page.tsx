import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getClientProjects } from '@/app/actions/client-portal';
import { calculateProjectsProgress } from '@/app/actions/phases';
import { isPortalAdminRole } from '@/lib/portal-utils';
import { PortalProjectsGrid } from '@/components/portal/portal-projects-grid';
import { fadeInClasses } from '@/lib/transitions';
import { AlertCircle, FolderKanban } from 'lucide-react';

export default async function PortalProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ workspace?: string }>;
}) {
  const params = await searchParams;
  const workspaceId = params.workspace;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Get role directly from the same supabase client
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const realRole = profile?.role || null;

  // --- View-as impersonation: resolve effective user ---
  const cookieStore = await cookies();
  const viewAsUserId = cookieStore.get('view-as-user-id')?.value;

  let effectiveUserId = user.id;
  let effectiveRole = realRole;

  if (viewAsUserId && realRole === 'admin') {
    const { data: viewAsProfile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', viewAsUserId)
      .single();

    if (viewAsProfile) {
      effectiveUserId = viewAsProfile.id;
      effectiveRole = viewAsProfile.role || 'client';
    }
  }

  const isAdmin = isPortalAdminRole(effectiveRole);

  // Admin viewing a specific workspace: scope to that client's projects
  if (isAdmin && workspaceId) {
    // Get projects linked to this CRM client
    const { data: clientProjects } = await supabase
      .from('projects')
      .select('id, name, description, project_type, status, start_date, end_date:target_date')
      .eq('client_id', workspaceId)
      .not('status', 'eq', 'Canceled')
      .order('name');

    const projectIds = (clientProjects || []).map((p) => p.id);
    const progressMap = await calculateProjectsProgress(projectIds);

    const formatted = (clientProjects || []).map((p) => ({
      id: p.id,
      project_id: p.id,
      access_level: 'admin' as string | null,
      invited_at: null as string | null,
      project: {
        id: p.id,
        name: p.name,
        description: p.description,
        project_type: p.project_type || 'web_design',
        project_status: p.status || 'Active',
        start_date: p.start_date,
        end_date: p.end_date,
      },
    }));

    return (
      <div className={`space-y-6 ${fadeInClasses}`}>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Projects</h1>
          <p className="mt-1 text-sm text-muted-foreground">Projects for this client</p>
        </div>
        <PortalProjectsGrid projects={formatted} progressMap={progressMap} groupByStatus />
      </div>
    );
  }

  // Employee: show assigned projects
  const isEmployee = effectiveRole === 'employee';
  if (isEmployee) {
    // Get project IDs from active assignments
    const { data: assignments } = await supabase
      .from('project_assignments')
      .select('project_id')
      .eq('employee_id', effectiveUserId)
      .is('removed_at', null);

    const assignedProjectIds = (assignments || []).map((a) => a.project_id);

    if (assignedProjectIds.length === 0) {
      return (
        <div className={`space-y-6 ${fadeInClasses}`}>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Your Projects</h1>
            <p className="mt-1 text-sm text-muted-foreground">Projects you are assigned to</p>
          </div>
          <div className="flex min-h-[400px] items-center justify-center">
            <div className="text-center">
              <AlertCircle
                className="mx-auto h-12 w-12 text-muted-foreground/30"
                aria-hidden="true"
              />
              <p className="mt-3 text-base font-medium text-foreground">No projects assigned</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Projects will appear here once you are assigned to them.
              </p>
            </div>
          </div>
        </div>
      );
    }

    const { data: employeeProjects } = await supabase
      .from('projects')
      .select('id, name, description, project_type, status, start_date, end_date:target_date')
      .in('id', assignedProjectIds)
      .not('status', 'eq', 'Canceled')
      .order('name');

    const empProjectIds = (employeeProjects || []).map((p) => p.id);
    const empProgressMap = await calculateProjectsProgress(empProjectIds);

    const empFormatted = (employeeProjects || []).map((p) => ({
      id: p.id,
      project_id: p.id,
      access_level: 'employee' as string | null,
      invited_at: null as string | null,
      project: {
        id: p.id,
        name: p.name,
        description: p.description,
        project_type: p.project_type || 'web_design',
        project_status: p.status || 'Active',
        start_date: p.start_date,
        end_date: p.end_date,
      },
    }));

    return (
      <div className={`space-y-6 ${fadeInClasses}`}>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Your Projects</h1>
          <p className="mt-1 text-sm text-muted-foreground">Projects you are assigned to</p>
        </div>
        <PortalProjectsGrid projects={empFormatted} progressMap={empProgressMap} groupByStatus />
      </div>
    );
  }

  // Admin: show all projects
  if (isAdmin) {
    const { data: allProjects } = await supabase
      .from('projects')
      .select('id, name, description, project_type, status, start_date, end_date:target_date')
      .not('status', 'eq', 'Canceled')
      .order('name');

    const projectIds = (allProjects || []).map((p) => p.id);
    const progressMap = await calculateProjectsProgress(projectIds);

    const formatted = (allProjects || []).map((p) => ({
      id: p.id,
      project_id: p.id,
      access_level: 'admin' as string | null,
      invited_at: null as string | null,
      project: {
        id: p.id,
        name: p.name,
        description: p.description,
        project_type: p.project_type || 'web_design',
        project_status: p.status || 'Active',
        start_date: p.start_date,
        end_date: p.end_date,
      },
    }));

    return (
      <div className={`space-y-6 ${fadeInClasses}`}>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Projects</h1>
          <p className="mt-1 text-sm text-muted-foreground">All active projects</p>
        </div>
        <PortalProjectsGrid projects={formatted} progressMap={progressMap} groupByStatus />
      </div>
    );
  }

  // Client: their assigned projects
  const result = await getClientProjects(effectiveUserId);
  if (!result.success) {
    return (
      <div className={`space-y-6 ${fadeInClasses}`}>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Your Projects</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track the progress of your active projects
          </p>
        </div>
        <div className="flex min-h-[300px] items-center justify-center">
          <div className="text-center">
            <AlertCircle
              className="mx-auto h-12 w-12 text-muted-foreground/30"
              aria-hidden="true"
            />
            <p className="mt-3 text-base font-medium text-foreground">Error loading projects</p>
            <p className="mt-1 text-sm text-muted-foreground">{result.error}</p>
          </div>
        </div>
      </div>
    );
  }

  type ClientProjectRow = {
    id: string;
    project_id: string;
    access_level: string | null;
    invited_at: string | null;
    project:
      | {
          id: string;
          name: string;
          description: string | null;
          project_type: string;
          project_status: string;
          start_date: string | null;
          end_date: string | null;
        }
      | Array<{
          id: string;
          name: string;
          description: string | null;
          project_type: string;
          project_status: string;
          start_date: string | null;
          end_date: string | null;
        }>;
  };

  const projects = (result.data || []) as ClientProjectRow[];

  if (projects.length === 0) {
    return (
      <div className={`space-y-6 ${fadeInClasses}`}>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Your Projects</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track the progress of your active projects
          </p>
        </div>
        <div className="flex min-h-[300px] items-center justify-center">
          <div className="text-center">
            <FolderKanban
              className="mx-auto h-12 w-12 text-muted-foreground/20"
              aria-hidden="true"
            />
            <p className="mt-3 text-base font-medium text-foreground">No projects yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Projects will appear here once you are invited to them.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const projectIds = projects
    .map((cp) => {
      const p = Array.isArray(cp.project) ? cp.project[0] : cp.project;
      return p?.id;
    })
    .filter((id): id is string => !!id);

  const progressMap = await calculateProjectsProgress(projectIds);

  return (
    <div className={`space-y-6 ${fadeInClasses}`}>
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Your Projects</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track the progress of your active projects
        </p>
      </div>
      <PortalProjectsGrid projects={projects} progressMap={progressMap} />
    </div>
  );
}
