import { getCurrentWorkspaceId, getMeetings, getProfiles } from '@/app/actions';
import { TodayDashboard } from '@/components/today-dashboard';
import { createClient } from '@/lib/supabase/server';
import type { ProjectType } from '@/types/database';
import type { PipelineProject } from '@/components/today-dashboard/building-projects-row';

export default async function TodayPage() {
  const workspaceId = await getCurrentWorkspaceId();

  if (!workspaceId) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Please sign in to view your dashboard</p>
      </div>
    );
  }

  // Get current user info
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Run profile query in parallel with other fetches
  const [meetingsRaw, projectsRaw, profiles, profileResult] = await Promise.all([
    getMeetings(workspaceId),
    supabase.rpc('get_project_stats', { p_workspace_id: workspaceId }),
    getProfiles(workspaceId),
    user
      ? supabase.from('profiles').select('id, role').eq('id', user.id).single()
      : Promise.resolve({ data: null }),
  ]);
  const currentProfile = profileResult.data;

  const meetings = meetingsRaw;

  // Tasks are now fetched client-side via useTeamTaskDashboard SWR hook

  // Map all projects for pipeline display
  const allProjects: PipelineProject[] = (projectsRaw.data || []).map(
    (p: Record<string, unknown>) => ({
      id: p.id as string,
      name: p.name as string,
      status: p.status as string,
      project_type: p.project_type as ProjectType | null,
      target_date: p.target_date as string | null,
      logo_url: (p.logo_url as string | null) || null,
      issue_stats: {
        total: Number(p.total_issues) || 0,
        done: Number(p.done_issues) || 0,
      },
    })
  );

  let building = allProjects.filter((p) => ['Active', 'Delayed'].includes(p.status));

  // Non-admin users: only show projects they're assigned to
  if (currentProfile && currentProfile.role !== 'admin') {
    const { data: assignments } = await supabase
      .from('project_assignments')
      .select('project_id')
      .eq('employee_id', currentProfile.id)
      .is('removed_at', null);
    const assignedIds = new Set(
      (assignments || []).map((a: { project_id: string }) => a.project_id)
    );
    building = building.filter((p) => assignedIds.has(p.id));
  }

  return (
    <TodayDashboard
      meetings={meetings}
      building={building}
      profiles={profiles}
      currentUserId={currentProfile?.id || null}
      userRole={currentProfile?.role || null}
      workspaceId={workspaceId}
    />
  );
}
