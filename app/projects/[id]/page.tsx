import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { getProjectById, getTeams, getProfiles } from '@/app/actions';
import { ProjectDetailView } from './project-detail-view';

function ProjectDetailSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-4 border-b border-border bg-background px-6 py-4">
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
  const [project, teams, profiles] = await Promise.all([
    getProjectById(id),
    getTeams(),
    getProfiles(),
  ]);

  if (!project) {
    notFound();
  }

  return <ProjectDetailView project={project} teams={teams} profiles={profiles} />;
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
