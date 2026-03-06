import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { canAccessProject } from '@/lib/portal-utils';
import { getProjectFeatures } from '@/app/actions/client-portal';
import { PortalTabs } from '@/components/portal/portal-tabs';
import { PortalPageHeader } from '@/components/portal/portal-page-header';
import { fadeInClasses } from '@/lib/transitions';
import { FeaturesGallery } from '@/components/portal/features-gallery';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface PortalFeaturesPageProps {
  params: Promise<{ id: string }>;
}

async function PortalFeaturesContent({ projectId }: { projectId: string }) {
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

  // Fetch features (screenshots, mockups, design images)
  const result = await getProjectFeatures(projectId);
  const features = result.success ? (result.data as Array<unknown>) : [];

  return (
    <div className={`space-y-6 ${fadeInClasses}`}>
      <PortalPageHeader title={project.name} description={project.description} />

      <PortalTabs projectId={projectId} />

      {/* Info Banner */}
      <div className="rounded-lg border border-qualia-500/20 bg-qualia-500/10 p-4">
        <p className="text-sm text-qualia-800 dark:text-qualia-300">
          Browse screenshots, mockups, and design previews from your project. Click any image to
          view it in full screen.
        </p>
      </div>

      {/* Features Gallery */}
      <FeaturesGallery features={features} />
    </div>
  );
}

export default async function PortalFeaturesPage({ params }: PortalFeaturesPageProps) {
  const { id: projectId } = await params;

  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-16 w-full" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="aspect-video w-full" />
            <Skeleton className="aspect-video w-full" />
            <Skeleton className="aspect-video w-full" />
            <Skeleton className="aspect-video w-full" />
            <Skeleton className="aspect-video w-full" />
            <Skeleton className="aspect-video w-full" />
          </div>
        </div>
      }
    >
      <PortalFeaturesContent projectId={projectId} />
    </Suspense>
  );
}
