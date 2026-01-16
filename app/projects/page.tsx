import { Suspense } from 'react';
import { connection } from 'next/server';
import { Folder } from 'lucide-react';
import { getCurrentWorkspaceId } from '@/app/actions';
import { getProjectsByPhase } from '@/app/actions/project-pipeline';
import { NewProjectModal } from '@/components/new-project-modal';
import { ProjectsPipelineClient } from './projects-pipeline-client';

async function ProjectPipelineLoader() {
  await connection();
  const workspaceId = await getCurrentWorkspaceId();
  const projectsByPhase = await getProjectsByPhase(workspaceId || undefined);

  return <ProjectsPipelineClient initialData={projectsByPhase} />;
}

function PipelineSkeleton() {
  return (
    <div className="flex h-full flex-col">
      {/* Stats skeleton */}
      <div className="mb-4 flex items-center gap-4">
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        <div className="h-4 w-20 animate-pulse rounded bg-muted" />
      </div>

      {/* Columns skeleton */}
      <div className="flex gap-3 overflow-x-auto">
        {[...Array(7)].map((_, i) => (
          <div
            key={i}
            className="flex min-w-[260px] flex-col rounded-lg border border-border bg-card/50"
          >
            {/* Header */}
            <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
              <div className="h-7 w-7 animate-pulse rounded-md bg-muted" />
              <div className="h-4 w-20 animate-pulse rounded bg-muted" />
              <div className="ml-auto h-5 w-6 animate-pulse rounded-full bg-muted" />
            </div>
            {/* Cards */}
            <div className="flex-1 space-y-2 p-2">
              {[...Array(i < 5 ? 2 : 1)].map((_, j) => (
                <div key={j} className="rounded-lg border border-border bg-card p-3">
                  <div className="flex items-start gap-2.5">
                    <div className="h-8 w-8 animate-pulse rounded-lg bg-muted" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                      <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="mb-1.5 flex justify-between">
                      <div className="h-3 w-16 animate-pulse rounded bg-muted" />
                      <div className="h-3 w-8 animate-pulse rounded bg-muted" />
                    </div>
                    <div className="h-1.5 animate-pulse rounded-full bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-qualia-500/10 sm:h-9 sm:w-9">
            <Folder className="h-4 w-4 text-qualia-500" />
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
              Project Pipeline
            </h1>
            <p className="hidden text-xs text-muted-foreground sm:block">
              Track projects from setup to production
            </p>
          </div>
        </div>
        <NewProjectModal />
      </header>

      {/* Content */}
      <div className="flex-1 overflow-hidden p-4 sm:p-6">
        <Suspense fallback={<PipelineSkeleton />}>
          <ProjectPipelineLoader />
        </Suspense>
      </div>
    </div>
  );
}
