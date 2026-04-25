import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { assertAppEnabledForClient } from '@/lib/portal-utils';
import { getPortalAuthUser, getPortalProfile } from '@/lib/portal-cache';
import { ActivityContent } from './activity-content';
import { Activity } from 'lucide-react';

export const metadata: Metadata = { title: 'Activity' };

export default async function PortalActivityPage() {
  const user = await getPortalAuthUser();

  if (!user) redirect('/auth/login');

  const profile = await getPortalProfile(user.id);

  const role = profile?.role || 'client';

  // App Library guard: block clients if the "activity" app is disabled
  if (role === 'client') {
    const allowed = await assertAppEnabledForClient(user.id, 'activity', role);
    if (!allowed) redirect('/');
  }

  // Get all project IDs the user has access to
  const supabase = await createClient();
  let projectIds: string[] = [];
  if (role === 'admin') {
    const { data } = await supabase.from('projects').select('id').not('status', 'eq', 'Canceled');
    projectIds = (data || []).map((p) => p.id);
  } else if (role === 'client') {
    const { data } = await supabase
      .from('client_projects')
      .select('project_id')
      .eq('client_id', user.id);
    projectIds = (data || []).map((p) => p.project_id);
  } else {
    const { data } = await supabase
      .from('project_assignments')
      .select('project_id')
      .eq('profile_id', user.id);
    projectIds = (data || []).map((p) => p.project_id);
  }

  return (
    <div className="space-y-6 p-6 lg:p-8">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Activity className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Activity</h1>
            <p className="text-sm text-muted-foreground">Recent updates across your projects</p>
          </div>
        </div>
      </div>
      <ActivityContent projectIds={projectIds} />
    </div>
  );
}
