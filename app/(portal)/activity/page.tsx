import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ActivityContent } from './activity-content';

export default async function PortalActivityPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const role = profile?.role || 'client';

  // Get all project IDs the user has access to
  let projectIds: string[] = [];
  if (role === 'admin' || role === 'manager') {
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
    <div className="animate-fade-in-up space-y-6 px-[clamp(1.5rem,4vw,2.5rem)] pb-[clamp(1.5rem,3vw,2.5rem)] pt-16 md:pt-[clamp(1.5rem,3vw,2.5rem)]">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Activity</h1>
        <p className="mt-1 text-sm text-muted-foreground">Recent updates across your projects</p>
      </div>
      <ActivityContent projectIds={projectIds} />
    </div>
  );
}
