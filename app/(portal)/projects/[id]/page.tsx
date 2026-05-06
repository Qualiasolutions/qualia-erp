import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import { connection } from 'next/server';
import { getProfiles, getCurrentUserProfile, getClients } from '@/app/actions';
import { getCachedProjectById, getCachedProjectIntegrationStatus } from '@/lib/cached-reads';
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

  // Fetch userProfile first (React.cache'd, cheap) so we can conditionally
  // skip the admin-only getProfiles()/getClients() queries for non-admin users.
  // This closes the Phase 11 RSC leak at the query layer, not just the render layer.
  const userProfile = await getCurrentUserProfile();
  const isAdmin = userProfile?.role === 'admin';
  const isClient = userProfile?.role === 'client';
  const supabase = await createClient();

  // Authorize before any service-role cached reads. `lib/cached-reads.ts`
  // intentionally bypasses RLS, so route-level access checks must happen first.
  if (isClient) {
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

  const [project, profiles, integrationStatus, clientsRaw] = await Promise.all([
    getCachedProjectById(id),
    isAdmin ? getProfiles() : Promise.resolve([]),
    isClient ? Promise.resolve(undefined) : getCachedProjectIntegrationStatus(id),
    isAdmin ? getClients() : Promise.resolve([]),
  ]);

  const clients = (clientsRaw || []).map((c) => ({
    id: c.id,
    display_name: c.display_name,
  }));

  if (!project) {
    notFound();
  }

  // Demos don't have a detail page - redirect back to projects list
  if (project.status === 'Demos') {
    redirect('/projects');
  }

  // Strip sensitive data from RSC payload for client users:
  // - profiles and clients lists are internal CRM data
  // - integrationStatus exposes internal tooling state
  // - lead email is PII not needed by client views
  const projectForClient =
    isClient && project
      ? {
          ...project,
          lead: project.lead ? { ...project.lead, email: undefined } : project.lead,
        }
      : project;

  return (
    <ProjectDetailView
      project={projectForClient}
      profiles={isClient ? [] : profiles}
      clients={isClient ? [] : clients}
      userRole={userProfile?.role || 'employee'}
      integrationStatus={isClient ? undefined : integrationStatus}
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
