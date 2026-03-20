import { getMonitors, getOverallStatus, type Monitor } from '@/lib/uptime';
import { StatusDashboard } from '@/components/status/status-dashboard';
import { createClient } from '@/lib/supabase/server';

export const metadata = {
  title: 'System Status',
};

export const dynamic = 'force-dynamic';

async function getAssignedProjectUrls(userId: string): Promise<string[]> {
  const supabase = await createClient();

  const { data: assignments } = await supabase
    .from('project_assignments')
    .select('project:projects!project_assignments_project_id_fkey (vercel_project_url)')
    .eq('employee_id', userId)
    .is('removed_at', null);

  if (!assignments) return [];

  const urls: string[] = [];
  for (const a of assignments) {
    const project = Array.isArray(a.project) ? a.project[0] : a.project;
    if (project?.vercel_project_url) {
      urls.push(project.vercel_project_url);
    }
  }
  return urls;
}

function monitorMatchesUrls(monitor: Monitor, urls: string[]): boolean {
  if (!monitor.url) return false;
  try {
    const monitorHost = new URL(monitor.url).hostname.toLowerCase();
    return urls.some((url) => {
      try {
        const projectHost = new URL(
          url.startsWith('http') ? url : `https://${url}`
        ).hostname.toLowerCase();
        return (
          monitorHost === projectHost ||
          monitorHost.includes(projectHost.replace(/\.vercel\.app$/, ''))
        );
      } catch {
        return url.toLowerCase().includes(monitorHost) || monitorHost.includes(url.toLowerCase());
      }
    });
  } catch {
    return false;
  }
}

export default async function StatusPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <div className="p-8 text-muted-foreground">Not authenticated</div>;
  }

  // Check role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const isAdmin = profile?.role === 'admin';

  let monitors: Monitor[] = [];
  let error: string | null = null;

  try {
    monitors = await getMonitors();
  } catch (e) {
    error = e instanceof Error ? e.message : 'Failed to fetch status';
  }

  // Filter monitors for non-admins
  if (!isAdmin && monitors.length > 0) {
    const assignedUrls = await getAssignedProjectUrls(user.id);
    if (assignedUrls.length > 0) {
      monitors = monitors.filter((m) => monitorMatchesUrls(m, assignedUrls));
    } else {
      monitors = [];
    }
  }

  const overall = getOverallStatus(monitors);

  return <StatusDashboard monitors={monitors} overall={overall} error={error} />;
}
