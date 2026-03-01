import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getClientProjects } from '@/app/actions/client-portal';
import { calculateProjectsProgress } from '@/app/actions/phases';
import { getUserRole } from '@/lib/portal-utils';
import { PortalProjectsList } from '@/components/portal/portal-projects-list';

export default async function PortalPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const userRole = await getUserRole(user.id);
  const isAdmin = userRole === 'admin';

  let projects: Array<{
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
  }> = [];

  if (isAdmin) {
    // Admins see ALL projects
    const { data: allProjects } = await supabase
      .from('projects')
      .select('id, name, description, project_type, project_status:status, start_date, end_date')
      .not('status', 'eq', 'Canceled')
      .order('updated_at', { ascending: false });

    // Map to the same shape as client_projects for the PortalProjectsList component
    projects = (allProjects || []).map((p) => ({
      id: p.id,
      project_id: p.id,
      access_level: 'admin',
      invited_at: null,
      project: {
        id: p.id,
        name: p.name,
        description: p.description,
        project_type: p.project_type,
        project_status: p.project_status,
        start_date: p.start_date,
        end_date: p.end_date,
      },
    }));
  } else {
    // Clients see only their assigned projects
    const result = await getClientProjects(user.id);
    if (!result.success) {
      return (
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-neutral-900">Error Loading Projects</h2>
            <p className="mt-2 text-sm text-neutral-600">{result.error}</p>
          </div>
        </div>
      );
    }
    projects = (result.data || []) as typeof projects;
  }

  // Calculate real progress from phases for all projects
  const projectIds = projects
    .map((cp) => {
      const p = Array.isArray(cp.project) ? cp.project[0] : cp.project;
      return p?.id;
    })
    .filter((id): id is string => !!id);

  const progressMap = await calculateProjectsProgress(projectIds);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">
          {isAdmin ? 'All Projects' : 'Your Projects'}
        </h1>
        <p className="mt-1 text-sm text-neutral-600">
          {isAdmin
            ? 'Overview of all projects from the client perspective'
            : 'View the status and progress of your active projects'}
        </p>
      </div>

      <PortalProjectsList projects={projects} progressMap={progressMap} />
    </div>
  );
}
