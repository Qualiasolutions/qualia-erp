import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { canAccessProject } from '@/lib/portal-utils';
import { getProjectFiles } from '@/app/actions/project-files';
import { PortalFileList } from '@/components/portal/portal-file-list';
import { PortalTabs } from '@/components/portal/portal-tabs';
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
        <Link
          href="/portal"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
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
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{project.name}</h1>
          {project.description && (
            <p className="mt-1 text-sm text-muted-foreground">{project.description}</p>
          )}
        </div>
      </div>

      <PortalTabs projectId={projectId} />

      {/* Info Banner */}
      <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-4">
        <p className="text-sm text-blue-800 dark:text-blue-300">
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
