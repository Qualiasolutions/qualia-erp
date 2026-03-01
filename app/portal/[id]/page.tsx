import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { canAccessProject } from '@/lib/portal-utils';
import { PortalRoadmap } from '@/components/portal/portal-roadmap';

interface PortalProjectPageProps {
  params: Promise<{ id: string }>;
}

export default async function PortalProjectPage({ params }: PortalProjectPageProps) {
  const { id: projectId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Verify client has access to this project
  const hasAccess = await canAccessProject(user.id, projectId);
  if (!hasAccess) {
    redirect('/portal');
  }

  // Fetch project details
  const { data: project } = await supabase
    .from('projects')
    .select('id, name, project_status, description')
    .eq('id', projectId)
    .single();

  if (!project) {
    redirect('/portal');
  }

  // Fetch project phases
  const { data: phases } = await supabase
    .from('project_phases')
    .select('id, name, status, start_date, target_date, description, order_index')
    .eq('project_id', projectId)
    .order('order_index', { ascending: true });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <a
          href="/portal"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-neutral-900"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </a>
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">{project.name}</h1>
          {project.description && (
            <p className="mt-1 text-sm text-neutral-600">{project.description}</p>
          )}
        </div>
      </div>

      <PortalRoadmap project={project} phases={phases || []} />
    </div>
  );
}
