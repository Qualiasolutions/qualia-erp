import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getClientProjects } from '@/app/actions/client-portal';
import { calculateProjectsProgress } from '@/app/actions/phases';
import { getUserRole } from '@/lib/portal-utils';
import { PortalProjectsList } from '@/components/portal/portal-projects-list';
import { fadeInClasses } from '@/lib/transitions';

export default async function PortalProjectsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const userRole = await getUserRole(user.id);
  const isAdmin = userRole === 'admin';

  // Admin: show all projects
  if (isAdmin) {
    const { data: allProjects } = await supabase
      .from('projects')
      .select('id, name, description, project_type, status, start_date, end_date')
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
          <h1 className="text-2xl font-bold text-foreground">All Projects</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Overview of all active projects (admin view)
          </p>
        </div>
        <PortalProjectsList projects={formatted} progressMap={progressMap} />
      </div>
    );
  }

  // Client: their assigned projects
  const result = await getClientProjects(user.id);
  if (!result.success) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-foreground">Error Loading Projects</h2>
          <p className="mt-2 text-sm text-muted-foreground">{result.error}</p>
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
        <h1 className="text-2xl font-bold text-foreground">Your Projects</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          View the status and progress of your active projects
        </p>
      </div>
      <PortalProjectsList projects={projects} progressMap={progressMap} />
    </div>
  );
}
