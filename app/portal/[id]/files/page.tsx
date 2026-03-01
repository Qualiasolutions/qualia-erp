import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { canAccessProject } from '@/lib/portal-utils';
import { getProjectFiles } from '@/app/actions/project-files';
import { PortalFileList } from '@/components/portal/portal-file-list';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface PortalFilesPageProps {
  params: Promise<{ id: string }>;
}

async function PortalFilesContent({ projectId }: { projectId: string }) {
  const supabase = await createClient();

  // Get current user
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
    .select('id, name, description')
    .eq('id', projectId)
    .single();

  if (!project) {
    redirect('/portal');
  }

  // Fetch client-visible files only
  const files = await getProjectFiles(projectId, true);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <a
          href={`/portal/${projectId}`}
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
          <h1 className="text-2xl font-bold text-neutral-900">Shared Files</h1>
          <p className="mt-1 text-sm text-neutral-600">{project.name}</p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <p className="text-sm text-blue-900">
          These are files and deliverables shared by your project team. Click to download any file.
        </p>
      </div>

      {/* Files Grid */}
      <PortalFileList files={files} />
    </div>
  );
}

export default async function PortalFilesPage({ params }: PortalFilesPageProps) {
  const { id: projectId } = await params;

  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-16 w-full" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      }
    >
      <PortalFilesContent projectId={projectId} />
    </Suspense>
  );
}
