import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { canAccessProject } from '@/lib/portal-utils';
import { getProjectFiles } from '@/app/actions/project-files';
import { PortalFileList } from '@/components/portal/portal-file-list';
import { PortalClientUpload } from '@/components/portal/portal-client-upload';
import { PortalTabs } from '@/components/portal/portal-tabs';
import { PortalPageHeader } from '@/components/portal/portal-page-header';
import { fadeInClasses } from '@/lib/transitions';
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
    <div className={`space-y-6 ${fadeInClasses}`}>
      <PortalPageHeader title={project.name} description={project.description} />

      <PortalTabs projectId={projectId} />

      {/* Upload section */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-foreground">Share a file with your team</h3>
        <PortalClientUpload projectId={projectId} />
      </div>

      {/* Info Banner */}
      <div className="rounded-lg border border-primary/20 bg-primary/[0.06] p-4">
        <p className="text-sm text-qualia-800 dark:text-primary/80">
          Files shared by your team appear below.
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
