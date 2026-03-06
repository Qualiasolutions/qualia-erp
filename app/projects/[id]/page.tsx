import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import { connection } from 'next/server';
import { getProjectById, getProfiles, getCurrentUserProfile } from '@/app/actions';
import { getProjectIntegrationStatus } from '@/lib/integration-utils';
import { ProjectDetailView } from './project-detail-view';

function ProjectDetailSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-4 border-b border-border/40 bg-card/80 px-6 py-3.5 backdrop-blur-xl">
        <div className="h-6 w-32 animate-pulse rounded bg-muted" />
      </header>
      <div className="flex-1 p-6">
        <div className="max-w-4xl space-y-6">
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

  // Fetch all data in parallel on the server
  const [project, profiles, userProfile, integrationStatus] = await Promise.all([
    getProjectById(id),
    getProfiles(),
    getCurrentUserProfile(),
    getProjectIntegrationStatus(id),
  ]);

  if (!project) {
    notFound();
  }

  // Demos don't have a detail page - redirect back to projects list
  if (project.status === 'Demos') {
    redirect('/projects');
  }

  return (
    <ProjectDetailView
      project={project}
      profiles={profiles}
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
