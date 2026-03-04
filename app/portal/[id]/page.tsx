import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { canAccessProject } from '@/lib/portal-utils';
import { PortalRoadmap } from '@/components/portal/portal-roadmap';
import { PortalTabs } from '@/components/portal/portal-tabs';
import { PortalPageHeader } from '@/components/portal/portal-page-header';

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

  // Fetch user profile for role detection
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const userRole =
    profile?.role === 'admin' || profile?.role === 'employee' ? profile.role : 'client';

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
      <PortalPageHeader title={project.name} description={project.description} />

      <PortalTabs projectId={projectId} />

      <PortalRoadmap
        project={project}
        phases={phases || []}
        userRole={userRole}
        currentUserId={user.id}
      />
    </div>
  );
}
