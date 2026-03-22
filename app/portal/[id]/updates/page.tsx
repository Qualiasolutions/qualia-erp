import { createClient, createAdminClient } from '@/lib/supabase/server';
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

  // Fetch client-visible activities using admin client (bypasses RLS for webhook-inserted entries)
  let activities: ActivityLogEntry[] = [];
  try {
    const adminSupabase = createAdminClient();
    const { data } = await adminSupabase
      .from('activity_log')
      .select(
        `id, project_id, action_type, actor_id, action_data, is_client_visible, created_at,
         actor:profiles!activity_log_actor_id_fkey(id, full_name, avatar_url, email)`
      )
      .eq('project_id', projectId)
      .eq('is_client_visible', true)
      .order('created_at', { ascending: false })
      .limit(20);

    activities = ((data || []) as unknown as ActivityLogEntry[]).map((entry) => ({
      ...entry,
      actor: Array.isArray(entry.actor) ? entry.actor[0] || null : entry.actor,
    })) as ActivityLogEntry[];
  } catch {
    // Fallback: no activities shown if admin client unavailable
  }

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
      <PortalActivityFeed activities={activities} projectId={projectId} />
    </div>
  );
}
