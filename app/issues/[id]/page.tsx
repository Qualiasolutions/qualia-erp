import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { getIssueById, getTeams, getProjects } from '@/app/actions';
import { IssueDetailView } from './issue-detail-view';

function IssueDetailSkeleton() {
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

interface IssueLoaderProps {
  id: string;
}

async function IssueLoader({ id }: IssueLoaderProps) {
  await connection();

  // Fetch all data in parallel on the server
  const [issue, teams, projects] = await Promise.all([getIssueById(id), getTeams(), getProjects()]);

  if (!issue) {
    notFound();
  }

  return <IssueDetailView issue={issue} teams={teams} projects={projects} />;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function IssueDetailPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <Suspense fallback={<IssueDetailSkeleton />}>
      <IssueLoader id={id} />
    </Suspense>
  );
}
