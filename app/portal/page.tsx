import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getClientProjects } from '@/app/actions/client-portal';
import { calculateProjectsProgress } from '@/app/actions/phases';
import { PortalProjectsList } from '@/components/portal/portal-projects-list';

export default async function PortalPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Fetch client's projects
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

  const projects = (result.data || []) as Array<{
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
  }>;

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
        <h1 className="text-2xl font-bold text-neutral-900">Your Projects</h1>
        <p className="mt-1 text-sm text-neutral-600">
          View the status and progress of your active projects
        </p>
      </div>

      <PortalProjectsList projects={projects} progressMap={progressMap} />
    </div>
  );
}
