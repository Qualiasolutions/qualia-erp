import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Activity } from 'lucide-react';
import { assertAppEnabledForClient } from '@/lib/portal-utils';
import { getPortalAuthUser, getPortalProfile } from '@/lib/portal-cache';
import { ActivityContent } from './activity-content';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Activity' };

export default async function PortalActivityPage() {
  const user = await getPortalAuthUser();

  if (!user) redirect('/auth/login');

  const profile = await getPortalProfile(user.id);

  const role = profile?.role || 'client';

  // App Library guard: block clients if the "activity" app is disabled
  if (role === 'client') {
    const allowed = await assertAppEnabledForClient(user.id, 'activity', role);
    if (!allowed) {
      return (
        <div className="flex h-full items-center justify-center p-4 md:p-6 lg:p-8">
          <EmptyState
            icon={Activity}
            title="Activity is not enabled"
            description="Your dashboard shows the tools available for this workspace."
            action={
              <Button asChild size="sm">
                <Link href="/dashboard">Back to dashboard</Link>
              </Button>
            }
          />
        </div>
      );
    }
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
    <div className="animate-fade-in-up space-y-4 px-4 pb-6 pt-16 md:px-6 md:pt-6">
      <header className="rounded-xl border border-border bg-card px-3 py-3 shadow-[0_1px_0_hsl(var(--border)/0.45)]">
        <div className="flex flex-wrap items-center gap-2">
          <div className="mr-auto min-w-[180px]">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold tracking-tight text-foreground">Activity</h1>
              <span className="hidden h-1 w-1 rounded-full bg-border sm:block" />
              <p className="truncate text-sm text-muted-foreground">
                Recent updates across accessible projects
              </p>
            </div>
          </div>
          <span className="rounded-md border border-border bg-muted/40 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
            {projectIds.length} project{projectIds.length === 1 ? '' : 's'}
          </span>
        </div>
      </header>
      <ActivityContent projectIds={projectIds} />
    </div>
  );
}
