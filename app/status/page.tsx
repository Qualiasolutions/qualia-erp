import { getMonitors, getOverallStatus, type Monitor } from '@/lib/uptime';
import { StatusDashboard, type ProjectInfo } from '@/components/status/status-dashboard';
import { createClient } from '@/lib/supabase/server';

export const metadata = {
  title: 'System Status',
};

export const dynamic = 'force-dynamic';

// Monitor names to hide from the status page
const HIDDEN_MONITORS = ['faris', 'melon', 'qualia-erp', 'qualia erp'];

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

function matchMonitorToProject(
  monitor: Monitor,
  projects: Array<{
    name: string;
    logo_url: string | null;
    vercelUrl: string | null;
    githubUrl: string | null;
  }>
): ProjectInfo | undefined {
  if (!monitor.url) return undefined;
  const monitorHost = (() => {
    try {
      return new URL(monitor.url).hostname.toLowerCase();
    } catch {
      return '';
    }
  })();
  if (!monitorHost) return undefined;

  for (const p of projects) {
    if (!p.vercelUrl) continue;
    try {
      const projectHost = new URL(
        p.vercelUrl.startsWith('http') ? p.vercelUrl : `https://${p.vercelUrl}`
      ).hostname.toLowerCase();
      if (
        monitorHost === projectHost ||
        monitorHost.includes(projectHost.replace(/\.vercel\.app$/, ''))
      ) {
        return {
          name: p.name,
          logoUrl: p.logo_url,
          vercelUrl: p.vercelUrl,
          githubUrl: p.githubUrl,
        };
      }
    } catch {
      // skip
    }
  }

  // Fallback: match by monitor friendly_name containing project name
  const monitorNameLower = monitor.friendly_name.toLowerCase();
  for (const p of projects) {
    const projNameLower = p.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const monitorClean = monitorNameLower.replace(/[^a-z0-9]/g, '');
    if (projNameLower.length > 3 && monitorClean.includes(projNameLower)) {
      return {
        name: p.name,
        logoUrl: p.logo_url,
        vercelUrl: p.vercelUrl,
        githubUrl: p.githubUrl,
      };
    }
  }

  return undefined;
}

function shouldHideMonitor(monitor: Monitor): boolean {
  const name = monitor.friendly_name.toLowerCase();
  const url = monitor.url?.toLowerCase() || '';
  return HIDDEN_MONITORS.some((hidden) => name.includes(hidden) || url.includes(hidden));
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

  const canSeeAllMonitors = profile?.role === 'admin' || profile?.role === 'manager';

  let monitors: Monitor[] = [];
  let error: string | null = null;

  try {
    monitors = await getMonitors();
  } catch (e) {
    error = e instanceof Error ? e.message : 'Failed to fetch status';
  }

  // Filter out hidden monitors
  monitors = monitors.filter((m) => !shouldHideMonitor(m));

  // Filter monitors for non-admins/non-managers
  if (!canSeeAllMonitors && monitors.length > 0) {
    const assignedUrls = await getAssignedProjectUrls(user.id);
    if (assignedUrls.length > 0) {
      monitors = monitors.filter((m) => monitorMatchesUrls(m, assignedUrls));
    } else {
      monitors = [];
    }
  }

  // Fetch all projects with integrations for mapping
  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, logo_url, project_integrations(service_type, external_url)')
    .not('status', 'in', '("Archived","Canceled")');

  const projectData = (projects || []).map((p) => {
    const integrations = Array.isArray(p.project_integrations) ? p.project_integrations : [];
    const vercel = integrations.find((i: { service_type: string }) => i.service_type === 'vercel');
    const github = integrations.find((i: { service_type: string }) => i.service_type === 'github');
    return {
      name: p.name,
      logo_url: p.logo_url,
      vercelUrl: (vercel as { external_url?: string } | undefined)?.external_url || null,
      githubUrl: (github as { external_url?: string } | undefined)?.external_url || null,
    };
  });

  // Build monitor → project mapping
  const projectMap: Record<string, ProjectInfo> = {};
  for (const m of monitors) {
    const project = matchMonitorToProject(m, projectData);
    if (project) {
      projectMap[String(m.id)] = project;
    }
  }

  const overall = getOverallStatus(monitors);

  return (
    <StatusDashboard monitors={monitors} overall={overall} error={error} projectMap={projectMap} />
  );
}
