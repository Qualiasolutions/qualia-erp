import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import { connection } from 'next/server';
import { getProjectById, getProfiles, getCurrentUserProfile, getClients } from '@/app/actions';
import { getProjectIntegrationStatus } from '@/lib/integration-utils';
import { getPortalAuthUser } from '@/lib/portal-cache';
import { createClient } from '@/lib/supabase/server';
import { ProjectDetailView } from './project-detail-view';

function ProjectDetailSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-4 border-b border-border bg-card/80 px-6 py-3.5 backdrop-blur-xl">
        <div className="h-6 w-32 animate-pulse rounded bg-muted" />
      </header>
      <div className="flex-1 p-6">
        <div className="space-y-6">
          <div className="h-8 w-1/2 animate-pulse rounded bg-muted" />
          <div className="h-32 animate-pulse rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}

interface ProjectLoaderProps {
  id: string;
}

async function ProjectLoader({ id }: ProjectLoaderProps) {
  await connection();

  const user = await getPortalAuthUser();
  if (!user) redirect('/auth/login');

  // Fetch all data in parallel on the server
  const [project, profiles, userProfile, integrationStatus, clientsRaw] = await Promise.all([
    getProjectById(id),
    getProfiles(),
    getCurrentUserProfile(),
    getProjectIntegrationStatus(id),
    getClients(),
  ]);

  const clients = (clientsRaw || []).map((c) => ({
    id: c.id,
    display_name: c.display_name,
  }));

  if (!project) {
    notFound();
  }

  // Clients can only view projects they have explicit access to via client_projects
  if (userProfile?.role === 'client') {
    const supabase = await createClient();
    const { data: link } = await supabase
      .from('client_projects')
      .select('project_id')
      .eq('client_id', user.id)
      .eq('project_id', id)
      .maybeSingle();
    if (!link) notFound();
  }

  // Employees can only view projects they're assigned to
  if (userProfile && userProfile.role !== 'admin' && userProfile.role !== 'client') {
    const supabase = await createClient();
    const { data: assignment } = await supabase
      .from('project_assignments')
      .select('id')
      .eq('project_id', id)
      .eq('employee_id', userProfile.id)
      .is('removed_at', null)
      .single();
    if (!assignment) {
      notFound();
    }
  }

  // Demos don't have a detail page - redirect back to projects list
  if (project.status === 'Demos') {
    redirect('/projects');
  }

  return (
    <ProjectDetailView
      project={project}
      profiles={profiles}
      clients={clients}
      userRole={userProfile?.role || 'employee'}
      integrationStatus={integrationStatus}
    />
  );
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <Suspense fallback={<ProjectDetailSkeleton />}>
      <ProjectLoader id={id} />
    </Suspense>
  );
}
