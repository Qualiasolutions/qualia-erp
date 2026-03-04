import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { canAccessProject } from '@/lib/portal-utils';
import { getProjectActivityFeed } from '@/app/actions/activity-feed';
import type { ActivityLogEntry } from '@/lib/activity-utils';
import { PortalActivityFeed } from '@/components/portal/portal-activity-feed';
import { PortalTabs } from '@/components/portal/portal-tabs';
import { PortalPageHeader } from '@/components/portal/portal-page-header';
import { fadeInClasses } from '@/lib/transitions';

interface PortalUpdatesPageProps {
  params: Promise<{ id: string }>;
}

export default async function PortalUpdatesPage({ params }: PortalUpdatesPageProps) {
  const { id: projectId } = await params;

  const supabase = await createClient();
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

  // Fetch client-visible activities (limit 100)
  const activityResult = await getProjectActivityFeed(projectId, true, 100);
  const activities = activityResult.success ? (activityResult.data as ActivityLogEntry[]) : [];

  return (
    <div className={`space-y-6 ${fadeInClasses}`}>
      <PortalPageHeader title={project.name} description={project.description} />

      <PortalTabs projectId={projectId} />

      {/* Info Banner */}
      <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-4">
        <p className="text-sm text-blue-800 dark:text-blue-300">
          Track the latest updates, milestones, and activities on your project.
        </p>
      </div>

      {/* Activity Feed */}
      <PortalActivityFeed activities={activities} />
    </div>
  );
}
