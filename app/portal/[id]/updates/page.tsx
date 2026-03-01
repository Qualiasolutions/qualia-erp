import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { canAccessProject } from '@/lib/portal-utils';
import { getProjectActivityFeed } from '@/app/actions/activity-feed';
import type { ActivityLogEntry } from '@/lib/activity-utils';
import { PortalActivityFeed } from '@/components/portal/portal-activity-feed';
import { PortalTabs } from '@/components/portal/portal-tabs';

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
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/portal"
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
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">{project.name}</h1>
          {project.description && (
            <p className="mt-1 text-sm text-neutral-600">{project.description}</p>
          )}
        </div>
      </div>

      <PortalTabs projectId={projectId} />

      {/* Info Banner */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <p className="text-sm text-blue-900">
          Track the latest updates, milestones, and activities on your project.
        </p>
      </div>

      {/* Activity Feed */}
      <PortalActivityFeed activities={activities} />
    </div>
  );
}
