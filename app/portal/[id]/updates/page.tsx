import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { canAccessProject } from '@/lib/portal-utils';
import type { ActivityLogEntry } from '@/lib/activity-utils';
import { PortalActivityFeed } from '@/components/portal/portal-activity-feed';
import { PortalTabs } from '@/components/portal/portal-tabs';
import { PortalPageHeader } from '@/components/portal/portal-page-header';
import { fadeInClasses } from '@/lib/transitions';

export const dynamic = 'force-dynamic';

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

  // Fetch client-visible activities via RLS-protected client
  let activities: ActivityLogEntry[] = [];
  let activitiesError: string | null = null;
  try {
    const { data, error } = await supabase
      .from('activity_log')
      .select(
        `id, project_id, action_type, actor_id, action_data, is_client_visible, created_at,
         actor:profiles!activity_log_actor_id_fkey(id, full_name, avatar_url, email)`
      )
      .eq('project_id', projectId)
      .eq('is_client_visible', true)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('[PortalUpdatesPage] Activity fetch error:', error);
      activitiesError = 'Could not load updates';
    }

    activities = ((data || []) as unknown as ActivityLogEntry[]).map((entry) => ({
      ...entry,
      actor: Array.isArray(entry.actor) ? entry.actor[0] || null : entry.actor,
    })) as ActivityLogEntry[];
  } catch (err) {
    console.error('[PortalUpdatesPage] Unexpected error:', err);
    activitiesError = 'Could not load updates';
  }

  return (
    <div className={`space-y-6 ${fadeInClasses}`}>
      <PortalPageHeader title={project.name} description={project.description} />

      <PortalTabs projectId={projectId} />

      {/* Info Banner */}
      <div className="rounded-lg border border-primary/20 bg-primary/10 p-4">
        <p className="text-sm text-primary dark:text-qualia-300">
          Track the latest updates, milestones, and activities on your project.
        </p>
      </div>

      {/* Error banner */}
      {activitiesError && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {activitiesError}
        </div>
      )}

      {/* Activity Feed */}
      <PortalActivityFeed activities={activities} projectId={projectId} />
    </div>
  );
}
